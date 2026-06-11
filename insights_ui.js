/* Insights hub UI controller */
var InsightsUI = (function () {
  var TAB_DEFS = [
    { id: 'reporting', labelKey: 'reporting', icon: 'ti-chart-bar', fallback: 'Reporting' },
    { id: 'past-cases', labelKey: 'pastCases', icon: 'ti-archive', fallback: 'Past cases' },
    { id: 'intelligence', labelKey: 'legalIntelligence', icon: 'ti-brain', fallback: 'Legal intelligence' }
  ];
  var VALID_TABS = TAB_DEFS.map(function (t) {
    return t.id;
  });

  var state = {
    tab: 'reporting',
    filters: InsightsSearch.parseParams(),
    selectedRef: new URLSearchParams(window.location.search).get('ref') || ''
  };

  function label(key, fallback) {
    if (typeof t === 'function') {
      var v = t(key);
      if (v && v !== key) return v;
    }
    return fallback;
  }

  function esc(v) {
    return escapeClosedHtml(v);
  }

  function init() {
    var params = new URLSearchParams(window.location.search);
    var tab = params.get('tab') || 'reporting';
    if (tab === 'guidance') {
      window.location.replace('education.html');
      return;
    }
    state.tab = VALID_TABS.indexOf(tab) >= 0 ? tab : state.selectedRef ? 'past-cases' : 'reporting';
    state.filters = InsightsSearch.parseParams();
    state.selectedRef = params.get('ref') || state.selectedRef;
    renderAll();
  }

  function setTab(tab) {
    if (VALID_TABS.indexOf(tab) < 0) tab = 'reporting';
    state.tab = tab;
    InsightsSearch.syncUrl(tab, state.filters, state.selectedRef ? { ref: state.selectedRef } : {});
    renderAll();
  }

  function setFilter(key, value) {
    state.filters[key] = value;
    InsightsSearch.syncUrl(state.tab, state.filters, state.selectedRef ? { ref: state.selectedRef } : {});
    renderPanel();
  }

  function setQuery(value) {
    state.filters.q = value;
    InsightsSearch.syncUrl(state.tab, state.filters, state.selectedRef ? { ref: state.selectedRef } : {});
    renderPanel();
  }

  function selectCase(ref) {
    state.selectedRef = ref;
    InsightsSearch.syncUrl(state.tab, state.filters, { ref: ref });
    renderPanel();
  }

  function clearFilters() {
    state.filters = InsightsSearch.normalizeFilters({});
    InsightsSearch.syncUrl(state.tab, state.filters, state.selectedRef ? { ref: state.selectedRef } : {});
    renderPanel();
  }

  function filteredCases() {
    return InsightsSearch.filterCases(repoCases(), state.filters);
  }

  function renderHeader() {
    var titleEl = document.getElementById('page-title');
    var subEl = document.getElementById('page-sub');
    var actionsEl = document.getElementById('page-actions');
    if (state.tab === 'past-cases') {
      titleEl.textContent = label('pastCases', 'Past cases');
      subEl.textContent =
        'Faceted search over closed outcomes — disruption, jurisdiction, court, evidence and case law.';
      actionsEl.innerHTML =
        '<a class="page-link" href="education.html"><i class="ti ti-school"></i> ' +
        esc(label('education', 'Education')) +
        '</a>';
    } else if (state.tab === 'intelligence') {
      titleEl.textContent = label('legalIntelligence', 'Legal intelligence');
      subEl.textContent =
        'Court and judge outcome patterns, improvement opportunities, and coordinated legal updates.';
      actionsEl.innerHTML =
        '<span class="sync-badge"><i class="ti ti-refresh"></i> ' +
        esc(CourtDataAdapter.sourceLabel()) +
        ' · ' +
        esc(CourtDataAdapter.lastSync()) +
        '</span>';
    } else {
      titleEl.textContent = label('insights', 'Insights');
      subEl.textContent = 'Portfolio KPIs, risk register and CPR tracker for management review.';
      actionsEl.innerHTML =
        '<a class="page-link" href="cases.html"><i class="ti ti-briefcase"></i> ' +
        esc(label('cases', 'Cases')) +
        '</a>';
    }
  }

  function renderTabs() {
    document.getElementById('insights-tabs').innerHTML = TAB_DEFS.map(function (t) {
      return (
        '<button type="button" class="ins-tab' +
        (state.tab === t.id ? ' active' : '') +
        '" onclick="InsightsUI.setTab(\'' +
        t.id +
        '\')"><i class="ti ' +
        t.icon +
        '"></i> ' +
        esc(label(t.labelKey, t.fallback)) +
        '</button>'
      );
    }).join('');
  }

  function renderFacetBar() {
    var all = repoCases();
    var facets = InsightsSearch.facetOptions(all);
    var courts = typeof COURT_PROFILES !== 'undefined' ? COURT_PROFILES : [];
    var f = state.filters;
    function sel(key, val, current) {
      return val === current ? ' selected' : '';
    }
    var disruptionOpts = Object.keys(facets.disruptions)
      .sort()
      .map(function (d) {
        var slug = InsightsSearch.disruptionSlug(d);
        return (
          '<option value="' +
          esc(slug) +
          '"' +
          sel('disruption', slug, InsightsSearch.disruptionSlug(f.disruption) || f.disruption) +
          '>' +
          esc(d) +
          '</option>'
        );
      })
      .join('');
    var jurOpts = Object.keys(facets.jurisdictions)
      .map(function (j) {
        return (
          '<option value="' +
          esc(j) +
          '"' +
          sel('jurisdiction', j, f.jurisdiction) +
          '>' +
          esc(jurisdictionDisplay(j)) +
          '</option>'
        );
      })
      .join('');
    var courtOpts = courts
      .map(function (c) {
        return (
          '<option value="' +
          esc(c.id) +
          '"' +
          sel('court', c.id, f.court) +
          '>' +
          esc(c.name) +
          '</option>'
        );
      })
      .join('');
    return (
      '<div class="facet-bar">' +
      '<input class="facet-search" placeholder="' +
      esc(label('pastCasesSearch', 'Search past cases…')) +
      '" value="' +
      esc(f.q) +
      '" oninput="InsightsUI.setQuery(this.value)">' +
      '<select onchange="InsightsUI.setFilter(\'disruption\', InsightsSearch.slugDisruption(this.value))"><option value="">All disruptions</option>' +
      disruptionOpts +
      '</select>' +
      '<select onchange="InsightsUI.setFilter(\'jurisdiction\', this.value)"><option value="all">All jurisdictions</option>' +
      jurOpts +
      '</select>' +
      '<select onchange="InsightsUI.setFilter(\'court\', this.value)"><option value="all">All courts</option>' +
      courtOpts +
      '</select>' +
      '<select onchange="InsightsUI.setFilter(\'outcome\', this.value)"><option value="all">All outcomes</option>' +
      ['defended', 'settled', 'paid', 'withdrawn']
        .map(function (o) {
          return (
            '<option value="' +
            o +
            '"' +
            sel('outcome', o, f.outcome) +
            '>' +
            esc(outcomeLabel(o)) +
            '</option>'
          );
        })
        .join('') +
      '</select>' +
      '<input type="date" title="From" value="' +
      esc(f.dateFrom) +
      '" onchange="InsightsUI.setFilter(\'dateFrom\', this.value)">' +
      '<input type="date" title="To" value="' +
      esc(f.dateTo) +
      '" onchange="InsightsUI.setFilter(\'dateTo\', this.value)">' +
      '<button type="button" class="facet-clear" onclick="InsightsUI.clearFilters()">' +
      esc(label('clearFilters', 'Clear')) +
      '</button></div>'
    );
  }

  function renderStats() {
    var rows = filteredCases();
    var s = pastCaseStats();
    return (
      '<div class="stats-row">' +
      '<div class="stat"><div class="stat-label">Matching</div><div class="stat-val">' +
      rows.length +
      '</div><div class="stat-sub">' +
      s.total +
      ' in archive</div></div>' +
      '<div class="stat"><div class="stat-label">' +
      esc(outcomeLabel('defended')) +
      '</div><div class="stat-val">' +
      rows.filter(function (c) {
        return c.outcome === 'defended';
      }).length +
      '</div></div>' +
      '<div class="stat"><div class="stat-label">Courts</div><div class="stat-val">' +
      Object.keys(
        rows.reduce(function (m, c) {
          if (c.courtId) m[c.courtId] = true;
          return m;
        }, {})
      ).length +
      '</div></div>' +
      '<div class="stat"><div class="stat-label">Live matches</div><div class="stat-val">' +
      getLiveSimilarCases(99).length +
      '</div></div></div>'
    );
  }

  function renderPastCases() {
    var rows = filteredCases();
    if (!state.selectedRef || !rows.some(function (c) { return c.ref === state.selectedRef; })) {
      state.selectedRef = rows.length ? rows[0].ref : '';
    }
    var selected = rows.find(function (c) { return c.ref === state.selectedRef; }) || null;
    var listHtml = rows.length
      ? rows.map(function (c) { return renderClosedCaseCard(c, state.selectedRef); }).join('')
      : '<div class="empty-note">' + esc(label('pastCasesEmpty', 'No closed cases match your filters.')) + '</div>';

    return (
      '<div class="past-wrap">' +
      renderFacetBar() +
      renderStats() +
      '<div class="grid-main"><div class="panel"><div class="panel-hdr"><div><div class="panel-title"><i class="ti ti-archive"></i> ' +
      esc(label('pastCasesArchive', 'Past cases archive')) +
      '</div></div></div><div class="case-list">' +
      listHtml +
      '</div></div><div class="panel detail"><div class="panel-hdr"><div class="panel-title"><i class="ti ti-brain"></i> ' +
      esc(label('pastCasesInsight', 'Case insight')) +
      '</div></div>' +
      renderClosedCaseDetail(selected) +
      '</div></div></div>'
    );
  }

  function renderIntelligence() {
    var result = InsightEngine.searchIntelligence(state.filters);
    var updates = result.updates || [];
    var suggestions = result.suggestions || [];

    var updatesStrip = updates.length
      ? '<div class="updates-strip"><div class="updates-title"><i class="ti ti-news"></i> Recent developments affecting your search</div>' +
        updates
          .map(function (u) {
            return (
              '<a class="update-chip" href="' +
              InsightTags.educationLink(u) +
              '"><strong>' +
              esc(u.title) +
              '</strong><span>' +
              esc(u.date) +
              ' · ' +
              esc(u.source) +
              '</span></a>'
            );
          })
          .join('') +
        '</div>'
      : '';

    var suggHtml = suggestions.length
      ? suggestions
          .map(function (s) {
            var cls = s.priority === 'urgent' ? ' urgent' : s.priority === 'high' ? ' high' : '';
            return (
              '<div class="sugg-item' +
              cls +
              '">' +
              esc(s.text) +
              (s.liveRef
                ? ' <a href="case.html?ref=' +
                  encodeURIComponent(s.liveRef) +
                  '">' +
                  esc(label('openCase', 'Open case')) +
                  '</a>'
                : '') +
              '</div>'
            );
          })
          .join('')
      : '<div class="empty-note">Adjust filters to surface improvement opportunities.</div>';

    var closedHtml = result.closed.length
      ? result.closed
          .slice(0, 6)
          .map(function (c) {
            return renderClosedCaseCard(c, '');
          })
          .join('')
      : '<div class="empty-note">No closed outcomes for current filters.</div>';

    var courtHtml = result.courts.length
      ? result.courts
          .map(function (c) {
            var rate = c.rates ? c.rates.defended : '—';
            return (
              '<div class="intel-card"><div class="intel-title">' +
              esc(c.name) +
              '</div><div class="intel-meta">' +
              esc(jurisdictionDisplay(c.jurisdiction)) +
              ' · ' +
              esc(c.source) +
              '</div><div class="intel-stat">' +
              rate +
              '% defended overall · ' +
              c.caseload +
              ' cases on profile</div><div class="intel-note">' +
              esc(c.notes || '') +
              '</div></div>'
            );
          })
          .join('')
      : '<div class="empty-note">No court profiles for filters.</div>';

    var judgeHtml = result.judges.length
      ? result.judges
          .map(function (j) {
            return (
              '<div class="intel-card"><div class="intel-title">' +
              esc(j.name) +
              '</div><div class="intel-meta">' +
              esc((getCourtById(j.courtId) || {}).name || j.courtId) +
              '</div><ul class="intel-list">' +
              (j.tendencies || [])
                .map(function (t) {
                  return '<li>' + esc(t) + '</li>';
                })
                .join('') +
              '</ul></div>'
            );
          })
          .join('')
      : '<div class="empty-note">No judge profiles linked to filtered cases.</div>';

    return (
      '<div class="past-wrap">' +
      renderFacetBar() +
      updatesStrip +
      '<div class="intel-grid">' +
      '<div class="panel"><div class="panel-hdr"><div class="panel-title"><i class="ti ti-bulb"></i> Improvement opportunities</div></div><div class="panel-body">' +
      suggHtml +
      '</div></div>' +
      '<div class="panel"><div class="panel-hdr"><div class="panel-title"><i class="ti ti-building-bank"></i> Court profiles</div></div><div class="panel-body intel-cards">' +
      courtHtml +
      '</div></div>' +
      '<div class="panel"><div class="panel-hdr"><div class="panel-title"><i class="ti ti-user-shield"></i> Judge profiles</div></div><div class="panel-body intel-cards">' +
      judgeHtml +
      '</div></div>' +
      '<div class="panel"><div class="panel-hdr"><div class="panel-title"><i class="ti ti-archive"></i> Closed outcomes</div></div><div class="case-list">' +
      closedHtml +
      '</div></div></div></div>'
    );
  }

  function renderPanel() {
    var el = document.getElementById('tab-panel');
    if (state.tab === 'reporting') {
      el.innerHTML =
        '<iframe class="tab-frame" src="module6-mi.html?embed=1" title="Reporting"></iframe>';
    } else if (state.tab === 'intelligence') {
      el.innerHTML = renderIntelligence();
    } else {
      el.innerHTML = renderPastCases();
    }
    if (typeof renderGlobalNav === 'function') renderGlobalNav();
  }

  function renderAll() {
    renderHeader();
    renderTabs();
    renderPanel();
  }

  return {
    init: init,
    setTab: setTab,
    setFilter: setFilter,
    setQuery: setQuery,
    selectCase: selectCase,
    clearFilters: clearFilters,
    getFilters: function () {
      return state.filters;
    },
    exploreUrl: function (filters) {
      return InsightsSearch.toQueryString('intelligence', filters || state.filters);
    }
  };
})();

function switchUser(id) {
  setActiveUser(id);
  sessionStorage.removeItem('261c_lang');
  document.getElementById('user-modal').classList.remove('open');
  var u = USERS[id];
  if (u) {
    document.getElementById('nav-av').textContent = u.initials;
    document.getElementById('nav-user').textContent = u.name;
  }
  ['SB', 'JP', 'KR', 'MD', 'PL', 'CG', 'IM', 'EH'].forEach(function (uid) {
    var el = document.getElementById('ud-' + uid);
    if (el) el.classList.toggle('current', uid === id);
  });
  InsightsUI.init();
}

function toggleUserMenu() {
  document.getElementById('user-modal').classList.toggle('open');
}

window.addEventListener('load', function () {
  InsightsUI.init();
});
