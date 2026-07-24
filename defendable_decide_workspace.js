/* DefendAble — Decide workspace UI (v2 legal spine on v3 LOF foundation) */
var DefendAbleDecideWorkspace = (function () {

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function gateAnswerClass(answer) {
    if (answer === 'yes' || answer === 'DEFEND') return 'decide-ans-yes';
    if (answer === 'no' || answer === 'CONCEDE' || answer === 'SETTLE') return 'decide-ans-no';
    return 'decide-ans-na';
  }

  function plainVerdict(pos) {
    var v = (pos && (pos.verdict || pos.frameworkLabel)) || '';
    var map = {
      DEFEND: { title: 'Defend', sub: 'Extraordinary circumstances established — confirm evidence pack before Letter of Response.' },
      DEFEND_WITH_CONDITIONS: { title: 'Defend — subject to evidence', sub: 'Strong provisional position. Conditions below must be satisfied before final response.' },
      JUDGMENT_REQUIRED: { title: 'Hold — judgment outstanding', sub: 'Legal fork unresolved. Do not finalise position until judgment nodes are cleared.' },
      CONCEDE: { title: 'No EC defence', sub: 'Extraordinary circumstances not available. Assess quantum and Art 8/9 obligations only.' },
      SETTLE: { title: 'Settle recommended', sub: 'Chain or evidence does not support a full defence.' },
      INVESTIGATE: { title: 'Investigate further', sub: 'Insufficient certainty — complete evidence pack before triage decision.' },
      ESCALATE: { title: 'Escalate for review', sub: 'Complex or high-risk matter — senior solicitor review required.' }
    };
    if (map[v]) return map[v];
    if (pos && pos.title) return { title: pos.title, sub: pos.text || '' };
    return { title: String(v || 'Position pending').replace(/_/g, ' '), sub: (pos && pos.text) || '' };
  }

  function bandClass(pos) {
    var v = (pos && pos.verdict) || '';
    if (v === 'DEFEND') return 'defendable';
    if (v === 'DEFEND_WITH_CONDITIONS' || v === 'JUDGMENT_REQUIRED' || v === 'ESCALATE') return 'borderline';
    return 'investigate';
  }

  /**
   * Build E1…En thinking trail steps from locked causal chain + tree exits.
   */
  function buildThinkingTrail(record, run) {
    var rawChain = (record && record.causalChain) || (run && run.causalChain) || [];
    // Prefer legal/causal events for trail; fall back to full chain
    var chain = rawChain.filter(function (ev) { return ev && ev.type !== 'sector'; });
    if (!chain.length) chain = rawChain;
    var trees = (run && run.treeResults) || [];
    var primary = trees[0] || null;
    var primaryId = (run && run.typePriority && run.typePriority.primaryTree) ||
      (primary && primary.treeId) || null;
    var structure = chain.length >= 4 ? 'COMPLEX' :
      (chain.length >= 2 ? 'SEQUENTIAL' : 'SINGLE');
    var steps = [];

    steps.push({
      id: 'ICC',
      kind: 'input',
      label: 'Disruption summary received',
      description: ((record && (record.lockedNarrative || record.rawText)) || '').slice(0, 220),
      tags: [{ cls: 'unk', text: structure + ' chain · ' + chain.length + ' event' + (chain.length !== 1 ? 's' : '') }]
    });

    chain.forEach(function (ev, idx) {
      var eid = 'E' + (idx + 1);
      var desc = (ev.description || ev.label || '').trim();
      var own = /own staff|crew illness|technical|fuel|turnround|voluntar|commercial|discretion/i.test(desc + ' ' + (ev.label || ''));
      var third = !own || /atfm|ctot|eurocontrol|weather|metar|atc|strike|security|birdstrike/i.test(desc + ' ' + (ev.label || ''));
      var tags = [];
      tags.push({ cls: third && !ev.chainBreak ? 'lof-third' : 'lof-own', text: third && !own ? 'THIRD PARTY' : (own ? 'OWN OPERATION' : 'MIXED') });
      if (ev.chainBreak) {
        tags.push({ cls: 'ec-n', text: 'CHAIN BREAK' });
        tags.push({ cls: 'ec-st', text: 'FAILED link' });
      } else if (/atfm|ctot|weather|metar|birdstrike|security|eurocontrol/i.test(desc + ' ' + (ev.label || ''))) {
        tags.push({ cls: 'ec-y', text: 'EC candidate' });
        tags.push({ cls: 'ec-st', text: idx === 0 ? 'ESTABLISHED root' : 'CANDIDATE' });
      } else {
        tags.push({ cls: 'ec-n', text: 'Not EC root' });
      }
      if (primaryId) tags.push({ cls: 'dt', text: primaryId });
      steps.push({
        id: eid,
        kind: ev.chainBreak ? 'brk' : 'ev',
        label: ev.label || eid,
        description: desc || ev.label,
        tags: tags,
        treeId: primaryId
      });
    });

    var pos = (run && (run.position || run.preRating)) || {};
    var pv = plainVerdict(pos);
    steps.push({
      id: 'OUT',
      kind: 'verdict',
      label: pv.title,
      description: pv.sub,
      tags: [{ cls: 'ec-st', text: pos.frameworkLabel || pos.verdict || 'POSITION' }]
    });

    return { structure: structure, steps: steps, eventCount: chain.length };
  }

  /**
   * CRIT / IMPO / SUPP action list from tree gaps + conditions + timeline chips.
   */
  function buildCritActionList(record, run) {
    var actions = [];
    var seen = {};
    function add(item) {
      var key = (item.text || '') + '|' + (item.system || '');
      if (seen[key]) return;
      seen[key] = true;
      actions.push(item);
    }

    var pos = (run && (run.position || run.preRating)) || {};
    (pos.conditions || []).forEach(function (c) {
      add({
        priority: pos.conditionType === 'EVIDENCE_HOLD' ? 'critical' : 'critical',
        type: 'condition',
        text: c,
        system: 'Verdict condition',
        badge: 'CRIT'
      });
    });

    ((run && run.treeResults) || []).forEach(function (tr) {
      (tr.gates || []).forEach(function (g) {
        (g.gaps || []).forEach(function (gap) {
          var name = gap.name || gap.libKey || 'Evidence';
          var lib = String(gap.libKey || '').toLowerCase();
          var crit = /eurocontrol|ctot|atfm|metar|amos|tops|notam/.test(lib) ||
            /eurocontrol|ctot|atfm|metar/i.test(name);
          add({
            priority: crit ? 'critical' : 'important',
            type: 'evidence',
            text: name + (gap.status ? ' — status: ' + gap.status : ''),
            system: gap.libKey || tr.treeId || '',
            badge: crit ? 'CRIT' : 'IMPO',
            ref: g.gateId || tr.treeId
          });
        });
      });
    });

    Object.keys((record && record.tlEvStatus) || {}).forEach(function (key) {
      var st = record.tlEvStatus[key];
      if (st !== 'missing' && st !== 'requested') return;
      var parts = key.split('_');
      var evId = parts.slice(1).join('_') || key;
      add({
        priority: st === 'missing' ? 'critical' : 'important',
        type: 'timeline',
        text: evId.replace(/-/g, ' ') + ' (' + st + ' on story timeline)',
        system: 'Timeline chip',
        badge: st === 'missing' ? 'CRIT' : 'IMPO'
      });
    });

    if (!actions.length && pos.conditionType === 'EVIDENCE_HOLD') {
      add({
        priority: 'critical',
        type: 'condition',
        text: 'Collect outstanding proof then reconfirm defend (EVIDENCE_HOLD).',
        system: 'Hold path',
        badge: 'CRIT'
      });
    }

    var order = { critical: 0, important: 1, supporting: 2 };
    actions.sort(function (a, b) { return (order[a.priority] || 2) - (order[b.priority] || 2); });
    return actions;
  }

  function renderBriefBar(pos, meta) {
    var pv = plainVerdict(pos);
    var band = bandClass(pos);
    var chips = [];
    if (meta.treeId) chips.push(meta.treeId);
    if (meta.structure) chips.push(meta.structure + ' chain');
    if (meta.jurisdiction) chips.push(meta.jurisdiction);
    if (meta.eventCount != null) chips.push(meta.eventCount + ' events');
    if (pos && pos.conditionType === 'EVIDENCE_HOLD') chips.push('EVIDENCE HOLD');
    return (
      '<div class="decide-brief band-' + esc(band) + '" id="decide-brief-bar">' +
        '<div class="decide-brief-tag">Provisional position</div>' +
        '<div class="decide-brief-title">' + esc(pv.title) + '</div>' +
        '<div class="decide-brief-sub">' + esc(pv.sub || (pos && pos.text) || '') + '</div>' +
        (chips.length ? '<div class="decide-brief-chips">' + chips.map(function (c) {
          return '<span class="decide-chip">' + esc(c) + '</span>';
        }).join('') + '</div>' : '') +
      '</div>'
    );
  }

  function renderThinkingTrail(trail) {
    if (!trail || !trail.steps || !trail.steps.length) return '';
    var stepsHtml = trail.steps.map(function (s) {
      var tags = (s.tags || []).map(function (t) {
        return '<span class="decide-trail-tag ' + esc(t.cls) + '">' + esc(t.text) + '</span>';
      }).join('');
      var dot = s.id === 'ICC' ? 'ICC' : (s.id === 'OUT' ? '→' : String(s.id).replace(/^E/, ''));
      return (
        '<div class="decide-trail-step ' + esc(s.kind || 'ev') + '">' +
          '<div class="decide-trail-dot">' + esc(dot) + '</div>' +
          '<div class="decide-trail-card">' +
            '<div class="decide-trail-id">' + esc(s.id) + (s.label && s.id !== 'OUT' && s.id !== 'ICC' ? ' · ' + esc(s.label) : '') + '</div>' +
            '<div class="decide-trail-desc">' + esc(s.description || s.label || '') + '</div>' +
            (tags ? '<div class="decide-trail-meta">' + tags + '</div>' : '') +
          '</div>' +
        '</div>'
      );
    }).join('');
    return (
      '<div class="decide-card decide-trail-wrap">' +
        '<div class="decide-card-kicker">Thinking trail</div>' +
        '<div class="decide-card-title">How DefendAble moved through the chain</div>' +
        '<div class="decide-muted" style="margin-bottom:10px">' +
          esc(trail.structure) + ' chain · ' + esc(String(trail.eventCount)) + ' events · DT refs on each EC candidate' +
        '</div>' +
        '<div class="decide-trail-steps">' + stepsHtml + '</div>' +
      '</div>'
    );
  }

  function renderConditions(pos) {
    var list = (pos && pos.conditions) || [];
    if (!list.length && !(pos && pos.conditionType === 'EVIDENCE_HOLD')) return '';
    var title = pos.conditionType === 'EVIDENCE_HOLD'
      ? 'Conditions before final response — evidence hold'
      : 'Conditions before final response';
    var items = list.length ? list : ['Collect outstanding critical evidence, then reconfirm defend.'];
    return (
      '<div class="decide-card decide-conditions-card">' +
        '<div class="decide-card-kicker">' + esc(title) + '</div>' +
        '<div class="decide-muted" style="margin-bottom:8px">Must be confirmed before the position firms. Maps to holding letter when EVIDENCE_HOLD.</div>' +
        '<ol class="decide-conditions-list">' +
          items.map(function (c) { return '<li>' + esc(c) + '</li>'; }).join('') +
        '</ol>' +
      '</div>'
    );
  }

  function renderCritActions(actions) {
    if (!actions || !actions.length) return '';
    return (
      '<div class="decide-card">' +
        '<div class="decide-card-kicker">Evidence priorities</div>' +
        '<div class="decide-card-title">Evidence priorities</div>' +
        '<div class="decide-muted" style="margin-bottom:8px">Critical items block a clean DEFEND. Important items strengthen Limb 2 / RM.</div>' +
        '<div class="decide-actions">' +
          actions.map(function (a) {
            var pri = a.priority || 'important';
            var badge = a.badge === 'CRIT' ? 'Critical' : a.badge === 'IMPO' ? 'Important' : a.badge === 'SUPP' ? 'Supporting' : (pri === 'critical' ? 'Critical' : (pri === 'supporting' ? 'Supporting' : 'Important'));
            return (
              '<div class="decide-action-row">' +
                '<span class="decide-pri ' + esc(pri) + '">' + esc(badge) + '</span>' +
                '<div class="decide-action-body">' +
                  '<div class="decide-action-text">' + esc(a.text) + '</div>' +
                  (a.system ? '<div class="decide-muted">' + esc(a.system) + (a.ref ? ' · ' + esc(a.ref) : '') + '</div>' : '') +
                '</div>' +
              '</div>'
            );
          }).join('') +
        '</div>' +
      '</div>'
    );
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

  function render(mountEl, state) {
    if (!mountEl) return;
    state = state || {};
    var record = state.record || {};
    var run = state.run || {};
    var trees = run.treeResults || record.treeResults || [];
    var priority = run.typePriority;
    var g1 = record.g1;
    var pos = run.position || run.preRating || {};
    var trail = buildThinkingTrail(record, run);
    var actions = buildCritActionList(record, run);

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
        renderBriefBar(pos, {
          treeId: (priority && priority.primaryTree) || (trees[0] && trees[0].treeId),
          structure: trail.structure,
          jurisdiction: record.jurisdiction,
          eventCount: trail.eventCount
        }) +
        renderThinkingTrail(trail) +
        renderConditions(pos) +
        renderCritActions(actions) +
        (priority ? '<div class="decide-card"><div class="decide-card-kicker">Type map priority</div>' +
          '<div><strong>Primary ' + esc(priority.primaryTree || '—') + '</strong>' +
          (priority.secondaryTrees && priority.secondaryTrees.length
            ? ' · Secondary ' + esc(priority.secondaryTrees.join(', ')) : '') +
          '</div><div class="decide-muted">' + esc(priority.rationale || '') + '</div></div>' : '') +
        renderCausal(run.causalCheck) +
        '<div class="decide-card"><div class="decide-card-kicker">Disruption tree gates</div>' +
          '<div class="decide-muted" style="margin-bottom:8px">Gate-by-gate walk — override without rewriting the LOF.</div>' +
          treeHtml + '</div>' +
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
              (g1 ? '' : 'disabled') + '>Review handoff → Manage</button>' +
            '<span class="decide-muted" style="margin-left:8px" id="decide-send-status"></span>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

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
    buildThinkingTrail: buildThinkingTrail,
    buildCritActionList: buildCritActionList,
    plainVerdict: plainVerdict,
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
