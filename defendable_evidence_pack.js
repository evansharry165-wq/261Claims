/* DefendAble — evidence pack order aligned with module4-evidence-workspace MATRIX */
var DefendAbleEvidencePack = (function () {

  /* Mirrors module4-evidence-workspace.html LIB + MATRIX — ATC Restrictions first */
  var LIB = {
    tops: { name: 'Operational delay records system — Operational Evidence Pack', system: 'TOPS', tier: 'K' },
    disco: { name: 'Disruption data system — Disruption Record', system: 'Disruption data system', tier: 'K' },
    aims: { name: 'Crew scheduling system — Crew Route & FDP', system: 'AIMS', tier: 'K' },
    safetynet: { name: 'Safety reporting system Reports', system: 'SafetyNet', tier: 'K' },
    eurocontrol: { name: 'Eurocontrol — Oplogs, Flight Data & Regulations', system: 'EUROCONTROL', tier: 'K' },
    notam: { name: 'NOTAM Records', system: 'NOTAM', tier: 'K' },
    connected: { name: 'Connected Portal — Flight Plans & Scratchpads', system: 'Connected Portal', tier: 'S' },
    network_out: { name: 'Network Outlook Brief', system: 'Eurocontrol NOP', tier: 'S' },
    lido: { name: 'LIDO — Flight Plans & Fuel Figures', system: 'LIDO', tier: 'S' },
    hermes: { name: 'Correspondence management system ACARS Messages', system: 'HERMES', tier: 'S' },
    max_ops: { name: 'MAX OPS — Passenger Communications', system: 'MAX-OPS', tier: 'S' },
    dpm: { name: 'DPM Notes', system: 'DPM Notes', tier: 'S' },
    internal_email: { name: 'Internal Emails — Operations / Crewing', system: 'Internal mailboxes', tier: 'S' },
    flightradar: { name: 'Flightradar24 — Flight Track', system: 'Flightradar24', tier: 'S' },
    flightstats: { name: 'FlightStats — Airport Delay Data', system: 'FlightStats', tier: 'S' },
    ops_review: { name: 'Daily Ops Review', system: 'Operations', tier: 'S' },
    case_studies: { name: 'Case Studies', system: 'Reference', tier: 'W' },
    eurocontrol_w: { name: 'Eurocontrol Reference Documents', system: 'Reference', tier: 'W' },
    caa_docs: { name: 'CAA Documentation', system: 'Reference', tier: 'W' },
    ac_ops: { name: 'Aircraft Operations & Procedures', system: 'Reference', tier: 'W' },
    airport_info: { name: 'Airport Information', system: 'Reference', tier: 'W' },
    ogimet: { name: 'Ogimet — METAR & TAF Reports', system: 'Ogimet', tier: 'K' },
    met_office: { name: 'Met Office — Daily Impact Hazard Forecast', system: 'Met Office', tier: 'K' },
    airport_web: { name: 'Airport Statement / Travel Advisory', system: 'Affected airport website', tier: 'S' },
    weather_briefs: { name: 'Weather Briefs & Phenomena Guides', system: 'Reference', tier: 'W' },
    montreal_conv: { name: 'Montreal Convention — Consequential Loss Evidence', system: 'Internal legal file', tier: 'W' },
    lightning: { name: 'Lightning Maps — Strike Records', system: 'Lightning Maps', tier: 'K' },
    amos: { name: 'Maintenance records system — Technical Event Record', system: 'AMOS', tier: 'K' },
    wildfire: { name: 'EFFIS — Wildfire Map', system: 'Copernicus EFFIS', tier: 'K' },
    policies: { name: 'Airline Policies & Terms & Conditions', system: 'Reference', tier: 'W' },
    tech_docs: { name: 'Technical Reference Documents', system: 'Reference', tier: 'W' },
    witness_cases: { name: 'Witness Cases & Judgements', system: 'Reference', tier: 'W' },
    welfare_docs: { name: 'Welfare & Passenger Care Documentation', system: 'Reference', tier: 'W' },
    crew_docs: { name: 'Crew Regulatory Documents', system: 'Reference', tier: 'W' },
    overnight_docs: { name: 'Overnight Delay Documentation', system: 'Reference', tier: 'W' },
    flight_plan: { name: 'Flight Planning Documentation', system: 'Reference', tier: 'W' }
  };

  var MATRIX = {
    'ATC Restrictions': {
      K: ['tops', 'disco', 'aims', 'safetynet', 'eurocontrol', 'notam'],
      S: ['connected', 'network_out', 'lido', 'hermes', 'max_ops', 'dpm', 'internal_email', 'flightradar', 'flightstats', 'ops_review'],
      W: ['case_studies', 'eurocontrol_w', 'caa_docs', 'ac_ops', 'airport_info']
    },
    'Weather': {
      K: ['tops', 'disco', 'aims', 'safetynet', 'eurocontrol', 'ogimet', 'met_office', 'notam'],
      S: ['connected', 'network_out', 'lido', 'hermes', 'max_ops', 'dpm', 'internal_email', 'flightradar', 'flightstats', 'ops_review', 'airport_web'],
      W: ['case_studies', 'weather_briefs', 'eurocontrol_w', 'caa_docs', 'ac_ops', 'airport_info', 'montreal_conv']
    },
    'Airport/Runway Closure': {
      K: ['tops', 'disco', 'aims', 'safetynet', 'eurocontrol', 'notam'],
      S: ['connected', 'network_out', 'lido', 'hermes', 'max_ops', 'dpm', 'internal_email', 'flightradar', 'flightstats', 'airport_web', 'ops_review'],
      W: ['case_studies', 'caa_docs', 'ac_ops', 'airport_info', 'flight_plan']
    },
    'Airport System Failure': {
      K: ['tops', 'disco', 'aims', 'safetynet', 'eurocontrol'],
      S: ['connected', 'network_out', 'lido', 'hermes', 'max_ops', 'dpm', 'internal_email', 'flightradar', 'flightstats', 'airport_web', 'ops_review'],
      W: ['case_studies', 'caa_docs', 'ac_ops', 'airport_info']
    },
    'Industrial Action': {
      K: ['tops', 'disco', 'aims', 'safetynet', 'eurocontrol', 'notam'],
      S: ['connected', 'network_out', 'lido', 'hermes', 'max_ops', 'dpm', 'internal_email', 'flightradar', 'airport_web', 'ops_review'],
      W: ['case_studies', 'caa_docs', 'policies', 'eurocontrol_w', 'airport_info']
    },
    'Technical Issues': {
      K: ['tops', 'disco', 'aims', 'safetynet', 'amos'],
      S: ['connected', 'lido', 'hermes', 'max_ops', 'dpm', 'internal_email', 'ops_review'],
      W: ['case_studies', 'tech_docs', 'ac_ops', 'caa_docs', 'witness_cases']
    },
    'Birdstrike': {
      K: ['tops', 'disco', 'aims', 'safetynet', 'amos', 'eurocontrol'],
      S: ['connected', 'lido', 'hermes', 'dpm', 'internal_email', 'flightradar', 'ops_review'],
      W: ['case_studies', 'tech_docs', 'ac_ops', 'caa_docs']
    },
    'Lightning Strike': {
      K: ['tops', 'disco', 'aims', 'safetynet', 'amos', 'ogimet', 'met_office', 'lightning'],
      S: ['connected', 'lido', 'hermes', 'max_ops', 'dpm', 'internal_email', 'flightradar', 'ops_review'],
      W: ['case_studies', 'weather_briefs', 'tech_docs', 'ac_ops', 'caa_docs']
    },
    'Ground Damage': {
      K: ['tops', 'disco', 'aims', 'safetynet', 'amos', 'eurocontrol'],
      S: ['connected', 'lido', 'hermes', 'max_ops', 'dpm', 'notam', 'internal_email', 'flightradar', 'ops_review'],
      W: ['case_studies', 'tech_docs', 'ac_ops', 'airport_info', 'caa_docs']
    },
    'Medical Emergency': {
      K: ['tops', 'disco', 'aims', 'safetynet', 'eurocontrol'],
      S: ['connected', 'lido', 'hermes', 'max_ops', 'dpm', 'internal_email', 'flightradar', 'ops_review'],
      W: ['case_studies', 'caa_docs', 'ac_ops', 'welfare_docs', 'witness_cases']
    },
    'Disruptive Passenger': {
      K: ['tops', 'disco', 'aims', 'safetynet', 'eurocontrol'],
      S: ['connected', 'lido', 'hermes', 'max_ops', 'dpm', 'internal_email', 'flightradar', 'ops_review'],
      W: ['case_studies', 'policies', 'caa_docs', 'welfare_docs', 'witness_cases']
    },
    'Natural Disaster': {
      K: ['tops', 'disco', 'aims', 'safetynet', 'eurocontrol', 'notam', 'wildfire'],
      S: ['connected', 'network_out', 'lido', 'hermes', 'max_ops', 'dpm', 'internal_email', 'flightradar', 'ops_review'],
      W: ['case_studies', 'weather_briefs', 'caa_docs', 'ac_ops', 'airport_info']
    },
    'Security Alert': {
      K: ['tops', 'disco', 'aims', 'safetynet', 'eurocontrol', 'notam'],
      S: ['connected', 'lido', 'hermes', 'max_ops', 'dpm', 'internal_email', 'flightradar', 'ops_review'],
      W: ['case_studies', 'caa_docs', 'policies', 'ac_ops', 'airport_info']
    },
    'Passenger Welfare': {
      K: ['tops', 'disco', 'aims', 'safetynet', 'eurocontrol'],
      S: ['connected', 'lido', 'hermes', 'max_ops', 'dpm', 'internal_email', 'ops_review'],
      W: ['case_studies', 'welfare_docs', 'policies', 'caa_docs', 'witness_cases']
    },
    'Political Unrest': {
      K: ['tops', 'disco', 'aims', 'safetynet', 'eurocontrol', 'notam'],
      S: ['connected', 'network_out', 'lido', 'hermes', 'max_ops', 'dpm', 'internal_email', 'ops_review'],
      W: ['case_studies', 'caa_docs', 'policies', 'eurocontrol_w', 'airport_info']
    },
    'Crew Hours / Overnight Delay': {
      K: ['tops', 'disco', 'aims', 'safetynet'],
      S: ['connected', 'lido', 'hermes', 'max_ops', 'dpm', 'internal_email', 'ops_review'],
      W: ['overnight_docs', 'crew_docs', 'caa_docs', 'ac_ops', 'case_studies']
    }
  };

  /* Map pack libKey → legacy evidence manager id where established */
  var LIBKEY_TO_LEGACY_ID = {
    tops: 'TOPS_DELAY_RECORD',
    eurocontrol: 'EUROCONTROL_CTOT',
    ogimet: 'METAR_DESTINATION',
    met_office: 'EV_MET_OFFICE',
    dpm: 'DPM_NOTES',
    aims: 'AIMS_FDP_RECORD',
    amos: 'AMOS_DEFECT_LOG',
    flightstats: 'FLIGHTSTATS_CROSSCARRIER',
    hermes: 'HERMES_ART8_OFFER',
    max_ops: 'EV_MAX_OPS'
  };

  var LIBKEY_FINDINGS = {
    tops: [{ type: 'TOPS_DELAY_CODE_81_89', description: 'TOPS delay codes 81-89' }],
    eurocontrol: [{ type: 'TOPS_CTOT_CONFIRMED', description: 'CTOT/ATFM restriction confirmed' }],
    flightstats: [{ type: 'FLIGHTSTATS_MULTI_CARRIER_IMPACT', description: 'Cross-carrier systemic delay' }],
    disco: [{ type: 'EVIDENCE_RECEIVED', description: 'Disruption record confirms ATC narrative' }],
    aims: [{ type: 'AIMS_FDP_ELEVATED_BEFORE_DISRUPTION', description: 'Crew FDP context' }],
    notam: [{ type: 'EVIDENCE_RECEIVED', description: 'NOTAM corroborates airspace restriction' }],
    dpm: [{ type: 'EVIDENCE_RECEIVED', description: 'DPM notes on recovery attempts' }],
    ogimet: [{ type: 'METAR_BELOW_ILS_MINIMA', description: 'Destination METAR below operating minima' }],
    met_office: [{ type: 'EVIDENCE_RECEIVED', description: 'Met Office hazard forecast corroboration' }],
    flightradar: [{ type: 'TOPS_DIVERSION', description: 'Flight track confirms diversion path' }],
    amos: [{ type: 'AMOS_NO_PRIOR_DEFECT', description: 'Technical event record on file' }],
    safetynet: [{ type: 'EVIDENCE_RECEIVED', description: 'Safety reporting system event record' }]
  };

  var TIER_ORDER = ['K', 'S', 'W'];
  var TIER_LABEL = { K: 'Key', S: 'Secondary', W: 'Wider' };

  function libKeyToEvidenceId(libKey) {
    return LIBKEY_TO_LEGACY_ID[libKey] || ('EV_' + libKey.toUpperCase());
  }

  function getLibMeta(libKey) {
    return LIB[libKey] || { name: libKey, system: 'Unknown', tier: 'S' };
  }

  function getMatrix(disruptionType) {
    return MATRIX[disruptionType] || null;
  }

  function getOrderedLibKeys(disruptionType, tier) {
    var m = MATRIX[disruptionType];
    if (!m) return [];
    if (tier) return (m[tier] || []).slice();
    var out = [];
    TIER_ORDER.forEach(function (t) {
      (m[t] || []).forEach(function (k) { out.push(k); });
    });
    return out;
  }

  function getPackItems(disruptionType) {
    var items = [];
    var m = MATRIX[disruptionType];
    if (!m) return items;
    TIER_ORDER.forEach(function (tier) {
      (m[tier] || []).forEach(function (libKey) {
        var meta = getLibMeta(libKey);
        items.push({
          libKey: libKey,
          evidenceId: libKeyToEvidenceId(libKey),
          tier: tier,
          tierLabel: TIER_LABEL[tier],
          name: meta.name,
          system: meta.system,
          findings: LIBKEY_FINDINGS[libKey] || [{ type: 'EVIDENCE_RECEIVED', description: meta.name }]
        });
      });
    });
    return items;
  }

  function seedPackToEvidenceManager(evidenceManager, disruptionType) {
    if (!evidenceManager || !disruptionType) return [];
    var added = [];
    getPackItems(disruptionType).forEach(function (item) {
      var deps = [];
      if (item.libKey === 'eurocontrol' || item.libKey === 'aims' || item.libKey === 'amos') {
        deps = ['TOPS_DELAY_RECORD'];
      }
      if (!evidenceManager.has(item.evidenceId)) {
        evidenceManager.addEvidence(item.evidenceId, item.name, item.system, deps, []);
        added.push(item);
      }
    });
    return added;
  }

  function isWeatherDestination(text) {
    var t = text || '';
    if (/\blvp\b|\bsnowtam|\brunway closure|\bde-ic\b/i.test(t)
      && !/\bdiversion\b|\bbelow minima\b|\bthunderstorm\b|\barrival destination\b|\bdestination\b/i.test(t)) {
      return false;
    }
    return /\bthunderstorm\b|\bweather\b|\bbelow minima\b|\bdiversion\b|\bsigmet\b|\bmetar\b|\bmandatory atc diversion\b/i.test(t);
  }

  function isAtcPrimary(text) {
    return /\bctot\b|\batfm\b|\beurocontrol\b|\batc restriction|\batc delay|\bnetwork.wide\b|\ball carriers\b/i.test(text || '');
  }

  function isApplicableDisruptionType(text, type) {
    if (type === 'Weather') return isWeatherDestination(text);
    if (type === 'ATC Restrictions') {
      return isAtcPrimary(text) && !isWeatherDestination(text);
    }
    return false;
  }

  function detectDisruptionType(text) {
    if (typeof DefendAbleTrees !== 'undefined') {
      return DefendAbleTrees.getDisruptionTypeForIcc(text);
    }
    if (isWeatherDestination(text)) return 'Weather';
    if (isAtcPrimary(text)) return 'ATC Restrictions';
    return null;
  }

  return {
    LIB: LIB,
    MATRIX: MATRIX,
    TIER_ORDER: TIER_ORDER,
    TIER_LABEL: TIER_LABEL,
    libKeyToEvidenceId: libKeyToEvidenceId,
    getLibMeta: getLibMeta,
    getMatrix: getMatrix,
    getOrderedLibKeys: getOrderedLibKeys,
    getPackItems: getPackItems,
    seedPackToEvidenceManager: seedPackToEvidenceManager,
    detectDisruptionType: detectDisruptionType,
    isApplicableDisruptionType: isApplicableDisruptionType,
    isWeatherDestination: isWeatherDestination,
    isAtcPrimary: isAtcPrimary
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DefendAbleEvidencePack;
}
