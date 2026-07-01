/* Intelligence — conversational AI search (demo NLP over case portfolio) */
var IntelAISearch = (function () {
  var AIRPORTS = {
    LGW: ['lgw', 'gatwick', 'london gatwick'],
    LHR: ['lhr', 'heathrow', 'london heathrow'],
    LTN: ['ltn', 'luton', 'london luton'],
    MAN: ['man', 'manchester'],
    BCN: ['bcn', 'barcelona'],
    MAD: ['mad', 'madrid'],
    CDG: ['cdg', 'charles de gaulle', 'paris cdg'],
    LYS: ['lys', 'lyon'],
    MRS: ['mrs', 'marseille'],
    NCE: ['nice', 'nice airport'],
    ALC: ['alc', 'alicante'],
    AMS: ['ams', 'amsterdam'],
    DUB: ['dub', 'dublin'],
    VLC: ['vlc', 'valencia'],
    AGP: ['agp', 'malaga']
  };

  var DISRUPTION_PATTERNS = [
    { key: 'Cancellation', patterns: ['cancel', 'annul', 'annulation', 'cancelaci'] },
    { key: 'Delay', patterns: ['delay', 'retard', 'retraso', 'diversion', 'diverted'] },
    { key: 'Weather', patterns: ['weather', 'météo', 'meteo', 'meteorolog', 'storm', 'wind', 'snow', 'fog'] },
    { key: 'ATC Restrictions', patterns: ['atc', 'atfm', 'air traffic', 'slot restriction', 'flow control'] },
    { key: 'Denied Boarding', patterns: ['denied boarding', 'refus d', 'embarque denegado'] },
    { key: 'Technical Issues', patterns: ['technical', 'maintenance', 'aircraft defect', 'mécanique'] }
  ];

  var JURISDICTION_PATTERNS = [
    { key: 'england-wales', patterns: ['england', 'wales', 'uk', 'british', 'ew'] },
    { key: 'france', patterns: ['france', 'french', 'français', 'fr '] },
    { key: 'spain', patterns: ['spain', 'spanish', 'españa', 'espanol', 'español'] }
  ];

  var TRIAGE_PATTERNS = [
    { key: 'DEFEND', patterns: ['defend', 'défendre', 'defender'] },
    { key: 'INVESTIGATE', patterns: ['investigate', 'investig', 'review'] },
    { key: 'ESCALATE', patterns: ['escalate', 'high value', 'high exposure', 'montreal'] }
  ];

  function normalizeText(s) {
    return String(s || '')
      .toLowerCase()
      .replace(/[’']/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }

  function matchPatterns(text, groups) {
    var hits = [];
    groups.forEach(function (g) {
      if (g.patterns.some(function (p) { return text.indexOf(p) >= 0; })) hits.push(g.key);
    });
    return hits;
  }

  function aliasInText(text, alias) {
    if (alias.length <= 3) {
      return new RegExp('(^|\\s)' + alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(\\s|$)', 'i').test(text);
    }
    return text.indexOf(alias) >= 0;
  }

  function detectAirports(text) {
    var codes = [];
    Object.keys(AIRPORTS).forEach(function (code) {
      if (AIRPORTS[code].some(function (alias) { return aliasInText(text, alias); })) {
        if (codes.indexOf(code) < 0) codes.push(code);
      }
      if (aliasInText(text, code.toLowerCase()) && codes.indexOf(code) < 0) codes.push(code);
    });
    return codes;
  }

  function detectDirection(text) {
    if (/\bfrom\b|\bdepart(ing|ure)?\b|\bout of\b|\bleaving\b/.test(text)) return 'dep';
    if (/\bto\b|\barriv(ing|al)?\b|\binto\b|\binbound\b/.test(text)) return 'arr';
    return 'either';
  }

  function parseQuery(raw) {
    var text = normalizeText(raw);
    var parsed = {
      raw: raw,
      disruptionTypes: matchPatterns(text, DISRUPTION_PATTERNS),
      jurisdictions: matchPatterns(text, JURISDICTION_PATTERNS),
      triage: matchPatterns(text, TRIAGE_PATTERNS),
      airports: detectAirports(text),
      airportDirection: detectDirection(text),
      cprBands: [],
      solicitor: '',
      valueMin: null,
      valueMax: null,
      groupOnly: /\bgroup\b|\bmulti.?pax\b|\bpassenger group\b/.test(text),
      urgentOnly: /\burgent\b|\bdeadline\b|\bcpr\b.*\b(3|three)\b|\bwithin 3\b/.test(text),
      highValue: /\bhigh value\b|\bexposure\b|\b£\s*\d{4,}\b|\bover £\d+/.test(text),
      vizIntent: null,
      isFollowUp: false
    };

    if (/\bchart\b|\bgraph\b|\bvisuali[sz]e\b|\bplot\b|\bbreakdown\b/.test(text)) parsed.vizIntent = 'chart';
    if (/\bcost\b|\bexposure\b|\bimpact\b|\bliabilit|\bproject(ed)?\b|\bestimate\b|\bfinancial\b/.test(text)) parsed.vizIntent = 'cost';
    if (/\btable\b|\blist\b|\brows\b|\bcases\b/.test(text) && !parsed.vizIntent) parsed.vizIntent = 'table';
    if (/\btriage\b|\bdefend rate\b|\bclassification\b/.test(text) && !parsed.vizIntent) parsed.vizIntent = 'triage';
    if (/\bfirm\b|\bsolicitor\b|\bcmc\b|\bagency\b/.test(text) && !parsed.vizIntent) parsed.vizIntent = 'firms';

    if (parsed.urgentOnly) parsed.cprBands = ['urgent'];
    if (parsed.highValue) parsed.valueMin = 1000;

    if (!parsed.airports.length) {
      var firmMatch = text.match(/(?:by|against)\s+([a-z&.'\s]{3,40}?)(?:\s+(?:cases|claims|flights)|$)/);
      if (firmMatch) parsed.solicitor = firmMatch[1].replace(/\s+/g, ' ').trim();
    } else if (/\bfrom\b/.test(text)) {
      parsed.solicitor = '';
    }

    var overMatch = text.match(/over\s*£?\s*(\d+)/) || text.match(/above\s*€?\s*(\d+)/);
    if (overMatch) parsed.valueMin = parseFloat(overMatch[1]);

    return parsed;
  }

  function caseHaystack(c) {
    return [
      c.ref, c.claimant, c.solicitor, c.disruptionType, c.type, c.flight, c.flightNum,
      c.dep, c.arr, c.triageNote, c.jurisdiction, c.classification, c.value
    ].join(' ').toLowerCase();
  }

  function isCancellationCase(c) {
    var hay = caseHaystack(c);
    if (/cancel|annul|annulation|cancelaci/.test(hay)) return true;
    return (c.disruptionType || '').toLowerCase().indexOf('cancellation') >= 0;
  }

  function matchesDisruption(c, types) {
    if (!types.length) return true;
    return types.some(function (t) {
      if (t === 'Cancellation') return isCancellationCase(c);
      return (c.disruptionType || '').toLowerCase().indexOf(t.toLowerCase()) >= 0
        || (c.type || '').toLowerCase().indexOf(t.toLowerCase()) >= 0;
    });
  }

  function matchesAirport(c, codes, direction) {
    if (!codes.length) return true;
    return codes.some(function (code) {
      if (direction === 'dep') return c.dep === code;
      if (direction === 'arr') return c.arr === code;
      return c.dep === code || c.arr === code || (c.flight || '').indexOf(code) >= 0;
    });
  }

  function filterCases(cases, parsed) {
    return cases.filter(function (c) {
      if (parsed.groupOnly && !/group|pax/i.test(c.triageNote || '')) return false;
      if (!matchesDisruption(c, parsed.disruptionTypes)) return false;
      if (parsed.jurisdictions.length && parsed.jurisdictions.indexOf(c.jurisdiction) < 0) return false;
      if (parsed.triage.length && parsed.triage.indexOf(c.classification) < 0) return false;
      if (!matchesAirport(c, parsed.airports, parsed.airportDirection)) return false;
      if (parsed.cprBands.length) {
        var band = c.cprDaysLeft <= 3 ? 'urgent' : c.cprDaysLeft <= 10 ? 'watch' : 'normal';
        if (parsed.cprBands.indexOf(band) < 0) return false;
      }
      if (parsed.solicitor && (c.solicitor || '').toLowerCase().indexOf(parsed.solicitor.toLowerCase()) < 0) return false;
      if (parsed.valueMin != null && !isNaN(parsed.valueMin) && c.compNumeric < parsed.valueMin) return false;
      if (parsed.valueMax != null && !isNaN(parsed.valueMax) && c.compNumeric > parsed.valueMax) return false;
      return true;
    });
  }

  function describeFilters(parsed) {
    var parts = [];
    if (parsed.disruptionTypes.length) parts.push(parsed.disruptionTypes.join(' / '));
    if (parsed.airports.length) {
      var dir = parsed.airportDirection === 'dep' ? 'departing' : parsed.airportDirection === 'arr' ? 'arriving' : 'touching';
      parts.push(dir + ' ' + parsed.airports.join(', '));
    }
    if (parsed.jurisdictions.length) parts.push(parsed.jurisdictions.map(jurisdictionLabel).join(', '));
    if (parsed.triage.length) parts.push(parsed.triage.join(', ') + ' triage');
    if (parsed.urgentOnly) parts.push('urgent CPR');
    if (parsed.groupOnly) parts.push('group passenger');
    if (parsed.valueMin) parts.push('value over ' + parsed.valueMin);
    if (parsed.solicitor) parts.push('firm: ' + parsed.solicitor);
    return parts.length ? parts.join(' · ') : 'your portfolio';
  }

  function jurisdictionLabel(key) {
    return { 'england-wales': 'England & Wales', france: 'France', spain: 'Spain' }[key] || key;
  }

  function totalExposureGBP(cases) {
    return cases.reduce(function (sum, c) {
      var amt = c.compNumeric || 0;
      if (c.compCurrency === 'EUR') amt = Math.round(amt * 0.86);
      return sum + amt;
    }, 0);
  }

  function formatMoney(amount, currency) {
    if (currency === 'EUR') return '€' + Math.round(amount).toLocaleString('en-GB');
    return '£' + Math.round(amount).toLocaleString('en-GB');
  }

  function buildSummary(cases, parsed) {
    var n = cases.length;
    var exposure = totalExposureGBP(cases);
    var defend = cases.filter(function (c) { return c.classification === 'DEFEND'; }).length;
    var escalate = cases.filter(function (c) { return c.classification === 'ESCALATE'; }).length;
    var filters = describeFilters(parsed);

    if (!n) {
      return {
        headline: 'No matching cases in the current portfolio.',
        detail: 'I searched ' + filters + ' but found nothing active. Try broadening the airport, disruption type, or jurisdiction — or ask me to show all Gatwick claims.',
        followUps: [
          { id: 'all_lgw', label: 'All LGW claims', query: 'all claims touching London Gatwick' },
          { id: 'all_cancel', label: 'All cancellations', query: 'show all cancelled flights' },
          { id: 'urgent', label: 'Urgent CPR cases', query: 'urgent CPR deadlines' }
        ]
      };
    }

    var headline = 'Found **' + n + '** case' + (n === 1 ? '' : 's') + ' — ' + filters + '.';
    var detail = defend
      ? defend + ' recommended DEFEND (' + Math.round((100 * defend) / n) + '%). '
      : '';
    detail += escalate ? escalate + ' flagged ESCALATE. ' : '';
    detail += 'Combined claim exposure is about **' + formatMoney(exposure, 'GBP') + '**.';
    if (parsed.airports.indexOf('LGW') >= 0 && parsed.disruptionTypes.indexOf('Cancellation') >= 0) {
      detail += ' Gatwick cancellation cohort often clusters around ATC industrial action — worth pulling Eurocontrol and Operational delay records system before responding.';
    }

    return {
      headline: headline,
      detail: detail,
      followUps: [
        { id: 'chart', label: 'Show as chart', action: 'viz', viz: 'chart' },
        { id: 'cost', label: 'Project cost impact', action: 'viz', viz: 'cost' },
        { id: 'triage', label: 'Triage breakdown', action: 'viz', viz: 'triage' },
        { id: 'firms', label: 'By solicitor / CMC', action: 'viz', viz: 'firms' },
        { id: 'table', label: 'Scroll to case list', action: 'scroll' }
      ]
    };
  }

  function countBy(cases, keyFn) {
    var map = {};
    cases.forEach(function (c) {
      var k = keyFn(c) || 'Unknown';
      map[k] = (map[k] || 0) + 1;
    });
    return Object.keys(map)
      .map(function (k) { return { label: k, count: map[k] }; })
      .sort(function (a, b) { return b.count - a.count; });
  }

  function renderBarChart(rows, title) {
    var max = Math.max.apply(null, rows.map(function (r) { return r.count; }).concat([1]));
    var bars = rows
      .map(function (r) {
        var pct = Math.round((100 * r.count) / max);
        return '<div class="ai-bar-row"><div class="ai-bar-label">' + escapeHtml(r.label) + '</div>'
          + '<div class="ai-bar-track"><div class="ai-bar-fill" style="width:' + pct + '%"></div></div>'
          + '<div class="ai-bar-val">' + r.count + '</div></div>';
      })
      .join('');
    return '<div class="ai-viz-card"><div class="ai-viz-title">' + escapeHtml(title) + '</div>' + bars + '</div>';
  }

  function renderCostViz(cases) {
    var total = totalExposureGBP(cases);
    var defendSave = cases
      .filter(function (c) { return c.classification === 'DEFEND'; })
      .reduce(function (s, c) {
        var amt = c.compNumeric || 0;
        if (c.compCurrency === 'EUR') amt = Math.round(amt * 0.86);
        return s + amt * 0.85;
      }, 0);
    var settle = Math.round(total * 0.35);
    var rows = [
      { label: 'Total claimed', amount: total, note: 'Sum of compensation sought' },
      { label: 'Projected defend saving', amount: Math.round(defendSave), note: 'Assumes 85% success on DEFEND cohort' },
      { label: 'Settle-at-risk (35%)', amount: settle, note: 'Commercial midpoint if evidence incomplete' },
      { label: 'Worst-case pay-out', amount: total, note: 'If all claims succeed at pleaded value' }
    ];
    return '<div class="ai-viz-card"><div class="ai-viz-title">Projected cost impact</div>'
      + rows.map(function (r) {
        return '<div class="ai-cost-row"><div><div class="ai-cost-label">' + escapeHtml(r.label) + '</div>'
          + '<div class="ai-cost-note">' + escapeHtml(r.note) + '</div></div>'
          + '<div class="ai-cost-val">' + formatMoney(r.amount, 'GBP') + '</div></div>';
      }).join('')
      + '<div class="ai-cost-foot">Demo projection — connect finance systems for live reserving.</div></div>';
  }

  function renderTriageViz(cases) {
    var rows = countBy(cases, function (c) { return c.classification; });
    return renderBarChart(rows, 'Triage split');
  }

  function renderFirmViz(cases) {
    var rows = countBy(cases, function (c) { return c.solicitor; }).slice(0, 6);
    return renderBarChart(rows, 'Claims by firm / CMC');
  }

  function renderChartViz(cases) {
    var byType = countBy(cases, function (c) {
      if (isCancellationCase(c)) return 'Cancellation';
      return c.disruptionType || 'Other';
    });
    return renderBarChart(byType, 'Disruption mix');
  }

  function renderVisualization(mode, cases) {
    if (mode === 'cost') return renderCostViz(cases);
    if (mode === 'triage') return renderTriageViz(cases);
    if (mode === 'firms') return renderFirmViz(cases);
    return renderChartViz(cases);
  }

  function parsedToIntelFilters(parsed) {
    return {
      disruptionTypes: (parsed.disruptionTypes || []).slice(),
      jurisdictions: (parsed.jurisdictions || []).slice(),
      triage: (parsed.triage || []).slice(),
      cprBands: (parsed.cprBands || []).slice(),
      solicitor: parsed.solicitor || '',
      valueMin: parsed.valueMin != null ? String(parsed.valueMin) : '',
      valueMax: parsed.valueMax != null ? String(parsed.valueMax) : '',
      groupOnly: !!parsed.groupOnly,
      airports: (parsed.airports || []).slice(),
      airportDirection: parsed.airportDirection || 'either'
    };
  }

  function starterPrompts() {
    return [
      'Cancelled flights from London Gatwick',
      'Urgent CPR cases this week',
      'Weather delays — defend rate and exposure',
      'High-value ESCALATE cases',
      'Claims by Clarke & Partners'
    ];
  }

  function escapeHtml(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  function markdownLite(s) {
    return escapeHtml(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  }

  return {
    parseQuery: parseQuery,
    filterCases: filterCases,
    buildSummary: buildSummary,
    parsedToIntelFilters: parsedToIntelFilters,
    renderVisualization: renderVisualization,
    starterPrompts: starterPrompts,
    markdownLite: markdownLite,
    escapeHtml: escapeHtml,
    isCancellationCase: isCancellationCase
  };
})();
