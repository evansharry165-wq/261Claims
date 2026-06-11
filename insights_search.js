/* Faceted search engine for Insights — Stage 1 */
var InsightsSearch = (function () {
  var DISRUPTION_SLUGS = {
    birdstrike: 'Birdstrike',
    weather: 'Weather',
    atc: 'ATC Restrictions',
    technical: 'Technical Issues',
    industrial: 'Industrial Action'
  };

  function slugDisruption(value) {
    if (!value) return '';
    var v = String(value).toLowerCase().replace(/\+/g, ' ');
    if (DISRUPTION_SLUGS[v]) return DISRUPTION_SLUGS[v];
    return value;
  }

  function normalizeFilters(raw) {
    raw = raw || {};
    return {
      q: String(raw.q || '').trim(),
      disruption: slugDisruption(raw.disruption || ''),
      jurisdiction: String(raw.jurisdiction || 'all').toLowerCase(),
      court: String(raw.court || 'all'),
      outcome: String(raw.outcome || 'all').toLowerCase(),
      dateFrom: String(raw.dateFrom || ''),
      dateTo: String(raw.dateTo || '')
    };
  }

  function parseParams(search) {
    var params = new URLSearchParams(search || window.location.search);
    return normalizeFilters({
      q: params.get('q') || '',
      disruption: params.get('disruption') || '',
      jurisdiction: params.get('jurisdiction') || 'all',
      court: params.get('court') || 'all',
      outcome: params.get('outcome') || 'all',
      dateFrom: params.get('from') || '',
      dateTo: params.get('to') || ''
    });
  }

  function buildHaystack(c) {
    return [
      c.ref,
      c.claimant,
      c.solicitor,
      c.flightNum,
      c.route,
      c.disruptionType,
      c.jurisdiction,
      c.region,
      c.court,
      c.judge,
      c.outcome,
      c.summary,
      c.recommendation,
      c.closedAt,
      (c.evidence || []).join(' '),
      (c.caseLaw || []).join(' '),
      (c.strategyTags || []).join(' '),
      (c.evidenceTags || []).join(' '),
      (c.draftingTags || []).join(' ')
    ]
      .join(' ')
      .toLowerCase();
  }

  function matchesDate(c, from, to) {
    if (!from && !to) return true;
    var d = c.closedAt || '';
    if (!d) return !from && !to;
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  }

  function filterCases(cases, filters) {
    var f = normalizeFilters(filters);
    var q = f.q.toLowerCase();
    return (cases || []).filter(function (c) {
      if (f.outcome !== 'all' && c.outcome !== f.outcome) return false;
      if (f.jurisdiction !== 'all' && c.jurisdiction !== f.jurisdiction) return false;
      if (f.disruption && c.disruptionType !== f.disruption) return false;
      if (f.court !== 'all') {
        var courtId = c.courtId || '';
        var courtName = String(c.court || '').toLowerCase();
        if (courtId !== f.court && courtName.indexOf(f.court.toLowerCase()) < 0) return false;
      }
      if (!matchesDate(c, f.dateFrom, f.dateTo)) return false;
      if (q && buildHaystack(c).indexOf(q) < 0) return false;
      return true;
    });
  }

  function facetOptions(cases) {
    cases = cases || [];
    var disruptions = {};
    var jurisdictions = {};
    var courts = {};
    var outcomes = {};
    cases.forEach(function (c) {
      if (c.disruptionType) disruptions[c.disruptionType] = true;
      if (c.jurisdiction) jurisdictions[c.jurisdiction] = true;
      if (c.courtId) courts[c.courtId] = c.court || c.courtId;
      else if (c.court) courts[c.court] = c.court;
      if (c.outcome) outcomes[c.outcome] = true;
    });
    return { disruptions: disruptions, jurisdictions: jurisdictions, courts: courts, outcomes: outcomes };
  }

  function toQueryString(tab, filters, extra) {
    var f = normalizeFilters(filters);
    var params = new URLSearchParams();
    params.set('tab', tab || 'past-cases');
    if (f.q) params.set('q', f.q);
    if (f.disruption) {
      var slug = Object.keys(DISRUPTION_SLUGS).find(function (k) {
        return DISRUPTION_SLUGS[k] === f.disruption;
      });
      params.set('disruption', slug || f.disruption);
    }
    if (f.jurisdiction !== 'all') params.set('jurisdiction', f.jurisdiction);
    if (f.court !== 'all') params.set('court', f.court);
    if (f.outcome !== 'all') params.set('outcome', f.outcome);
    if (f.dateFrom) params.set('from', f.dateFrom);
    if (f.dateTo) params.set('to', f.dateTo);
    if (extra) {
      Object.keys(extra).forEach(function (k) {
        if (extra[k]) params.set(k, extra[k]);
      });
    }
    return 'insights.html?' + params.toString();
  }

  function syncUrl(tab, filters, extra) {
    var url = toQueryString(tab, filters, extra);
    history.replaceState({}, '', url);
    return url;
  }

  function disruptionSlug(type) {
    return Object.keys(DISRUPTION_SLUGS).find(function (k) {
      return DISRUPTION_SLUGS[k] === type;
    }) || String(type || '').toLowerCase().replace(/\s+/g, '-');
  }

  return {
    parseParams: parseParams,
    normalizeFilters: normalizeFilters,
    filterCases: filterCases,
    facetOptions: facetOptions,
    toQueryString: toQueryString,
    syncUrl: syncUrl,
    buildHaystack: buildHaystack,
    disruptionSlug: disruptionSlug,
    slugDisruption: slugDisruption
  };
})();
