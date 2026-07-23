/**
 * DefendAble — Legal Review modal.
 * Full-screen focus surface opened by the lawyer after Confirm LOF.
 * Verdict · rationale · quantum · evidence held/missing · authorities
 * · reasoning drawer (tree gates + causal chain) · action bar (G1 → Manage).
 *
 * SEED-AUTHORITATIVE. All fields derive from the confirmed record + data-bank
 * seed. No re-parsing. Deterministic per case.
 */
var DefendAbleLegalReview = (function () {
  'use strict';

  function esc(s) { return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  var VERDICT_STYLE = {
    DEFEND:                { cls: 'lrv-defend',     word: 'DEFEND' },
    DEFEND_WITH_CONDITIONS:{ cls: 'lrv-defend-c',   word: 'DEFEND WITH CONDITIONS' },
    DEFEND_HOLD:           { cls: 'lrv-defend-h',   word: 'DEFEND HOLD' },
    SETTLE:                { cls: 'lrv-settle',     word: 'SETTLE' },
    JUDGMENT_REQUIRED:     { cls: 'lrv-judgment',   word: 'JUDGMENT REQUIRED' }
  };

  /* ── One-line data-driven rationale, generated from confirmed facts + tree exit ── */
  function buildRationale(state) {
    var f = state.facts || {};
    var mass = f.mass ? (' (mass ' + f.mass.code + (f.mass.note ? ' — ' + f.mass.note : '') + ')') : '';
    var rootReason = (f.rootCause && f.rootCause.reason) || (f.disruption && f.disruption.dtype) || '';
    var juris = state.jurisdiction || 'UK261';
    var art53 = 'Art 5(3) ' + juris;
    var conditions = state.conditions || [];
    var v = state.verdictKey;

    if (v === 'DEFEND' || v === 'DEFEND_WITH_CONDITIONS' || v === 'DEFEND_HOLD') {
      var head = rootReason
        ? rootReason + mass + ' — extraordinary circumstance under ' + art53
        : 'Extraordinary circumstance under ' + art53;
      if (v === 'DEFEND') return head + '. All measures deployed.';
      var cleanConds = (conditions || []).map(function(c){
        return String(c).replace(/^(EVIDENCE_HOLD|DEFEND_HOLD|SETTLE|DEFEND|JUDGMENT_REQUIRED)\s*[:\-—]\s*/i, '')
                       .replace(/^Collect key evidence:\s*/i, '')
                       .replace(/\s+—\s+proof pending$/i, '')
                       .replace(/\s+—\s+Flight Details & Legislation$/i, '')
                       .trim();
      }).filter(function(c){ return c && c.length > 3; }).slice(0, 3);
      if (cleanConds.length) return head + ' — subject to: ' + cleanConds.join(' · ') + '.';
      return head + '.';
    }
    if (v === 'SETTLE') {
      var q = state.quantum;
      var money = q && q.total ? ' — exposure ' + q.total : '';
      return 'Not defensible on the confirmed facts' + money + '. Recommend early resolution.';
    }
    if (v === 'JUDGMENT_REQUIRED') return 'Facts and law give conflicting signals — see reasoning.';
    return rootReason || 'Verdict pending.';
  }

  /* ── Quantum from seed (band × pax) ── */
  function buildQuantum(state) {
    var f = state.facts || {};
    var claimed = f.claimed || null;
    // seed rotation carries band+pax on the claimed sector via facts
    var band = (f.__seedBand != null) ? f.__seedBand : (state.band || null);
    var pax = f.paxCount || (state.pax != null ? state.pax : null);
    var juris = state.jurisdiction || 'UK261';
    var isUK = /UK/i.test(juris);
    var sym = isUK ? '£' : '€';
    if (f.delayMins != null && f.delayMins < 180 && !f.isCancelled && !f.isDiverted) {
      return { headline: 'Not compensable — arrival delay ' + f.delayMins + ' mins is below the 3h Sturgeon threshold.', total: null };
    }
    if (!band || !pax) return { headline: 'Quantum not available for this case.', total: null };
    // UK261 GBP-equivalent bands: 220 / 350 / 520
    var perPax = isUK ? (band === 250 ? 220 : band === 400 ? 350 : 520) : band;
    var total = perPax * pax;
    return {
      headline: sym + perPax + ' per pax × ' + pax + ' = ' + sym + total.toLocaleString('en-GB'),
      total: sym + total.toLocaleString('en-GB')
    };
  }

  /* ── Evidence pack: held vs missing (two-column) ────────────────────
       Sources:
       1. seed.disruption.evidence (data-bank string) — split on ';' or '·'
       2. LOF row notes (implicit rotation records)
       3. tree gate gaps (what the trees said was outstanding)
       Held = item mentioned in narrative OR seeded as held.
       Missing = anything else. No requested state (DIO handles that in Manage). */
  function buildEvidence(state) {
    var f = state.facts || {};
    var text = (state.narrative || '') + ' ' + (f.disruption && f.disruption.evidence || '');
    var lower = text.toLowerCase();

    var held = [], missing = [];
    var seen = {};

    function add(list, item) {
      var key = item.toLowerCase().trim();
      if (seen[key]) return;
      seen[key] = true;
      list.push(item.trim());
    }

    var evStr = (f.disruption && f.disruption.evidence) || '';
    if (evStr) {
      evStr.split(/;|·/).forEach(function (raw) {
        var it = raw.replace(/^\s*Evidence held:\s*/i, '').trim().replace(/\.$/, '');
        if (!it || /^ops records\s*;?\s*rotation history/i.test(it) === false && it.length > 2) {
          // classify: item is "held" if any keyword lands in the narrative
          var keyword = it.split(/\s+/)[0].toLowerCase();
          if (keyword && lower.indexOf(keyword) >= 0) add(held, it);
          else add(held, it); // data bank confirmed as held
        }
      });
    }

    // tree gate gaps → missing
    (state.gapItems || []).forEach(function (g) { add(missing, g); });

    // Rotation / LOF always held once G0 signed
    if (state.rotationConfirmed) add(held, 'Line of Flying records (' + (state.rotationCount || 0) + ' sectors)');

    // Ensure at least the essentials appear
    if (!held.length && !missing.length) {
      missing.push('Operational evidence pack');
    }
    return { held: held.slice(0, 8), missing: missing.slice(0, 8) };
  }

  /* ── Authorities — 3 to 5, engaged by this tree exit ── */
  function buildAuthorities(state) {
    var list = state.authorities || [];
    var out = [];
    list.forEach(function (a) {
      var name = a.citation || a.ref || a.name || String(a);
      var weight = String(a.weight || '').toLowerCase();
      var isBinding = weight === 'binding' || /binding/i.test(name);
      out.push({ name: name.replace(/\s+—.*$/, ''), binding: isBinding, ratio: a.note || a.ratio || '' });
    });
    out.sort(function (a, b) { return (b.binding ? 1 : 0) - (a.binding ? 1 : 0); });
    return out.slice(0, 5);
  }

  /* ── Story headline drawn from the seed ── */
  function buildStoryHeadline(state) {
    var f = state.facts || {};
    if (!f.flightNum) return '';
    var route = (f.depIata && f.arrIata) ? (f.depIata + '–' + f.arrIata) : '';
    var date = f.date || '';
    var body =
      f.isCancelled ? 'cancelled' :
      f.isDiverted  ? ('diverted to ' + (f.divertedTo || 'alternate')) :
      (f.delayMins != null && f.delayMins > 0) ? ('arrival delay ' + f.delayMins + ' mins') :
      'operated';
    var rootSuffix = (f.rootCause && f.rootCause.fno && f.rootCause.fno !== f.flightNum)
      ? ' (root sector ' + f.rootCause.fno + ')' : '';
    return f.flightNum + (route ? ' ' + route : '') + (date ? ' ' + date : '') + ' — ' + body + rootSuffix;
  }

  /* ── STYLES: injected once ── */
  function injectStyles() {
    if (document.getElementById('lrv-style')) return;
    var st = document.createElement('style');
    st.id = 'lrv-style';
    st.textContent = [
      '.lrv-open-btn{margin-top:14px;background:var(--navy,#1A2F45);color:#fff;font-family:var(--mono,monospace);font-size:11px;letter-spacing:.08em;text-transform:uppercase;padding:12px 22px;border:0;border-radius:5px;cursor:pointer;box-shadow:0 2px 6px rgba(26,47,69,.18)}',
      '.lrv-open-btn:hover{background:var(--navy-mid,#2A4A6B)}',
      '.lrv-backdrop{position:fixed;inset:0;background:rgba(20,25,35,.55);backdrop-filter:blur(6px);z-index:2000;display:flex;justify-content:center;align-items:flex-start;padding:44px 24px;overflow-y:auto;animation:lrv-fade .18s ease}',
      '@keyframes lrv-fade{from{opacity:0}to{opacity:1}}',
      '.lrv-panel{background:var(--surface,#F8F5EF);border-radius:10px;box-shadow:0 24px 48px rgba(0,0,0,.28);max-width:1120px;width:100%;padding:0;font-family:var(--sans,sans-serif);color:var(--ink,#16181D);overflow:hidden;animation:lrv-rise .25s ease}',
      '@keyframes lrv-rise{from{transform:translateY(14px);opacity:0}to{transform:translateY(0);opacity:1}}',
      '.lrv-close{position:absolute;top:20px;right:32px;background:transparent;border:0;color:#fff;font-family:var(--mono,monospace);font-size:10px;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;opacity:.7}',
      '.lrv-close:hover{opacity:1}',
      /* header */
      '.lrv-hdr{background:var(--navy,#1A2F45);color:#fff;padding:20px 32px 22px}',
      '.lrv-hdr .kicker{font-family:var(--mono,monospace);font-size:9.5px;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.55)}',
      '.lrv-hdr .story{font-family:var(--serif,Georgia,serif);font-size:15px;margin-top:2px;color:#fff}',
      '.lrv-hdr .caseref{font-family:var(--mono,monospace);font-size:10px;color:rgba(255,255,255,.55);margin-top:3px;letter-spacing:.05em}',
      /* verdict band */
      '.lrv-verdict{padding:32px 34px 24px;border-bottom:1px solid var(--rule,#C9C2B6)}',
      '.lrv-verdict-word{font-family:var(--serif,Georgia,serif);font-size:34px;line-height:1.05;letter-spacing:-0.005em}',
      '.lrv-verdict.lrv-defend .lrv-verdict-word{color:var(--ec,#1B5C3A)}',
      '.lrv-verdict.lrv-defend-c .lrv-verdict-word{color:#2F6B4F}',
      '.lrv-verdict.lrv-defend-h .lrv-verdict-word{color:var(--judgment,#8A6B00)}',
      '.lrv-verdict.lrv-settle .lrv-verdict-word{color:var(--settle,#7A1A1A)}',
      '.lrv-verdict.lrv-judgment .lrv-verdict-word{color:var(--ink-3,#6B7280)}',
      '.lrv-rationale{font-family:var(--sans,sans-serif);font-size:14px;margin-top:10px;color:var(--ink-2,#3A3F4A);line-height:1.55;max-width:820px}',
      '.lrv-quantum{margin-top:16px;font-family:var(--mono,monospace);font-size:12px;letter-spacing:.02em;color:var(--ink,#16181D);border-top:1px solid var(--rule-soft,#DDD6CA);padding-top:12px;display:flex;gap:12px;align-items:baseline}',
      '.lrv-quantum b{font-family:var(--serif,Georgia,serif);font-size:20px;font-weight:400;color:var(--ink,#16181D)}',
      '.lrv-quantum .qkicker{font-family:var(--mono,monospace);font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-3,#6B7280)}',
      /* evidence */
      '.lrv-body{padding:22px 34px 26px}',
      '.lrv-section-kicker{font-family:var(--mono,monospace);font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-3,#6B7280);margin-bottom:10px}',
      '.lrv-evgrid{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:24px}',
      '.lrv-evcol h4{font-family:var(--serif,Georgia,serif);font-size:14px;margin:0 0 8px;font-weight:400}',
      '.lrv-evcol.held h4{color:var(--ec,#1B5C3A)}',
      '.lrv-evcol.missing h4{color:var(--settle,#7A1A1A)}',
      '.lrv-evcol ul{list-style:none;padding:0;margin:0}',
      '.lrv-evcol li{font-size:12px;padding:6px 10px 6px 22px;border-radius:3px;position:relative;margin-bottom:3px;color:var(--ink-2,#3A3F4A);background:var(--surface-2,#FFFCF7);border:1px solid var(--rule-soft,#DDD6CA)}',
      '.lrv-evcol.held li::before{content:"✓";position:absolute;left:7px;top:5px;color:var(--ec,#1B5C3A);font-weight:700;font-size:11px}',
      '.lrv-evcol.missing li::before{content:"○";position:absolute;left:7px;top:5px;color:var(--settle,#7A1A1A);font-size:12px}',
      '.lrv-evcol .empty{font-family:var(--mono,monospace);font-size:10px;color:var(--ink-3,#6B7280);font-style:italic;padding:6px 10px}',
      /* authorities */
      '.lrv-auths{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:24px}',
      '.lrv-auth{font-family:var(--mono,monospace);font-size:10.5px;padding:5px 11px;border-radius:3px;letter-spacing:.02em;cursor:default;position:relative;background:var(--surface-2,#FFFCF7);border:1px solid var(--rule,#C9C2B6);color:var(--ink-2,#3A3F4A)}',
      '.lrv-auth.binding{background:var(--claim-bg,#E8F0FA);border-color:var(--claim-border,#8BB0D9);color:var(--claim,#1E4D8C)}',
      '.lrv-auth .weight{font-size:8.5px;opacity:.7;margin-right:6px;letter-spacing:.1em}',
      '.lrv-auth[data-ratio]:hover::after{content:attr(data-ratio);position:absolute;bottom:calc(100% + 6px);left:0;background:var(--ink,#16181D);color:#fff;padding:8px 10px;border-radius:4px;font-size:10px;line-height:1.4;font-family:var(--sans,sans-serif);white-space:normal;width:260px;z-index:5;box-shadow:0 4px 10px rgba(0,0,0,.2)}',
      /* reasoning drawer */
      '.lrv-drawer{border-top:1px dashed var(--rule,#C9C2B6);padding-top:14px;margin-top:8px}',
      '.lrv-drawer summary{cursor:pointer;font-family:var(--mono,monospace);font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-3,#6B7280);list-style:none;padding:4px 0}',
      '.lrv-drawer summary::-webkit-details-marker{display:none}',
      '.lrv-drawer summary::before{content:"▸";margin-right:8px;transition:transform .15s}',
      '.lrv-drawer[open] summary::before{transform:rotate(90deg);display:inline-block}',
      '.lrv-drawer-body{padding:12px 4px 4px;font-size:12px;color:var(--ink-2,#3A3F4A)}',
      '.lrv-trail-step{padding:6px 0;border-bottom:1px dashed var(--rule-soft,#DDD6CA)}',
      '.lrv-trail-step:last-child{border-bottom:0}',
      '.lrv-trail-step b{font-family:var(--mono,monospace);font-size:10px;letter-spacing:.05em}',
      /* action bar */
      '.lrv-actions{background:var(--surface-2,#FFFCF7);border-top:1px solid var(--rule,#C9C2B6);padding:20px 34px;display:flex;gap:12px;align-items:center;flex-wrap:wrap}',
      '.lrv-action{font-family:var(--mono,monospace);font-size:11px;letter-spacing:.08em;text-transform:uppercase;padding:12px 20px;border-radius:5px;cursor:pointer;border:1px solid transparent}',
      '.lrv-action.approve{background:var(--ec,#1B5C3A);color:#fff}',
      '.lrv-action.approve:hover{background:#154829}',
      '.lrv-action.override{background:transparent;border-color:var(--judgment,#8A6B00);color:var(--judgment,#8A6B00)}',
      '.lrv-action.override:hover{background:var(--judgment-bg,#FFF6D6)}',
      '.lrv-action.sendback{background:transparent;border-color:var(--settle,#7A1A1A);color:var(--settle,#7A1A1A)}',
      '.lrv-action.sendback:hover{background:#FBECEC}',
      '.lrv-action-note{margin-left:auto;font-family:var(--mono,monospace);font-size:9.5px;letter-spacing:.06em;color:var(--ink-3,#6B7280)}',
      '.lrv-status{padding:12px 34px;font-family:var(--mono,monospace);font-size:10px;letter-spacing:.06em;color:var(--ec,#1B5C3A);background:var(--ec-bg,#E6F3EB);border-top:1px solid var(--ec-border,#8FC9A8);display:none}',
      '.lrv-status.show{display:block}'
    ].join('\n');
    document.head.appendChild(st);
  }

  /* ── open the modal ── */
  function open(state) {
    injectStyles();
    var vk = state.verdictKey || 'JUDGMENT_REQUIRED';
    var vstyle = VERDICT_STYLE[vk] || VERDICT_STYLE.JUDGMENT_REQUIRED;
    var rationale = buildRationale(state);
    var quantum = buildQuantum(state);
    var evidence = buildEvidence(state);
    var authorities = buildAuthorities(state);
    var story = buildStoryHeadline(state);
    var caseRef = state.caseRef || '';

    var authsHtml = authorities.length ? authorities.map(function (a) {
      return '<span class="lrv-auth ' + (a.binding ? 'binding' : '') + '"' +
        (a.ratio ? ' data-ratio="' + esc(a.ratio) + '"' : '') + '>' +
        '<span class="weight">' + (a.binding ? 'BINDING' : 'PERSUASIVE') + '</span>' + esc(a.name) + '</span>';
    }).join('') : '<div style="font-family:var(--mono,monospace);font-size:10px;color:var(--ink-3,#6B7280);font-style:italic">No authorities engaged for this exit.</div>';

    var trail = (state.trail && state.trail.steps) || [];
    var trailHtml = trail.length ? trail.map(function (s) {
      var tags = (s.tags || []).slice(0, 3).map(function (t) { return String(t.label || t).replace(/^\s+|\s+$/g,''); }).join(' · ');
      return '<div class="lrv-trail-step"><b>' + esc(s.ref || s.marker || '•') + '</b> ' + esc(s.title || s.label || '') +
             (s.text ? ' — ' + esc(s.text) : '') + (tags ? ' <span style="color:var(--ink-3,#6B7280);font-size:10px">[' + esc(tags) + ']</span>' : '') + '</div>';
    }).join('') : '<div style="color:var(--ink-3,#6B7280);font-family:var(--mono,monospace);font-size:10.5px">No thinking trail captured.</div>';

    var causalHtml = state.causalCheck ? (
      '<div style="margin-top:14px"><b style="font-family:var(--mono,monospace);font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-3,#6B7280)">Causal chain check (T-656/24)</b>' +
      '<div style="margin-top:6px">' + esc(state.causalCheck.summary || 'Chain assessed — no discretionary break detected.') + '</div></div>'
    ) : '';

    var bd = document.createElement('div');
    bd.className = 'lrv-backdrop';
    bd.innerHTML =
      '<button class="lrv-close" id="lrv-close-btn">Close ×</button>' +
      '<div class="lrv-panel" role="dialog" aria-modal="true">' +
        '<div class="lrv-hdr">' +
          '<div class="kicker">Legal Review</div>' +
          '<div class="story">' + esc(story) + '</div>' +
          (caseRef ? '<div class="caseref">Case ' + esc(caseRef) + '</div>' : '') +
        '</div>' +
        '<div class="lrv-verdict ' + vstyle.cls + '">' +
          '<div class="lrv-verdict-word">' + esc(vstyle.word) + '</div>' +
          '<div class="lrv-rationale">' + esc(rationale) + '</div>' +
          '<div class="lrv-quantum">' +
            '<span class="qkicker">Quantum</span>' +
            (quantum.total ? '<b>' + esc(quantum.total) + '</b><span>' + esc(quantum.headline) + '</span>'
                           : '<span>' + esc(quantum.headline) + '</span>') +
          '</div>' +
        '</div>' +
        '<div class="lrv-body">' +
          '<div class="lrv-section-kicker">Evidence pack — for case management</div>' +
          '<div class="lrv-evgrid">' +
            '<div class="lrv-evcol held"><h4>Held on file</h4><ul>' +
              (evidence.held.length ? evidence.held.map(function(x){return '<li>' + esc(x) + '</li>';}).join('') : '<div class="empty">No evidence recorded as held.</div>') +
            '</ul></div>' +
            '<div class="lrv-evcol missing"><h4>Outstanding — for DIO to obtain</h4><ul>' +
              (evidence.missing.length ? evidence.missing.map(function(x){return '<li>' + esc(x) + '</li>';}).join('') : '<div class="empty">No outstanding items.</div>') +
            '</ul></div>' +
          '</div>' +
          '<div class="lrv-section-kicker">Authorities engaged</div>' +
          '<div class="lrv-auths">' + authsHtml + '</div>' +
          '<details class="lrv-drawer">' +
            '<summary>See the reasoning — thinking trail, tree gates, causal chain check</summary>' +
            '<div class="lrv-drawer-body">' + trailHtml + causalHtml + '</div>' +
          '</details>' +
        '</div>' +
        '<div class="lrv-actions">' +
          '<button class="lrv-action approve" id="lrv-approve">Approve position →</button>' +
          '<button class="lrv-action override" id="lrv-override">Override &amp; approve</button>' +
          '<button class="lrv-action sendback" id="lrv-sendback">Send back for evidence</button>' +
          '<span class="lrv-action-note">Approving files the case into Manage.</span>' +
        '</div>' +
        '<div class="lrv-status" id="lrv-status"></div>' +
      '</div>';

    document.body.appendChild(bd);

    function close() { bd.remove(); }
    bd.querySelector('#lrv-close-btn').onclick = close;
    bd.addEventListener('click', function (e) { if (e.target === bd) close(); });
    document.addEventListener('keydown', function esch(ev) { if (ev.key === 'Escape') { close(); document.removeEventListener('keydown', esch); } });

    function action(kind) {
      var st = bd.querySelector('#lrv-status');
      var by = (window.prompt('Lawyer initials for sign-off:', '') || '').trim();
      if (!by) return;
      // Reuse DecideWorkspace G1 → sendToManage plumbing
      try {
        if (typeof DefendAbleDecideWorkspace !== 'undefined' && DefendAbleDecideWorkspace.signOff) {
          DefendAbleDecideWorkspace.signOff(kind === 'approve' ? 'approve' : kind === 'override' ? 'override' : 'send_back_evidence', { by: by, note: '' });
        }
      } catch (e) {}
      st.classList.add('show');
      st.textContent = 'Signed ' + kind.toUpperCase() + ' by ' + by + '. Filing to Manage…';
      setTimeout(function () {
        try {
          if (typeof DefendAbleDecideWorkspace !== 'undefined' && DefendAbleDecideWorkspace.sendToManage) {
            DefendAbleDecideWorkspace.sendToManage();
          } else if (typeof openCaseHandoffPack === 'function') {
            openCaseHandoffPack();
          }
        } catch (e) { st.textContent = 'File error: ' + (e && e.message || e); }
        close();
      }, 700);
    }
    bd.querySelector('#lrv-approve').onclick = function () { action('approve'); };
    bd.querySelector('#lrv-override').onclick = function () { action('override'); };
    bd.querySelector('#lrv-sendback').onclick = function () { action('sendback'); };
  }

  /* ── STATE BUILDER — derive everything from the confirmed record + seed ──
       This is the single point of truth for what the modal sees. */
  function stateFromContext(ctx) {
    ctx = ctx || {};
    var facts = ctx.facts || {};
    var run = ctx.run || {};
    var record = ctx.record || {};
    var pos = run.position || run.preRating || {};

    // Verdict key — map framework labels onto the five-tier vocabulary
    var v = String(pos.verdict || pos.frameworkLabel || '').toUpperCase();
    var vk = 'JUDGMENT_REQUIRED';
    if (v.indexOf('DEFEND_WITH_CONDITIONS') >= 0 || v === 'DEFEND WITH CONDITIONS' || v.indexOf('CONDITIONS') >= 0) vk = 'DEFEND_WITH_CONDITIONS';
    else if (v.indexOf('DEFEND_HOLD') >= 0 || v.indexOf('HOLD') >= 0) vk = 'DEFEND_HOLD';
    else if (v.indexOf('DEFEND') >= 0) vk = 'DEFEND';
    else if (v.indexOf('SETTLE') >= 0 || v.indexOf('CONCEDE') >= 0) vk = 'SETTLE';

    // Gap items across all trees → missing evidence
    var gapItems = [];
    (run.treeResults || []).forEach(function (t) {
      (t.gates || []).forEach(function (g) {
        (g.gaps || []).forEach(function (gap) {
          var lbl = gap.label || gap.name || gap;
          if (lbl && gapItems.indexOf(lbl) < 0) gapItems.push(String(lbl));
        });
      });
    });

    // Quantum band lifted from seed rotation for the claimed sector
    var seedBand = null;
    try {
      var seed = window.__DEFENDABLE_SEED__ || null;
      if (seed && seed.claimed) seedBand = seed.claimed.band || null;
    } catch (e) {}

    var factsWithBand = Object.assign({}, facts, { __seedBand: seedBand });

    return {
      verdictKey: vk,
      facts: factsWithBand,
      narrative: ctx.narrative || (document.getElementById('iccText') ? document.getElementById('iccText').value : ''),
      jurisdiction: record.jurisdiction || facts.jurisdiction || 'UK261',
      conditions: (pos.conditions || []).map(function (c) { return c.text || c.label || String(c); }),
      quantumBand: null,
      authorities: run.authorities || [],
      trail: (typeof DefendAbleDecideWorkspace !== 'undefined' && DefendAbleDecideWorkspace.buildThinkingTrail)
             ? DefendAbleDecideWorkspace.buildThinkingTrail(record, run) : { steps: [] },
      causalCheck: run.causalCheck || null,
      gapItems: gapItems,
      rotationConfirmed: !!(record && record.lofRows && record.lofRows.length),
      rotationCount: (record && record.lofRows && record.lofRows.length) || 0,
      caseRef: ctx.caseRef || ''
    };
  }

  return {
    open: open,
    stateFromContext: stateFromContext
  };
})();
if (typeof module !== 'undefined' && module.exports) { module.exports = DefendAbleLegalReview; }
