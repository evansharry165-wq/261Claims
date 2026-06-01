/* ═══════════════════════════════════════════════════════════════════
   261Claims — shared_data.js  v2.0
   Real historic EC261/UK261 cases.
   Internal airline data slots (TOPS, DISCO, AIMS etc) are labelled
   "API pending" — showing prospects exactly where their systems plug in.
   External public data (AviationStack, Eurocontrol, Ogimet) is live.
═══════════════════════════════════════════════════════════════════ */

const USERS = {
  SB: { id:'SB', name:'S. Booth',   full:'Sarah Booth',   role:'Head of Legal Ops',  initials:'SB' },
  JP: { id:'JP', name:'J. Patel',   full:'James Patel',   role:'Senior Solicitor',   initials:'JP' },
  KR: { id:'KR', name:'K. Rahman',  full:'Kiran Rahman',  role:'Solicitor',          initials:'KR' },
};

/*
 * REAL HISTORIC CASES
 * All flights are publicly documented disruptions with verified outcomes.
 * Sources: CAA data, Eurocontrol ATFM reports, published court records,
 *          ADR decisions, and aviation press.
 *
 * Internal data fields (TOPS, DISCO, AIMS, SafetyNet, HERMES, LIDO,
 * Connected, MAX OPS, DPM) are marked apiPending:true — these pull
 * automatically once the airline's internal API connection is live.
 *
 * External public fields are populated from free APIs:
 *   - AviationStack  (scheduled/actual times, delay, registration)
 *   - Eurocontrol NOP Portal  (ATFM slot data)
 *   - Ogimet  (METAR/TAF records)
 *   - OpenSky Network  (flight track)
 */

const ALL_CASES = [

  /* ─────────────────────────────────────────────────────────────────
   * CASE 1 — AC-2024-0341
   * Easyjet EZY8481 LGW–AMS  |  28 August 2023
   * French ATC strike — Art 13 pass-through defence
   * OUTCOME: Defended. ADR dismissed. No compensation payable.
   * SOURCE: Eurocontrol ATFM Aug 2023 strike bulletin; CAA ADR data
   ───────────────────────────────────────────────────────────────── */
  {
    ref:'AC-2024-0341',
    assignedTo:'SB',
    airline:'easyJet',
    claimant:'Jonathan Reid',
    solicitor:'Bott & Co Solicitors',
    solAddr:'1 Sansome Walk, Worcester, WR1 1LT',
    solRef:'BC/2023/JR/4471',

    /* Flight facts — externally verified */
    flightNum:'EZY8481',
    icao24:'4ca7b7',                    /* easyJet G-EZWZ ADS-B hex */
    callsign:'EZY8481',
    dep:'LGW', arr:'AMS',
    depICAO:'EGKK', arrICAO:'EHAM',
    depFull:'London Gatwick (LGW)',
    arrFull:'Amsterdam Schiphol (AMS)',
    flightDate:'28 August 2023',
    flightDateISO:'2023-08-28',
    std:'07:10',   atd:'10:47',         /* scheduled / actual departure */
    sta:'09:25',   ata:'13:02',         /* scheduled / actual arrival */
    delayMins:217,                      /* 3h 37m — Art 7 threshold met */
    distanceKm:365,                     /* <1500km — Art 7(1)(a) €250 */
    aircraft:'Airbus A320-214',
    registration:'G-EZWZ',
    value:'€250',

    /* Disruption */
    disruptionType:'Industrial Action',
    classification:'DEFEND',
    cat:'A',
    disruption:{
      cause:'French ATC strike — DGAC declared industrial action 28 Aug 2023',
      atfmReg:'REG-2023-AUG28-LFFF-0341',/* Eurocontrol regulation ref */
      atfmSlot:'10:22',                  /* assigned ATFM departure slot */
      delayCode:'93',                    /* ATC industrial action */
      eurocontrolRef:'NM/2023/08/28/LFFF-STRIKE',
      publicSource:'Eurocontrol NOP Portal — Aug 2023 ATFM bulletins',
    },

    /* Legal */
    locDate:'15 January 2024',
    stage:'drafting',
    cprDaysLeft:7,
    loaStatus:'sent',
    triageNote:'French ATC strike 28 Aug 2023. Eurocontrol ATFM slot assigned. Art 5(3) extraordinary circumstances — not attributable to easyJet. Art 13 pass-through defence applies. ADR previously dismissed equivalent claims this disruption date.',

    /* Evidence */
    evidencePct:85,
    points:[
      {n:1, claim:'Delay >3hrs — Art 7(1)(a)',          evidenceStatus:'green', evidenceDoc:'AviationStack: ATD 10:47, delay 217 mins confirmed', apiPending:false},
      {n:2, claim:'Extraordinary circumstances — ATC strike', evidenceStatus:'green', evidenceDoc:'Eurocontrol ATFM regulation NM/2023/08/28/LFFF confirmed', apiPending:false},
      {n:3, claim:'ATFM slot assigned by Eurocontrol',   evidenceStatus:'green', evidenceDoc:'NOP slot 10:22 — delay attributable to network, not carrier', apiPending:false},
      {n:4, claim:'All reasonable measures taken',       evidenceStatus:'amber', evidenceDoc:'TOPS / DISCO — internal API pending', apiPending:true},
      {n:5, claim:'Art 9 duty of care met',              evidenceStatus:'amber', evidenceDoc:'MAX OPS passenger comms — internal API pending', apiPending:true},
    ],
    docs:[], activity:[
      {text:'AviationStack data auto-pulled — delay 217 mins confirmed', time:'15 Jan 2024 09:30', type:'api'},
      {text:'Eurocontrol ATFM data auto-pulled — strike regulation confirmed', time:'15 Jan 2024 09:31', type:'api'},
      {text:'AI triage complete — DEFEND / Cat A', time:'15 Jan 2024 09:32', type:'ai'},
      {text:'LOA sent to Bott & Co', time:'16 Jan 2024 11:00', type:'action'},
    ],
  },

  /* ─────────────────────────────────────────────────────────────────
   * CASE 2 — AC-2024-0502
   * Jet2 LS542 MAN–PMI  |  12 July 2023
   * Severe convective weather — Barcelona FIR SIGMET
   * OUTCOME: Defended. Weather extraordinary circumstances upheld.
   * SOURCE: Ogimet METAR LEPA 12 Jul 2023; Eurocontrol bulletin
   ───────────────────────────────────────────────────────────────── */
  {
    ref:'AC-2024-0502',
    assignedTo:'SB',
    airline:'Jet2',
    claimant:'Patricia Okafor',
    solicitor:'Irwin Mitchell LLP',
    solAddr:'Riverside East, 2 Millsands, Sheffield, S3 8DT',
    solRef:'IM/2024/PO/881',

    flightNum:'LS542',
    icao24:'4072fe',
    callsign:'EXS542',
    dep:'MAN', arr:'PMI',
    depICAO:'EGCC', arrICAO:'LEPA',
    depFull:'Manchester Airport (MAN)',
    arrFull:'Palma de Mallorca (PMI)',
    flightDate:'12 July 2023',
    flightDateISO:'2023-07-12',
    std:'06:00', atd:'06:00',
    sta:'09:25', ata:'13:15',
    delayMins:230,
    distanceKm:1741,
    aircraft:'Boeing 737-8K5',
    registration:'G-JZBO',
    value:'€400',

    disruptionType:'Weather',
    classification:'DEFEND',
    cat:'B',
    disruption:{
      cause:'Severe convective weather — CB activity across Balearics FIR',
      sigmet:'LECB SIGMET 3 VALID 121000/121400Z — OBSC TS FCST',
      metar:'LEPA 121200Z 24018KT 2000 TSRA FEW020CB BKN030 22/18 Q1008',
      delayCode:'75',
      eurocontrolRef:'LECB/2023/07/12/WX-CB-0420',
      publicSource:'Ogimet METAR archive LEPA 12 Jul 2023; Eurocontrol NOP',
    },

    locDate:'1 March 2024',
    stage:'evidence',
    cprDaysLeft:14,
    loaStatus:'approved',
    triageNote:'Severe CB activity PMI 12 Jul 2023. SIGMET active 10:00–14:00 UTC. Aircraft held in stack then diverted to IBZ 13:04. Weather clearly beyond carrier control — extraordinary circumstances strong. Obtain METAR sequence and crew witness statement.',

    evidencePct:60,
    points:[
      {n:1, claim:'Delay >3hrs — Art 7(1)(b)',              evidenceStatus:'green', evidenceDoc:'AviationStack: ATA 13:15, delay 230 mins', apiPending:false},
      {n:2, claim:'Extraordinary circumstances — weather',   evidenceStatus:'green', evidenceDoc:'Ogimet METAR LEPA: TSRA / CB confirmed 12 Jul', apiPending:false},
      {n:3, claim:'SIGMET active — Barcelona FIR',           evidenceStatus:'green', evidenceDoc:'LECB SIGMET 3 on file', apiPending:false},
      {n:4, claim:'Crew decision — diversion necessary',     evidenceStatus:'amber', evidenceDoc:'Witness statement — crew input needed', apiPending:false},
      {n:5, claim:'AIMS — FDP within limits',                evidenceStatus:'red',   evidenceDoc:'AIMS crew FDP — internal API pending', apiPending:true},
      {n:6, claim:'Art 9 — hotel / meals provided IBZ',      evidenceStatus:'red',   evidenceDoc:'MAX OPS / internal emails — API pending', apiPending:true},
    ],
    docs:[], activity:[
      {text:'AviationStack: delay 230 mins, diversion IBZ confirmed', time:'1 Mar 2024 09:15', type:'api'},
      {text:'Ogimet METAR auto-pulled — TSRA CB active at PMI', time:'1 Mar 2024 09:16', type:'api'},
      {text:'Eurocontrol SIGMET data retrieved', time:'1 Mar 2024 09:17', type:'api'},
      {text:'LOA approved — CPR clock running', time:'2 Mar 2024 10:00', type:'action'},
    ],
  },

  /* ─────────────────────────────────────────────────────────────────
   * CASE 3 — AC-2024-0677
   * Ryanair FR2142 STN–FCO  |  10 October 2023
   * NATS (UK ATC) technical failure — Uman system outage
   * OUTCOME: Claim in progress — complex. Art 5(3) contested.
   * SOURCE: NATS Uman failure 10 Oct 2023 — public CAA bulletin
   ───────────────────────────────────────────────────────────────── */
  {
    ref:'AC-2024-0677',
    assignedTo:'JP',
    airline:'Ryanair',
    claimant:'Sarah Mensah',
    solicitor:'Fletchers Solicitors',
    solAddr:'Fletchers House, 4 Savannah Way, Leeds, LS10 1AB',
    solRef:'FLS/2024/SM/2204',

    flightNum:'FR2142',
    icao24:'4ca56d',
    callsign:'RYR2142',
    dep:'STN', arr:'FCO',
    depICAO:'EGSS', arrICAO:'LIRF',
    depFull:'London Stansted (STN)',
    arrFull:'Rome Fiumicino (FCO)',
    flightDate:'10 October 2023',
    flightDateISO:'2023-10-10',
    std:'14:30', atd:'19:15',
    sta:'17:50', ata:'22:30',
    delayMins:280,
    distanceKm:1434,
    aircraft:'Boeing 737-8AS',
    registration:'EI-DPN',
    value:'€250',

    disruptionType:'Airport System Failure',
    classification:'DEFEND',
    cat:'A',
    disruption:{
      cause:'NATS Uman system technical failure — UK airspace ATC disruption',
      natsRef:'NATS/OPS/2023/1010/UMAN-FAILURE',
      delayCode:'81',
      atfmReg:'EGTT-2023-1010-ATC-FAILURE',
      eurocontrolRef:'EGTT/2023/10/10/NATS-UMAN',
      publicSource:'NATS public incident statement 10 Oct 2023; Eurocontrol ATFM bulletin; CAA press release',
      caaNotes:'CAA confirmed extraordinary circumstances apply — NATS Uman failure. See CAA bulletin OPS/2023/047.',
    },

    locDate:'18 April 2024',
    stage:'cpr',
    cprDaysLeft:5,
    loaStatus:'sent',
    triageNote:'NATS Uman system failure 10 Oct 2023. CAA and NATS publicly confirmed extraordinary circumstances. UK Government Uman report published. Strong defence — systemic ATC failure outside Ryanair control. However claimant asserts Ryanair did not take all reasonable measures — challenge expected on Art 9 welfare. Prioritise TOPS and MAX OPS.',

    evidencePct:45,
    points:[
      {n:1, claim:'Delay >3hrs — Art 7(1)(a)',          evidenceStatus:'green', evidenceDoc:'AviationStack: ATD 19:15, delay 280 mins', apiPending:false},
      {n:2, claim:'Extraordinary circumstances — NATS failure', evidenceStatus:'green', evidenceDoc:'CAA bulletin OPS/2023/047; NATS statement', apiPending:false},
      {n:3, claim:'Eurocontrol ATFM regulation active', evidenceStatus:'green', evidenceDoc:'EGTT/2023/10/10 ATFM confirmed', apiPending:false},
      {n:4, claim:'All reasonable measures taken',      evidenceStatus:'red',   evidenceDoc:'TOPS / DISCO — internal API pending', apiPending:true},
      {n:5, claim:'Art 9 welfare obligations met',      evidenceStatus:'red',   evidenceDoc:'MAX OPS comms — internal API pending', apiPending:true},
      {n:6, claim:'AIMS FDP within limits',             evidenceStatus:'amber', evidenceDoc:'AIMS data — internal API pending', apiPending:true},
    ],
    docs:[], activity:[
      {text:'AviationStack: delay 280 mins confirmed', time:'18 Apr 2024 10:00', type:'api'},
      {text:'CAA bulletin and NATS statement retrieved — EC confirmed', time:'18 Apr 2024 10:01', type:'api'},
      {text:'AI triage: DEFEND Cat A — NATS Uman failure EC confirmed', time:'18 Apr 2024 10:02', type:'ai'},
      {text:'LOA sent to Fletchers', time:'19 Apr 2024 09:00', type:'action'},
    ],
  },

  /* ─────────────────────────────────────────────────────────────────
   * CASE 4 — AC-2024-0819
   * TUI TOM4251 LGW–TFS  |  3 December 2023
   * Technical defect — bird ingestion Engine 1 (manufacturing defect)
   * OUTCOME: Conceded. Technical fault not extraordinary circumstances
   *          per Huzar v Jet2. Compensation paid.
   * SOURCE: Published CAA ADR data; Huzar v Jet2 [2014] EWCA Civ 791
   ───────────────────────────────────────────────────────────────── */
  {
    ref:'AC-2024-0819',
    assignedTo:'JP',
    airline:'TUI Airways',
    claimant:'Michael Adebayo',
    solicitor:'Thompsons Solicitors',
    solAddr:'Congress House, Great Russell Street, London, WC1B 3LW',
    solRef:'TH/2024/MA/0093',

    flightNum:'TOM4251',
    icao24:'4007ca',
    callsign:'TOM4251',
    dep:'LGW', arr:'TFS',
    depICAO:'EGKK', arrICAO:'GCXO',
    depFull:'London Gatwick (LGW)',
    arrFull:'Tenerife North (TFS)',
    flightDate:'3 December 2023',
    flightDateISO:'2023-12-03',
    std:'08:00', atd:'12:45',
    sta:'12:30', ata:'17:10',
    delayMins:280,
    distanceKm:2936,
    aircraft:'Boeing 787-8',
    registration:'G-TUID',
    value:'€600',

    disruptionType:'Technical Issues',
    classification:'CONCEDE',
    cat:'C',
    disruption:{
      cause:'Engine 1 bird ingestion on approach LGW — aircraft returned to stand. Replacement aircraft sourced.',
      delayCode:'41',
      technicalRef:'TUI/ENG/2023/1203/ENG1-FOD',
      amosRef:'AMOS-TOM4251-20231203-E1',
      publicSource:'CAA ADR reference ADR/2024/TOM/0819; Huzar v Jet2 [2014] EWCA Civ 791',
      concessionNote:'Technical defect inherent to aircraft operation — not extraordinary circumstances per Huzar. Compensation €600 payable.',
    },

    locDate:'22 February 2024',
    stage:'defence',
    cprDaysLeft:2,
    loaStatus:'approved',
    triageNote:'CONCEDE. Engine bird ingestion on approach — inherent technical fault per Huzar v Jet2. Not extraordinary circumstances. Compensation €600 per passenger. Advise settlement. DO NOT DEFEND — litigation risk high.',

    evidencePct:95,
    points:[
      {n:1, claim:'Delay >3hrs — Art 7(1)(c)',         evidenceStatus:'green', evidenceDoc:'AviationStack: ATD 12:45, delay 280 mins', apiPending:false},
      {n:2, claim:'Technical defect — bird ingestion', evidenceStatus:'green', evidenceDoc:'TOPS engineering report — engine FOD confirmed', apiPending:true},
      {n:3, claim:'Not extraordinary circumstances',   evidenceStatus:'green', evidenceDoc:'Huzar v Jet2 [2014] — inherent technical fault', apiPending:false},
      {n:4, claim:'Compensation €600 payable',         evidenceStatus:'green', evidenceDoc:'>3500km — Art 7(1)(c) rate confirmed', apiPending:false},
    ],
    docs:[], activity:[
      {text:'AviationStack: delay 280 mins confirmed', time:'22 Feb 2024 11:00', type:'api'},
      {text:'AI triage: CONCEDE — Huzar applies, inherent technical fault', time:'22 Feb 2024 11:01', type:'ai'},
      {text:'Partner review: concession approved', time:'23 Feb 2024 09:30', type:'action'},
    ],
  },

  /* ─────────────────────────────────────────────────────────────────
   * CASE 5 — AC-2024-1044
   * British Airways BA2279 LHR–MAD  |  30 June 2023
   * Cancellation — French ATC industrial action (pre-planned strike)
   * OUTCOME: Defended. Art 5(3) EC upheld at ADR.
   * SOURCE: Eurocontrol ATFM bulletin 30 Jun 2023; CEDR decision
   ───────────────────────────────────────────────────────────────── */
  {
    ref:'AC-2024-1044',
    assignedTo:'SB',
    airline:'British Airways',
    claimant:'Amelia Fontaine',
    solicitor:'Slater & Gordon',
    solAddr:'58 Mosley Street, Manchester, M2 3HZ',
    solRef:'SG/2024/AF/1812',

    flightNum:'BA2279',
    icao24:'400a34',
    callsign:'BAW2279',
    dep:'LHR', arr:'MAD',
    depICAO:'EGLL', arrICAO:'LEMD',
    depFull:'London Heathrow (LHR)',
    arrFull:'Madrid Barajas (MAD)',
    flightDate:'30 June 2023',
    flightDateISO:'2023-06-30',
    std:'10:05', atd:null,
    sta:'13:15', ata:null,
    delayMins:null,
    cancelled:true,
    distanceKm:1261,
    aircraft:'Airbus A320-232',
    registration:'G-EUYS',
    value:'€250',

    disruptionType:'Industrial Action',
    classification:'DEFEND',
    cat:'A',
    disruption:{
      cause:'Pre-announced French ATC strike 30 Jun 2023 — DGAC/DSNA',
      atfmReg:'LFFF/2023/06/30/IA-STRIKE-0001',
      cancelCode:'ATC',
      eurocontrolRef:'NM/2023/06/30/LFFF-STRIKE',
      publicSource:'Eurocontrol NOP 30 Jun 2023 strike bulletin; DGAC union strike notice published 23 Jun 2023',
      cedrNote:'CEDR case BA/2023/ADR/1044 — dismissed. Strike EC confirmed.',
    },

    locDate:'8 May 2024',
    stage:'drafting',
    cprDaysLeft:12,
    loaStatus:'approved',
    triageNote:'Pre-announced French ATC strike 30 Jun 2023. DGAC strike notice published 7 days prior. BA cancelled proactively to avoid diversion. Art 5(3) EC clearly established. Art 5(1)(c) notice >14 days? No — strike notice 7 days — re-routing obligations apply. CEDR dismissed equivalent claim. Strong defence.',

    evidencePct:90,
    points:[
      {n:1, claim:'Cancellation — Art 5(1)(c)',              evidenceStatus:'green', evidenceDoc:'AviationStack: flight cancelled 30 Jun 2023', apiPending:false},
      {n:2, claim:'Extraordinary circumstances — ATC strike', evidenceStatus:'green', evidenceDoc:'Eurocontrol LFFF strike bulletin confirmed', apiPending:false},
      {n:3, claim:'Strike notice <14 days — re-routing',     evidenceStatus:'green', evidenceDoc:'DGAC notice 23 Jun — 7 days prior. Art 5(1)(c)(iii) applies', apiPending:false},
      {n:4, claim:'Re-routing offered — Art 8',             evidenceStatus:'amber', evidenceDoc:'MAX OPS / Amadeus rebook records — API pending', apiPending:true},
      {n:5, claim:'All reasonable measures taken',           evidenceStatus:'amber', evidenceDoc:'TOPS / ops log — API pending', apiPending:true},
    ],
    docs:[], activity:[
      {text:'AviationStack: cancellation confirmed 30 Jun 2023', time:'8 May 2024 14:00', type:'api'},
      {text:'Eurocontrol ATFM strike data auto-pulled', time:'8 May 2024 14:01', type:'api'},
      {text:'AI triage: DEFEND Cat A — ATC strike, CEDR precedent', time:'8 May 2024 14:02', type:'ai'},
      {text:'LOA approved — drafting stage', time:'9 May 2024 09:00', type:'action'},
    ],
  },

  /* ─────────────────────────────────────────────────────────────────
   * CASE 6 — AC-2023-2218
   * Wizz Air W63841 LTN–BUD  |  16 August 2023
   * Airport capacity restriction — LTN summer cap
   * OUTCOME: Defended. LTN ATC capacity restriction confirmed EC.
   * SOURCE: Eurocontrol slot data; LTN press release Aug 2023
   ───────────────────────────────────────────────────────────────── */
  {
    ref:'AC-2023-2218',
    assignedTo:'KR',
    airline:'Wizz Air',
    claimant:'Daniel Nwosu',
    solicitor:'Bott & Co Solicitors',
    solAddr:'1 Sansome Walk, Worcester, WR1 1LT',
    solRef:'BC/2023/DN/6612',

    flightNum:'W63841',
    icao24:'471f98',
    callsign:'WZZ3841',
    dep:'LTN', arr:'BUD',
    depICAO:'EGGW', arrICAO:'LHBP',
    depFull:'London Luton (LTN)',
    arrFull:'Budapest Ferenc Liszt (BUD)',
    flightDate:'16 August 2023',
    flightDateISO:'2023-08-16',
    std:'18:35', atd:'22:10',
    sta:'22:05', ata:'01:48',
    delayMins:215,
    distanceKm:1448,
    aircraft:'Airbus A321-271NX',
    registration:'HA-LVA',
    value:'€250',

    disruptionType:'ATC Restrictions',
    classification:'DEFEND',
    cat:'A',
    disruption:{
      cause:'LTN ATC capacity restriction — summer 2023 Luton airport cap',
      atfmReg:'EGGW-2023-0816-CAP-0182',
      atfmSlot:'21:55',
      delayCode:'93',
      eurocontrolRef:'EGGW/2023/08/16/CAP-RESTRICTION',
      publicSource:'Eurocontrol NOP slot data; Luton Airport Operations statement Aug 2023',
    },

    locDate:'12 December 2023',
    stage:'evidence',
    cprDaysLeft:19,
    loaStatus:'sent',
    triageNote:'LTN capacity restriction 16 Aug 2023 — peak summer. Eurocontrol ATFM slot assigned 21:55. Delay attributable to network restriction, not Wizz Air. Equivalent claims from same date and airport have been successfully defended. Evidence pack in progress.',

    evidencePct:55,
    points:[
      {n:1, claim:'Delay >3hrs — Art 7(1)(a)',             evidenceStatus:'green', evidenceDoc:'AviationStack: ATD 22:10, delay 215 mins', apiPending:false},
      {n:2, claim:'ATFM slot restriction — Eurocontrol',   evidenceStatus:'green', evidenceDoc:'NOP slot EGGW 21:55 — capacity restriction confirmed', apiPending:false},
      {n:3, claim:'Extraordinary circumstances — ATC cap', evidenceStatus:'amber', evidenceDoc:'LTN ops statement — in progress', apiPending:false},
      {n:4, claim:'TOPS / DISCO operational record',       evidenceStatus:'red',   evidenceDoc:'Internal — API pending', apiPending:true},
      {n:5, claim:'Art 9 duty of care',                    evidenceStatus:'red',   evidenceDoc:'MAX OPS — API pending', apiPending:true},
    ],
    docs:[], activity:[
      {text:'AviationStack: delay 215 mins confirmed', time:'12 Dec 2023 10:00', type:'api'},
      {text:'Eurocontrol ATFM slot data retrieved', time:'12 Dec 2023 10:01', type:'api'},
      {text:'Evidence pack opened — primary sources in progress', time:'13 Dec 2023 09:00', type:'create'},
    ],
  },

  /* ─────────────────────────────────────────────────────────────────
   * CASE 7 — AC-2024-1381
   * easyJet EZY6543 MAN–AGP  |  24 July 2023
   * Volcanic ash cloud — Stromboli eruption, SIGMET issued
   * OUTCOME: Defended. Natural disaster EC confirmed.
   * SOURCE: VAAC London SIGMET 24 Jul 2023; Eurocontrol NOP
   ───────────────────────────────────────────────────────────────── */
  {
    ref:'AC-2024-1381',
    assignedTo:'KR',
    airline:'easyJet',
    claimant:'Funmi Osei',
    solicitor:'Irwin Mitchell LLP',
    solAddr:'Riverside East, 2 Millsands, Sheffield, S3 8DT',
    solRef:'IM/2024/FO/3340',

    flightNum:'EZY6543',
    icao24:'4ca9c1',
    callsign:'EZY6543',
    dep:'MAN', arr:'AGP',
    depICAO:'EGCC', arrICAO:'LEMG',
    depFull:'Manchester Airport (MAN)',
    arrFull:'Málaga Costa del Sol (AGP)',
    flightDate:'24 July 2023',
    flightDateISO:'2023-07-24',
    std:'06:40', atd:'10:55',
    sta:'10:40', ata:'14:55',
    delayMins:255,
    distanceKm:1829,
    aircraft:'Airbus A320-214',
    registration:'G-EZUI',
    value:'€400',

    disruptionType:'Natural Disaster',
    classification:'DEFEND',
    cat:'B',
    disruption:{
      cause:'Stromboli eruption 24 Jul 2023 — volcanic ash SIGMET, route deviation required',
      sigmetRef:'EUAC SIGMET V001 VALID 240700/241100Z',
      vaacRef:'VAAC London VA advisory 2023/24-07-001',
      delayCode:'76',
      eurocontrolRef:'LIME/2023/07/24/VA-STROMBOLI',
      publicSource:'VAAC London ash advisory; Eurocontrol NOP bulletin; ANSA news agency 24 Jul 2023',
    },

    locDate:'28 February 2024',
    stage:'cpr',
    cprDaysLeft:8,
    loaStatus:'sent',
    triageNote:'Stromboli eruption 24 Jul 2023 caused VA advisory across central Mediterranean. Route deviation required — significant fuel burn increase. Delay due to route restriction and fuel stop, not carrier fault. Natural disaster — strong EC. VAAC London advisory on file. Obtain crew fuel planning records via LIDO.',

    evidencePct:70,
    points:[
      {n:1, claim:'Delay >3hrs — Art 7(1)(b)',                  evidenceStatus:'green', evidenceDoc:'AviationStack: ATD 10:55, delay 255 mins', apiPending:false},
      {n:2, claim:'Extraordinary circumstances — volcanic ash',  evidenceStatus:'green', evidenceDoc:'VAAC London advisory EUAC SIGMET V001', apiPending:false},
      {n:3, claim:'Route deviation confirmed',                   evidenceStatus:'amber', evidenceDoc:'OpenSky track — deviation via southern routing', apiPending:false},
      {n:4, claim:'LIDO fuel figures — reroute confirmed',       evidenceStatus:'red',   evidenceDoc:'LIDO flight plan — internal API pending', apiPending:true},
      {n:5, claim:'TOPS / DISCO operational record',             evidenceStatus:'red',   evidenceDoc:'Internal — API pending', apiPending:true},
    ],
    docs:[], activity:[
      {text:'AviationStack: delay 255 mins, MAN–AGP confirmed', time:'28 Feb 2024 09:00', type:'api'},
      {text:'VAAC London advisory auto-retrieved', time:'28 Feb 2024 09:01', type:'api'},
      {text:'Eurocontrol ATFM VA restriction data pulled', time:'28 Feb 2024 09:02', type:'api'},
      {text:'LOA sent to Irwin Mitchell', time:'29 Feb 2024 10:00', type:'action'},
    ],
  },

  /* ─────────────────────────────────────────────────────────────────
   * CASE 8 — AC-2024-1502
   * Ryanair FR1234 DUB–STN  |  4 September 2023
   * Security alert — bomb threat at STN, airport closed
   * OUTCOME: Defended. Security alert EC confirmed.
   * SOURCE: Essex Police statement 4 Sep 2023; NATS NOTAM
   ───────────────────────────────────────────────────────────────── */
  {
    ref:'AC-2024-1502',
    assignedTo:'JP',
    airline:'Ryanair',
    claimant:'Oluwaseun Adeyemi',
    solicitor:'Bott & Co Solicitors',
    solAddr:'1 Sansome Walk, Worcester, WR1 1LT',
    solRef:'BC/2024/OA/9021',

    flightNum:'FR1234',
    icao24:'4ca844',
    callsign:'RYR1234',
    dep:'DUB', arr:'STN',
    depICAO:'EIDW', arrICAO:'EGSS',
    depFull:'Dublin Airport (DUB)',
    arrFull:'London Stansted (STN)',
    flightDate:'4 September 2023',
    flightDateISO:'2023-09-04',
    std:'17:05', atd:'17:05',
    sta:'18:20', ata:'21:55',
    delayMins:215,
    distanceKm:464,
    aircraft:'Boeing 737-8AS',
    registration:'EI-DCX',
    value:'€250',

    disruptionType:'Security Alert',
    classification:'DEFEND',
    cat:'A',
    disruption:{
      cause:'Security alert at Stansted — terminal evacuation, airside closure',
      notamRef:'EGSS A1221/23 — AERODROME CLOSED SECURITY OPS 1800-2100',
      policeRef:'Essex Police Op EGSS/2023/0904',
      delayCode:'93',
      eurocontrolRef:'EGSS/2023/09/04/SEC-ALERT',
      publicSource:'Essex Police press release 4 Sep 2023; NATS NOTAM EGSS A1221/23; BBC News report 4 Sep 2023',
    },

    locDate:'14 March 2024',
    stage:'drafting',
    cprDaysLeft:18,
    loaStatus:'approved',
    triageNote:'STN security alert 4 Sep 2023 — airside closed 18:00-21:00 UTC. Aircraft holding stack over East Anglia. Police-ordered airport closure — clearly beyond carrier control. EC confirmed. NOTAM on file. Good case for swift LOR with NOTAM and police reference.',

    evidencePct:88,
    points:[
      {n:1, claim:'Delay >3hrs — Art 7(1)(a)',            evidenceStatus:'green', evidenceDoc:'AviationStack: ATA 21:55, delay 215 mins', apiPending:false},
      {n:2, claim:'Security alert — airport closure',      evidenceStatus:'green', evidenceDoc:'NOTAM EGSS A1221/23 — closure confirmed', apiPending:false},
      {n:3, claim:'Police-ordered closure — EC confirmed', evidenceStatus:'green', evidenceDoc:'Essex Police statement on file', apiPending:false},
      {n:4, claim:'All reasonable measures taken',         evidenceStatus:'amber', evidenceDoc:'TOPS / DISCO — internal API pending', apiPending:true},
      {n:5, claim:'Art 9 welfare — holding provisions',    evidenceStatus:'amber', evidenceDoc:'MAX OPS — internal API pending', apiPending:true},
    ],
    docs:[], activity:[
      {text:'AviationStack: delay 215 mins confirmed', time:'14 Mar 2024 09:00', type:'api'},
      {text:'NOTAM EGSS A1221/23 — security closure confirmed', time:'14 Mar 2024 09:01', type:'api'},
      {text:'AI triage: DEFEND Cat A — security EC, police closure', time:'14 Mar 2024 09:02', type:'ai'},
      {text:'LOA approved — LOR drafting', time:'15 Mar 2024 11:00', type:'action'},
    ],
  },

  /* ─────────────────────────────────────────────────────────────────
   * CASE 9 — AC-2024-1750
   * Jet2 LS1892 LBA–HER  |  18 June 2023
   * Ground damage — jetway collision at LBA. Inherent.
   * OUTCOME: Conceded. Ground equipment — inherent per Huzar.
   * SOURCE: CAA ADR data; LBA ground ops report
   ───────────────────────────────────────────────────────────────── */
  {
    ref:'AC-2024-1750',
    assignedTo:'KR',
    airline:'Jet2',
    claimant:'Emma Clarke',
    solicitor:'Slater & Gordon',
    solAddr:'58 Mosley Street, Manchester, M2 3HZ',
    solRef:'SG/2024/EC/4401',

    flightNum:'LS1892',
    icao24:'4072a1',
    callsign:'EXS1892',
    dep:'LBA', arr:'HER',
    depICAO:'EGNM', arrICAO:'LGIR',
    depFull:'Leeds Bradford Airport (LBA)',
    arrFull:'Heraklion International (HER)',
    flightDate:'18 June 2023',
    flightDateISO:'2023-06-18',
    std:'06:00', atd:'09:55',
    sta:'12:15', ata:'15:58',
    delayMins:235,
    distanceKm:2668,
    aircraft:'Boeing 737-8K5',
    registration:'G-JZHK',
    value:'€400',

    disruptionType:'Ground Damage',
    classification:'CONCEDE',
    cat:'C',
    disruption:{
      cause:'Jetway hydraulic failure — contact with aircraft fuselage at LBA stand C4',
      amosRef:'AMOS-LS1892-20230618-GND',
      delayCode:'41',
      publicSource:'CAA ADR decision ADR/2024/LS/1750; LBA ground ops incident log',
      concessionNote:'Ground equipment failure — inherent to aircraft operations per Huzar v Jet2. Compensation €400 payable.',
    },

    locDate:'3 April 2024',
    stage:'resolve',
    cprDaysLeft:30,
    loaStatus:'approved',
    triageNote:'CONCEDE. Jetway hydraulic failure causing aircraft contact at LBA stand. Ground damage inherent to normal operations — Huzar v Jet2 applies. Compensation €400 per passenger. Settlement agreed. DO NOT LITIGATE.',

    evidencePct:100,
    points:[
      {n:1, claim:'Delay >3hrs — Art 7(1)(b)',        evidenceStatus:'green', evidenceDoc:'AviationStack: ATD 09:55, delay 235 mins', apiPending:false},
      {n:2, claim:'Ground damage — inherent fault',   evidenceStatus:'green', evidenceDoc:'AMOS ground damage report — confirmed', apiPending:true},
      {n:3, claim:'Not extraordinary circumstances',  evidenceStatus:'green', evidenceDoc:'Huzar v Jet2 — inherent ground operations', apiPending:false},
      {n:4, claim:'€400 compensation payable',        evidenceStatus:'green', evidenceDoc:'1500–3500km band — Art 7(1)(b) rate', apiPending:false},
    ],
    docs:[], activity:[
      {text:'AviationStack: delay 235 mins confirmed', time:'3 Apr 2024 10:00', type:'api'},
      {text:'AI triage: CONCEDE — ground damage, Huzar applies', time:'3 Apr 2024 10:01', type:'ai'},
      {text:'Settlement agreed — €400 per passenger', time:'10 Apr 2024 14:00', type:'action'},
      {text:'Case resolved — closed', time:'11 Apr 2024 09:00', type:'stage'},
    ],
  },

  /* ─────────────────────────────────────────────────────────────────
   * CASE 10 — AC-2024-1988
   * British Airways BA0456 LHR–CDG  |  7 July 2023
   * Medical emergency diversion — passenger cardiac event
   * OUTCOME: Defended. Medical emergency EC confirmed.
   * SOURCE: OpenSky track; CAA ADR decision; published precedent
   ───────────────────────────────────────────────────────────────── */
  {
    ref:'AC-2024-1988',
    assignedTo:'SB',
    airline:'British Airways',
    claimant:'Reginald Okonkwo',
    solicitor:'Thompsons Solicitors',
    solAddr:'Congress House, Great Russell Street, London, WC1B 3LW',
    solRef:'TH/2024/RO/7712',

    flightNum:'BA0456',
    icao24:'400a76',
    callsign:'BAW456',
    dep:'LHR', arr:'CDG',
    depICAO:'EGLL', arrICAO:'LFPG',
    depFull:'London Heathrow (LHR)',
    arrFull:'Paris Charles de Gaulle (CDG)',
    flightDate:'7 July 2023',
    flightDateISO:'2023-07-07',
    std:'14:25', atd:'14:30',
    sta:'16:40', ata:'20:15',
    delayMins:215,
    distanceKm:341,
    aircraft:'Airbus A319-131',
    registration:'G-EUOB',
    value:'€250',

    disruptionType:'Medical Emergency',
    classification:'DEFEND',
    cat:'A',
    disruption:{
      cause:'Passenger cardiac event — aircraft returned to LHR for medical diversion',
      divertedTo:'LHR',
      delayCode:'93',
      safetynetRef:'SN/2023/BA456/0707-MED',
      publicSource:'OpenSky track data — LHR return confirmed; CAA ADR BA/2024/ADR/1988; medical emergency EC precedent',
      medNote:'Medical emergency — captain\'s duty to divert overrides operational considerations. EC confirmed.',
    },

    locDate:'15 June 2024',
    stage:'intake',
    cprDaysLeft:25,
    loaStatus:'',
    triageNote:'Medical emergency return to LHR 7 Jul 2023. Passenger cardiac event — crew followed emergency procedures. Captain duty to divert is not within airline control. EC confirmed by multiple ADR and court decisions. Obtain SafetyNet medical log and crew witness statement.',

    evidencePct:15,
    points:[
      {n:1, claim:'Delay >3hrs — Art 7(1)(a)',          evidenceStatus:'green', evidenceDoc:'AviationStack: ATA 20:15, delay 215 mins', apiPending:false},
      {n:2, claim:'Medical diversion — return to LHR', evidenceStatus:'green', evidenceDoc:'OpenSky track confirms LHR return 14:55', apiPending:false},
      {n:3, claim:'Extraordinary circumstances — medical EC', evidenceStatus:'amber', evidenceDoc:'SafetyNet medical log — internal API pending', apiPending:true},
      {n:4, claim:'Crew witness statement',             evidenceStatus:'red',   evidenceDoc:'Not yet obtained', apiPending:false},
      {n:5, claim:'Art 9 welfare — care at LHR',       evidenceStatus:'red',   evidenceDoc:'MAX OPS — internal API pending', apiPending:true},
    ],
    docs:[], activity:[
      {text:'LOC received from Thompsons — assigned to S. Booth', time:'15 Jun 2024 09:00', type:'create'},
      {text:'AviationStack: delay 215 mins confirmed; LHR return detected', time:'15 Jun 2024 09:10', type:'api'},
      {text:'AI triage: DEFEND Cat A — medical diversion EC confirmed', time:'15 Jun 2024 09:11', type:'ai'},
    ],
  },

];

/* ═══════════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════════ */
function getCasesForUser(userId, stage){
  return ALL_CASES.filter(c => c.assignedTo===userId && (!stage || c.stage===stage));
}
function getCase(ref){ return ALL_CASES.find(c=>c.ref===ref)||null; }
function daysUrgency(d){ return d<=3?'urgent':d<=7?'warn':'ok'; }
function urgencyLabel(d){ return d<=3?d+'d — URGENT':d<=7?d+'d — this week':d+'d'; }
function stageLabel(s){
  const m={intake:'Intake',triage:'Triage',cpr:'CPR',evidence:'Evidence',drafting:'Drafting',defence:'Defence',resolve:'Resolve'};
  return m[s]||s;
}
function stageIcon(s){
  const m={intake:'ti-inbox',triage:'ti-search',cpr:'ti-calendar-due',evidence:'ti-folder-open',drafting:'ti-file-pencil',defence:'ti-shield',resolve:'ti-circle-check'};
  return m[s]||'ti-file';
}
function stageColor(s){
  const m={intake:'#1D4ED8',triage:'#92400E',cpr:'#B45309',evidence:'#4338CA',drafting:'#065F46',defence:'#1A7A4A',resolve:'#374151'};
  return m[s]||'#374151';
}
function stageBg(s){
  const m={intake:'#EFF6FF',triage:'#FEF3C7',cpr:'#FEF9C3',evidence:'#EEEDFE',drafting:'#E6F5EE',defence:'#DCFCE7',resolve:'#F1F5F9'};
  return m[s]||'#F1F5F9';
}
function evPctColor(pct){ return pct>=70?'var(--green-l)':pct>=40?'#F59E0B':'var(--red)'; }
function getActiveUser(){ return sessionStorage.getItem('261c_user')||'SB'; }
function setActiveUser(id){ sessionStorage.setItem('261c_user', id); }

/* ═══════════════════════════════════════════════════════════════════
   COMPATIBILITY SHIM
   Adds `flight` and `type` fields that the original dashboard,
   intake, and CPR modules expect.
   flight = "EZY8481 — London Gatwick (LGW) to Amsterdam Schiphol (AMS)"
   type   = "EC 261/2004 — Industrial Action"
═══════════════════════════════════════════════════════════════════ */
ALL_CASES.forEach(function(c){
  if(!c.flight){
    c.flight = c.flightNum + ' — ' + (c.depFull||c.dep) + ' (' + c.dep + ') to ' + (c.arrFull||c.arr) + ' (' + c.arr + ')';
  }
  if(!c.type){
    c.type = 'EC 261/2004 — ' + (c.cancelled ? 'Cancellation' : c.disruptionType);
  }
  if(!c.locDate){
    /* Derive a plausible locDate ~3 months after flight for display */
    var fd = new Date(c.flightDateISO);
    fd.setMonth(fd.getMonth()+3);
    var M=['January','February','March','April','May','June','July','August','September','October','November','December'];
    c.locDate = fd.getDate()+' '+M[fd.getMonth()]+' '+fd.getFullYear();
  }
  if(!c.date){ c.date = c.locDate; }
});
