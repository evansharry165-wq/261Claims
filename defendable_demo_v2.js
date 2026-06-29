/* DefendAble Intelligence Engine v2 — deterministic demo (no API) */
var DefendAbleDemoV2 = (function () {

  function delay(ms) { return Promise.resolve().then(function () { return new Promise(function (r) { setTimeout(r, ms); }); }); }

  function norm(t) { return (t || '').toLowerCase().replace(/\s+/g, ' ').trim(); }

  function has(t, re) { return re.test(norm(t)); }

  function escRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  function highlight(text, phrases) {
    var out = text;
    var seen = {};
    (phrases || []).forEach(function (p) {
      if (!p || seen[p.toLowerCase()]) return;
      seen[p.toLowerCase()] = true;
      var re = new RegExp(escRe(p), 'i');
      if (re.test(out)) out = out.replace(re, '<KW>$&</KW>');
    });
    return out;
  }

  function ev(id, desc, opts) {
    opts = opts || {};
    return {
      id: id,
      description: desc,
      lineOfFlying: opts.lof || 'OWN_OPERATION',
      lineOfFlyingReason: opts.lofReason || '',
      preliminaryECCandidate: opts.ecCandidate != null ? opts.ecCandidate : true,
      preliminaryECReason: opts.ecReason || '',
      delayContribution: opts.delay || 'unknown',
      timingData: opts.timing || null,
      butForQuestion: opts.butFor || '',
      chainLinkToNext: opts.link || 'ESTABLISHED',
      chainLinkReason: opts.linkReason || '',
      ecStatus: opts.ecStatus || null,
      ecLimb1: opts.limb1 || null,
      ecLimb2: opts.limb2 || null,
      ecAuthority: opts.authority || null,
      butForConclusion: opts.butForConclusion || null,
      chainBreak: !!opts.chainBreak,
      chainBreakReason: opts.chainBreakReason || null
    };
  }

  function packItem(name, source, ref, opts) {
    opts = opts || {};
    return {
      status: opts.status || 'flagged',
      name: name,
      source: source,
      chainEventRef: ref,
      whatItProves: opts.proves || '',
      absenceConsequence: opts.absence || '',
      priority: opts.priority || 'important',
      dynamicTrigger: !!opts.dynamic
    };
  }

  function artNine(text) {
    var overnight = has(text, /\bond\b|\bovernight\b|\bnext day\b|\bnext-day\b|\bfollowing day\b/i);
    var delay2 = has(text, /\bdelay|\bhour|\bcancel/i);
    return {
      delayExceeds2Hours: delay2,
      mealsEvidenced: 'UNKNOWN',
      communicationsEvidenced: 'UNKNOWN',
      overnightOccurred: overnight,
      hotelEvidenced: overnight ? 'UNKNOWN' : 'NOT_APPLICABLE',
      transportEvidenced: overnight ? 'UNKNOWN' : 'NOT_APPLICABLE',
      artNineRisk: overnight ? 'MEDIUM' : (delay2 ? 'LOW' : 'NONE'),
      artNineNote: overnight ? 'Pull ground handler HOTAC and catering records — Art 9 hotel mandatory for overnight.' : (delay2 ? 'Verify meals/comms if delay exceeded 2 hours.' : 'Art 9 not triggered on current ICC summary.')
    };
  }

  function artEight(text) {
    var cancel = has(text, /\bcancel/i);
    var d5 = has(text, /\b5\s*h|\b5 hour|\b4h\s*\d+m|\b5h\b/i);
    var ond = has(text, /\bond\b|\bnext day\b/i);
    var triggered = cancel || d5 || ond;
    return {
      triggered: triggered,
      cancellationOccurred: cancel,
      delayExceeds5Hours: d5 || ond,
      artEightOfferEvidenced: triggered ? 'UNKNOWN' : 'NOT_APPLICABLE',
      artEightRisk: triggered ? 'MEDIUM' : 'NONE',
      artEightNote: triggered ? 'Confirm MAX-OPS rerouting/reimbursement offer documented.' : 'Art 8 not triggered on current facts.'
    };
  }

  /* ── Curated full outputs (Pass 1+2+3 merged shape) ── */
  var CURATED = {
    positioning: function (text) {
      return fullResult(text, {
        causationStructure: 'COMPLEX',
        causationStructureReason: 'Positioning disruption, intervening AOG, crew OOH, replacement crew, and 18-hour wake rule form a multi-stage chain.',
        chain: [
          ev('E1', 'Operating crew positioning sector disrupted by ATC and weather', { lof: 'POSITIONING', ecCandidate: true, ecReason: 'Root cause on positioning sector — third-party ATC/weather may be EC if evidenced.', delay: 'unknown', butFor: 'But for ATC/weather on positioning, would crew have reached the operating flight on time?', linkReason: 'Positioning delay caused downstream crew availability failure.' }),
          ev('E2', 'Positioning aircraft AOG — fuel leak', { lof: 'POSITIONING', ecCandidate: false, ecReason: 'Technical AOG on positioning — potential chain break unless external cause (van der Lans).', delay: 'unknown', butFor: 'But for the fuel leak, would the positioning crew have been available?', linkReason: 'AOG extended positioning delay beyond ATC/weather alone.', chainBreak: true, chainBreakReason: 'Ordinary technical event may intervene between EC root and crew OOH — judgment required.' }),
          ev('E3', 'Operating crew out of hours on claimant flight', { lof: 'OWN_OPERATION', ecCandidate: false, ecReason: 'FTL/OOH is never independently EC — Lipton UKSC 24 for illness; FTL follows root cause.', delay: 'caused cancellation/delay', butFor: 'But for prior events, would crew have been in limits?', linkReason: 'Consequence of positioning chain.' }),
          ev('E4', 'Replacement crew sourced — one member failed 18-hour wake rule', { lof: 'OWN_OPERATION', ecCandidate: false, ecReason: 'Wake rule failure is a judgment node — EC timing vs carrier delay in sourcing crew.', delay: 'unknown', link: 'DISPUTED', linkReason: 'Whether wake failure is attributable to EC root cause timing or operational decisions.' }),
          ev('E5', 'No standby crew available', { lof: 'OWN_OPERATION', ecCandidate: false, ecReason: 'Reasonable measures — AIMS standby log required.', delay: 'none — recovery failure', link: 'FINAL_EVENT', linkReason: 'Final operational outcome.' })
        ],
        keywords: [
          { phrase: 'positioning', tree: 'DT-18: Positioning flight', chainEventRef: 'E1', triggers: [{ system: 'TOPS', document: 'Line of flying — positioning sector', purpose: 'Confirm positioning tail and delay' }] },
          { phrase: 'fuel leak', tree: 'DT-5: Technical', chainEventRef: 'E2', triggers: [{ system: 'AMOS', document: 'Fuel leak AOG record', purpose: 'Category and MEL assessment' }] },
          { phrase: '18 hour wake rule', tree: 'DT-20: 18-hour wake rule', chainEventRef: 'E4', triggers: [{ system: 'AIMS', document: 'FDP and rest audit', purpose: 'When 18-hour window started' }] }
        ],
        judgmentNodes: [
          { nodeId: 'J1', chainEventRef: 'E2', question: 'Does the fuel leak (E2) break the EC chain from ATC/weather (E1)?', factsFor: 'If fuel leak was unforeseeable external damage, chain may hold.', factsAgainst: 'Van der Lans — routine/hidden defect on carrier aircraft may be ordinary cause intervening.', additionalEvidenceNeeded: 'AMOS fuel leak record, maintenance history, DISCO root cause', consequenceIfChainHolds: 'EC at root may still defend if but-for test satisfied.', consequenceIfChainBreaks: 'EC defence fails at E2 — SETTLE on ordinary technical cause.' },
          { nodeId: 'J2', chainEventRef: 'E4', question: 'Was 18-hour wake rule failure caused by EC timing or delay sourcing replacement crew?', factsFor: 'AIMS shows wake exhaustion solely from EC-delayed chain.', factsAgainst: 'Carrier delayed crew recovery after OOH was foreseeable — reasonable measures failure.', additionalEvidenceNeeded: 'AIMS FDP record, time replacement crew sourced vs time OOH reached', consequenceIfChainHolds: 'Chain holds through wake rule node.', consequenceIfChainBreaks: 'Reasonable measures defeat at crew recovery intervention point.' }
        ],
        verdict: 'JUDGMENT_REQUIRED',
        verdictSub: 'Multi-cause positioning chain with intervening AOG and mandatory DT-20 wake rule judgment. Do not DEFEND until AMOS, TOPS positioning line, and AIMS FDP/standby logs resolve J1 and J2.',
        verdictFlags: [
          { type: 'judgment', text: 'J1: Fuel leak chain break — AMOS required before EC conclusion' },
          { type: 'judgment', text: 'J2: 18-hour wake rule — AIMS FDP audit mandatory (DT-20)' },
          { type: 'action', text: 'Pull TOPS line of flying for positioning aircraft tail' }
        ]
      });
    },

    atc: function (text) {
      return fullResult(text, {
        causationStructure: 'SEQUENTIAL',
        causationStructureReason: 'ATC/CTOT restriction led directly to curfew breach and overnight operation.',
        chain: [
          ev('E1', 'Eurocontrol CTOT / network-wide ATFM restriction', { lof: 'THIRD_PARTY', lofReason: 'Third-party flow control', ecCandidate: true, ecReason: 'ATC/ATFM is classic third-party EC candidate.', delay: 'unknown', linkReason: 'CTOT imposed delay on departure.' }),
          ev('E2', 'Airport curfew breached — flight OND', { lof: 'OWN_OPERATION', ecCandidate: true, ecReason: 'OND direct consequence of CTOT-driven delay.', delay: 'overnight — next day arrival', link: 'FINAL_EVENT', linkReason: 'Sturgeon delay measured to next-day arrival.' })
        ],
        keywords: [{ phrase: 'CTOT', tree: 'DT-01: ATC/ATFM', chainEventRef: 'E1', triggers: [{ system: 'EUROCONTROL-NM-API', document: 'CTOT assignment log', purpose: 'Confirm third-party ATFM' }, { system: 'TOPS', document: 'Delay codes 81-89', purpose: 'Operational corroboration' }] }],
        nodes: [
          { id: 'DT-01', type: 'disruption', chainEventRef: 'E1', question: 'ATC/ATFM — extraordinary circumstances?', status: 'green', statusLabel: 'EC CONFIRMED', conclusion: 'Third-party ATC flow control satisfies both Wallentin-Hermann limbs. Pešková C-315/15.', authority: 'Pešková; Wallentin-Hermann', dataUsed: 'Eurocontrol ATFM; TOPS', chainConsequence: 'EC established at root — chain unbroken if reasonable measures met.' }
        ],
        verdict: 'DEFEND_WITH_CONDITIONS',
        verdictConditions: ['HOTAC and catering records on file for overnight OND (Art 9)', 'Art 8 rerouting/reimbursement offer evidenced in MAX-OPS once delay exceeded 5 hours'],
        verdictSub: 'Clean ATC/ATFM extraordinary circumstances. Curfew-driven OND is direct consequence. Confirm Art 9 hotel and Art 8 offer before Letter of Response.',
        verdictFlags: [{ type: 'action', text: 'Pull HOTAC records for overnight delay' }, { type: 'action', text: 'Confirm Art 8 offer in MAX-OPS' }]
      });
    },

    ownStrike: function (text) {
      return fullResult(text, {
        causationStructure: 'SEQUENTIAL',
        causationStructureReason: 'Own-staff industrial action directly caused cancellation.',
        chain: [ev('E1', 'Own pilot/cabin crew industrial action', { lof: 'OWN_OPERATION', ecCandidate: false, ecReason: 'Krüsemann — own staff strike is NOT EC.', delay: 'caused cancellation', link: 'FINAL_EVENT' })],
        keywords: [{ phrase: 'own staff strike', tree: 'DT-07: Industrial action — own staff', chainEventRef: 'E1', triggers: [{ system: 'DISCO', document: 'Disruption classification', purpose: 'Confirm own vs third party' }] }],
        nodes: [
          { id: 'DT-7.1', type: 'disruption', chainEventRef: 'E1', question: 'Industrial action — own staff or third party?', status: 'red', statusLabel: 'CONCEDE', conclusion: 'Own-staff strike confirmed. Krüsemann v TUIfly C-601/17 — NOT extraordinary circumstances. Do not run EC defence.', authority: 'Krüsemann C-601/17', dataUsed: 'DISCO; union notice', chainConsequence: 'EC defence unavailable — assess quantum and Art 8/9 only.' }
        ],
        verdict: 'CONCEDE',
        verdictSub: 'Own-staff industrial action is not EC under Krüsemann. Concede on EC grounds; review Art 8 rerouting and Art 7 quantum only.',
        verdictFlags: [{ type: 'note', text: 'Document Krüsemann authority if settling batch claims from same event' }]
      });
    },

    atcHandlerOnd: function (text) {
      return fullResult(text, {
        causationStructure: 'COMPLEX',
        causationStructureReason: 'ATC delay and third-party handler industrial action compound; network recovery failure and crew FTL follow.',
        chain: [
          ev('E1', 'ATC delays / CTOT restrictions', { lof: 'THIRD_PARTY', ecCandidate: true, ecReason: 'Third-party ATC flow control — EC candidate.', delay: 'unknown', linkReason: 'Initial external delay.' }),
          ev('E2', 'CDG baggage handler industrial action', { lof: 'THIRD_PARTY', ecCandidate: true, ecReason: 'Third-party handler strike — NOT Krüsemann own staff. Pešková third-party action.', delay: 'unknown', linkReason: 'Compounding external disruption at CDG.' }),
          ev('E3', 'No standby aircraft available in network — last flights of day', { lof: 'OWN_OPERATION', ecCandidate: false, ecReason: 'Reasonable measures — fleet recovery at end of day.', delay: 'recovery not possible', linkReason: 'Could spare aircraft have recovered before 3-hour threshold?' }),
          ev('E4', 'Crew hours breach (FTL) due to compounded delays', { lof: 'OWN_OPERATION', ecCandidate: false, ecReason: 'FTL alone not EC — follows root causes.', delay: 'unknown', linkReason: 'Crew limits reached after ATC + handler delays.' }),
          ev('E5', 'Flight OND — operated next day (EZY9456)', { lof: 'OWN_OPERATION', ecCandidate: true, ecReason: 'OND consequence of prior chain — Sturgeon to next-day arrival.', delay: 'overnight', link: 'FINAL_EVENT', linkReason: 'Passenger delay at final destination.' })
        ],
        keywords: [
          { phrase: 'ATC', tree: 'DT-01: ATC/ATFM', chainEventRef: 'E1', triggers: [{ system: 'EUROCONTROL-NM-API', document: 'ATFM data', purpose: 'CTOT confirmation' }] },
          { phrase: 'baggage handler industrial action', tree: 'DT-07: Third-party industrial action', chainEventRef: 'E2', triggers: [{ system: 'DISCO', document: 'Handler vs own-staff classification', purpose: 'Krüsemann gate' }, { system: 'NOTAM-feed', document: 'Handler strike notice', purpose: 'Third-party corroboration' }] },
          { phrase: 'OND', tree: 'DT-01: Curfew/OND', chainEventRef: 'E5', triggers: [{ system: 'TOPS', document: 'Next-day operation record', purpose: 'Sturgeon delay measurement' }] }
        ],
        judgmentNodes: [
          { nodeId: 'J1', chainEventRef: 'E3', question: 'Could a standby aircraft have recovered the flight before the 3-hour threshold?', factsFor: 'ICC states no spare within network — end of day fleet state.', factsAgainst: 'TOPS fleet state may show aircraft available but not deployed — reasonable measures failure.', additionalEvidenceNeeded: 'TOPS fleet state and recovery log for date', consequenceIfChainHolds: 'DEFEND_WITH_CONDITIONS if EC chain clean.', consequenceIfChainBreaks: 'SETTLE if spare aircraft not deployed when available.' }
        ],
        interventionPoints: [
          { pointId: 'IP1', chainEventRef: 'E3', description: 'Alternative aircraft deployment before 3-hour threshold', evidenceRequired: 'TOPS fleet state', evidenceStatus: 'UNKNOWN', outcome: 'UNKNOWN', legalConsequence: 'Failure to deploy spare aircraft defeats EC even if root cause is EC', riskLevel: 'amber' }
        ],
        verdict: 'DEFEND_WITH_CONDITIONS',
        verdictConditions: ['DISCO confirms CDG handler action is third-party (not own staff)', 'TOPS confirms no recoverable spare aircraft was available (not merely und deployed)', 'Art 9 HOTAC evidenced for OND', 'Art 8 offer evidenced in MAX-OPS'],
        verdictSub: 'Strong EC candidates at E1 (ATC) and E2 (third-party handler strike). Network recovery and crew FTL are downstream. Confirm handler is third-party not Krüsemann own-staff, and reasonable measures on spare aircraft before final DEFEND.',
        verdictFlags: [
          { type: 'action', text: 'DISCO classification — handler strike must be third-party' },
          { type: 'judgment', text: 'Verify TOPS fleet state — standby aircraft reasonable measures' },
          { type: 'action', text: 'Art 9 hotel for OND — pull ground handler HOTAC' }
        ]
      });
    },

    weather: function (text) {
      return fullResult(text, {
        causationStructure: 'COMPLEX',
        causationStructureReason: 'Weather diversion at destination compounded by positioning failure and passenger care obligations.',
        chain: [
          ev('E1', 'Thunderstorms at destination — approach below minima', { lof: 'THIRD_PARTY', ecCandidate: true, ecReason: 'Meteorological conditions below operating minima — classic EC.', delay: 'unknown', linkReason: 'Mandatory ATC diversion.' }),
          ev('E2', 'Diversion to alternate airport (Valencia)', { lof: 'OWN_OPERATION', ecCandidate: true, ecReason: 'Direct consequence of weather EC at E1.', delay: 'unknown', linkReason: 'Safety-mandated diversion.' }),
          ev('E3', 'Standby aircraft could not position to recover rotation', { lof: 'OWN_OPERATION', ecCandidate: false, ecReason: 'Reasonable measures — weather also affected positioning.', delay: 'recovery not possible', linkReason: 'Network recovery intervention point.' }),
          ev('E4', 'Passenger care at alternate — coach transfer arranged', { lof: 'OWN_OPERATION', ecCandidate: false, ecReason: 'Art 9 care obligation — not EC analysis.', delay: 'unknown', link: 'FINAL_EVENT', linkReason: 'Final operational outcome.' })
        ],
        keywords: [
          { phrase: 'thunderstorms', tree: 'DT-02: Weather', chainEventRef: 'E1', triggers: [{ system: 'METAR-feed', document: 'METAR/TAF BCN', purpose: 'Confirm below-minima weather' }] },
          { phrase: 'diversion', tree: 'DT-02: Weather diversion', chainEventRef: 'E2', triggers: [{ system: 'TOPS', document: 'Diversion record', purpose: 'Confirm alternate and delay' }] }
        ],
        nodes: [
          { id: 'DT-02', type: 'disruption', chainEventRef: 'E1', question: 'Weather below minima — extraordinary circumstances?', status: 'green', statusLabel: 'EC CONFIRMED', conclusion: 'Meteorological conditions beyond carrier control satisfy Wallentin-Hermann limbs.', authority: 'Pešková; established weather EC', dataUsed: 'METAR/TAF', chainConsequence: 'EC at root — verify reasonable measures on recovery.' }
        ],
        verdict: 'DEFEND_WITH_CONDITIONS',
        verdictConditions: ['METAR/TAF confirms below-minima at destination', 'TOPS confirms standby positioning failure was weather-driven not undeployed spare', 'Art 9 care records at alternate airport on file'],
        verdictSub: 'Weather diversion is strong EC. Confirm METAR evidence and that no spare aircraft was available but undeployed before final DEFEND.',
        verdictFlags: [{ type: 'action', text: 'Pull METAR/TAF for destination at ETA' }, { type: 'action', text: 'Confirm Art 9 care at Valencia' }]
      });
    },

    birdstrike: function (text) {
      return fullResult(text, {
        causationStructure: 'SEQUENTIAL',
        causationStructureReason: 'Birdstrike caused mandatory AOG inspection and cancellation.',
        chain: [
          ev('E1', 'Birdstrike on approach — engine ingestion confirmed', { lof: 'OWN_OPERATION', ecCandidate: true, ecReason: 'Pešková — birdstrike per se EC.', delay: 'unknown', linkReason: 'Wildlife strike event.' }),
          ev('E2', 'Aircraft AOG — mandatory EASA inspection', { lof: 'OWN_OPERATION', ecCandidate: true, ecReason: 'Direct regulatory consequence of birdstrike.', delay: 'unknown', linkReason: 'Safety inspection required.' }),
          ev('E3', 'Replacement aircraft unavailable — flight cancelled', { lof: 'OWN_OPERATION', ecCandidate: false, ecReason: 'Reasonable measures — spare tail deployment.', delay: 'cancellation', link: 'FINAL_EVENT', linkReason: 'Final passenger outcome.' })
        ],
        keywords: [{ phrase: 'birdstrike', tree: 'DT-04: Birdstrike', chainEventRef: 'E1', triggers: [{ system: 'AMOS', document: 'Birdstrike report', purpose: 'Confirm ingestion and inspection' }, { system: 'TOPS', document: 'Cancellation record', purpose: 'Delay measurement' }] }],
        nodes: [
          { id: 'DT-04', type: 'disruption', chainEventRef: 'E1', question: 'Birdstrike — extraordinary circumstances?', status: 'green', statusLabel: 'EC CONFIRMED', conclusion: 'Birdstrike is per se extraordinary circumstances under Pešková.', authority: 'Pešková C-315/15', dataUsed: 'AMOS birdstrike report', chainConsequence: 'EC established — verify reasonable measures on spare aircraft.' }
        ],
        judgmentNodes: [
          { nodeId: 'J1', chainEventRef: 'E3', question: 'Could a replacement aircraft have been deployed before the 3-hour threshold?', factsFor: 'ICC states no replacement available.', factsAgainst: 'TOPS fleet state may show undeployed spare.', additionalEvidenceNeeded: 'TOPS fleet state and recovery log', consequenceIfChainHolds: 'DEFEND if EC chain clean.', consequenceIfChainBreaks: 'SETTLE if spare not deployed.' }
        ],
        verdict: 'DEFEND_WITH_CONDITIONS',
        verdictConditions: ['AMOS birdstrike report on file', 'TOPS confirms no recoverable spare aircraft was available'],
        verdictSub: 'Birdstrike is per se EC. Confirm AMOS report and reasonable measures on replacement aircraft before response.',
        verdictFlags: [{ type: 'action', text: 'Pull AMOS birdstrike / ingestion record' }]
      });
    },

    industrialThirdParty: function (text) {
      return fullResult(text, {
        causationStructure: 'SEQUENTIAL',
        causationStructureReason: 'Third-party ATC industrial action caused network-wide ATFM restrictions.',
        chain: [
          ev('E1', 'ATC industrial action — French sector capacity reduced', { lof: 'THIRD_PARTY', ecCandidate: true, ecReason: 'Third-party ATC strike — NOT Krüsemann own staff.', delay: 'unknown', linkReason: 'External industrial action.' }),
          ev('E2', 'Eurocontrol ATFM restrictions imposed network-wide', { lof: 'THIRD_PARTY', ecCandidate: true, ecReason: 'Direct flow-control consequence of ATC strike.', delay: 'unknown', link: 'FINAL_EVENT', linkReason: 'All carriers affected — systemic delay.' })
        ],
        keywords: [{ phrase: 'ATC industrial action', tree: 'DT-07: Third-party industrial action', chainEventRef: 'E1', triggers: [{ system: 'NOTAM-feed', document: 'Strike NOTAM', purpose: 'Third-party corroboration' }, { system: 'EUROCONTROL-NM-API', document: 'ATFM regulation log', purpose: 'Network-wide restriction' }] }],
        nodes: [
          { id: 'DT-7.2', type: 'disruption', chainEventRef: 'E1', question: 'Industrial action — third-party ATC?', status: 'green', statusLabel: 'EC CANDIDATE', conclusion: 'Third-party ATC industrial action is NOT Krüsemann own-staff strike. Strong EC candidate.', authority: 'Pešková; Krüsemann distinguished', dataUsed: 'NOTAM; DISCO', chainConsequence: 'EC at root if both limbs satisfied.' }
        ],
        verdict: 'DEFEND',
        verdictSub: 'Third-party ATC industrial action with network-wide ATFM. Pull NOTAM and Eurocontrol ATFM data before Letter of Response.',
        verdictFlags: [{ type: 'action', text: 'NOTAM confirming third-party ATC strike' }, { type: 'action', text: 'Eurocontrol ATFM regulation log' }]
      });
    },

    cascade: function (text) {
      return fullResult(text, {
        causationStructure: 'SEQUENTIAL',
        causationStructureReason: 'Late inbound from prior rotation caused crew FTL breach — cascade is not independently EC.',
        chain: [
          ev('E1', 'Late inbound aircraft from prior rotation — weather on inbound sector', { lof: 'OWN_OPERATION', ecCandidate: false, ecReason: 'Cascade delay — root cause at chain start must be identified.', delay: 'unknown', linkReason: 'Prior sector impact on rotation.' }),
          ev('E2', 'Crew reached FTL limits on inbound sector', { lof: 'OWN_OPERATION', ecCandidate: false, ecReason: 'FTL never independently EC.', delay: 'unknown', linkReason: 'Consequence of late inbound.' }),
          ev('E3', 'No standby crew available', { lof: 'OWN_OPERATION', ecCandidate: false, ecReason: 'Reasonable measures — AIMS standby log.', delay: '4h 20m total delay', link: 'FINAL_EVENT', linkReason: 'Final delay at destination.' })
        ],
        keywords: [
          { phrase: 'late inbound', tree: 'DT-16: Cascading delay', chainEventRef: 'E1', triggers: [{ system: 'TOPS', document: 'Inbound delay record', purpose: 'Root cause at chain start' }] },
          { phrase: 'FTL', tree: 'DT-19: Crew FTL', chainEventRef: 'E2', triggers: [{ system: 'AIMS', document: 'FDP record', purpose: 'Crew limits breach time' }] }
        ],
        judgmentNodes: [
          { nodeId: 'J1', chainEventRef: 'E1', question: 'What was the root cause of the late inbound — and is THAT event EC?', factsFor: 'Weather on inbound sector may be EC at root.', factsAgainst: 'If root is ordinary operational delay, cascade does not create EC.', additionalEvidenceNeeded: 'TOPS delay codes for inbound sector; DISCO root cause', consequenceIfChainHolds: 'EC at root may defend entire cascade.', consequenceIfChainBreaks: 'SETTLE — cascade from ordinary cause.' }
        ],
        verdict: 'JUDGMENT_REQUIRED',
        verdictSub: 'Cascading delay — must establish EC at chain root (E1 weather). Crew FTL and standby crew are downstream. Do not DEFEND until inbound root cause evidenced.',
        verdictFlags: [
          { type: 'judgment', text: 'Establish root cause of late inbound before EC conclusion' },
          { type: 'action', text: 'AIMS standby crew log required' }
        ]
      });
    },

    technical: function (text) {
      return fullResult(text, {
        causationStructure: 'SEQUENTIAL',
        causationStructureReason: 'Category A technical defect with possible hidden manufacturing defect — Matkustaja analysis required.',
        chain: [
          ev('E1', 'Hydraulic fault identified pre-flight — Category A defect, MEL dispatch not possible', { lof: 'OWN_OPERATION', ecCandidate: false, ecReason: 'Routine technical — van der Lans unless hidden defect proven.', delay: 'unknown', linkReason: 'Aircraft AOG event.' }),
          ev('E2', 'Possible hidden manufacturing defect — no prior AD or service bulletin', { lof: 'OWN_OPERATION', ecCandidate: true, ecReason: 'Matkustaja C-385/23 hidden defect candidate.', delay: 'unknown', linkReason: 'Defect characterisation judgment.' }),
          ev('E3', 'No spare aircraft available — flight cancelled', { lof: 'OWN_OPERATION', ecCandidate: false, ecReason: 'Reasonable measures — U-8.', delay: 'cancellation', link: 'FINAL_EVENT', linkReason: 'Final outcome.' })
        ],
        keywords: [
          { phrase: 'hidden manufacturing defect', tree: 'DT-14: Hidden defect', chainEventRef: 'E2', triggers: [{ system: 'AMOS', document: 'Defect report and maintenance history', purpose: 'Matkustaja limb 1' }, { system: 'OEM-portal', document: 'OEM failure mode confirmation', purpose: 'Unknown failure mode' }] },
          { phrase: 'Category A', tree: 'DT-05: Technical', chainEventRef: 'E1', triggers: [{ system: 'AMOS', document: 'MEL assessment', purpose: 'Dispatch impossibility' }] }
        ],
        judgmentNodes: [
          { nodeId: 'J1', chainEventRef: 'E2', question: 'Is this a hidden manufacturing defect unknown to the carrier at dispatch (Matkustaja)?', factsFor: 'No prior AD, SB, or maintenance history for this failure mode.', factsAgainst: 'Routine wear or foreseeable maintenance issue — van der Lans.', additionalEvidenceNeeded: 'Full AMOS history; OEM technical confirmation', consequenceIfChainHolds: 'DEFEND_WITH_CONDITIONS on hidden defect.', consequenceIfChainBreaks: 'CONCEDE on ordinary technical.' }
        ],
        verdict: 'DEFEND_WITH_CONDITIONS',
        verdictConditions: ['OEM confirms failure mode was unknown at dispatch', 'Full AMOS maintenance history on file with no prior indication', 'TOPS confirms no undeployed spare aircraft'],
        verdictSub: 'Hidden defect candidate under Matkustaja. OEM confirmation and AMOS history mandatory before DEFEND. Category A alone is not EC.',
        verdictFlags: [
          { type: 'judgment', text: 'Matkustaja hidden defect — OEM confirmation required' },
          { type: 'action', text: 'Pull full AMOS maintenance history' }
        ]
      });
    },

    medical: function (text) {
      return fullResult(text, {
        causationStructure: 'COMPLEX',
        causationStructureReason: 'Medical diversion caused crew OOH and OND — multi-stage chain with reasonable measures at recovery.',
        chain: [
          ev('E1', 'Passenger welfare incident — cardiac arrest, diversion to OPO', { lof: 'OWN_OPERATION', ecCandidate: true, ecReason: 'Mandatory medical diversion — carrier had no choice.', delay: 'unknown', linkReason: 'Medical emergency event.' }),
          ev('E2', 'Crew out of hours after disembarkation and welfare handling', { lof: 'OWN_OPERATION', ecCandidate: false, ecReason: 'FTL follows root cause — not independently EC.', delay: 'unknown', linkReason: 'Consequence of medical diversion duration.' }),
          ev('E3', 'Standby aircraft could not recover — airport curfew at OPO', { lof: 'OWN_OPERATION', ecCandidate: false, ecReason: 'Reasonable measures — curfew constraint.', delay: 'unknown', linkReason: 'Recovery intervention point.' }),
          ev('E4', 'Flight completed following day — OND', { lof: 'OWN_OPERATION', ecCandidate: true, ecReason: 'OND consequence of medical chain.', delay: 'overnight', link: 'FINAL_EVENT', linkReason: 'Sturgeon delay to next-day arrival.' })
        ],
        keywords: [
          { phrase: 'cardiac arrest', tree: 'DT-11: Medical emergency', chainEventRef: 'E1', triggers: [{ system: 'TOPS', document: 'Diversion record', purpose: 'Confirm medical diversion' }, { system: 'Cabin-log', document: 'Welfare incident report', purpose: 'Severity and handling time' }] },
          { phrase: 'OND', tree: 'DT-01: OND', chainEventRef: 'E4', triggers: [{ system: 'TOPS', document: 'Next-day operation', purpose: 'Delay measurement' }] }
        ],
        verdict: 'DEFEND_WITH_CONDITIONS',
        verdictConditions: ['Medical diversion log and cabin welfare report on file', 'Art 9 HOTAC evidenced for OND', 'TOPS confirms standby recovery was genuinely impossible before curfew'],
        verdictSub: 'Medical diversion is strong EC at root. Crew OOH and OND are downstream. Confirm welfare records and Art 9 before response.',
        verdictFlags: [{ type: 'action', text: 'Pull cabin welfare / medical incident report' }, { type: 'action', text: 'Art 9 HOTAC for overnight OND' }]
      });
    },

    security: function (text) {
      return fullResult(text, {
        causationStructure: 'SEQUENTIAL',
        causationStructureReason: 'Authority-mandated security search caused delay.',
        chain: [
          ev('E1', 'Security alert — suspicious item in hold', { lof: 'THIRD_PARTY', ecCandidate: true, ecReason: 'Externally imposed security measure.', delay: 'unknown', linkReason: 'Airport security authority action.' }),
          ev('E2', 'Full hold search and passenger re-screening mandated', { lof: 'THIRD_PARTY', ecCandidate: true, ecReason: 'Direct consequence of security alert.', delay: '3h 45m', linkReason: 'Authority-mandated procedures.' }),
          ev('E3', 'Two passengers offloaded — baggage reconciliation', { lof: 'OWN_OPERATION', ecCandidate: false, ecReason: 'Operational consequence of security event.', delay: 'unknown', link: 'FINAL_EVENT', linkReason: 'Final delay.' })
        ],
        keywords: [{ phrase: 'security alert', tree: 'DT-09: Security', chainEventRef: 'E1', triggers: [{ system: 'Airport-ops', document: 'Security incident log', purpose: 'Authority mandate confirmation' }] }],
        nodes: [
          { id: 'DT-09', type: 'disruption', chainEventRef: 'E1', question: 'Security alert — extraordinary circumstances?', status: 'green', statusLabel: 'EC CONFIRMED', conclusion: 'Authority-mandated security search is externally imposed — EC candidate.', authority: 'Established security EC jurisprudence', dataUsed: 'Airport security log', chainConsequence: 'EC at root if evidenced.' }
        ],
        verdict: 'DEFEND',
        verdictSub: 'Authority-mandated security search. Pull airport security incident log before response.',
        verdictFlags: [{ type: 'action', text: 'Airport security incident log required' }]
      });
    },

    disruptive: function (text) {
      return fullResult(text, {
        causationStructure: 'SEQUENTIAL',
        causationStructureReason: 'Disruptive passenger return-to-gate caused departure and arrival delay.',
        chain: [
          ev('E1', 'Highly disruptive passenger — threatening behaviour toward cabin crew', { lof: 'THIRD_PARTY', ecCandidate: true, ecReason: 'External passenger behaviour — safety event.', delay: 'unknown', linkReason: 'Safety-mandated return to gate.' }),
          ev('E2', 'Return to gate — police met aircraft, passenger offloaded', { lof: 'OWN_OPERATION', ecCandidate: true, ecReason: 'Direct safety response to disruptive passenger.', delay: '1h 55m departure delay', linkReason: 'Mandatory safety procedure.' }),
          ev('E3', 'Baggage reconciliation — arrival delay 2h 10m', { lof: 'OWN_OPERATION', ecCandidate: false, ecReason: 'Operational consequence.', delay: '2h 10m', link: 'FINAL_EVENT', linkReason: 'Passenger delay at destination.' })
        ],
        keywords: [{ phrase: 'disruptive passenger', tree: 'DT-10: Disruptive passenger', chainEventRef: 'E1', triggers: [{ system: 'Cabin-log', document: 'Disruptive passenger report', purpose: 'Confirm threatening behaviour' }, { system: 'Police-log', document: 'Police attendance record', purpose: 'Corroboration' }] }],
        nodes: [
          { id: 'DT-10', type: 'disruption', chainEventRef: 'E1', question: 'Disruptive passenger — extraordinary circumstances?', status: 'green', statusLabel: 'EC CONFIRMED', conclusion: 'Disruptive passenger requiring return to gate is EC — external passenger behaviour.', authority: 'Established disruptive passenger EC', dataUsed: 'Cabin report; police log', chainConsequence: 'EC at root.' }
        ],
        verdict: 'DEFEND',
        verdictSub: 'Disruptive passenger return-to-gate is established EC. Pull cabin report and police attendance record.',
        verdictFlags: [{ type: 'action', text: 'Cabin disruptive passenger report' }]
      });
    }
  };

  function fullResult(text, cfg) {
    var chain = cfg.chain || [];
    chain.forEach(function (e, i) {
      if (!e.ecStatus && e.preliminaryECCandidate === true) { e.ecStatus = 'ESTABLISHED'; e.ecLimb1 = 'SATISFIED'; e.ecLimb2 = 'SATISFIED'; }
      if (e.preliminaryECCandidate === false && !e.ecStatus) e.ecStatus = 'ORDINARY';
    });
    var evidencePack = cfg.evidencePack || buildEvidenceFromChain(chain, cfg.keywords || []);
    return {
      causationStructure: cfg.causationStructure,
      causationStructureReason: cfg.causationStructureReason,
      causalChain: chain,
      timingGaps: cfg.timingGaps || ['Exact CTOT assignment times not stated in ICC summary', 'Crew FDP start time not stated'],
      ambiguities: cfg.ambiguities || [],
      additionalInformationNeeded: cfg.additionalInformationNeeded || ['TOPS delay record', 'DISCO root cause classification'],
      multiCauseFlag: chain.length > 1,
      numberOfDistinctCausalEvents: chain.length,
      keywords: cfg.keywords || [],
      universalHighlighted: highlight(text, (cfg.keywords || []).map(function (k) { return k.phrase; })),
      nodes: cfg.nodes || buildDefaultNodes(text, chain),
      judgmentNodes: cfg.judgmentNodes || [],
      interventionPoints: cfg.interventionPoints || buildInterventions(text, chain),
      dynamicEvidenceRequests: cfg.dynamicEvidenceRequests || [],
      evidencePack: evidencePack,
      reasoningChain: cfg.reasoningChain || buildReasoning(chain, cfg.verdict),
      artNineStatus: artNine(text),
      artEightStatus: artEight(text),
      verdict: cfg.verdict || 'INVESTIGATE',
      verdictConditions: cfg.verdictConditions || [],
      verdictSub: cfg.verdictSub || 'Demo analysis complete — verify evidence pack in Databricks before triage decision.',
      verdictFlags: cfg.verdictFlags || [{ type: 'note', text: 'Demo intelligence — confirm all pulls in Repository before response' }]
    };
  }

  function buildEvidenceFromChain(chain, keywords) {
    var pack = [];
    var seen = {};
    (keywords || []).forEach(function (k) {
      (k.triggers || []).forEach(function (tr) {
        var key = tr.system + tr.document;
        if (seen[key]) return;
        seen[key] = true;
        pack.push(packItem(tr.document, tr.system, k.chainEventRef, { proves: tr.purpose, priority: 'important' }));
      });
    });
    chain.forEach(function (e) {
      if (e.id === 'E1' && !seen['TOPSdelay']) {
        pack.push(packItem('TOPS delay record', 'TOPS', e.id, { proves: 'Delay duration and codes', priority: 'critical' }));
        seen['TOPSdelay'] = true;
      }
    });
    if (!pack.length) pack.push(packItem('TOPS operational delay record', 'TOPS', 'E1', { priority: 'critical' }));
    return pack;
  }

  function buildInterventions(text, chain) {
    var ips = [];
    if (has(text, /\bno standby|\bno spare|\bcould not be rescued|\bnot available/i)) {
      ips.push({ pointId: 'IP1', chainEventRef: 'E' + chain.length, description: 'Standby aircraft / spare tail deployment', evidenceRequired: 'TOPS fleet state', evidenceStatus: 'UNKNOWN', outcome: 'UNKNOWN', legalConsequence: 'U-8 reasonable measures — failure defeats EC', riskLevel: 'amber' });
    }
    if (has(text, /\bstandby crew|\bsby crew|\bno standby crew/i)) {
      ips.push({ pointId: 'IP2', chainEventRef: 'E' + chain.length, description: 'Standby crew deployment', evidenceRequired: 'AIMS standby log', evidenceStatus: 'UNKNOWN', outcome: 'UNKNOWN', legalConsequence: 'Reasonable measures on crew recovery', riskLevel: 'amber' });
    }
    return ips;
  }

  function buildDefaultNodes(text, chain) {
    var nodes = [];
    if (typeof DefendAbleFramework !== 'undefined') {
      DefendAbleFramework.buildUniversalNodes(text).forEach(function (n) {
        nodes.push({
          id: n.id, type: 'universal', chainEventRef: 'ALL',
          question: n.question, status: n.status, statusLabel: n.statusLabel,
          conclusion: n.conclusion, authority: n.authority, dataUsed: n.dataUsed,
          chainConsequence: 'Screened on every case.'
        });
      });
      DefendAbleFramework.detectDefences(text).filter(function (d) { return d.matched; }).forEach(function (d) {
        nodes.push({
          id: d.id, type: 'disruption', chainEventRef: 'E1',
          question: d.name + ' — extraordinary circumstances?',
          status: d.isNegative ? 'red' : 'green',
          statusLabel: d.isNegative ? 'NOT EC' : 'EC CANDIDATE',
          conclusion: d.note || d.authority,
          authority: d.authority,
          dataUsed: (d.evidence || []).join('; '),
          chainConsequence: d.isNegative ? 'EC defence unavailable at this node.' : 'Apply Wallentin-Hermann at linked event.'
        });
      });
    } else {
      nodes.push({ id: 'U-7', type: 'universal', chainEventRef: 'ALL', question: 'Wallentin-Hermann two-limb EC gate', status: 'amber', statusLabel: 'SCREENED', conclusion: 'Both limbs required per event in chain.', authority: 'Wallentin-Hermann C-549/07', dataUsed: 'Disruption trees', chainConsequence: 'Applied per causal event.' });
    }
    nodes.push({ id: 'U-8', type: 'universal', chainEventRef: 'ALL', question: 'Reasonable measures at intervention points?', status: has(text, /\bno standby|\bnot available/i) ? 'amber' : 'green', statusLabel: has(text, /\bno standby/i) ? 'VERIFY' : 'CONFIRM', conclusion: 'Standby aircraft, crew, slot recovery — each intervention point must be evidenced.', authority: 'Wallentin-Hermann para 40', dataUsed: 'AIMS; TOPS', chainConsequence: 'Failed intervention defeats EC even when root is EC.' });
    return nodes;
  }

  function buildReasoning(chain, verdict) {
    var rc = [{ status: 'green', chainEventRef: 'ALL', text: 'Pass 1 decomposed ' + chain.length + ' causal event(s) from ICC summary.', chainConsequence: 'Chain structure drives evidence and legal passes.' }];
    chain.forEach(function (e) {
      rc.push({ status: e.chainBreak ? 'red' : (e.preliminaryECCandidate ? 'green' : 'amber'), chainEventRef: e.id, text: e.description, chainConsequence: e.chainBreakReason || e.preliminaryECReason || '' });
    });
    rc.push({ status: verdict === 'CONCEDE' ? 'red' : verdict === 'DEFEND' || verdict === 'DEFEND_WITH_CONDITIONS' ? 'green' : 'amber', chainEventRef: 'ALL', text: 'Verdict: ' + verdict, chainConsequence: 'Solicitor review required before outbound response.' });
    return rc;
  }

  /* ── Compositional Pass 1 builder ── */
  function buildChainComposable(text) {
    var t = norm(text);
    var events = [];
    var n = 0;
    function add(desc, opts) { n++; events.push(ev('E' + n, desc, opts)); }

    if (has(text, /\bpositioning\b|\bposition\b.*\bcrew\b/i)) {
      add('Crew positioning sector disrupted' + (has(text, /\batc|weather|ctot/i) ? ' by ATC/weather' : ''), { lof: 'POSITIONING', ecCandidate: has(text, /\batc|weather|ctot|atfm/i), ecReason: 'Root cause on positioning sector.', linkReason: 'Positioning prerequisite for operating flight.' });
      if (has(text, /\bfuel leak|\baog\b|\btechnical|\bdefect|\bhydraulic/i)) {
        add('Positioning aircraft AOG / technical event' + (has(text, /\bfuel leak/i) ? ' — fuel leak' : ''), { lof: 'POSITIONING', ecCandidate: false, ecReason: 'Technical on positioning — chain break candidate.', chainBreak: true, chainBreakReason: 'Ordinary technical may intervene — van der Lans.' });
      }
    }
    if (has(text, /\bctot\b|\batc\b|\batfm\b|\beurocontrol\b/i) && !events.length) {
      add('ATC / CTOT / ATFM restriction imposed', { lof: 'THIRD_PARTY', ecCandidate: true, ecReason: 'Third-party flow control.', linkReason: 'External ATC delay.' });
    }
    if (has(text, /\bthunderstorm|\bweather|\bdiversion|\bbelow minima|\blvp\b|\bfog\b/i)) {
      add('Weather disruption' + (has(text, /\bdiversion/i) ? ' — diversion below minima' : has(text, /\blvp|fog/i) ? ' — LVP/fog' : ''), { lof: 'THIRD_PARTY', ecCandidate: true, ecReason: 'Weather below minima or systemic LVP.', linkReason: 'Meteorological external event.' });
    }
    if (has(text, /\bindustrial action|\bstrike\b/i)) {
      var own = has(text, /\bown\b|\bpilot union|\bcabin crew union|\bcarrier own|\bpilot staff participating/i) && !has(text, /\bhandler|\bbaggage|\batc\b|\bthird.party|\bcdg\b/i);
      var handler = has(text, /\bhandler|\bbaggage|\bground staff|\bcdg\b/i);
      add((handler ? 'Third-party ground handler' : own ? 'Own-staff' : 'Third-party') + ' industrial action', { lof: handler || !own ? 'THIRD_PARTY' : 'OWN_OPERATION', ecCandidate: !own, ecReason: own ? 'Krüsemann — own staff NOT EC.' : 'Third-party strike — Pešková EC candidate.', linkReason: 'Industrial action in causal chain.' });
    }
    if (has(text, /\bbirdstrike|\bbird strike|\bingestion\b/i)) {
      add('Birdstrike / engine ingestion', { lof: 'OWN_OPERATION', ecCandidate: true, ecReason: 'Pešková per se EC.', linkReason: 'Wildlife strike.' });
    }
    if (has(text, /\bhidden defect|\bmanufacturing defect|\bcategory a|\bmel dispatch not|\bhydraulic/i) && !has(text, /\bpositioning\b/i)) {
      add('Technical defect / AOG' + (has(text, /\bhidden/i) ? ' — possible hidden defect' : ''), { lof: 'OWN_OPERATION', ecCandidate: has(text, /\bhidden|manufacturing|no prior ad/i), ecReason: has(text, /\bhidden/i) ? 'Matkustaja/Germanwings hidden defect candidate.' : 'Van der Lans — routine technical NOT EC.', linkReason: 'Maintenance event.' });
    }
    if (has(text, /\bsecurity alert|\bsuspicious|\bhold search/i)) {
      add('Security alert — authority-mandated search', { lof: 'THIRD_PARTY', ecCandidate: true, ecReason: 'Externally imposed security.', linkReason: 'Security delay.' });
    }
    if (has(text, /\bdisruptive|\breturned to gate|\bthreatening behaviour/i)) {
      add('Disruptive passenger — return to gate', { lof: 'THIRD_PARTY', ecCandidate: true, ecReason: 'External passenger behaviour.', linkReason: 'Safety event.' });
    }
    if (has(text, /\bmedical|\bcardiac|\bwelfare|\bdiverted.*opo/i)) {
      add('Medical emergency / welfare diversion', { lof: 'OWN_OPERATION', ecCandidate: true, ecReason: 'Mandatory carrier response.', linkReason: 'Medical diversion.' });
    }
    if (has(text, /\blate inbound|\bcascade|\brotation|\bprior rotation/i)) {
      add('Late inbound / cascading rotation delay', { lof: 'OWN_OPERATION', ecCandidate: false, ecReason: 'Cascade NOT EC — root cause at chain start.', linkReason: 'Prior sector impact.' });
    }
    if (has(text, /\bcrew.*\b(hours|ooh|ftl|out of hours|breach)\b|\bftl\b/i)) {
      add('Crew FTL / out-of-hours breach', { lof: 'OWN_OPERATION', ecCandidate: false, ecReason: 'FTL never independently EC — root cause governs.', linkReason: 'Crew limits reached.' });
    }
    if (has(text, /\b18\s*hour|\bwake rule|\bfatigue\b/i)) {
      add('Crew member failed 18-hour wake rule', { lof: 'OWN_OPERATION', ecCandidate: false, ecReason: 'DT-20 — always judgment node.', link: 'DISPUTED', linkReason: 'Wake rule vs carrier recovery timing.' });
    }
    if (has(text, /\bno standby|\bno spare|\bno sby|\bcould not be rescued|\bnot available.*aircraft/i)) {
      add('No standby aircraft / network recovery not possible', { lof: 'OWN_OPERATION', ecCandidate: false, ecReason: 'Reasonable measures — U-8.', linkReason: 'Recovery failure.' });
    }
    if (has(text, /\bno standby crew|\bno sby crew/i)) {
      add('No standby crew available', { lof: 'OWN_OPERATION', ecCandidate: false, ecReason: 'Reasonable measures — AIMS standby log.', linkReason: 'Crew recovery failure.' });
    }
    if (has(text, /\bond\b|\bovernight\b|\bnext day\b|\bfollowing day\b/i)) {
      add('Overnight delay — flight operated next day', { lof: 'OWN_OPERATION', ecCandidate: true, ecReason: 'OND consequence of prior chain — Sturgeon to next-day arrival.', delay: 'overnight', link: 'FINAL_EVENT', linkReason: 'Final passenger outcome.' });
    }
    if (has(text, /\bcancel/i) && !has(text, /\bond|next day/i)) {
      add('Flight cancelled', { lof: 'OWN_OPERATION', ecCandidate: false, ecReason: 'Cancellation — apply Art 5 notice and EC trees.', link: 'FINAL_EVENT' });
    }

    if (!events.length) {
      add('Operational disruption — type not fully specified in ICC summary', { lof: 'UNKNOWN', ecCandidate: false, ecReason: 'Insufficient detail — pull TOPS and DISCO.', link: 'FINAL_EVENT' });
    }

    var structure = 'SEQUENTIAL';
    if (events.length >= 4) structure = 'COMPLEX';
    else if (has(text, /\bsimultaneous|\bconcurrent|\blvp.*hydraulic|hydraulic.*lvp/i)) structure = 'CONCURRENT';
    else if (events.some(function (e) { return e.chainBreak; })) structure = 'INTERVENING';

    return { events: events, structure: structure };
  }

  function buildKeywords(text, chain) {
    var kws = [];
    var rules = [
      { re: /\bctot\b|\batfm\b|\batc delay/i, phrase: 'ATC/CTOT', tree: 'DT-01: ATC/ATFM' },
      { re: /\bindustrial action|\bstrike\b/i, phrase: 'industrial action', tree: 'DT-07: Industrial action' },
      { re: /\bhandler|\bbaggage/i, phrase: 'baggage handler', tree: 'DT-07: Third-party handler' },
      { re: /\bpositioning\b/i, phrase: 'positioning', tree: 'DT-18: Positioning' },
      { re: /\b18\s*hour|\bwake rule/i, phrase: '18 hour wake rule', tree: 'DT-20: Wake rule' },
      { re: /\bond\b|\bovernight|\bnext day/i, phrase: 'OND', tree: 'DT-01: OND/curfew' },
      { re: /\bbirdstrike/i, phrase: 'birdstrike', tree: 'DT-04: Birdstrike' },
      { re: /\bweather|\bthunderstorm|\blvp|\bdiversion/i, phrase: 'weather', tree: 'DT-02/DT-03: Weather' },
      { re: /\bhidden defect|\bmanufacturing/i, phrase: 'hidden defect', tree: 'DT-14: Hidden defect' },
      { re: /\bno standby|\bno spare/i, phrase: 'no standby aircraft', tree: 'U-8: Reasonable measures' }
    ];
    var ref = chain[0] ? chain[0].id : 'E1';
    rules.forEach(function (r) {
      if (r.re.test(norm(text))) {
        kws.push({ phrase: r.phrase, tree: r.tree, chainEventRef: ref, triggers: [{ system: 'TOPS', document: 'Operational record', purpose: 'Corroborate ' + r.phrase }] });
      }
    });
    return kws;
  }

  function resolveVerdict(text, chain, judgmentNodes) {
    if (has(text, /\bown\b.*\bstrike|\bpilot union|\bpilot staff participating|\bown pilot|\bown staff strike/i) && !has(text, /\bhandler|\batc industrial|\bthird.party/i)) return { v: 'CONCEDE', sub: 'Own-staff industrial action — Krüsemann. Not EC. Concede and review quantum/Art 8 only.', conditions: [] };
    if (has(text, /\bcrew illness|\bpilot sick|\bcaptain sick|\bcrew sick/i)) return { v: 'CONCEDE', sub: 'Crew illness — Lipton [2024] UKSC 24. Not EC.', conditions: [] };
    if (has(text, /\bpositioning\b/) && (has(text, /\bfuel leak|\b18\s*hour|\bwake rule/i) || chain.length >= 4)) return { v: 'JUDGMENT_REQUIRED', sub: 'Positioning complex chain — J1/J2 judgment nodes outstanding before DEFEND.', conditions: [] };
    if (has(text, /\batc\b|\bctot\b/i) && has(text, /\bhandler|\bbaggage.*industrial|\bindustrial.*handler/i)) return { v: 'DEFEND_WITH_CONDITIONS', sub: 'ATC plus third-party handler strike — strong EC candidates. Confirm DISCO third-party classification and reasonable measures.', conditions: ['DISCO confirms handler strike is third-party', 'TOPS fleet state confirms no undeployed spare aircraft', 'Art 9 HOTAC for OND if applicable'] };
    if (has(text, /\bctot\b|\batfm\b|\batc restriction/i) && has(text, /\bond\b|\bnext day\b/i)) return { v: 'DEFEND_WITH_CONDITIONS', sub: 'ATC/ATFM EC with OND — confirm Art 9 and Art 8.', conditions: ['HOTAC records on file', 'Art 8 offer evidenced'] };
    if (has(text, /\bctot\b|\batfm\b|\bbirdstrike/i)) return { v: 'DEFEND', sub: 'Strong per se or established EC candidate. Pull evidence pack before response.', conditions: [] };
    if (has(text, /\bhidden defect|\bmanufacturing defect|\bno prior ad/i)) return { v: 'DEFEND_WITH_CONDITIONS', sub: 'Hidden defect candidate — Matkustaja C-385/23. OEM and AMOS compliance required.', conditions: ['OEM confirms unknown failure mode', 'Full AMOS maintenance history on file'] };
    if (has(text, /\blvp\b.*\bhydraulic|hydraulic.*\blvp|simultaneous/i)) return { v: 'JUDGMENT_REQUIRED', sub: 'Concurrent causes — neither alone may cross 3-hour threshold. Dominant cause judgment required.', conditions: [] };
    if (judgmentNodes && judgmentNodes.length) return { v: 'JUDGMENT_REQUIRED', sub: judgmentNodes.length + ' judgment node(s) require human decision or further evidence.', conditions: [] };
    if (chain.some(function (e) { return e.chainBreak; })) return { v: 'JUDGMENT_REQUIRED', sub: 'Chain break candidate identified — do not DEFEND until resolved.', conditions: [] };
    return { v: 'INVESTIGATE', sub: 'Keywords and chain identified. Pull evidence pack and complete legal review before triage.', conditions: [] };
  }

  function matchCurated(text) {
    var t = norm(text);
    if (has(text, /\bpositioning\b/) && has(text, /\b18\s*hour|\bwake rule|\bfuel leak|\baog\b/i)) return CURATED.positioning(text);
    if (has(text, /\bown\b.*\bstrike|\bpilot union|\bpilot staff participating/i) && !has(text, /\bhandler|\batc industrial/i)) return CURATED.ownStrike(text);
    if ((has(text, /\bhandler|\bbaggage handler/i) && has(text, /\bindustrial|strike/i)) || (has(text, /\bcdg\b/i) && has(text, /\bindustrial|strike/i))) {
      if (has(text, /\batc|ctot|delay/i)) return CURATED.atcHandlerOnd(text);
    }
    if (has(text, /\bctot\b|\batfm\b/i) && has(text, /\bond\b|\bnext day\b/i) && !has(text, /\bindustrial|strike|handler/i)) return CURATED.atc(text);
    if (t.indexOf('flight delayed ltn due to eurocontrol ctot') >= 0) return CURATED.atc(text);
    if (has(text, /\bthunderstorm|\bdiversion.*valencia|\bbelow minima/i)) return CURATED.weather(text);
    if (has(text, /\bbirdstrike|\bbird strike|\bingestion\b/i)) return CURATED.birdstrike(text);
    if (has(text, /\batc industrial action\b/i) || (has(text, /\bindustrial action\b/i) && has(text, /\batc\b|\batfm\b|\beurocontrol\b/i) && !has(text, /\bhandler|\bbaggage/i))) return CURATED.industrialThirdParty(text);
    if (has(text, /\blate inbound|\bcascade|\bprior rotation/i) && has(text, /\bftl\b|\bout of hours|\bcrew.*limit/i)) return CURATED.cascade(text);
    if (has(text, /\bhidden.*defect|\bmanufacturing defect|\bcategory a\b/i) || (has(text, /\bhydraulic\b/i) && has(text, /\bmel dispatch not\b/i))) return CURATED.technical(text);
    if (has(text, /\bmedical|\bcardiac|\bwelfare\b/i) && has(text, /\bdivert/i)) return CURATED.medical(text);
    if (has(text, /\bsecurity alert|\bsuspicious item|\bhold search/i)) return CURATED.security(text);
    if (has(text, /\bdisruptive passenger|\bthreatening behaviour|\breturned to gate/i)) return CURATED.disruptive(text);
    return null;
  }

  function analyze(text) {
    var curated = matchCurated(text);
    if (curated) return curated;

    var built = buildChainComposable(text);
    var chain = built.events;
    var keywords = buildKeywords(text, chain);
    var judgmentNodes = [];
    if (has(text, /\b18\s*hour|\bwake rule/i)) {
      judgmentNodes.push({ nodeId: 'J1', chainEventRef: chain[chain.length - 1].id, question: 'Was 18-hour wake rule failure caused by EC root timing or carrier operational delay?', factsFor: 'AIMS shows exhaustion solely from external EC delays.', factsAgainst: 'Replacement crew sourcing delayed beyond reasonable window.', additionalEvidenceNeeded: 'AIMS FDP and rest audit', consequenceIfChainHolds: 'Chain may hold through DT-20.', consequenceIfChainBreaks: 'Reasonable measures failure at crew recovery.' });
    }
    if (chain.some(function (e) { return e.chainBreak; })) {
      judgmentNodes.push({ nodeId: 'J2', chainEventRef: chain.find(function (e) { return e.chainBreak; }).id, question: 'Does the intervening ordinary event break the EC chain from the root cause?', factsFor: 'But-for test may still connect root EC to final delay.', factsAgainst: 'Ordinary technical/operational event intervenes — van der Lans.', additionalEvidenceNeeded: 'AMOS/TOPS/DISCO root cause records', consequenceIfChainHolds: 'EC defence may survive.', consequenceIfChainBreaks: 'SETTLE on ordinary cause.' });
    }
    var vd = resolveVerdict(text, chain, judgmentNodes);
    return fullResult(text, {
      causationStructure: built.structure,
      causationStructureReason: chain.length + ' event(s) identified from ICC keywords and operational patterns.',
      chain: chain,
      keywords: keywords,
      judgmentNodes: judgmentNodes,
      verdict: vd.v,
      verdictConditions: vd.conditions,
      verdictSub: vd.sub
    });
  }

  function toPasses(result) {
    var pass1 = {
      causationStructure: result.causationStructure,
      causationStructureReason: result.causationStructureReason,
      causalChain: result.causalChain,
      timingGaps: result.timingGaps,
      ambiguities: result.ambiguities,
      additionalInformationNeeded: result.additionalInformationNeeded,
      multiCauseFlag: result.multiCauseFlag,
      numberOfDistinctCausalEvents: result.numberOfDistinctCausalEvents
    };
    var pass2 = {
      updatedCausalChain: result.causalChain,
      evidencePack: result.evidencePack,
      dynamicEvidenceRequests: result.dynamicEvidenceRequests,
      interventionPoints: result.interventionPoints,
      artNineStatus: result.artNineStatus,
      artEightStatus: result.artEightStatus
    };
    return { pass1: pass1, pass2: pass2, pass3: result };
  }

  function runDemo(text, onProgress) {
    onProgress = onProgress || function () {};
    return (async function () {
      onProgress('pass', 1);
      await delay(700);
      var result = analyze(text);
      var passes = toPasses(result);
      onProgress('pass1', passes.pass1);
      await delay(800);
      onProgress('pass', 2);
      await delay(700);
      onProgress('pass2', passes.pass2);
      await delay(800);
      onProgress('pass', 3);
      await delay(700);
      onProgress('done', result, passes);
      return { result: result, pass1: passes.pass1, pass2: passes.pass2, pass3: passes.pass3 };
    })();
  }

  return { analyze: analyze, runDemo: runDemo, toPasses: toPasses };
})();
