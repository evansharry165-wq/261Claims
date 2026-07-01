/* DefendAble — all decision tree definitions (DT-01 through DT-20) */
var DefendAbleTrees = (function () {

  var E = typeof DefendAbleTreeEngine !== 'undefined' ? DefendAbleTreeEngine : null;

  function wrapCustom(treeId, disruptionType, authority, priority, matchesFn, customRun) {
    return {
      treeId: treeId,
      disruptionType: disruptionType,
      authority: authority,
      priority: priority,
      matches: matchesFn,
      customRun: customRun
    };
  }

  function stdMeasures(id, prefix) {
    return {
      id: id,
      name: 'Reasonable measures',
      type: 'measures',
      question: 'Were recovery and passenger care measures attempted and documented?',
      authority: 'Wallentin-Hermann para 40',
      requiredLibKeys: ['dpm', 'tops'],
      secondaryLibKeys: ['internal_email', 'ops_review'],
      conclusionIds: ['U8_RM_SLOT_RECOVERY'],
      yesMeans: 'Reasonable measures defence supported.',
      noMeans: 'Failed intervention — EC may not save defence at U-8.',
      onYes: 'EXIT',
      onUnknown: 'EXIT',
      onNo: 'EXIT'
    };
  }

  var DEFINITIONS = [
    wrapCustom('DT-01', 'ATC Restrictions', 'Pešková C-315/15; Wallentin-Hermann C-549/07', 50,
      function (t, c) { return typeof DefendAbleTreeDT01 !== 'undefined' && DefendAbleTreeDT01.matches(t, c); },
      function (ctx) { return DefendAbleTreeDT01.runTree(ctx); }),
    wrapCustom('DT-02', 'Weather', 'Pešková; Wallentin-Hermann; Blanche v EasyJet', 40,
      function (t, c) { return typeof DefendAbleTreeDT02 !== 'undefined' && DefendAbleTreeDT02.matches(t, c); },
      function (ctx) { return DefendAbleTreeDT02.runTree(ctx); }),

    {
      treeId: 'DT-03',
      disruptionType: 'Airport/Runway Closure',
      authority: 'Pešková; established weather/airport closure EC',
      priority: 35,
      ecGateId: 'DT3-G1',
      matches: function (t, c) {
        if (typeof DefendAbleTreeDT02 !== 'undefined' && DefendAbleTreeDT02.isWeatherOriginOnly(t)) return true;
        return /\blvp\b|\bsnowtam|\brunway closure|\bde-ic|\borigin weather\b/i.test(t || '')
          && !/\bdiversion\b|\bbelow minima\b|\bthunderstorm\b|\barrival destination\b/i.test(t || '');
      },
      gates: [
        {
          id: 'DT3-G1', name: 'Origin LVP / runway closure', type: 'entry',
          question: 'Was origin or en-route airport operations restricted (LVP, SNOWTAM, runway closure)?',
          authority: 'Systemic airport weather closure = EC; routine de-icing alone is not',
          iccPattern: /\blvp\b|\bsnowtam|\brunway closure|\ball carriers\b/i,
          requiredLibKeys: ['tops', 'notam', 'ogimet'],
          conclusionIds: ['U7_LIMB1_INHERENCY', 'U7_EC_ESTABLISHED'],
          yesMeans: 'Airport/runway closure EC candidate at root.',
          onYes: 'DT3-G2', onNo: 'ROUTE_AWAY'
        },
        {
          id: 'DT3-G2', name: 'Authority-mandated closure', type: 'confirm',
          question: 'Was the closure imposed by airport authority (not carrier discretion)?',
          authority: 'NOTAM + airport statement',
          requiredLibKeys: ['notam', 'tops'],
          secondaryLibKeys: ['airport_web'],
          conclusionIds: ['U7_LIMB2_CONTROL'],
          iccPattern: /\brunway closure|\bsnowtam|\bairport authority\b/i,
          onYes: 'DT3-G3', onNo: 'DT3-G3'
        },
        {
          id: 'DT3-G3', name: 'De-icing scope', type: 'confirm',
          question: 'Was delay caused by systemic abnormal de-icing queue (not routine turnround de-ice)?',
          authority: 'Routine de-icing = ordinary; systemic abnormal may be EC',
          conditional: function (ctx) { return /\bde-ic/i.test(ctx.iccText || ''); },
          requiredLibKeys: ['tops', 'disco'],
          iccPattern: /\bde-ic|\bdeicing\b/i,
          onYes: 'DT3-G4', onNo: 'DT3-G4', onSkip: 'DT3-G4'
        },
        stdMeasures('DT3-G4', 'DT3')
      ]
    },

    {
      treeId: 'DT-04',
      disruptionType: 'Birdstrike',
      authority: 'Pešková C-315/15 — birdstrike per se EC',
      priority: 5,
      ecGateId: 'DT4-G1',
      matches: function (t) { return /\bbirdstrike|\bbird strike|\bingestion\b/i.test(t || ''); },
      gates: [
        {
          id: 'DT4-G1', name: 'Birdstrike event', type: 'entry',
          question: 'Did a birdstrike or engine ingestion event occur?',
          authority: 'Pešková — per se extraordinary',
          iccPattern: /\bbirdstrike|\bbird strike|\bingestion\b/i,
          requiredLibKeys: ['amos', 'tops', 'safetynet'],
          findingTypes: { tops: 'AMOS_BIRDSTRIKE' },
          conclusionIds: ['DT4_BIRDSTRIKE_EC', 'U7_EC_ESTABLISHED'],
          yesMeans: 'Birdstrike EC established — both Wallentin-Hermann limbs satisfied.',
          onYes: 'DT4-G2', onNo: 'ROUTE_AWAY'
        },
        {
          id: 'DT4-G2', name: 'Mandatory inspection', type: 'confirm',
          question: 'Was mandatory AMOS/EASA inspection completed and documented?',
          authority: 'Without inspection record claim is unsubstantiated',
          requiredLibKeys: ['amos', 'tops'],
          findingTypes: { amos: 'AMOS_NO_PRIOR_DEFECT' },
          onYes: 'DT4-G3', onNo: 'DT4-G3'
        },
        stdMeasures('DT4-G3', 'DT4')
      ]
    },

    {
      treeId: 'DT-05',
      disruptionType: 'Technical Issues',
      authority: 'van der Lans C-257/14 — ordinary technical fault NOT EC',
      priority: 12,
      ecGateId: 'DT5-G2',
      matches: function (t) {
        if (/\bpositioning\b/i.test(t || '')) return false;
        if (/\bhidden defect|\bmanufacturing defect|\bno prior ad\b/i.test(t || '')) return false;
        return /\bhydraulic|\btechnical fault|\baog\b|\bdefect\b|\bmel\b|\bcategory a\b/i.test(t || '');
      },
      gates: [
        {
          id: 'DT5-G1', name: 'Technical fault identified', type: 'entry',
          question: 'Was an aircraft technical fault the stated cause of disruption?',
          iccPattern: /\bhydraulic|\btechnical|\baog\b|\bdefect\b|\bmel\b/i,
          requiredLibKeys: ['amos', 'tops'],
          onYes: 'DT5-G2', onNo: 'ROUTE_AWAY'
        },
        {
          id: 'DT5-G2', name: 'Ordinary technical (van der Lans)', type: 'concede',
          question: 'Is this Category A / MEL no-dispatch — ordinary technical fault?',
          authority: 'van der Lans — routine faults NOT EC',
          conditional: function (ctx) {
            return /\bcategory a|\bmel dispatch not|\bvan der lans\b/i.test(ctx.iccText || '');
          },
          conclusion: 'Ordinary technical fault — concede EC on technical point.',
          conditions: ['Concede EC if ordinary technical fault — assess quantum and passenger rights.'],
          onSkip: 'DT5-G2b', onNA: 'DT5-G2b'
        },
        {
          id: 'DT5-G2b', name: 'Technical fault scope', type: 'confirm',
          question: 'Is an aircraft technical fault the stated cause of disruption?',
          iccPattern: /\bhydraulic|\btechnical|\baog\b|\bdefect\b/i,
          requiredLibKeys: ['amos', 'tops'],
          onYes: 'DT5-G3', onNo: 'ROUTE_AWAY'
        },
        {
          id: 'DT5-G3', name: 'External technical cause', type: 'confirm',
          question: 'Was fault caused by external event (lightning, ground damage, birdstrike)?',
          iccPattern: /\blightning|\bground damage|\bbirdstrike\b/i,
          conclusionIds: ['U7_EC_ESTABLISHED'],
          onYes: 'DT5-G4', onNo: 'EXIT'
        },
        stdMeasures('DT5-G4', 'DT5')
      ]
    },

    {
      treeId: 'DT-06',
      disruptionType: 'Crew Hours / Overnight Delay',
      authority: 'Lipton [2024] UKSC 24 — crew illness NOT EC; FTL never independent EC',
      priority: 10,
      matches: function (t) {
        if (/\bmedical|\bcardiac|\bwelfare incident|\bpassenger welfare\b/i.test(t || '')) return false;
        if (/\bpositioning\b/i.test(t || '')) return false;
        if (/\blate inbound|\bcascade|\brotation|\bprior sector\b/i.test(t || '')) return false;
        return /\bftl\b|\bout of hours\b|\bcrew.*limit|\bcrew hours\b|\bstandby crew\b/i.test(t || '')
          || /\bcrew illness|\bpilot sick|\bcaptain sick|\bcrew sick\b/i.test(t || '');
      },
      gates: [
        {
          id: 'DT6-G1', name: 'Crew illness (Lipton)', type: 'concede',
          question: 'Is crew illness/sickness the root cause?',
          authority: 'Lipton v BA Cityflyer [2024] UKSC 24',
          conditional: function (ctx) { return /\bcrew illness|\bpilot sick|\bcaptain sick|\bcrew sick\b/i.test(ctx.iccText || ''); },
          conclusion: 'Crew illness is NOT extraordinary circumstances — concede.',
          conditions: ['Concede EC on crew illness — assess quantum and Art 8/9 only.']
        },
        {
          id: 'DT6-G2', name: 'FTL root cause', type: 'entry',
          question: 'What is the root cause of FTL exhaustion (not FTL itself)?',
          authority: 'FTL alone is never EC — identify upstream event',
          iccPattern: /\bftl\b|\bout of hours\b|\bcrew.*limit\b/i,
          requiredLibKeys: ['aims', 'tops'],
          conclusionIds: ['DT6_FTL_ROOT_CAUSE_ANALYSIS'],
          onYes: 'DT6-G3', onNo: 'ROUTE_AWAY', allowTopsFallback: true
        },
        {
          id: 'DT6-G3', name: 'EC caused FTL breach', type: 'confirm',
          question: 'Was FTL breach caused by timing of an upstream EC event?',
          requiredLibKeys: ['aims', 'tops', 'disco'],
          conclusionIds: ['DT6_FTL_CAUSED_BY_EC'],
          iccPattern: /\batc\b|\bweather\b|\bthunderstorm\b|\bctot\b|\bmedical\b|\bsecurity\b/i,
          yesMeans: 'FTL consequence of EC root — apply upstream disruption tree.',
          onYes: 'EXIT', onNo: 'EXIT'
        }
      ]
    },

    {
      treeId: 'DT-07',
      disruptionType: 'Industrial Action',
      authority: 'Krüsemann C-601/17; Pešková C-315/15',
      priority: 15,
      ecGateId: 'DT7-G2',
      matches: function (t) {
        return /\bindustrial action|\bstrike\b/i.test(t || '');
      },
      gates: [
        {
          id: 'DT7-G1', name: 'Own-staff strike', type: 'concede',
          question: 'Is this carrier own-staff industrial action?',
          authority: 'Krüsemann — own-staff strike NOT EC',
          conditional: function (ctx) {
            return /\bown\b[\s\S]{0,40}\bstrike|\bpilot union|\bown pilot|\bown staff strike|\bpilot staff participating\b/i.test(ctx.iccText || '')
              && !/\batc industrial|\bthird.party|\bhandler\b/i.test(ctx.iccText || '');
          },
          conclusion: 'Own-staff strike — concede immediately.',
          conditions: ['Concede — Krüsemann own-staff industrial action is not EC.']
        },
        {
          id: 'DT7-G2', name: 'Third-party strike', type: 'entry',
          question: 'Is industrial action by a third party (ATC, airport, handler)?',
          iccPattern: /\bindustrial action|\bstrike\b|\bhandler\b|\batc industrial\b/i,
          requiredLibKeys: ['tops', 'disco', 'notam'],
          conclusionIds: ['DT7_THIRD_PARTY_STRIKE', 'U7_EC_ESTABLISHED'],
          yesMeans: 'Third-party industrial action — EC candidate.',
          onYes: 'DT7-G3', onNo: 'ROUTE_AWAY'
        },
        {
          id: 'DT7-G3', name: 'Systemic impact', type: 'confirm',
          question: 'Did industrial action cause systemic delay beyond this flight?',
          requiredLibKeys: ['flightstats', 'tops'],
          secondaryLibKeys: ['disco'],
          findingTypes: { flightstats: 'FLIGHTSTATS_MULTI_CARRIER_IMPACT' },
          onYes: 'DT7-G4', onNo: 'DT7-G4'
        },
        stdMeasures('DT7-G4', 'DT7')
      ]
    },

    {
      treeId: 'DT-08',
      disruptionType: 'Security Alert',
      authority: 'Authority-mandated security = EC',
      priority: 18,
      ecGateId: 'DT8-G1',
      matches: function (t) {
        return /\bsecurity alert|\bsuspicious|\bhold search|\bre-screen|\bpolice attended\b/i.test(t || '')
          && !/\bdisruptive passenger|\bunruly\b/i.test(t || '');
      },
      gates: [
        {
          id: 'DT8-G1', name: 'External security event', type: 'entry',
          question: 'Was delay caused by externally imposed security measures?',
          iccPattern: /\bsecurity alert|\bsuspicious|\bhold search|\bpolice\b/i,
          requiredLibKeys: ['safetynet', 'tops'],
          conclusionIds: ['U7_LIMB2_CONTROL', 'U7_EC_ESTABLISHED'],
          yesMeans: 'Security EC — authority-mandated search.',
          onYes: 'DT8-G2', onNo: 'ROUTE_AWAY'
        },
        {
          id: 'DT8-G2', name: 'Police / authority attendance', type: 'confirm',
          question: 'Is police or airport security authority attendance documented?',
          requiredLibKeys: ['tops', 'safetynet'],
          findingTypes: { tops: 'POLICE_EXTERNAL_AUTHORITY' },
          onYes: 'DT8-G3', onNo: 'DT8-G3'
        },
        stdMeasures('DT8-G3', 'DT8')
      ]
    },

    {
      treeId: 'DT-09',
      disruptionType: 'Medical Emergency',
      authority: 'Mandatory medical response = EC',
      priority: 8,
      ecGateId: 'DT9-G1',
      matches: function (t) {
        return /\bmedical|\bcardiac|\bwelfare incident|\bpassenger welfare|\bmedical emergency\b/i.test(t || '');
      },
      gates: [
        {
          id: 'DT9-G1', name: 'Medical emergency', type: 'entry',
          question: 'Did a passenger medical emergency require mandatory carrier response?',
          iccPattern: /\bmedical|\bcardiac|\bwelfare\b/i,
          requiredLibKeys: ['safetynet', 'tops'],
          conclusionIds: ['DT9_MEDICAL_EC', 'U7_EC_ESTABLISHED'],
          yesMeans: 'Medical emergency EC — mandatory not discretionary.',
          onYes: 'DT9-G2', onNo: 'ROUTE_AWAY'
        },
        {
          id: 'DT9-G2', name: 'Diversion / disembark', type: 'confirm',
          question: 'Was diversion or extended on-ground handling required?',
          conditional: function (ctx) { return /\bdiversion\b|\bdisembark\b|\bopo\b/i.test(ctx.iccText || ''); },
          requiredLibKeys: ['tops', 'flightradar'],
          findingTypes: { tops: 'TOPS_DIVERSION' },
          onYes: 'DT9-G3', onNo: 'DT9-G3', onSkip: 'DT9-G3'
        },
        stdMeasures('DT9-G3', 'DT9')
      ]
    },

    {
      treeId: 'DT-10',
      disruptionType: 'Disruptive Passenger',
      authority: 'External passenger behaviour = EC',
      priority: 16,
      ecGateId: 'DT10-G1',
      matches: function (t) {
        return /\bdisruptive|\bunruly|\breturned to gate|\bthreatening behaviour\b/i.test(t || '');
      },
      gates: [
        {
          id: 'DT10-G1', name: 'Disruptive passenger', type: 'entry',
          question: 'Did disruptive passenger behaviour cause the delay?',
          iccPattern: /\bdisruptive|\bunruly|\bthreatening behaviour\b/i,
          requiredLibKeys: ['safetynet', 'tops'],
          conclusionIds: ['DT10_DISRUPTIVE_EC', 'U7_EC_ESTABLISHED'],
          yesMeans: 'Disruptive passenger EC established.',
          onYes: 'DT10-G2', onNo: 'ROUTE_AWAY'
        },
        {
          id: 'DT10-G2', name: 'Police / offload', type: 'confirm',
          question: 'Was police attendance and passenger/baggage offload documented?',
          requiredLibKeys: ['tops', 'safetynet'],
          findingTypes: { tops: 'POLICE_EXTERNAL_AUTHORITY' },
          iccPattern: /\bpolice|\boffload|\breconciliation\b/i,
          onYes: 'DT10-G3', onNo: 'DT10-G3'
        },
        stdMeasures('DT10-G3', 'DT10')
      ]
    },

    {
      treeId: 'DT-11',
      disruptionType: 'Natural Disaster',
      authority: 'Government/meteorological catastrophe = EC',
      priority: 14,
      ecGateId: 'DT11-G1',
      matches: function (t) {
        return /\bvolcanic|\bash\b|\bearthquake|\bflood|\bhurricane|\bnatural disaster\b/i.test(t || '');
      },
      gates: [
        {
          id: 'DT11-G1', name: 'Natural disaster event', type: 'entry',
          question: 'Was disruption caused by natural disaster or government catastrophe response?',
          iccPattern: /\bvolcanic|\bash\b|\bearthquake|\bflood|\bhurricane|\bnatural disaster\b/i,
          requiredLibKeys: ['notam', 'tops'],
          conclusionIds: ['U7_EC_ESTABLISHED', 'U7_LIMB1_INHERENCY'],
          yesMeans: 'Natural disaster EC candidate.',
          onYes: 'DT11-G2', onNo: 'ROUTE_AWAY'
        },
        {
          id: 'DT11-G2', name: 'SIGMET / government notice', type: 'confirm',
          question: 'Is SIGMET type VA, NOTAM, or government notice on file?',
          requiredLibKeys: ['notam', 'met_office'],
          findingTypes: { notam: 'EVIDENCE_RECEIVED' },
          iccPattern: /\bsigmet|\bnotam|\bgovernment\b/i,
          onYes: 'DT11-G3', onNo: 'DT11-G3'
        },
        stdMeasures('DT11-G3', 'DT11')
      ]
    },

    {
      treeId: 'DT-12',
      disruptionType: 'Airport System Failure',
      authority: 'Third-party ATM/airport infrastructure failure = EC',
      priority: 45,
      ecGateId: 'DT12-G1',
      matches: function (t) {
        return /\bnats\b.*\boutage|\beurocontrol.*\boutage|\batm system|\bnetwork failure|\bsystem failure\b/i.test(t || '');
      },
      gates: [
        {
          id: 'DT12-G1', name: 'ATM / airport system failure', type: 'entry',
          question: 'Was there NATS, Eurocontrol, or airport system outage?',
          iccPattern: /\boutage|\batm system|\bnetwork failure|\bsystem failure\b/i,
          requiredLibKeys: ['eurocontrol', 'tops', 'notam'],
          conclusionIds: ['U7_EC_ESTABLISHED'],
          yesMeans: 'Third-party infrastructure failure — EC.',
          onYes: 'DT12-G2', onNo: 'ROUTE_AWAY'
        },
        {
          id: 'DT12-G2', name: 'Cross-carrier impact', type: 'confirm',
          question: 'Did outage affect multiple carriers systemically?',
          requiredLibKeys: ['flightstats', 'tops'],
          findingTypes: { flightstats: 'FLIGHTSTATS_MULTI_CARRIER_IMPACT' },
          onYes: 'DT12-G3', onNo: 'DT12-G3'
        },
        stdMeasures('DT12-G3', 'DT12')
      ]
    },

    {
      treeId: 'DT-13',
      disruptionType: 'Crew Hours / Overnight Delay',
      authority: 'Cascade NOT EC — root cause at rotation start',
      priority: 9,
      ecGateId: 'DT13-G2',
      matches: function (t) {
        return /\bcascade|\blate inbound|\brotation|\bprior sector|\btail line\b/i.test(t || '');
      },
      gates: [
        {
          id: 'DT13-G1', name: 'Cascade identified', type: 'entry',
          question: 'Is this a cascading rotation / late inbound disruption?',
          iccPattern: /\blate inbound|\bcascade|\brotation|\bprior sector\b/i,
          requiredLibKeys: ['tops'],
          conclusionIds: ['DT13_CASCADE_ROOT'],
          onYes: 'DT13-G2', onNo: 'ROUTE_AWAY', allowTopsFallback: true
        },
        {
          id: 'DT13-G2', name: 'Full rotation on file', type: 'confirm',
          question: 'Is TOPS full tail line of flying obtained to identify root cause?',
          requiredLibKeys: ['tops'],
          findingTypes: { tops: 'TOPS_PRIOR_SECTOR_DELAY' },
          yesMeans: 'Root cause analysis possible — apply tree for upstream event.',
          onYes: 'DT13-G3', onNo: 'DT13-G3'
        },
        {
          id: 'DT13-G3', name: 'Root cause tree routing', type: 'confirm',
          question: 'Has root cause at rotation start been classified (weather, ATC, technical)?',
          iccPattern: /\bweather\b|\batc\b|\btechnical\b|\bctot\b|\bthunderstorm\b/i,
          conclusion: 'Apply appropriate disruption tree to root cause — cascade itself is not EC.',
          onYes: 'EXIT', onNo: 'EXIT'
        }
      ]
    },

    {
      treeId: 'DT-14',
      disruptionType: 'Technical Issues',
      authority: 'Matkustaja v Finnair C-385/23; Germanwings C-257/14',
      priority: 11,
      ecGateId: 'DT14-G2',
      matches: function (t) {
        if (/\bpositioning\b/i.test(t || '')) return false;
        return /\bhidden defect|\bmanufacturing defect|\bno prior ad\b|\bunknown failure mode\b/i.test(t || '');
      },
      gates: [
        {
          id: 'DT14-G1', name: 'Hidden defect alleged', type: 'entry',
          question: 'Is hidden manufacturing defect argued?',
          iccPattern: /\bhidden defect|\bmanufacturing defect|\bno prior ad\b/i,
          requiredLibKeys: ['amos', 'tops'],
          onYes: 'DT14-G2', onNo: 'ROUTE_AWAY'
        },
        {
          id: 'DT14-G2', name: 'Limb 1 — unknown failure mode', type: 'confirm',
          question: 'Was failure mode unknown to manufacturer (no prior AD/SB)?',
          authority: 'Matkustaja C-385/23',
          requiredLibKeys: ['amos'],
          findingTypes: { amos: 'AMOS_MEL_CATEGORY_A' },
          conclusionIds: ['DT14_HIDDEN_DEFECT_LIMB1', 'U7_EC_ESTABLISHED'],
          yesMeans: 'Hidden defect Limb 1 supported.',
          onYes: 'DT14-G3', onNo: 'DT14-G3'
        },
        {
          id: 'DT14-G3', name: 'OEM AD/SB search', type: 'confirm',
          question: 'Has OEM AD/SB search been completed?',
          requiredLibKeys: ['amos'],
          onYes: 'DT14-G4', onNo: 'DT14-G4'
        },
        stdMeasures('DT14-G4', 'DT14')
      ]
    },

    {
      treeId: 'DT-15',
      disruptionType: null,
      authority: 'EC261 Art 4 — no EC defence for denied boarding',
      priority: 1,
      matches: function (t) { return /\bdenied boarding|\boverbook|\binvoluntary offload\b/i.test(t || ''); },
      gates: [
        {
          id: 'DT15-G1', name: 'Denied boarding', type: 'concede',
          question: 'Involuntary denied boarding?',
          authority: 'Art 4 — carrier always liable',
          conclusion: 'No EC defence for denied boarding — concede.',
          conditions: ['Concede — Art 7, Art 8, Art 9 apply; do not run EC defence.']
        }
      ]
    },

    {
      treeId: 'DT-16',
      disruptionType: 'Crew Hours / Overnight Delay',
      authority: 'Art 5 cancellation — EC defence available; Dec 2021 EU ruling',
      priority: 22,
      matches: function (t) {
        return /\bcancellation\b|\bshort notice\b|\bmoved.*hour earlier\b|\bwithin 14 days\b/i.test(t || '')
          && !/\bdenied boarding\b/i.test(t || '');
      },
      gates: [
        {
          id: 'DT16-G1', name: 'Cancellation event', type: 'entry',
          question: 'Was this a cancellation (including short-notice schedule change)?',
          iccPattern: /\bcancell|\bmoved.*earlier\b|\bshort notice\b/i,
          requiredLibKeys: ['tops', 'disco'],
          onYes: 'DT16-G2', onNo: 'ROUTE_AWAY'
        },
        {
          id: 'DT16-G2', name: 'EC root cause', type: 'confirm',
          question: 'Is extraordinary circumstance root cause identified for the cancellation?',
          iccPattern: /\bweather\b|\batc\b|\btechnical\b|\bsecurity\b|\bstrike\b/i,
          conclusionIds: ['U7_EC_ESTABLISHED'],
          onYes: 'DT16-G3', onNo: 'DT16-G3'
        },
        stdMeasures('DT16-G3', 'DT16')
      ]
    },

    {
      treeId: 'DT-17',
      disruptionType: 'Political Unrest',
      authority: 'Government restriction / conflict zone = EC',
      priority: 20,
      ecGateId: 'DT17-G1',
      matches: function (t) {
        return /\btravel ban|\bairspace closure|\bpolitical|\bgovernment\b|\bwar zone|\bdrone\b|\buas\b|\bcovid|\bpandemic\b/i.test(t || '');
      },
      gates: [
        {
          id: 'DT17-G1', name: 'Government / political restriction', type: 'entry',
          question: 'Was disruption caused by government, conflict, or authority-mandated airspace closure?',
          iccPattern: /\btravel ban|\bairspace closure|\bpolitical|\bgovernment|\bdrone\b|\bcovid\b/i,
          requiredLibKeys: ['notam', 'tops'],
          conclusionIds: ['U7_EC_ESTABLISHED', 'U7_LIMB2_CONTROL'],
          yesMeans: 'Government/political EC candidate.',
          onYes: 'DT17-G2', onNo: 'ROUTE_AWAY'
        },
        {
          id: 'DT17-G2', name: 'Authority notice', type: 'confirm',
          question: 'Is NOTAM or government/police notice on file?',
          requiredLibKeys: ['notam', 'tops'],
          onYes: 'DT17-G3', onNo: 'DT17-G3'
        },
        stdMeasures('DT17-G3', 'DT17')
      ]
    },

    {
      treeId: 'DT-18',
      disruptionType: 'Crew Hours / Overnight Delay',
      authority: 'Positioning disruption — apply root cause tree',
      priority: 29,
      matches: function (t) {
        return /\bpositioning\b/i.test(t || '') && !/\b18\s*hour|\bwake rule\b/i.test(t || '');
      },
      gates: [
        {
          id: 'DT18-G1', name: 'Positioning flight disruption', type: 'entry',
          question: 'Was operating crew delayed on a positioning sector?',
          iccPattern: /\bpositioning\b/i,
          requiredLibKeys: ['tops', 'aims'],
          findingTypes: { tops: 'TOPS_POSITIONING_FLIGHT' },
          onYes: 'DT18-G2', onNo: 'ROUTE_AWAY'
        },
        {
          id: 'DT18-G2', name: 'Root cause classification', type: 'confirm',
          question: 'What caused the positioning disruption (apply relevant DT)?',
          iccPattern: /\batc\b|\bweather\b|\btechnical\b|\bfuel leak\b|\baog\b/i,
          conclusion: 'Classify positioning root cause via appropriate disruption tree.',
          onYes: 'EXIT', onNo: 'EXIT'
        }
      ]
    },

    {
      treeId: 'DT-19',
      disruptionType: 'Crew Hours / Overnight Delay',
      authority: 'Intervening cause analysis — but-for test',
      priority: 24,
      matches: function (t) {
        return /\bpositioning\b/i.test(t || '') && /\bout of hours\b|\booh\b|\bftl\b|\bwake rule\b/i.test(t || '');
      },
      gates: [
        {
          id: 'DT19-G1', name: 'Positioning → OOH chain', type: 'entry',
          question: 'Did positioning delay lead to crew out-of-hours?',
          iccPattern: /\bpositioning\b.*\b(out of hours|ooh|ftl)\b|\b(out of hours|ooh|ftl)\b.*\bpositioning\b/i,
          requiredLibKeys: ['aims', 'tops'],
          onYes: 'DT19-G2', onNo: 'ROUTE_AWAY'
        },
        {
          id: 'DT19-G2', name: 'Intervening ordinary event', type: 'judgment',
          question: 'Did an intervening ordinary event break the chain (but-for test)?',
          authority: 'van der Lans intervening cause',
          reason: 'Apply but-for test — if ambiguous, judgment node required.',
          conditions: ['Resolve whether intervening ordinary event breaks EC chain from positioning to OOH.']
        }
      ]
    },

    {
      treeId: 'DT-20',
      disruptionType: 'Crew Hours / Overnight Delay',
      authority: '18-hour wake rule — ALWAYS judgment node',
      priority: 23,
      matches: function (t) {
        if (/\bpositioning\b/i.test(t || '')) return false;
        return /\b18\s*hour|\bwake rule\b/i.test(t || '');
      },
      gates: [
        {
          id: 'DT20-G1', name: '18-hour wake rule', type: 'judgment',
          question: 'Was 18-hour wake rule breach caused by EC timing or carrier recovery delay?',
          authority: 'DT-20 — never resolve automatically',
          requiredLibKeys: ['aims'],
          reason: 'Present FDP/rest audit: rest start, replacement required time, 18hr gap, EC vs carrier timing.',
          conditions: [
            'Obtain Crew scheduling system FDP and rest audit before resolving.',
            'If carrier delayed replacement crew sourcing → reasonable measures failure.'
          ]
        }
      ]
    }
  ];

  DEFINITIONS.sort(function (a, b) { return (a.priority || 99) - (b.priority || 99); });

  function getDefinition(treeId) {
    return DEFINITIONS.find(function (d) { return d.treeId === treeId; });
  }

  function resolvePrimary(iccText, causalChain) {
    var t = iccText || '';
    var chain = causalChain || [];
    for (var i = 0; i < DEFINITIONS.length; i++) {
      var def = DEFINITIONS[i];
      if (def.matches && def.matches(t, chain)) {
        return {
          treeId: def.treeId,
          disruptionType: def.disruptionType,
          definition: def
        };
      }
    }
    return null;
  }

  function resolveSecondary(iccText, causalChain, primaryTreeId) {
    var secondary = [];
    var t = iccText || '';
    if (primaryTreeId !== 'DT-06' && /\bftl\b|\bout of hours\b/i.test(t)) {
      secondary.push('DT-06');
    }
    if (primaryTreeId !== 'DT-20' && /\b18\s*hour|\bwake rule\b/i.test(t)) {
      secondary.push('DT-20');
    }
    if (primaryTreeId !== 'DT-13' && /\blate inbound|\bcascade\b/i.test(t) && primaryTreeId !== 'DT-06') {
      secondary.push('DT-13');
    }
    return secondary.filter(function (id, idx, arr) { return arr.indexOf(id) === idx; });
  }

  function runTree(treeId, ctx, force) {
    var def = getDefinition(treeId);
    if (!def) return { treeId: treeId, applicable: false, gates: [], evidencePack: [], exit: null };
    if (!E) return { treeId: treeId, applicable: false, gates: [], evidencePack: [], exit: null };
    if (!force && def.matches && !def.matches(ctx.iccText, ctx.causalChain)) {
      return { treeId: treeId, applicable: false, gates: [], evidencePack: [], exit: null };
    }
    return E.runDefinition(def, ctx, force);
  }

  function runAllApplicable(ctx) {
    var results = [];
    var primary = resolvePrimary(ctx.iccText, ctx.causalChain);
    if (primary) {
      results.push(runTree(primary.treeId, ctx));
      var secondary = resolveSecondary(ctx.iccText, ctx.causalChain, primary.treeId);
      secondary.forEach(function (sid) {
        var sec = runTree(sid, ctx, true);
        if (sec.applicable) results.push(sec);
      });
    }
    return results;
  }

  function getDisruptionTypeForIcc(iccText) {
    var resolved = resolvePrimary(iccText, []);
    return resolved ? resolved.disruptionType : null;
  }

  return {
    DEFINITIONS: DEFINITIONS,
    getDefinition: getDefinition,
    resolvePrimary: resolvePrimary,
    resolveSecondary: resolveSecondary,
    runTree: runTree,
    runAllApplicable: runAllApplicable,
    getDisruptionTypeForIcc: getDisruptionTypeForIcc
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DefendAbleTrees;
}
