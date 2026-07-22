/* DefendAble Intelligence Engine v2 — DT-01 ATC/ATFM disruption tree */
var DefendAbleTreeDT01 = (function () {

  var TREE_ID = 'DT-01';
  var DISRUPTION_TYPE = 'ATC Restrictions';
  var AUTHORITY = 'Pešková C-315/15; Wallentin-Hermann C-549/07; Moens C-159/18';

  var GATES = [
    {
      id: 'DT1-G1',
      name: 'ATFM / CTOT restriction',
      question: 'Was a Eurocontrol CTOT (or equivalent ATFM slot / flow restriction) assigned to this flight?',
      authority: 'Pešková — third-party flow control is per se extraordinary',
      requiredLibKeys: ['eurocontrol', 'tops'],
      conclusionIds: ['DT1_CTOT_CONFIRMED', 'U7_EC_ESTABLISHED'],
      yesMeans: 'EC confirmed at root — both Wallentin-Hermann limbs satisfied for ATC flow control.',
      noNext: 'DT1-G2'
    },
    {
      id: 'DT1-G2',
      name: 'Third-party imposition (Moens)',
      question: 'Was the restriction third-party imposed (network / ANSP), not a carrier-requested slot?',
      authority: 'Moens C-159/18 — carrier-requested restriction is not EC',
      requiredLibKeys: ['eurocontrol', 'tops', 'notam'],
      conclusionIds: ['DT1_ATC_CAUSE'],
      yesMeans: 'Third-party ATFM — Moens EC candidate.',
      noMeans: 'Carrier-requested restriction — EC fails on Moens.',
      noNext: 'EXIT'
    },
    {
      id: 'DT1-G3',
      name: 'Upstream weather / strike driver',
      question: 'Was weather, strike, or staffing the upstream driver of the ATFM regulation?',
      authority: 'Operative-cause rule — route context to DT-02 / industrial trees as secondary',
      requiredLibKeys: ['ogimet', 'eurocontrol'],
      secondaryLibKeys: ['notam'],
      conclusionIds: ['DT1_UPSTREAM_CONTEXT'],
      yesMeans: 'Upstream weather/strike noted — keep DT-02 / industrial as secondary; ATFM remains operative delay driver unless diversion/minima is direct EC.',
      noMeans: 'No upstream weather/strike asserted — pure ATC/ATFM case.'
    },
    {
      id: 'DT1-G4',
      name: 'Delay attributable to restriction',
      question: 'Is the passenger delay attributable to the restriction (delay codes 81–89 / OCC log / ATC narrative)?',
      authority: 'But-for test — van der Lans intervening ordinary event breaks chain',
      requiredLibKeys: ['tops', 'disco', 'aims'],
      conclusionIds: ['DT1_ATC_CAUSE'],
      yesMeans: 'Causal chain from ATC to delay holds.',
      noMeans: 'Intervening cause — multi-tree or chain break analysis required.',
      noNext: 'EXIT'
    },
    {
      id: 'DT1-G5',
      name: 'Reasonable measures',
      question: 'Were an earlier slot, aircraft swap, or re-route sought and documented?',
      authority: 'Wallentin-Hermann para 40 — mandatory even after EC confirmed',
      requiredLibKeys: ['dpm', 'tops', 'disco'],
      secondaryLibKeys: ['internal_email', 'ops_review'],
      conclusionIds: ['U8_RM_SLOT_RECOVERY'],
      yesMeans: 'Reasonable measures defence supported.',
      noMeans: 'Failed intervention — EC may not save defence at U-8.',
      conditional: function (ctx) {
        // Curfew / OND is assessed inside RM when overnight language present
        return true;
      }
    }
  ];

  function matches(iccText, chainEvents) {
    if (typeof DefendAbleEvidencePack !== 'undefined'
      && DefendAbleEvidencePack.isWeatherDestination(iccText)) {
      // Weather diversion / destination weather is DT-02 primary; DT-01 may still be forced as secondary
      return false;
    }
    var t = (iccText || '').toLowerCase();
    if (/\bctot\b|\batfm\b|\beurocontrol\b|\batc restriction|\batc delay|\bnetwork.wide atfm\b|\ball carriers affected\b/i.test(t)) {
      return true;
    }
    return (chainEvents || []).some(function (ev) {
      return /\bctot\b|\batfm\b|\batc\b|\beurocontrol\b/i.test(ev.description || '');
    });
  }

  function pack() {
    return typeof DefendAbleEvidencePack !== 'undefined'
      ? DefendAbleEvidencePack.getPackItems(DISRUPTION_TYPE) : [];
  }

  function evidenceIdForLibKey(libKey) {
    if (typeof DefendAbleEvidencePack !== 'undefined') {
      return DefendAbleEvidencePack.libKeyToEvidenceId(libKey);
    }
    return libKey;
  }

  function getEvidenceItem(em, libKey) {
    if (!em) return null;
    return em.getById(evidenceIdForLibKey(libKey));
  }

  function libKeyStatus(em, libKey) {
    var item = getEvidenceItem(em, libKey);
    if (!item) return 'requested';
    return item.status;
  }

  function hasCollected(em, libKey) {
    return libKeyStatus(em, libKey) === 'collected';
  }

  function hasFinding(em, libKey, findingType) {
    var item = getEvidenceItem(em, libKey);
    if (!item || !item.findings) return false;
    return item.findings.some(function (f) { return f.type === findingType; });
  }

  function gateEvidenceGaps(em, requiredLibKeys) {
    var gaps = [];
    (requiredLibKeys || []).forEach(function (lk) {
      var st = libKeyStatus(em, lk);
      if (st !== 'collected') {
        var meta = typeof DefendAbleEvidencePack !== 'undefined' ? DefendAbleEvidencePack.getLibMeta(lk) : { name: lk, tier: 'K' };
        gaps.push({ libKey: lk, status: st, name: meta.name, tier: meta.tier });
      }
    });
    return gaps;
  }

  function confidenceFromGaps(gaps, answer) {
    if (answer === 'no' || answer === 'route_away') return 'red';
    if (!gaps.length) return 'green';
    return 'amber';
  }

  function updateGateConclusions(cm, gate, confidence, conclusionText, reason, em) {
    if (!cm || !gate) return;
    (gate.conclusionIds || []).forEach(function (cid) {
      if (!cm.getConclusion(cid)) {
        cm.addConclusion(cid, gate.question, { authority: gate.authority });
      }
      var status = confidence === 'green' ? 'green' : confidence === 'red' ? 'red' : 'amber';
      cm.updateConclusion(cid, status, conclusionText, reason, gate.id);
      if (em) {
        (gate.requiredLibKeys || []).forEach(function (lk) {
          var item = getEvidenceItem(em, lk);
          if (item && item.status === 'collected' && item.findings && item.findings.length) {
            cm.retroactivityCheck(item.id, item.findings, DefendAbleConfidence.EVIDENCE_CONCLUSION_LINKS);
          }
        });
      }
    });
  }

  function evaluateGate1(ctx) {
    var t = ctx.iccText || '';
    var em = ctx.evidenceManager;
    var gate = GATES[0];
    var ctotInIcc = /\bctot\b|\batfm\b|\beurocontrol\b|\bnetwork.wide\b|\ball carriers\b|\batc restriction|\batc delay|\bflow\b/i.test(t);
    var ctotEvidence = hasCollected(em, 'eurocontrol') || hasFinding(em, 'eurocontrol', 'TOPS_CTOT_CONFIRMED');
    var answer = (ctotInIcc || ctotEvidence) ? 'yes' : 'unknown';
    var gaps = gateEvidenceGaps(em, gate.requiredLibKeys);
    var confidence = answer === 'yes' ? (gaps.length ? 'amber' : 'green') : 'amber';
    var reason = answer === 'yes'
      ? (gaps.length ? 'ATFM/CTOT indicated but key pack items not fully on file.' : 'CTOT/ATFM confirmed — EC at root.')
      : 'ATFM/CTOT not yet evidenced — hold for Eurocontrol regulation record.';
    return {
      gateId: 'DT1-G1', answer: answer, confidence: confidence, reason: reason,
      conclusion: answer === 'yes' ? gate.yesMeans : null, gaps: gaps,
      skipTo: answer === 'yes' ? 'DT1-G2' : (answer === 'unknown' ? 'DT1-G2' : 'DT1-G2')
    };
  }

  function evaluateGate2(ctx) {
    var gate = GATES[1];
    var t = ctx.iccText || '';
    var em = ctx.evidenceManager;
    var carrierRequested = /\bcarrier.?requested\b|\bairline.?requested\b|\brequested\s+(a\s+)?slot\b|\bown\s+request\b/i.test(t);
    var thirdParty = /\batc\b|\batfm\b|\bctot\b|\beurocontrol\b|\bnetwork\b|\bansp\b|\bflow\b|\brestriction/i.test(t);
    var answer = carrierRequested ? 'no' : (thirdParty ? 'yes' : 'unknown');
    var gaps = gateEvidenceGaps(em, gate.requiredLibKeys);
    var confidence = answer === 'no' ? 'red' : (answer === 'unknown' ? 'amber' : confidenceFromGaps(gaps, 'yes'));
    return {
      gateId: 'DT1-G2', answer: answer, confidence: confidence,
      reason: answer === 'no'
        ? 'Carrier-requested restriction — Moens EC fails.'
        : (answer === 'yes' ? 'Third-party ATFM/ATC restriction indicated.' : 'Third-party imposition not yet confirmed — evidence pending.'),
      conclusion: answer === 'yes' ? gate.yesMeans : (answer === 'no' ? gate.noMeans : null),
      gaps: gaps,
      skipTo: answer === 'no' ? 'EXIT' : 'DT1-G3',
      affirmativeAdverse: answer === 'no'
    };
  }

  function evaluateGate3(ctx) {
    var gate = GATES[2];
    var em = ctx.evidenceManager;
    var t = ctx.iccText || '';
    var upstream = /\bthunderstorms?\b|\bweather\b|\bsigmet\b|\bmetar\b|\bstrike\b|\bindustrial\b|\bstaffing\b/i.test(t);
    var gaps = gateEvidenceGaps(em, (gate.requiredLibKeys || []).concat(gate.secondaryLibKeys || []));
    var answer = upstream ? 'yes' : 'n/a';
    var confidence = upstream ? confidenceFromGaps(gaps, 'yes') : 'grey';
    return {
      gateId: 'DT1-G3', answer: answer, confidence: confidence,
      reason: upstream
        ? 'Upstream weather/strike/staffing asserted — record as secondary tree context.'
        : 'No upstream weather/strike driver asserted.',
      conclusion: upstream ? gate.yesMeans : gate.noMeans,
      gaps: upstream ? gaps : [],
      skipTo: 'DT1-G4'
    };
  }

  function evaluateGate4(ctx) {
    var gate = GATES[3];
    var em = ctx.evidenceManager;
    var chain = ctx.causalChain || [];
    var t = ctx.iccText || '';
    var intervening = chain.some(function (ev) {
      return ev.chainBreak || /\btechnical\b|\bcrew illness\b|\bordinary\b|\bvoluntar|\bchose to wait|\bwaited for (delayed )?passengers|\bcommercial decision\b/i.test(
        (ev.description || '') + ' ' + (ev.label || '')
      );
    });
    if (/\bvoluntar(y|ily)\b|\bchose to wait\b|\bwaited for (the )?delayed passengers\b|\bcommercial decision to wait\b|\bwaited\s+\d+\s*mins?\s+for\s+connect/i.test(t)) {
      intervening = true;
    }
    var attributable = /\batc\b|\batfm\b|\bctot\b|\bdelay code|\b81|\b89|\bflow\b|\brestriction/i.test(t);
    var fdpElevated = hasFinding(em, 'aims', 'AIMS_FDP_ELEVATED_BEFORE_DISRUPTION');
    var answer;
    if (intervening || fdpElevated) answer = 'no';
    else if (attributable) answer = 'yes';
    else answer = 'unknown';
    var gaps = gateEvidenceGaps(em, gate.requiredLibKeys);
    var confidence = answer === 'no' ? 'amber' : (answer === 'unknown' ? 'amber' : confidenceFromGaps(gaps, 'yes'));
    return {
      gateId: 'DT1-G4', answer: answer, confidence: confidence,
      reason: answer === 'no'
        ? 'Intervening factor or voluntary carrier decision — causal chain may be broken (T-656/24).'
        : (answer === 'yes' ? 'Delay attributable to ATC restriction supported on narrative.' : 'Attribution pending — obtain delay codes / OCC log.'),
      conclusion: answer === 'yes' ? gate.yesMeans : (answer === 'no' ? gate.noMeans : null),
      gaps: gaps, skipTo: 'DT1-G5',
      affirmativeAdverse: answer === 'no' && intervening
    };
  }

  function evaluateGate5(ctx) {
    var gate = GATES[4];
    var em = ctx.evidenceManager;
    var t = ctx.iccText || '';
    var noStandby = /\bno standby\b|\bnot available\b|\bcould not be rescued\b|\bno earlier slot\b/i.test(t);
    var req = (gate.requiredLibKeys || []).concat(gate.secondaryLibKeys || []);
    var gaps = gateEvidenceGaps(em, req);
    var answer = noStandby ? 'unknown' : 'unknown';
    // Fresh case: RM almost always UNKNOWN until duty-manager notes / ops records collected
    if (hasCollected(em, 'dpm') || hasCollected(em, 'disco') || hasCollected(em, 'ops_review')) {
      answer = noStandby ? 'no' : 'yes';
    }
    var confidence = answer === 'unknown' ? 'amber' : confidenceFromGaps(gaps, answer);
    return {
      gateId: 'DT1-G5', answer: answer, confidence: confidence,
      reason: answer === 'unknown'
        ? 'Reasonable measures not yet evidenced — hold for duty-manager notes / slot recovery record.'
        : (noStandby ? 'ICC indicates recovery not available — verify fleet state.' : 'Recovery measures documented.'),
      conclusion: answer === 'yes' ? gate.yesMeans : gate.noMeans,
      gaps: gaps, skipTo: 'EXIT'
    };
  }

  var gateEvaluators = {
    'DT1-G1': evaluateGate1,
    'DT1-G2': evaluateGate2,
    'DT1-G3': evaluateGate3,
    'DT1-G4': evaluateGate4,
    'DT1-G5': evaluateGate5
  };

  function computeExit(gateResults) {
    if (gateResults.some(function (g) { return g.skipTo === 'ROUTE_AWAY'; })) {
      return { verdict: 'INVESTIGATE', conditions: ['Re-route to correct disruption tree — DT-01 not established.'], authority: AUTHORITY };
    }
    var affirmativeAdverse = gateResults.some(function (g) {
      return (g.affirmativeAdverse || (g.confidence === 'red' && g.answer === 'no')) &&
        /fail|break|intervening|voluntar|own.?staff|carrier-requested|moens/i.test(g.reason || g.conclusion || '');
    });
    if (affirmativeAdverse) {
      return { verdict: 'SETTLE', conditions: ['Affirmative adverse finding in DT-01 — EC chain fails on the facts.'], authority: AUTHORITY };
    }
    var unknowns = gateResults.filter(function (g) { return g.answer === 'unknown'; });
    var keyGaps = [];
    gateResults.forEach(function (g) {
      (g.gaps || []).forEach(function (gap) {
        if (gap.tier === 'K') keyGaps.push(gap.name);
      });
    });
    var g1 = gateResults.find(function (g) { return g.gateId === 'DT1-G1'; });
    var g2 = gateResults.find(function (g) { return g.gateId === 'DT1-G2'; });
    var ecEstablished = (g1 && g1.answer === 'yes') || (g2 && g2.answer === 'yes');
    if (unknowns.length || keyGaps.length) {
      var hold = [];
      unknowns.forEach(function (g) { hold.push('EVIDENCE_HOLD: ' + (g.name || g.gateId) + ' — proof pending'); });
      keyGaps.forEach(function (n) { hold.push('Collect key evidence: ' + n); });
      return {
        verdict: 'DEFEND_HOLD',
        conditions: hold.length ? hold : ['EVIDENCE_HOLD: confirm Eurocontrol / ATFM record on file.'],
        authority: AUTHORITY,
        conditionType: 'EVIDENCE_HOLD'
      };
    }
    if (ecEstablished) {
      return { verdict: 'DEFEND', conditions: [], authority: AUTHORITY };
    }
    return { verdict: 'DEFEND_WITH_CONDITIONS', conditions: ['Confirm Eurocontrol CTOT / ATFM restriction on file.'], authority: AUTHORITY };
  }

  function runTree(ctx, opts) {
    opts = opts || {};
    ctx = ctx || {};
    var forced = !!opts.force;
    if (!forced && !matches(ctx.iccText, ctx.causalChain)) {
      return { treeId: TREE_ID, applicable: false, gates: [], evidencePack: [], exit: null };
    }

    var gateResults = [];
    var current = 'DT1-G1';
    var safety = 0;
    while (current && current !== 'EXIT' && safety < 10) {
      safety++;
      if (current === 'ROUTE_AWAY') {
        gateResults.push({ gateId: 'DT1-ROUTE', answer: 'route_away', confidence: 'red', reason: 'Not DT-01.', conclusion: null, gaps: [], skipTo: 'EXIT' });
        break;
      }
      var evaluator = gateEvaluators[current];
      if (!evaluator) break;
      var gateDef = GATES.find(function (g) { return g.id === current; });
      var result = evaluator(ctx);
      result.question = gateDef ? gateDef.question : '';
      result.name = gateDef ? gateDef.name : '';
      result.requiredLibKeys = gateDef ? gateDef.requiredLibKeys : [];
      gateResults.push(result);
      if (ctx.confidenceManager && gateDef) {
        updateGateConclusions(ctx.confidenceManager, gateDef, result.confidence, result.conclusion, result.reason, ctx.evidenceManager);
      }
      current = result.skipTo;
    }

    return {
      treeId: TREE_ID,
      disruptionType: DISRUPTION_TYPE,
      applicable: true,
      gates: gateResults,
      evidencePack: pack(),
      exit: computeExit(gateResults),
      authority: AUTHORITY,
      forced: forced
    };
  }

  function createTreeDT01(ctx) {
    return {
      treeId: TREE_ID,
      disruptionType: DISRUPTION_TYPE,
      run: function () { return runTree(ctx); },
      getGates: function () { return GATES.slice(); },
      getEvidencePack: pack
    };
  }

  return {
    TREE_ID: TREE_ID,
    DISRUPTION_TYPE: DISRUPTION_TYPE,
    GATES: GATES,
    matches: matches,
    runTree: runTree,
    createTreeDT01: createTreeDT01
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DefendAbleTreeDT01;
}
