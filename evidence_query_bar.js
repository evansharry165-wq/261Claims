/* Evidence Query Bar — case-less flight lookup with confidence-ranked,
   cross-source results. The front-door search from the original Evidence Bus
   concept, rebuilt on top of the real fetch/filter/classify pipeline:
     FlightQueryResolver.resolve()            -> facts (getCaseFacts shape)
     CaseEvidenceRepository.fetchRelevantSliceForFacts(facts, sid) -> items[]
     EvidenceCascadeMatch.rank(facts, items)   -> confidence-tiered, sorted

   Two mount modes, chosen by whether opts.caseRef is passed:
     - No caseRef (repository.html Live Evidence tab): case-independent. Each
       result deep-links to evidence-workspace.html?case=<ref> for attach —
       CaseFiling.listCases() is searched for a case already filed against
       this flight number, with a picker if more than one matches, since
       attach logic itself stays in exactly one place (the workspace).
     - caseRef given (evidence-workspace.html secondary mount): "check another
       flight while already in a case" — attaches directly via
       CaseEvidenceRepository.attachItem, same as the primary in-case stream.

   Public API — window.EvidenceQueryBar:
     .render(containerEl, {caseRef?: string}) -> mounts a self-contained widget
*/
(function (global) {
  'use strict';

  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  var TIER_LABEL = { direct: 'Direct match', cascade: 'Cascade match', route: 'Route match', 'event-supporting': 'Event context' };
  var TIER_COLOUR = { direct: 'var(--confirm,#1A5C3A)', cascade: 'var(--accent,#1B3A6B)', route: 'var(--caution,#7A4E00)', 'event-supporting': 'var(--text3,#6B6B80)' };

  function candidateCases(flightNum) {
    if (!global.CaseFiling || !global.CaseFiling.listCases) return [];
    var num = String(flightNum || '').replace(/\s+/g, '').toUpperCase();
    return global.CaseFiling.listCases().filter(function (c) {
      return String(c.flightNum || '').replace(/\s+/g, '').toUpperCase() === num;
    });
  }

  function workspaceUrl(ref) { return 'evidence-workspace.html?case=' + encodeURIComponent(ref); }

  function render(container, opts) {
    opts = opts || {};
    var caseRef = opts.caseRef || null;
    var state = { flightNum: '', date: '', facts: null, results: null, loading: false, error: null };

    function barHtml() {
      return '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">'
        + '<input id="eqb-fno" type="text" placeholder="Flight number — e.g. EZY4412" value="' + esc(state.flightNum) + '" style="font-size:13px;padding:8px 12px;border:1px solid var(--rule,var(--border,#D8D8E0));border-radius:4px;font-family:inherit;flex:1 1 160px;min-width:120px;background:var(--surface,#fff);color:var(--text,#1A1A2E)">'
        + '<input id="eqb-date" type="date" value="' + esc(state.date) + '" style="font-size:13px;padding:8px 12px;border:1px solid var(--rule,var(--border,#D8D8E0));border-radius:4px;font-family:inherit;flex:1 1 140px;min-width:120px;background:var(--surface,#fff);color:var(--text,#1A1A2E)">'
        + '<button id="eqb-go" style="font-size:12px;font-weight:600;padding:9px 16px;border:none;border-radius:4px;background:var(--ink,var(--accent,#1B3A6B));color:#fff;cursor:pointer;flex:0 0 auto">Search</button>'
        + '</div>';
    }

    function resultCard(it, i) {
      var summary = (global.CaseEvidenceRepository && global.CaseEvidenceRepository.summarise) ? global.CaseEvidenceRepository.summarise(it) : (it._kind || 'item');
      var tierColour = TIER_COLOUR[it.confidence] || TIER_COLOUR['event-supporting'];
      return '<div style="background:var(--surface,#fff);border:1px solid var(--rule,var(--border,#D8D8E0));border-left:3px solid ' + tierColour + ';border-radius:4px;padding:10px 14px;display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px 12px;align-items:flex-start">'
        + '<div style="min-width:0">'
        + '<div style="display:flex;gap:8px;align-items:center;margin-bottom:3px">'
        + '<span style="font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:' + tierColour + '">' + esc(TIER_LABEL[it.confidence] || it.confidence) + '</span>'
        + '<span style="font-size:10px;color:var(--text3,#6B6B80)">' + esc(it._sid || '') + ' · ' + esc(it._kind || '') + '</span>'
        + '</div>'
        + '<div style="font-size:12.5px;color:var(--text,#1A1A2E)">' + esc(summary) + '</div>'
        + '<div style="font-size:11px;color:var(--text3,#6B6B80);margin-top:4px;line-height:1.4">' + esc(it.reason || '') + '</div>'
        + '</div>'
        + '<div style="flex-shrink:0">' + actionFor(it, i) + '</div>'
        + '</div>';
    }

    function actionFor(it, i) {
      if (caseRef) {
        var attached = (global.CaseEvidenceRepository.listAttached(caseRef) || []).some(function (a) { return a.itemKey === it._key; });
        if (attached) return '<span style="font-size:10.5px;color:var(--confirm,#1A5C3A);font-weight:600">Attached</span>';
        return '<button data-eqb-attach="' + i + '" style="font-size:10.5px;padding:5px 11px;border:1px solid var(--accent,#1B3A6B);background:var(--surface,#fff);color:var(--accent,#1B3A6B);border-radius:3px;cursor:pointer">Attach</button>';
      }
      var candidates = candidateCases(state.facts.flightNum);
      if (candidates.length === 1) {
        return '<a href="' + workspaceUrl(candidates[0].ref) + '" style="font-size:10.5px;padding:5px 11px;border:1px solid var(--accent,#1B3A6B);background:var(--surface,#fff);color:var(--accent,#1B3A6B);border-radius:3px;text-decoration:none;display:inline-block">Open in case →</a>';
      }
      if (candidates.length > 1) {
        return '<select data-eqb-pick="' + i + '" style="font-size:10.5px;padding:5px 7px;border:1px solid var(--rule,var(--border,#D8D8E0));border-radius:3px">'
          + '<option value="">Open in case…</option>'
          + candidates.map(function (c) { return '<option value="' + esc(c.ref) + '">' + esc(c.ref) + ' — ' + esc(c.claimant || '') + '</option>'; }).join('')
          + '</select>';
      }
      return '<span title="No open case for this flight yet" style="font-size:10px;color:var(--text3,#6B6B80)">No case yet</span>';
    }

    function resultsHtml() {
      if (state.loading) return '<div style="padding:16px;color:var(--text3,#6B6B80);font-size:12px">Searching cross-source evidence…</div>';
      if (state.error) return '<div style="padding:16px;color:var(--alert,#8B1A1A);font-size:12px">' + esc(state.error) + '</div>';
      if (!state.results) return '';
      if (!state.facts) {
        return '<div style="padding:16px;background:var(--surface2,#F7F7F9);border:1px dashed var(--rule,var(--border,#D8D8E0));border-radius:4px;font-size:12px;color:var(--text3,#6B6B80);margin-top:10px">'
          + 'No schedule data for that flight/date. This resolver runs on a small seeded set pending a live flight-schedule source — try <code>EZY7823</code> on <code>2026-08-01</code> or <code>EZY4412</code> on <code>2026-08-03</code> (Etna cascade demo).'
          + '</div>';
      }
      if (!state.results.length) {
        return '<div style="padding:16px;background:var(--surface2,#F7F7F9);border:1px dashed var(--rule,var(--border,#D8D8E0));border-radius:4px;font-size:12px;color:var(--text3,#6B6B80);margin-top:10px">Flight resolved but no cross-source hits — nothing in the last snapshot matches this flight, its rotation, or its route.</div>';
      }
      return '<div style="margin-top:12px;font-size:11px;color:var(--text3,#6B6B80)">' + state.results.length + ' result' + (state.results.length === 1 ? '' : 's') + ' for ' + esc(state.facts.flightNum) + ' · ' + esc(state.facts.originIata || '?') + ' → ' + esc(state.facts.destIata || '?') + ' · ' + esc(state.facts.date) + '</div>'
        + '<div style="display:flex;flex-direction:column;gap:8px;margin-top:8px">'
        + state.results.map(function (it, i) { return resultCard(it, i); }).join('')
        + '</div>';
    }

    function bind() {
      var fno = container.querySelector('#eqb-fno');
      var date = container.querySelector('#eqb-date');
      var go = container.querySelector('#eqb-go');
      if (fno) { fno.oninput = function () { state.flightNum = fno.value; }; fno.onkeydown = function (e) { if (e.key === 'Enter') search(); }; }
      if (date) date.onchange = function () { state.date = date.value; };
      if (go) go.onclick = search;
      Array.prototype.forEach.call(container.querySelectorAll('[data-eqb-attach]'), function (btn) {
        btn.onclick = function () {
          var i = +btn.getAttribute('data-eqb-attach');
          var it = state.results[i];
          global.CaseEvidenceRepository.attachItem(caseRef, it._sid, it, 'Attached via evidence query bar (' + it.confidence + ')');
          paint();
        };
      });
      Array.prototype.forEach.call(container.querySelectorAll('[data-eqb-pick]'), function (sel) {
        sel.onchange = function () { if (sel.value) window.location.href = workspaceUrl(sel.value); };
      });
    }

    function paint() {
      container.innerHTML = barHtml() + resultsHtml();
      bind();
    }

    function search() {
      var fno = container.querySelector('#eqb-fno');
      var date = container.querySelector('#eqb-date');
      state.flightNum = fno ? fno.value : state.flightNum;
      state.date = date ? date.value : state.date;
      if (!state.flightNum || !state.date) {
        state.error = 'Enter both a flight number and a date.';
        state.results = null;
        paint();
        return;
      }
      state.error = null;
      state.loading = true;
      state.results = null;
      paint();

      var facts = global.FlightQueryResolver ? global.FlightQueryResolver.resolve(state.flightNum, state.date) : null;
      state.facts = facts;
      if (!facts) {
        state.loading = false;
        state.results = [];
        paint();
        return;
      }

      var sources = (global.EvidenceCollection && global.EvidenceCollection.SOURCES || []).map(function (s) { return s.id; });
      Promise.all(sources.map(function (sid) {
        return global.CaseEvidenceRepository.fetchRelevantSliceForFacts(facts, sid).then(function (items) {
          items.forEach(function (it) { it._sid = sid; });
          return items;
        });
      })).then(function (bySource) {
        var all = [].concat.apply([], bySource);
        var ranked = global.EvidenceCascadeMatch ? global.EvidenceCascadeMatch.rank(facts, all) : all;
        state.loading = false;
        state.results = ranked;
        paint();
      });
    }

    paint();
  }

  global.EvidenceQueryBar = { render: render };
})(typeof window !== 'undefined' ? window : this);
