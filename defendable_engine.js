/* DefendAble Intelligence Engine — client-side demo + optional live AI */
var DefendAbleEngine = (function () {
  var KEYWORD_RULES = [
    { re: /\bctot\b|\batfm\b|\batc restriction|\bnetwork wide\b|\beurocontrol\b/i, phrase: 'ATC/ATFM restriction', tree: 'DT-1: ATC/ATFM', triggers: [
      { system: 'EUROCONTROL-NM-API', document: 'ATFM regulations & CTOT assignment log', purpose: 'Confirm third-party flow control imposed delay — both Wallentin-Hermann limbs' },
      { system: 'TOPS', document: 'Delay record — codes 81–89', purpose: 'Operational corroboration of ATC delay classification' },
      { system: 'NOTAM-feed', document: 'Active NOTAMs for sector restrictions', purpose: 'External imposition beyond carrier control' }
    ]},
    { re: /\bcurfew\b|\bond\b|\bovernight delay\b|\bnext day\b/i, phrase: 'Airport curfew / overnight (OND)', tree: 'DT-1: ATC/ATFM — Curfew breach', triggers: [
      { system: 'TOPS', document: 'Full delay timeline — scheduled vs actual next-day arrival', purpose: 'Sturgeon delay measurement for overnight recovery' },
      { system: 'Ground-handler-records', document: 'HOTAC & catering records', purpose: 'Art 9 duty of care compliance for overnight delay' },
      { system: 'MAX-OPS', document: 'Art 8 rerouting/reimbursement offer records', purpose: 'Confirm passenger rights offer once delay exceeded 5 hours' }
    ]},
    { re: /\bthunderstorm|\bweather|\bdiversion|\bbelow minima|\bsigmet|\bmetar|\blvp\b|\bde-ic/i, phrase: 'Weather disruption', tree: 'DT-2: Weather — Destination', triggers: [
      { system: 'Ogimet-API', document: 'METAR/TAF/SIGMET — destination, origin & diversion airports', purpose: 'Objective weather below operating minima at arrival' },
      { system: 'TOPS', document: 'Diversion record & ATC mandatory diversion instruction', purpose: 'Limb 2 — externally imposed diversion' },
      { system: 'Flightradar24-API', document: 'Diversion track confirmation', purpose: 'Corroborate actual flight path and diversion airport' }
    ]},
    { re: /\bbirdstrike|\bbird strike|\bingestion\b/i, phrase: 'Birdstrike', tree: 'DT-4: Birdstrike', triggers: [
      { system: 'AMOS', document: 'Mandatory post-strike inspection record', purpose: 'Primary evidence — without it claim is unsubstantiated' },
      { system: 'SafetyNet', document: 'Birdstrike safety report', purpose: 'Mandatory safety event record' },
      { system: 'Airport-wildlife-authority', document: 'Wildlife strike confirmation', purpose: 'Third-party corroboration of extraordinary event' }
    ]},
    { re: /\bindustrial action|\bstrike\b|\bnotam.*strike|\bunion\b/i, phrase: 'Industrial action', tree: 'DT-7: Industrial Action', triggers: [
      { system: 'DISCO', document: 'Disruption classification — own staff vs third party', purpose: 'Krüsemann: own staff strike is NOT EC' },
      { system: 'NOTAM-feed', document: 'Published authority/ATC strike notice', purpose: 'Confirm third-party industrial action (Pešková)' },
      { system: 'TOPS', document: 'Network delay record', purpose: 'Operational impact across affected sectors' }
    ]},
    { re: /\bcascade|\brotation|\binbound aircraft|\bftl\b|\bstandby crew\b|\bduty limit/i, phrase: 'Cascading / crew FTL', tree: 'DT-6: Crew & FTL / DT-13: Cascading', triggers: [
      { system: 'TOPS', document: 'Full tail line of flying — all sectors', purpose: 'Root cause at start of rotation chain — cascade itself is NOT EC' },
      { system: 'AIMS', document: 'FDP record & standby crew log', purpose: 'FTL exhaustion and reasonable measures on standby deployment' },
      { system: 'DISCO', document: 'Root cause classification', purpose: 'Identify whether weather/ATC at origin caused cascade' }
    ]},
    { re: /\bhidden defect|\bmanufacturing defect|\bcategory a|\bmel dispatch not|\bno prior ad\b|\bhydraulic fault|\btechnical fault|\baog\b/i, phrase: 'Technical / hidden defect', tree: 'DT-5/DT-14: Technical & Hidden Defect', triggers: [
      { system: 'AMOS', document: 'Defect log, MEL assessment & full maintenance history', purpose: 'Van der Lans — routine vs hidden defect; MEL dispatch critical node' },
      { system: 'OEM-records', document: 'AD/SB history & post-event bulletins', purpose: 'Germanwings/LE v TAP — unknown failure mode evidence' },
      { system: 'SafetyNet', document: 'Technical incident report', purpose: 'Mandatory safety record for technical AOG' }
    ]},
    { re: /\bmedical|\bcardiac|\bpassenger welfare|\bdiverted.*welfare/i, phrase: 'Medical emergency', tree: 'DT-9: Medical Emergency', triggers: [
      { system: 'SafetyNet', document: 'Medical diversion / welfare incident report', purpose: 'Primary evidence — carrier legally obliged to respond' },
      { system: 'TOPS', document: 'Line of flying & diversion record', purpose: 'Document causal chain if prior sector medical cascade' },
      { system: 'Ground-handler-records', document: 'Medical handling & disembarkation log', purpose: 'Reasonable measures — delay beyond necessary disembarkation' }
    ]},
    { re: /\bsecurity alert|\bsuspicious item|\bre-screening|\bhold search|\bpolice attended/i, phrase: 'Security alert', tree: 'DT-8: Security', triggers: [
      { system: 'SafetyNet', document: 'Security event report', purpose: 'Mandatory record of authority-initiated security action' },
      { system: 'TOPS', document: 'Delay codes 91–96', purpose: 'Security delay classification' },
      { system: 'Ground-handler-records', document: 'Baggage reconciliation & security search log', purpose: 'Mandatory post-offload security compliance' }
    ]},
    { re: /\bdisruptive passenger|\breturned to gate|\boffloaded|\bthreatening behaviour/i, phrase: 'Disruptive passenger', tree: 'DT-10: Disruptive Passenger', triggers: [
      { system: 'SafetyNet', document: 'Disruptive passenger incident report', purpose: 'Primary evidence — external behaviour = EC' },
      { system: 'TOPS', document: 'Return-to-gate & delay record', purpose: 'Operational timeline and delay measurement' },
      { system: 'Ground-handler-records', document: 'Police attendance & baggage reconciliation', purpose: 'Corroborate offload and mandatory security steps' }
    ]},
    { re: /\bvolcanic|\bearthquake|\bflood|\bhurricane|\bnatural disaster|\bsigmet.*va\b/i, phrase: 'Natural disaster', tree: 'DT-11: Natural Disaster', triggers: [
      { system: 'NOTAM-feed', document: 'Government/meteorological notices', purpose: 'External event beyond carrier control' },
      { system: 'SIGMET-feed', document: 'SIGMET VA / weather warning', purpose: 'Volcanic ash or severe weather corroboration' },
      { system: 'Met-Office', document: 'Official weather/disaster bulletin', purpose: 'Foreseeability and duration analysis' }
    ]},
    { re: /\bnats\b.*\boutage|\beurocontrol.*\boutage|\batm system|\bnetwork failure/i, phrase: 'ATM system failure', tree: 'DT-12: ATM System Failure', triggers: [
      { system: 'NOTAM-feed', document: 'NATS/Eurocontrol outage notice', purpose: 'Third-party infrastructure failure' },
      { system: 'FlightStats-API', document: 'Cross-carrier delay corroboration', purpose: 'Network-wide impact confirms external cause' }
    ]},
    { re: /\btravel ban|\bairspace closure|\bpolitical|\bgovernment.*restrict|\bwar zone/i, phrase: 'Government / political restriction', tree: 'DT-14: Political Instability', triggers: [
      { system: 'NOTAM-feed', document: 'Airspace closure / travel ban NOTAM', purpose: 'Government-imposed restriction' },
      { system: 'DISCO', document: 'Disruption classification', purpose: 'External imposition documentation' }
    ]},
    { re: /\bdrone\b|\buas\b|\bairspace closure.*drone/i, phrase: 'Drone incursion', tree: 'DT-15: Drone Incursion', triggers: [
      { system: 'NOTAM-feed', document: 'Drone-related airspace closure', purpose: 'Authority-mandated closure = EC' },
      { system: 'SafetyNet', document: 'Operational safety report', purpose: 'Event documentation' }
    ]},
    { re: /\bcovid|\bpandemic|\bquarantine|\btravel restriction/i, phrase: 'COVID / pandemic restriction', tree: 'DT-16: Pandemic Restrictions', triggers: [
      { system: 'NOTAM-feed', document: 'Government health/travel restrictions', purpose: 'Externally imposed public health measure' },
      { system: 'HERMES', document: 'Passenger communication records', purpose: 'Art 8/9 compliance during restriction period' }
    ]},
    { re: /\bsabotage|\bterror|\bbomb threat|\bthreat to aircraft/i, phrase: 'Sabotage / terrorism threat', tree: 'DT-17: Sabotage/Terrorism', triggers: [
      { system: 'SafetyNet', document: 'Security threat report', purpose: 'External security event = EC' },
      { system: 'TOPS', document: 'Delay/cancellation record', purpose: 'Operational timeline' }
    ]},
    { re: /\bcrew illness|\bpilot illness|\bcrew sick|\bcaptain sick/i, phrase: 'Crew illness (NOT EC — Lipton)', tree: 'UL-02: Lipton v BA Cityflyer', triggers: [
      { system: 'AIMS', document: 'Crew roster & sickness record', purpose: 'Lipton [2024] UKSC 24 — crew illness NOT extraordinary circumstances' },
      { system: 'TOPS', document: 'Cancellation/delay record', purpose: 'Document operational impact and rostering adequacy' }
    ]},
    { re: /\bcancel(l)?ed|\bdenied boarding|\bdowngrad|\bearly depart|\bschedule change/i, phrase: 'Claim type indicator', tree: 'Claim heads scan', triggers: [
      { system: 'HERMES', document: 'Booking & notification records', purpose: 'Cancellation notice period, class booked, check-in status' },
      { system: 'MAX-OPS', document: 'Art 8 offer & passenger communications', purpose: 'Rerouting/reimbursement compliance' }
    ]},
    { re: /\bltn\b|\blgw\b|\bman\b|\bbcn\b|\bopo\b|\bvlc\b|\bezy\d+/i, phrase: 'Route / flight reference', tree: 'Universal: Jurisdiction & quantum', triggers: [
      { system: 'HERMES', document: 'PNR & booking records', purpose: 'Standing, check-in compliance, compensation band distance' },
      { system: 'TOPS', document: 'Flight details — route, distance, scheduled times', purpose: 'Art 7 band calculation & delay threshold' }
    ]}
  ];

  var UNIVERSAL_BASE = [
    { id: 'U-1', type: 'universal', question: 'Does UK261 or EC261 apply — and which limitation period governs?', status: 'green', statusLabel: 'CONFIRMED', conclusion: 'UK departure or UK/EU carrier inbound to UK engages UK261. EU departure engages EC261. Limitation: England & Wales 6 years; Montreal Art 29 two-year bar runs concurrently — check both.', authority: 'UK261 Reg 4; EC261 Art 2; Montreal Convention Art 29', dataUsed: 'Route parsing from ICC summary + HERMES booking data' },
    { id: 'U-5', type: 'universal', question: 'Does delay at arrival exceed 3 hours (Sturgeon threshold)?', status: 'green', statusLabel: 'CONFIRMED', conclusion: 'Delay measured at arrival — doors open, passengers can disembark. Overnight/next-day operation: scheduled arrival to actual next-day arrival.', authority: 'Sturgeon v Condor (C-402/07); Folkerts v Air France (C-11/11)', dataUsed: 'TOPS scheduled vs actual arrival times' },
    { id: 'U-7', type: 'universal', question: 'Extraordinary circumstances — Wallentin-Hermann two-limb test satisfied?', status: 'green', statusLabel: 'BOTH LIMBS MET', conclusion: 'Limb 1: circumstance not inherent in normal carrier activity. Limb 2: beyond carrier actual control. Both required — failure of either defeats defence.', authority: 'Wallentin-Hermann v Alitalia (C-549/07)', dataUsed: 'Disruption tree analysis + third-party evidence' },
    { id: 'U-8', type: 'universal', question: 'Did carrier take all reasonable measures to avoid/minimise delay?', status: 'amber', statusLabel: 'VERIFY', conclusion: 'Even with valid EC, carrier must demonstrate standby aircraft/crew considered, slot recovery attempted, rerouting evaluated. Failure here defeats defence entirely.', authority: 'Wallentin-Hermann; CJEU reasonable measures jurisprudence', dataUsed: 'AIMS standby log; TOPS fleet state; recovery analysis' },
    { id: 'U-9', type: 'universal', question: 'Art 8 — rerouting/reimbursement offered for 5+ hour delay?', status: 'amber', statusLabel: 'PULL RECORDS', conclusion: 'For delays expected to reach 5+ hours, carrier must offer reimbursement, earliest rerouting, or later-date rerouting. Flag if no evidenced offer.', authority: 'EC261 Art 8; UK261 equivalent', dataUsed: 'MAX-OPS passenger communication records' },
    { id: 'U-10', type: 'universal', question: 'Art 9 duty of care — meals, comms, hotel if overnight?', status: 'amber', statusLabel: 'ACTION REQUIRED', conclusion: 'Applies to ALL 2+ hour delays regardless of EC. Overnight = hotel mandatory. Pull ground handler catering and HOTAC records.', authority: 'EC261 Art 9', dataUsed: 'Ground-handler-records — catering & HOTAC' },
    { id: 'U-16', type: 'universal', question: 'Settle vs defend — litigation economics and evidence completeness?', status: 'info', statusLabel: 'STRATEGY', conclusion: 'Defend where EC clean and evidence complete. Settle where gaps or cost exceeds value. Document any concession rationale.', authority: 'Internal triage policy; CPR Part 36 for claims over £10,000', dataUsed: 'Evidence pack completeness + claim quantum' }
  ];

  var SCENARIOS = {
    atc: {
      match: /ctot|atc restriction|network wide|curfew|ond/i,
      result: {
        keywords: [
          { phrase: 'ATC restrictions network wide', tree: 'DT-1: ATC/ATFM', triggers: KEYWORD_RULES[0].triggers },
          { phrase: 'CTOTs in LTN', tree: 'DT-1: ATC/ATFM', triggers: KEYWORD_RULES[0].triggers },
          { phrase: 'airport curfew was breached and flight OND', tree: 'DT-1: ATC/ATFM — Curfew breach', triggers: KEYWORD_RULES[1].triggers }
        ],
        universalHighlighted: 'Flight was overnight delayed in LTN due to <KW>ATC restrictions network wide</KW>. Flight was delayed by <KW>CTOTs</KW> in LTN until <KW>airport curfew was breached and flight OND</KW>. This was completed the next day on time.',
        nodes: UNIVERSAL_BASE.concat([
          { id: 'DT-1', type: 'disruption', question: 'Eurocontrol CTOT / ATFM restriction — extraordinary circumstances?', status: 'green', statusLabel: 'EC CONFIRMED', conclusion: 'Third-party ATC flow control is per se extraordinary. Pešková confirms ATC restrictions satisfy both Wallentin-Hermann limbs. TOPS delay code 81–89 expected.', authority: 'Pešková (C-315/15); Wallentin-Hermann (C-549/07)', dataUsed: 'Eurocontrol ATFM data; TOPS delay record; NOTAM' },
          { id: 'DT-1b', type: 'secondary', question: 'Curfew breach causing overnight delay — delay measurement and Art 9?', status: 'amber', statusLabel: 'OVERNIGHT — ART 9', conclusion: 'OND is direct consequence of CTOT-driven curfew breach. Delay = scheduled arrival to actual next-day arrival. Hotel accommodation mandatory under Art 9 — pull HOTAC records immediately.', authority: 'Sturgeon v Condor; EC261 Art 9', dataUsed: 'TOPS timeline; Ground-handler HOTAC records' }
        ]),
        evidencePack: [
          { status: 'collected', name: 'Eurocontrol ATFM / CTOT confirmation', source: 'Eurocontrol-NM-API' },
          { status: 'collected', name: 'TOPS delay record — codes 81–89', source: 'TOPS' },
          { status: 'collected', name: 'NOTAM — sector restrictions', source: 'NOTAM-feed' },
          { status: 'flagged', name: 'HOTAC & catering records (Art 9)', source: 'Ground-handler-records' },
          { status: 'flagged', name: 'Art 8 rerouting offer records', source: 'MAX-OPS' }
        ],
        reasoningChain: [
          { status: 'green', text: 'ICC keywords identify third-party ATC/ATFM flow control — Engine A fires Eurocontrol, TOPS, and NOTAM pulls.' },
          { status: 'green', text: 'Wallentin-Hermann both limbs satisfied — ATC restriction not inherent and beyond carrier control.' },
          { status: 'amber', text: 'Overnight curfew breach extends delay measurement to next-day arrival — Art 9 hotel duty triggered.' },
          { status: 'amber', text: 'Reasonable measures and Art 8 offer records must be verified before final defence letter.' }
        ],
        verdict: 'DEFEND',
        verdictSub: 'Strong extraordinary circumstances defence on third-party ATC/ATFM restrictions. Curfew-driven overnight delay is direct consequence of EC event. Pull Art 9 HOTAC and Art 8 offer records before issuing Letter of Response.',
        verdictFlags: [
          { type: 'action', text: 'Pull HOTAC and catering records for overnight delay — Art 9 compliance' },
          { type: 'action', text: 'Confirm Art 8 rerouting/reimbursement offer documented in MAX-OPS' },
          { type: 'note', text: 'Delay quantum: measure from scheduled arrival to actual next-day arrival (Sturgeon)' }
        ]
      }
    },
    wx: {
      match: /thunderstorm|diversion|below minima|valencia|hc 1184/i,
      result: {
        keywords: [
          { phrase: 'Thunderstorms BCN — approach below minima', tree: 'DT-2: Weather — Destination', triggers: KEYWORD_RULES[3].triggers },
          { phrase: 'mandatory ATC diversion Valencia', tree: 'DT-2: Weather — Destination', triggers: KEYWORD_RULES[3].triggers },
          { phrase: 'Standby LTN could not position', tree: 'DT-6: Crew & FTL — Reasonable measures', triggers: KEYWORD_RULES[6].triggers }
        ],
        universalHighlighted: 'HC 1184 LTN–BCN 14/03/26. <KW>Thunderstorms BCN — approach below minima</KW>, <KW>mandatory ATC diversion Valencia</KW>. <KW>Standby LTN could not position</KW> — thunderstorms BCN. Passengers cared for Valencia, coach transfer arranged.',
        nodes: UNIVERSAL_BASE.concat([
          { id: 'DT-2', type: 'disruption', question: 'Destination weather below minima — extraordinary circumstances?', status: 'green', statusLabel: 'EC CONFIRMED', conclusion: 'METAR below ILS minima with mandatory ATC diversion satisfies both limbs. SIGMET is strongest corroboration. Limb 2 satisfied by ATC-imposed diversion instruction.', authority: 'Wallentin-Hermann; Pešková', dataUsed: 'Ogimet METAR/TAF/SIGMET; TOPS diversion record; FR24 track' },
          { id: 'DT-2b', type: 'secondary', question: 'Secondary weather blocking standby aircraft — independent EC?', status: 'green', statusLabel: 'CORROBORATES EC', conclusion: 'Standby at LTN could not position due to same weather system — independently satisfies Wallentin-Hermann and supports reasonable measures defence.', authority: 'Wallentin-Hermann Limb 2', dataUsed: 'TOPS fleet state; Ogimet origin weather' },
          { id: 'U-11', type: 'universal', question: 'Montreal Convention consequential loss exposure?', status: 'red', statusLabel: 'ESCALATE REVIEW', conclusion: 'HC 1184 pattern — check for consequential/commercial loss claims beyond EC261 quantum. Montreal Art 19/22 cap applies separately.', authority: 'Montreal Convention Arts 19, 22, 29', dataUsed: 'Letter of claim review; HERMES correspondence' }
        ]),
        evidencePack: [
          { status: 'collected', name: 'METAR/TAF/SIGMET — BCN, LTN, VLC', source: 'Ogimet-API' },
          { status: 'collected', name: 'TOPS diversion record', source: 'TOPS' },
          { status: 'collected', name: 'SafetyNet diversion report', source: 'SafetyNet' },
          { status: 'collected', name: 'Flightradar24 diversion track', source: 'Flightradar24-API' },
          { status: 'flagged', name: 'Valencia ground handler — Art 9 care records', source: 'Ground-handler-records' }
        ],
        reasoningChain: [
          { status: 'green', text: 'Weather below minima at destination with mandatory ATC diversion — classic EC under DT-2.' },
          { status: 'green', text: 'Secondary weather blocking standby independently corroborates extraordinary circumstances.' },
          { status: 'amber', text: 'Art 9 duty of care at diversion airport — Valencia catering and coach transfer must be evidenced.' },
          { status: 'red', text: 'Screen for Montreal Convention consequential loss — escalate if commercial loss claimed.' }
        ],
        verdict: 'DEFEND',
        verdictSub: 'Clean weather extraordinary circumstances on mandatory diversion. Evidence pack largely complete. Verify Valencia Art 9 records and screen for Montreal consequential loss before finalising response.',
        verdictFlags: [
          { type: 'action', text: 'Pull Valencia ground handler catering, hotel, and coach transfer records' },
          { type: 'risk', text: 'Montreal Convention consequential loss may exceed EC261 quantum — review LOC carefully' }
        ]
      }
    },
    bird: {
      match: /birdstrike|bird strike|engine ingestion|aog.*inspection/i,
      result: {
        keywords: [{ phrase: 'birdstrike on approach', tree: 'DT-4: Birdstrike', triggers: KEYWORD_RULES[4].triggers }, { phrase: 'engine ingestion confirmed', tree: 'DT-4: Birdstrike', triggers: KEYWORD_RULES[4].triggers }, { phrase: 'AOG — mandatory EASA inspection', tree: 'DT-4: Birdstrike', triggers: KEYWORD_RULES[4].triggers }],
        universalHighlighted: 'G-EZAB <KW>birdstrike on approach</KW> MAN. Aircraft AOG — <KW>engine ingestion confirmed</KW>, <KW>mandatory EASA inspection</KW> required. Replacement aircraft unavailable. Flight cancelled.',
        nodes: UNIVERSAL_BASE.concat([{ id: 'DT-4', type: 'disruption', question: 'Birdstrike — per se extraordinary circumstances?', status: 'green', statusLabel: 'EC CONFIRMED', conclusion: 'Pešková: birdstrike is per se EC — both Wallentin-Hermann limbs automatically satisfied. AMOS inspection record is primary evidence; without it the claim is unsubstantiated from our side too.', authority: 'Pešková (C-315/15)', dataUsed: 'AMOS inspection; SafetyNet; TOPS cancellation record' }]),
        evidencePack: [{ status: 'collected', name: 'AMOS post-strike inspection record', source: 'AMOS' }, { status: 'collected', name: 'SafetyNet birdstrike report', source: 'SafetyNet' }, { status: 'collected', name: 'TOPS cancellation & AOG record', source: 'TOPS' }, { status: 'flagged', name: 'Airport wildlife authority confirmation', source: 'Airport-wildlife-authority' }],
        reasoningChain: [{ status: 'green', text: 'Birdstrike with engine ingestion — per se EC under Pešková.' }, { status: 'green', text: 'Mandatory EASA inspection grounds aircraft — cancellation unavoidable.' }, { status: 'amber', text: 'Confirm replacement aircraft unavailability documented in TOPS fleet state.' }],
        verdict: 'DEFEND', verdictSub: 'Birdstrike is among the strongest EC defences. Ensure AMOS inspection and SafetyNet records are on file before responding.', verdictFlags: [{ type: 'action', text: 'Verify AMOS borescope/inspection report attached to evidence pack' }]
      }
    },
    strike: {
      match: /industrial action|atc industrial|third-party strike|sector capacity reduced/i,
      result: {
        keywords: [{ phrase: 'ATC industrial action France', tree: 'DT-7: Industrial Action', triggers: KEYWORD_RULES[5].triggers }, { phrase: 'Third-party strike confirmed NOTAM', tree: 'DT-7: Industrial Action', triggers: KEYWORD_RULES[5].triggers }],
        universalHighlighted: '<KW>ATC industrial action France</KW> — sector capacity reduced 60%. ATFM restrictions imposed Eurocontrol. All flights via French airspace delayed or cancelled. <KW>Third-party strike confirmed NOTAM</KW>.',
        nodes: UNIVERSAL_BASE.concat([{ id: 'DT-7', type: 'disruption', question: 'Third-party industrial action — extraordinary circumstances?', status: 'green', statusLabel: 'EC CONFIRMED', conclusion: 'Genuine third-party strike (ATC authority) = EC under Pešková. Krüsemann distinguishes own-staff strike which is NOT EC — this is third-party ATC action.', authority: 'Pešková (C-315/15); Krüsemann (C-601/17)', dataUsed: 'NOTAM; DISCO classification; Eurocontrol ATFM data' }]),
        evidencePack: [{ status: 'collected', name: 'NOTAM — ATC industrial action', source: 'NOTAM-feed' }, { status: 'collected', name: 'Eurocontrol ATFM restrictions', source: 'Eurocontrol-NM-API' }, { status: 'collected', name: 'DISCO disruption record', source: 'DISCO' }],
        reasoningChain: [{ status: 'green', text: 'Third-party ATC strike confirmed — NOT EC for own staff under Krüsemann.' }, { status: 'green', text: 'Network-wide ATFM restrictions corroborate beyond-carrier-control.' }],
        verdict: 'DEFEND', verdictSub: 'Third-party ATC industrial action is established EC. Cross-carrier FlightStats corroboration recommended for batch claims on same event.', verdictFlags: [{ type: 'note', text: 'Apply same EC decision to all claims from this disruption event (batch strategy)' }]
      }
    },
    cascade: {
      match: /cascade|inbound aircraft|ftl limits|standby crew|rotation/i,
      result: {
        keywords: [{ phrase: 'Late inbound aircraft', tree: 'DT-13: Cascading Rotation', triggers: KEYWORD_RULES[6].triggers }, { phrase: 'Crew reached FTL limits', tree: 'DT-6: Crew & FTL', triggers: KEYWORD_RULES[6].triggers }, { phrase: 'No standby crew available', tree: 'DT-6: Crew & FTL — Reasonable measures', triggers: KEYWORD_RULES[6].triggers }],
        universalHighlighted: '<KW>Late inbound aircraft</KW> from BCN delayed due to weather on prior rotation. <KW>Crew reached FTL limits</KW> on inbound sector. <KW>No standby crew available</KW> LGW. Flight delayed 4h 20m.',
        nodes: UNIVERSAL_BASE.map(function (n) { return n.id === 'U-7' ? Object.assign({}, n, { status: 'amber', statusLabel: 'ROOT CAUSE', conclusion: 'Cascade/FTL alone is NOT EC. Root cause at start of rotation determines outcome — here weather on prior rotation may establish EC if evidenced.' }) : n.id === 'U-8' ? Object.assign({}, n, { status: 'red', statusLabel: 'CRITICAL', conclusion: 'No standby crew available — if standby existed and was not deployed, reasonable measures failure defeats defence even with root-cause EC.' }) : n }).concat([
          { id: 'DT-13', type: 'disruption', question: 'Cascading rotation — root cause analysis', status: 'amber', statusLabel: 'WEATHER ROOT', conclusion: 'Cascade itself is NOT EC. Prior sector weather delay appears to be root cause — pull full tail line of flying from TOPS to prove causal chain.', authority: 'Wallentin-Hermann — root cause doctrine', dataUsed: 'TOPS full rotation; DISCO root cause' },
          { id: 'DT-6', type: 'disruption', question: 'FTL exhaustion — secondary to root cause or standalone?', status: 'amber', statusLabel: 'SECONDARY', conclusion: 'FTL alone is NOT EC. Here FTL follows weather-delayed inbound — root cause determines EC availability. Standby crew log is critical.', authority: 'CJEU crew/FTL jurisprudence', dataUsed: 'AIMS FDP & standby log' }
        ]),
        evidencePack: [{ status: 'collected', name: 'TOPS full tail line of flying', source: 'TOPS' }, { status: 'flagged', name: 'AIMS standby crew log', source: 'AIMS' }, { status: 'flagged', name: 'DISCO root cause — prior weather', source: 'DISCO' }, { status: 'flagged', name: 'Prior sector METAR/SIGMET', source: 'Ogimet-API' }],
        reasoningChain: [{ status: 'amber', text: 'Cascade detected — must establish root cause at rotation start, not the cascade itself.' }, { status: 'amber', text: 'Weather on prior rotation may provide EC if METAR/SIGMET corroborates.' }, { status: 'red', text: 'Standby crew availability is critical — failure to deploy defeats defence.' }],
        verdict: 'SETTLE', verdictSub: 'Defence depends on proving weather root cause AND demonstrating no available standby crew. Evidence gaps on standby log and prior-sector weather create settlement risk.', verdictFlags: [{ type: 'action', text: 'Pull AIMS standby log immediately — reasonable measures node is dispositive' }, { type: 'risk', text: 'FTL without proven EC root cause = weak defence' }]
      }
    },
    tech: {
      match: /hidden defect|manufacturing defect|category a|mel dispatch not|hydraulic fault/i,
      result: {
        keywords: [{ phrase: 'hydraulic fault', tree: 'DT-5: Technical', triggers: KEYWORD_RULES[7].triggers }, { phrase: 'MEL dispatch not possible — Category A', tree: 'DT-5: Technical — MEL node', triggers: KEYWORD_RULES[7].triggers }, { phrase: 'hidden manufacturing defect', tree: 'DT-14: Hidden Defect', triggers: KEYWORD_RULES[7].triggers }],
        universalHighlighted: 'G-EZTK <KW>hydraulic fault</KW> during pre-flight checks LGW. <KW>MEL dispatch not possible — Category A</KW> defect. Aircraft AOG. Maintenance believe possible <KW>hidden manufacturing defect</KW> — no prior AD or service bulletin.',
        nodes: UNIVERSAL_BASE.concat([
          { id: 'DT-5', type: 'disruption', question: 'Routine technical vs hidden defect — Van der Lans/Germanwings test', status: 'amber', statusLabel: 'POTENTIAL EC', conclusion: 'Van der Lans: routine maintenance faults NOT EC. Hidden defect unknown despite proper maintenance MAY be EC under Germanwings/LE v TAP. MEL dispatch not possible strengthens involuntary grounding.', authority: 'Van der Lans (C-257/14); Germanwings; LE v TAP (C-74/19)', dataUsed: 'AMOS defect log; MEL record; OEM AD/SB history' },
          { id: 'DT-14', type: 'secondary', question: 'Unknown failure mode — no prior AD or SB?', status: 'amber', statusLabel: 'INVESTIGATE', conclusion: 'No prior AD/SB for this failure mode is supportive. Subsequent OEM bulletin after event would corroborate unknown failure mode.', authority: 'LE v TAP Air Portugal (C-74/19)', dataUsed: 'OEM records; AMOS full maintenance history' }
        ]),
        evidencePack: [{ status: 'collected', name: 'AMOS defect log & AOG record', source: 'AMOS' }, { status: 'flagged', name: 'MEL assessment — Category A', source: 'AMOS' }, { status: 'flagged', name: 'OEM AD/SB history', source: 'OEM-records' }, { status: 'flagged', name: 'Technical investigation report', source: 'AMOS' }],
        reasoningChain: [{ status: 'amber', text: 'Hidden defect argument available but requires full maintenance compliance evidence.' }, { status: 'amber', text: 'Category A / no MEL dispatch supports involuntary grounding narrative.' }, { status: 'amber', text: 'Claimant may argue routine maintenance under Van der Lans — evidence must rebut.' }],
        verdict: 'DEFEND', verdictSub: 'Potential hidden defect EC under Germanwings/LE v TAP if AMOS maintenance compliance and OEM records confirm unknown failure mode. Do not concede without full technical investigation on file.', verdictFlags: [{ type: 'action', text: 'Pull complete AMOS maintenance history and OEM AD/SB records' }, { type: 'note', text: 'Subsequent OEM bulletin after event date is supportive evidence' }]
      }
    },
    medical: {
      match: /medical|cardiac|passenger welfare|diverted.*opo/i,
      result: {
        keywords: [{ phrase: 'passenger welfare incident — pax cardiac arrest', tree: 'DT-9: Medical Emergency', triggers: KEYWORD_RULES[8].triggers }, { phrase: 'diverted to OPO', tree: 'DT-9: Medical Emergency', triggers: KEYWORD_RULES[8].triggers }, { phrase: 'crew were out of hours', tree: 'DT-6: Crew & FTL', triggers: KEYWORD_RULES[6].triggers }],
        universalHighlighted: 'Flight EZY4356 BCN–LTN <KW>diverted to OPO</KW> due to <KW>passenger welfare incident — pax cardiac arrest</KW>. Severity of incident meant <KW>crew were out of hours</KW>. Standby A/C could not save the flight due to airport curfew at OPO.',
        nodes: UNIVERSAL_BASE.concat([{ id: 'DT-9', type: 'disruption', question: 'Medical emergency diversion — extraordinary circumstances?', status: 'green', statusLabel: 'EC CONFIRMED', conclusion: 'Medical emergency is not inherent in normal carrier activity. Carrier legally obliged to respond — mandatory not discretionary. Crew out-of-hours following necessary medical handling is consequence of EC event.', authority: 'Wallentin-Hermann; CJEU medical jurisprudence', dataUsed: 'SafetyNet; TOPS diversion record; ground handler medical log' }]),
        evidencePack: [{ status: 'collected', name: 'SafetyNet medical incident report', source: 'SafetyNet' }, { status: 'collected', name: 'TOPS diversion & line of flying', source: 'TOPS' }, { status: 'flagged', name: 'Ground handler medical/disembarkation log', source: 'Ground-handler-records' }],
        reasoningChain: [{ status: 'green', text: 'Medical welfare diversion — established EC, carrier response mandatory.' }, { status: 'amber', text: 'Crew FTL and curfew at diversion airport extend delay — document causal chain.' }],
        verdict: 'DEFEND', verdictSub: 'Medical emergency diversion is strong EC. Document full causal chain from diversion through crew FTL to next-day completion.', verdictFlags: [{ type: 'action', text: 'Pull ground handler medical log and OPO curfew timeline' }]
      }
    },
    security: {
      match: /security alert|suspicious item|re-screening|hold search/i,
      result: {
        keywords: [{ phrase: 'security alert — suspicious item found in hold', tree: 'DT-8: Security', triggers: KEYWORD_RULES[9].triggers }, { phrase: 'Airport security authority mandated full hold search', tree: 'DT-8: Security', triggers: KEYWORD_RULES[9].triggers }],
        universalHighlighted: 'Flight delayed LGW due to <KW>security alert — suspicious item found in hold</KW>. <KW>Airport security authority mandated full hold search</KW> and passenger re-screening. Police attended.',
        nodes: UNIVERSAL_BASE.concat([{ id: 'DT-8', type: 'disruption', question: 'Authority-initiated security action — extraordinary circumstances?', status: 'green', statusLabel: 'EC CONFIRMED', conclusion: 'Security alert initiated by airport authority with mandatory search/evacuation is externally imposed — both Wallentin-Hermann limbs satisfied.', authority: 'Pešková; Wallentin-Hermann', dataUsed: 'SafetyNet; TOPS delay codes 91–96; police/airport records' }]),
        evidencePack: [{ status: 'collected', name: 'SafetyNet security event report', source: 'SafetyNet' }, { status: 'collected', name: 'TOPS delay record — codes 91–96', source: 'TOPS' }, { status: 'flagged', name: 'Airport authority & police attendance records', source: 'Ground-handler-records' }],
        reasoningChain: [{ status: 'green', text: 'Authority-mandated security search — classic externally imposed EC.' }, { status: 'green', text: 'Baggage reconciliation after offload is mandatory security compliance.' }],
        verdict: 'DEFEND', verdictSub: 'Security alert with authority-mandated hold search is defendable EC. Ensure police/airport authority records corroborate external initiation.', verdictFlags: [{ type: 'action', text: 'Obtain airport security authority written confirmation of mandated search' }]
      }
    },
    disruptive: {
      match: /disruptive passenger|returned to gate|threatening behaviour|offloaded/i,
      result: {
        keywords: [{ phrase: 'highly disruptive passenger', tree: 'DT-10: Disruptive Passenger', triggers: KEYWORD_RULES[10].triggers }, { phrase: 'returned to gate', tree: 'DT-10: Disruptive Passenger', triggers: KEYWORD_RULES[10].triggers }, { phrase: 'Baggage reconciliation required', tree: 'DT-8/DT-10: Security compliance', triggers: KEYWORD_RULES[10].triggers }],
        universalHighlighted: 'Flight EZY7821 <KW>returned to gate</KW> at LGW after departure due to <KW>highly disruptive passenger</KW> — <KW>threatening behaviour</KW> toward cabin crew. Police met aircraft. Passenger and baggage offloaded. <KW>Baggage reconciliation required</KW>.',
        nodes: UNIVERSAL_BASE.concat([{ id: 'DT-10', type: 'disruption', question: 'Disruptive passenger — extraordinary circumstances?', status: 'green', statusLabel: 'EC CONFIRMED', conclusion: 'External passenger behaviour is not inherent in normal carrier activity. SafetyNet is primary evidence. Police attendance corroborates.', authority: 'Wallentin-Hermann; CJEU disruptive passenger cases', dataUsed: 'SafetyNet; TOPS; police attendance record' }]),
        evidencePack: [{ status: 'collected', name: 'SafetyNet disruptive passenger report', source: 'SafetyNet' }, { status: 'collected', name: 'TOPS return-to-gate & delay record', source: 'TOPS' }, { status: 'flagged', name: 'Police attendance record', source: 'Ground-handler-records' }],
        reasoningChain: [{ status: 'green', text: 'Disruptive passenger with police attendance — established EC under DT-10.' }, { status: 'green', text: 'Baggage reconciliation is mandatory post-offload — explains delay duration.' }],
        verdict: 'DEFEND', verdictSub: 'Disruptive passenger with police involvement is strong EC. SafetyNet and police records should be on file before response.', verdictFlags: [{ type: 'action', text: 'Confirm police attendance record attached to evidence pack' }]
      }
    }
  };

  function delay(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  function highlightKeywords(text, keywords) {
    var out = text;
    var seen = {};
    (keywords || []).forEach(function (k) {
      var p = k.phrase;
      if (!p || seen[p.toLowerCase()]) return;
      seen[p.toLowerCase()] = true;
      var re = new RegExp(escapeRe(p), 'i');
      if (re.test(out)) out = out.replace(re, '<KW>$&</KW>');
    });
    KEYWORD_RULES.forEach(function (rule) {
      if (seen[rule.phrase.toLowerCase()]) return;
      if (rule.re.test(text)) {
        var m = text.match(rule.re);
        if (m) {
          var re2 = new RegExp(escapeRe(m[0]), 'i');
          if (!/<KW>/.test(out) || !out.includes(m[0])) out = out.replace(re2, '<KW>$&</KW>');
        }
      }
    });
    return out;
  }

  function detectKeywords(text) {
    var hits = [];
    var seen = {};
    KEYWORD_RULES.forEach(function (rule) {
      if (rule.re.test(text) && !seen[rule.phrase]) {
        seen[rule.phrase] = true;
        hits.push({ phrase: rule.phrase, tree: rule.tree, triggers: rule.triggers });
      }
    });
    return hits;
  }

  function matchScenario(text) {
    var t = text.toLowerCase().replace(/\s+/g, ' ');
    var best = null;
    var bestScore = 0;
    Object.keys(SCENARIOS).forEach(function (key) {
      var sc = SCENARIOS[key];
      var score = 0;
      var src = sc.match.source.replace(/\\b/g, '').split('|');
      src.forEach(function (pat) {
        if (pat && t.indexOf(pat.replace(/\\b/g, '').toLowerCase()) >= 0) score++;
      });
      if (score > bestScore) { bestScore = score; best = sc.result; }
    });
    return bestScore >= 2 ? best : null;
  }

  function enrichWithLandscape(text, result) {
    if (typeof DefendAbleFramework === 'undefined') return result;
    var ls = DefendAbleFramework.landscapeSummary(text);
    result.landscape = ls;

    var claimNodes = ls.claims.filter(function (c) { return c.matched; }).map(function (c) {
      return {
        id: c.id, type: 'claim',
        question: c.name + (c.article ? ' (' + c.article + ')' : ''),
        status: 'amber', statusLabel: 'CLAIM HEAD',
        conclusion: c.note || 'Claim head identified from ICC summary — verify quantum and evidence.',
        authority: c.article || 'EC261/UK261',
        dataUsed: (c.evidence || []).join('; ')
      };
    });

    var defenceNodes = ls.defences.filter(function (d) { return d.matched && !d.isNegative; }).map(function (d) {
      return {
        id: d.id, type: 'disruption',
        question: d.name + ' — extraordinary circumstances?',
        status: 'green', statusLabel: 'EC CANDIDATE',
        conclusion: 'ICC keywords match this defence tree. ' + (d.authority || '') + ' Pull: ' + (d.evidence || []).join(', ') + '.',
        authority: d.authority,
        dataUsed: (d.evidence || []).join('; ')
      };
    });

    var negativeNodes = ls.defences.filter(function (d) { return d.matched && d.isNegative; }).map(function (d) {
      return {
        id: d.id, type: 'disruption',
        question: d.name,
        status: 'red', statusLabel: 'NOT EC',
        conclusion: d.authority + ' — this is NOT an extraordinary circumstance. Do not concede on EC grounds.',
        authority: d.authority,
        dataUsed: (d.evidence || []).join('; ')
      };
    });

    var frameworkUniversal = DefendAbleFramework.buildUniversalNodes(text);
    var existingIds = {};
    (result.nodes || []).forEach(function (n) { existingIds[n.id] = true; });
    var merged = claimNodes.concat(
      frameworkUniversal.filter(function (n) { return !existingIds[n.id]; })
    ).concat(result.nodes || []);
    existingIds = {};
    merged.forEach(function (n) { existingIds[n.id] = true; });
    merged = merged.concat(
      defenceNodes.filter(function (n) { return !existingIds[n.id]; })
    ).concat(
      negativeNodes.filter(function (n) { return !existingIds[n.id]; })
    );
    result.nodes = merged;

    if (!result.reasoningChain) result.reasoningChain = [];
    result.reasoningChain.unshift({
      status: 'green',
      text: 'Landscape scan: ' + ls.claimsMatched + '/' + ls.claimsTotal + ' claim heads · ' + ls.defencesMatched + '/' + ls.defencesTotal + ' EC defences · ' + ls.legalMatched + '/' + ls.legalTotal + ' universal legal issues screened.'
    });
    return result;
  }

  function buildFallback(text) {
    var keywords = detectKeywords(text);
    if (!keywords.length) {
      keywords = [{ phrase: 'Operational disruption', tree: 'DT-13: Cascading / General', triggers: [
        { system: 'TOPS', document: 'Operational delay record', purpose: 'Primary operational evidence' },
        { system: 'DISCO', document: 'Disruption classification', purpose: 'Disruption type and root cause' },
        { system: 'SafetyNet', document: 'Safety/operational event report', purpose: 'Mandatory safety record' }
      ]}];
    }
    var nodes = UNIVERSAL_BASE.slice();
    var primary = keywords[0];
    nodes.push({
      id: 'DT-X', type: 'disruption',
      question: 'Disruption type identified from ICC keywords — apply matching decision tree?',
      status: 'amber', statusLabel: 'REVIEW',
      conclusion: 'Engine A detected "' + primary.phrase + '" mapping to ' + primary.tree + '. Full disruption tree analysis required with pulled evidence.',
      authority: '261Claims Decision Framework v2',
      dataUsed: primary.triggers.map(function (t) { return t.system; }).join('; ')
    });
    var evidencePack = [];
    var seen = {};
    keywords.forEach(function (k) {
      (k.triggers || []).forEach(function (tr) {
        var key = tr.system + tr.document;
        if (seen[key]) return;
        seen[key] = true;
        evidencePack.push({ status: 'flagged', name: tr.document, source: tr.system });
      });
    });
    return enrichWithLandscape(text, {
      keywords: keywords,
      universalHighlighted: highlightKeywords(text, keywords),
      nodes: nodes,
      evidencePack: evidencePack,
      reasoningChain: [
        { status: 'green', text: 'Engine A parsed ICC summary and identified ' + keywords.length + ' keyword trigger(s).' },
        { status: 'amber', text: 'Engine B applied universal legal nodes — disruption-specific tree requires full evidence review.' },
        { status: 'amber', text: 'Use a preset example or Live AI mode for deeper analysis on custom text.' }
      ],
      verdict: 'INVESTIGATE',
      verdictSub: 'Keywords detected and evidence triggers fired. Full legal analysis pending complete evidence pack — review disruption tree manually or switch to Live AI mode.',
      verdictFlags: [{ type: 'action', text: 'Pull all flagged evidence items before triage decision' }, { type: 'note', text: 'Try a preset chip example for a full curated demo analysis' }]
    });
  }

  function resolveAnalysis(text) {
    var trimmed = text.trim();
    var result;
    if (typeof EX !== 'undefined') {
      var keys = Object.keys(SCENARIOS);
      for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (EX[key] && trimmed === EX[key].trim()) {
          result = JSON.parse(JSON.stringify(SCENARIOS[key].result));
          return enrichWithLandscape(trimmed, result);
        }
      }
    }
    var scenario = matchScenario(trimmed);
    if (scenario) {
      result = JSON.parse(JSON.stringify(scenario));
      return enrichWithLandscape(trimmed, result);
    }
    return buildFallback(trimmed);
  }

  function analyzeDemo(text, onProgress) {
    onProgress = onProgress || function () {};
    return (async function () {
      onProgress('stage', 'parse', 'Reading ICC disruption summary…');
      await delay(600);
      var result = resolveAnalysis(text);
      onProgress('stage', 'engineA', 'Engine A — identifying keywords and firing evidence triggers…');
      await delay(900);
      onProgress('partial', 'A', result);
      onProgress('stage', 'engineB', 'Engine B — running universal legal nodes and disruption decision tree…');
      await delay(1100);
      onProgress('partial', 'B', result);
      onProgress('stage', 'output', 'Synthesising evidence pack, reasoning chain, and verdict…');
      await delay(700);
      onProgress('done', null, result);
      return result;
    })();
  }

  var SYS_PROMPT = null;

  function getSystemPrompt() {
    if (SYS_PROMPT) return SYS_PROMPT;
    if (typeof SYS !== 'undefined') SYS_PROMPT = SYS;
    return SYS_PROMPT || '';
  }

  async function analyzeLive(text, apiKey, onProgress) {
    onProgress = onProgress || function () {};
    onProgress('stage', 'parse', 'Connecting to Claude — live legal intelligence…');
    var resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4000,
        system: getSystemPrompt(),
        messages: [{ role: 'user', content: 'Analyse this disruption description and return the JSON only — no other text:\n\n"' + text + '"' }]
      })
    });
    if (!resp.ok) {
      var er = await resp.json().catch(function () { return {}; });
      throw new Error((er.error && er.error.message) || 'API error ' + resp.status);
    }
    var data = await resp.json();
    var raw = (data.content && data.content.find(function (b) { return b.type === 'text'; }) || {}).text || '';
    var clean = raw.replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/\s*```$/, '').trim();
    var result;
    try { result = JSON.parse(clean); }
    catch (err) {
      var m = raw.match(/\{[\s\S]*\}/);
      if (m) result = JSON.parse(m[0]);
      else throw new Error('Could not parse AI response.');
    }
    result = enrichWithLandscape(text, result);
    onProgress('done', null, result);
    return result;
  }

  function analyze(text, opts) {
    opts = opts || {};
    var mode = opts.mode || 'demo';
    var apiKey = opts.apiKey || '';
    var onProgress = opts.onProgress || function () {};
    if (mode === 'live' && apiKey) return analyzeLive(text, apiKey, onProgress);
    return analyzeDemo(text, onProgress);
  }

  return { analyze: analyze, detectKeywords: detectKeywords, resolveAnalysis: resolveAnalysis };
})();
