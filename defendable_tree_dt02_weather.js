/* DefendAble Intelligence Engine v2 — DT-02 Weather destination disruption tree */
var DefendAbleTreeDT02 = (function () {

  var TREE_ID = 'DT-02';
  var DISRUPTION_TYPE = 'Weather';
  var AUTHORITY = 'Pešková C-315/15; Wallentin-Hermann C-549/07; Blanche v EasyJet [2019] EWCA Civ 69';

  var GATES = [
    {
      id: 'DT2-G1',
      name: 'METAR below minima',
      question: 'Was destination weather below operating minima at ETA (METAR/TAF corroboration)?',
      authority: 'METAR below ILS minima = EC — meteorological event beyond carrier control',
      requiredLibKeys: ['ogimet', 'tops'],
      conclusionIds: ['DT2_METAR_BELOW_MINIMA', 'U7_LIMB1_INHERENCY', 'U7_EC_ESTABLISHED'],
      yesMeans: 'Weather EC established at root — Limb 1 inherency satisfied.',
      noNext: 'DT2-G2'
    },
    {
      id: 'DT2-G2',
      name: 'Weather disruption confirmed',
      question: 'Is there corroborating evidence of adverse weather at the destination (thunderstorm, below minima, SIGMET)?',
      authority: 'Ogimet METAR/TAF + Met Office hazard forecast',
      requiredLibKeys: ['ogimet', 'met_office', 'tops'],
      conclusionIds: ['DT2_METAR_BELOW_MINIMA'],
      yesMeans: 'Weather extraordinary circumstances candidate — pull Ogimet and Met Office immediately.',
      noMeans: 'Not a weather destination case — re-route to correct disruption tree.',
      noNext: 'ROUTE_AWAY'
    },
    {
      id: 'DT2-G3',
      name: 'Mandatory ATC diversion',
      question: 'Did ATC mandate diversion to alternate due to weather (not carrier discretion alone)?',
      authority: 'ATC mandatory diversion instruction — Limb 2 beyond carrier actual control',
      requiredLibKeys: ['tops', 'flightradar', 'safetynet'],
      secondaryLibKeys: ['hermes'],
      conclusionIds: ['U7_LIMB2_CONTROL'],
      conditional: function (ctx) {
        return /\bdiversion\b|\balternate\b|\bvalencia\b|\bmandatory atc diversion\b/i.test(ctx.iccText || '');
      }
    },
    {
      id: 'DT2-G4',
      name: 'TAF foreseeability',
      question: 'Was destination weather foreseeable from TAF at departure (claimant foreseeability vulnerability)?',
      authority: 'Blanche — TAF conditions within forecast undermine foreseeability challenge',
      requiredLibKeys: ['ogimet', 'met_office', 'connected'],
      conclusionIds: ['DT2_FORESEEABILITY_RISK'],
      conditional: function (ctx) {
        return /\btaf\b|\bforecast\b|\bat departure\b|\bforesee/i.test(ctx.iccText || '');
      }
    },
    {
      id: 'DT2-G5',
      name: 'SIGMET corroboration',
      question: 'Was an active SIGMET in force for the destination weather phenomenon?',
      authority: 'SIGMET = strongest third-party corroboration for weather EC',
      requiredLibKeys: ['ogimet', 'met_office'],
      conclusionIds: ['DT2_METAR_BELOW_MINIMA', 'U7_LIMB2_CONTROL'],
      conditional: function (ctx) {
        return /\bsigmet\b/i.test(ctx.iccText || '');
      }
    },
    {
      id: 'DT2-G6',
      name: 'Standby blocked by weather',
      question: 'Was standby aircraft or crew recovery blocked by the same weather event?',
      authority: 'Standby blocked by same EC event — secondary EC independently satisfies Wallentin-Hermann',
      requiredLibKeys: ['aims', 'tops'],
      secondaryLibKeys: ['internal_email', 'dpm'],
      conclusionIds: ['U8_RM_CREW_RECOVERY'],
      conditional: function (ctx) {
        return /\bstandby\b|\bcould not position\b|\bno standby\b|\brecovery\b/i.test(ctx.iccText || '');
      }
    },
    {
      id: 'DT2-G7',
      name: 'Reasonable measures',
      question: 'Were alternate airport, passenger care, and recovery options documented and exhausted?',
      authority: 'Wallentin-Hermann para 40 — mandatory even after EC confirmed',
      requiredLibKeys: ['dpm', 'tops', 'max_ops'],
      secondaryLibKeys: ['internal_email', 'ops_review'],
      conclusionIds: ['U8_RM_SLOT_RECOVERY'],
      yesMeans: 'Reasonable measures defence supported.',
      noMeans: 'Failed intervention — EC may not save defence at U-8.'
    }
  ];

  function isWeatherOriginOnly(text) {
    var t = text || '';
    return /\blvp\b|\bsnowtam|\brunway closure|\bde-ic\b|\borigin weather\b/i.test(t)
      && !/\bdiversion\b|\bbelow minima\b|\bthunderstorm\b|\barrival destination\b|\bdestination\b/i.test(t);
  }

  function matches(iccText, chainEvents) {
    if (isWeatherOriginOnly(iccText)) return false;
    var t = (iccText || '').toLowerCase();
    if (/\bthunderstorm\b|\bweather\b|\bbelow minima\b|\bdiversion\b|\bsigmet\b|\bmetar\b|\bmandatory atc diversion\b/i.test(t)) {
      return true;
    }
    return (chainEvents || []).some(function (ev) {
      return /\bweather\b|\bthunderstorm\b|\bbelow minima\b|\bdiversion\b|\bsigmet\b/i.test(ev.description || '');
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
    var gate = GATES[0];
    var t = ctx.iccText || '';
    var em = ctx.evidenceManager;
    var weatherInIcc = /\bbelow minima\b|\bthunderstorm\b|\bweather\b|\bdiversion\b/i.test(t);
    var metarEvidence = hasCollected(em, 'ogimet') || hasFinding(em, 'ogimet', 'METAR_BELOW_ILS_MINIMA');
    var answer = (weatherInIcc || metarEvidence) ? 'yes' : 'no';
    var gaps = gateEvidenceGaps(em, gate.requiredLibKeys);
    var confidence = answer === 'yes' ? confidenceFromGaps(gaps, 'yes') : 'grey';
    return {
      gateId: 'DT2-G1', answer: answer, confidence: confidence,
      reason: answer === 'yes'
        ? (gaps.length ? 'Weather indicated — Ogimet METAR not fully on file.' : 'METAR below minima confirmed — weather EC at root.')
        : 'No destination weather indicated — proceed to wider weather test.',
      conclusion: answer === 'yes' ? gate.yesMeans : null,
      gaps: gaps, skipTo: answer === 'yes' ? 'DT2-G3' : 'DT2-G2'
    };
  }

  function evaluateGate2(ctx) {
    var gate = GATES[1];
    var t = ctx.iccText || '';
    var em = ctx.evidenceManager;
    var weatherHint = /\bweather\b|\bthunderstorm\b|\bsigmet\b|\bmetar\b/i.test(t);
    var topsCollected = hasCollected(em, 'tops');
    var answer = (weatherHint || topsCollected) ? 'yes' : 'no';
    var gaps = gateEvidenceGaps(em, gate.requiredLibKeys);
    var confidence = answer === 'no' ? 'red' : confidenceFromGaps(gaps, 'yes');
    return {
      gateId: 'DT2-G2', answer: answer, confidence: confidence,
      reason: answer === 'no' ? 'Not a weather destination case — re-route.' : 'Weather disruption indicated.',
      conclusion: answer === 'yes' ? gate.yesMeans : 'Case does not meet DT-02 entry criteria.',
      gaps: gaps, skipTo: answer === 'no' ? 'ROUTE_AWAY' : 'DT2-G7'
    };
  }

  function evaluateGate3(ctx) {
    var gate = GATES[2];
    if (gate.conditional && !gate.conditional(ctx)) {
      return { gateId: 'DT2-G3', answer: 'n/a', confidence: 'grey', reason: 'No diversion indicated.', conclusion: null, gaps: [], skipTo: 'DT2-G4' };
    }
    var em = ctx.evidenceManager;
    var req = (gate.requiredLibKeys || []).concat(gate.secondaryLibKeys || []);
    var gaps = gateEvidenceGaps(em, req);
    var confidence = confidenceFromGaps(gaps, 'yes');
    return {
      gateId: 'DT2-G3', answer: 'yes', confidence: confidence,
      reason: gaps.length ? 'Diversion indicated — flight track and safety records gaps remain.' : 'Mandatory diversion documented — Limb 2 satisfied.',
      conclusion: 'ATC-mandated diversion due to weather — beyond carrier actual control.',
      gaps: gaps, skipTo: 'DT2-G4'
    };
  }

  function evaluateGate4(ctx) {
    var gate = GATES[3];
    if (gate.conditional && !gate.conditional(ctx)) {
      return { gateId: 'DT2-G4', answer: 'n/a', confidence: 'grey', reason: 'TAF foreseeability not in issue.', conclusion: null, gaps: [], skipTo: 'DT2-G5' };
    }
    var em = ctx.evidenceManager;
    var gaps = gateEvidenceGaps(em, gate.requiredLibKeys);
    var tafInForecast = hasFinding(em, 'ogimet', 'TAF_CONDITIONS_WITHIN_FORECAST');
    var confidence = tafInForecast ? 'amber' : confidenceFromGaps(gaps, 'yes');
    return {
      gateId: 'DT2-G4', answer: tafInForecast ? 'risk' : 'yes', confidence: confidence,
      reason: tafInForecast ? 'TAF conditions within forecast — foreseeability challenge for claimant.' : 'TAF evidence on file.',
      conclusion: tafInForecast ? 'Foreseeability risk — monitor claimant TAF argument.' : null,
      gaps: gaps, skipTo: 'DT2-G5'
    };
  }

  function evaluateGate5(ctx) {
    var gate = GATES[4];
    if (gate.conditional && !gate.conditional(ctx)) {
      return { gateId: 'DT2-G5', answer: 'n/a', confidence: 'grey', reason: 'SIGMET not referenced.', conclusion: null, gaps: [], skipTo: 'DT2-G6' };
    }
    var em = ctx.evidenceManager;
    var gaps = gateEvidenceGaps(em, gate.requiredLibKeys);
    var sigmetFound = hasFinding(em, 'ogimet', 'SIGMET_IN_FORCE');
    var confidence = sigmetFound ? 'green' : confidenceFromGaps(gaps, 'yes');
    return {
      gateId: 'DT2-G5', answer: 'yes', confidence: confidence,
      reason: sigmetFound ? 'SIGMET corroboration on file.' : 'SIGMET referenced — obtain Ogimet/Met Office pull.',
      conclusion: 'SIGMET strengthens third-party weather EC argument.',
      gaps: gaps, skipTo: 'DT2-G6'
    };
  }

  function evaluateGate6(ctx) {
    var gate = GATES[5];
    if (gate.conditional && !gate.conditional(ctx)) {
      return { gateId: 'DT2-G6', answer: 'n/a', confidence: 'grey', reason: 'Standby/recovery not in issue.', conclusion: null, gaps: [], skipTo: 'DT2-G7' };
    }
    var em = ctx.evidenceManager;
    var req = (gate.requiredLibKeys || []).concat(gate.secondaryLibKeys || []);
    var gaps = gateEvidenceGaps(em, req);
    var blocked = /\bcould not position\b|\bno standby\b|\bblocked by\b/i.test(ctx.iccText || '');
    var confidence = blocked ? confidenceFromGaps(gaps, 'yes') : 'green';
    return {
      gateId: 'DT2-G6', answer: blocked ? 'yes' : 'n/a', confidence: confidence,
      reason: blocked ? 'Standby blocked by weather — verify AIMS and DPM.' : 'Standby issue not asserted.',
      conclusion: blocked ? 'Same-weather standby block supports EC chain.' : null,
      gaps: gaps, skipTo: 'DT2-G7'
    };
  }

  function evaluateGate7(ctx) {
    var gate = GATES[6];
    var em = ctx.evidenceManager;
    var t = ctx.iccText || '';
    var noRecovery = /\bno standby\b|\bcould not\b|\bnot available\b/i.test(t);
    var req = (gate.requiredLibKeys || []).concat(gate.secondaryLibKeys || []);
    var gaps = gateEvidenceGaps(em, req);
    var answer = noRecovery ? 'unknown' : 'yes';
    var confidence = noRecovery ? 'amber' : confidenceFromGaps(gaps, 'yes');
    return {
      gateId: 'DT2-G7', answer: answer, confidence: confidence,
      reason: noRecovery ? 'ICC indicates recovery constrained — verify DPM and passenger care records.' : 'Recovery and care measures documented.',
      conclusion: answer === 'yes' ? gate.yesMeans : gate.noMeans,
      gaps: gaps, skipTo: 'EXIT'
    };
  }

  var gateEvaluators = {
    'DT2-G1': evaluateGate1,
    'DT2-G2': evaluateGate2,
    'DT2-G3': evaluateGate3,
    'DT2-G4': evaluateGate4,
    'DT2-G5': evaluateGate5,
    'DT2-G6': evaluateGate6,
    'DT2-G7': evaluateGate7
  };

  function computeExit(gateResults) {
    if (gateResults.some(function (g) { return g.skipTo === 'ROUTE_AWAY'; })) {
      return { verdict: 'INVESTIGATE', conditions: ['Re-route to correct disruption tree — DT-02 not established.'], authority: AUTHORITY };
    }
    if (gateResults.some(function (g) { return g.confidence === 'red'; })) {
      return { verdict: 'SETTLE', conditions: ['Contested gate in DT-02 — weather EC chain not clean.'], authority: AUTHORITY };
    }
    var keyGaps = [];
    gateResults.forEach(function (g) {
      (g.gaps || []).forEach(function (gap) {
        if (gap.tier === 'K') keyGaps.push(gap.name);
      });
    });
    var g1 = gateResults.find(function (g) { return g.gateId === 'DT2-G1'; });
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
    return { verdict: 'DEFEND_WITH_CONDITIONS', conditions: ['Confirm Ogimet METAR/TAF and TOPS diversion record on file.'], authority: AUTHORITY };
  }

  function runTree(ctx) {
    ctx = ctx || {};
    if (!matches(ctx.iccText, ctx.causalChain)) {
      return { treeId: TREE_ID, applicable: false, gates: [], evidencePack: [], exit: null };
    }

    var gateResults = [];
    var current = 'DT2-G1';
    var safety = 0;
    while (current && current !== 'EXIT' && safety < 12) {
      safety++;
      if (current === 'ROUTE_AWAY') {
        gateResults.push({ gateId: 'DT2-ROUTE', answer: 'route_away', confidence: 'red', reason: 'Not DT-02.', conclusion: null, gaps: [], skipTo: 'EXIT' });
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

  function createTreeDT02(ctx) {
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
    isWeatherOriginOnly: isWeatherOriginOnly,
    runTree: runTree,
    createTreeDT02: createTreeDT02
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DefendAbleTreeDT02;
}
