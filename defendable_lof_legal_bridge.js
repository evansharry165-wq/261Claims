/* DefendAble — Confirmed LOF → deterministic tree runner */
var DefendAbleLofLegalBridge = (function () {

  function buildLockedNarrative(lofRows, facts, causalNodes, rawText) {
    var parts = [];
    (lofRows || []).forEach(function (r) {
      if (!(r.flight || '').trim()) return;
      var line = [r.flight, r.route, r.std && ('STD ' + r.std), r.atd && ('ATD ' + r.atd),
        r.sta && ('STA ' + r.sta), r.ata && ('ATA ' + r.ata), r.status, r.note]
        .filter(Boolean).join(' · ');
      parts.push(line);
    });
    (causalNodes || []).forEach(function (n) {
      if (n && n.label) parts.push(n.label + (n.sub ? (': ' + n.sub) : ''));
    });
    if (facts) {
      if (facts.flightNum) parts.push('Flight ' + facts.flightNum);
      if (facts.depIata && facts.arrIata) parts.push(facts.depIata + '-' + facts.arrIata);
      if (facts.delayText) parts.push(facts.delayText);
    }
    var locked = parts.join('. ');
    if (rawText && rawText.trim()) locked = locked + '. ' + rawText.trim();
    return locked;
  }

  function buildCausalChain(causalNodes, lofRows, annotations) {
    var chain = [];
    (causalNodes || []).forEach(function (n, idx) {
      var note = (annotations && annotations[idx] && annotations[idx].text) || '';
      var desc = ((n && n.sub) || '') + ' ' + note;
      var chainBreak = !!(n && n.chainBreak) ||
        /\bvoluntar|\bchose to wait|\bwaited for (delayed )?passengers|\bcommercial decision|\bdiscretion\b/i.test(desc);
      chain.push({
        type: (n && n.type) || 'event',
        label: (n && n.label) || ('Event ' + (idx + 1)),
        description: desc.trim(),
        chainBreak: chainBreak,
        time: (n && n.time) || null
      });
    });
    (lofRows || []).forEach(function (r) {
      if (!(r.flight || '').trim()) return;
      var note = r.note || '';
      chain.push({
        type: 'sector',
        label: r.flight + (r.route ? (' ' + r.route) : ''),
        description: [r.status, note].filter(Boolean).join(' — '),
        chainBreak: /\bvoluntar|\bchose to wait|\bwaited for\b|\bcommercial\b/i.test(note),
        time: r.atd || r.std || null
      });
    });
    return chain;
  }

  function seedEvidenceFromTimeline(evidenceManager, tlEvStatus, evidenceDb, dtId) {
    if (!evidenceManager || typeof DefendAbleEvidencePack === 'undefined') return;
    var disruptionType = null;
    if (typeof DefendAbleTypeMap !== 'undefined') {
      var treeId = DefendAbleTypeMap.rmToTreeId(dtId);
      disruptionType = DefendAbleEvidencePack.detectDisruptionType
        ? DefendAbleEvidencePack.detectDisruptionType('')
        : null;
      // Prefer pack seeding by known RM label keywords
      var seedText = dtId || '';
      disruptionType = DefendAbleEvidencePack.detectDisruptionType(seedText) ||
        DefendAbleEvidencePack.detectDisruptionType(
          dtId === 'atfm' ? 'eurocontrol CTOT ATFM' :
          dtId === 'weather' ? 'thunderstorm METAR diversion' :
          dtId === 'birdstrike' ? 'birdstrike ingestion' :
          dtId === 'medical' ? 'medical emergency diversion' :
          dtId === 'own-ia' ? 'own staff strike' :
          dtId === 'crew-sick' ? 'crew illness pilot sick' :
          dtId === 'technical' ? 'hydraulic technical AOG defect' :
          seedText
        );
    }
    if (disruptionType) {
      DefendAbleEvidencePack.seedPackToEvidenceManager(evidenceManager, disruptionType);
    }

    // Mark collected / missing from timeline chip statuses where ids align loosely by name
    var items = (evidenceDb && dtId && evidenceDb[dtId]) ? evidenceDb[dtId] : [];
    Object.keys(tlEvStatus || {}).forEach(function (key) {
      var status = tlEvStatus[key];
      if (!status) return;
      var evId = key.split('_').slice(1).join('_');
      var meta = items.find(function (i) { return i.id === evId; });
      if (!meta) return;
      try {
        if (status === 'available' && evidenceManager.receiveEvidence) {
          if (!evidenceManager.has || !evidenceManager.has(evId)) {
            if (evidenceManager.addEvidence) {
              evidenceManager.addEvidence(evId, meta.name, meta.source || 'LOF', [], []);
            }
          }
          evidenceManager.receiveEvidence(evId, [{ type: 'LOF_TIMELINE_AVAILABLE', description: meta.proves || meta.name }]);
        }
      } catch (e) { /* non-fatal seed */ }
    });
  }

  function mapTreeExitToPreRating(treeResults, limb1Status) {
    var primary = (treeResults && treeResults[0]) || null;
    var exit = primary && primary.exit;
    var verdict = (exit && exit.verdict) || null;
    var conditions = (exit && exit.conditions) || [];
    var authority = (exit && exit.authority) || (primary && primary.authority) || '';
    var treeId = primary && primary.treeId;

    if (!verdict) {
      if (limb1Status === 'unlikely') {
        return {
          band: 'investigate',
          title: 'Needs further investigation',
          text: 'No matching decision tree exit. Limb 1 scaffold is unlikely — treat as settle/investigate until trees can run on a richer confirmed record.',
          treeVerdict: null,
          treeId: null,
          conditions: []
        };
      }
      return {
        band: 'borderline',
        title: 'Borderline — conditions apply',
        text: 'Trees did not return a primary exit. Proceed with caution using provisional classification only.',
        treeVerdict: null,
        treeId: null,
        conditions: []
      };
    }

    var condText = conditions.length ? (' Conditions: ' + conditions.slice(0, 3).join('; ')) : '';
    var authText = authority ? (' Authority: ' + authority + '.') : '';

    if (verdict === 'DEFEND') {
      return {
        band: 'defendable',
        title: 'Defendable with current evidence',
        text: 'Tree ' + treeId + ' exited DEFEND.' + authText + condText,
        treeVerdict: verdict,
        treeId: treeId,
        conditions: conditions
      };
    }
    if (verdict === 'DEFEND_WITH_CONDITIONS' || verdict === 'JUDGMENT_REQUIRED') {
      return {
        band: 'borderline',
        title: 'Borderline — conditions apply',
        text: 'Tree ' + treeId + ' exited ' + verdict + '.' + authText + condText,
        treeVerdict: verdict,
        treeId: treeId,
        conditions: conditions
      };
    }
    if (verdict === 'SETTLE' || verdict === 'CONCEDE') {
      return {
        band: 'investigate',
        title: 'Needs further investigation',
        text: 'Tree ' + treeId + ' exited ' + verdict + ' — liability posture is weak or indefensible.' + authText + condText,
        treeVerdict: verdict,
        treeId: treeId,
        conditions: conditions
      };
    }
    return {
      band: 'investigate',
      title: 'Needs further investigation',
      text: 'Tree ' + treeId + ' exited ' + verdict + '.' + authText + condText,
      treeVerdict: verdict,
      treeId: treeId,
      conditions: conditions
    };
  }

  function runTreesOnConfirmedRecord(record) {
    var iccText = record.lockedNarrative || record.rawText || '';
    var chain = record.causalChain || [];
    var evidenceManager = null;
    var confidenceManager = null;

    if (typeof DefendAbleEvidence !== 'undefined' && DefendAbleEvidence.createEvidenceManager) {
      evidenceManager = DefendAbleEvidence.createEvidenceManager();
    }
    if (typeof DefendAbleConfidence !== 'undefined' && DefendAbleConfidence.createConfidenceManager) {
      confidenceManager = DefendAbleConfidence.createConfidenceManager();
    }

    if (evidenceManager) {
      seedEvidenceFromTimeline(evidenceManager, record.tlEvStatus, record.evidenceDb, record.dtId);
    }

    var ctx = {
      iccText: iccText,
      causalChain: chain,
      evidenceManager: evidenceManager,
      confidenceManager: confidenceManager
    };

    var results = [];
    if (typeof DefendAbleOrchestrator !== 'undefined' && DefendAbleOrchestrator.runDecisionTrees) {
      results = DefendAbleOrchestrator.runDecisionTrees(evidenceManager, confidenceManager, iccText, { causalChain: chain }) || [];
    } else if (typeof DefendAbleTrees !== 'undefined' && DefendAbleTrees.runAllApplicable) {
      results = DefendAbleTrees.runAllApplicable(ctx) || [];
    }

    // If RM type maps to a specific tree and nothing matched, force that tree
    if ((!results || !results.length) && typeof DefendAbleTrees !== 'undefined' && typeof DefendAbleTypeMap !== 'undefined') {
      var forcedId = DefendAbleTypeMap.preferTreeForText(record.dtId, iccText);
      if (forcedId) {
        var forced = DefendAbleTrees.runTree(forcedId, ctx, true);
        if (forced) results = [forced];
      }
    }

    return {
      treeResults: results,
      preRating: mapTreeExitToPreRating(results, record.limb1Status),
      lockedNarrative: iccText,
      causalChain: chain
    };
  }

  function buildConfirmedRecord(opts) {
    opts = opts || {};
    var lofRows = opts.lofRows || [];
    var facts = opts.facts || null;
    var causalNodes = opts.causalNodes || [];
    var rawText = opts.rawText || '';
    var tlEvStatus = opts.tlEvStatus || {};
    var annotations = opts.nodeAnnotations || {};
    var dt = opts.dt || null;

    var lockedNarrative = buildLockedNarrative(lofRows, facts, causalNodes, rawText);
    var causalChain = buildCausalChain(causalNodes, lofRows, annotations);

    return {
      lofRows: lofRows,
      facts: facts,
      causalNodes: causalNodes,
      rawText: rawText,
      tlEvStatus: tlEvStatus,
      nodeAnnotations: annotations,
      dtId: dt && dt.id,
      limb1Status: dt && dt.limb1Status,
      evidenceDb: opts.evidenceDb || null,
      lockedNarrative: lockedNarrative,
      causalChain: causalChain,
      confirmedAt: new Date().toISOString()
    };
  }

  return {
    buildConfirmedRecord: buildConfirmedRecord,
    buildLockedNarrative: buildLockedNarrative,
    buildCausalChain: buildCausalChain,
    runTreesOnConfirmedRecord: runTreesOnConfirmedRecord,
    mapTreeExitToPreRating: mapTreeExitToPreRating
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DefendAbleLofLegalBridge;
}
