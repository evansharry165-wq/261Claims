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
          cprDaysLeft: c.cprDaysLeft
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

  function waitingOnHtml(c) {
    var waiting = typeof getWaitingOn === 'function' ? getWaitingOn(c) : [];
    if (!waiting.length) return '';
    var items = waiting.reduce(function (acc, r) {
      return acc.concat(r.missing || []);
    }, []);
    return (
      '<div class="waiting-on"><i class="ti ti-clock"></i> <strong>' +
      escapeHtml(typeof t === 'function' ? t('waitingOn') : 'Waiting on') +
      ':</strong> Evidence team · ' +
      escapeHtml(items.slice(0, 3).join(', ')) +
      (items.length > 3 ? '…' : '') +
      ' <a href="javascript:CaseShell.switchTab(\'evidence\')" style="margin-left:8px;color:var(--blue-text);font-weight:500">View</a></div>'
    );
  }

  function primaryCta(c) {
    var action = typeof getNextAction === 'function' ? getNextAction(c) : { text: 'Open case', tab: 'overview' };
    return (
      '<a class="case-cta" href="javascript:CaseShell.switchTab(\'' +
      escapeHtml(action.tab) +
      '\')"><i class="ti ti-player-play"></i> ' +
      escapeHtml(action.text) +
      '</a>'
    );
  }

  function renderHeader(c) {
    var J = typeof getJurisdiction === 'function' ? getJurisdiction(c.jurisdiction) : { name: '', flag: '' };
    var urg = typeof daysUrgency === 'function' ? daysUrgency(c.cprDaysLeft) : 'ok';
    var cls = c.classification || '';
    var clsBg = cls === 'ESCALATE' ? 'var(--red-faint)' : cls === 'DEFEND' ? 'var(--green-faint)' : 'var(--surface3)';
    var clsCol = cls === 'ESCALATE' ? 'var(--red)' : cls === 'DEFEND' ? 'var(--green)' : 'var(--text3)';
    var evPct = c.evidencePct || 0;
    var evCol = typeof evPctColor === 'function' ? evPctColor(evPct) : '#94A3B8';

    document.getElementById('case-header').innerHTML =
      '<div class="case-bar-top">' +
      '<a href="cases.html" class="case-back"><i class="ti ti-arrow-left"></i> Cases</a>' +
      '<div class="case-bar-meta">' +
      '<span class="case-bar-ref">' +
      escapeHtml(c.ref) +
      '</span>' +
      '<span class="case-bar-name">' +
      escapeHtml(typeof caseTitle === 'function' ? caseTitle(c) : c.claimant) +
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
      (cls ? '<span class="case-bar-pill" style="background:' + clsBg + ';color:' + clsCol + '">' + escapeHtml(cls) + '</span>' : '') +
      '<span class="case-bar-cpr dp-' +
      urg +
      '">CPR ' +
      escapeHtml(String(c.cprDaysLeft) + 'd') +
      '</span>' +
      (c.stage === 'evidence' || c.stage === 'drafting'
        ? '<span class="case-bar-ev" style="color:' + evCol + '">Evidence ' + evPct + '%</span>'
        : '') +
      (typeof getAssignmentLine === 'function' && c.classification === 'ESCALATE'
        ? '<span class="case-bar-assign">Assigned: ' + escapeHtml(getAssignmentLine(c)) + '</span>'
        : '') +
      '</div>' +
      primaryCta(c) +
      '</div>' +
      waitingOnHtml(c);
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
    var similar = ALL_CASES.filter(function (s) {
      return s.ref !== c.ref && (s.disruptionType === c.disruptionType || s.jurisdiction === c.jurisdiction);
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

    var escalationBanner = '';
    if (c.classification === 'ESCALATE' && c.escalatedTo) {
      var toU = USERS[c.escalatedTo] || { full: c.escalatedTo, name: c.escalatedTo };
      escalationBanner =
        '<div class="escalation-banner"><i class="ti ti-alert-triangle"></i><div><strong>Escalated to senior review</strong> — assigned to ' +
        escapeHtml(toU.full || toU.name) +
        '. Awaiting decision.<span class="esc-time">' +
        escapeHtml(c.escalatedAt || '') +
        '</span></div></div>';
    }

    document.getElementById('tab-panel').innerHTML =
      '<div class="tab-panel-inner">' +
      escalationBanner +
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
    document.getElementById('tab-panel').innerHTML =
      '<iframe id="case-frame" class="case-frame" src="' +
      src +
      '?ref=' +
      encodeURIComponent(state.ref) +
      '&embed=1" title="' +
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
    if (!params.get('tab') && typeof getPrimaryTab === 'function') tab = getPrimaryTab(c);
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
