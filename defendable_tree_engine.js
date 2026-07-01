/* DefendAble — shared decision tree engine */
var DefendAbleTreeEngine = (function () {

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
        var meta = typeof DefendAbleEvidencePack !== 'undefined'
          ? DefendAbleEvidencePack.getLibMeta(lk) : { name: lk, tier: 'K' };
        gaps.push({ libKey: lk, status: st, name: meta.name, tier: meta.tier });
      }
    });
    return gaps;
  }

  function confidenceFromGaps(gaps, answer) {
    if (answer === 'no' || answer === 'route_away' || answer === 'concede') return 'red';
    if (!gaps.length) return 'green';
    return 'amber';
  }

  function iccMatches(ctx, pattern) {
    if (!pattern) return false;
    return pattern.test(ctx.iccText || '');
  }

  function chainMatches(ctx, pattern) {
    if (!pattern) return false;
    return (ctx.causalChain || []).some(function (ev) {
      return pattern.test(ev.description || '');
    });
  }

  function evidenceHit(ctx, gate) {
    var em = ctx.evidenceManager;
    var hit = false;
    (gate.evidenceLibKeys || gate.requiredLibKeys || []).forEach(function (lk) {
      if (hasCollected(em, lk)) hit = true;
    });
    var findings = gate.findingTypes || {};
    Object.keys(findings).forEach(function (lk) {
      if (hasFinding(em, lk, findings[lk])) hit = true;
    });
    return hit;
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

  function evaluateGate(gate, ctx, gateIndex, gates) {
    if (gate.conditional && !gate.conditional(ctx)) {
      return {
        gateId: gate.id,
        answer: 'n/a',
        confidence: 'grey',
        reason: gate.skipReason || 'Not applicable on these facts.',
        conclusion: null,
        gaps: [],
        skipTo: gate.onSkip || gate.onNA || nextGateId(gates, gateIndex)
      };
    }

    if (gate.type === 'concede') {
      return {
        gateId: gate.id,
        answer: 'concede',
        confidence: 'red',
        reason: gate.reason || 'No EC defence — concede this point.',
        conclusion: gate.conclusion || gate.reason,
        gaps: [],
        skipTo: 'EXIT',
        exitOverride: {
          verdict: 'CONCEDE',
          conditions: gate.conditions || [gate.reason || 'Concede — no extraordinary circumstances defence.'],
          authority: gate.authority
        }
      };
    }

    if (gate.type === 'judgment') {
      return {
        gateId: gate.id,
        answer: 'judgment',
        confidence: 'judgment',
        reason: gate.reason || 'Judgment node — do not resolve automatically.',
        conclusion: gate.conclusion || gate.question,
        gaps: gateEvidenceGaps(ctx.evidenceManager, gate.requiredLibKeys),
        skipTo: 'EXIT',
        exitOverride: {
          verdict: 'JUDGMENT_REQUIRED',
          conditions: gate.conditions || [gate.reason || 'Outstanding judgment required.'],
          authority: gate.authority
        }
      };
    }

    var iccHit = iccMatches(ctx, gate.iccPattern) || chainMatches(ctx, gate.iccPattern);
    var evHit = evidenceHit(ctx, gate);
    var answer = 'no';
    if (gate.type === 'measures') {
      var t = ctx.iccText || '';
      var constrained = /\bno standby\b|\bnot available\b|\bcould not\b/i.test(t);
      answer = constrained ? 'unknown' : 'yes';
    } else if (iccHit || evHit) {
      answer = 'yes';
    } else if (gate.type === 'entry' && gate.allowTopsFallback && hasCollected(ctx.evidenceManager, 'tops')) {
      answer = 'yes';
    }

    var req = (gate.requiredLibKeys || []).concat(gate.secondaryLibKeys || []);
    var gaps = gateEvidenceGaps(ctx.evidenceManager, req);
    var confidence;
    if (answer === 'no' && gate.type === 'entry') confidence = 'red';
    else if (answer === 'unknown') confidence = 'amber';
    else confidence = confidenceFromGaps(gaps, answer === 'yes' ? 'yes' : answer);

    var skipTo;
    if (answer === 'yes') skipTo = gate.onYes || nextGateId(gates, gateIndex);
    else if (answer === 'no') skipTo = gate.onNo || 'ROUTE_AWAY';
    else skipTo = gate.onUnknown || nextGateId(gates, gateIndex);

    return {
      gateId: gate.id,
      answer: answer,
      confidence: confidence,
      reason: gate['reason' + answer] || gate.reason || (answer === 'yes' ? gate.yesMeans : gate.noMeans) || '',
      conclusion: answer === 'yes' ? (gate.yesMeans || gate.conclusion) : (answer === 'no' ? gate.noMeans : gate.conclusion),
      gaps: gaps,
      skipTo: skipTo
    };
  }

  function nextGateId(gates, index) {
    if (index + 1 < gates.length) return gates[index + 1].id;
    return 'EXIT';
  }

  function computeExit(treeId, authority, gateResults, ecGateId) {
    var exitOverride = null;
    gateResults.forEach(function (g) {
      if (g.exitOverride) exitOverride = g.exitOverride;
    });
    if (exitOverride) {
      return {
        verdict: exitOverride.verdict,
        conditions: exitOverride.conditions || [],
        authority: exitOverride.authority || authority
      };
    }

    if (gateResults.some(function (g) { return g.skipTo === 'ROUTE_AWAY'; })) {
      return {
        verdict: 'INVESTIGATE',
        conditions: ['Re-route to correct disruption tree — ' + treeId + ' not established.'],
        authority: authority
      };
    }
    if (gateResults.some(function (g) { return g.confidence === 'red' && g.answer !== 'n/a'; })) {
      return {
        verdict: 'SETTLE',
        conditions: ['Contested gate in ' + treeId + ' — EC chain not clean.'],
        authority: authority
      };
    }

    var keyGaps = [];
    gateResults.forEach(function (g) {
      (g.gaps || []).forEach(function (gap) {
        if (gap.tier === 'K') keyGaps.push(gap.name);
      });
    });

    var ecGate = ecGateId
      ? gateResults.find(function (g) { return g.gateId === ecGateId; })
      : gateResults.find(function (g) { return g.answer === 'yes'; });

    if (keyGaps.length) {
      return {
        verdict: 'DEFEND_WITH_CONDITIONS',
        conditions: keyGaps.map(function (n) { return 'Collect key evidence: ' + n; }),
        authority: authority
      };
    }
    if (ecGate && ecGate.answer === 'yes') {
      return { verdict: 'DEFEND', conditions: [], authority: authority };
    }
    return {
      verdict: 'DEFEND_WITH_CONDITIONS',
      conditions: ['Confirm key evidence on file before final defence.'],
      authority: authority
    };
  }

  function pack(disruptionType) {
    return typeof DefendAbleEvidencePack !== 'undefined'
      ? DefendAbleEvidencePack.getPackItems(disruptionType) : [];
  }

  function runDefinition(def, ctx, force) {
    ctx = ctx || {};
    if (def.customRun) return def.customRun(ctx);
    if (!force && def.matches && !def.matches(ctx.iccText, ctx.causalChain)) {
      return { treeId: def.treeId, applicable: false, gates: [], evidencePack: [], exit: null };
    }

    var gateResults = [];
    var current = def.gates[0] ? def.gates[0].id : null;
    var safety = 0;
    var routePrefix = def.treeId.replace('DT-', 'DT').replace('-', '');

    while (current && current !== 'EXIT' && safety < 15) {
      safety++;
      if (current === 'ROUTE_AWAY') {
        gateResults.push({
          gateId: routePrefix + '-ROUTE', answer: 'route_away', confidence: 'red',
          reason: 'Not ' + def.treeId + '.', conclusion: null, gaps: [], skipTo: 'EXIT'
        });
        break;
      }
      var gateIndex = def.gates.findIndex(function (g) { return g.id === current; });
      if (gateIndex < 0) break;
      var gateDef = def.gates[gateIndex];
      var result = evaluateGate(gateDef, ctx, gateIndex, def.gates);
      result.question = gateDef.question || '';
      result.name = gateDef.name || '';
      result.requiredLibKeys = gateDef.requiredLibKeys || [];
      gateResults.push(result);
      if (ctx.confidenceManager) {
        updateGateConclusions(ctx.confidenceManager, gateDef, result.confidence, result.conclusion, result.reason, ctx.evidenceManager);
      }
      current = result.skipTo;
    }

    return {
      treeId: def.treeId,
      disruptionType: def.disruptionType,
      applicable: true,
      gates: gateResults,
      evidencePack: pack(def.disruptionType),
      exit: computeExit(def.treeId, def.authority, gateResults, def.ecGateId),
      authority: def.authority
    };
  }

  return {
    evidenceIdForLibKey: evidenceIdForLibKey,
    getEvidenceItem: getEvidenceItem,
    hasCollected: hasCollected,
    hasFinding: hasFinding,
    gateEvidenceGaps: gateEvidenceGaps,
    confidenceFromGaps: confidenceFromGaps,
    updateGateConclusions: updateGateConclusions,
    evaluateGate: evaluateGate,
    computeExit: computeExit,
    runDefinition: runDefinition
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DefendAbleTreeEngine;
}
