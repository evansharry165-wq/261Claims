/* Unified case workspace shell — Phase 2 */
var CaseShell = (function () {
  var TABS = [
    { id: 'overview', label: 'Overview', icon: 'ti-layout-dashboard', frame: false },
    { id: 'triage', label: 'Triage', icon: 'ti-search', frame: 'module2-case-workspace.html' },
    { id: 'deadlines', label: 'Deadlines', icon: 'ti-calendar-due', frame: 'module3-cpr-workspace.html' },
    { id: 'evidence', label: 'Evidence', icon: 'ti-folder-open', frame: 'module4-evidence-workspace.html' },
    { id: 'documents', label: 'Documents', icon: 'ti-file-pencil', frame: 'module5-drafting-workspace.html' },
    { id: 'activity', label: 'Activity', icon: 'ti-history', frame: false }
  ];

  var FRAME_MAP = {
    triage: 'module2-case-workspace.html',
    deadlines: 'module3-cpr-workspace.html',
    evidence: 'module4-evidence-workspace.html',
    documents: 'module5-drafting-workspace.html'
  };

  var state = {
    ref: null,
    tab: 'overview',
    caseData: null,
    activity: [],
    opened: false
  };

  function escapeHtml(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  function loadCase(ref) {
    var stored = null;
    try {
      stored = JSON.parse(sessionStorage.getItem('261c_case') || 'null');
    } catch (e) {}
    var c = typeof getCase === 'function' ? getCase(ref) : null;
    if (stored && stored.ref === ref) c = stored;
    if (!c) return null;

    var u = USERS[c.assignedTo] || { name: c.assignedTo };
    try {
      sessionStorage.setItem('261c_case', JSON.stringify(c));
      sessionStorage.setItem(
        'aeroCaseData',
        JSON.stringify({
          ref: c.ref,
          claimant: c.claimant,
          solicitor: c.solicitor,
          flight: c.flight,
          flightNum: c.flightNum,
          dep: c.dep,
          arr: c.arr,
          flightDate: c.flightDate,
          value: c.value,
          type: c.type,
          date: c.locDate,
          framework: 'EC Regulation 261/2004',
          points: c.points || [],
          jurisdiction: c.jurisdiction || 'england-wales',
          lang: c.lang || 'en',
          disruptionType: c.disruptionType || '',
          evidencePct: c.evidencePct || 0,
          loaStatus: c.loaStatus || '',
          triageNote: c.triageNote || '',
          classification: c.classification || '',
          assignedTo: u.name || c.assignedTo,
          cprDaysLeft: c.cprDaysLeft,
          cat: c.cat || ''
        })
      );
    } catch (e) {}

    try {
      var actKey = '261c_activity_' + ref;
      state.activity = JSON.parse(sessionStorage.getItem(actKey) || '[]');
    } catch (e) {
      state.activity = [];
    }

    state.caseData = c;
    state.ref = ref;
    return c;
  }

  function logActivity(text, type) {
    var entry = {
      t: text,
      type: type || 'action',
      time: new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
    };
    state.activity.unshift(entry);
    try {
      sessionStorage.setItem('261c_activity_' + state.ref, JSON.stringify(state.activity.slice(0, 50)));
    } catch (e) {}
    if (state.tab === 'activity') renderActivity();
  }

  function demoStudyStripHtml(c) {
    var studyId = null;
    try {
      studyId = sessionStorage.getItem('261c_active_demo_study');
    } catch (e) {}
    if (!studyId || typeof getDemoStudy !== 'function') return '';
    var study = getDemoStudy(studyId);
    if (!study || (study.ref && study.ref !== c.ref)) return '';
    return (
      '<div class="demo-study-strip"><i class="ti ti-player-play" style="color:var(--blue-text)"></i> <strong>Demo:</strong> ' +
      escapeHtml(study.title) +
      ' — ' +
      escapeHtml(study.narrative) +
      ' <a href="index.html" onclick="try{sessionStorage.removeItem(\'261c_active_demo_study\')}catch(e){}">All demos</a></div>'
    );
  }

  function classificationStyle(cls) {
    var styles = {
      DEFEND: { bg: 'var(--green-faint)', col: 'var(--green)' },
      ESCALATE: { bg: 'var(--red-faint)', col: 'var(--red)' },
      INVESTIGATE: { bg: 'var(--amber-faint)', col: 'var(--amber)' },
      DRAFTING: { bg: 'var(--purple-faint,#EEEDFE)', col: 'var(--purple,#4338CA)' }
    };
    return styles[cls] || { bg: 'var(--surface3)', col: 'var(--text3)' };
  }

  function renderHeader(c) {
    var J = typeof getJurisdiction === 'function' ? getJurisdiction(c.jurisdiction) : { name: '', flag: '' };
    var urg = typeof daysUrgency === 'function' ? daysUrgency(c.cprDaysLeft) : c.cprDaysLeft <= 7 ? 'urgent' : 'ok';
    var cprLabel = typeof urgencyLabel === 'function' ? urgencyLabel(c.cprDaysLeft) : String(c.cprDaysLeft) + 'd';
    var evPct = typeof getEffectiveEvidencePct === 'function' ? getEffectiveEvidencePct(c) : c.evidencePct || 0;
    var cls = c.classification || '';
    var clsStyle = classificationStyle(cls);
    var evBg = evPct === 0 ? 'var(--amber-faint)' : 'transparent';
    var evCol = evPct === 0 ? 'var(--amber)' : typeof evPctColor === 'function' ? evPctColor(evPct) : '#94A3B8';
    var notifCount = typeof unreadNotificationCount === 'function' ? unreadNotificationCount(getActiveUser()) : 0;

    document.getElementById('case-header').innerHTML =
      '<div class="case-bar-top">' +
      '<a href="cases.html" class="case-back"><i class="ti ti-arrow-left"></i> Cases</a>' +
      '<div class="case-bar-meta">' +
      '<span class="case-bar-ref">' +
      escapeHtml(c.ref) +
      '</span>' +
      '<span class="case-bar-name">' +
      escapeHtml(c.claimant) +
      '</span>' +
      '<span class="case-bar-flight">' +
      escapeHtml(c.flightNum || c.flight) +
      '</span>' +
      '<span class="case-bar-value">' +
      escapeHtml(c.value) +
      '</span>' +
      '<span class="case-bar-jur">' +
      escapeHtml(J.flag) +
      ' ' +
      escapeHtml(J.name) +
      '</span>' +
      (cls ? '<span class="case-bar-pill" style="background:' + clsStyle.bg + ';color:' + clsStyle.col + '">' + escapeHtml(cls) + '</span>' : '') +
      '<span class="case-bar-cpr dp-' +
      urg +
      '">CPR ' +
      escapeHtml(cprLabel) +
      '</span>' +
      '<span class="case-bar-ev dp-' +
      (evPct === 0 ? 'warn' : urg === 'urgent' ? 'urgent' : 'ok') +
      '" style="background:' +
      evBg +
      ';color:' +
      evCol +
      '">Evidence ' +
      evPct +
      '%</span>' +
      '</div>' +
      (notifCount
        ? '<span class="case-bar-pill" style="background:var(--blue-faint);color:var(--blue-text);margin-left:auto"><i class="ti ti-bell"></i> ' +
          notifCount +
          ' new</span>'
        : '') +
      '</div>' +
      demoStudyStripHtml(c);
  }

  function renderTabs() {
    var c = state.caseData;
    var stageOrder = ['intake', 'triage', 'cpr', 'evidence', 'drafting', 'defence', 'resolve'];
    var stageIdx = stageOrder.indexOf(c ? c.stage : 'triage');

    document.getElementById('case-tabs').innerHTML = TABS.map(function (tab) {
      var tabStageIdx =
        tab.id === 'overview'
          ? -1
          : tab.id === 'triage'
            ? 1
            : tab.id === 'deadlines'
              ? 2
              : tab.id === 'evidence'
                ? 3
                : tab.id === 'documents'
                  ? 4
                  : tab.id === 'activity'
                    ? 99
                    : 0;
      var done = tabStageIdx >= 0 && tabStageIdx < stageIdx;
      var active = state.tab === tab.id;
      return (
        '<button class="stage-tab' +
        (active ? ' active' : '') +
        (done ? ' done' : '') +
        '" onclick="CaseShell.switchTab(\'' +
        tab.id +
        '\')"><i class="ti ' +
        tab.icon +
        '"></i> ' +
        escapeHtml(tab.label) +
        (done ? ' <i class="ti ti-check" style="font-size:10px"></i>' : '') +
        '</button>'
      );
    }).join('');
  }

  function renderOverview() {
    var c = state.caseData;
    if (!c) return;
    var action = typeof getNextAction === 'function' ? getNextAction(c) : { text: 'Review case', tab: 'overview' };
    var J = typeof getJurisdiction === 'function' ? getJurisdiction(c.jurisdiction) : {};
    var evPct = typeof getEffectiveEvidencePct === 'function' ? getEffectiveEvidencePct(c) : c.evidencePct || 0;
    var urg = typeof daysUrgency === 'function' ? daysUrgency(c.cprDaysLeft) : 'ok';
    var cprLabel = typeof urgencyLabel === 'function' ? urgencyLabel(c.cprDaysLeft) : String(c.cprDaysLeft) + 'd';
    var stageLabel = typeof t === 'function' ? t('stage_' + c.stage) || c.stage : c.stage;
    var cls = c.classification || '';
    var clsStyle = classificationStyle(cls);
    var airline = typeof getCaseAirline === 'function' ? getCaseAirline(c) : 'Horizon Airways';
    var similar = ALL_CASES.filter(function (s) {
      return s.ref !== c.ref && c.disruptionType && s.disruptionType === c.disruptionType;
    }).slice(0, 2);

    var stages = [
      { id: 'intake', label: 'Intake', tab: null },
      { id: 'triage', label: 'Triage', tab: 'triage' },
      { id: 'cpr', label: 'Deadlines', tab: 'deadlines' },
      { id: 'evidence', label: 'Evidence', tab: 'evidence' },
      { id: 'drafting', label: 'Documents', tab: 'documents' },
      { id: 'resolve', label: 'Resolve', tab: null }
    ];
    var stageIdx = stages.findIndex(function (s) {
      return s.id === c.stage || (c.stage === 'defence' && s.id === 'drafting');
    });

    document.getElementById('tab-panel').innerHTML =
      '<div class="tab-panel-inner">' +
      '<div class="panel-card" style="margin-bottom:14px">' +
      '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap">' +
      '<div>' +
      '<div class="pc-label">' +
      escapeHtml(c.ref) +
      ' · ' +
      escapeHtml(airline) +
      '</div>' +
      '<div class="pc-title" style="margin-bottom:6px">' +
      escapeHtml(c.claimant) +
      '</div>' +
      '<div style="font-size:12px;color:var(--text2);line-height:1.6">' +
      escapeHtml(c.flightNum || c.flight) +
      ' · ' +
      escapeHtml(c.dep) +
      ' → ' +
      escapeHtml(c.arr) +
      ' · ' +
      escapeHtml(c.value) +
      ' · ' +
      escapeHtml(J.flag) +
      ' ' +
      escapeHtml(J.name) +
      '</div>' +
      '</div>' +
      '<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">' +
      '<span class="case-bar-pill" style="background:var(--blue-faint);color:var(--blue-text)">' +
      escapeHtml(stageLabel) +
      '</span>' +
      (cls ? '<span class="case-bar-pill" style="background:' + clsStyle.bg + ';color:' + clsStyle.col + '">' + escapeHtml(cls) + '</span>' : '') +
      '<span class="case-bar-cpr dp-' +
      urg +
      '">CPR ' +
      escapeHtml(cprLabel) +
      '</span>' +
      '<span class="case-bar-ev dp-' +
      (evPct === 0 ? 'warn' : 'ok') +
      '" style="background:' +
      (evPct === 0 ? 'var(--amber-faint)' : 'var(--surface3)') +
      ';color:' +
      (evPct === 0 ? 'var(--amber)' : 'var(--text2)') +
      '">Evidence ' +
      evPct +
      '%</span>' +
      '</div></div></div>' +
      '<div class="overview-grid">' +
      '<div class="panel-card highlight">' +
      '<div class="pc-label">Next action</div>' +
      '<div class="pc-title">' +
      escapeHtml(action.text) +
      '</div>' +
      '<button class="btn-primary" onclick="CaseShell.switchTab(\'' +
      escapeHtml(action.tab) +
      '\')">Continue <i class="ti ti-arrow-right"></i></button>' +
      '</div>' +
      '<div class="panel-card">' +
      '<div class="pc-label">Case summary</div>' +
      '<div class="kv"><span>Claimant</span><span>' +
      escapeHtml(c.claimant) +
      '</span></div>' +
      '<div class="kv"><span>Solicitor</span><span>' +
      escapeHtml(c.solicitor) +
      '</span></div>' +
      '<div class="kv"><span>Flight</span><span>' +
      escapeHtml(c.flight) +
      '</span></div>' +
      '<div class="kv"><span>Disruption</span><span>' +
      escapeHtml(c.disruptionType || '—') +
      '</span></div>' +
      '<div class="kv"><span>Stage</span><span>' +
      escapeHtml(typeof t === 'function' ? t('stage_' + c.stage) || c.stage : c.stage) +
      '</span></div>' +
      '</div>' +
      '<div class="panel-card">' +
      '<div class="pc-label">Pipeline</div>' +
      '<div class="mini-pipeline">' +
      stages
        .map(function (s, i) {
          var cls = i < stageIdx ? 'done' : i === stageIdx ? 'current' : '';
          var click = s.tab ? 'onclick="CaseShell.switchTab(\'' + s.tab + '\')"' : '';
          return '<div class="mp-step ' + cls + '" ' + click + '><div class="mp-dot"></div><div class="mp-label">' + escapeHtml(s.label) + '</div></div>';
        })
        .join('') +
      '</div>' +
      (J.important
        ? '<div class="alert-box">' + escapeHtml(J.important) + '</div>'
        : '') +
      '</div>' +
      '<div class="panel-card">' +
      '<div class="pc-label">Similar cases</div>' +
      (similar.length
        ? similar
            .map(function (s) {
              return (
                '<div class="similar-row" onclick="openCase(\'' +
                escapeHtml(s.ref) +
                '\')"><div class="sim-ref">' +
                escapeHtml(s.ref) +
                '</div><div class="sim-name">' +
                escapeHtml(s.claimant) +
                '</div><div class="sim-meta">' +
                escapeHtml(s.disruptionType) +
                ' · ' +
                escapeHtml(typeof t === 'function' ? t('stage_' + s.stage) || s.stage : s.stage) +
                '</div></div>'
              );
            })
            .join('')
        : '<div class="empty-note">No similar cases in demo data.</div>') +
      '</div></div></div>';
  }

  function renderActivity() {
    var rows = state.activity.length
      ? state.activity
      : (state.caseData.activity || []).map(function (a) {
          return { t: a.text, type: a.type || 'action', time: a.time };
        });

    document.getElementById('tab-panel').innerHTML =
      '<div class="tab-panel-inner"><div class="panel-card">' +
      '<div class="pc-label">Activity log</div>' +
      '<div class="activity-list">' +
      (rows.length
        ? rows
            .map(function (a) {
              return (
                '<div class="act-row"><div class="act-dot act-' +
                escapeHtml(a.type) +
                '"></div><div><div class="act-text">' +
                escapeHtml(a.t) +
                '</div><div class="act-time">' +
                escapeHtml(a.time) +
                '</div></div></div>'
              );
            })
            .join('')
        : '<div class="empty-note">No activity recorded yet.</div>') +
      '</div>' +
      '<div class="note-form"><input id="shell-note" placeholder="Add a note…" onkeydown="if(event.key===\'Enter\')CaseShell.addNote()"><button onclick="CaseShell.addNote()">Add</button></div>' +
      '</div></div>';
  }

  function renderFrame(tab) {
    var src = FRAME_MAP[tab];
    if (!src) return;
    var extra = '';
    try {
      var params = new URLSearchParams(window.location.search);
      if (params.get('request')) extra += '&request=' + encodeURIComponent(params.get('request'));
    } catch (e) {}
    document.getElementById('tab-panel').innerHTML =
      '<iframe id="case-frame" class="case-frame" src="' +
      src +
      '?ref=' +
      encodeURIComponent(state.ref) +
      '&embed=1' +
      extra +
      '" title="' +
      escapeHtml(tab) +
      '"></iframe>';
  }

  function renderTabContent() {
    var panel = document.getElementById('tab-panel');
    if (state.tab === 'overview') {
      panel.innerHTML = '';
      renderOverview();
    } else if (state.tab === 'activity') {
      panel.innerHTML = '';
      renderActivity();
    } else if (FRAME_MAP[state.tab]) {
      renderFrame(state.tab);
    }
  }

  function switchTab(tab, pushState) {
    if (!TABS.some(function (t) {
      return t.id === tab;
    })) tab = 'overview';
    state.tab = tab;
    if (pushState !== false) {
      var url = CASE_ROUTE(state.ref, tab);
      try {
        history.replaceState({}, '', url);
      } catch (e) {}
    }
    renderTabs();
    renderTabContent();
  }

  function addNote() {
    var el = document.getElementById('shell-note');
    if (!el) return;
    var v = (el.value || '').trim();
    if (!v) return;
    logActivity(v, 'note');
    el.value = '';
  }

  function init() {
    var params = new URLSearchParams(window.location.search);
    var ref = params.get('ref');
    var tab = params.get('tab') || 'overview';
    if (!ref) {
      window.location.href = 'cases.html';
      return;
    }
    var c = loadCase(ref);
    if (!c) {
      window.location.href = 'cases.html';
      return;
    }
    state.tab = tab;
    renderHeader(c);
    renderTabs();
    renderTabContent();
    if (typeof renderGlobalNav === 'function') renderGlobalNav();
    if (!state.opened) {
      logActivity('Case workspace opened', 'create');
      state.opened = true;
    }
  }

  window.addEventListener('message', function (e) {
    if (!e.data || e.data.type !== 'case-shell') return;
    if (e.data.action === 'switchTab' && e.data.tab) switchTab(e.data.tab);
    if (e.data.action === 'log' && e.data.text) logActivity(e.data.text, e.data.logType || 'action');
    if (e.data.action === 'stageComplete' && e.data.tab) {
      loadCase(state.ref);
      if (state.caseData) {
        renderHeader(state.caseData);
        renderTabs();
      }
      switchTab(e.data.tab);
    }
    if (e.data.action === 'evidenceUpdate' && e.data.ref === state.ref) {
      if (typeof syncCaseEvidencePct === 'function') {
        syncCaseEvidencePct(e.data.ref, e.data.evidencePct, e.data.readyForDrafting);
      }
      loadCase(state.ref);
      if (state.caseData) {
        renderHeader(state.caseData);
        renderTabs();
      }
    }
  });

  return { init: init, switchTab: switchTab, addNote: addNote, logActivity: logActivity };
})();

function caseShellNavigate(tab) {
  if (window.parent !== window && window.parent.CaseShell) {
    window.parent.CaseShell.switchTab(tab);
    return true;
  }
  return false;
}
