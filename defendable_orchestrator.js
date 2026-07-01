/* DefendAble Intelligence Engine v2 — analysis orchestrator */
var DefendAbleOrchestrator = (function () {

  function inferFindingsFromEvidence(ev) {
    if (typeof DefendAblePass2 !== 'undefined') {
      return DefendAblePass2.inferFindingsFromEvidence(ev);
    }
    return [{ type: 'EVIDENCE_RECEIVED', description: ev.whatItProves || ev.name || 'Evidence collected' }];
  }

  function mapNodeStatusToConfidence(n) {
    if (n.judgmentRequired || (n.statusLabel && /JUDGMENT/i.test(n.statusLabel))) return 'judgment';
    var s = (n.status || '').toLowerCase();
    if (s === 'green' || s === 'amber' || s === 'red' || s === 'grey') return s;
    if (s === 'info') return 'grey';
    return 'grey';
  }

  function runDecisionTrees(evidenceManager, confidenceManager, iccText, result) {
    var chain = (result && result.causalChain) || [];
    var ctx = {
      iccText: iccText,
      causalChain: chain,
      evidenceManager: evidenceManager,
      confidenceManager: confidenceManager
    };

    if (typeof DefendAbleEvidencePack !== 'undefined') {
      var disruptionType = DefendAbleEvidencePack.detectDisruptionType(iccText);
      if (disruptionType) {
        DefendAbleEvidencePack.seedPackToEvidenceManager(evidenceManager, disruptionType);
      }
    }

    if (typeof DefendAbleTrees !== 'undefined') {
      return DefendAbleTrees.runAllApplicable(ctx);
    }

    var treeResults = [];
    if (typeof DefendAbleTreeDT02 !== 'undefined' && DefendAbleTreeDT02.matches(iccText, chain)) {
      treeResults.push(DefendAbleTreeDT02.runTree(ctx));
    } else if (typeof DefendAbleTreeDT01 !== 'undefined' && DefendAbleTreeDT01.matches(iccText, chain)) {
      treeResults.push(DefendAbleTreeDT01.runTree(ctx));
    }
    return treeResults;
  }

  function createOrchestrator() {
    var evidenceManager = null;
    var confidenceManager = null;
    var iccText = '';
    var lastTreeResults = [];

    function ensureManagers() {
      if (!evidenceManager) evidenceManager = DefendAbleEvidence.createEvidenceManager();
      if (!confidenceManager) confidenceManager = DefendAbleConfidence.createConfidenceManager();
    }

    function addEvidenceById(id) {
      var meta = DefendAbleRegistry.getEvidenceMeta(id);
      if (!evidenceManager.has(id)) {
        evidenceManager.addEvidence(id, meta.name, meta.system, meta.hardDependencies || [], []);
      }
    }

    function addImpliedEvidenceRequests(requests) {
      (requests || []).forEach(function (req) {
        if (!evidenceManager.has(req.evidenceId)) {
          evidenceManager.addEvidence(req.evidenceId, req.name, req.system, [], []);
        }
      });
    }

    function registerSemanticConclusions(nodeId, node, status, reason) {
      var defs = DefendAbleRegistry.getNodeConclusions(nodeId);
      defs.forEach(function (def) {
        if (!confidenceManager.getConclusion(def.id)) {
          confidenceManager.addConclusion(def.id, def.question, {
            authority: node.authority,
            dependsOn: [],
            downstreamConclusions: [],
            chainEventRef: node.chainEventRef
          });
        }
        if (status !== 'judgment') {
          confidenceManager.updateConclusion(def.id, status, node.conclusion, reason, nodeId);
        }
      });
    }

    return {
      setIccText: function (text) {
        iccText = text || '';
      },

      afterPass1: function (pass1) {
        ensureManagers();
        var ids = DefendAbleRegistry.seedEvidenceIdsFromChain(pass1.causalChain || []);
        ids.forEach(addEvidenceById);
        if (typeof DefendAbleEvidencePack !== 'undefined') {
          var disruptionType = DefendAbleEvidencePack.detectDisruptionType(iccText);
          if (disruptionType) {
            DefendAbleEvidencePack.seedPackToEvidenceManager(evidenceManager, disruptionType);
          }
        }
        return { evidenceManager: evidenceManager, confidenceManager: confidenceManager };
      },

      afterPass2: function (pass2) {
        ensureManagers();
        if (!pass2) return { evidenceManager: evidenceManager, confidenceManager: confidenceManager };

        (pass2.evidencePack || []).forEach(function (ev) {
          var id = ev.evidenceId || DefendAbleRegistry.deriveEvidenceId(ev.name, ev.source);
          if (!evidenceManager.has(id)) {
            var meta = DefendAbleRegistry.getEvidenceMeta(id);
            evidenceManager.addEvidence(id, ev.name || meta.name, ev.source || meta.system, meta.hardDependencies || [], []);
          }
          var status = (ev.status || '').toLowerCase();
          if (status === 'collected') {
            var findings = ev.findings || inferFindingsFromEvidence(ev);
            var result = evidenceManager.receiveEvidence(id, findings);
            addImpliedEvidenceRequests(result.impliedRequests);
            confidenceManager.retroactivityCheck(id, findings, DefendAbleConfidence.EVIDENCE_CONCLUSION_LINKS);
          } else if (status === 'missing') {
            evidenceManager.markMissing(id, ev.absenceConsequence || '');
          }
        });

        (pass2.updatedCausalChain || []).forEach(function (ev) {
          (ev.evidenceRequired || []).forEach(function (er) {
            var id = DefendAbleRegistry.deriveEvidenceId(er.evidenceType || er.document, er.system);
            if (!evidenceManager.has(id)) {
              evidenceManager.addEvidence(id, er.evidenceType || er.document || id, er.system || 'Unknown', [], []);
            }
            var erStatus = (er.status || '').toLowerCase();
            if (erStatus === 'collected') {
              var findings = er.findings || inferFindingsFromEvidence({ name: er.evidenceType, whatItProves: er.whatItProves, source: er.system });
              var recv = evidenceManager.receiveEvidence(id, findings);
              addImpliedEvidenceRequests(recv.impliedRequests);
              confidenceManager.retroactivityCheck(id, findings, DefendAbleConfidence.EVIDENCE_CONCLUSION_LINKS);
            } else if (erStatus === 'missing') {
              evidenceManager.markMissing(id, er.whatAbsenceImplies || er.absenceConsequenceForChain || '');
            }
          });
        });

        (pass2.dynamicEvidenceRequests || []).forEach(function (d) {
          var id = DefendAbleRegistry.deriveEvidenceId(d.evidenceRequested, d.system);
          if (!evidenceManager.has(id)) {
            evidenceManager.addEvidence(id, d.evidenceRequested, d.system || 'Unknown', [], []);
          }
        });

        return { evidenceManager: evidenceManager, confidenceManager: confidenceManager };
      },

      afterPass3: function (result) {
        ensureManagers();
        if (!result) return { evidenceManager: evidenceManager, confidenceManager: confidenceManager };

        var judgmentById = {};
        (result.judgmentNodes || []).forEach(function (j) { judgmentById[j.nodeId] = j; });

        (result.nodes || []).forEach(function (n) {
          confidenceManager.addConclusion(n.id, n.question, {
            authority: n.authority,
            evidenceBase: [],
            dependsOn: n.dependsOn || [],
            downstreamConclusions: n.downstreamConclusions || [],
            chainEventRef: n.chainEventRef
          });

          var cmStatus = mapNodeStatusToConfidence(n);
          var reason = n.statusLabel || n.conclusion || '';

          if (cmStatus === 'judgment' || judgmentById[n.id]) {
            var jn = judgmentById[n.id];
            if (jn) {
              confidenceManager.setJudgmentNode(n.id, jn);
            } else {
              confidenceManager.updateConclusion(n.id, 'judgment', n.conclusion, 'Judgment required', null);
              confidenceManager.setJudgmentNode(n.id, {
                factsFor: n.factsFor || '',
                factsAgainst: n.factsAgainst || '',
                additionalEvidenceNeeded: n.dataUsed || ''
              });
            }
          } else {
            confidenceManager.updateConclusion(n.id, cmStatus, n.conclusion, reason, null);
            registerSemanticConclusions(n.id, n, cmStatus, reason);
          }
        });

        (result.judgmentNodes || []).forEach(function (j) {
          if (confidenceManager.getConclusion(j.nodeId)) return;
          confidenceManager.addConclusion(j.nodeId, j.question, { chainEventRef: j.chainEventRef });
          confidenceManager.setJudgmentNode(j.nodeId, j);
        });

        evidenceManager.getByStatus('collected').forEach(function (item) {
          if (item.findings && item.findings.length) {
            confidenceManager.retroactivityCheck(item.id, item.findings, DefendAbleConfidence.EVIDENCE_CONCLUSION_LINKS);
          }
        });

        lastTreeResults = runDecisionTrees(evidenceManager, confidenceManager, iccText, result);

        return {
          evidenceManager: evidenceManager,
          confidenceManager: confidenceManager,
          treeResults: lastTreeResults
        };
      },

      runDecisionTrees: function (result) {
        ensureManagers();
        lastTreeResults = runDecisionTrees(evidenceManager, confidenceManager, iccText, result || {});
        return lastTreeResults;
      },

      getTreeResults: function () {
        return lastTreeResults.slice();
      },

      resolveJudgment: function (conclusionId, decision, reason) {
        ensureManagers();
        return confidenceManager.resolveJudgment(conclusionId, decision, reason);
      },

      getEvidenceManager: function () { return evidenceManager; },
      getConfidenceManager: function () { return confidenceManager; },

      getConfidenceState: function (nodeId) {
        if (!confidenceManager) return null;
        var direct = confidenceManager.getConclusion(nodeId);
        if (direct) return direct;
        var semantic = DefendAbleRegistry.getSemanticIdsForNode(nodeId);
        for (var i = 0; i < semantic.length; i++) {
          var c = confidenceManager.getConclusion(semantic[i]);
          if (c) return c;
        }
        return null;
      },

      getVerdictConclusionIds: function (result, isMaterialNodeFn) {
        var ids = [];
        (result.nodes || []).forEach(function (n) {
          if (n.type === 'disruption' || (n.type === 'universal' && isMaterialNodeFn(n))) {
            ids.push(n.id);
            DefendAbleRegistry.getSemanticIdsForNode(n.id).forEach(function (sid) {
              if (ids.indexOf(sid) < 0) ids.push(sid);
            });
          }
        });
        return ids;
      }
    };
  }

  return { createOrchestrator: createOrchestrator };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DefendAbleOrchestrator;
}
