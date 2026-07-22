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
    wrapCustom('DT-01', 'ATC Restrictions', 'Pešková C-315/15; Wallentin-Hermann C-549/07; Moens C-159/18', 50,
      function (t, c) { return typeof DefendAbleTreeDT01 !== 'undefined' && DefendAbleTreeDT01.matches(t, c); },
      function (ctx, force) { return DefendAbleTreeDT01.runTree(ctx, { force: !!force }); }),
    wrapCustom('DT-02', 'Weather', 'Pešková; Wallentin-Hermann; Blanche v EasyJet', 40,
      function (t, c) { return typeof DefendAbleTreeDT02 !== 'undefined' && DefendAbleTreeDT02.matches(t, c); },
      function (ctx, force) {
        if (typeof DefendAbleTreeDT02.runTree.length >= 1) {
          return DefendAbleTreeDT02.runTree(ctx, { force: !!force });
        }
        return DefendAbleTreeDT02.runTree(ctx);
      }),

    {
      treeId: 'DT-03',
      disruptionType: 'Airport/Runway Closure',
      authority: 'Pešková; established weather/airport closure EC',
      priority: 35,
      ecGateId: 'DT3-G1',
      matches: function (t, c) {
        if (typeof DefendAbleTreeDT02 !== 'undefined' && DefendAbleTreeDT02.isWeatherOriginOnly(t)) return true;
        return /\blvp\b|\bsnowtam|\brunway closure|\bde-ic|\borigin weather\b/i.test(t || '')
          && !/\bdiversion\b|\bbelow minima\b|\bthunderstorms?\b|\barrival destination\b/i.test(t || '');
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
      authority: 'Pešková C-315/15 — birdstrike per se EC; post-strike delay dissected node-by-node',
      priority: 5,
      ecGateId: 'DT4-G1',
      matches: function (t) { return /\bbirdstrike|\bbird strike|\bingestion\b/i.test(t || ''); },
      gates: [
        {
          id: 'DT4-G1', name: 'Birdstrike event', type: 'entry',
          question: 'Did a birdstrike or engine ingestion event occur?',
          authority: 'Pešková — per se extraordinary (regardless of damage)',
          iccPattern: /\bbirdstrike|\bbird strike|\bingestion\b/i,
          requiredLibKeys: ['amos', 'tops', 'safetynet'],
          findingTypes: { tops: 'AMOS_BIRDSTRIKE' },
          conclusionIds: ['DT4_BIRDSTRIKE_EC', 'U7_EC_ESTABLISHED'],
          yesMeans: 'Birdstrike EC established — both Wallentin-Hermann limbs satisfied on the collision itself.',
          onYes: 'DT4-G2', onNo: 'ROUTE_AWAY'
        },
        {
          id: 'DT4-G2', name: 'Mandatory inspection', type: 'confirm',
          question: 'Was mandatory AMOS/EASA inspection completed and documented within programme scope?',
          authority: 'Pešková — mandatory inspection is a reasonable measure; its required duration does not negate EC',
          requiredLibKeys: ['amos', 'tops'],
          findingTypes: { amos: 'AMOS_NO_PRIOR_DEFECT' },
          onYes: 'DT4-G3', onNo: 'DT4-G3'
        },
        {
          id: 'DT4-G3', name: 'Post-strike delay dissection', type: 'confirm',
          question: 'Is any additional delay after the first inspection (second technician wait, extended grounding) separately justified as unavoidable?',
          authority: 'Pešková secondary holding — post-strike waiting for a second technician is a NEW event not automatically covered by EC',
          iccPattern: /\bsecond technician|\badditional delay|\bpost-strike|\bextended grounding|\bwaited for engineer\b/i,
          conclusionIds: ['U8_RM_SLOT_RECOVERY'],
          yesMeans: 'Post-strike timeline elements documented as unavoidable RM steps.',
          noMeans: 'Excess post-strike delay may defeat Art 5(3) even though the strike itself was EC.',
          onYes: 'DT4-G4', onNo: 'DT4-G4', onUnknown: 'DT4-G4'
        },
        stdMeasures('DT4-G4', 'DT4')
      ]
    },

    {
      treeId: 'DT-05',
      disruptionType: 'Technical Issues',
      authority: 'van der Lans C-257/14; Jet2 v Huzar; Wallentin-Hermann — ordinary technical fault NOT EC; lightning C-399/24 may be external EC',
      priority: 12,
      ecGateId: 'DT5-G2',
      matches: function (t) {
        if (/\bpositioning\b/i.test(t || '')) return false;
        if (/\bhidden defect|\bmanufacturing defect|\bno prior ad\b/i.test(t || '')) return false;
        return /\bhydraulic|\btechnical fault|\baog\b|\bdefect\b|\bmel\b|\bcategory a\b|\blightning\b/i.test(t || '');
      },
      gates: [
        {
          id: 'DT5-G1', name: 'Technical fault identified', type: 'entry',
          question: 'Was an aircraft technical fault the stated cause of disruption?',
          iccPattern: /\bhydraulic|\btechnical|\baog\b|\bdefect\b|\bmel\b|\blightning\b/i,
          requiredLibKeys: ['amos', 'tops'],
          onYes: 'DT5-G2', onNo: 'ROUTE_AWAY'
        },
        {
          id: 'DT5-G2', name: 'Ordinary technical (van der Lans)', type: 'concede',
          question: 'Is this an ordinary / premature component fault (not external event, not OEM/AD hidden design defect)?',
          authority: 'van der Lans / Huzar — routine and even undetectable ordinary faults NOT EC',
          conditional: function (ctx) {
            var t = ctx.iccText || '';
            // Skip concede when lightning / ground damage / birdstrike / hidden OEM defect indicated
            if (/\blightning\b|\bground damage\b|\bbirdstrike\b|\bhidden (design |manufacturing )?defect\b|\beasa\b.*\bad\b|\boem\b/i.test(t)) {
              return false;
            }
            return /\bhydraulic|\btechnical|\baog\b|\bdefect\b|\bmel\b|\bcategory a\b|\bcomponent failure\b/i.test(t);
          },
          conclusion: 'Ordinary technical fault — concede EC on technical point (Wallentin / van der Lans / Huzar).',
          conditions: ['Concede EC if ordinary technical fault — assess quantum and passenger rights.', 'Art 9 care remains owed (McDonagh).'],
          onSkip: 'DT5-G2b', onNA: 'DT5-G2b'
        },
        {
          id: 'DT5-G2b', name: 'Technical fault scope', type: 'confirm',
          question: 'Is an aircraft technical fault or lightning/external technical event the stated cause?',
          iccPattern: /\bhydraulic|\btechnical|\baog\b|\bdefect\b|\blightning\b/i,
          requiredLibKeys: ['amos', 'tops'],
          onYes: 'DT5-G3', onNo: 'ROUTE_AWAY'
        },
        {
          id: 'DT5-G3', name: 'External technical cause', type: 'confirm',
          question: 'Was fault caused by external event (lightning, ground damage, birdstrike) or confirmed OEM/AD hidden defect?',
          authority: 'C-399/24 lightning; Pešková birdstrike; Matkustaja/Finnair hidden defect',
          iccPattern: /\blightning|\bground damage|\bbirdstrike|\bhidden (design |manufacturing )?defect\b|\beasa\b|\boem\b/i,
          conclusionIds: ['U7_EC_ESTABLISHED'],
          yesMeans: 'External/hidden-defect technical path — EC candidate; RM still required.',
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
        // Negation guard: "within hours / did not need replacing" must NOT activate crew tree
        if (typeof DefendAbleTreeEngine !== 'undefined' && DefendAbleTreeEngine.crewExpresslyExcluded(t)) {
          return false;
        }
        if (typeof DefendAbleTreeEngine !== 'undefined') {
          return DefendAbleTreeEngine.crewIssueAsserted(t);
        }
        return /\bftl\b|\bout of hours\b|\bcrew.*limit|\bcrew hours\b/i.test(t || '')
          || /\bcrew illness|\bpilot sick|\bcaptain sick|\bcrew sick\b/i.test(t || '');
      },
      gates: [
        {
          id: 'DT6-G1', name: 'Crew illness (Lipton)', type: 'concede',
          question: 'Is crew illness/sickness the root cause?',
          authority: 'Lipton v BA Cityflyer [2024] UKSC 24',
          conditional: function (ctx) { return /\bcrew illness|\bpilot sick|\bcaptain\s+(?:went\s+)?sick|\bcrew sick|\bwent sick\b/i.test(ctx.iccText || ''); },
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
          iccPattern: /\batc\b|\bweather\b|\bthunderstorms?\b|\bctot\b|\bmedical\b|\bsecurity\b/i,
          yesMeans: 'FTL consequence of EC root — apply upstream disruption tree.',
          onYes: 'EXIT', onNo: 'EXIT'
        }
      ]
    },

    {
      treeId: 'DT-07',
      disruptionType: 'Industrial Action',
      authority: 'Krüsemann C-195/17; Airhelp v Swiss C-28/20 — own-staff NOT EC; third-party may be EC',
      priority: 15,
      ecGateId: 'DT7-G2',
      matches: function (t) {
        return /\bindustrial action|\bstrike\b/i.test(t || '');
      },
      gates: [
        {
          id: 'DT7-G1', name: 'Own-staff strike', type: 'concede',
          question: 'Is this carrier own-staff industrial action?',
          authority: 'Krüsemann C-195/17; Airhelp v Swiss C-28/20 — own-staff strike NOT EC (lawful or wildcat)',
          conditional: function (ctx) {
            return /\bown\b[\s\S]{0,40}\bstrike|\bpilot union|\bown pilot|\bown staff strike|\bpilot staff participating|\bown (cabin |ground )?staff\b[\s\S]{0,30}\bstrike\b/i.test(ctx.iccText || '')
              && !/\batc industrial|\bthird.party|\bhandler\b|\bairport strike|\bansp\b/i.test(ctx.iccText || '');
          },
          conclusion: 'Own-staff strike — concede immediately (Krüsemann / Airhelp C-28/20).',
          conditions: ['Concede — own-staff industrial action is not EC.', 'Art 9 care remains owed (McDonagh).']
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
      authority: 'Passenger illness/medical diversion is NOT EC (persuasive: DDJ Linwood, England, 2020) — narrow judgment-node exception only for a genuine flight-safety/security dimension',
      priority: 8,
      matches: function (t) {
        return /\bmedical|\bcardiac|\bwelfare incident|\bpassenger welfare|\bmedical emergency\b/i.test(t || '');
      },
      gates: [
        {
          id: 'DT9-G1', name: 'Medical/welfare event identified', type: 'entry',
          question: 'Did a passenger medical or welfare event occur requiring carrier response?',
          iccPattern: /\bmedical|\bcardiac|\bwelfare\b/i,
          requiredLibKeys: ['safetynet', 'tops'],
          onYes: 'DT9-G2', onNo: 'ROUTE_AWAY'
        },
        {
          id: 'DT9-G2', name: 'Beyond ordinary passenger welfare', type: 'confirm',
          question: 'Does the event go beyond ordinary passenger illness into a genuine flight-safety or security dimension (risk to aircraft/crew, contagion risk, security-flagged incident)?',
          iccPattern: /\bsecurity risk|\bcontagious|\binfectious|\bbiohazard|\bcrew safety|\baircraft safety|\bpublic health\b/i,
          onYes: 'DT9-G3', onNo: 'DT9-G4'
        },
        {
          id: 'DT9-G3', name: 'Flight-safety/security judgment', type: 'judgment',
          question: 'Does the flight-safety/security dimension of this medical event support an EC defence, distinct from ordinary passenger illness?',
          authority: 'No settled authority extends ordinary-passenger-illness reasoning to a genuinely distinct safety/security-driven response — requires case-specific judgment.',
          reason: 'Facts go beyond ordinary passenger welfare — resolve before asserting EC.',
          conditions: ['Confirm the precise safety/security trigger and whether it is genuinely distinct from ordinary passenger illness before running this as an EC defence.']
        },
        {
          id: 'DT9-G4', name: 'Ordinary passenger illness — concede', type: 'concede',
          authority: 'Persuasive: DDJ Linwood, England, 2020 (first-instance, unreported) — passenger illness is inherent in carrying passengers, same reasoning as Lipton v BA Cityflyer [2024] UKSC 24 for crew illness',
          reason: 'Ordinary passenger illness/medical diversion is not extraordinary circumstances.',
          conclusion: 'Passenger medical emergency/diversion is NOT extraordinary circumstances — concede EC; passenger illness is inherent in carrying passengers.',
          conditions: ['Concede EC on passenger medical emergency — assess quantum, Art 8 rerouting, and Art 9 care only.']
        }
      ]
    },

    {
      treeId: 'DT-10',
      disruptionType: 'Disruptive Passenger',
      authority: 'LE v TAP Air Portugal C-74/19 — sudden in-flight behaviour grave enough to force diversion is EC; behaviour known before boarding and allowed aboard anyway is not (within carrier control)',
      priority: 16,
      ecGateId: 'DT10-G4',
      matches: function (t) {
        return /\bdisruptive|\bunruly|\breturned to gate|\bthreatening behaviour\b/i.test(t || '');
      },
      gates: [
        {
          id: 'DT10-G1', name: 'Disruptive passenger identified', type: 'entry',
          question: 'Did disruptive/unruly passenger behaviour cause the delay?',
          iccPattern: /\bdisruptive|\bunruly|\bthreatening behaviour\b/i,
          requiredLibKeys: ['safetynet', 'tops'],
          onYes: 'DT10-G2', onNo: 'ROUTE_AWAY'
        },
        {
          id: 'DT10-G2', name: 'Known before boarding', type: 'confirm',
          question: 'Was the disruptive behaviour apparent before boarding, with the carrier allowing the passenger aboard regardless?',
          authority: 'LE v TAP Air Portugal C-74/19 — behaviour within the carrier\'s knowledge before boarding is not EC',
          iccPattern: /\bknown before boarding|\bapparent at check.?in|\bboarded (despite|regardless)|\balready (intoxicated|aggressive) at (the )?gate\b/i,
          onYes: 'DT10-G3', onNo: 'DT10-G4'
        },
        {
          id: 'DT10-G3', name: 'Known-risk boarding — concede', type: 'concede',
          authority: 'LE v TAP Air Portugal C-74/19',
          reason: 'Behaviour known/apparent before boarding and passenger let on anyway — within carrier\'s control.',
          conclusion: 'Disruptive behaviour known before boarding is NOT extraordinary circumstances — concede EC.',
          conditions: ['Concede EC — carrier had the opportunity to prevent this by refusing boarding. Assess quantum, Art 8, Art 9 only.']
        },
        {
          id: 'DT10-G4', name: 'Sudden in-flight escalation', type: 'confirm',
          question: 'Was the behaviour sudden, in-flight, and grave enough to justify the pilot diverting or returning to gate?',
          authority: 'LE v TAP Air Portugal C-74/19',
          iccPattern: /\bthreatening behaviour|\bassault|\bviolent|\breturned to gate|\bdiverted\b/i,
          conclusionIds: ['DT10_DISRUPTIVE_EC', 'U7_EC_ESTABLISHED'],
          yesMeans: 'Sudden in-flight escalation grave enough to justify diversion — EC established.',
          onYes: 'DT10-G5', onNo: 'ROUTE_AWAY'
        },
        {
          id: 'DT10-G5', name: 'Police / offload', type: 'confirm',
          question: 'Was police attendance and passenger/baggage offload documented?',
          requiredLibKeys: ['tops', 'safetynet'],
          findingTypes: { tops: 'POLICE_EXTERNAL_AUTHORITY' },
          iccPattern: /\bpolice|\boffload|\breconciliation\b/i,
          onYes: 'DT10-G6', onNo: 'DT10-G6'
        },
        stdMeasures('DT10-G6', 'DT10')
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
      disruptionType: 'Cascade / Late Inbound Rotation',
      authority: 'Cascade NOT EC — root cause at rotation start',
      priority: 9,
      ecGateId: 'DT13-G2',
      matches: function (t) {
        // Do not treat "return sector" alone as cascade; require explicit cascade language
        return /\bcascade|\blate inbound|\bknock-?on|\bprior sector|\btail line of flying|\brotation delay\b/i.test(t || '');
      },
      gates: [
        {
          id: 'DT13-G1', name: 'Cascade identified', type: 'entry',
          question: 'Is this a cascading rotation / late inbound disruption?',
          iccPattern: /\blate inbound|\bcascade|\bknock-?on|\bprior sector|\brotation delay\b/i,
          requiredLibKeys: ['tops'],
          conclusionIds: ['DT13_CASCADE_ROOT'],
          onYes: 'DT13-G2', onNo: 'ROUTE_AWAY', allowTopsFallback: true
        },
        {
          id: 'DT13-G2', name: 'Full rotation on file', type: 'confirm',
          question: 'Is the full tail line of flying obtained to identify root cause?',
          requiredLibKeys: ['tops'],
          findingTypes: { tops: 'TOPS_PRIOR_SECTOR_DELAY' },
          yesMeans: 'Root cause analysis possible — apply tree for upstream event.',
          unknownMeans: 'Rotation record pending — not an adverse finding.',
          onYes: 'DT13-G3', onNo: 'DT13-G3', onUnknown: 'DT13-G3'
        },
        {
          id: 'DT13-G3', name: 'Root cause tree routing', type: 'confirm',
          question: 'Has root cause at rotation start been classified (weather, ATC, technical)?',
          iccPattern: /\bweather\b|\batc\b|\btechnical\b|\bctot\b|\bthunderstorms?\b/i,
          conclusion: 'Apply appropriate disruption tree to root cause — cascade itself is not EC.',
          onYes: 'DT13-G4', onNo: 'DT13-G4'
        },
        {
          id: 'DT13-G4', name: 'Causal chain integrity', type: 'confirm',
          question: 'Did a voluntary carrier decision (e.g. waiting for delayed passengers) break the causal chain from the root EC?',
          authority: 'NI, HZ v European Air Charter T-656/24 (March 2026) — also cited as T-134/25 in industry notes',
          iccPattern: /\bvoluntar|\bchose to wait|\bwaited for (delayed )?passengers|\bcommercial decision\b/i,
          yesMeans: 'Chain-break risk — Art 5(3) may fail on this rotation despite upstream EC.',
          noMeans: 'No voluntary chain-break language detected — maintain root-cause tree analysis.',
          onYes: 'EXIT', onNo: 'EXIT', onUnknown: 'EXIT'
        }
      ]
    },

    {
      treeId: 'DT-14',
      disruptionType: 'Technical Issues',
      authority: 'Matkustaja v Finnair C-385/23; Germanwings v Pauels C-501/17',
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
    var crewAsserted = typeof DefendAbleTreeEngine !== 'undefined'
      ? DefendAbleTreeEngine.crewIssueAsserted(t)
      : /\bftl\b|\bout of hours\b/i.test(t);
    if (primaryTreeId !== 'DT-06' && crewAsserted) {
      secondary.push('DT-06');
    }
    if (primaryTreeId !== 'DT-20' && /\b18\s*hour|\bwake rule\b/i.test(t)) {
      secondary.push('DT-20');
    }
    if (primaryTreeId !== 'DT-13' && /\blate inbound|\bcascade\b|\bknock-?on\b/i.test(t) && primaryTreeId !== 'DT-06') {
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
