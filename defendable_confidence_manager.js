/* DefendAble Intelligence Engine v2 — Legal confidence state manager */
var DefendAbleConfidence = (function () {

  var EVIDENCE_CONCLUSION_LINKS = {
    TOPS_CTOT_CONFIRMED: [
      { conclusionId: 'U7_EC_ESTABLISHED', contribution: 'establishes' },
      { conclusionId: 'DT1_CTOT_CONFIRMED', contribution: 'establishes' }
    ],
    TOPS_DELAY_CODE_81_89: [
      { conclusionId: 'DT1_ATC_CAUSE', contribution: 'corroborates' }
    ],
    FLIGHTSTATS_MULTI_CARRIER_IMPACT: [
      { conclusionId: 'U7_LIMB1_INHERENCY', contribution: 'establishes' },
      { conclusionId: 'DT1_ATC_CAUSE', contribution: 'corroborates' }
    ],
    AIMS_FDP_ELEVATED_BEFORE_DISRUPTION: [
      { conclusionId: 'DT1_ATC_SOLE_CAUSE', contribution: 'undermines' },
      { conclusionId: 'DT6_FTL_ROOT_CAUSE_ANALYSIS', contribution: 'establishes' }
    ],
    AIMS_FDP_WITHIN_LIMITS_AT_DISRUPTION: [
      { conclusionId: 'DT6_FTL_CAUSED_BY_EC', contribution: 'establishes' }
    ],
    AMOS_NO_PRIOR_DEFECT: [
      { conclusionId: 'DT14_HIDDEN_DEFECT_LIMB1', contribution: 'establishes' }
    ],
    AMOS_PRIOR_DEFECT_SAME_COMPONENT: [
      { conclusionId: 'DT14_HIDDEN_DEFECT_LIMB1', contribution: 'undermines' },
      { conclusionId: 'DT5_VAN_DER_LANS_ORDINARY', contribution: 'establishes' }
    ],
    AMOS_MEL_CATEGORY_A: [
      { conclusionId: 'U8_RM_DISPATCH_EXHAUSTED', contribution: 'establishes' }
    ],
    METAR_BELOW_ILS_MINIMA: [
      { conclusionId: 'U7_LIMB1_INHERENCY', contribution: 'establishes' },
      { conclusionId: 'DT2_METAR_BELOW_MINIMA', contribution: 'establishes' }
    ],
    TAF_CONDITIONS_WITHIN_FORECAST: [
      { conclusionId: 'DT2_FORESEEABILITY_RISK', contribution: 'establishes' }
    ],
    SIGMET_IN_FORCE: [
      { conclusionId: 'DT2_METAR_BELOW_MINIMA', contribution: 'corroborates' },
      { conclusionId: 'U7_LIMB2_CONTROL', contribution: 'establishes' }
    ],
    ATC_MANDATORY_DIVERSION: [
      { conclusionId: 'U7_LIMB2_CONTROL', contribution: 'establishes' }
    ],
    POLICE_EXTERNAL_AUTHORITY: [
      { conclusionId: 'U7_LIMB2_CONTROL', contribution: 'establishes' }
    ],
    OEM_CONFIRMS_UNKNOWN_FAILURE: [
      { conclusionId: 'DT14_HIDDEN_DEFECT_LIMB1', contribution: 'establishes' },
      { conclusionId: 'U7_EC_ESTABLISHED', contribution: 'corroborates' }
    ],
    AIMS_18HR_WAKE_BREACHED_BY_EC_TIMING: [
      { conclusionId: 'DT20_WAKE_RULE_EC_CAUSED', contribution: 'establishes' }
    ],
    AIMS_18HR_WAKE_BREACHED_INDEPENDENTLY: [
      { conclusionId: 'DT20_WAKE_RULE_EC_CAUSED', contribution: 'undermines' },
      { conclusionId: 'U8_RM_CREW_RECOVERY', contribution: 'undermines' }
    ],
    GROUND_HANDLER_CATERING_PROVIDED: [
      { conclusionId: 'U10_ART9_MEALS_MET', contribution: 'establishes' }
    ],
    GROUND_HANDLER_NO_CATERING: [
      { conclusionId: 'U10_ART9_MEALS_MET', contribution: 'undermines' }
    ],
    GROUND_HANDLER_HOTAC_PROVIDED: [
      { conclusionId: 'U10_ART9_HOTEL_MET', contribution: 'establishes' }
    ],
    HERMES_ART8_OFFER_EVIDENCED: [
      { conclusionId: 'U9_ART8_COMPLIED', contribution: 'establishes' }
    ],
    HERMES_NO_ART8_OFFER: [
      { conclusionId: 'U9_ART8_COMPLIED', contribution: 'undermines' }
    ],
    AMOS_BIRDSTRIKE: [
      { conclusionId: 'DT4_BIRDSTRIKE_EC', contribution: 'establishes' },
      { conclusionId: 'U7_EC_ESTABLISHED', contribution: 'corroborates' }
    ],
    TOPS_PRIOR_SECTOR_DELAY: [
      { conclusionId: 'DT13_CASCADE_ROOT', contribution: 'establishes' },
      { conclusionId: 'DT6_FTL_ROOT_CAUSE_ANALYSIS', contribution: 'corroborates' }
    ],
    INDUSTRIAL_ATFM_RESTRICTION: [
      { conclusionId: 'DT7_THIRD_PARTY_STRIKE', contribution: 'establishes' },
      { conclusionId: 'U7_EC_ESTABLISHED', contribution: 'establishes' }
    ],
    SAFETYNET_MEDICAL_INCIDENT: [
      { conclusionId: 'DT9_MEDICAL_EC', contribution: 'establishes' }
    ],
    DISRUPTIVE_PASSENGER_EVENT: [
      { conclusionId: 'DT10_DISRUPTIVE_EC', contribution: 'establishes' }
    ],
    DPM_RECOVERY_DOCUMENTED: [
      { conclusionId: 'U8_RM_SLOT_RECOVERY', contribution: 'establishes' },
      { conclusionId: 'U8_RM_CREW_RECOVERY', contribution: 'corroborates' }
    ],
    MAX_OPS_ART9_NOTICE: [
      { conclusionId: 'U10_ART9_MEALS_MET', contribution: 'corroborates' },
      { conclusionId: 'U10_ART9_HOTEL_MET', contribution: 'corroborates' }
    ],
    MAX_OPS_COMMS: [
      { conclusionId: 'U8_RM_SLOT_RECOVERY', contribution: 'corroborates' }
    ]
  };

  var STATUS_RANK = { grey: 0, judgment: 1, amber: 2, red: 3, green: 4 };

  function nowISO() {
    return new Date().toISOString();
  }

  function isPositive(contribution) {
    return contribution === 'establishes' || contribution === 'corroborates';
  }

  function isUndermining(contribution) {
    return contribution === 'undermines';
  }

  function worseStatus(a, b) {
    return (STATUS_RANK[a] || 0) < (STATUS_RANK[b] || 0) ? a : b;
  }

  function createConfidenceManager() {
    var conclusions = {};
    var underminingCounts = {};

    function getConclusion(id) {
      return conclusions[id] || null;
    }

    function appendHistory(item, status, reason, triggeredBy) {
      item.statusHistory.push({
        status: status,
        reason: reason || '',
        triggeredBy: triggeredBy || null,
        timestamp: nowISO()
      });
    }

    function setStatus(item, newStatus, reason, triggeredBy) {
      if (item.status === newStatus) return false;
      item.status = newStatus;
      appendHistory(item, newStatus, reason, triggeredBy);
      return true;
    }

    function countUndermining(conclusionId) {
      return underminingCounts[conclusionId] || 0;
    }

    function propagateStateChange(id, visited) {
      visited = visited || {};
      if (visited[id]) return [];
      visited[id] = true;
      var item = getConclusion(id);
      if (!item) return [];
      var effects = [];

      (item.downstreamConclusions || []).forEach(function (downId) {
        var downstream = getConclusion(downId);
        if (!downstream) return;
        var previousStatus = downstream.status;
        var newStatus = downstream.status;
        var reason = '';

        if (item.status === 'red') {
          if (downstream.status === 'green') {
            newStatus = 'amber';
            reason = 'Upstream conclusion ' + id + ' is contested (red) — downstream capped at provisional.';
          }
        } else if (item.status === 'amber') {
          if (downstream.status === 'green') {
            newStatus = 'amber';
            reason = 'Upstream conclusion ' + id + ' is provisional (amber) — downstream capped at provisional.';
          }
        } else if (item.status === 'green') {
          var depsMet = (downstream.dependsOn || []).every(function (depId) {
            var dep = getConclusion(depId);
            return dep && dep.status === 'green';
          });
          if (depsMet && downstream.status === 'grey' && downstream.evidenceBase.length > 0) {
            newStatus = 'amber';
            reason = 'Upstream dependencies satisfied — re-evaluated after upstream upgrade.';
          }
        }

        if (newStatus !== previousStatus) {
          setStatus(downstream, newStatus, reason, id);
          effects.push({
            conclusionId: downId,
            previousStatus: previousStatus,
            newStatus: newStatus,
            reason: reason
          });
          effects = effects.concat(propagateStateChange(downId, visited));
        } else {
          effects = effects.concat(propagateStateChange(downId, visited));
        }
      });

      return effects;
    }

    return {
      addConclusion: function (id, question, opts) {
        opts = opts || {};
        if (conclusions[id]) return conclusions[id];
        var item = {
          id: id,
          question: question,
          status: 'grey',
          conclusion: null,
          authority: opts.authority || null,
          evidenceBase: (opts.evidenceBase || []).slice(),
          contestedBy: [],
          dependsOn: (opts.dependsOn || []).slice(),
          downstreamConclusions: (opts.downstreamConclusions || []).slice(),
          chainEventRef: opts.chainEventRef || null,
          judgmentData: null,
          statusHistory: [{
            status: 'grey',
            reason: 'Conclusion registered — awaiting evidence and legal analysis.',
            triggeredBy: null,
            timestamp: nowISO()
          }],
          createdAt: nowISO()
        };
        conclusions[id] = item;
        underminingCounts[id] = 0;
        return item;
      },

      updateConclusion: function (id, newStatus, conclusion, reason, triggeredBy) {
        var item = getConclusion(id);
        if (!item) throw new Error('Conclusion not found: ' + id);
        var previousStatus = item.status;
        item.conclusion = conclusion != null ? conclusion : item.conclusion;
        if (newStatus && newStatus !== item.status) {
          setStatus(item, newStatus, reason, triggeredBy);
        } else if (reason) {
          appendHistory(item, item.status, reason, triggeredBy);
        }
        var propagationEffects = propagateStateChange(id);
        return {
          updated: item,
          propagationEffects: propagationEffects,
          previousStatus: previousStatus
        };
      },

      setJudgmentNode: function (id, judgmentData) {
        var item = getConclusion(id);
        if (!item) throw new Error('Conclusion not found: ' + id);
        item.status = 'judgment';
        item.judgmentData = {
          factsFor: judgmentData.factsFor || '',
          factsAgainst: judgmentData.factsAgainst || '',
          additionalEvidenceNeeded: judgmentData.additionalEvidenceNeeded || '',
          consequenceIfFor: judgmentData.consequenceIfFor || judgmentData.consequenceIfChainHolds || '',
          consequenceIfAgainst: judgmentData.consequenceIfAgainst || judgmentData.consequenceIfChainBreaks || '',
          lawyerDecision: null,
          lawyerReason: null,
          decidedAt: null
        };
        appendHistory(item, 'judgment', 'Judgment node — human decision required.', null);
        return item;
      },

      retroactivityCheck: function (evidenceId, findings, evidenceConclusionLinkTable) {
        var table = evidenceConclusionLinkTable || EVIDENCE_CONCLUSION_LINKS;
        var results = [];

        (findings || []).forEach(function (finding) {
          var links = table[finding.type] || [];
          links.forEach(function (link) {
            var item = getConclusion(link.conclusionId);
            if (!item) return;
            var previousStatus = item.status;
            var contribution = link.contribution;
            var newStatus = item.status;
            var reason = '';

            if (isPositive(contribution)) {
              if (item.evidenceBase.indexOf(evidenceId) < 0) {
                item.evidenceBase.push(evidenceId);
              }
              if (item.status === 'grey') {
                newStatus = contribution === 'establishes' ? 'green' : 'amber';
                reason = 'Finding ' + finding.type + ' from ' + evidenceId + ' ' + contribution + ' this conclusion.';
                if (contribution === 'corroborates' && item.evidenceBase.length >= 2) {
                  newStatus = 'green';
                  reason = 'Multiple corroborating findings — upgraded to confirmed.';
                }
              } else if (item.status === 'amber') {
                if (contribution === 'establishes' || item.evidenceBase.length >= 2) {
                  newStatus = 'green';
                  reason = 'Additional establishing/corroborating evidence from ' + evidenceId + '.';
                } else {
                  reason = 'Corroborating evidence added from ' + evidenceId + '.';
                }
              }
            } else if (isUndermining(contribution)) {
              if (item.contestedBy.indexOf(evidenceId) < 0) {
                item.contestedBy.push(evidenceId);
              }
              underminingCounts[link.conclusionId] = countUndermining(link.conclusionId) + 1;
              if (item.status === 'green') {
                newStatus = 'amber';
                reason = 'Finding ' + finding.type + ' undermines previously confirmed conclusion.';
              } else if (item.status === 'amber') {
                if (countUndermining(link.conclusionId) >= 2) {
                  newStatus = 'red';
                  reason = 'Multiple undermining findings — conclusion contested.';
                } else {
                  reason = 'Undermining finding recorded from ' + evidenceId + '.';
                }
              }
            }

            if (newStatus !== previousStatus) {
              setStatus(item, newStatus, reason, evidenceId);
              var propagationEffects = propagateStateChange(link.conclusionId);
              results.push({
                conclusionId: link.conclusionId,
                previousStatus: previousStatus,
                newStatus: newStatus,
                reason: reason,
                propagationEffects: propagationEffects
              });
            } else if (reason) {
              appendHistory(item, item.status, reason, evidenceId);
              results.push({
                conclusionId: link.conclusionId,
                previousStatus: previousStatus,
                newStatus: item.status,
                reason: reason
              });
            }
          });
        });

        return results;
      },

      propagateStateChange: propagateStateChange,

      resolveJudgment: function (id, decision, lawyerReason) {
        var item = getConclusion(id);
        if (!item) throw new Error('Conclusion not found: ' + id);
        if (item.status !== 'judgment') {
          throw new Error('Conclusion ' + id + ' is not a judgment node (status: ' + item.status + ')');
        }
        if (!item.judgmentData) {
          item.judgmentData = {
            factsFor: '', factsAgainst: '', additionalEvidenceNeeded: '',
            consequenceIfFor: '', consequenceIfAgainst: '',
            lawyerDecision: null, lawyerReason: null, decidedAt: null
          };
        }
        item.judgmentData.lawyerDecision = decision;
        item.judgmentData.lawyerReason = lawyerReason || null;
        item.judgmentData.decidedAt = nowISO();
        var newStatus = decision === 'for' ? 'green' : 'red';
        setStatus(item, newStatus, 'Lawyer judgment: ' + decision, id);
        var propagationEffects = propagateStateChange(id);
        return { updated: item, propagationEffects: propagationEffects };
      },

      getJudgmentNodes: function () {
        return Object.keys(conclusions).filter(function (k) {
          var c = conclusions[k];
          return c.status === 'judgment' && (!c.judgmentData || !c.judgmentData.lawyerDecision);
        }).map(function (k) { return conclusions[k]; });
      },

      getConfidenceSummary: function () {
        var all = Object.keys(conclusions).map(function (k) { return conclusions[k]; });
        var counts = { green: 0, amber: 0, red: 0, grey: 0, judgment: 0 };
        all.forEach(function (c) {
          if (counts[c.status] != null) counts[c.status]++;
        });
        var criticalRed = all.filter(function (c) {
          return c.status === 'red' && (c.downstreamConclusions || []).length > 0;
        }).map(function (c) { return c.id; });
        var outstandingJudgments = all.filter(function (c) {
          return c.status === 'judgment' && (!c.judgmentData || !c.judgmentData.lawyerDecision);
        }).map(function (c) { return c.id; });
        return {
          total: all.length,
          green: counts.green,
          amber: counts.amber,
          red: counts.red,
          grey: counts.grey,
          judgment: counts.judgment,
          criticalRed: criticalRed,
          outstandingJudgments: outstandingJudgments
        };
      },

      getVerdictConfidence: function (verdictConclusions) {
        var ids = verdictConclusions || [];
        if (!ids.length) return 'low';
        var outstanding = this.getJudgmentNodes();
        if (outstanding.length) return 'judgment_required';
        var statuses = ids.map(function (id) {
          var c = getConclusion(id);
          return c ? c.status : 'grey';
        });
        if (statuses.some(function (s) { return s === 'red' || s === 'grey'; })) return 'low';
        if (statuses.every(function (s) { return s === 'green'; })) return 'high';
        if (statuses.every(function (s) { return s === 'green' || s === 'amber'; })) return 'moderate';
        return 'low';
      },

      getAuditTrail: function () {
        var trail = [];
        Object.keys(conclusions).forEach(function (k) {
          var c = conclusions[k];
          (c.statusHistory || []).forEach(function (h) {
            trail.push({
              conclusionId: c.id,
              question: c.question,
              status: h.status,
              reason: h.reason,
              triggeredBy: h.triggeredBy,
              timestamp: h.timestamp
            });
          });
        });
        trail.sort(function (a, b) {
          return a.timestamp < b.timestamp ? -1 : a.timestamp > b.timestamp ? 1 : 0;
        });
        return trail;
      },

      getConclusion: getConclusion,

      getAllConclusions: function () {
        return Object.keys(conclusions).map(function (k) { return conclusions[k]; });
      }
    };
  }

  return {
    createConfidenceManager: createConfidenceManager,
    EVIDENCE_CONCLUSION_LINKS: EVIDENCE_CONCLUSION_LINKS
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DefendAbleConfidence;
}
