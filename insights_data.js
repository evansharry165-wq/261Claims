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
    region: 'london',
    court: 'Central London County Court',
    courtId: 'cc-london-central',
    judge: 'HHJ Catherine Hart',
    judgeId: 'judge-hart-ew',
    outcome: 'defended',
    value: 'EUR 250',
    saving: 'EUR 250',
    days: 18,
    confidence: 94,
    closedAt: '2025-09-14',
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
    strategyTags: ['weather-ec', 'art-5-3'],
    evidenceTags: ['metar-sigmet', 'eurocontrol-atfm'],
    draftingTags: ['lor-formal-ew'],
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
    region: 'london',
    court: 'Central London County Court',
    courtId: 'cc-london-central',
    judge: 'HHJ Catherine Hart',
    judgeId: 'judge-hart-ew',
    outcome: 'defended',
    value: 'EUR 250',
    saving: 'EUR 250',
    days: 12,
    confidence: 97,
    closedAt: '2025-10-02',
    summary:
      'Clean ATC slot defence. Eurocontrol regulation data matched Operational delay records system delay codes and claimant withdrew after response.',
    evidence: [
      'Eurocontrol regulation',
      'Operational delay records system delay code',
      'Network Outlook',
      'Disruption data system log'
    ],
    caseLaw: ['Wallentin-Hermann'],
    strategyTags: ['atc-ec', 'eurocontrol'],
    evidenceTags: ['eurocontrol-atfm'],
    draftingTags: ['lor-formal-ew'],
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
    region: 'ile-de-france',
    court: 'Tribunal Judiciaire de Paris',
    courtId: 'tj-paris',
    judge: 'Juge Marie Fontaine',
    judgeId: 'judge-fontaine-paris',
    outcome: 'settled',
    value: 'EUR 250',
    saving: 'EUR 120',
    days: 28,
    confidence: 82,
    closedAt: '2025-10-20',
    summary:
      'Settled commercially after mandatory French mediation timetable risk. ATC evidence was strong but care records were incomplete.',
    evidence: ['Eurocontrol data', 'Operational delay records system report', 'MTV mediation note'],
    caseLaw: ['Wallentin-Hermann'],
    strategyTags: ['atc-ec', 'mtv-mediation'],
    evidenceTags: ['eurocontrol-atfm', 'passenger-care'],
    draftingTags: ['lettre-reponse-fr'],
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
    region: 'catalonia',
    court: 'Juzgado de lo Mercantil nº 3 Barcelona',
    courtId: 'jlm-barcelona-3',
    judge: 'Magistrada Elena Ruiz',
    judgeId: 'judge-ruiz-barcelona',
    outcome: 'paid',
    value: 'EUR 250',
    saving: 'EUR 0',
    days: 9,
    confidence: 76,
    closedAt: '2025-11-01',
    summary:
      'Paid after Maintenance records system showed routine technical defect. Non-defendable under van der Lans.',
    evidence: [
      'Maintenance records system record',
      'Operational delay records system report',
      'Maintenance log'
    ],
    caseLaw: ['van der Lans', 'Wallentin-Hermann'],
    strategyTags: ['technical-defect', 'van-der-lans'],
    evidenceTags: ['maintenance-log'],
    draftingTags: ['escrito-respuesta-formal'],
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
    region: 'london',
    court: 'Central London County Court',
    courtId: 'cc-london-central',
    judge: 'HHJ Catherine Hart',
    judgeId: 'judge-hart-ew',
    outcome: 'withdrawn',
    value: 'EUR 250',
    saving: 'EUR 250',
    days: 21,
    confidence: 89,
    closedAt: '2025-11-08',
    summary:
      'Claim withdrawn after Maintenance records system engineering inspection and Safety reporting system confirmed birdstrike and reasonable turnaround measures.',
    evidence: [
      'Maintenance records system inspection',
      'Safety reporting system report',
      'Crew report',
      'Airport bird log'
    ],
    caseLaw: ['Peskova'],
    strategyTags: ['birdstrike-ec', 'reasonable-measures', 'peskova'],
    evidenceTags: ['maintenance-log', 'crew-report', 'airport-bird-log'],
    draftingTags: ['lor-formal-ew'],
    education: 'Birdstrike evidence pack',
    recommendation:
      'Birdstrike claims should auto-request Maintenance records system, crew report and airport log.'
  },
  {
    ref: 'REP-2025-0231',
    claimant: 'Lucía Fernández',
    solicitor: 'Despacho Fernández',
    flightNum: 'HC 228',
    route: 'MAD to LTN',
    disruptionType: 'Birdstrike',
    jurisdiction: 'spain',
    region: 'madrid',
    court: 'Juzgado de lo Mercantil nº 7 Madrid',
    courtId: 'jlm-madrid-7',
    judge: 'Magistrado Antonio Méndez',
    judgeId: 'judge-mendez-madrid',
    outcome: 'defended',
    value: 'EUR 250',
    saving: 'EUR 250',
    days: 16,
    confidence: 91,
    closedAt: '2025-11-14',
    summary:
      'Defended at mercantile court after engineering inspection, crew report and Barajas airport bird log confirmed Pešková extraordinary circumstances and reasonable turnaround.',
    evidence: [
      'Maintenance records system inspection',
      'Crew report',
      'Airport bird log',
      'Safety reporting system report',
      'Operational delay records system report'
    ],
    caseLaw: ['Peskova', 'Wallentin-Hermann'],
    strategyTags: ['birdstrike-ec', 'reasonable-measures', 'peskova'],
    evidenceTags: ['maintenance-log', 'crew-report', 'airport-bird-log'],
    draftingTags: ['escrito-respuesta-formal'],
    education: 'Birdstrike evidence pack',
    recommendation:
      'For Spanish birdstrike claims, attach airport bird log and engineering inspection before drafting contestación.'
  },
  {
    ref: 'REP-2025-0238',
    claimant: 'Marc Soler',
    solicitor: 'Bufete Morales',
    flightNum: 'HC 339',
    route: 'AGP to LTN',
    disruptionType: 'Birdstrike',
    jurisdiction: 'spain',
    region: 'valencia',
    court: 'Juzgado de lo Mercantil nº 2 Valencia',
    courtId: 'jlm-valencia-2',
    judge: 'Magistrada Laura Torres',
    judgeId: 'judge-torres-valencia',
    outcome: 'defended',
    value: 'EUR 250',
    saving: 'EUR 250',
    days: 19,
    confidence: 93,
    closedAt: '2025-11-22',
    summary:
      'Successful defence combining Maintenance records system strike record, crew statement and Malaga airport wildlife log. Claimant discontinued after escrito de respuesta.',
    evidence: [
      'Maintenance records system strike record',
      'Crew report',
      'Airport bird log',
      'Operational delay records system report'
    ],
    caseLaw: ['Peskova'],
    strategyTags: ['birdstrike-ec', 'reasonable-measures'],
    evidenceTags: ['maintenance-log', 'crew-report', 'airport-bird-log'],
    draftingTags: ['escrito-respuesta-formal'],
    education: 'Birdstrike evidence pack',
    recommendation:
      'Valencia mercantile court expects numbered exhibits in contestación — mirror archive bundle structure.'
  },
  {
    ref: 'REP-2025-0244',
    claimant: 'Ana Beltrán',
    solicitor: 'Bufete Sanchez',
    flightNum: 'HC 612',
    route: 'BCN to LGW',
    disruptionType: 'Birdstrike',
    jurisdiction: 'spain',
    region: 'catalonia',
    court: 'Juzgado de lo Mercantil nº 3 Barcelona',
    courtId: 'jlm-barcelona-3',
    judge: 'Magistrada Elena Ruiz',
    judgeId: 'judge-ruiz-barcelona',
    outcome: 'settled',
    value: 'EUR 250',
    saving: 'EUR 130',
    days: 24,
    confidence: 80,
    closedAt: '2025-12-03',
    summary:
      'Settled after partial care-record gap despite strong birdstrike event evidence. Judge Ruiz flagged missing passenger communications during delay.',
    evidence: [
      'Maintenance records system inspection',
      'Crew report',
      'Safety reporting system report',
      'Operational delay records system report'
    ],
    caseLaw: ['Peskova'],
    strategyTags: ['birdstrike-ec', 'reasonable-measures'],
    evidenceTags: ['maintenance-log', 'crew-report', 'passenger-care'],
    draftingTags: ['escrito-respuesta-formal'],
    education: 'Birdstrike evidence pack',
    recommendation:
      'In Barcelona mercantile court, birdstrike liability may succeed but care gaps still drive settlement — pull MAX OPS comms early.'
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
        route: c.route || 'Case file',
        disruptionType: c.disruptionType || 'Resolved claim',
        jurisdiction: c.jurisdiction || 'england-wales',
        region: c.region || '',
        court: c.court || '',
        courtId: c.courtId || '',
        judge: c.judge || '',
        judgeId: c.judgeId || '',
        outcome: mapStoredOutcome(c.outcome),
        value: c.value || 'TBC',
        saving: c.saving || 'TBC',
        days: c.days || 0,
        confidence: c.confidence || 88,
        closedAt: c.closedAt || c.stored || '',
        summary:
          c.summary ||
          'Stored from drafting workspace. Documents, evidence pack and AI rationale retained for future matching.',
        evidence: c.documents || c.evidence || ['Approved response'],
        caseLaw: c.caseLaw || ['Repository learning'],
        strategyTags: c.strategyTags || ['repository-learning'],
        evidenceTags: c.evidenceTags || [],
        draftingTags: c.draftingTags || [],
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
  return InsightsSearch.filterCases(cases, {
    q: query,
    outcome: activeOutcome || 'all'
  });
}

function jurisdictionDisplay(key) {
  if (typeof getJurisdiction === 'function') {
    var j = getJurisdiction(key);
    return (j.flag ? j.flag + ' ' : '') + j.name;
  }
  return key || '—';
}

function escapeClosedHtml(v) {
  return String(v == null ? '' : v).replace(/[&<>"']/g, function (ch) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
  });
}

function renderClosedCaseCard(c, selectedRef) {
  var esc = escapeClosedHtml;
  var selected = c.ref === selectedRef ? ' selected' : '';
  return (
    '<div class="case-card' +
    selected +
    '" data-ref="' +
    esc(c.ref) +
    '" onclick="InsightsUI.selectCase(this.dataset.ref)"><div><div class="ref">' +
    esc(c.ref) +
    '</div><div class="name">' +
    esc(c.claimant) +
    ' · ' +
    esc(c.flightNum) +
    '</div><div class="meta">' +
    esc(c.route) +
    ' · ' +
    esc(c.disruptionType) +
    (c.court ? '<br>' + esc(c.court) : '') +
    '<br>' +
    esc(c.summary) +
    '</div></div><div style="text-align:right"><span class="pill ' +
    outcomeClass(c.outcome) +
    '">' +
    esc(outcomeLabel(c.outcome)) +
    '</span><div style="font-size:10px;color:var(--text3);margin-top:6px">' +
    c.confidence +
    '% confidence</div></div></div>'
  );
}

function renderClosedCaseDetail(c, options) {
  options = options || {};
  var esc = escapeClosedHtml;
  if (!c) {
    return '<div class="detail-empty">Select a case to view outcome learning.</div>';
  }
  var authorities =
    typeof InsightTags !== 'undefined'
      ? InsightTags.authoritiesForCase(c)
          .map(function (a) {
            return (
              '<a class="tag-chip" href="education.html?section=caselaw">' + esc(a.name) + '</a>'
            );
          })
          .join('')
      : (c.caseLaw || [])
          .map(function (cl) {
            return '<span class="tag-chip">' + esc(cl) + '</span>';
          })
          .join('');
  var updates =
    options.updates ||
    (typeof InsightTags !== 'undefined'
      ? InsightTags.updatesForFilters({
          disruption: c.disruptionType,
          jurisdiction: c.jurisdiction
        })
      : []);
  var updatesHtml = updates.length
    ? '<div class="learn-box"><strong>Related legal updates</strong><div style="margin-top:6px">' +
      updates
        .slice(0, 3)
        .map(function (u) {
          return (
            '<div style="margin-bottom:6px"><a href="' +
            InsightTags.educationLink(u) +
            '">' +
            esc(u.title) +
            '</a> <span style="color:var(--text3)">· ' +
            esc(u.date) +
            '</span></div>'
          );
        })
        .join('') +
      '</div></div>'
    : '';
  return (
    '<div class="detail-body">' +
    '<div class="kv"><div class="kv-label">Outcome</div><div class="kv-val"><span class="pill ' +
    outcomeClass(c.outcome) +
    '">' +
    esc(outcomeLabel(c.outcome)) +
    '</span></div></div>' +
    '<div class="kv"><div class="kv-label">Jurisdiction</div><div class="kv-val">' +
    esc(jurisdictionDisplay(c.jurisdiction)) +
    '</div></div>' +
    (c.court
      ? '<div class="kv"><div class="kv-label">Court</div><div class="kv-val">' + esc(c.court) + '</div></div>'
      : '') +
    (c.judge
      ? '<div class="kv"><div class="kv-label">Judge</div><div class="kv-val">' + esc(c.judge) + '</div></div>'
      : '') +
    '<div class="kv"><div class="kv-label">Saving</div><div class="kv-val">' +
    esc(c.saving) +
    '</div></div>' +
    '<div class="kv"><div class="kv-label">Time to close</div><div class="kv-val">' +
    c.days +
    ' days</div></div>' +
    (c.closedAt
      ? '<div class="kv"><div class="kv-label">Closed</div><div class="kv-val">' + esc(c.closedAt) + '</div></div>'
      : '') +
    '<div class="case-law"><strong>Summary:</strong> ' +
    esc(c.summary) +
    '</div>' +
    '<div class="case-law"><strong>Recommendation:</strong> ' +
    esc(c.recommendation) +
    '</div>' +
    '<div class="ev-list">' +
    (c.evidence || [])
      .map(function (e) {
        return '<span class="ev">' + esc(e) + '</span>';
      })
      .join('') +
    '</div>' +
    '<div class="tag-row">' +
    authorities +
    '</div>' +
    updatesHtml +
    (c.education
      ? '<div class="learn-box"><a href="education.html">' +
        esc(c.education) +
        ' — Education Hub</a></div>'
      : '') +
    '</div>'
  );
}
