/* DefendAble — bridge case workspace evidence state into Pass 2 / trees */
var DefendAbleCaseBridge = (function () {

  var ICC_BY_DISRUPTION = {
    'ATC Restrictions': 'Flight delayed LTN due to Eurocontrol CTOT restriction, network-wide ATFM regulation in force. All carriers affected. Airport curfew breached. Flight OND — completed next day.',
    'Weather': 'HC 1184 LTN-BCN. Thunderstorms BCN — approach below minima, mandatory ATC diversion Valencia. Standby LTN could not position — thunderstorms BCN. Passengers cared for Valencia, coach transfer arranged.',
    'Airport/Runway Closure': 'LTN departure delayed 3h — LVP in force, SNOWTAM active, runway closure. All carriers affected.',
    'Industrial Action': 'ATC industrial action France — sector capacity reduced 60%. ATFM restrictions imposed Eurocontrol. Third-party strike confirmed NOTAM.',
    'Technical Issues': 'G-EZTK hydraulic fault identified during pre-flight checks LGW. MEL dispatch not possible — Category A defect. Aircraft AOG. Possible hidden manufacturing defect — no prior AD.',
    'Birdstrike': 'G-EZAB birdstrike on approach MAN. Aircraft AOG — engine ingestion confirmed, mandatory EASA inspection required. Replacement aircraft unavailable.',
    'Medical Emergency': 'Flight EZY4356 BCN-LTN diverted to OPO due to passenger welfare incident — pax cardiac arrest. Crew were out of hours. Flight completed following day.',
    'Security Alert': 'Flight delayed LGW due to security alert — suspicious item found in hold. Airport security authority mandated full hold search. Police attended. Delay 3h 45m.',
    'Disruptive Passenger': 'Flight returned to gate due to highly disruptive passenger — threatening behaviour toward cabin crew. Police met aircraft. Passenger offloaded.',
    'Natural Disaster': 'Flight cancelled due to volcanic ash SIGMET. Airspace closure NOTAM in force.',
    'Political Unrest': 'Drone incursion closed airspace — government travel ban NOTAM in force.',
    'Crew Hours / Overnight Delay': 'Late inbound aircraft delayed on prior rotation. Crew reached FTL limits. No standby crew available. Delay 4h 20m.'
  };

  function normRef(ref) {
    return (ref || '').trim();
  }

  function evidenceStateKey(ref) {
    var r = normRef(ref);
    if (typeof normaliseCaseRef === 'function') r = normaliseCaseRef(r);
    return 'dfa_evidence_' + r;
  }

  function readStorage(key) {
    try {
      if (typeof sessionStorage === 'undefined') return null;
      var raw = sessionStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function getEvidenceWorkspaceState(ref) {
    return readStorage(evidenceStateKey(ref)) || {};
  }

  function getCaseRecord(ref) {
    var stored = readStorage('dfa_case');
    if (stored && normRef(stored.ref) === normRef(ref)) return stored;
    var aero = readStorage('aeroCaseData');
    if (aero && normRef(aero.ref) === normRef(ref)) return aero;
    if (typeof ALL_CASES !== 'undefined') {
      return ALL_CASES.find(function (c) { return normRef(c.ref) === normRef(ref); }) || null;
    }
    return null;
  }

  function isLibKeyOnFile(state, libKey) {
    if (!state) return false;
    if (state.uploads && state.uploads[libKey]) return true;
    if (state.pullState && state.pullState[libKey] === 'done') return true;
    return false;
  }

  function scenarioFromWorkspaceState(ref, disruptionType) {
    if (typeof DefendAbleEvidencePack === 'undefined' || !disruptionType) return null;
    var state = getEvidenceWorkspaceState(ref);
    if (!state || (!state.pullState && !state.uploads)) return null;

    var collected = [];
    var missing = [];
    DefendAbleEvidencePack.getPackItems(disruptionType).forEach(function (item) {
      if (isLibKeyOnFile(state, item.libKey)) {
        collected.push({
          id: item.evidenceId,
          findings: item.findings || [{ type: 'EVIDENCE_RECEIVED', description: item.name }]
        });
      } else if (item.tier === 'K') {
        missing.push(item.evidenceId);
      }
    });

    if (!collected.length && !missing.length) return null;
    return { collected: collected, missing: missing, source: 'case_workspace', ref: ref };
  }

  function iccTextForCase(caseRecord) {
    if (!caseRecord) return '';
    if (caseRecord.iccText || caseRecord.disruptionSummary) {
      return caseRecord.iccText || caseRecord.disruptionSummary;
    }
    if (caseRecord.disruptionType && ICC_BY_DISRUPTION[caseRecord.disruptionType]) {
      return ICC_BY_DISRUPTION[caseRecord.disruptionType];
    }
    var parts = [];
    if (caseRecord.flight) parts.push(caseRecord.flight);
    if (caseRecord.type) parts.push(caseRecord.type);
    if (caseRecord.disruptionType) parts.push('Disruption: ' + caseRecord.disruptionType);
    return parts.join('. ');
  }

  function loadCaseForAnalyser(ref) {
    ref = normRef(ref);
    var caseRecord = getCaseRecord(ref);
    var disruptionType = (caseRecord && caseRecord.disruptionType)
      || (typeof DefendAbleTrees !== 'undefined' && DefendAbleTrees.getDisruptionTypeForIcc(iccTextForCase(caseRecord)))
      || null;
    var iccText = iccTextForCase(caseRecord);
    var evidenceScenario = scenarioFromWorkspaceState(ref, disruptionType);
    return {
      ref: ref,
      caseRecord: caseRecord,
      disruptionType: disruptionType,
      iccText: iccText,
      evidenceScenario: evidenceScenario,
      evidencePct: caseRecord && caseRecord.evidencePct != null ? caseRecord.evidencePct : (evidenceScenario ? null : null)
    };
  }

  function getActiveCaseContext() {
    if (typeof window !== 'undefined' && window._defendableCaseRef) {
      return loadCaseForAnalyser(window._defendableCaseRef);
    }
    try {
      if (typeof sessionStorage !== 'undefined') {
        var stored = readStorage('dfa_case');
        if (stored && stored.ref) return loadCaseForAnalyser(stored.ref);
      }
    } catch (e) { /* ignore */ }
    return null;
  }

  function mergeScenarioWithCase(demoScenario, iccText) {
    var caseCtx = getActiveCaseContext();
    if (!caseCtx || !caseCtx.evidenceScenario) return demoScenario;
    var merged = {
      collected: (caseCtx.evidenceScenario.collected || []).slice(),
      missing: (caseCtx.evidenceScenario.missing || []).slice()
    };
    var collectedIds = {};
    merged.collected.forEach(function (c) { collectedIds[c.id] = true; });
    (demoScenario.collected || []).forEach(function (c) {
      if (!collectedIds[c.id]) merged.collected.push(c);
    });
    merged.missing = merged.missing.filter(function (id) { return !collectedIds[id]; });
    return merged;
  }

  return {
    ICC_BY_DISRUPTION: ICC_BY_DISRUPTION,
    evidenceStateKey: evidenceStateKey,
    getEvidenceWorkspaceState: getEvidenceWorkspaceState,
    getCaseRecord: getCaseRecord,
    scenarioFromWorkspaceState: scenarioFromWorkspaceState,
    iccTextForCase: iccTextForCase,
    loadCaseForAnalyser: loadCaseForAnalyser,
    getActiveCaseContext: getActiveCaseContext,
    mergeScenarioWithCase: mergeScenarioWithCase
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DefendAbleCaseBridge;
}
