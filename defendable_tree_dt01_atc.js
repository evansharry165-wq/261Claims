/* DefendAble Intelligence Engine v2 — DT-01 ATC/ATFM disruption tree */
var DefendAbleTreeDT01 = (function () {

  var TREE_ID = 'DT-01';
  var DISRUPTION_TYPE = 'ATC Restrictions';
  var AUTHORITY = 'Pešková C-315/15; Wallentin-Hermann C-549/07';

  var GATES = [
    {
      id: 'DT1-G1',
      name: 'CTOT assigned',
      question: 'Was a Eurocontrol CTOT (or equivalent ATFM slot restriction) assigned to this flight?',
      authority: 'Pešková — third-party flow control is per se extraordinary',
      requiredLibKeys: ['eurocontrol', 'tops'],
      conclusionIds: ['DT1_CTOT_CONFIRMED', 'U7_EC_ESTABLISHED'],
      yesMeans: 'EC confirmed at root — both Wallentin-Hermann limbs satisfied for ATC flow control.',
      noNext: 'DT1-G2'
    },
    {
      id: 'DT1-G2',
      name: 'ATC airspace restriction',
      question: 'Was there an ATC restriction affecting this flight\'s airspace (delay codes 81–89, sector regulation, network ATFM)?',
      authority: 'Operational delay records system codes 81-89 + Eurocontrol ATFM',
      requiredLibKeys: ['tops', 'eurocontrol', 'notam'],
      conclusionIds: ['DT1_ATC_CAUSE'],
      yesMeans: 'ATC extraordinary circumstances candidate — corroborate with Eurocontrol and TOPS.',
      noNext: 'ROUTE_AWAY'
    },
    {
      id: 'DT1-G3',
      name: 'Direct ATC cause',
      question: 'Did the ATC restriction directly cause the passenger delay, without an intervening ordinary operational event?',
      authority: 'But-for test — van der Lans intervening ordinary event breaks chain',
      requiredLibKeys: ['tops', 'disco', 'aims'],
      conclusionIds: ['DT1_ATC_CAUSE', 'DT6_FTL_ROOT_CAUSE_ANALYSIS'],
      yesMeans: 'Causal chain from ATC to delay holds.',
      noMeans: 'Intervening cause — multi-tree or chain break analysis required.',
      noNext: 'DT1-G4'
    },
    {
      id: 'DT1-G4',
      name: 'Curfew / OND',
      question: 'Did the ATC delay push the flight past airport curfew causing overnight (OND) operation?',
      authority: 'Sturgeon — delay measured to next-day actual arrival; Art 9(1)(c) hotel mandatory',
      requiredLibKeys: ['tops', 'max_ops'],
      conclusionIds: ['U10_ART9_HOTEL_MET'],
      conditional: function (ctx) {
        return /\bond\b|\bovernight\b|\bnext day\b|\bcurfew\b|\bfollowing day\b/i.test(ctx.iccText || '');
      }
    },
    {
      id: 'DT1-G5',
      name: 'Reasonable measures',
      question: 'Were slot recovery, standby aircraft, and network recovery measures attempted and documented?',
      authority: 'Wallentin-Hermann para 40 — mandatory even after EC confirmed',
      requiredLibKeys: ['dpm', 'tops', 'disco'],
      secondaryLibKeys: ['internal_email', 'ops_review'],
      conclusionIds: ['U8_RM_SLOT_RECOVERY'],
      yesMeans: 'Reasonable measures defence supported.',
      noMeans: 'Failed intervention — EC may not save defence at U-8.'
    }
  ];

  function matches(iccText, chainEvents) {
    if (typeof DefendAbleEvidencePack !== 'undefined'
      && DefendAbleEvidencePack.detectDisruptionType(iccText) === 'Weather') {
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
    var ctotInIcc = /\bctot\b|\batfm\b|\beurocontrol\b|\bnetwork.wide\b|\ball carriers\b/i.test(t);
    var ctotEvidence = hasCollected(em, 'eurocontrol') || hasFinding(em, 'eurocontrol', 'TOPS_CTOT_CONFIRMED');
    var answer = (ctotInIcc || ctotEvidence) ? 'yes' : 'no';
    var gaps = gateEvidenceGaps(em, gate.requiredLibKeys);
    var confidence = answer === 'yes' ? (gaps.length ? 'amber' : 'green') : 'grey';
    var reason = answer === 'yes'
      ? (gaps.length ? 'CTOT indicated but key pack items not fully on file.' : 'CTOT/ATFM confirmed — EC at root.')
      : 'No CTOT indicated — proceed to wider ATC restriction test.';
    return {
      gateId: 'DT1-G1', answer: answer, confidence: confidence, reason: reason,
      conclusion: answer === 'yes' ? gate.yesMeans : null, gaps: gaps,
      skipTo: answer === 'yes' ? 'DT1-G3' : 'DT1-G2'
    };
  }

  function evaluateGate2(ctx) {
    var gate = GATES[1];
    var t = ctx.iccText || '';
    var em = ctx.evidenceManager;
    var atcInIcc = /\batc\b|\bdelay code|\b81|\b89|\bflow control|\bsector capacity/i.test(t);
    var topsCollected = hasCollected(em, 'tops');
    var answer = (atcInIcc || topsCollected) ? 'yes' : 'no';
    var gaps = gateEvidenceGaps(em, gate.requiredLibKeys);
    var confidence = answer === 'no' ? 'red' : confidenceFromGaps(gaps, 'yes');
    return {
      gateId: 'DT1-G2', answer: answer, confidence: confidence,
      reason: answer === 'no' ? 'Not an ATC/ATFM case — re-route to other disruption tree.' : 'ATC restriction indicated.',
      conclusion: answer === 'yes' ? gate.yesMeans : 'Case does not meet DT-01 entry criteria.',
      gaps: gaps, skipTo: answer === 'no' ? 'ROUTE_AWAY' : 'DT1-G3'
    };
  }

  function evaluateGate3(ctx) {
    var gate = GATES[2];
    var em = ctx.evidenceManager;
    var chain = ctx.causalChain || [];
    var intervening = chain.some(function (ev) {
      return ev.chainBreak || /\btechnical\b|\bcrew illness\b|\bordinary\b/i.test(ev.description || '');
    });
    var fdpElevated = hasFinding(em, 'aims', 'AIMS_FDP_ELEVATED_BEFORE_DISRUPTION');
    var answer = (intervening || fdpElevated) ? 'no' : 'yes';
    var gaps = gateEvidenceGaps(em, gate.requiredLibKeys);
    var confidence = answer === 'no' ? 'amber' : confidenceFromGaps(gaps, 'yes');
    return {
      gateId: 'DT1-G3', answer: answer, confidence: confidence,
      reason: answer === 'no' ? 'Intervening or contributing factor — chain may be contested.' : 'Direct ATC causation supported.',
      conclusion: answer === 'yes' ? gate.yesMeans : gate.noMeans,
      gaps: gaps, skipTo: 'DT1-G4'
    };
  }

  function evaluateGate4(ctx) {
    var gate = GATES[3];
    if (gate.conditional && !gate.conditional(ctx)) {
      return { gateId: 'DT1-G4', answer: 'n/a', confidence: 'grey', reason: 'OND/curfew not indicated.', conclusion: null, gaps: [], skipTo: 'DT1-G5' };
    }
    var em = ctx.evidenceManager;
    var gaps = gateEvidenceGaps(em, gate.requiredLibKeys);
    var confidence = confidenceFromGaps(gaps, 'yes');
    return {
      gateId: 'DT1-G4', answer: 'yes', confidence: confidence,
      reason: gaps.length ? 'OND indicated — hotel/Art 9 evidence gaps remain.' : 'OND delay and passenger care documented.',
      conclusion: 'Sturgeon delay = scheduled arrival to next-day actual. Art 9 hotel mandatory.',
      gaps: gaps, skipTo: 'DT1-G5'
    };
  }

  function evaluateGate5(ctx) {
    var gate = GATES[4];
    var em = ctx.evidenceManager;
    var t = ctx.iccText || '';
    var noStandby = /\bno standby\b|\bnot available\b|\bcould not be rescued\b/i.test(t);
    var req = (gate.requiredLibKeys || []).concat(gate.secondaryLibKeys || []);
    var gaps = gateEvidenceGaps(em, req);
    var answer = noStandby ? 'unknown' : 'yes';
    var confidence = noStandby ? 'amber' : confidenceFromGaps(gaps, 'yes');
    return {
      gateId: 'DT1-G5', answer: answer, confidence: confidence,
      reason: noStandby ? 'ICC indicates recovery not available — verify DPM and fleet state.' : 'Recovery measures documented.',
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
    if (gateResults.some(function (g) { return g.confidence === 'red'; })) {
      return { verdict: 'SETTLE', conditions: ['Contested gate in DT-01 — EC chain not clean.'], authority: AUTHORITY };
    }
    var keyGaps = [];
    gateResults.forEach(function (g) {
      (g.gaps || []).forEach(function (gap) {
        if (gap.tier === 'K') keyGaps.push(gap.name);
      });
    });
    var g1 = gateResults.find(function (g) { return g.gateId === 'DT1-G1'; });
    var ecEstablished = g1 && g1.answer === 'yes';
    if (keyGaps.length) {
      return {
        verdict: 'DEFEND_WITH_CONDITIONS',
        conditions: keyGaps.map(function (n) { return 'Collect key evidence: ' + n; }),
        authority: AUTHORITY
      };
    }
    if (ecEstablished) {
      return { verdict: 'DEFEND', conditions: [], authority: AUTHORITY };
    }
    return { verdict: 'DEFEND_WITH_CONDITIONS', conditions: ['Confirm Eurocontrol CTOT and TOPS delay record on file.'], authority: AUTHORITY };
  }

  function runTree(ctx) {
    ctx = ctx || {};
    if (!matches(ctx.iccText, ctx.causalChain)) {
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
      authority: AUTHORITY
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
