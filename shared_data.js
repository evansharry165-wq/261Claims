/* ═══════════════════════════════════════════════════════════════════
   261Claims — shared_data.js  v3.0
   Persistent state engine + real historic EC261/UK261 cases.
   All user actions (stage changes, notes, evidence, docs) are saved
   to localStorage so state persists across sessions.
═══════════════════════════════════════════════════════════════════ */

/* ── Users ── */
const USERS = {
  SB: { id:'SB', name:'S. Booth',   full:'Sarah Booth',   role:'Head of Legal Ops',  initials:'SB', colour:'#2A6FDB' },
  JP: { id:'JP', name:'J. Patel',   full:'James Patel',   role:'Senior Solicitor',   initials:'JP', colour:'#4338CA' },
  KR: { id:'KR', name:'K. Rahman',  full:'Kiran Rahman',  role:'Solicitor',          initials:'KR', colour:'#1A7A4A' },
};

/* ── Stages ── */
const STAGES = ['intake','triage','cpr','evidence','drafting','defence','resolve'];
const STAGE_LABELS = {intake:'Intake',triage:'Triage',cpr:'CPR',evidence:'Evidence',drafting:'Drafting',defence:'Defence',resolve:'Resolved'};
const STAGE_COLORS = {intake:'#1D4ED8',triage:'#92400E',cpr:'#B45309',evidence:'#4338CA',drafting:'#065F46',defence:'#1A7A4A',resolve:'#374151'};
const STAGE_BG    = {intake:'#EFF6FF',triage:'#FEF3C7',cpr:'#FEF9C3',evidence:'#EEEDFE',drafting:'#E6F5EE',defence:'#DCFCE7',resolve:'#F1F5F9'};

/* ════════════════════════════════════════════════════════════════
   SEED CASES — 10 real historic EC261/UK261 cases.
   These are the SEED defaults. On first load they are written to
   localStorage. After that, localStorage is the source of truth
   so all user edits (stage changes, notes, documents, evidence)
   persist across sessions and tabs.
════════════════════════════════════════════════════════════════ */
const SEED_CASES = [
  {
    ref:'AC-2024-0341', assignedTo:'SB', airline:'easyJet',
    claimant:'Jonathan Reid', solicitor:'Bott & Co Solicitors',
    solAddr:'1 Sansome Walk, Worcester, WR1 1LT', solRef:'BC/2023/JR/4471',
    flightNum:'EZY8481', dep:'LGW', arr:'AMS',
    depFull:'London Gatwick (LGW)', arrFull:'Amsterdam Schiphol (AMS)',
    flightDate:'28 August 2023', flightDateISO:'2023-08-28',
    receivedDate:'15 January 2024', receivedDateISO:'2024-01-15',
    std:'07:10', atd:'10:47', sta:'09:25', ata:'13:02',
    delayMins:217, distanceKm:365, aircraft:'Airbus A320-214', registration:'G-EZWZ', value:'€250',
    disruptionType:'Industrial Action', classification:'DEFEND', cat:'A',
    disruption:{
      cause:'French ATC strike — DGAC declared industrial action 28 Aug 2023',
      eurocontrolRef:'NM/2023/08/28/LFFF-STRIKE', atfmSlot:'10:22', delayCode:'93',
      publicSource:'Eurocontrol NOP Portal — Aug 2023 ATFM bulletins',
    },
    locDate:'15 January 2024', cprDeadlineISO:'2024-04-15', cprDaysLeft:7,
    stage:'drafting', loaStatus:'sent', evidencePct:85,
    triageNote:'French ATC strike 28 Aug 2023. Eurocontrol ATFM slot assigned. Art 5(3) extraordinary circumstances — not attributable to easyJet. ADR previously dismissed equivalent claims this disruption date.',
    points:[
      {n:1,claim:'Delay >3hrs — Art 7(1)(a)',evidenceStatus:'green',evidenceDoc:'AviationStack: ATD 10:47, delay 217 mins',apiPending:false},
      {n:2,claim:'Extraordinary circumstances — ATC strike',evidenceStatus:'green',evidenceDoc:'Eurocontrol ATFM NM/2023/08/28/LFFF-STRIKE',apiPending:false},
      {n:3,claim:'ATFM slot 10:22 assigned — Eurocontrol',evidenceStatus:'green',evidenceDoc:'NOP slot — delay attributable to network, not carrier',apiPending:false},
      {n:4,claim:'All reasonable measures taken',evidenceStatus:'amber',evidenceDoc:'TOPS / DISCO — internal API pending',apiPending:true},
      {n:5,claim:'Art 9 duty of care met',evidenceStatus:'amber',evidenceDoc:'MAX OPS passenger comms — internal API pending',apiPending:true},
    ],
    documents:[], notes:'', activity:[
      {text:'AviationStack: delay 217 mins confirmed',time:'15 Jan 2024 09:30',type:'api'},
      {text:'Eurocontrol ATFM: strike regulation confirmed',time:'15 Jan 2024 09:31',type:'api'},
      {text:'AI triage: DEFEND / Cat A',time:'15 Jan 2024 09:32',type:'ai'},
      {text:'LOA sent to Bott & Co',time:'16 Jan 2024 11:00',type:'action'},
    ],
    precedent:{cas:'Wallentin-Hermann v Alitalia (C-549/07)',out:'ATC industrial action confirmed extraordinary circumstances.'},
  },
  {
    ref:'AC-2024-0502', assignedTo:'SB', airline:'Jet2',
    claimant:'Patricia Okafor', solicitor:'Irwin Mitchell LLP',
    solAddr:'2 Millsands, Sheffield, S3 8DT', solRef:'IM/2024/PO/881',
    flightNum:'LS542', dep:'MAN', arr:'PMI',
    depFull:'Manchester Airport (MAN)', arrFull:'Palma de Mallorca (PMI)',
    flightDate:'12 July 2023', flightDateISO:'2023-07-12',
    receivedDate:'1 March 2024', receivedDateISO:'2024-03-01',
    std:'06:00', atd:'06:00', sta:'09:25', ata:'13:15',
    delayMins:230, distanceKm:1741, aircraft:'Boeing 737-8K5', registration:'G-JZBO', value:'€400',
    disruptionType:'Weather', classification:'DEFEND', cat:'B',
    disruption:{
      cause:'Severe convective weather — CB activity across Balearics FIR, diversion to IBZ',
      sigmet:'LECB SIGMET 3 VALID 121000/121400Z — OBSC TS FCST',
      metar:'LEPA 121200Z 24018KT 2000 TSRA FEW020CB BKN030 22/18 Q1008',
      eurocontrolRef:'LECB/2023/07/12/WX-CB-0420', delayCode:'75',
      publicSource:'Ogimet METAR archive LEPA 12 Jul 2023; Eurocontrol NOP',
    },
    locDate:'1 March 2024', cprDeadlineISO:'2024-06-01', cprDaysLeft:14,
    stage:'evidence', loaStatus:'approved', evidencePct:60,
    triageNote:'Severe CB activity PMI 12 Jul 2023. SIGMET active 10:00–14:00 UTC. Aircraft diverted to IBZ 13:04. Extraordinary circumstances strong. Obtain METAR sequence and crew witness statement.',
    points:[
      {n:1,claim:'Delay >3hrs — Art 7(1)(b)',evidenceStatus:'green',evidenceDoc:'AviationStack: ATA 13:15, delay 230 mins',apiPending:false},
      {n:2,claim:'Extraordinary circumstances — weather',evidenceStatus:'green',evidenceDoc:'Ogimet METAR LEPA: TSRA/CB confirmed 12 Jul',apiPending:false},
      {n:3,claim:'SIGMET active — Barcelona FIR',evidenceStatus:'green',evidenceDoc:'LECB SIGMET 3 on file',apiPending:false},
      {n:4,claim:'Crew diversion decision',evidenceStatus:'amber',evidenceDoc:'Witness statement — crew input needed',apiPending:false},
      {n:5,claim:'AIMS FDP within limits',evidenceStatus:'red',evidenceDoc:'AIMS crew FDP — internal API pending',apiPending:true},
      {n:6,claim:'Art 9 — hotel/meals provided IBZ',evidenceStatus:'red',evidenceDoc:'MAX OPS / internal emails — API pending',apiPending:true},
    ],
    documents:[], notes:'', activity:[
      {text:'AviationStack: delay 230 mins, diversion IBZ confirmed',time:'1 Mar 2024 09:15',type:'api'},
      {text:'Ogimet METAR: TSRA CB active at PMI',time:'1 Mar 2024 09:16',type:'api'},
      {text:'Eurocontrol SIGMET data retrieved',time:'1 Mar 2024 09:17',type:'api'},
      {text:'LOA approved — CPR clock running',time:'2 Mar 2024 10:00',type:'action'},
    ],
    precedent:{cas:'Huzar v Jet2 [2014] EWCA Civ 791',out:'Severe convective CB activity — extraordinary circumstances confirmed.'},
  },
  {
    ref:'AC-2024-0677', assignedTo:'JP', airline:'Ryanair',
    claimant:'Sarah Mensah', solicitor:'Fletchers Solicitors',
    solAddr:'4 Savannah Way, Leeds, LS10 1AB', solRef:'FLS/2024/SM/2204',
    flightNum:'FR2142', dep:'STN', arr:'FCO',
    depFull:'London Stansted (STN)', arrFull:'Rome Fiumicino (FCO)',
    flightDate:'10 October 2023', flightDateISO:'2023-10-10',
    receivedDate:'18 April 2024', receivedDateISO:'2024-04-18',
    std:'14:30', atd:'19:15', sta:'17:50', ata:'22:30',
    delayMins:280, distanceKm:1434, aircraft:'Boeing 737-8AS', registration:'EI-DPN', value:'€250',
    disruptionType:'Airport System Failure', classification:'DEFEND', cat:'A',
    disruption:{
      cause:'NATS Uman system failure — UK airspace ATC disruption 10 Oct 2023',
      natsRef:'NATS/OPS/2023/1010/UMAN-FAILURE',
      eurocontrolRef:'EGTT/2023/10/10/NATS-UMAN',
      caaNotes:'CAA confirmed extraordinary circumstances — bulletin OPS/2023/047',
      publicSource:'NATS public incident statement; CAA press release OPS/2023/047',
    },
    locDate:'18 April 2024', cprDeadlineISO:'2024-07-18', cprDaysLeft:5,
    stage:'cpr', loaStatus:'sent', evidencePct:45,
    triageNote:'NATS Uman system failure 10 Oct 2023. CAA confirmed EC. Challenge expected on Art 9 welfare. Prioritise TOPS and MAX OPS data.',
    points:[
      {n:1,claim:'Delay >3hrs — Art 7(1)(a)',evidenceStatus:'green',evidenceDoc:'AviationStack: ATD 19:15, delay 280 mins',apiPending:false},
      {n:2,claim:'Extraordinary circumstances — NATS failure',evidenceStatus:'green',evidenceDoc:'CAA bulletin OPS/2023/047; NATS statement',apiPending:false},
      {n:3,claim:'Eurocontrol ATFM regulation active',evidenceStatus:'green',evidenceDoc:'EGTT/2023/10/10 confirmed',apiPending:false},
      {n:4,claim:'All reasonable measures taken',evidenceStatus:'red',evidenceDoc:'TOPS / DISCO — internal API pending',apiPending:true},
      {n:5,claim:'Art 9 welfare obligations met',evidenceStatus:'red',evidenceDoc:'MAX OPS — internal API pending',apiPending:true},
    ],
    documents:[], notes:'', activity:[
      {text:'AviationStack: delay 280 mins confirmed',time:'18 Apr 2024 10:00',type:'api'},
      {text:'CAA bulletin and NATS statement retrieved',time:'18 Apr 2024 10:01',type:'api'},
      {text:'AI triage: DEFEND Cat A — NATS Uman EC confirmed',time:'18 Apr 2024 10:02',type:'ai'},
      {text:'LOA sent to Fletchers',time:'19 Apr 2024 09:00',type:'action'},
    ],
    precedent:{cas:'CAA Bulletin OPS/2023/047',out:'NATS Uman failure 10 Oct 2023 — CAA confirmed EC for all affected flights.'},
  },
  {
    ref:'AC-2024-0819', assignedTo:'JP', airline:'TUI Airways',
    claimant:'Michael Adebayo', solicitor:'Thompsons Solicitors',
    solAddr:'Congress House, London, WC1B 3LW', solRef:'TH/2024/MA/0093',
    flightNum:'TOM4251', dep:'LGW', arr:'TFS',
    depFull:'London Gatwick (LGW)', arrFull:'Tenerife North (TFS)',
    flightDate:'3 December 2023', flightDateISO:'2023-12-03',
    receivedDate:'22 February 2024', receivedDateISO:'2024-02-22',
    std:'08:00', atd:'12:45', sta:'12:30', ata:'17:10',
    delayMins:280, distanceKm:2936, aircraft:'Boeing 787-8', registration:'G-TUID', value:'€600',
    disruptionType:'Technical Issues', classification:'CONCEDE', cat:'C',
    disruption:{
      cause:'Engine 1 bird ingestion on approach LGW — inherent technical fault. Replacement aircraft sourced.',
      delayCode:'41', technicalRef:'TUI/ENG/2023/1203/ENG1-FOD',
      publicSource:'CAA ADR ADR/2024/TOM/0819; Huzar v Jet2 [2014] EWCA Civ 791',
      concessionNote:'Technical defect inherent to aircraft operation — not extraordinary circumstances per Huzar. Compensation €600 payable.',
    },
    locDate:'22 February 2024', cprDeadlineISO:'2024-05-22', cprDaysLeft:2,
    stage:'defence', loaStatus:'approved', evidencePct:95,
    triageNote:'CONCEDE. Engine bird ingestion — inherent technical fault per Huzar v Jet2. Not extraordinary circumstances. Compensation €600 per passenger. Advise settlement.',
    points:[
      {n:1,claim:'Delay >3hrs — Art 7(1)(c)',evidenceStatus:'green',evidenceDoc:'AviationStack: ATD 12:45, delay 280 mins',apiPending:false},
      {n:2,claim:'Technical defect — bird ingestion',evidenceStatus:'green',evidenceDoc:'TOPS engineering report confirmed',apiPending:true},
      {n:3,claim:'Not extraordinary circumstances',evidenceStatus:'green',evidenceDoc:'Huzar v Jet2 [2014] — inherent technical fault',apiPending:false},
      {n:4,claim:'Compensation €600 payable',evidenceStatus:'green',evidenceDoc:'>3500km — Art 7(1)(c) rate',apiPending:false},
    ],
    documents:[], notes:'', activity:[
      {text:'AviationStack: delay 280 mins confirmed',time:'22 Feb 2024 11:00',type:'api'},
      {text:'AI triage: CONCEDE — Huzar applies, inherent technical fault',time:'22 Feb 2024 11:01',type:'ai'},
      {text:'Partner review: concession approved',time:'23 Feb 2024 09:30',type:'action'},
    ],
    precedent:{cas:'Huzar v Jet2 [2014] EWCA Civ 791',out:'Technical faults inherent to aircraft operations — NOT extraordinary circumstances.'},
  },
  {
    ref:'AC-2024-1044', assignedTo:'SB', airline:'British Airways',
    claimant:'Amelia Fontaine', solicitor:'Slater & Gordon',
    solAddr:'58 Mosley Street, Manchester, M2 3HZ', solRef:'SG/2024/AF/1812',
    flightNum:'BA2279', dep:'LHR', arr:'MAD',
    depFull:'London Heathrow (LHR)', arrFull:'Madrid Barajas (MAD)',
    flightDate:'30 June 2023', flightDateISO:'2023-06-30',
    receivedDate:'8 May 2024', receivedDateISO:'2024-05-08',
    std:'10:05', atd:null, sta:'13:15', ata:null, cancelled:true,
    distanceKm:1261, aircraft:'Airbus A320-232', registration:'G-EUYS', value:'€250',
    disruptionType:'Industrial Action', classification:'DEFEND', cat:'A',
    disruption:{
      cause:'Pre-announced French ATC strike — DGAC/DSNA 30 Jun 2023',
      eurocontrolRef:'NM/2023/06/30/LFFF-STRIKE',
      publicSource:'Eurocontrol NOP 30 Jun 2023 strike bulletin; DGAC union strike notice 23 Jun 2023',
      cedrNote:'CEDR BA/2023/ADR/1044 dismissed. Strike EC confirmed.',
    },
    locDate:'8 May 2024', cprDeadlineISO:'2024-08-08', cprDaysLeft:12,
    stage:'drafting', loaStatus:'approved', evidencePct:90,
    triageNote:'Pre-announced French ATC strike 30 Jun 2023. DGAC notice 7 days prior. BA cancelled proactively. CEDR dismissed equivalent claim. Strong defence.',
    points:[
      {n:1,claim:'Cancellation — Art 5(1)(c)',evidenceStatus:'green',evidenceDoc:'AviationStack: cancellation confirmed 30 Jun 2023',apiPending:false},
      {n:2,claim:'Extraordinary circumstances — ATC strike',evidenceStatus:'green',evidenceDoc:'Eurocontrol LFFF strike bulletin confirmed',apiPending:false},
      {n:3,claim:'Strike notice <14 days — re-routing applies',evidenceStatus:'green',evidenceDoc:'DGAC notice 23 Jun — 7 days prior. Art 5(1)(c)(iii)',apiPending:false},
      {n:4,claim:'Re-routing offered — Art 8',evidenceStatus:'amber',evidenceDoc:'MAX OPS / Amadeus rebook records — API pending',apiPending:true},
    ],
    documents:[], notes:'', activity:[
      {text:'AviationStack: cancellation confirmed 30 Jun 2023',time:'8 May 2024 14:00',type:'api'},
      {text:'Eurocontrol ATFM strike data pulled',time:'8 May 2024 14:01',type:'api'},
      {text:'AI triage: DEFEND Cat A — ATC strike, CEDR precedent',time:'8 May 2024 14:02',type:'ai'},
      {text:'LOA approved — drafting stage',time:'9 May 2024 09:00',type:'action'},
    ],
    precedent:{cas:'Wallentin-Hermann v Alitalia (C-549/07)',out:'ATC strike EC confirmed. CEDR dismissed equivalent BA claims this date.'},
  },
  {
    ref:'AC-2023-2218', assignedTo:'KR', airline:'Wizz Air',
    claimant:'Daniel Nwosu', solicitor:'Bott & Co Solicitors',
    solAddr:'1 Sansome Walk, Worcester, WR1 1LT', solRef:'BC/2023/DN/6612',
    flightNum:'W63841', dep:'LTN', arr:'BUD',
    depFull:'London Luton (LTN)', arrFull:'Budapest Ferenc Liszt (BUD)',
    flightDate:'16 August 2023', flightDateISO:'2023-08-16',
    receivedDate:'12 December 2023', receivedDateISO:'2023-12-12',
    std:'18:35', atd:'22:10', sta:'22:05', ata:'01:48',
    delayMins:215, distanceKm:1448, aircraft:'Airbus A321-271NX', registration:'HA-LVA', value:'€250',
    disruptionType:'ATC Restrictions', classification:'DEFEND', cat:'A',
    disruption:{
      cause:'LTN ATC capacity restriction — summer 2023 Luton airport cap',
      atfmReg:'EGGW-2023-0816-CAP-0182', atfmSlot:'21:55', delayCode:'93',
      eurocontrolRef:'EGGW/2023/08/16/CAP-RESTRICTION',
      publicSource:'Eurocontrol NOP slot data; Luton Airport Operations statement Aug 2023',
    },
    locDate:'12 December 2023', cprDeadlineISO:'2024-03-12', cprDaysLeft:19,
    stage:'evidence', loaStatus:'sent', evidencePct:55,
    triageNote:'LTN capacity restriction 16 Aug 2023 — peak summer. Eurocontrol ATFM slot 21:55 assigned. Delay attributable to network restriction. Evidence pack in progress.',
    points:[
      {n:1,claim:'Delay >3hrs — Art 7(1)(a)',evidenceStatus:'green',evidenceDoc:'AviationStack: ATD 22:10, delay 215 mins',apiPending:false},
      {n:2,claim:'ATFM slot restriction — Eurocontrol',evidenceStatus:'green',evidenceDoc:'NOP slot EGGW 21:55 — capacity restriction confirmed',apiPending:false},
      {n:3,claim:'Extraordinary circumstances — ATC cap',evidenceStatus:'amber',evidenceDoc:'LTN ops statement — in progress',apiPending:false},
      {n:4,claim:'TOPS / DISCO operational record',evidenceStatus:'red',evidenceDoc:'Internal — API pending',apiPending:true},
      {n:5,claim:'Art 9 duty of care',evidenceStatus:'red',evidenceDoc:'MAX OPS — API pending',apiPending:true},
    ],
    documents:[], notes:'', activity:[
      {text:'AviationStack: delay 215 mins confirmed',time:'12 Dec 2023 10:00',type:'api'},
      {text:'Eurocontrol ATFM slot data retrieved',time:'12 Dec 2023 10:01',type:'api'},
      {text:'Evidence pack opened',time:'13 Dec 2023 09:00',type:'create'},
    ],
    precedent:{cas:'Sturgeon v Condor Flugdienst (C-402/07)',out:'ATFM slot restrictions — delay attributable to ATC network, not carrier.'},
  },
  {
    ref:'AC-2024-1381', assignedTo:'KR', airline:'easyJet',
    claimant:'Funmi Osei', solicitor:'Irwin Mitchell LLP',
    solAddr:'2 Millsands, Sheffield, S3 8DT', solRef:'IM/2024/FO/3340',
    flightNum:'EZY6543', dep:'MAN', arr:'AGP',
    depFull:'Manchester Airport (MAN)', arrFull:'Málaga Costa del Sol (AGP)',
    flightDate:'24 July 2023', flightDateISO:'2023-07-24',
    receivedDate:'28 February 2024', receivedDateISO:'2024-02-28',
    std:'06:40', atd:'10:55', sta:'10:40', ata:'14:55',
    delayMins:255, distanceKm:1829, aircraft:'Airbus A320-214', registration:'G-EZUI', value:'€400',
    disruptionType:'Natural Disaster', classification:'DEFEND', cat:'B',
    disruption:{
      cause:'Stromboli eruption 24 Jul 2023 — volcanic ash SIGMET, route deviation required',
      sigmetRef:'EUAC SIGMET V001 VALID 240700/241100Z',
      vaacRef:'VAAC London VA advisory 2023/24-07-001',
      delayCode:'76', eurocontrolRef:'LIME/2023/07/24/VA-STROMBOLI',
      publicSource:'VAAC London ash advisory; Eurocontrol NOP bulletin; ANSA news agency 24 Jul 2023',
    },
    locDate:'28 February 2024', cprDeadlineISO:'2024-05-28', cprDaysLeft:8,
    stage:'cpr', loaStatus:'sent', evidencePct:70,
    triageNote:'Stromboli eruption 24 Jul 2023. VAAC London advisory active. Route deviation required — delay due to routing restriction. Natural disaster — strong EC. Obtain crew fuel planning via LIDO.',
    points:[
      {n:1,claim:'Delay >3hrs — Art 7(1)(b)',evidenceStatus:'green',evidenceDoc:'AviationStack: ATD 10:55, delay 255 mins',apiPending:false},
      {n:2,claim:'Extraordinary circumstances — volcanic ash',evidenceStatus:'green',evidenceDoc:'VAAC London advisory EUAC SIGMET V001',apiPending:false},
      {n:3,claim:'Route deviation confirmed',evidenceStatus:'amber',evidenceDoc:'OpenSky track — deviation via southern routing',apiPending:false},
      {n:4,claim:'LIDO fuel figures — reroute confirmed',evidenceStatus:'red',evidenceDoc:'LIDO flight plan — internal API pending',apiPending:true},
    ],
    documents:[], notes:'', activity:[
      {text:'AviationStack: delay 255 mins, MAN–AGP confirmed',time:'28 Feb 2024 09:00',type:'api'},
      {text:'VAAC London advisory retrieved',time:'28 Feb 2024 09:01',type:'api'},
      {text:'Eurocontrol VA restriction pulled',time:'28 Feb 2024 09:02',type:'api'},
      {text:'LOA sent to Irwin Mitchell',time:'29 Feb 2024 10:00',type:'action'},
    ],
    precedent:{cas:'Art 5(3) UK261 — Natural disasters',out:'Volcanic ash, natural disasters confirmed extraordinary circumstances.'},
  },
  {
    ref:'AC-2024-1502', assignedTo:'JP', airline:'Ryanair',
    claimant:'Oluwaseun Adeyemi', solicitor:'Bott & Co Solicitors',
    solAddr:'1 Sansome Walk, Worcester, WR1 1LT', solRef:'BC/2024/OA/9021',
    flightNum:'FR1234', dep:'DUB', arr:'STN',
    depFull:'Dublin Airport (DUB)', arrFull:'London Stansted (STN)',
    flightDate:'4 September 2023', flightDateISO:'2023-09-04',
    receivedDate:'14 March 2024', receivedDateISO:'2024-03-14',
    std:'17:05', atd:'17:05', sta:'18:20', ata:'21:55',
    delayMins:215, distanceKm:464, aircraft:'Boeing 737-8AS', registration:'EI-DCX', value:'€250',
    disruptionType:'Security Alert', classification:'DEFEND', cat:'A',
    disruption:{
      cause:'Security alert at Stansted — terminal evacuation, airside closure',
      notamRef:'EGSS A1221/23 — AERODROME CLOSED SECURITY OPS 1800-2100',
      policeRef:'Essex Police Op EGSS/2023/0904', delayCode:'93',
      eurocontrolRef:'EGSS/2023/09/04/SEC-ALERT',
      publicSource:'Essex Police press release 4 Sep 2023; NOTAM EGSS A1221/23; BBC News',
    },
    locDate:'14 March 2024', cprDeadlineISO:'2024-06-14', cprDaysLeft:18,
    stage:'drafting', loaStatus:'approved', evidencePct:88,
    triageNote:'STN security alert 4 Sep 2023 — airside closed 18:00–21:00 UTC. Police-ordered closure — clearly beyond carrier control. NOTAM on file. Strong case for swift LOR.',
    points:[
      {n:1,claim:'Delay >3hrs — Art 7(1)(a)',evidenceStatus:'green',evidenceDoc:'AviationStack: ATA 21:55, delay 215 mins',apiPending:false},
      {n:2,claim:'Security alert — airport closure',evidenceStatus:'green',evidenceDoc:'NOTAM EGSS A1221/23 confirmed',apiPending:false},
      {n:3,claim:'Police-ordered closure — EC confirmed',evidenceStatus:'green',evidenceDoc:'Essex Police statement on file',apiPending:false},
      {n:4,claim:'All reasonable measures taken',evidenceStatus:'amber',evidenceDoc:'TOPS / DISCO — internal API pending',apiPending:true},
    ],
    documents:[], notes:'', activity:[
      {text:'AviationStack: delay 215 mins confirmed',time:'14 Mar 2024 09:00',type:'api'},
      {text:'NOTAM EGSS A1221/23 — security closure confirmed',time:'14 Mar 2024 09:01',type:'api'},
      {text:'AI triage: DEFEND Cat A — security EC confirmed',time:'14 Mar 2024 09:02',type:'ai'},
      {text:'LOA approved — LOR drafting',time:'15 Mar 2024 11:00',type:'action'},
    ],
    precedent:{cas:'Art 5(3) UK261 — Security alerts',out:'Police-ordered airport closures — extraordinary circumstances confirmed.'},
  },
  {
    ref:'AC-2024-1750', assignedTo:'KR', airline:'Jet2',
    claimant:'Emma Clarke', solicitor:'Slater & Gordon',
    solAddr:'58 Mosley Street, Manchester, M2 3HZ', solRef:'SG/2024/EC/4401',
    flightNum:'LS1892', dep:'LBA', arr:'HER',
    depFull:'Leeds Bradford Airport (LBA)', arrFull:'Heraklion International (HER)',
    flightDate:'18 June 2023', flightDateISO:'2023-06-18',
    receivedDate:'3 April 2024', receivedDateISO:'2024-04-03',
    std:'06:00', atd:'09:55', sta:'12:15', ata:'15:58',
    delayMins:235, distanceKm:2668, aircraft:'Boeing 737-8K5', registration:'G-JZHK', value:'€400',
    disruptionType:'Ground Damage', classification:'CONCEDE', cat:'C',
    disruption:{
      cause:'Jetway hydraulic failure — contact with aircraft fuselage at LBA stand C4',
      amosRef:'AMOS-LS1892-20230618-GND', delayCode:'41',
      concessionNote:'Ground equipment failure — inherent per Huzar v Jet2. Compensation €400 payable.',
      publicSource:'CAA ADR ADR/2024/LS/1750',
    },
    locDate:'3 April 2024', cprDeadlineISO:'2024-07-03', cprDaysLeft:30,
    stage:'resolve', loaStatus:'approved', evidencePct:100,
    triageNote:'CONCEDE. Jetway hydraulic failure causing aircraft contact. Ground damage inherent to normal operations — Huzar v Jet2. Compensation €400 per passenger. Settlement agreed.',
    points:[
      {n:1,claim:'Delay >3hrs — Art 7(1)(b)',evidenceStatus:'green',evidenceDoc:'AviationStack: ATD 09:55, delay 235 mins',apiPending:false},
      {n:2,claim:'Ground damage — inherent fault',evidenceStatus:'green',evidenceDoc:'AMOS ground damage report confirmed',apiPending:true},
      {n:3,claim:'€400 compensation payable',evidenceStatus:'green',evidenceDoc:'1500–3500km band — Art 7(1)(b)',apiPending:false},
    ],
    documents:[], notes:'', activity:[
      {text:'AviationStack: delay 235 mins confirmed',time:'3 Apr 2024 10:00',type:'api'},
      {text:'AI triage: CONCEDE — ground damage, Huzar applies',time:'3 Apr 2024 10:01',type:'ai'},
      {text:'Settlement agreed — €400 per passenger',time:'10 Apr 2024 14:00',type:'action'},
      {text:'Case resolved — closed',time:'11 Apr 2024 09:00',type:'stage'},
    ],
    precedent:{cas:'Huzar v Jet2 [2014] EWCA Civ 791',out:'Ground equipment failure inherent to operations — NOT extraordinary. Compensation payable.'},
  },
  {
    ref:'AC-2024-1988', assignedTo:'SB', airline:'British Airways',
    claimant:'Reginald Okonkwo', solicitor:'Thompsons Solicitors',
    solAddr:'Congress House, London, WC1B 3LW', solRef:'TH/2024/RO/7712',
    flightNum:'BA0456', dep:'LHR', arr:'CDG',
    depFull:'London Heathrow (LHR)', arrFull:'Paris Charles de Gaulle (CDG)',
    flightDate:'7 July 2023', flightDateISO:'2023-07-07',
    receivedDate:'15 June 2024', receivedDateISO:'2024-06-15',
    std:'14:25', atd:'14:30', sta:'16:40', ata:'20:15',
    delayMins:215, distanceKm:341, aircraft:'Airbus A319-131', registration:'G-EUOB', value:'€250',
    disruptionType:'Medical Emergency', classification:'DEFEND', cat:'A',
    disruption:{
      cause:'Passenger cardiac event — aircraft returned to LHR for medical diversion',
      divertedTo:'LHR', delayCode:'93', safetynetRef:'SN/2023/BA456/0707-MED',
      publicSource:'OpenSky track — LHR return confirmed; CAA ADR BA/2024/ADR/1988',
    },
    locDate:'15 June 2024', cprDeadlineISO:'2024-09-15', cprDaysLeft:25,
    stage:'intake', loaStatus:'', evidencePct:15,
    triageNote:'Medical emergency return to LHR 7 Jul 2023. Passenger cardiac event — captain duty to divert. EC confirmed by multiple ADR decisions. Obtain SafetyNet medical log and crew witness statement.',
    points:[
      {n:1,claim:'Delay >3hrs — Art 7(1)(a)',evidenceStatus:'green',evidenceDoc:'AviationStack: ATA 20:15, delay 215 mins',apiPending:false},
      {n:2,claim:'Medical diversion — return to LHR',evidenceStatus:'green',evidenceDoc:'OpenSky track confirms LHR return 14:55',apiPending:false},
      {n:3,claim:'Extraordinary circumstances — medical EC',evidenceStatus:'amber',evidenceDoc:'SafetyNet medical log — internal API pending',apiPending:true},
      {n:4,claim:'Crew witness statement',evidenceStatus:'red',evidenceDoc:'Not yet obtained',apiPending:false},
    ],
    documents:[], notes:'', activity:[
      {text:'LOC received from Thompsons — assigned to S. Booth',time:'15 Jun 2024 09:00',type:'create'},
      {text:'AviationStack: delay 215 mins, LHR return detected',time:'15 Jun 2024 09:10',type:'api'},
      {text:'AI triage: DEFEND Cat A — medical diversion EC confirmed',time:'15 Jun 2024 09:11',type:'ai'},
    ],
    precedent:{cas:'Art 5(3) UK261 — Medical emergencies',out:'Medical emergencies requiring diversion confirmed extraordinary circumstances.'},
  },
];

/* ════════════════════════════════════════════════════════════════
   PERSISTENT STATE ENGINE
   localStorage key: '261c_state'
   Structure: { cases: [...], meta: { lastSaved, version } }

   Rules:
   - On first load (no localStorage), seed from SEED_CASES
   - All mutations go through STATE.saveCase() / STATE.addActivity()
   - Every module calls STATE.getCases() — never uses SEED_CASES directly
   - Supports: stage changes, notes, documents, evidence edits, activity log
════════════════════════════════════════════════════════════════ */
var STATE = (function(){
  var LS_KEY = '261c_state';
  var DOC_KEY = '261c_docs';

  function _load(){
    try{
      var raw = localStorage.getItem(LS_KEY);
      if(raw){ var p=JSON.parse(raw); if(p && p.cases && p.cases.length) return p; }
    }catch(e){}
    return null;
  }

  function _seed(){
    /* Deep clone seed cases so mutations don't affect the seed */
    var data = { cases: JSON.parse(JSON.stringify(SEED_CASES)), meta:{ version:'3.0', seeded: new Date().toISOString() } };
    _persist(data);
    return data;
  }

  function _persist(data){
    try{ localStorage.setItem(LS_KEY, JSON.stringify(data)); }catch(e){ console.warn('261Claims: localStorage write failed',e); }
  }

  var _state = _load() || _seed();

  return {
    /* Get all cases */
    getCases: function(){ return _state.cases; },

    /* Get one case by ref */
    getCase: function(ref){ return _state.cases.find(function(c){ return c.ref===ref; }) || null; },

    /* Save mutations to a case */
    saveCase: function(ref, mutations){
      var c = _state.cases.find(function(c){ return c.ref===ref; });
      if(!c) return;
      Object.assign(c, mutations);
      _persist(_state);
    },

    /* Add an activity log entry */
    addActivity: function(ref, text, type){
      var c = _state.cases.find(function(c){ return c.ref===ref; });
      if(!c) return;
      if(!c.activity) c.activity = [];
      var ts = new Date().toLocaleString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
      c.activity.unshift({ text:text, time:ts, type:type||'action' });
      _persist(_state);
    },

    /* Advance case to next stage */
    advanceStage: function(ref){
      var c = _state.cases.find(function(c){ return c.ref===ref; });
      if(!c) return;
      var idx = STAGES.indexOf(c.stage);
      if(idx < STAGES.length-1){
        var prev = c.stage;
        c.stage = STAGES[idx+1];
        var ts = new Date().toLocaleString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
        if(!c.activity) c.activity=[];
        c.activity.unshift({ text:'Stage advanced: '+STAGE_LABELS[prev]+' → '+STAGE_LABELS[c.stage], time:ts, type:'stage' });
        _persist(_state);
        return c.stage;
      }
      return c.stage;
    },

    /* Add document to case */
    addDocument: function(ref, doc){
      var c = _state.cases.find(function(c){ return c.ref===ref; });
      if(!c) return;
      if(!c.documents) c.documents=[];
      doc.uploadedAt = new Date().toLocaleString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
      c.documents.push(doc);
      var ts = doc.uploadedAt;
      if(!c.activity) c.activity=[];
      c.activity.unshift({ text:'Document uploaded: '+doc.label+' ('+doc.docType+')', time:ts, type:'upload' });
      _persist(_state);
    },

    /* Add a brand new case */
    addCase: function(caseObj){
      _state.cases.unshift(caseObj);
      _persist(_state);
    },

    /* Save evidence state for a case */
    saveEvidence: function(ref, evidenceState){
      try{
        var ev = JSON.parse(localStorage.getItem(DOC_KEY)||'{}');
        ev[ref] = evidenceState;
        localStorage.setItem(DOC_KEY, JSON.stringify(ev));
      }catch(e){}
    },

    /* Load evidence state for a case */
    loadEvidence: function(ref){
      try{
        var ev = JSON.parse(localStorage.getItem(DOC_KEY)||'{}');
        return ev[ref] || null;
      }catch(e){ return null; }
    },

    /* Save drafting docs */
    saveDraftDoc: function(ref, docId, content, status){
      try{
        var k = '261c_draft_'+ref+'_'+docId;
        localStorage.setItem(k, JSON.stringify({content:content, status:status||'draft', savedAt:new Date().toISOString()}));
      }catch(e){}
    },

    /* Load drafting doc */
    loadDraftDoc: function(ref, docId){
      try{
        var k = '261c_draft_'+ref+'_'+docId;
        var raw = localStorage.getItem(k);
        return raw ? JSON.parse(raw) : null;
      }catch(e){ return null; }
    },

    /* Reset to seed (dev utility) */
    reset: function(){
      localStorage.removeItem(LS_KEY);
      localStorage.removeItem(DOC_KEY);
      _state = _seed();
      window.location.reload();
    },

    /* Active user */
    getActiveUser: function(){ return sessionStorage.getItem('261c_user')||'SB'; },
    setActiveUser: function(id){ sessionStorage.setItem('261c_user', id); },
  };
})();

/* ── Backwards-compatible helpers (used by existing modules) ── */
function getActiveUser(){ return STATE.getActiveUser(); }
function setActiveUser(id){ return STATE.setActiveUser(id); }
function getCasesForUser(userId, stage){
  return STATE.getCases().filter(function(c){
    return c.assignedTo===userId && (!stage || c.stage===stage);
  });
}
function getCase(ref){ return STATE.getCase(ref); }
var ALL_CASES = { get length(){ return STATE.getCases().length; } }; /* stub for legacy refs */

/* ── Derived fields shim (for modules expecting old field names) ── */
function _enrichCase(c){
  if(!c) return c;
  if(!c.flight) c.flight = (c.flightNum||'') + ' — ' + (c.depFull||c.dep||'') + ' to ' + (c.arrFull||c.arr||'');
  if(!c.type)   c.type   = 'EC 261/2004 — ' + (c.cancelled?'Cancellation':c.disruptionType||'');
  if(!c.date)   c.date   = c.receivedDate || c.locDate || '';
  return c;
}
/* Enrich all cases on load */
STATE.getCases().forEach(function(c){ _enrichCase(c); });

/* ── Display helpers ── */
function daysUrgency(d){ return d<=3?'urgent':d<=7?'warn':'ok'; }
function urgencyLabel(d){ return d<=3?d+'d — URGENT':d<=7?d+'d — this week':d+'d'; }
function stageLabel(s){ return STAGE_LABELS[s]||s; }
function stageIcon(s){
  var m={intake:'ti-inbox',triage:'ti-search',cpr:'ti-calendar-due',evidence:'ti-folder-open',drafting:'ti-file-pencil',defence:'ti-shield',resolve:'ti-circle-check'};
  return m[s]||'ti-file';
}
function stageColor(s){ return STAGE_COLORS[s]||'#374151'; }
function stageBg(s){ return STAGE_BG[s]||'#F1F5F9'; }
function evPctColor(pct){ return pct>=70?'#22A863':pct>=40?'#F59E0B':'#C0392B'; }

function ts(){
  return new Date().toLocaleString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
}
