/* Unified case workspace shell — Phase 2 */
var CaseShell = (function () {
  var TABS = [
    { id: 'overview', label: 'Overview', icon: 'ti-layout-dashboard', frame: false },
    { id: 'triage', label: 'Triage', icon: 'ti-search', frame: 'module2-case-workspace.html' },
    { id: 'deadlines', label: 'Deadlines', icon: 'ti-calendar-due', frame: 'module3-cpr-workspace.html' },
    { id: 'evidence', label: 'Evidence', icon: 'ti-folder-open', frame: 'module4-evidence-workspace.html' },
    { id: 'documents', label: 'Documents', icon: 'ti-file-pencil', frame: 'module5-drafting-workspace.html' },
    { id: 'activity', label: 'Activity', icon: 'ti-activity', frame: false }
  ];

  var FRAME_MAP = {
    triage: 'module2-case-workspace.html',
    deadlines: 'module3-cpr-workspace.html',
    evidence: 'module4-evidence-workspace.html',
    documents: 'module5-drafting-workspace.html',
    terminal: 'module8-terminal-workspace.html'
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
    if (typeof normaliseCaseRef === 'function') ref = normaliseCaseRef(ref);
    var stored = null;
    try {
      stored = JSON.parse(sessionStorage.getItem('dfa_case') || 'null');
    } catch (e) {}
    var c = typeof resolveCase === 'function'
      ? resolveCase(ref)
      : (typeof getCase === 'function' ? getCase(ref) : null);
    if (stored && stored.ref === ref) {
      c = Object.assign({}, c || {}, stored);
      // Prefer fresher filing meta for engine fields
      if (typeof CaseFiling !== 'undefined') {
        var cf = CaseFiling.getCase(ref);
        if (cf) {
          if (cf.locReady != null) c.locReady = !!cf.locReady;
          if (cf.origin) c.origin = cf.origin;
          if (cf.caseSummary) c.caseSummary = cf.caseSummary;
          if (cf.verdictTitle) c.verdictTitle = cf.verdictTitle;
          if (cf.verdictSub) c.verdictSub = cf.verdictSub;
          if (cf.conditions) c.conditions = cf.conditions;
          if (cf.points && cf.points.length) c.points = cf.points;
          if (cf.classification) c.classification = cf.classification;
          if (cf.evidencePct != null) c.evidencePct = cf.evidencePct;
          if (cf.stage) c.stage = cf.stage;
        }
      }
    }
    if (!c) return null;

    var u = USERS[c.assignedTo] || { name: c.assignedTo };
    try {
      sessionStorage.setItem('dfa_case', JSON.stringify(c));
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
          origin: c.origin || '',
          locReady: c.locReady != null ? !!c.locReady : true
        })
      );
    } catch (e) {}

    try {
      var actKey = 'dfa_activity_' + ref;
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
      sessionStorage.setItem('dfa_activity_' + state.ref, JSON.stringify(state.activity.slice(0, 50)));
    } catch (e) {}
    if (state.tab === 'activity') renderActivity();
  }

  function demoStudyStripHtml(c) {
    var studyId = null;
    try {
      studyId = sessionStorage.getItem('dfa_active_demo_study');
    } catch (e) {}
    if (!studyId || typeof getDemoStudy !== 'function') return '';
    var study = getDemoStudy(studyId);
    if (!study || (study.ref && study.ref !== c.ref)) return '';
    return (
      '<div class="demo-study-strip"><i class="ti ti-player-play" style="color:var(--blue-text)"></i> <strong>Demo:</strong> ' +
      escapeHtml(study.title) +
      ' — ' +
      escapeHtml(study.narrative) +
      ' <a href="index.html" onclick="try{sessionStorage.removeItem(\'dfa_active_demo_study\')}catch(e){}">All demos</a></div>'
    );
  }

  function renderHeader(c) {
    var J = typeof getJurisdiction === 'function' ? getJurisdiction(c.jurisdiction) : { name: '', flag: '' };
    var urg = typeof daysUrgency === 'function' ? daysUrgency(c.cprDaysLeft) : 'ok';
    var evPct = typeof getEffectiveEvidencePct === 'function' ? getEffectiveEvidencePct(c) : c.evidencePct || 0;
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
    var tabsEl = document.getElementById('case-tabs');
    if (!tabsEl) return;
    var c = state.caseData;
    var stageOrder = ['intake', 'triage', 'cpr', 'evidence', 'drafting', 'defence', 'resolve'];
    var stageIdx = stageOrder.indexOf(c ? c.stage : 'triage');

    tabsEl.innerHTML = TABS.map(function (tab) {
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
                  : tab.id === 'terminal'
                    ? 5
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

  /* Case-page ('CE') stylesheet — injected once */
  function _injectCEStyles() {
    if (document.getElementById('ce-shell-style')) return;
    var st = document.createElement('style');
    st.id = 'ce-shell-style';
    st.textContent = [
      '.ce-engine{grid-column:1/-1;border-radius:8px;padding:20px 24px;color:#fff;background:#1A2F45;box-shadow:0 4px 14px rgba(26,47,69,.14);margin-bottom:2px}',
      '.ce-engine.ce-v-defend{background:linear-gradient(135deg,#1A2F45 0,#1B5C3A 140%)}',
      '.ce-engine.ce-v-defend-c{background:linear-gradient(135deg,#1A2F45 0,#2F6B4F 140%)}',
      '.ce-engine.ce-v-hold{background:linear-gradient(135deg,#1A2F45 0,#8A6B00 140%)}',
      '.ce-engine.ce-v-settle{background:linear-gradient(135deg,#1A2F45 0,#7A1A1A 140%)}',
      '.ce-eng-kicker{font-family:"IBM Plex Mono",monospace;font-size:9.5px;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.55)}',
      '.ce-eng-verdict{font-family:"Libre Baskerville",Georgia,serif;font-size:24px;margin-top:4px;color:#fff}',
      '.ce-eng-defence{font-size:13.5px;line-height:1.55;margin-top:10px;color:rgba(255,255,255,.9);max-width:820px}',
      '.ce-eng-defence b{color:#fff;font-weight:600}',
      '.ce-eng-actions{margin-top:16px;display:flex;flex-wrap:wrap;gap:8px}',
      '.ce-eng-actions button, .ce-eng-actions a{font-size:11px;padding:8px 14px}',
      '.ce-lof-card{grid-column:1/-1}',
      '.ce-lof-head{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin:10px 0 14px;padding:12px 14px;background:var(--surface2,#F7F7F9);border-radius:5px;border:1px solid var(--border,#D8D8E0)}',
      '.ce-lof-lbl{display:block;font-family:"IBM Plex Mono",monospace;font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:var(--text3,#6B6B80);margin-bottom:2px}',
      '.ce-lof-val{font-family:"Libre Baskerville",Georgia,serif;font-size:15px;color:var(--ink,#16181D)}',
      '.ce-lof-table{width:100%;border-collapse:collapse;font-size:12px;margin-top:6px}',
      '.ce-lof-table th{text-align:left;font-size:9.5px;font-weight:500;text-transform:uppercase;letter-spacing:.09em;color:var(--text3,#6B6B80);padding:8px 10px;border-bottom:1px solid var(--border,#D8D8E0);background:#FBFBFC}',
      '.ce-lof-table td{padding:9px 10px;border-bottom:1px solid var(--rule2,#EBEBF0);vertical-align:middle}',
      '.ce-lof-table tr:last-child td{border-bottom:none}',
      '.ce-lof-table td.mono{font-family:"IBM Plex Mono",monospace;font-size:11px}',
      '.ce-st{font-family:"IBM Plex Mono",monospace;font-size:9.5px;letter-spacing:.05em;padding:2px 8px;border-radius:12px;text-transform:uppercase}',
      '.ce-st.st-on{background:#EEF7F2;color:#1A5C3A}',
      '.ce-st.st-del{background:#FDF4E3;color:#7A4E00}',
      '.ce-st.st-canx{background:#FBF0F0;color:#8B1A1A}',
      '.ce-st.st-div{background:#E8F0FA;color:#1E4D8C}',
      '.ce-ev-head{font-family:"IBM Plex Mono",monospace;font-size:10px;letter-spacing:.06em;margin:6px 0 10px}',
      '.ce-ev-count.held{color:#1A5C3A}',
      '.ce-ev-count.miss{color:#8B1A1A}',
      '.ce-ev-list{list-style:none;padding:0;margin:0}',
      '.ce-ev-list li{position:relative;padding:6px 8px 6px 24px;font-size:12.5px;color:var(--text2,#2D2D44);border-bottom:1px dashed var(--rule2,#EBEBF0)}',
      '.ce-ev-list li:last-child{border-bottom:none}',
      '.ce-ev-dot{position:absolute;left:6px;top:9px;width:10px;height:10px;border-radius:50%}',
      '.ce-ev-list li.held .ce-ev-dot{background:#1A5C3A}',
      '.ce-ev-list li.miss .ce-ev-dot{background:#8B1A1A}',
      '.ce-ev-cta{margin-top:10px;padding-top:8px;border-top:1px solid var(--rule2,#EBEBF0);font-family:"IBM Plex Mono",monospace;font-size:10px}',
      '.ce-ev-cta a{color:#1E4D8C;text-decoration:none;margin-right:12px}',
      '.ce-ev-cta a:hover{text-decoration:underline}',
      '.ce-loc-card{grid-column:1/-1;border-left:3px solid #C45C12}',
      '.ce-loc-hint{font-size:12px;color:var(--text2,#3A3F4A);margin:6px 0 12px}',
      '.ce-loc-drop{border:2px dashed var(--border,#D8D8E0);border-radius:6px;padding:26px 20px;text-align:center;background:var(--surface2,#F7F7F9);cursor:default;transition:border-color .15s,background .15s;margin-bottom:10px}',
      '.ce-loc-drop.over{border-color:#1E4D8C;background:#E8F0FA}',
      '.ce-loc-drop i{font-size:28px;color:var(--text3,#6B6B80);display:block;margin-bottom:8px}',
      '.ce-loc-drop a{color:#1E4D8C;text-decoration:underline}',
      '.ce-loc-paste{width:100%;font-size:12px;padding:8px;border:1px solid var(--border,#D8D8E0);border-radius:4px;font-family:"IBM Plex Sans",sans-serif;margin-bottom:10px;resize:vertical}'
    ].join('\n');
    document.head.appendChild(st);
  }

  /* ── Case-page helpers (engine-integrated) ───────────────────────────── */
  function _packet(refKey) {
    if (typeof CaseFiling === 'undefined') return null;
    var doc = CaseFiling.findByDocKey && CaseFiling.findByDocKey(state.ref, refKey);
    if (!doc) return null;
    try { return JSON.parse(doc.content || 'null'); } catch (e) { return null; }
  }

  function _lofRows() {
    // Prefer the case_packet's stored LOF (top-level lofRows); fall back to facts.rotation from the seed
    var pk = _packet('case_packet');
    if (pk) {
      if (Array.isArray(pk.lofRows) && pk.lofRows.length) return pk.lofRows;
      if (pk.facts && Array.isArray(pk.facts.rotation) && pk.facts.rotation.length) {
        // Seed rotation shape → LOF-render shape
        return pk.facts.rotation.map(function (r) {
          return {
            flight: r.fno || r.flight || '',
            route: (r.frm && r.to) ? (r.frm + '→' + r.to) : (r.route || ''),
            status: (r.status || 'ON TIME').replace(/^ON TIME$/, 'On Time').replace(/^CANCELLED$/, 'Cancelled').replace(/^DIVERTED$/, 'Diverted').replace(/^DELAYED$/, 'Delayed'),
            note: [
              r.reason,
              r.divTo ? ('→ ' + r.divTo) : '',
              r.arrDelay ? ('+' + r.arrDelay + 'm') : '',
              r.causedBy ? ('↳ ' + r.causedBy) : ''
            ].filter(Boolean).join(' · ')
          };
        });
      }
    }
    return [];
  }

  function _defensibilityLine(c) {
    // "This case is defendable on the basis of X" style, plain English, one sentence
    var primary = (c.disruptionType || '').replace(/[-_]/g,' ').replace(/\b\w/g,function(x){return x.toUpperCase();});
    var secondary = (c.secondaryType || '').replace(/[-_]/g,' ').replace(/\b\w/g,function(x){return x.toUpperCase();});
    var v = String(c.classification || '').toUpperCase();
    var head;
    if (v.indexOf('DEFEND_WITH_CONDITIONS') >= 0 || v.indexOf('CONDITIONS') >= 0) head = 'This case is defendable, subject to evidence.';
    else if (v.indexOf('DEFEND_HOLD') >= 0 || v.indexOf('HOLD') >= 0) head = 'This case can be defended — evidence pending.';
    else if (v.indexOf('DEFEND') >= 0) head = 'This case is defendable.';
    else if (v.indexOf('SETTLE') >= 0 || v.indexOf('CONCEDE') >= 0) head = 'This case is not defensible on the confirmed facts — consider early settlement.';
    else if (v.indexOf('JUDGMENT') >= 0) head = 'The facts and the law give conflicting signals for this case — a senior judgment is required.';
    else head = 'Legal position pending.';
    var basis = primary ? ('The primary disruption is <b>' + escapeHtml(primary) + '</b>' + (secondary ? ' with contributing <b>' + escapeHtml(secondary) + '</b>' : '') + '.') : '';
    return head + (basis ? ' ' + basis : '');
  }

  function _evidenceList() {
    // Prefer case_packet.evidenceMarks (top-level). Fall back to seed disruption.evidence and case.points.
    var pk = _packet('case_packet');
    var out = [];
    var seen = {};
    function add(text, held) {
      var k = String(text || '').trim().toLowerCase();
      if (!k || seen[k]) return;
      seen[k] = 1;
      out.push({ text: String(text).trim(), held: !!held });
    }
    if (pk && Array.isArray(pk.evidenceMarks)) {
      pk.evidenceMarks.forEach(function (m) {
        add(m.name || m.label || m.key || 'Evidence item', (m.status === 'available' || m.status === 'on_file' || m.status === 'held'));
      });
    }
    // Seed disruption 'evidence' string — held items listed
    if (pk && pk.facts && pk.facts.disruption && pk.facts.disruption.evidence) {
      String(pk.facts.disruption.evidence).split(/;|·/).forEach(function (it) {
        var t = it.replace(/^\s*Evidence held:\s*/i, '').trim().replace(/\.$/, '');
        if (t && t.length > 2) add(t, true);
      });
    }
    // LOF sectors on record — always held once G0 signed
    if (pk && Array.isArray(pk.lofRows) && pk.lofRows.length) {
      add('Line of Flying records (' + pk.lofRows.length + ' sectors)', true);
    } else if (pk && pk.facts && Array.isArray(pk.facts.rotation) && pk.facts.rotation.length) {
      add('Line of Flying records (' + pk.facts.rotation.length + ' sectors)', true);
    }
    // Fall back to case.points if nothing else
    if (!out.length) {
      var c = state.caseData || {};
      (c.points || []).forEach(function (pt) {
        add(pt.evidenceDoc || pt.claim || 'Evidence point', pt.evidenceStatus === 'green');
      });
    }
    return out.slice(0, 12);
  }

  function _totalDelayLabel(c) {
    var pk = _packet('case_packet');
    if (pk && pk.facts) {
      if (pk.facts.isCancelled) return 'Cancelled';
      if (pk.facts.delayText) return String(pk.facts.delayText);
      if (pk.facts.delayMins != null) return pk.facts.delayMins + ' minutes';
    }
    if (c.delay) return c.delay;
    return '—';
  }

  function _timesLine(c) {
    var pk = _packet('case_packet');
    var f = (pk && pk.facts) || {};
    var route = (f.depIata && f.arrIata) ? (f.depIata + ' → ' + f.arrIata) : ((c.dep && c.arr) ? (c.dep + ' → ' + c.arr) : '');
    var date = f.date || c.flightDate || '';
    var flight = f.flightNum || c.flightNum || '';
    return [flight, route, date].filter(Boolean).join(' · ');
  }

  function renderOverview() {
    _injectCEStyles();
    var c = state.caseData;
    if (!c) return;
    var action = typeof getNextAction === 'function' ? getNextAction(c) : { text: 'Review case', tab: 'overview' };
    var J = typeof getJurisdiction === 'function' ? getJurisdiction(c.jurisdiction) : {};

    var stages = [
      { id: 'intake', label: 'Intake', tab: null },
      { id: 'triage', label: 'Triage', tab: 'triage' },
      { id: 'cpr', label: 'Deadlines', tab: 'deadlines' },
      { id: 'evidence', label: 'Evidence', tab: 'evidence' },
      { id: 'drafting', label: 'Documents', tab: 'documents' },
      { id: 'defence', label: 'Terminal', tab: 'terminal' },
      { id: 'resolve', label: 'Resolve', tab: null }
    ];
    var stageIdx = stages.findIndex(function (s) {
      return s.id === c.stage || (c.stage === 'defence' && s.id === 'drafting');
    });

    var isEngine = c.origin === 'legal_engine' || (typeof CaseFiling !== 'undefined' && CaseFiling.findByDocKey && CaseFiling.findByDocKey(c.ref, 'decision_packet'));
    var lof = _lofRows();
    var evidence = _evidenceList();
    var defLine = _defensibilityLine(c);

    // ── Engine intelligence card (full width, top)
    var enginePanel = '';
    if (isEngine) {
      var vClass = 'ce-v-neutral';
      var v = String(c.classification || '').toUpperCase();
      if (v.indexOf('DEFEND_WITH_CONDITIONS') >= 0 || v.indexOf('CONDITIONS') >= 0) vClass = 'ce-v-defend-c';
      else if (v.indexOf('DEFEND_HOLD') >= 0 || v.indexOf('HOLD') >= 0) vClass = 'ce-v-hold';
      else if (v.indexOf('DEFEND') >= 0) vClass = 'ce-v-defend';
      else if (v.indexOf('SETTLE') >= 0) vClass = 'ce-v-settle';
      enginePanel =
        '<div class="ce-engine ' + vClass + '">' +
          '<div class="ce-eng-kicker">From the Legal Engine</div>' +
          '<div class="ce-eng-verdict">' + escapeHtml((v || 'Position pending').replace(/_/g,' ').replace(/\b\w/g,function(x){return x.toUpperCase();})) + '</div>' +
          '<div class="ce-eng-defence">' + defLine + '</div>' +
          '<div class="ce-eng-actions">' +
            '<button class="btn-primary" type="button" onclick="CaseShell.openFilingDoc(\'legal_position\')">Open legal position</button>' +
            '<button class="btn-primary" type="button" style="background:var(--ink2)" onclick="CaseShell.openFilingDoc(\'case_summary\')">Open case summary</button>' +
            '<button class="btn-primary" type="button" style="background:var(--surface3);color:var(--ink)" onclick="CaseShell.switchTab(\'evidence\')">Evidence workspace</button>' +
            '<a class="btn-primary" style="text-decoration:none;background:var(--surface3);color:var(--ink)" href="repository.html?ref=' + encodeURIComponent(c.ref) + '">All filing docs</a>' +
          '</div>' +
        '</div>';
    }

    // ── LOF at a glance
    var lofPanel =
      '<div class="panel-card ce-lof-card">' +
        '<div class="pc-label">Line of Flying — at a glance</div>' +
        '<div class="ce-lof-head">' +
          '<div><span class="ce-lof-lbl">Flight</span><span class="ce-lof-val">' + escapeHtml(c.flightNum || c.flight || '—') + '</span></div>' +
          '<div><span class="ce-lof-lbl">Route</span><span class="ce-lof-val">' + escapeHtml((c.dep && c.arr) ? c.dep + '→' + c.arr : '—') + '</span></div>' +
          '<div><span class="ce-lof-lbl">Date</span><span class="ce-lof-val">' + escapeHtml(c.flightDate || '—') + '</span></div>' +
          '<div><span class="ce-lof-lbl">Overall delay</span><span class="ce-lof-val" style="color:var(--alert)">' + escapeHtml(_totalDelayLabel(c)) + '</span></div>' +
        '</div>' +
        (lof.length
          ? '<table class="ce-lof-table"><thead><tr><th>Flight</th><th>Route</th><th>Status</th><th>Note</th></tr></thead><tbody>' +
              lof.map(function (r) {
                var st = (r.status || '').toUpperCase();
                var cls = st.indexOf('CANCEL') >= 0 ? 'st-canx' : st.indexOf('DIVERT') >= 0 ? 'st-div' : st.indexOf('DELAY') >= 0 ? 'st-del' : 'st-on';
                return '<tr><td class="mono">' + escapeHtml(r.flight || '—') + '</td>' +
                       '<td class="mono">' + escapeHtml(r.route || '—') + '</td>' +
                       '<td><span class="ce-st ' + cls + '">' + escapeHtml(r.status || 'On Time') + '</span></td>' +
                       '<td>' + escapeHtml(r.note || '') + '</td></tr>';
              }).join('') +
            '</tbody></table>'
          : '<div class="empty-note" style="margin-top:8px">Line of flying not on file — check the case packet.</div>') +
      '</div>';

    // ── Evidence checklist (replaces Similar Cases)
    var heldN = evidence.filter(function (e) { return e.held; }).length;
    var missN = evidence.length - heldN;
    var evPanel =
      '<div class="panel-card ce-ev-card">' +
        '<div class="pc-label">Evidence checklist</div>' +
        '<div class="ce-ev-head"><span class="ce-ev-count held">' + heldN + ' on file</span> · <span class="ce-ev-count miss">' + missN + ' outstanding</span></div>' +
        (evidence.length
          ? '<ul class="ce-ev-list">' + evidence.map(function (e) {
              return '<li class="' + (e.held ? 'held' : 'miss') + '"><span class="ce-ev-dot"></span>' + escapeHtml(e.text) + '</li>';
            }).join('') + '</ul>'
          : '<div class="empty-note" style="margin-top:8px">No checklist available.</div>') +
        (missN ? '<div class="ce-ev-cta"><a href="repository.html?ref=' + encodeURIComponent(c.ref) + '">Repository →</a> · <a href="#" onclick="CaseShell.switchTab(\'evidence\');return false">Evidence workspace →</a></div>' : '') +
      '</div>';

    // ── LOC dropzone (only when not received)
    var locPanel = '';
    if (isEngine && !c.locReady) {
      locPanel =
        '<div class="panel-card ce-loc-card" style="grid-column:1/-1">' +
          '<div class="pc-label">Awaiting Letter of Claim</div>' +
          '<div class="ce-loc-hint">Drop the LOC below (PDF or DOCX) or paste its text. Case facts are pre-populated from the engine — no re-keying.</div>' +
          '<div class="ce-loc-drop" id="ce-loc-drop" ondragover="event.preventDefault();this.classList.add(\'over\')" ondragleave="this.classList.remove(\'over\')" ondrop="CaseShell.dropLoc(event)">' +
            '<i class="ti ti-cloud-upload"></i>' +
            '<div><b>Drop LOC file here</b> or <a href="#" onclick="document.getElementById(\'ce-loc-file\').click();return false">browse</a></div>' +
            '<input type="file" id="ce-loc-file" accept=".pdf,.docx" style="display:none" onchange="CaseShell.pickLoc(event)">' +
          '</div>' +
          '<textarea id="shell-loc-paste" rows="3" placeholder="…or paste LOC text / note here — the case will accept it automatically" class="ce-loc-paste" onblur="CaseShell._autoLocFromPaste()"></textarea>' +
        '</div>';
    }

    // ── Pipeline (unchanged — still useful)
    var pipelinePanel =
      '<div class="panel-card">' +
        '<div class="pc-label">Pipeline</div>' +
        '<div class="mini-pipeline">' +
          stages.map(function (s, i) {
            var cls = i < stageIdx ? 'done' : i === stageIdx ? 'current' : '';
            var click = s.tab ? 'onclick="CaseShell.switchTab(\'' + s.tab + '\')"' : '';
            return '<div class="mp-step ' + cls + '" ' + click + '><div class="mp-dot"></div><div class="mp-label">' + escapeHtml(s.label) + '</div></div>';
          }).join('') +
        '</div>' +
        (J.important ? '<div class="alert-box">' + escapeHtml(J.important) + '</div>' : '') +
      '</div>';

    // ── Case-info card (claimant/solicitor/assigned — compact)
    var infoPanel =
      '<div class="panel-card">' +
        '<div class="pc-label">Case reference</div>' +
        '<div class="kv"><span>Claimant</span><span>' + escapeHtml(c.claimant || '—') + '</span></div>' +
        '<div class="kv"><span>Solicitor</span><span>' + escapeHtml(c.solicitor || '—') + '</span></div>' +
        '<div class="kv"><span>Exposure</span><span>' + escapeHtml(c.value || '—') + '</span></div>' +
        '<div class="kv"><span>Stage</span><span>' + escapeHtml(typeof t === 'function' ? t('stage_' + c.stage) || c.stage : c.stage) + '</span></div>' +
        '<div class="kv"><span>Assigned to</span><span>' + escapeHtml(((typeof USERS !== 'undefined' && USERS[c.assignedTo]) ? USERS[c.assignedTo].full : (c.assignedTo || 'Unassigned'))) + '</span></div>' +
      '</div>';

    document.getElementById('tab-panel').innerHTML =
      '<div class="tab-panel-inner"><div class="overview-grid">' +
      enginePanel +
      locPanel +
      lofPanel +
      evPanel +
      infoPanel +
      pipelinePanel +
      '</div></div>';
  }


  function openFilingDoc(docKey) {
    if (typeof CaseFiling === 'undefined' || !state.ref) return;
    var doc = CaseFiling.findByDocKey(state.ref, docKey);
    if (!doc) {
      var all = CaseFiling.getDocuments(state.ref) || [];
      doc = all.filter(function (d) { return d.docKey === docKey; })[0];
    }
    if (!doc) return;
    var c = state.caseData || {};
    var isLegal = docKey === 'legal_position';
    var title = isLegal ? 'Legal Position' : 'Case Summary';
    var kicker = isLegal ? 'Legal Engine · lawyer view' : 'Legal Engine · plain-English brief';
    var body = escapeHtml(doc.content || '');
    // For case_summary, split at first blank line into "what happened" + "what you need"
    var summaryHtml = '';
    if (!isLegal) {
      var chunks = String(doc.content || '').split(/\n\n+/);
      summaryHtml =
        '<h3>What happened</h3>' +
        '<p>' + escapeHtml(chunks[0] || '(no summary text)') + '</p>' +
        (chunks[1] ? '<h3>Evidence you need to collect</h3><p>' + escapeHtml(chunks.slice(1).join('\n\n')) + '</p>' : '') +
        '<div class="fdoc-cta"><a href="repository.html?ref=' + encodeURIComponent(state.ref) + '">Repository →</a> · <a href="case.html?ref=' + encodeURIComponent(state.ref) + '&tab=evidence">Evidence workspace →</a></div>';
    }
    var win = window.open('', '_blank');
    if (!win) return;
    win.document.write(
      '<!doctype html><html><head><meta charset="utf-8"><title>' + escapeHtml(title) + ' — ' + escapeHtml(c.ref || '') + '</title>' +
      '<link href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">' +
      '<style>' +
      '*{box-sizing:border-box}body{margin:0;background:#EDE9E1;font-family:"IBM Plex Sans",system-ui,sans-serif;color:#16181D;line-height:1.55}' +
      '.fdoc-frame{max-width:820px;margin:32px auto;background:#F8F5EF;border:1px solid #C9C2B6;border-radius:8px;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,.1)}' +
      '.fdoc-hdr{background:#1A2F45;color:#fff;padding:18px 28px}' +
      '.fdoc-hdr .kicker{font-family:"IBM Plex Mono",monospace;font-size:9.5px;letter-spacing:.16em;text-transform:uppercase;color:rgba(255,255,255,.55)}' +
      '.fdoc-hdr .title{font-family:"Libre Baskerville",Georgia,serif;font-size:22px;margin-top:4px}' +
      '.fdoc-hdr .caseref{font-family:"IBM Plex Mono",monospace;font-size:10.5px;color:rgba(255,255,255,.6);margin-top:6px;letter-spacing:.03em}' +
      '.fdoc-body{padding:26px 32px 36px}' +
      '.fdoc-body h3{font-family:"Libre Baskerville",Georgia,serif;font-size:15px;font-weight:700;color:#1A2F45;margin:22px 0 8px;padding-bottom:6px;border-bottom:1px solid #C9C2B6}' +
      '.fdoc-body h3:first-child{margin-top:0}' +
      '.fdoc-body p{font-size:13.5px;margin:0 0 12px;color:#3A3F4A;white-space:pre-wrap}' +
      '.fdoc-body pre{font-family:"Libre Baskerville",Georgia,serif;font-size:13.5px;white-space:pre-wrap;color:#3A3F4A;margin:0}' +
      '.fdoc-cta{margin-top:22px;padding-top:14px;border-top:1px solid #DDD6CA;font-family:"IBM Plex Mono",monospace;font-size:11px;letter-spacing:.02em}' +
      '.fdoc-cta a{color:#1E4D8C;text-decoration:none;margin-right:14px}' +
      '.fdoc-cta a:hover{text-decoration:underline}' +
      '.fdoc-foot{padding:14px 32px;background:#F1EBDF;font-family:"IBM Plex Mono",monospace;font-size:9.5px;letter-spacing:.06em;text-transform:uppercase;color:#6B7280;border-top:1px solid #DDD6CA}' +
      '</style></head><body>' +
      '<div class="fdoc-frame">' +
        '<div class="fdoc-hdr"><div class="kicker">' + escapeHtml(kicker) + '</div>' +
        '<div class="title">' + escapeHtml(title) + '</div>' +
        '<div class="caseref">Case ' + escapeHtml(c.ref || '') + (c.claimant ? ' · ' + escapeHtml(c.claimant) : '') + '</div></div>' +
        '<div class="fdoc-body">' + (isLegal ? '<pre>' + body + '</pre>' : summaryHtml) + '</div>' +
        '<div class="fdoc-foot">DefendAble · from case file · non-editable snapshot</div>' +
      '</div></body></html>'
    );
    win.document.close();
  }


  function _loadFile(file) {
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function (e) {
      var text = '';
      try { text = String(e.target.result || ''); } catch (er) {}
      var paste = document.getElementById('shell-loc-paste');
      if (paste) paste.value = 'LOC file received: ' + file.name + ' (' + Math.round(file.size / 1024) + ' KB). Content preview: ' + text.slice(0, 400).replace(/[^\x20-\x7E\n]/g, ' ');
      receiveLoc();
    };
    reader.readAsText(file);
  }
  function dropLoc(ev) {
    ev.preventDefault();
    var dz = document.getElementById('ce-loc-drop'); if (dz) dz.classList.remove('over');
    var f = ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files[0];
    _loadFile(f);
  }
  function pickLoc(ev) {
    var f = ev.target && ev.target.files && ev.target.files[0];
    _loadFile(f);
  }
  function receiveLoc() {
    var paste = document.getElementById('shell-loc-paste');
    var text = paste ? paste.value.trim() : '';
    if (!text) {
      text = 'Letter of Claim received (flagged from case overview — content to follow).';
    }
    if (typeof markLocReceived === 'function') {
      markLocReceived(state.ref, {
        content: text,
        claimant: state.caseData && state.caseData.claimant,
        by: (USERS[getActiveUser()] || {}).full || 'Lawyer',
        stage: state.caseData && state.caseData.stage === 'evidence' ? 'evidence' : 'cpr'
      });
    }
    loadCase(state.ref);
    if (state.caseData) {
      renderHeader(state.caseData);
      renderTabs();
      renderOverview();
      logActivity('LOC received — ready for CPR/response', 'upload');
    }
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

  function isDraftingFrame(frame) {
    return frame && (frame.getAttribute('src') || '').indexOf('module5-drafting') >= 0;
  }

  function getFrameScrollEl(frame) {
    if (!frame || !frame.contentDocument || !frame.contentWindow) return null;
    var doc = frame.contentDocument;
    var win = frame.contentWindow;
    if (doc.getElementById('gathering-overlay')) {
      return doc.getElementById('gathering-overlay');
    }
    if (doc.getElementById('gathering-panel')) {
      var gatheringScroll = doc.querySelector('.doc-focus-scroll');
      if (gatheringScroll) return gatheringScroll;
    }
    var candidates = [
      doc.querySelector('#gathering-panel') ? doc.querySelector('.doc-focus-scroll') : null,
      doc.querySelector('.doc-focus-scroll'),
      doc.querySelector('.library-home'),
      doc.querySelector('.sidebar-left'),
      doc.querySelector('.sidebar-right'),
      doc.getElementById('main')
    ];
    var i;
    for (i = 0; i < candidates.length; i++) {
      var el = candidates[i];
      if (!el) continue;
      var style = win.getComputedStyle(el);
      if (el.scrollHeight > el.clientHeight + 1 && style.overflowY !== 'visible') return el;
    }
    return doc.scrollingElement || doc.documentElement || doc.body;
  }

  function syncFrameHeight(frame) {
    if (!frame || !frame.contentDocument) return;
    var panel = document.getElementById('tab-panel');
    var doc = frame.contentDocument;
    // For drafting frame: use max of content height and panel height
    // This allows the gathering stage panel to expand beyond the viewport
    var contentHeight = Math.max(
      doc.body ? doc.body.scrollHeight : 0,
      doc.documentElement ? doc.documentElement.scrollHeight : 0
    );
    var panelHeight = panel ? panel.clientHeight : 480;
    if (isDraftingFrame(frame)) {
      var gathering = doc.getElementById('gathering-panel');
      if (gathering) {
        var contentH = Math.max(
          gathering.offsetHeight + 100,
          contentHeight,
          panelHeight
        );
        frame.style.height = contentH + 'px';
        frame.setAttribute('data-scroll-mode', 'panel');
        return;
      }
      var targetHeight = Math.max(contentHeight, panelHeight);
      frame.style.height = targetHeight + 'px';
      frame.setAttribute('data-scroll-mode', contentHeight > panelHeight + 20 ? 'panel' : 'embed');
      return;
    }
    var height = Math.max(contentHeight, panelHeight);
    frame.style.height = height + 'px';
    frame.setAttribute('data-scroll-mode', 'panel');
  }

  function observeFrameResize(frame) {
    if (!frame || !frame.contentDocument) return;
    if (frame._resizeObs) {
      frame._resizeObs.disconnect();
      frame._resizeObs = null;
    }
    syncFrameHeight(frame);
    var timer;
    frame._resizeObs = new MutationObserver(function () {
      clearTimeout(timer);
      timer = setTimeout(function () {
        syncFrameHeight(frame);
      }, 80);
    });
    frame._resizeObs.observe(frame.contentDocument.body, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true
    });
  }

  function bindTabScroll() {
    if (window._caseTabScrollBound) return;
    window._caseTabScrollBound = true;
    window.addEventListener(
      'wheel',
      function (e) {
        var frame = document.getElementById('case-frame');
        var panel = document.getElementById('tab-panel');
        if (!panel) return;
        var panelRect = panel.getBoundingClientRect();
        if (e.clientY < panelRect.top || e.clientY > panelRect.bottom || e.clientX < panelRect.left || e.clientX > panelRect.right) {
          return;
        }

        var mode = frame ? frame.getAttribute('data-scroll-mode') : null;
        if (mode === 'embed' && frame) {
          var scrollEl = getFrameScrollEl(frame);
          if (!scrollEl) return;
          var innerMax = scrollEl.scrollHeight - scrollEl.clientHeight;
          if (innerMax <= 0) return;
          var innerNext = scrollEl.scrollTop + e.deltaY;
          if ((e.deltaY > 0 && scrollEl.scrollTop < innerMax) || (e.deltaY < 0 && scrollEl.scrollTop > 0)) {
            scrollEl.scrollTop = Math.max(0, Math.min(innerMax, innerNext));
            e.preventDefault();
          }
          return;
        }

        if (mode === 'panel' && frame) {
          var panelScrollEl = getFrameScrollEl(frame);
          if (panelScrollEl && panelScrollEl !== panel) {
            var pInnerMax = panelScrollEl.scrollHeight - panelScrollEl.clientHeight;
            if (pInnerMax > 0) {
              var pInnerNext = panelScrollEl.scrollTop + e.deltaY;
              if ((e.deltaY > 0 && panelScrollEl.scrollTop < pInnerMax) || (e.deltaY < 0 && panelScrollEl.scrollTop > 0)) {
                panelScrollEl.scrollTop = Math.max(0, Math.min(pInnerMax, pInnerNext));
                e.preventDefault();
                return;
              }
            }
          }
        }

        if (mode === 'panel' || !frame) {
          var max = panel.scrollHeight - panel.clientHeight;
          if (max <= 0) return;
          var next = panel.scrollTop + e.deltaY;
          if ((e.deltaY > 0 && panel.scrollTop < max) || (e.deltaY < 0 && panel.scrollTop > 0)) {
            panel.scrollTop = Math.max(0, Math.min(max, next));
            e.preventDefault();
          }
        }
      },
      { passive: false, capture: true }
    );
    window.addEventListener('resize', function () {
      var activeFrame = document.getElementById('case-frame');
      if (activeFrame) syncFrameHeight(activeFrame);
    });
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
    var frame = document.getElementById('case-frame');
    frame.addEventListener('load', function () {
      observeFrameResize(frame);
    });
    bindTabScroll();
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
    var headerEl = document.getElementById('case-header');
    var tabsEl = document.getElementById('case-tabs');
    var panelEl = document.getElementById('tab-panel');
    if (!headerEl || !tabsEl || !panelEl) return;

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
    if (tab === 'terminal') tab = 'documents';
    state.tab = tab;
    renderHeader(c);
    renderTabs();
    renderTabContent();
    if (typeof renderGlobalNav === 'function') renderGlobalNav();
    if (!state.opened) {
      logActivity('Case workspace opened', 'create');
      state.opened = true;
    }
    bindTabScroll();
  }

  window.addEventListener('message', function (e) {
    if (!e.data) return;
    if (e.data.type === 'gatheringPanelOpen') {
      var gFrame = document.getElementById('case-frame');
      if (gFrame) {
        var gPanel = document.getElementById('tab-panel');
        var gPanelH = gPanel ? gPanel.clientHeight : 500;
        gFrame.style.height = Math.max(e.data.height || 800, gPanelH) + 'px';
        gFrame.setAttribute('data-scroll-mode', 'panel');
        if (gPanel) gPanel.scrollTop = 0;
      }
      return;
    }
    if (e.data.type !== 'case-shell') return;
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
      var frame = document.getElementById('case-frame');
      if (frame) syncFrameHeight(frame);
    }
    if (e.data.action === 'panelScroll') {
      var scrollPanel = document.getElementById('tab-panel');
      if (!scrollPanel) return;
      var panelMax = scrollPanel.scrollHeight - scrollPanel.clientHeight;
      scrollPanel.scrollTop = Math.max(0, Math.min(panelMax, scrollPanel.scrollTop + (e.data.deltaY || 0)));
      return;
    }
    if (e.data.action === 'resize' || e.data.action === 'gatheringOpen') {
      var resizeFrame = document.getElementById('case-frame');
      if (resizeFrame) syncFrameHeight(resizeFrame);
      return;
    }
  });

  return {
    init: init,
    switchTab: switchTab,
    addNote: addNote,
    logActivity: logActivity,
    renderTabs: renderTabs,
    renderCaseBar: renderHeader,
    openFilingDoc: openFilingDoc,
    receiveLoc: receiveLoc
  };
})();
