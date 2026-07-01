/* DefendAble Intelligence Engine v2 — canonical ID registry */
var DefendAbleRegistry = (function () {

  var SYSTEM_ALIASES = {
    TOPS: ['operational delay records system', 'tops', 'delay records'],
    AIMS: ['crew scheduling system', 'aims'],
    AMOS: ['maintenance records system', 'amos'],
    EUROCONTROL: ['eurocontrol', 'eurocontrol-nm-api', 'atfm'],
    OGIMET: ['ogimet', 'ogimet-api', 'ogimet api'],
    SAFETYNET: ['safety reporting system', 'safetynet', 'safety reporting'],
    HERMES: ['correspondence management system', 'hermes', 'max-ops'],
    GROUND_HANDLER: ['ground handler', 'ground-handler-records', 'ground handler records'],
    FLIGHTSTATS: ['flightstats', 'flightstats api', 'flightstats-api'],
    OEM: ['oem', 'oem records', 'oem-records'],
    DPM: ['dpm notes', 'dpm-notes'],
    POLICE: ['police', 'external authority', 'police-log']
  };

  var EVIDENCE_CATALOG = {
    TOPS_DELAY_RECORD: { name: 'TOPS Delay Record', system: 'TOPS', hardDependencies: [] },
    TOPS_FULL_ROTATION: { name: 'TOPS Full Tail Line of Flying', system: 'TOPS', hardDependencies: ['TOPS_DELAY_RECORD'] },
    EUROCONTROL_CTOT: { name: 'Eurocontrol CTOT Assignment', system: 'EUROCONTROL', hardDependencies: ['TOPS_DELAY_RECORD'] },
    TOPS_NEXTDAY_ARRIVAL: { name: 'TOPS Next-Day Arrival', system: 'TOPS', hardDependencies: ['TOPS_DELAY_RECORD'] },
    GROUND_HANDLER_HOTAC: { name: 'Ground Handler HOTAC Records', system: 'Ground handler', hardDependencies: [] },
    AMOS_BIRDSTRIKE_INSPECTION: { name: 'AMOS Birdstrike Inspection', system: 'AMOS', hardDependencies: [] },
    METAR_DESTINATION: { name: 'METAR Destination', system: 'Ogimet API', hardDependencies: [] },
    AIMS_STANDBY_LOG: { name: 'AIMS Standby Log', system: 'AIMS', hardDependencies: [] },
    OEM_AD_SB_SEARCH: { name: 'OEM AD/SB Search', system: 'OEM records', hardDependencies: [] },
    AMOS_DEFECT_LOG: { name: 'AMOS Defect Log', system: 'AMOS', hardDependencies: [] },
    TOPS_POSITIONING_TAIL: { name: 'TOPS Positioning Tail Record', system: 'TOPS', hardDependencies: ['TOPS_DELAY_RECORD'] },
    AIMS_REST_PERIOD_REPLACEMENT: { name: 'AIMS Rest Period — Replacement Crew', system: 'AIMS', hardDependencies: [] },
    POLICE_ATTENDANCE: { name: 'Police Attendance Record', system: 'External authority', hardDependencies: [] },
    FLIGHTSTATS_CROSSCARRIER: { name: 'FlightStats Cross-Carrier Data', system: 'FlightStats API', hardDependencies: [] },
    SAFETYNET_MEDICAL: { name: 'SafetyNet Medical Report', system: 'SafetyNet', hardDependencies: [] },
    HERMES_ART8_OFFER: { name: 'HERMES Art 8 Offer Record', system: 'HERMES', hardDependencies: [] },
    DPM_NOTES: { name: 'DPM Notes', system: 'DPM Notes', hardDependencies: [] },
    AIMS_FDP_RECORD: { name: 'Crew scheduling system — Crew Route & FDP', system: 'AIMS', hardDependencies: [] },
    EV_DISCO: { name: 'Disruption data system — Disruption Record', system: 'Disruption data system', hardDependencies: [] },
    EV_SAFETYNET: { name: 'Safety reporting system Reports', system: 'SafetyNet', hardDependencies: [] },
    EV_NOTAM: { name: 'NOTAM Records', system: 'NOTAM', hardDependencies: [] },
    EV_MET_OFFICE: { name: 'Met Office — Daily Impact Hazard Forecast', system: 'Met Office', hardDependencies: [] },
    EV_AIRPORT_WEB: { name: 'Airport Statement / Travel Advisory', system: 'Affected airport website', hardDependencies: [] }
  };

  var EVIDENCE_ID_ALIASES = [
    [/delay record|tops delay|operational delay records system delay/i, 'TOPS_DELAY_RECORD'],
    [/full rotation|tail line of flying|inbound\/rotation/i, 'TOPS_FULL_ROTATION'],
    [/ctot|atfm|eurocontrol/i, 'EUROCONTROL_CTOT'],
    [/birdstrike.*inspection|birdstrike report|mandatory inspection/i, 'AMOS_BIRDSTRIKE_INSPECTION'],
    [/standby log|standby crew/i, 'AIMS_STANDBY_LOG'],
    [/ad\/sb|oem ad|failure mode/i, 'OEM_AD_SB_SEARCH'],
    [/metar|taf destination|ogimet/i, 'METAR_DESTINATION'],
    [/hotac|hotel record/i, 'GROUND_HANDLER_HOTAC'],
    [/art 8|hermes|rerouting offer/i, 'HERMES_ART8_OFFER'],
    [/dpm notes/i, 'DPM_NOTES'],
    [/next.?day|ond operation/i, 'TOPS_NEXTDAY_ARRIVAL'],
    [/fdp record|crew scheduling system fdp/i, 'AIMS_FDP_RECORD'],
    [/defect log|maintenance history|defect and maintenance/i, 'AMOS_DEFECT_LOG'],
    [/safety.*report|safetynet|welfare incident/i, 'SAFETYNET_MEDICAL'],
    [/police|external authority/i, 'POLICE_ATTENDANCE'],
    [/flightstats|cross.?carrier/i, 'FLIGHTSTATS_CROSSCARRIER'],
    [/positioning tail|positioning line/i, 'TOPS_POSITIONING_TAIL'],
    [/rest period|wake rule|18.hour/i, 'AIMS_REST_PERIOD_REPLACEMENT']
  ];

  var NODE_CONCLUSIONS = {
    'DT-01': {
      conclusions: [
        { id: 'DT1_CTOT_CONFIRMED', question: 'CTOT / ATFM restriction confirmed as root cause?' },
        { id: 'DT1_ATC_CAUSE', question: 'ATC delay codes corroborate extraordinary circumstances?' },
        { id: 'U7_EC_ESTABLISHED', question: 'Wallentin-Hermann EC gate satisfied at this event?' }
      ],
      dependsOn: [],
      downstream: ['U8_RM_SLOT_RECOVERY']
    },
    'DT-02': {
      conclusions: [
        { id: 'DT2_METAR_BELOW_MINIMA', question: 'Destination weather below operating minima?' },
        { id: 'DT2_FORESEEABILITY_RISK', question: 'TAF foreseeability risk at departure?' },
        { id: 'U7_LIMB1_INHERENCY', question: 'Limb 1 — circumstance not inherent in normal operations?' },
        { id: 'U7_LIMB2_CONTROL', question: 'Limb 2 — circumstance beyond carrier actual control?' }
      ]
    },
    'DT-03': {
      conclusions: [
        { id: 'U7_LIMB1_INHERENCY', question: 'Limb 1 — airport closure not inherent?' },
        { id: 'U7_LIMB2_CONTROL', question: 'Limb 2 — authority-mandated closure?' }
      ]
    },
    'DT-04': {
      conclusions: [
        { id: 'DT4_BIRDSTRIKE_EC', question: 'Birdstrike per se EC established (Pešková)?' },
        { id: 'U7_EC_ESTABLISHED', question: 'Wallentin-Hermann EC gate satisfied?' }
      ]
    },
    'DT-05': {
      conclusions: [
        { id: 'DT5_VAN_DER_LANS_ORDINARY', question: 'Ordinary technical fault (van der Lans)?' },
        { id: 'DT14_HIDDEN_DEFECT_LIMB1', question: 'Hidden defect Limb 1 — unknown failure mode?' }
      ]
    },
    'DT-06': {
      conclusions: [
        { id: 'DT6_FTL_ROOT_CAUSE_ANALYSIS', question: 'FTL exhaustion root cause identified?' },
        { id: 'DT6_FTL_CAUSED_BY_EC', question: 'FTL breach caused by EC timing?' }
      ]
    },
    'DT-07': {
      conclusions: [
        { id: 'DT7_THIRD_PARTY_STRIKE', question: 'Third-party industrial action (not Krüsemann own-staff)?' }
      ]
    },
    'DT-08': {
      conclusions: [
        { id: 'U7_LIMB2_CONTROL', question: 'Authority-mandated security — beyond carrier control?' }
      ]
    },
    'DT-09': {
      conclusions: [
        { id: 'DT9_MEDICAL_EC', question: 'Medical emergency — mandatory carrier response?' }
      ]
    },
    'DT-10': {
      conclusions: [
        { id: 'DT10_DISRUPTIVE_EC', question: 'Disruptive passenger — external behaviour EC?' }
      ]
    },
    'DT-13': {
      conclusions: [
        { id: 'DT13_CASCADE_ROOT', question: 'Cascade root cause identified at rotation start?' }
      ]
    },
    'DT-11': {
      conclusions: [
        { id: 'U7_EC_ESTABLISHED', question: 'Natural disaster EC established?' }
      ]
    },
    'DT-12': {
      conclusions: [
        { id: 'U7_EC_ESTABLISHED', question: 'ATM infrastructure failure EC?' }
      ]
    },
    'DT-14': {
      conclusions: [
        { id: 'DT14_HIDDEN_DEFECT_LIMB1', question: 'Hidden defect Limb 1 — unknown failure mode?' }
      ]
    },
    'DT-15': {
      conclusions: [
        { id: 'DT15_NO_EC_DEFENCE', question: 'Denied boarding — EC defence unavailable?' }
      ]
    },
    'DT-16': {
      conclusions: [
        { id: 'U7_EC_ESTABLISHED', question: 'Cancellation EC root cause?' }
      ]
    },
    'DT-17': {
      conclusions: [
        { id: 'U7_EC_ESTABLISHED', question: 'Government/political restriction EC?' }
      ]
    },
    'DT-18': {
      conclusions: [
        { id: 'DT18_POSITIONING_ROOT', question: 'Positioning disruption root cause classified?' }
      ]
    },
    'DT-19': {
      conclusions: [
        { id: 'DT19_INTERVENING_CAUSE', question: 'Intervening cause breaks positioning chain?' }
      ]
    },
    'DT-20': {
      conclusions: [
        { id: 'DT20_WAKE_RULE_EC_CAUSED', question: '18-hour wake rule breach EC-caused?' }
      ]
    },
    'U-7': {
      conclusions: [
        { id: 'U7_EC_ESTABLISHED', question: 'Extraordinary circumstances gate — both limbs?' },
        { id: 'U7_LIMB1_INHERENCY', question: 'Limb 1 inherency satisfied?' },
        { id: 'U7_LIMB2_CONTROL', question: 'Limb 2 control satisfied?' }
      ]
    },
    'U-8': {
      conclusions: [
        { id: 'U8_RM_SLOT_RECOVERY', question: 'Reasonable measures — slot/aircraft/crew recovery?' },
        { id: 'U8_RM_CREW_RECOVERY', question: 'Reasonable measures — crew recovery timing?' },
        { id: 'U8_RM_DISPATCH_EXHAUSTED', question: 'Reasonable measures — dispatch options exhausted?' }
      ]
    },
    'U-9': {
      conclusions: [{ id: 'U9_ART8_COMPLIED', question: 'Art 8 rerouting/reimbursement offered?' }]
    },
    'U-10': {
      conclusions: [
        { id: 'U10_ART9_MEALS_MET', question: 'Art 9 meals and refreshments provided?' },
        { id: 'U10_ART9_HOTEL_MET', question: 'Art 9 hotel accommodation provided?' }
      ]
    }
  };

  var CHAIN_EVIDENCE_TRIGGERS = [
    { pattern: /ctot|atfm|eurocontrol|\batc\b/, evidenceIds: ['EUROCONTROL_CTOT'] },
    { pattern: /ond|overnight|next day|curfew|following day/, evidenceIds: ['TOPS_NEXTDAY_ARRIVAL', 'GROUND_HANDLER_HOTAC'] },
    { pattern: /birdstrike|bird strike|ingestion/, evidenceIds: ['AMOS_BIRDSTRIKE_INSPECTION'] },
    { pattern: /weather|thunderstorm|below minima|diversion/, evidenceIds: ['METAR_DESTINATION'] },
    { pattern: /ftl|out of hours|crew.*limit|standby crew/, evidenceIds: ['AIMS_STANDBY_LOG'] },
    { pattern: /hidden defect|manufacturing|hydraulic|category a|\bmel\b/, evidenceIds: ['OEM_AD_SB_SEARCH', 'AMOS_DEFECT_LOG'] },
    { pattern: /positioning/, evidenceIds: ['TOPS_POSITIONING_TAIL'] },
    { pattern: /cascade|late inbound|rotation|prior sector/, evidenceIds: ['TOPS_FULL_ROTATION'] },
    { pattern: /18.hour|wake rule|fatigue/, evidenceIds: ['AIMS_REST_PERIOD_REPLACEMENT'] },
    { pattern: /security|police|disruptive|suspicious/, evidenceIds: ['POLICE_ATTENDANCE'] },
    { pattern: /staff shortage|handler strike|baggage handler/, evidenceIds: ['FLIGHTSTATS_CROSSCARRIER'] },
    { pattern: /medical|cardiac|welfare/, evidenceIds: ['SAFETYNET_MEDICAL'] },
    { pattern: /cancel|5 hour|art 8/, evidenceIds: ['HERMES_ART8_OFFER'] }
  ];

  var DEMO_EVIDENCE_SCENARIOS = [
    {
      pattern: /ctot|atfm|eurocontrol|network-wide atfm/i,
      collected: [
        { id: 'TOPS_DELAY_RECORD', findings: [{ type: 'TOPS_DELAY_CODE_81_89', description: 'ATC delay codes 81-89' }] },
        { id: 'EUROCONTROL_CTOT', findings: [{ type: 'TOPS_CTOT_CONFIRMED', description: 'CTOT restriction confirmed' }] },
        { id: 'FLIGHTSTATS_CROSSCARRIER', findings: [{ type: 'FLIGHTSTATS_MULTI_CARRIER_IMPACT', description: 'Cross-carrier systemic delay' }] }
      ],
      missing: ['DPM_NOTES']
    },
    {
      pattern: /thunderstorm|below minima|diversion|valencia/i,
      collected: [
        { id: 'TOPS_DELAY_RECORD', findings: [{ type: 'TOPS_DIVERSION', description: 'Mandatory diversion recorded' }] },
        { id: 'METAR_DESTINATION', findings: [{ type: 'METAR_BELOW_ILS_MINIMA', description: 'Below ILS minima at destination' }] }
      ],
      missing: ['GROUND_HANDLER_HOTAC']
    },
    {
      pattern: /birdstrike|bird strike|ingestion/i,
      collected: [
        { id: 'TOPS_DELAY_RECORD', findings: [{ type: 'AMOS_BIRDSTRIKE', description: 'Birdstrike on approach' }] },
        { id: 'AMOS_BIRDSTRIKE_INSPECTION', findings: [{ type: 'AMOS_NO_PRIOR_DEFECT', description: 'Mandatory inspection completed' }] }
      ],
      missing: []
    },
    {
      pattern: /late inbound|cascade|prior rotation|ftl|out of hours/i,
      collected: [
        { id: 'TOPS_DELAY_RECORD', findings: [{ type: 'TOPS_PRIOR_SECTOR_DELAY', description: 'Prior sector delay in rotation' }] }
      ],
      missing: ['TOPS_FULL_ROTATION', 'AIMS_STANDBY_LOG']
    },
    {
      pattern: /hidden defect|hydraulic|category a|manufacturing/i,
      collected: [
        { id: 'AMOS_DEFECT_LOG', findings: [{ type: 'AMOS_MEL_CATEGORY_A', description: 'Category A — no dispatch' }] }
      ],
      missing: ['OEM_AD_SB_SEARCH']
    },
    {
      pattern: /positioning|wake rule|18.hour|fuel leak/i,
      collected: [
        { id: 'TOPS_DELAY_RECORD', findings: [{ type: 'TOPS_POSITIONING_FLIGHT', description: 'Positioning disruption' }] },
        { id: 'TOPS_POSITIONING_TAIL', findings: [{ type: 'AIMS_FDP_ELEVATED_BEFORE_DISRUPTION', description: 'FDP elevated before disruption' }] }
      ],
      missing: ['AIMS_REST_PERIOD_REPLACEMENT']
    },
    {
      pattern: /security alert|suspicious|police attended/i,
      collected: [
        { id: 'TOPS_DELAY_RECORD', findings: [{ type: 'POLICE_EXTERNAL_AUTHORITY', description: 'Police mandated search' }] },
        { id: 'POLICE_ATTENDANCE', findings: [{ type: 'POLICE_EXTERNAL_AUTHORITY', description: 'External authority attendance' }] }
      ],
      missing: []
    },
    {
      pattern: /disruptive passenger|threatening behaviour/i,
      collected: [
        { id: 'POLICE_ATTENDANCE', findings: [{ type: 'POLICE_EXTERNAL_AUTHORITY', description: 'Police met aircraft' }] }
      ],
      missing: []
    },
    {
      pattern: /ond|overnight|next day|curfew/i,
      collected: [
        { id: 'TOPS_NEXTDAY_ARRIVAL', findings: [{ type: 'TOPS_OND', description: 'Next-day arrival recorded' }] }
      ],
      missing: ['GROUND_HANDLER_HOTAC']
    }
  ];

  function norm(s) {
    return (s || '').toLowerCase();
  }

  function deriveEvidenceId(name, source) {
    var text = (name || '') + ' ' + (source || '');
    for (var i = 0; i < EVIDENCE_ID_ALIASES.length; i++) {
      if (EVIDENCE_ID_ALIASES[i][0].test(text)) return EVIDENCE_ID_ALIASES[i][1];
    }
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').toUpperCase().substring(0, 48) || 'EVIDENCE_UNKNOWN';
  }

  function getEvidenceMeta(id) {
    return EVIDENCE_CATALOG[id] || { name: id, system: 'Unknown', hardDependencies: [] };
  }

  function getNodeConclusions(nodeId) {
    return (NODE_CONCLUSIONS[nodeId] && NODE_CONCLUSIONS[nodeId].conclusions) || [];
  }

  function getSemanticIdsForNode(nodeId) {
    return getNodeConclusions(nodeId).map(function (c) { return c.id; });
  }

  function matchDemoEvidenceScenario(iccText) {
    var t = norm(iccText);
    for (var i = 0; i < DEMO_EVIDENCE_SCENARIOS.length; i++) {
      if (DEMO_EVIDENCE_SCENARIOS[i].pattern.test(t)) return DEMO_EVIDENCE_SCENARIOS[i];
    }
    return {
      collected: [{ id: 'TOPS_DELAY_RECORD', findings: [{ type: 'TOPS_DELAY_CODE_81_89', description: 'Operational delay record' }] }],
      missing: []
    };
  }

  function seedEvidenceIdsFromChain(chain) {
    var ids = ['TOPS_DELAY_RECORD'];
    (chain || []).forEach(function (ev) {
      var desc = norm(ev.description);
      CHAIN_EVIDENCE_TRIGGERS.forEach(function (tr) {
        if (tr.pattern.test(desc)) {
          tr.evidenceIds.forEach(function (eid) {
            if (ids.indexOf(eid) < 0) ids.push(eid);
          });
        }
      });
    });
    return ids;
  }

  return {
    SYSTEM_ALIASES: SYSTEM_ALIASES,
    EVIDENCE_CATALOG: EVIDENCE_CATALOG,
    EVIDENCE_ID_ALIASES: EVIDENCE_ID_ALIASES,
    NODE_CONCLUSIONS: NODE_CONCLUSIONS,
    CHAIN_EVIDENCE_TRIGGERS: CHAIN_EVIDENCE_TRIGGERS,
    DEMO_EVIDENCE_SCENARIOS: DEMO_EVIDENCE_SCENARIOS,
    deriveEvidenceId: deriveEvidenceId,
    getEvidenceMeta: getEvidenceMeta,
    getNodeConclusions: getNodeConclusions,
    getSemanticIdsForNode: getSemanticIdsForNode,
    matchDemoEvidenceScenario: matchDemoEvidenceScenario,
    seedEvidenceIdsFromChain: seedEvidenceIdsFromChain
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DefendAbleRegistry;
}
