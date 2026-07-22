/* DefendAble — shared decision tree engine */
var DefendAbleTreeEngine = (function () {

  var NEGATOR_RE = /\b(not|no|without|did\s+not|does\s+not|do\s+not|never|unaffected|remained\s+legal|in\s+hours|within\s+(?:hours|limits|ftl)|no\s+need|did\s+not\s+need|need\s+not|weren'?t|wasn'?t|could\s+not\s+need)\b/i;
  var CREW_POSITIVE_RE = /\b(crew\s+sick|pilot\s+sick|captain\s+(?:went\s+)?sick|fo\s+sick|crew\s+illness|out\s+of\s+hours|ftl\s+(?:exceeded|breach|limit)|fdp\s+(?:exceeded|expired|limit)|timed\s+out|discretion\s+used|could\s+not\s+be\s+replaced|crew\s+replacement\s+required|needed\s+replacing|crew\s+needed\s+replacing|went\s+sick)\b/i;
  var CREW_NEGATED_EXCLUSION_RE = /\b(within\s+(?:hours|limits|ftl)|operating\s+within\s+hours|did\s+not\s+need\s+replac|no\s+crew\s+issue|crew\s+(?:were|was)\s+(?:legal|ok)|remained\s+legal|in\s+hours)\b/i;

  /** Word-window negation: true if keyword match is negated within ±6 words. */
  function isNegatedHit(text, matchIndex, matchLen) {
    if (matchIndex < 0) return false;
    var t = text || '';
    var before = t.slice(0, matchIndex);
    var after = t.slice(matchIndex + (matchLen || 0));
    var beforeWords = before.trim().split(/\s+/).filter(Boolean).slice(-6).join(' ');
    var afterWords = after.trim().split(/\s+/).filter(Boolean).slice(0, 6).join(' ');
    return NEGATOR_RE.test(beforeWords) || NEGATOR_RE.test(afterWords);
  }

  function findUnnegated(text, pattern) {
    var t = text || '';
    var re = pattern.global ? pattern : new RegExp(pattern.source, (pattern.flags || '') + (pattern.flags && pattern.flags.indexOf('g') >= 0 ? '' : 'g'));
    if (!re.global) re = new RegExp(pattern.source, (pattern.flags || '') + 'g');
    var m;
    while ((m = re.exec(t)) !== null) {
      if (!isNegatedHit(t, m.index, m[0].length)) return m;
      if (!re.global) break;
    }
    return null;
  }

  /** True when narrative affirmatively asserts a crew/FTL issue (not merely mentions crew). */
  function crewIssueAsserted(text) {
    var t = text || '';
    if (CREW_NEGATED_EXCLUSION_RE.test(t) && !CREW_POSITIVE_RE.test(t)) return false;
    return !!findUnnegated(t, CREW_POSITIVE_RE);
  }

  /** True when crew is expressly excluded — note as a strength. */
  function crewExpresslyExcluded(text) {
    return CREW_NEGATED_EXCLUSION_RE.test(text || '') && !crewIssueAsserted(text);
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
    var req = (gate.requiredLibKeys || []).concat(gate.secondaryLibKeys || []);
    var answer = 'no';
    if (gate.type === 'measures') {
      var t = ctx.iccText || '';
      var constrained = /\bno standby\b|\bnot available\b|\bcould not\b/i.test(t);
      answer = constrained ? 'unknown' : (iccHit || evHit ? 'yes' : 'unknown');
    } else if (iccHit || evHit) {
      answer = 'yes';
    } else if (gate.type === 'entry' && gate.allowTopsFallback && hasCollected(ctx.evidenceManager, 'tops')) {
      answer = 'yes';
    } else if (gate.type === 'entry') {
      // Entry not established on the narrative → tree does not apply
      answer = 'no';
    } else if (req.length) {
      // Confirm / evidence gates with no ICC hit and no collected proof = UNKNOWN
      // (missing docs are normal on a fresh case — not an adverse finding)
      answer = 'unknown';
    } else {
      answer = 'no';
    }

    var gaps = gateEvidenceGaps(ctx.evidenceManager, req);
    var confidence;
    if (answer === 'no' && gate.type === 'entry') confidence = 'red';
    else if (answer === 'unknown') confidence = 'amber';
    else if (answer === 'no' && gate.affirmativeAdverse) confidence = 'red';
    else if (answer === 'no') confidence = 'amber'; // soft no without affirmative adverse evidence
    else confidence = confidenceFromGaps(gaps, answer === 'yes' ? 'yes' : answer);

    var skipTo;
    if (answer === 'yes') skipTo = gate.onYes || nextGateId(gates, gateIndex);
    else if (answer === 'no') skipTo = gate.onNo || 'ROUTE_AWAY';
    else skipTo = gate.onUnknown || nextGateId(gates, gateIndex);

    return {
      gateId: gate.id,
      answer: answer,
      confidence: confidence,
      reason: gate['reason' + answer] || gate.reason || (answer === 'yes' ? gate.yesMeans : (answer === 'unknown' ? (gate.unknownMeans || 'Evidence pending — not an adverse finding.') : gate.noMeans)) || '',
      conclusion: answer === 'yes' ? (gate.yesMeans || gate.conclusion) : (answer === 'no' ? gate.noMeans : (gate.unknownMeans || gate.conclusion)),
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

    // SETTLE only on affirmative adverse findings (ICC proves EC fails / RM fails / chain broken)
    var affirmativeAdverse = gateResults.some(function (g) {
      return g.confidence === 'red' && g.answer === 'no' && g.answer !== 'n/a' &&
        (g.affirmativeAdverse || /fail|break|concede|not clean|voluntar|own.?staff|never extraordinary/i.test(g.reason || g.conclusion || ''));
    });
    if (affirmativeAdverse) {
      return {
        verdict: 'SETTLE',
        conditions: ['Affirmative adverse finding in ' + treeId + ' — EC/RM fails on the facts.'],
        authority: authority
      };
    }

    var unknowns = gateResults.filter(function (g) { return g.answer === 'unknown'; });
    var keyGaps = [];
    gateResults.forEach(function (g) {
      (g.gaps || []).forEach(function (gap) {
        if (gap.tier === 'K') keyGaps.push(gap.name);
      });
    });

    var ecGate = ecGateId
      ? gateResults.find(function (g) { return g.gateId === ecGateId; })
      : gateResults.find(function (g) { return g.answer === 'yes'; });

    // Missing evidence / unknown gates ⇒ DEFEND_HOLD (conditions = what to collect)
    if (unknowns.length || keyGaps.length) {
      var holdConditions = [];
      unknowns.forEach(function (g) {
        holdConditions.push('EVIDENCE_HOLD: ' + (g.name || g.gateId) + ' — proof pending');
      });
      keyGaps.forEach(function (n) {
        holdConditions.push('Collect key evidence: ' + n);
      });
      return {
        verdict: 'DEFEND_HOLD',
        conditions: holdConditions.length ? holdConditions : ['EVIDENCE_HOLD: collect outstanding proof before final defence.'],
        authority: authority,
        conditionType: 'EVIDENCE_HOLD'
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
    if (def.customRun) return def.customRun(ctx, force);
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
    runDefinition: runDefinition,
    isNegatedHit: isNegatedHit,
    findUnnegated: findUnnegated,
    crewIssueAsserted: crewIssueAsserted,
    crewExpresslyExcluded: crewExpresslyExcluded
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DefendAbleTreeEngine;
}
