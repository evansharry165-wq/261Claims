/* DefendAble Intelligence Engine v2 — Evidence dependency manager */
var DefendAbleEvidence = (function () {

  var IMPLICATION_MAP = {
    TOPS_PRIOR_SECTOR_DELAY: [
      { evidenceId: 'TOPS_FULL_ROTATION', name: 'TOPS Full Tail Line of Flying', system: 'TOPS',
        legalReason: 'Prior sector delay may be root cause of claimant flight delay. Full rotation required to establish root cause.', priority: 'critical' }
    ],
    TOPS_POSITIONING_FLIGHT: [
      { evidenceId: 'TOPS_POSITIONING_TAIL', name: 'TOPS — Positioning Tail Record', system: 'TOPS',
        legalReason: 'Positioning flight may itself have been disrupted by undisclosed event. Most commonly missed trigger in complex cases.', priority: 'critical' },
      { evidenceId: 'AIMS_POSITIONING_CREW', name: 'AIMS — Positioning Crew FDP', system: 'AIMS',
        legalReason: 'Crew on positioning flight: their FDP determines whether they were already at risk of OOH before the main disruption.', priority: 'important' }
    ],
    TOPS_AOG_UNDISCLOSED: [
      { evidenceId: 'AMOS_DEFECT_LOG', name: 'AMOS Defect Log', system: 'AMOS',
        legalReason: 'AOG not described in ICC prompt is a new causal event. DT-5 analysis required.', priority: 'critical' },
      { evidenceId: 'AMOS_MEL_ENTRY', name: 'AMOS MEL Entry', system: 'AMOS',
        legalReason: 'MEL category determines whether grounding was mandatory (Category A) or discretionary.', priority: 'critical' }
    ],
    TOPS_CREW_CHANGE: [
      { evidenceId: 'AIMS_ORIGINAL_CREW_FDP', name: 'AIMS FDP — Original Crew', system: 'AIMS',
        legalReason: 'Crew change: original crew FDP needed to establish when and why OOH occurred.', priority: 'critical' },
      { evidenceId: 'AIMS_REPLACEMENT_CREW_FDP', name: 'AIMS FDP — Replacement Crew', system: 'AIMS',
        legalReason: 'Replacement crew FDP and rest period needed for 18-hour wake rule analysis.', priority: 'critical' }
    ],
    TOPS_DELAY_CODE_MISMATCH: [
      { evidenceId: 'DPM_NOTES', name: 'DPM Notes', system: 'DPM Notes',
        legalReason: 'Delay code inconsistent with ICC summary. DPM Notes may resolve discrepancy or reveal additional cause.', priority: 'important' }
    ],
    TOPS_DIVERSION: [
      { evidenceId: 'METAR_ALTERNATE', name: 'METAR — Diversion Airport', system: 'Ogimet API',
        legalReason: 'Art 9(2): duty of care applies at diversion airports. Conditions at alternate required.', priority: 'important' },
      { evidenceId: 'GROUND_HANDLER_ALTERNATE', name: 'Ground Handler Records — Alternate Airport', system: 'Ground handler',
        legalReason: 'Art 9 care at diversion airport — meals, comms, hotel if overnight.', priority: 'important' }
    ],
    TOPS_OND: [
      { evidenceId: 'TOPS_NEXTDAY_ARRIVAL', name: 'TOPS — Next-Day Actual Arrival Time', system: 'TOPS',
        legalReason: 'Sturgeon calculation: OND delay = scheduled arrival to actual next-day arrival.', priority: 'critical' },
      { evidenceId: 'GROUND_HANDLER_HOTAC', name: 'Ground Handler HOTAC Records', system: 'Ground handler',
        legalReason: 'Art 9(1)(c): hotel mandatory for overnight delay. Absence = Art 9 breach.', priority: 'critical' }
    ],
    AIMS_FDP_ELEVATED: [
      { evidenceId: 'AIMS_PRIOR_DAY_ROSTER', name: 'AIMS Prior-Day Roster', system: 'AIMS',
        legalReason: 'FDP already elevated before disruption. Prior duty loading may be contributing factor. Affects but-for analysis.', priority: 'important' }
    ],
    AIMS_STANDBYS_OOH: [
      { evidenceId: 'TOPS_STANDBY_PRIOR_ROTATION', name: 'TOPS — Standby Crew Prior Rotation', system: 'TOPS',
        legalReason: 'Standby crew OOH needs explanation. May be additional cascade event.', priority: 'important' }
    ],
    AIMS_18HR_WAKE_AT_RISK: [
      { evidenceId: 'AIMS_REST_PERIOD_REPLACEMENT', name: 'AIMS Rest Period — Replacement Crew Member', system: 'AIMS',
        legalReason: '18-hour wake rule analysis requires exact rest period start time for the affected crew member. Always a JUDGMENT NODE.', priority: 'critical' }
    ],
    AMOS_PRIOR_DEFECT_SAME_COMPONENT: [
      { evidenceId: 'AMOS_FULL_MAINTENANCE_HISTORY', name: 'AMOS Full Maintenance History', system: 'AMOS',
        legalReason: 'Prior defect on same component undermines hidden defect argument. Full history required.', priority: 'critical' }
    ],
    AMOS_HIDDEN_DEFECT_CLAIMED: [
      { evidenceId: 'OEM_AD_SB_SEARCH', name: 'OEM AD/SB Search', system: 'OEM records',
        legalReason: 'Matkustaja C-385/23: absence of prior AD/SB evidences unknown failure mode. Search required.', priority: 'critical' },
      { evidenceId: 'OEM_TECHNICAL_REPORT', name: 'OEM Technical Investigation Report', system: 'OEM records',
        legalReason: 'Manufacturer confirmation failure was unprecedented required by Matkustaja C-385/23 and D.S.A. C-411/23.', priority: 'critical' }
    ],
    AMOS_BIRDSTRIKE: [
      { evidenceId: 'SAFETYNET_BIRDSTRIKE', name: 'SafetyNet Safety Report — Birdstrike', system: 'SafetyNet',
        legalReason: 'Mandatory for all birdstrike events. Contemporaneous crew record.', priority: 'critical' },
      { evidenceId: 'AIRPORT_WILDLIFE_AUTHORITY', name: 'Airport Wildlife Authority Records', system: 'Airport authority',
        legalReason: 'Corroborates bird activity in the area.', priority: 'important' }
    ],
    SAFETYNET_MEDICAL: [
      { evidenceId: 'GROUND_HANDLER_MEDICAL', name: 'Ground Handler Medical Response Log', system: 'Ground handler',
        legalReason: 'Corroborates medical event timeline and severity.', priority: 'important' },
      { evidenceId: 'FLIGHTRADAR24_DIVERSION', name: 'Flightradar24 — Diversion Track', system: 'Flightradar24 API',
        legalReason: 'Confirms diversion occurred and timing.', priority: 'important' }
    ],
    SAFETYNET_SECURITY: [
      { evidenceId: 'POLICE_ATTENDANCE', name: 'Police / Airport Authority Attendance Record', system: 'External authority',
        legalReason: 'External authority involvement confirms Wallentin-Hermann Limb 2.', priority: 'critical' },
      { evidenceId: 'GROUND_HANDLER_RECONCILIATION', name: 'Ground Handler Baggage Reconciliation Log', system: 'Ground handler',
        legalReason: 'Duration of baggage reconciliation is part of the delay calculation.', priority: 'important' }
    ],
    SAFETYNET_DISRUPTIVE_PAX: [
      { evidenceId: 'POLICE_ATTENDANCE', name: 'Police / Airport Authority Attendance Record', system: 'External authority',
        legalReason: 'Police attendance confirms external authority involvement (Wallentin-Hermann Limb 2).', priority: 'critical' },
      { evidenceId: 'GROUND_HANDLER_REMOVAL', name: 'Ground Handler Removal and Reconciliation Log', system: 'Ground handler',
        legalReason: 'Documents removal process and duration.', priority: 'important' }
    ],
    GROUND_HANDLER_NO_CATERING: [
      { evidenceId: 'MAX_OPS_COMMS', name: 'MAX-OPS Passenger Communications Log', system: 'MAX-OPS',
        legalReason: 'Art 9 meals breach confirmed. Quantify exposure. Standalone head.', priority: 'important' }
    ],
    GROUND_HANDLER_NO_HOTAC: [
      { evidenceId: 'MAX_OPS_ART9_NOTICE', name: 'MAX-OPS Art 9 Written Notice', system: 'MAX-OPS',
        legalReason: 'Art 9(1)(c) hotel breach. Concede hotel costs while defending Art 7.', priority: 'important' }
    ],
    GROUND_HANDLER_AIRPORT_STAFF_SHORTAGE: [
      { evidenceId: 'FLIGHTSTATS_CROSSCARRIER', name: 'FlightStats Cross-Carrier Delay Data', system: 'FlightStats API',
        legalReason: 'C-405/23: staff shortage must be systemic (all carriers) to be EC. Cross-carrier data confirms scope.', priority: 'critical' }
    ]
  };

  var ABSENCE_CONSEQUENCES = {
    TOPS_DELAY_RECORD: { severity: 'critical', consequence: 'Delay duration and cause cannot be independently established. All operational conclusions Amber at best.' },
    TOPS_FULL_ROTATION: { severity: 'critical', consequence: 'Root cause of cascade unestablished. Cascade defence collapses without full rotation record.' },
    AMOS_BIRDSTRIKE_INSPECTION: { severity: 'critical', consequence: 'Birdstrike EC unsubstantiated. Peskova per se EC argument fails without inspection record.' },
    EUROCONTROL_CTOT: { severity: 'high', consequence: 'ATC EC relies on TOPS alone — self-certified. FlightStats cross-carrier data becomes essential.' },
    AIMS_STANDBY_LOG: { severity: 'high', consequence: 'Carrier cannot prove standby crew exhaustion. Reasonable measures defence fails on crew recovery.' },
    OEM_AD_SB_SEARCH: { severity: 'high', consequence: 'Hidden defect EC argument fails. Falls back to van der Lans ordinary technical fault.' },
    METAR_DESTINATION: { severity: 'high', consequence: 'Weather EC relies on crew accounts and TOPS alone — both internal. Ogimet retrieval is first action.' },
    GROUND_HANDLER_HOTAC: { severity: 'high', consequence: 'Art 9(1)(c) mandatory breach confirmed. Concede hotel costs.' },
    HERMES_ART8_OFFER: { severity: 'high', consequence: 'Art 8 breach as standalone head succeeds. Independent of EC outcome.' },
    DPM_NOTES: { severity: 'medium', consequence: 'Carrier cannot evidence recovery attempts. Adverse inference risk at U-8.' }
  };

  function nowISO() {
    return new Date().toISOString();
  }

  function createEmptyItem(id, name, system, hardDependencies, affectsConclusions) {
    return {
      id: id,
      name: name,
      system: system,
      status: 'requested',
      confidenceContribution: 'neutral',
      findings: [],
      hardDependencies: hardDependencies || [],
      dependenciesMet: false,
      impliedRequests: [],
      affectsConclusions: affectsConclusions || [],
      receivedAt: null,
      notes: ''
    };
  }

  function createEvidenceManager() {
    var pool = {};

    function getItem(id) {
      return pool[id] || null;
    }

    function ensureItem(id) {
      if (!pool[id]) return null;
      return pool[id];
    }

    function checkDependencies(id) {
      var item = ensureItem(id);
      if (!item) return { met: false, unmet: [] };
      var unmet = [];
      (item.hardDependencies || []).forEach(function (depId) {
        var dep = pool[depId];
        if (!dep || dep.status !== 'collected') unmet.push(depId);
      });
      var met = unmet.length === 0;
      item.dependenciesMet = met;
      return { met: met, unmet: unmet };
    }

    function getImpliedRequests(id) {
      var item = ensureItem(id);
      if (!item) return [];
      var requests = [];
      var seen = {};
      Object.keys(pool).forEach(function (k) { seen[k] = true; });

      (item.findings || []).forEach(function (finding) {
        var implied = IMPLICATION_MAP[finding.type] || [];
        implied.forEach(function (req) {
          if (seen[req.evidenceId]) return;
          seen[req.evidenceId] = true;
          requests.push({
            trigger: finding.type,
            evidenceId: req.evidenceId,
            name: req.name,
            system: req.system,
            legalReason: req.legalReason,
            priority: req.priority
          });
        });
      });
      return requests;
    }

    return {
      addEvidence: function (id, name, system, hardDependencies, affectsConclusions) {
        if (!id) throw new Error('Evidence id is required');
        if (pool[id]) return pool[id];
        var item = createEmptyItem(id, name, system, hardDependencies, affectsConclusions);
        checkDependencies(id);
        pool[id] = item;
        return item;
      },

      receiveEvidence: function (id, findings) {
        var item = ensureItem(id);
        if (!item) {
          throw new Error('Evidence item not found: ' + id);
        }
        item.status = 'collected';
        item.findings = (findings || []).map(function (f, idx) {
          return {
            id: f.id || (id + '_F' + (idx + 1)),
            type: f.type || 'UNKNOWN',
            description: f.description || '',
            value: f.value != null ? f.value : null,
            timestamp: f.timestamp || nowISO()
          };
        });
        item.receivedAt = nowISO();
        if (item.findings.length === 1) {
          var ft = item.findings[0].type;
          if (IMPLICATION_MAP[ft]) item.confidenceContribution = 'establishes';
        } else if (item.findings.length > 1) {
          item.confidenceContribution = 'corroborates';
        }
        var depResult = checkDependencies(id);
        var implied = getImpliedRequests(id);
        item.impliedRequests = implied;
        return {
          updatedItem: item,
          impliedRequests: implied,
          dependenciesUnmet: depResult.unmet
        };
      },

      markMissing: function (id, reason) {
        var item = ensureItem(id);
        if (!item) {
          throw new Error('Evidence item not found: ' + id);
        }
        item.status = 'missing';
        item.notes = reason || '';
        checkDependencies(id);
        var consequence = ABSENCE_CONSEQUENCES[id] || {
          severity: 'medium',
          consequence: reason || 'Evidence unavailable — adverse inference risk on linked conclusions.'
        };
        return consequence;
      },

      markPartiallyCollected: function (id, findings, reason) {
        var item = ensureItem(id);
        if (!item) throw new Error('Evidence item not found: ' + id);
        item.status = 'partially_collected';
        item.findings = (findings || []).map(function (f, idx) {
          return {
            id: f.id || (id + '_F' + (idx + 1)),
            type: f.type || 'UNKNOWN',
            description: f.description || '',
            value: f.value != null ? f.value : null,
            timestamp: f.timestamp || nowISO()
          };
        });
        item.notes = reason || item.notes;
        item.receivedAt = nowISO();
        checkDependencies(id);
        item.impliedRequests = getImpliedRequests(id);
        return item;
      },

      markUnavailable: function (id, reason) {
        var item = ensureItem(id);
        if (!item) throw new Error('Evidence item not found: ' + id);
        item.status = 'unavailable';
        item.notes = reason || '';
        return item;
      },

      checkDependencies: checkDependencies,

      getImpliedRequests: getImpliedRequests,

      getPool: function () {
        return Object.keys(pool).map(function (k) { return pool[k]; });
      },

      getByStatus: function (status) {
        return Object.keys(pool).filter(function (k) { return pool[k].status === status; }).map(function (k) { return pool[k]; });
      },

      getCriticalGaps: function () {
        return Object.keys(pool).filter(function (k) {
          var item = pool[k];
          if (item.status === 'collected' || item.status === 'unavailable' || item.status === 'partially_collected') return false;
          if (item.status !== 'missing' && item.status !== 'requested') return false;
          return (item.hardDependencies || []).some(function (depId) {
            var dep = pool[depId];
            return dep && dep.status === 'collected';
          });
        }).map(function (k) { return pool[k]; });
      },

      getById: getItem,

      has: function (id) {
        return !!pool[id];
      }
    };
  }

  return {
    createEvidenceManager: createEvidenceManager,
    IMPLICATION_MAP: IMPLICATION_MAP,
    ABSENCE_CONSEQUENCES: ABSENCE_CONSEQUENCES
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DefendAbleEvidence;
}
