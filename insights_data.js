/* Closed case archive for Insights → Past cases */
var CLOSED_CASES = [
  {ref:'REP-2025-0142',claimant:'Nadia Collins',solicitor:'Clarke & Partners',flightNum:'HC 203',route:'LGW to ALC',disruptionType:'Weather',jurisdiction:'england-wales',outcome:'defended',value:'EUR 250',saving:'EUR 250',days:18,confidence:94,summary:'Defended after METAR, SIGMET and ATFM records showed unsafe convective weather at Alicante.',evidence:['Operational delay records system report','METAR/TAF','SIGMET','NOTAM','Eurocontrol ATFM'],caseLaw:['Wallentin-Hermann','Sturgeon'],recommendation:'For similar weather claims, pull METAR/SIGMET first and challenge compensation under Art 5(3).'},
  {ref:'REP-2025-0178',claimant:'Oliver James',solicitor:'Pemberton & Associates',flightNum:'HC 442',route:'LGW to BCN',disruptionType:'ATC Restrictions',jurisdiction:'england-wales',outcome:'defended',value:'EUR 250',saving:'EUR 250',days:12,confidence:97,summary:'Clean ATC slot defence. Eurocontrol regulation data matched Operational delay records system delay codes and claimant withdrew after response.',evidence:['Eurocontrol regulation','Operational delay records system delay code','Network Outlook','Disruption data system log'],caseLaw:['Wallentin-Hermann'],recommendation:'High-confidence defend where Eurocontrol regulation directly matches the delay window.'},
  {ref:'REP-2025-0199',claimant:'Mathilde Roux',solicitor:'Cabinet Lefevre',flightNum:'HC 742',route:'CDG to LTN',disruptionType:'ATC Restrictions',jurisdiction:'france',outcome:'settled',value:'EUR 250',saving:'EUR 120',days:28,confidence:82,summary:'Settled commercially after mandatory French mediation timetable risk.',evidence:['Eurocontrol data','Operational delay records system report','MTV mediation note'],caseLaw:['Wallentin-Hermann'],recommendation:'In French claims, flag MTV mediation and care-record gaps early.'},
  {ref:'REP-2025-0206',claimant:'Carlos Vega',solicitor:'Bufete Sanchez',flightNum:'HC 612',route:'BCN to LGW',disruptionType:'Technical Issues',jurisdiction:'spain',outcome:'paid',value:'EUR 250',saving:'EUR 0',days:9,confidence:76,summary:'Paid after Maintenance records system showed routine technical defect. Non-defendable under van der Lans.',evidence:['Maintenance records system record','Operational delay records system report','Maintenance log'],caseLaw:['van der Lans','Wallentin-Hermann'],recommendation:'Technical issues require exceptional external cause; otherwise recommend settlement.'},
  {ref:'REP-2025-0217',claimant:'Emma Lloyd',solicitor:'Slater & Gordon',flightNum:'HC 556',route:'LHR to DUB',disruptionType:'Birdstrike',jurisdiction:'england-wales',outcome:'withdrawn',value:'EUR 250',saving:'EUR 250',days:21,confidence:89,summary:'Claim withdrawn after Maintenance records system engineering inspection and Safety reporting system confirmed birdstrike.',evidence:['Maintenance records system inspection','Safety reporting system report','Crew report','Airport bird log'],caseLaw:['Peskova'],recommendation:'Birdstrike claims should auto-request Maintenance records system, crew report and airport log.'}
];

function getStoredClosedCases() {
  try {
    return JSON.parse(sessionStorage.getItem('261c_repository') || '[]').map(function (c) {
      return {
        ref: c.ref,
        claimant: c.claimant || 'Stored case',
        solicitor: 'Internal repository',
        flightNum: c.flightNum || 'Stored',
        route: 'Case file',
        disruptionType: c.disruptionType || 'Resolved claim',
        jurisdiction: 'england-wales',
        outcome: 'defended',
        value: c.value || 'TBC',
        saving: 'TBC',
        days: 0,
        confidence: 88,
        summary: 'Stored from drafting workspace. Documents and evidence pack retained for future matching.',
        evidence: c.documents || ['Approved response'],
        caseLaw: ['Repository learning'],
        recommendation: 'Review stored evidence before handling a similar new claim.'
      };
    });
  } catch (e) {
    return [];
  }
}

function repoCases() {
  return CLOSED_CASES.concat(getStoredClosedCases());
}

function outcomeLabel(o) {
  return { defended: 'Defended', settled: 'Settled', paid: 'Paid', withdrawn: 'Withdrawn' }[o] || o;
}

function outcomeClass(o) {
  return o === 'defended' ? 'p-defended' : o === 'settled' ? 'p-settled' : o === 'paid' ? 'p-paid' : 'p-withdrawn';
}
