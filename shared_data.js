/* ── 261Claims shared case data ── */
/* Injected into all modules. Single source of truth. */

const USERS = {
  SB: { id:'SB', name:'S. Booth',   full:'Sarah Booth',   role:'Head of Legal Ops',  initials:'SB' },
  JP: { id:'JP', name:'J. Patel',   full:'James Patel',   role:'Senior Solicitor',   initials:'JP' },
  KR: { id:'KR', name:'K. Rahman',  full:'Kiran Rahman',  role:'Solicitor',          initials:'KR' },
};

const ALL_CASES = [
  /* ── S. Booth cases ── */
  {
    ref:'AC-2026-0089', assignedTo:'SB',
    claimant:'Daniel Hartley', solicitor:'Pemberton & Associates Solicitors LLP',
    flight:'HC 1184 — LTN to BCN (diverted VLC)', flightNum:'HC 1184',
    dep:'LTN', arr:'BCN', flightDate:'14 March 2026',
    value:'£39,000+', type:'EC 261/2004 — Diversion / consequential loss',
    locDate:'22 May 2026', stage:'evidence', cat:'C',
    disruptionType:'Weather', classification:'ESCALATE',
    evidencePct:35, cprDaysLeft:3,
    points:[
      {n:1,claim:'Delay — Art 7(1)(a)',evidenceStatus:'green',evidenceDoc:'TOPS flight data'},
      {n:2,claim:'Extraordinary circumstances — weather',evidenceStatus:'amber',evidenceDoc:'METAR/SIGMET pending'},
      {n:3,claim:'Article 9 duty of care',evidenceStatus:'red',evidenceDoc:'Valencia ground records outstanding'},
      {n:4,claim:'Consequential loss — £38,250',evidenceStatus:'red',evidenceDoc:'No counter-evidence yet'},
      {n:5,claim:'Travel & subsistence — £141.80',evidenceStatus:'amber',evidenceDoc:'Receipts pending'},
    ],
    loaStatus:'approved', triageNote:'Complex. Escalate to senior counsel on consequential loss point.',
    docs:[], activity:[
      {text:'Evidence module opened',time:'Today 09:14',type:'create'},
      {text:'AI triage complete — ESCALATE flag raised',time:'Yesterday 16:30',type:'ai'},
    ]
  },
  {
    ref:'AC-2026-0087', assignedTo:'SB',
    claimant:'Marcus Chen', solicitor:'Fletchers Solicitors',
    flight:'HC 891 — MAN to CDG', flightNum:'HC 891',
    dep:'MAN', arr:'CDG', flightDate:'18 May 2026',
    value:'€400', type:'EC 261/2004 — Cancellation',
    locDate:'26 May 2026', stage:'defence', cat:'B',
    disruptionType:'Industrial Action', classification:'DEFEND',
    evidencePct:90, cprDaysLeft:5,
    points:[
      {n:1,claim:'Cancellation — Art 5(1)(c)',evidenceStatus:'green',evidenceDoc:'TOPS cancellation record'},
      {n:2,claim:'Extraordinary circumstances — strike',evidenceStatus:'green',evidenceDoc:'Eurocontrol NOTAM confirmed'},
      {n:3,claim:'Art 8 — re-routing obligation',evidenceStatus:'amber',evidenceDoc:'Re-routing records needed'},
    ],
    loaStatus:'sent', triageNote:'ATC industrial action. Strong extraordinary circumstances defence.',
    docs:[], activity:[
      {text:'Defence letter drafted — pending sign-off',time:'Today 08:45',type:'draft'},
      {text:'Evidence pack complete — 90%',time:'Yesterday 14:20',type:'action'},
    ]
  },
  {
    ref:'AC-2026-0071', assignedTo:'SB',
    claimant:'Priya Singh', solicitor:'Irwin Mitchell LLP',
    flight:'HC 118 — LTN to AGP', flightNum:'HC 118',
    dep:'LTN', arr:'AGP', flightDate:'2 April 2026',
    value:'€250', type:'EC 261/2004 — ATC delay',
    locDate:'18 May 2026', stage:'resolve', cat:'A',
    disruptionType:'ATC Restrictions', classification:'DEFEND',
    evidencePct:100, cprDaysLeft:22,
    points:[
      {n:1,claim:'Delay 3hrs 22mins — Art 7(1)(a)',evidenceStatus:'green',evidenceDoc:'TOPS confirmed'},
      {n:2,claim:'Extraordinary circumstances — ATC',evidenceStatus:'green',evidenceDoc:'Eurocontrol regulation confirmed'},
    ],
    loaStatus:'sent', triageNote:'Clean ATC case. Defendable. Fast track.',
    docs:[], activity:[
      {text:'Defence filed to Irwin Mitchell LLP',time:'28 May 11:00',type:'stage'},
      {text:'Evidence pack complete',time:'26 May 09:30',type:'action'},
    ]
  },
  {
    ref:'AC-2026-0101', assignedTo:'SB',
    claimant:'Angela Foster', solicitor:'Clarke & Partners Solicitors',
    flight:'HC 203 — LGW to ALC', flightNum:'HC 203',
    dep:'LGW', arr:'ALC', flightDate:'20 May 2026',
    value:'€250', type:'EC 261/2004 — Weather delay',
    locDate:'30 May 2026', stage:'intake', cat:'A',
    disruptionType:'Weather', classification:'DEFEND',
    evidencePct:0, cprDaysLeft:21,
    points:[], loaStatus:'', triageNote:'',
    docs:[], activity:[
      {text:'LOC received — assigned to S. Booth',time:'Today 07:55',type:'create'},
    ]
  },

  /* ── J. Patel cases ── */
  {
    ref:'AC-2026-0091', assignedTo:'JP',
    claimant:'Rebecca Walsh', solicitor:'Clarke & Partners Solicitors',
    flight:'HC 307 — MAN to AMS', flightNum:'HC 307',
    dep:'MAN', arr:'AMS', flightDate:'9 April 2026',
    value:'€250', type:'EC 261/2004 — ATC delay',
    locDate:'27 May 2026', stage:'triage', cat:'A',
    disruptionType:'ATC Restrictions', classification:'DEFEND',
    evidencePct:0, cprDaysLeft:8,
    points:[
      {n:1,claim:'Delay 3hrs 36mins — Art 7(1)(a)',evidenceStatus:'green',evidenceDoc:'Confirmed via TOPS'},
      {n:2,claim:'Extraordinary circumstances — ATC ATFM restriction AMS',evidenceStatus:'amber',evidenceDoc:'Eurocontrol data requested'},
    ],
    loaStatus:'sent', triageNote:'',
    docs:[], activity:[
      {text:'LOC processed — triage stage',time:'Yesterday 15:20',type:'stage'},
      {text:'LOA sent to Clarke & Partners',time:'Yesterday 15:15',type:'action'},
    ]
  },
  {
    ref:'AC-2026-0083', assignedTo:'JP',
    claimant:'David Okafor', solicitor:'Slater & Gordon',
    flight:'HC 204 — LTN to PMI', flightNum:'HC 204',
    dep:'LTN', arr:'PMI', flightDate:'5 May 2026',
    value:'£12,000', type:'EC 261/2004 — Diversion / overnight',
    locDate:'24 May 2026', stage:'evidence', cat:'C',
    disruptionType:'Weather', classification:'INVESTIGATE',
    evidencePct:55, cprDaysLeft:12,
    points:[
      {n:1,claim:'Delay — Art 7(1)(a)',evidenceStatus:'green',evidenceDoc:'Confirmed'},
      {n:2,claim:'Extraordinary circumstances — weather diversion',evidenceStatus:'amber',evidenceDoc:'METAR obtained, SIGMET pending'},
      {n:3,claim:'Overnight accommodation — Art 9',evidenceStatus:'red',evidenceDoc:'Hotel records outstanding'},
      {n:4,claim:'Loss of earnings — £11,500',evidenceStatus:'red',evidenceDoc:'Not yet investigated'},
    ],
    loaStatus:'sent', triageNote:'Investigate overnight care provision and loss of earnings claim.',
    docs:[], activity:[
      {text:'METAR obtained for PMI 05/05',time:'29 May 14:10',type:'upload'},
      {text:'Evidence stage opened',time:'27 May 09:00',type:'stage'},
    ]
  },
  {
    ref:'AC-2026-0076', assignedTo:'JP',
    claimant:'Sarah Taylor', solicitor:'Thompsons Solicitors',
    flight:'HC 330 — LGW to ALC', flightNum:'HC 330',
    dep:'LGW', arr:'ALC', flightDate:'28 April 2026',
    value:'€400', type:'EC 261/2004 — Weather delay',
    locDate:'22 May 2026', stage:'drafting', cat:'B',
    disruptionType:'Weather', classification:'DEFEND',
    evidencePct:100, cprDaysLeft:7,
    points:[
      {n:1,claim:'Delay 4hrs 10mins — Art 7(1)(b)',evidenceStatus:'green',evidenceDoc:'TOPS confirmed'},
      {n:2,claim:'Extraordinary circumstances — weather',evidenceStatus:'green',evidenceDoc:'METAR/SIGMET confirmed'},
    ],
    loaStatus:'sent', triageNote:'Clean weather case. All evidence on file. Draft LOR.',
    docs:[], activity:[
      {text:'Evidence pack complete — LOR ready to draft',time:'28 May 16:00',type:'stage'},
    ]
  },

  /* ── K. Rahman cases ── */
  {
    ref:'AC-2026-0094', assignedTo:'KR',
    claimant:'Thomas Morrison', solicitor:'Irwin Mitchell LLP',
    flight:'HC 442 — LGW to BCN', flightNum:'HC 442',
    dep:'LGW', arr:'BCN', flightDate:'15 May 2026',
    value:'€250', type:'EC 261/2004 — ATC delay',
    locDate:'28 May 2026', stage:'intake', cat:'A',
    disruptionType:'ATC Restrictions', classification:'DEFEND',
    evidencePct:0, cprDaysLeft:15,
    points:[], loaStatus:'', triageNote:'',
    docs:[], activity:[
      {text:'LOC received — assigned to K. Rahman',time:'28 May 08:00',type:'create'},
    ]
  },
  {
    ref:'AC-2026-0079', assignedTo:'KR',
    claimant:'James Singh', solicitor:'Slater & Gordon',
    flight:'HC 556 — LHR to DUB', flightNum:'HC 556',
    dep:'LHR', arr:'DUB', flightDate:'10 May 2026',
    value:'€250', type:'EC 261/2004 — ATC delay',
    locDate:'20 May 2026', stage:'cpr', cat:'A',
    disruptionType:'ATC Restrictions', classification:'DEFEND',
    evidencePct:0, cprDaysLeft:18,
    points:[
      {n:1,claim:'Delay 3hrs 15mins — Art 7(1)(a)',evidenceStatus:'green',evidenceDoc:'TOPS confirmed'},
      {n:2,claim:'Extraordinary circumstances — ATC',evidenceStatus:'amber',evidenceDoc:'Eurocontrol data pending'},
    ],
    loaStatus:'sent', triageNote:'Straightforward ATC. Fast track to evidence.',
    docs:[], activity:[
      {text:'LOA sent — CPR deadline set',time:'22 May 11:00',type:'action'},
    ]
  },
  {
    ref:'AC-2026-0098', assignedTo:'KR',
    claimant:'Emma Williams', solicitor:'Fletchers Solicitors',
    flight:'HC 612 — MAN to PMI', flightNum:'HC 612',
    dep:'MAN', arr:'PMI', flightDate:'22 May 2026',
    value:'€250', type:'EC 261/2004 — Weather delay',
    locDate:'29 May 2026', stage:'evidence', cat:'A',
    disruptionType:'Weather', classification:'DEFEND',
    evidencePct:45, cprDaysLeft:19,
    points:[
      {n:1,claim:'Delay 3hrs 45mins — Art 7(1)(a)',evidenceStatus:'green',evidenceDoc:'TOPS confirmed'},
      {n:2,claim:'Extraordinary circumstances — weather',evidenceStatus:'amber',evidenceDoc:'METAR obtained, SIGMET pending'},
    ],
    loaStatus:'sent', triageNote:'Weather delay. Obtain SIGMET and NOTAM.',
    docs:[], activity:[
      {text:'METAR obtained for PMI',time:'30 May 09:00',type:'upload'},
      {text:'Evidence stage opened',time:'29 May 14:00',type:'stage'},
    ]
  },
];

/* ── Helpers ── */
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

/* Active user — persisted in sessionStorage */
function getActiveUser(){
  return sessionStorage.getItem('261c_user')||'SB';
}
function setActiveUser(id){
  sessionStorage.setItem('261c_user', id);
}
