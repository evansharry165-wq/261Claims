/* Unified case workspace shell — Phase 2 */
var CaseShell = (function () {
  var TABS = [
    { id: 'overview', label: 'Overview', icon: 'ti-layout-dashboard' },
    { id: 'triage', label: 'Triage', icon: 'ti-search' },
    { id: 'deadlines', label: 'Deadlines', icon: 'ti-calendar-due' },
    { id: 'evidence', label: 'Evidence', icon: 'ti-folder-open' },
    { id: 'documents', label: 'Documents', icon: 'ti-file-pencil' },
    { id: 'activity', label: 'Activity', icon: 'ti-history' }
  ];

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

  function renderHeader(c) {
    var J = typeof getJurisdiction === 'function' ? getJurisdiction(c.jurisdiction) : { name: '', flag: '' };
    var urg = typeof daysUrgency === 'function' ? daysUrgency(c.cprDaysLeft) : 'ok';
    var evPct = typeof getEffectiveEvidencePct === 'function' ? getEffectiveEvidencePct(c) : c.evidencePct || 0;
    var readyDraft = evPct >= 100 || c.evidenceReady;
    var cls = readyDraft && c.stage === 'evidence' ? 'DRAFTING' : c.classification || '';
    var clsBg =
      cls === 'DRAFTING' ? 'var(--purple-faint)' : cls === 'ESCALATE' ? 'var(--red-faint)' : cls === 'DEFEND' ? 'var(--green-faint)' : 'var(--surface3)';
    var clsCol =
      cls === 'DRAFTING' ? 'var(--purple)' : cls === 'ESCALATE' ? 'var(--red)' : cls === 'DEFEND' ? 'var(--green)' : 'var(--text3)';
    var evCol = typeof evPctColor === 'function' ? evPctColor(evPct) : '#94A3B8';
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
      (cls ? '<span class="case-bar-pill" style="background:' + clsBg + ';color:' + clsCol + '">' + escapeHtml(cls) + '</span>' : '') +
      '<span class="case-bar-cpr dp-' +
      urg +
      '">CPR ' +
      escapeHtml(String(c.cprDaysLeft) + 'd') +
      '</span>' +
      (c.stage === 'evidence' || c.stage === 'drafting'
        ? '<span class="case-bar-ev" style="color:' + evCol + '">Evidence ' + evPct + '%</span>'
        : '') +
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

    document.getElementById('tab-panel').innerHTML =
      '<div class="tab-panel-inner"><div class="overview-grid">' +
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

  function renderTriage() {
    var c = state.caseData;
    if (!c) return;
    document.getElementById('tab-panel').innerHTML =
      '<div class="tab-panel-inner">' +
      '<div class="panel-card" style="margin-bottom:14px">' +
      '<div class="pc-label">AI Triage Assessment</div>' +
      '<div class="kv"><span>Classification</span><span style="font-weight:600;color:' +
        (c.classification === 'DEFEND' ? 'var(--green)' : c.classification === 'ESCALATE' ? 'var(--red)' : 'var(--amber)') +
        '">' + escapeHtml(c.classification || 'Pending') + '</span></div>' +
      '<div class="kv"><span>Disruption type</span><span>' + escapeHtml(c.disruptionType || '—') + '</span></div>' +
      '<div class="kv"><span>Jurisdiction</span><span>' + escapeHtml(c.jurisdiction || '—') + '</span></div>' +
      '<div class="kv"><span>Category</span><span>' + escapeHtml(c.cat || '—') + '</span></div>' +
      '</div>' +
      '<div class="panel-card" style="margin-bottom:14px">' +
      '<div class="pc-label">Points of claim</div>' +
      (c.points && c.points.length ? c.points.map(function(p) {
        var dot = p.evidenceStatus === 'green' ? 'var(--green)' : p.evidenceStatus === 'amber' ? 'var(--amber)' : 'var(--red)';
        return '<div class="kv"><span style="display:flex;align-items:center;gap:6px"><span style="width:8px;height:8px;border-radius:50%;background:' + dot + ';display:inline-block;flex-shrink:0"></span>' + escapeHtml(p.claim) + '</span><span style="color:var(--text3);font-size:11px">' + escapeHtml(p.evidenceDoc || '') + '</span></div>';
      }).join('') : '<div class="empty-note">No points of claim recorded.</div>') +
      '</div>' +
      (c.triageNote ? '<div class="panel-card"><div class="pc-label">Triage note</div><p style="font-size:13px;line-height:1.6;color:var(--text2)">' + escapeHtml(c.triageNote) + '</p></div>' : '') +
      '</div>';
  }

  function renderDeadlines() {
    var c = state.caseData;
    if (!c) return;
    var urg = typeof daysUrgency === 'function' ? daysUrgency(c.cprDaysLeft) : 'ok';
    document.getElementById('tab-panel').innerHTML =
      '<div class="tab-panel-inner">' +
      '<div class="panel-card" style="margin-bottom:14px">' +
      '<div class="pc-label">CPR Deadline</div>' +
      '<div class="kv"><span>Days remaining</span><span class="dp-' + urg + '" style="font-weight:600;padding:2px 8px;border-radius:20px">' + escapeHtml(String(c.cprDaysLeft)) + ' days</span></div>' +
      '<div class="kv"><span>LOC received</span><span>' + escapeHtml(c.locDate || '—') + '</span></div>' +
      '<div class="kv"><span>Jurisdiction</span><span>' + escapeHtml(c.jurisdiction || '—') + '</span></div>' +
      '<div class="kv"><span>Response deadline</span><span style="font-weight:500">' + escapeHtml(c.cprDaysLeft <= 0 ? 'OVERDUE' : c.cprDaysLeft + ' days') + '</span></div>' +
      '</div>' +
      '<div class="panel-card">' +
      '<div class="pc-label">CPR Checklist</div>' +
      '<div class="kv"><span>Letter of Acknowledgement</span><span style="color:' + (c.loaStatus === 'approved' ? 'var(--green)' : 'var(--amber)') + '">' + escapeHtml(c.loaStatus === 'approved' ? '✓ Sent' : 'Pending') + '</span></div>' +
      '<div class="kv"><span>Triage complete</span><span style="color:' + (c.classification ? 'var(--green)' : 'var(--amber)') + '">' + escapeHtml(c.classification ? '✓ ' + c.classification : 'Pending') + '</span></div>' +
      '<div class="kv"><span>Evidence pack</span><span style="color:' + ((c.evidencePct || 0) >= 100 ? 'var(--green)' : 'var(--amber)') + '">' + escapeHtml((c.evidencePct || 0) + '%') + '</span></div>' +
      '</div>' +
      '</div>';
  }

  function renderEvidence() {
    var c = state.caseData;
    if (!c) return;
    var pct = c.evidencePct || 0;
    var pctColor = pct >= 100 ? 'var(--green)' : pct >= 50 ? 'var(--amber)' : 'var(--red)';
    document.getElementById('tab-panel').innerHTML =
      '<div class="tab-panel-inner">' +
      '<div class="panel-card" style="margin-bottom:14px">' +
      '<div class="pc-label">Pack readiness</div>' +
      '<div style="display:flex;align-items:center;gap:12px;margin-bottom:10px">' +
      '<div style="flex:1;height:8px;border-radius:4px;background:var(--border)"><div style="width:' + pct + '%;height:100%;border-radius:4px;background:' + pctColor + ';transition:width 0.3s"></div></div>' +
      '<span style="font-weight:600;color:' + pctColor + '">' + pct + '%</span>' +
      '</div>' +
      '<div class="kv"><span>Disruption type</span><span>' + escapeHtml(c.disruptionType || '—') + '</span></div>' +
      '<div class="kv"><span>Classification</span><span>' + escapeHtml(c.classification || 'Pending') + '</span></div>' +
      '</div>' +
      '<div class="panel-card">' +
      '<div class="pc-label">Evidence checklist</div>' +
      (c.points && c.points.length ? c.points.map(function(p) {
        var dot = p.evidenceStatus === 'green' ? 'var(--green)' : p.evidenceStatus === 'amber' ? 'var(--amber)' : 'var(--red)';
        var icon = p.evidenceStatus === 'green' ? 'ti-circle-check' : p.evidenceStatus === 'amber' ? 'ti-clock' : 'ti-circle-x';
        return '<div class="kv"><span style="display:flex;align-items:center;gap:8px"><i class="ti ' + icon + '" style="color:' + dot + '"></i>' + escapeHtml(p.claim) + '</span><span style="color:var(--text3);font-size:11px">' + escapeHtml(p.evidenceDoc || 'Outstanding') + '</span></div>';
      }).join('') : '<div class="empty-note">No evidence items defined.</div>') +
      '</div>' +
      '</div>';
  }

  function renderDocuments() {
    var c = state.caseData;
    if (!c) return;
    document.getElementById('tab-panel').innerHTML =
      '<div class="tab-panel-inner">' +
      '<div class="panel-card" style="margin-bottom:14px">' +
      '<div class="pc-label">Document status</div>' +
      '<div class="kv"><span>Letter of Acknowledgement</span><span style="color:' + (c.loaStatus === 'approved' ? 'var(--green)' : 'var(--text3)') + '">' + (c.loaStatus === 'approved' ? '✓ Sent' : '○ Not sent') + '</span></div>' +
      '<div class="kv"><span>Letter of Response</span><span style="color:var(--text3)">○ Not drafted</span></div>' +
      '<div class="kv"><span>Defence</span><span style="color:var(--text3)">○ Not started</span></div>' +
      '<div class="kv"><span>Part 36 Offer</span><span style="color:var(--text3)">○ Not considered</span></div>' +
      '</div>' +
      '<div class="panel-card">' +
      '<div class="pc-label">Generate document</div>' +
      '<p style="font-size:12px;color:var(--text2);margin-bottom:12px">AI-assisted drafting is available when evidence pack is complete (' + (c.evidencePct || 0) + '% done).</p>' +
      '<button class="btn-primary" onclick="CaseShell.logActivity(\'Document generation initiated\',\'action\')" style="' + ((c.evidencePct || 0) < 100 ? 'opacity:0.5;cursor:not-allowed' : '') + '">' +
      '<i class="ti ti-file-pencil"></i> Generate Letter of Response' +
      '</button>' +
      '</div>' +
      '</div>';
  }

  function renderTabContent() {
    var panel = document.getElementById('tab-panel');
    panel.innerHTML = '';
    if (state.tab === 'overview') {
      renderOverview();
    } else if (state.tab === 'triage') {
      renderTriage();
    } else if (state.tab === 'deadlines') {
      renderDeadlines();
    } else if (state.tab === 'evidence') {
      renderEvidence();
    } else if (state.tab === 'documents') {
      renderDocuments();
    } else if (state.tab === 'activity') {
      renderActivity();
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
