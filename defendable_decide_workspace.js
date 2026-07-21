/* DefendAble — Decide workspace UI (framework spine after Confirm LOF) */
var DefendAbleDecideWorkspace = (function () {

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function gateAnswerClass(answer) {
    if (answer === 'yes') return 'decide-ans-yes';
    if (answer === 'no') return 'decide-ans-no';
    return 'decide-ans-na';
  }

  function renderGates(tree) {
    var gates = (tree && tree.gates) || [];
    if (!gates.length) return '<div class="decide-muted">No gate detail for this tree.</div>';
    return gates.map(function (g, idx) {
      var ans = (g.answer || 'n/a').toUpperCase();
      var gaps = (g.gaps || []).map(function (x) {
        return '<li>' + esc(x.name || x.libKey) + ' <span class="decide-muted">(' + esc(x.status) + ')</span></li>';
      }).join('');
      return (
        '<div class="decide-gate" data-tree="' + esc(tree.treeId) + '" data-gate="' + esc(g.gateId || idx) + '">' +
          '<div class="decide-gate-top">' +
            '<span class="decide-gate-id">' + esc(g.gateId || ('G' + (idx + 1))) + '</span>' +
            '<span class="decide-gate-name">' + esc(g.name || '') + '</span>' +
            '<span class="decide-ans ' + gateAnswerClass(g.answer) + '">' + esc(ans) + '</span>' +
          '</div>' +
          '<div class="decide-gate-q">' + esc(g.question || '') + '</div>' +
          (g.authority ? '<div class="decide-gate-auth">' + esc(g.authority) + '</div>' : '') +
          (g.reason ? '<div class="decide-gate-reason">' + esc(g.reason) + '</div>' : '') +
          (gaps ? '<ul class="decide-gaps">' + gaps + '</ul>' : '') +
          '<div class="decide-override-row">' +
            '<label>Lawyer override </label>' +
            '<select onchange="DefendAbleDecideWorkspace.onGateOverride(\'' + esc(tree.treeId) + '\',\'' + esc(g.gateId || idx) + '\', this.value)">' +
              '<option value="">Accept system</option>' +
              '<option value="yes">Force YES</option>' +
              '<option value="no">Force NO</option>' +
              '<option value="needs_evidence">Needs evidence</option>' +
            '</select>' +
            '<input type="text" placeholder="Short reason" onchange="DefendAbleDecideWorkspace.onGateNote(\'' + esc(tree.treeId) + '\',\'' + esc(g.gateId || idx) + '\', this.value)" />' +
          '</div>' +
        '</div>'
      );
    }).join('');
  }

  function renderCausal(check) {
    if (!check) return '';
    var qs = (check.questions || []).map(function (q) {
      return '<div class="decide-causal-q"><strong>' + esc(q.text) + '</strong>' +
        '<div class="decide-muted">System: ' + esc(q.answer) + (q.systemHint ? ' — ' + esc(q.systemHint) : '') + '</div></div>';
    }).join('');
    return (
      '<div class="decide-card' + (check.risk ? ' decide-card-risk' : '') + '">' +
        '<div class="decide-card-kicker">Causal chain · U-7 / T-656</div>' +
        '<div class="decide-card-title">' + esc(check.label) + '</div>' +
        '<div class="decide-muted" style="margin-bottom:8px">' + esc(check.authority || '') + '</div>' +
        qs +
        '<div class="decide-override-row">' +
          '<label>Override </label>' +
          '<select id="decide-causal-override" onchange="DefendAbleDecideWorkspace.onCausalOverride(this.value)">' +
            '<option value="">Keep system assessment</option>' +
            '<option value="accept_chain">Lawyer accepts chain holds</option>' +
            '<option value="break_chain">Confirm chain broken — concede intervening cause</option>' +
          '</select>' +
        '</div>' +
        '<textarea id="decide-causal-note" rows="2" placeholder="Note on post-EC decision (required vs discretionary)…" onchange="DefendAbleDecideWorkspace.onCausalNote(this.value)"></textarea>' +
      '</div>'
    );
  }

  function renderAuthorities(list) {
    if (!list || !list.length) return '<div class="decide-muted">No authorities attached yet.</div>';
    return '<ul class="decide-auth-list">' + list.map(function (a) {
      var cls = a.weight === 'binding' ? 'auth-binding' : 'auth-persuasive';
      return '<li class="' + cls + '"><strong>' + esc(a.citation) + '</strong> — ' +
        esc(a.weight.toUpperCase()) + ' <span class="decide-muted">(' + esc(a.note || a.regime) + ')</span></li>';
    }).join('') + '</ul>';
  }

  function renderPosition(pos) {
    if (!pos) return '';
    var hold = pos.conditionType === 'EVIDENCE_HOLD'
      ? '<div class="decide-hold-badge">EVIDENCE HOLD — holding letter path</div>' : '';
    return (
      '<div class="decide-position band-' + esc(pos.band || '') + '">' +
        '<div class="decide-card-kicker">Framework verdict</div>' +
        '<div class="decide-verdict">' + esc(pos.frameworkLabel || pos.verdict) + '</div>' +
        hold +
        '<div class="decide-card-title">' + esc(pos.title || '') + '</div>' +
        '<div class="decide-muted">' + esc(pos.text || '') + '</div>' +
        ((pos.conditions && pos.conditions.length)
          ? '<ul class="decide-gaps">' + pos.conditions.map(function (c) { return '<li>' + esc(c) + '</li>'; }).join('') + '</ul>'
          : '') +
      '</div>'
    );
  }

  function render(mountEl, state) {
    if (!mountEl) return;
    state = state || {};
    var record = state.record || {};
    var run = state.run || {};
    var trees = run.treeResults || record.treeResults || [];
    var priority = run.typePriority;
    var g1 = record.g1;

    var treeHtml = trees.map(function (t, i) {
      var role = (priority && t.treeId === priority.primaryTree) ? 'Primary' :
        (i === 0 ? 'Primary' : 'Secondary');
      return (
        '<div class="decide-tree">' +
          '<div class="decide-tree-hdr"><span class="decide-tree-id">' + esc(t.treeId) + '</span> ' +
          esc(t.disruptionType || '') + ' <span class="decide-muted">· ' + role + '</span>' +
          (t.exit ? ' <span class="decide-ans ' + gateAnswerClass(t.exit.verdict === 'DEFEND' ? 'yes' : 'no') + '">' + esc(t.exit.verdict) + '</span>' : '') +
          '</div>' +
          renderGates(t) +
        '</div>'
      );
    }).join('') || '<div class="decide-muted">No applicable trees matched the locked record.</div>';

    mountEl.innerHTML =
      '<div class="decide-workspace" id="decide-workspace">' +
        '<div class="decide-hero">' +
          '<div class="decide-card-kicker">Part 2 · Decide</div>' +
          '<div class="decide-hero-title">Legal decision path</div>' +
          '<div class="decide-muted">Locked LOF → type map → DT gates → U-7 causal chain → position → G1. ' +
            '<a href="defendable_legal_tree.html" target="_blank">Open full framework map ↗</a></div>' +
        '</div>' +
        (priority ? '<div class="decide-card"><div class="decide-card-kicker">Type map priority</div>' +
          '<div><strong>Primary ' + esc(priority.primaryTree || '—') + '</strong>' +
          (priority.secondaryTrees && priority.secondaryTrees.length
            ? ' · Secondary ' + esc(priority.secondaryTrees.join(', ')) : '') +
          '</div><div class="decide-muted">' + esc(priority.rationale || '') + '</div></div>' : '') +
        renderPosition(run.position || run.preRating) +
        renderCausal(run.causalCheck) +
        '<div class="decide-card"><div class="decide-card-kicker">Disruption trees</div>' + treeHtml + '</div>' +
        '<div class="decide-card"><div class="decide-card-kicker">Authorities · ' + esc(record.jurisdiction || '') + '</div>' +
          renderAuthorities(run.authorities) + '</div>' +
        '<div class="decide-card" id="decide-g1-card">' +
          '<div class="decide-card-kicker">G1 · Lawyer sign-off</div>' +
          '<div class="decide-muted" style="margin-bottom:8px">Confirming does not unlock LOF facts. Send-back for evidence attaches a request — G0 stays frozen.</div>' +
          (g1
            ? '<div class="decide-g1-done">Signed: ' + esc(g1.action) + ' · ' + esc(g1.at) +
              (g1.by ? ' · ' + esc(g1.by) : '') + '</div>'
            : '<div class="decide-g1-actions">' +
                '<button type="button" class="decide-btn decide-btn-primary" onclick="DefendAbleDecideWorkspace.signOff(\'approve\')">Approve position</button>' +
                '<button type="button" class="decide-btn" onclick="DefendAbleDecideWorkspace.signOff(\'override\')">Override &amp; approve</button>' +
                '<button type="button" class="decide-btn decide-btn-warn" onclick="DefendAbleDecideWorkspace.signOff(\'send_back_evidence\')">Send back for evidence</button>' +
              '</div>' +
              '<input id="decide-g1-by" type="text" placeholder="Lawyer initials / name" style="margin-top:8px;width:100%" />' +
              '<textarea id="decide-g1-note" rows="2" placeholder="Sign-off note / evidence request…" style="margin-top:6px;width:100%"></textarea>') +
          '<div style="margin-top:12px">' +
            '<button type="button" class="decide-btn decide-btn-primary" id="decide-send-manage" onclick="DefendAbleDecideWorkspace.sendToManage()" ' +
              (g1 ? '' : 'disabled') + '>Send to Manage →</button>' +
            '<span class="decide-muted" style="margin-left:8px" id="decide-send-status"></span>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  // Callbacks wired from analyser
  var _hooks = {
    getState: null,
    setGateOverride: null,
    setCausalOverride: null,
    setCausalNote: null,
    onSignOff: null,
    onSendToManage: null,
    remount: null
  };

  function configure(hooks) {
    _hooks = Object.assign(_hooks, hooks || {});
  }

  function onGateOverride(treeId, gateId, value) {
    if (_hooks.setGateOverride) _hooks.setGateOverride(treeId, gateId, value);
  }
  function onGateNote(treeId, gateId, value) {
    if (_hooks.setGateOverride) _hooks.setGateOverride(treeId, gateId, null, value);
  }
  function onCausalOverride(value) {
    if (_hooks.setCausalOverride) _hooks.setCausalOverride(value);
  }
  function onCausalNote(value) {
    if (_hooks.setCausalNote) _hooks.setCausalNote(value);
  }
  function signOff(action) {
    var by = (document.getElementById('decide-g1-by') || {}).value || '';
    var note = (document.getElementById('decide-g1-note') || {}).value || '';
    if (_hooks.onSignOff) _hooks.onSignOff(action, by, note);
  }
  function sendToManage() {
    if (_hooks.onSendToManage) _hooks.onSendToManage();
  }

  return {
    render: render,
    configure: configure,
    onGateOverride: onGateOverride,
    onGateNote: onGateNote,
    onCausalOverride: onCausalOverride,
    onCausalNote: onCausalNote,
    signOff: signOff,
    sendToManage: sendToManage
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DefendAbleDecideWorkspace;
}
