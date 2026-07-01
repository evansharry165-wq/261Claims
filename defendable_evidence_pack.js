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
    montreal_conv: { name: 'Montreal Convention — Consequential Loss Evidence', system: 'Internal legal file', tier: 'W' }
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
    flightradar: [{ type: 'TOPS_DIVERSION', description: 'Flight track confirms diversion path' }]
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
      if (item.libKey === 'eurocontrol' || item.libKey === 'aims') {
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
