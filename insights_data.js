/* Closed case archive for Insights → Past cases */
var CLOSED_CASES = [
  {
    ref: 'REP-2025-0142',
    claimant: 'Nadia Collins',
    solicitor: 'Clarke & Partners',
    flightNum: 'HC 203',
    route: 'LGW to ALC',
    disruptionType: 'Weather',
    jurisdiction: 'england-wales',
    outcome: 'defended',
    value: 'EUR 250',
    saving: 'EUR 250',
    days: 18,
    confidence: 94,
    summary:
      'Defended after METAR, SIGMET and ATFM records showed unsafe convective weather at Alicante. Letter of response reused weather evidence bundle.',
    evidence: [
      'Operational delay records system report',
      'METAR/TAF',
      'SIGMET',
      'NOTAM',
      'Eurocontrol ATFM'
    ],
    caseLaw: ['Wallentin-Hermann', 'Sturgeon'],
    education: 'Weather evidence pack — complete guide',
    recommendation:
      'For similar weather claims, pull METAR/SIGMET first and challenge compensation under Art 5(3).'
  },
  {
    ref: 'REP-2025-0178',
    claimant: 'Oliver James',
    solicitor: 'Pemberton & Associates',
    flightNum: 'HC 442',
    route: 'LGW to BCN',
    disruptionType: 'ATC Restrictions',
    jurisdiction: 'england-wales',
    outcome: 'defended',
    value: 'EUR 250',
    saving: 'EUR 250',
    days: 12,
    confidence: 97,
    summary:
      'Clean ATC slot defence. Eurocontrol regulation data matched Operational delay records system delay codes and claimant withdrew after response.',
    evidence: [
      'Eurocontrol regulation',
      'Operational delay records system delay code',
      'Network Outlook',
      'Disruption data system log'
    ],
    caseLaw: ['Wallentin-Hermann'],
    education: 'ATC restrictions — the clean defence',
    recommendation:
      'High-confidence defend where Eurocontrol regulation directly matches the delay window.'
  },
  {
    ref: 'REP-2025-0199',
    claimant: 'Mathilde Roux',
    solicitor: 'Cabinet Lefevre',
    flightNum: 'HC 742',
    route: 'CDG to LTN',
    disruptionType: 'ATC Restrictions',
    jurisdiction: 'france',
    outcome: 'settled',
    value: 'EUR 250',
    saving: 'EUR 120',
    days: 28,
    confidence: 82,
    summary:
      'Settled commercially after mandatory French mediation timetable risk. ATC evidence was strong but care records were incomplete.',
    evidence: ['Eurocontrol data', 'Operational delay records system report', 'MTV mediation note'],
    caseLaw: ['Wallentin-Hermann'],
    education: 'France and Spain jurisdiction guide',
    recommendation:
      'In French claims, flag MTV mediation and care-record gaps early even when liability defence is strong.'
  },
  {
    ref: 'REP-2025-0206',
    claimant: 'Carlos Vega',
    solicitor: 'Bufete Sanchez',
    flightNum: 'HC 612',
    route: 'BCN to LGW',
    disruptionType: 'Technical Issues',
    jurisdiction: 'spain',
    outcome: 'paid',
    value: 'EUR 250',
    saving: 'EUR 0',
    days: 9,
    confidence: 76,
    summary:
      'Paid after Maintenance records system showed routine technical defect. Repository marks this as non-defendable under van der Lans.',
    evidence: [
      'Maintenance records system record',
      'Operational delay records system report',
      'Maintenance log'
    ],
    caseLaw: ['van der Lans', 'Wallentin-Hermann'],
    education: 'Technical defences are high risk',
    recommendation:
      'Technical issues require exceptional external cause; otherwise recommend settlement/payment.'
  },
  {
    ref: 'REP-2025-0217',
    claimant: 'Emma Lloyd',
    solicitor: 'Slater & Gordon',
    flightNum: 'HC 556',
    route: 'LHR to DUB',
    disruptionType: 'Birdstrike',
    jurisdiction: 'england-wales',
    outcome: 'withdrawn',
    value: 'EUR 250',
    saving: 'EUR 250',
    days: 21,
    confidence: 89,
    summary:
      'Claim withdrawn after Maintenance records system engineering inspection and Safety reporting system confirmed birdstrike and reasonable turnaround measures.',
    evidence: [
      'Maintenance records system inspection',
      'Safety reporting system report',
      'Crew report',
      'Airport bird log'
    ],
    caseLaw: ['Peskova'],
    education: 'Birdstrike evidence pack',
    recommendation:
      'Birdstrike claims should auto-request Maintenance records system, crew report and airport log.'
  }
];

function getStoredClosedCases() {
  try {
    return JSON.parse(sessionStorage.getItem('261c_repository') || '[]').map(function (c) {
      return {
        ref: c.ref,
        claimant: c.claimant || 'Stored case',
        solicitor: c.solicitor || 'Internal repository',
        flightNum: c.flightNum || 'Stored',
        route: 'Case file',
        disruptionType: c.disruptionType || 'Resolved claim',
        jurisdiction: 'england-wales',
        outcome: mapStoredOutcome(c.outcome),
        value: c.value || 'TBC',
        saving: c.saving || 'TBC',
        days: c.days || 0,
        confidence: 88,
        summary:
          c.summary ||
          'Stored from drafting workspace. Documents, evidence pack and AI rationale retained for future matching.',
        evidence: c.documents || c.evidence || ['Approved response'],
        caseLaw: c.caseLaw || ['Repository learning'],
        education: c.education || 'Internal precedent',
        recommendation:
          c.recommendation ||
          'Review stored evidence and draft versions before handling a similar new claim.'
      };
    });
  } catch (e) {
    return [];
  }
}

function mapStoredOutcome(outcome) {
  var o = String(outcome || '').toLowerCase();
  if (o.indexOf('settl') >= 0) return 'settled';
  if (o.indexOf('paid') >= 0) return 'paid';
  if (o.indexOf('withdraw') >= 0) return 'withdrawn';
  return 'defended';
}

function repoCases() {
  return CLOSED_CASES.concat(getStoredClosedCases());
}

function outcomeLabel(o) {
  return { defended: 'Defended', settled: 'Settled', paid: 'Paid', withdrawn: 'Withdrawn' }[o] || o;
}

function outcomeClass(o) {
  return o === 'defended'
    ? 'p-defended'
    : o === 'settled'
      ? 'p-settled'
      : o === 'paid'
        ? 'p-paid'
        : 'p-withdrawn';
}

function pastCaseStats() {
  var all = repoCases();
  return {
    total: all.length,
    defended: all.filter(function (c) {
      return c.outcome === 'defended';
    }).length,
    settled: all.filter(function (c) {
      return c.outcome === 'settled';
    }).length,
    paid: all.filter(function (c) {
      return c.outcome === 'paid';
    }).length,
    withdrawn: all.filter(function (c) {
      return c.outcome === 'withdrawn';
    }).length
  };
}

function filterPastCases(cases, query, activeOutcome) {
  var q = String(query || '').toLowerCase();
  return cases.filter(function (c) {
    var ok = !activeOutcome || activeOutcome === 'all' || c.outcome === activeOutcome;
    var hay = [
      c.ref,
      c.claimant,
      c.solicitor,
      c.flightNum,
      c.route,
      c.disruptionType,
      c.jurisdiction,
      c.outcome,
      c.summary,
      (c.evidence || []).join(' '),
      (c.caseLaw || []).join(' ')
    ]
      .join(' ')
      .toLowerCase();
    return ok && (!q || hay.indexOf(q) >= 0);
  });
}

function similarityScore(closed, live) {
  if (!closed || !live) return 0;
  var score = 0;
  if (closed.disruptionType === live.disruptionType) score += 45;
  if (closed.jurisdiction === live.jurisdiction) score += 25;
  if (
    String(closed.solicitor || '')
      .split(' ')[0]
      .toLowerCase() ===
    String(live.solicitor || '')
      .split(' ')[0]
      .toLowerCase()
  ) {
    score += 10;
  }
  if (String(closed.value).replace(/\D/g, '') === String(live.value).replace(/\D/g, '')) score += 10;
  return Math.min(98, score + (closed.outcome === 'defended' ? 8 : 0));
}

function getLiveSimilarCases(limit) {
  if (typeof ALL_CASES === 'undefined') return [];
  var archive = repoCases();
  var liveCases = ALL_CASES.filter(function (c) {
    return c.stage !== 'resolve';
  });
  return liveCases
    .map(function (live) {
      var best = archive
        .slice()
        .sort(function (a, b) {
          return similarityScore(b, live) - similarityScore(a, live);
        })[0];
      return { live: live, best: best, score: best ? similarityScore(best, live) : 0 };
    })
    .filter(function (x) {
      return x.best && x.score >= 40;
    })
    .sort(function (a, b) {
      return b.score - a.score;
    })
    .slice(0, limit || 4);
}

function jurisdictionDisplay(key) {
  if (typeof getJurisdiction === 'function') {
    var j = getJurisdiction(key);
    return (j.flag ? j.flag + ' ' : '') + j.name;
  }
  return key || '—';
}
