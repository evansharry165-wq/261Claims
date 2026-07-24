/**
 * DefendAble — Engine Inbox
 * Cases filed by the Legal Engine land here first (stage:'inbox', assignedTo:null).
 * S. Booth (or any lead) reviews, assigns to a team member, and the case then
 * flows into the normal case pipeline. Also mirrored as a dashboard tile.
 */
var EngineInbox = (function () {
  'use strict';

  var STAGE = 'inbox';

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }

  function inbox() {
    if (typeof CaseFiling === 'undefined') return [];
    // stage='inbox' is the source of truth — assignedTo may default to 'SB' from
    // CaseFiling's ensureCaseFile fallback, so we don't rely on it here.
    return CaseFiling.listCases().filter(function (c) {
      return c && c.stage === STAGE;
    }).sort(function (a, b) {
      return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
    });
  }

  function inboxCount() { return inbox().length; }

  function jurisdictionFlag(ref) {
    var m = String(ref || '').match(/DEF-\d{4}-(EW|SC|FR|ES|IT|DE)-/i);
    var flags = { EW: '🇬🇧', SC: '🇬🇧', FR: '🇫🇷', ES: '🇪🇸', IT: '🇮🇹', DE: '🇩🇪' };
    return flags[(m && m[1]) || 'EW'] || '🇬🇧';
  }

  function timeAgo(iso) {
    if (!iso) return 'just now';
    var t = new Date(iso).getTime();
    if (!t) return 'just now';
    var mins = Math.floor((Date.now() - t) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return mins + ' min ago';
    var hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + 'h ago';
    var days = Math.floor(hrs / 24);
    return days + 'd ago';
  }

  function verdictWord(cls) {
    var v = String(cls || '').toUpperCase();
    if (v.indexOf('DEFEND_WITH_CONDITIONS') >= 0 || v.indexOf('WITH CONDITIONS') >= 0) return 'Defendable · subject to evidence';
    if (v.indexOf('DEFEND_HOLD') >= 0 || v.indexOf('HOLD') >= 0) return 'Defendable · evidence pending';
    if (v.indexOf('DEFEND') >= 0) return 'Defendable';
    if (v.indexOf('SETTLE') >= 0 || v.indexOf('CONCEDE') >= 0) return 'Consider settling';
    if (v.indexOf('JUDGMENT') >= 0) return 'Judgment call needed';
    return cls || '—';
  }

  function verdictClass(cls) {
    var v = String(cls || '').toUpperCase();
    if (v.indexOf('SETTLE') >= 0) return 'ei-v-settle';
    if (v.indexOf('DEFEND_HOLD') >= 0 || v.indexOf('HOLD') >= 0) return 'ei-v-hold';
    if (v.indexOf('DEFEND') >= 0) return 'ei-v-defend';
    return 'ei-v-neutral';
  }

  /* ── Team roster for assignment (excludes DIO team + Sarah herself unless leader-assign) ── */
  function assignees(jurisdiction) {
    if (typeof USERS === 'undefined') return [];
    var out = [];
    Object.keys(USERS).forEach(function (id) {
      var u = USERS[id];
      if (!u || u.team === 'dio') return;
      // Match assignees by language/jurisdiction where possible
      if (jurisdiction === 'france' && u.lang !== 'fr' && id !== 'SB') return;
      if (jurisdiction === 'spain' && u.lang !== 'es' && id !== 'SB') return;
      out.push(u);
    });
    return out;
  }

  function jurisdictionFor(caseObj) {
    return caseObj.jurisdiction || (String(caseObj.ref || '').match(/-FR-/) ? 'france'
      : String(caseObj.ref || '').match(/-ES-/) ? 'spain'
      : 'england-wales');
  }

  /* ── Assign a case out of the inbox ── */
  function assign(caseRef, userId) {
    if (typeof CaseFiling === 'undefined' || !caseRef || !userId) return null;
    var user = (typeof USERS !== 'undefined' && USERS[userId]) ? USERS[userId] : null;
    var caseObj = CaseFiling.getCase(caseRef);
    if (!caseObj) return null;
    var targetStage = caseObj.stage === STAGE
      ? (caseObj.suggestedStage
         || (caseObj.classification && /HOLD|CONDITIONS/i.test(caseObj.classification) ? 'evidence' : 'triage'))
      : caseObj.stage;
    // Move case OUT of inbox: force stage to targetStage (defaults to 'triage' via suggestedStage
    // or classification-derived fallback). This is what removes it from the Engine Inbox filter.
    var moveStage = (targetStage === STAGE) ? 'triage' : targetStage;
    CaseFiling.updateCaseMeta(caseRef, {
      assignedTo: userId,
      stage: moveStage,
      inboxAssignedAt: new Date().toISOString(),
      inboxAssignedBy: (typeof getActiveUser === 'function' ? getActiveUser() : 'SB')
    });
    CaseFiling.addActivity(caseRef,
      'Assigned to ' + (user ? user.full : userId) + ' from Engine Inbox',
      'assign',
      (typeof USERS !== 'undefined' && typeof getActiveUser === 'function' && USERS[getActiveUser()] ? USERS[getActiveUser()].name : 'S. Booth')
    );
    return CaseFiling.getCase(caseRef);
  }

  /* ── STYLES (once) ── */
  function injectStyles() {
    if (document.getElementById('ei-style')) return;
    var st = document.createElement('style');
    st.id = 'ei-style';
    st.textContent = [
      '.ei-panel{background:var(--surface,#FFFFFF);border:1px solid var(--rule,#D8D8E0);border-radius:4px;overflow:hidden;margin-bottom:18px}',
      '.ei-hdr{display:flex;align-items:center;gap:14px;padding:14px 18px;border-bottom:1px solid var(--rule,#D8D8E0);background:linear-gradient(180deg,#F7F7F9 0,#FFFFFF 100%)}',
      '.ei-hdr .badge{display:inline-flex;align-items:center;gap:6px;padding:3px 10px;border-radius:12px;background:#1A2F45;color:#fff;font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;font-family:var(--mono,monospace)}',
      '.ei-hdr .title{font-family:var(--font-serif,Georgia,serif);font-size:16px;font-weight:400;color:var(--ink,#1A1A2E)}',
      '.ei-hdr .sub{font-size:11px;color:var(--ink3,#6B6B80);margin-left:auto;font-family:var(--mono,monospace);letter-spacing:.03em}',
      '.ei-empty{padding:22px 24px;text-align:center;color:var(--ink3,#6B6B80);font-size:12px}',
      '.ei-empty i{display:block;font-size:28px;opacity:.35;margin-bottom:8px}',
      '.ei-bulk{padding:10px 18px;display:none;align-items:center;gap:12px;background:#EFF2F8;border-bottom:1px solid var(--rule,#D8D8E0);font-size:11px}',
      '.ei-bulk.show{display:flex}',
      '.ei-bulk-select{font-family:var(--font,sans-serif);font-size:11px;padding:5px 10px;border:1px solid var(--rule,#D8D8E0);border-radius:3px;background:#fff}',
      '.ei-bulk button{background:#1A2F45;color:#fff;border:0;padding:6px 14px;font-family:var(--mono,monospace);font-size:10px;letter-spacing:.06em;text-transform:uppercase;border-radius:3px;cursor:pointer}',
      '.ei-bulk button:disabled{opacity:.4;cursor:not-allowed}',
      '.ei-table{width:100%;border-collapse:collapse;font-size:12px}',
      '.ei-table th{text-align:left;font-size:9.5px;font-weight:500;text-transform:uppercase;letter-spacing:.1em;color:var(--ink3,#6B6B80);padding:9px 14px;border-bottom:1px solid var(--rule,#D8D8E0);background:#FBFBFC}',
      '.ei-table td{padding:12px 14px;border-bottom:1px solid var(--rule2,#EBEBF0);vertical-align:middle}',
      '.ei-table tr:last-child td{border-bottom:0}',
      '.ei-table tr:hover td{background:#FAFAFC}',
      '.ei-cb{width:14px;height:14px;cursor:pointer}',
      '.ei-flag{font-size:14px;line-height:1}',
      '.ei-ref{font-family:var(--mono,monospace);font-size:11px;color:var(--ink,#1A1A2E);font-weight:500}',
      '.ei-flight{font-family:var(--mono,monospace);font-size:11px;color:var(--ink2,#2D2D44)}',
      '.ei-flight .route{color:var(--ink3,#6B6B80)}',
      '.ei-verdict{font-size:11px;font-weight:500;padding:3px 9px;border-radius:12px;display:inline-block;border:1px solid transparent}',
      '.ei-v-defend{background:#EEF7F2;color:#1A5C3A;border-color:#BBE8CE}',
      '.ei-v-hold{background:#FDF4E3;color:#7A4E00;border-color:#EDD8A0}',
      '.ei-v-settle{background:#FBF0F0;color:#8B1A1A;border-color:#EDBFBF}',
      '.ei-v-neutral{background:#EFEFF2;color:#6B6B80;border-color:#D8D8E0}',
      '.ei-exposure{font-family:var(--font-serif,Georgia,serif);font-size:14px;color:var(--ink,#1A1A2E)}',
      '.ei-time{font-family:var(--mono,monospace);font-size:10.5px;color:var(--ink3,#6B6B80)}',
      '.ei-assign{display:flex;gap:6px;align-items:center}',
      '.ei-assign select{font-family:var(--font,sans-serif);font-size:11px;padding:5px 8px;border:1px solid var(--rule,#D8D8E0);border-radius:3px;background:#fff;min-width:130px}',
      '.ei-assign button{background:var(--ink,#1A1A2E);color:#fff;border:0;padding:6px 12px;font-family:var(--mono,monospace);font-size:9.5px;letter-spacing:.06em;text-transform:uppercase;border-radius:3px;cursor:pointer}',
      '.ei-assign button:hover{background:#2D2D44}',
      '.ei-view{color:var(--accent2,#254E91);font-size:11px;text-decoration:none;font-family:var(--mono,monospace);letter-spacing:.04em}',
      '.ei-view:hover{text-decoration:underline}',
      /* Dashboard tile */
      '.ei-tile{background:#1A2F45;color:#fff;border-radius:6px;padding:16px 18px;cursor:pointer;transition:transform .15s,box-shadow .15s;display:flex;flex-direction:column;gap:8px;min-height:120px;text-decoration:none}',
      '.ei-tile:hover{transform:translateY(-2px);box-shadow:0 6px 16px rgba(26,47,69,.28)}',
      '.ei-tile .kicker{font-family:var(--mono,monospace);font-size:9.5px;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.55)}',
      '.ei-tile .headline{font-family:var(--font-serif,Georgia,serif);font-size:26px;line-height:1}',
      '.ei-tile .headline b{font-weight:700}',
      '.ei-tile .meta{font-family:var(--mono,monospace);font-size:10px;color:rgba(255,255,255,.7);letter-spacing:.03em;margin-top:auto}',
      '.ei-tile.zero{background:#EFEFF2;color:var(--ink3,#6B6B80)}',
      '.ei-tile.zero .kicker{color:var(--ink3,#6B6B80)}',
      '.ei-tile.zero .headline{color:var(--ink2,#2D2D44);font-size:15px}',
      '.ei-tile.zero .meta{color:var(--ink3,#6B6B80)}'
    ].join('\n');
    document.head.appendChild(st);
  }

  /* ── RENDER: inbox panel for cases.html (mounts at top) ── */
  function renderPanel(mountEl) {
    if (typeof mountEl === 'string') mountEl = document.querySelector(mountEl);
    if (!mountEl) return;
    injectStyles();
    var items = inbox();
    var count = items.length;
    var oldest = items[items.length - 1];

    if (!count) {
      mountEl.innerHTML =
        '<div class="ei-panel">' +
          '<div class="ei-hdr">' +
            '<span class="badge">Engine Inbox</span>' +
            '<span class="title">Cases from the Legal Engine appear here for assignment</span>' +
            '<span class="sub">0 waiting</span>' +
          '</div>' +
          '<div class="ei-empty">' +
            '<i class="ti ti-inbox"></i>' +
            'No new cases from the Legal Engine.' +
          '</div>' +
        '</div>';
      return;
    }

    var oldestLabel = oldest ? ('oldest ' + timeAgo(oldest.createdAt)) : '';

    mountEl.innerHTML =
      '<div class="ei-panel">' +
        '<div class="ei-hdr">' +
          '<span class="badge">Engine Inbox</span>' +
          '<span class="title">' + count + ' case' + (count === 1 ? '' : 's') + ' from the Legal Engine — assign to a team member</span>' +
          '<span class="sub">' + oldestLabel + '</span>' +
        '</div>' +
        '<div class="ei-bulk" id="ei-bulk">' +
          '<span id="ei-bulk-count">0 selected</span>' +
          '<select class="ei-bulk-select" id="ei-bulk-select">' +
            '<option value="">Assign selected to…</option>' +
            assignees().map(function (u) { return '<option value="' + esc(u.id) + '">' + esc(u.name) + ' — ' + esc(u.role) + '</option>'; }).join('') +
          '</select>' +
          '<button id="ei-bulk-btn" disabled>Assign</button>' +
        '</div>' +
        '<table class="ei-table">' +
          '<thead><tr>' +
            '<th style="width:26px"><input type="checkbox" class="ei-cb" id="ei-cb-all" title="Select all"></th>' +
            '<th style="width:26px"></th>' +
            '<th>Reference</th>' +
            '<th>Flight</th>' +
            '<th>Engine verdict</th>' +
            '<th>Exposure</th>' +
            '<th>Received</th>' +
            '<th>Assign to</th>' +
            '<th></th>' +
          '</tr></thead>' +
          '<tbody>' +
            items.map(function (c) {
              var jur = jurisdictionFor(c);
              return '<tr data-ref="' + esc(c.ref) + '">' +
                '<td><input type="checkbox" class="ei-cb ei-row-cb" data-ref="' + esc(c.ref) + '"></td>' +
                '<td><span class="ei-flag" title="' + esc(jur) + '">' + jurisdictionFlag(c.ref) + '</span></td>' +
                '<td><span class="ei-ref">' + esc(c.ref) + '</span><div style="font-size:10.5px;color:var(--ink3,#6B6B80);margin-top:2px">' + esc(c.claimant || '—') + '</div></td>' +
                '<td><span class="ei-flight"><b>' + esc(c.flightNum || (c.flight || '—')) + '</b> <span class="route">' + esc(c.route || (c.dep && c.arr ? c.dep + '→' + c.arr : '')) + '</span></span><div style="font-size:10px;color:var(--ink3,#6B6B80);margin-top:2px">' + esc(c.flightDate || c.date || '') + '</div></td>' +
                '<td><span class="ei-verdict ' + verdictClass(c.classification) + '">' + esc(verdictWord(c.classification)) + '</span></td>' +
                '<td><span class="ei-exposure">' + esc(c.value || '—') + '</span></td>' +
                '<td><span class="ei-time">' + esc(timeAgo(c.createdAt)) + '</span></td>' +
                '<td>' +
                  '<div class="ei-assign">' +
                    '<select data-assign-for="' + esc(c.ref) + '">' +
                      '<option value="">Choose…</option>' +
                      assignees(jur).map(function (u) { return '<option value="' + esc(u.id) + '">' + esc(u.name) + '</option>'; }).join('') +
                    '</select>' +
                    '<button onclick="EngineInbox._assignRow(\'' + esc(c.ref) + '\')">Assign</button>' +
                  '</div>' +
                '</td>' +
                '<td><a class="ei-view" href="case.html?ref=' + esc(c.ref) + '">View →</a></td>' +
              '</tr>';
            }).join('') +
          '</tbody>' +
        '</table>' +
      '</div>';

    // Bulk mechanics
    var bulk = mountEl.querySelector('#ei-bulk');
    var bulkCount = mountEl.querySelector('#ei-bulk-count');
    var bulkBtn = mountEl.querySelector('#ei-bulk-btn');
    var bulkSel = mountEl.querySelector('#ei-bulk-select');
    var rowCbs = mountEl.querySelectorAll('.ei-row-cb');
    var allCb = mountEl.querySelector('#ei-cb-all');

    function refreshBulk() {
      var picked = Array.prototype.filter.call(rowCbs, function (cb) { return cb.checked; });
      var n = picked.length;
      bulk.classList.toggle('show', n > 0);
      bulkCount.textContent = n + ' selected';
      bulkBtn.disabled = !(n && bulkSel.value);
    }
    Array.prototype.forEach.call(rowCbs, function (cb) { cb.addEventListener('change', refreshBulk); });
    if (allCb) allCb.addEventListener('change', function () {
      Array.prototype.forEach.call(rowCbs, function (cb) { cb.checked = allCb.checked; });
      refreshBulk();
    });
    if (bulkSel) bulkSel.addEventListener('change', refreshBulk);
    if (bulkBtn) bulkBtn.addEventListener('click', function () {
      var uid = bulkSel.value; if (!uid) return;
      Array.prototype.forEach.call(rowCbs, function (cb) {
        if (cb.checked) assign(cb.getAttribute('data-ref'), uid);
      });
      renderPanel(mountEl); // redraw
      if (typeof renderCases === 'function') try { renderCases(); } catch(e){}
    });
  }

  function _assignRow(ref) {
    var sel = document.querySelector('select[data-assign-for="' + ref + '"]');
    if (!sel || !sel.value) return;
    assign(ref, sel.value);
    var mount = document.getElementById('engine-inbox-mount');
    if (mount) renderPanel(mount);
    if (typeof renderCases === 'function') try { renderCases(); } catch(e){}
  }

  /* ── RENDER: dashboard tile ── */
  function renderTile(mountEl) {
    if (typeof mountEl === 'string') mountEl = document.querySelector(mountEl);
    if (!mountEl) return;
    injectStyles();
    var items = inbox();
    var n = items.length;
    if (!n) {
      mountEl.innerHTML =
        '<a href="cases.html?filter=inbox" class="ei-tile zero">' +
          '<span class="kicker">Engine Inbox</span>' +
          '<span class="headline">No new cases from the engine</span>' +
          '<span class="meta">Cases will appear here as ICC files are processed →</span>' +
        '</a>';
      return;
    }
    var oldest = items[items.length - 1];
    mountEl.innerHTML =
      '<a href="cases.html?filter=inbox" class="ei-tile">' +
        '<span class="kicker">Engine Inbox</span>' +
        '<span class="headline"><b>' + n + '</b> case' + (n === 1 ? '' : 's') + ' waiting</span>' +
        '<span class="meta">oldest ' + timeAgo(oldest.createdAt) + ' · click to assign</span>' +
      '</a>';
  }

  return {
    inbox: inbox,
    inboxCount: inboxCount,
    assign: assign,
    renderPanel: renderPanel,
    renderTile: renderTile,
    _assignRow: _assignRow,
    STAGE: STAGE
  };
})();
if (typeof module !== 'undefined' && module.exports) { module.exports = EngineInbox; }
