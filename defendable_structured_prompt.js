/**
 * DefendAble — Structured 3-section ICC prompt UI
 * Mounts into analyser (or standalone). Composes to canonical ICC text.
 */
var DefendAbleStructuredPrompt = (function () {
  'use strict';

  var _root = null;
  var _syncEl = null;
  var _onChange = null;
  var _debounce = null;

  function banks() {
    return typeof DefendAblePromptBanks !== 'undefined' ? DefendAblePromptBanks : null;
  }

  function sectionValues() {
    if (!_root) return { flight: '', cause: '', measures: '' };
    return {
      flight: (_root.querySelector('[data-spi="flight"]') || {}).value || '',
      cause: (_root.querySelector('[data-spi="cause"]') || {}).value || '',
      measures: (_root.querySelector('[data-spi="measures"]') || {}).value || ''
    };
  }

  function compose() {
    var B = banks();
    if (!B) {
      var s = sectionValues();
      return [s.flight, s.cause, s.measures].filter(Boolean).join('\n\n');
    }
    return B.composeSections(sectionValues());
  }

  function syncHidden() {
    var text = compose();
    if (_syncEl) _syncEl.value = text;
    return text;
  }

  function setCanonical(text) {
    var B = banks();
    var parts = B ? B.parseSections(text) : { flight: text || '', cause: '', measures: '' };
    if (!_root) {
      if (_syncEl) _syncEl.value = text || '';
      return;
    }
    var f = _root.querySelector('[data-spi="flight"]');
    var c = _root.querySelector('[data-spi="cause"]');
    var m = _root.querySelector('[data-spi="measures"]');
    if (f) f.value = parts.flight || '';
    if (c) c.value = parts.cause || '';
    if (m) m.value = parts.measures || '';
    scan();
    syncHidden();
  }

  function insertPhrase(secId, phrase) {
    var ta = _root && _root.querySelector('[data-spi="' + secId + '"]');
    if (!ta) return;
    ta.value = ta.value.replace(/\s*$/, '') + (ta.value ? '. ' : '') + phrase;
    ta.focus();
    scan();
    syncHidden();
    if (_onChange) _onChange(compose());
  }

  function renderChips(secId, text) {
    var B = banks();
    var box = _root.querySelector('[data-spi-chips="' + secId + '"]');
    if (!box || !B) return;
    box.innerHTML = '';
    var engaged = B.scanText(text);
    var low = ' ' + String(text || '').toLowerCase() + ' ';
    var seenSugg = {};

    Object.keys(engaged).forEach(function (id) {
      var e = engaged[id];
      var b = e.bank;
      var chip = document.createElement('span');
      chip.className = 'spi-chip spi-rec';
      chip.innerHTML =
        '<b>' + B.esc(e.terms[0] || b.label) + '</b>' +
        '<span>→ ' + B.esc(b.label) + ' · ' + B.esc(b.tree) + '</span>';
      box.appendChild(chip);

      (e.flags || []).forEach(function (flag) {
        var w = document.createElement('span');
        w.className = 'spi-chip spi-warn';
        w.textContent = '⚑ ' + String(flag).split('.')[0];
        w.title = flag;
        box.appendChild(w);
      });

      (b.suggestions || []).slice(0, 3).forEach(function (s) {
        if (low.indexOf(s.toLowerCase()) >= 0) return;
        if (seenSugg[s]) return;
        seenSugg[s] = true;
        var g = document.createElement('span');
        g.className = 'spi-chip spi-sugg';
        g.textContent = s;
        g.onclick = function () { insertPhrase(secId, s); };
        box.appendChild(g);
      });
    });
  }

  function renderMeters() {
    var B = banks();
    if (!B || !_root) return;
    var vals = sectionValues();
    B.SECTION_DEFS.forEach(function (def) {
      var meter = _root.querySelector('[data-spi-meter="' + def.id + '"]');
      if (!meter) return;
      var score = B.meterScore(vals[def.id], def.needs);
      Array.prototype.forEach.call(meter.children, function (bar, i) {
        bar.classList.toggle('on', i < score);
      });
    });
  }

  function renderRail() {
    var B = banks();
    if (!B || !_root) return;
    var vals = sectionValues();
    var allText = [vals.flight, vals.cause, vals.measures].join('\n');
    var engaged = B.scanText(allText);
    var list = Object.keys(engaged).map(function (k) { return engaged[k]; });
    var banksEl = _root.querySelector('#spi-rail-banks');
    var evEl = _root.querySelector('#spi-rail-ev');
    if (!banksEl || !evEl) return;

    if (!list.length) {
      banksEl.innerHTML = '<div class="spi-empty">Nothing engaged yet — start typing.</div>';
      evEl.innerHTML = '<div class="spi-empty">Populates once a disruption bank engages.</div>';
      return;
    }

    banksEl.innerHTML = list.map(function (e) {
      return (
        '<div class="spi-bank">' +
          '<span class="spi-bank-name">' + B.esc(e.bank.label) + '</span>' +
          '<span class="spi-bank-tree">' + B.esc(e.bank.tree) + '</span>' +
          '<div class="spi-bank-detail">' + B.esc(e.bank.detail) + '</div>' +
          '<div class="spi-bank-auth">' + B.esc(e.bank.auth) + '</div>' +
          (e.flags || []).map(function (f) {
            return '<div class="spi-bank-flag">⚑ ' + B.esc(f) + '</div>';
          }).join('') +
        '</div>'
      );
    }).join('');

    var low = allText.toLowerCase();
    var evMap = {};
    list.forEach(function (e) {
      (e.bank.evidence || []).forEach(function (ev) {
        var token = String(ev).split(/[\s/]/)[0].toLowerCase();
        evMap[ev] = evMap[ev] || (token && low.indexOf(token) >= 0);
      });
    });
    // RM gap nudge
    if (engaged.rm || vals.measures) {
      /* ok */
    } else if (list.some(function (e) { return e.bank.tree.indexOf('DT-') === 0; })) {
      evMap['Re-routing / standby narrative (Section 3)'] = false;
    }

    evEl.innerHTML = Object.keys(evMap).map(function (ev) {
      var ref = evMap[ev];
      return (
        '<div class="spi-ev-line">' +
          '<span class="spi-ev-dot ' + (ref ? 'ref' : 'need') + '"></span>' +
          '<span>' + B.esc(ev) +
          (ref ? '' : " — <i style='opacity:.7'>not referenced</i>") +
          '</span></div>'
      );
    }).join('');
  }

  function scan() {
    if (!_root) return;
    var vals = sectionValues();
    Object.keys(vals).forEach(function (id) {
      renderChips(id, vals[id]);
    });
    renderMeters();
    renderRail();
  }

  function scheduleScan() {
    clearTimeout(_debounce);
    _debounce = setTimeout(function () {
      scan();
      syncHidden();
      if (_onChange) _onChange(compose());
    }, 250);
  }

  function mount(opts) {
    opts = opts || {};
    _root = typeof opts.root === 'string' ? document.querySelector(opts.root) : opts.root;
    _syncEl = typeof opts.syncEl === 'string' ? document.querySelector(opts.syncEl) : opts.syncEl;
    _onChange = opts.onChange || null;
    if (!_root) return null;

    var B = banks();
    var defs = (B && B.SECTION_DEFS) || [];
    var sectionsHtml = defs.map(function (def) {
      return (
        '<div class="spi-section" data-spi-sec="' + def.id + '">' +
          '<div class="spi-sec-head">' +
            '<span class="spi-sec-num">' +
            (def.id === 'flight' ? '1' : def.id === 'cause' ? '2' : '3') +
            '</span>' +
            '<span class="spi-sec-title">' + (B ? B.esc(def.title) : def.title) + '</span>' +
            '<span class="spi-sec-sub">' + (B ? B.esc(def.sub) : def.sub) + '</span>' +
            '<span class="spi-meter" data-spi-meter="' + def.id + '"><i></i><i></i><i></i></span>' +
          '</div>' +
          '<textarea class="spi-ta" data-spi="' + def.id + '" rows="3" placeholder="' +
          (B ? B.esc(def.placeholder) : '') + '"></textarea>' +
          '<div class="spi-chips" data-spi-chips="' + def.id + '"></div>' +
        '</div>'
      );
    }).join('');

    _root.innerHTML =
      '<div class="spi-wrap">' +
        '<div class="spi-main">' +
          '<p class="spi-lede">Three sections — the shape every good ICC summary already takes. ' +
          'As you type, chips show what the system recognises. Compose feeds the existing analyser unchanged.</p>' +
          sectionsHtml +
          '<div class="spi-compose-bar">' +
            '<button type="button" class="spi-btn-compose" id="spi-compose-btn">Compose ICC summary</button>' +
            '<button type="button" class="spi-btn-ghost" id="spi-paste-btn">Paste full ICC into Flight…</button>' +
            '<span class="spi-hint" id="spi-compose-hint"></span>' +
          '</div>' +
        '</div>' +
        '<aside class="spi-rail">' +
          '<div class="spi-rail-card">' +
            '<div class="spi-rail-head">System recognition</div>' +
            '<div class="spi-rail-body" id="spi-rail-banks"><div class="spi-empty">Nothing engaged yet — start typing.</div></div>' +
          '</div>' +
          '<div class="spi-rail-card">' +
            '<div class="spi-rail-head">Evidence referenced / needed</div>' +
            '<div class="spi-rail-body" id="spi-rail-ev"><div class="spi-empty">Populates once a disruption bank engages.</div></div>' +
          '</div>' +
        '</aside>' +
      '</div>';

    Array.prototype.forEach.call(_root.querySelectorAll('.spi-ta'), function (ta) {
      ta.addEventListener('input', function () {
        if (typeof currentScenarioKey !== 'undefined') currentScenarioKey = '';
        scheduleScan();
      });
      ta.addEventListener('paste', function () {
        setTimeout(scheduleScan, 0);
      });
    });

    var composeBtn = _root.querySelector('#spi-compose-btn');
    if (composeBtn) {
      composeBtn.addEventListener('click', function () {
        var text = syncHidden();
        var hint = _root.querySelector('#spi-compose-hint');
        if (hint) {
          hint.textContent = text
            ? (text.indexOf('[FLIGHT]') >= 0 ? 'Canonical summary ready · markers attached' : 'Summary ready · unmarked (single-section)')
            : 'Add text in at least one section';
        }
        if (_onChange) _onChange(text);
      });
    }

    var pasteBtn = _root.querySelector('#spi-paste-btn');
    if (pasteBtn) {
      pasteBtn.addEventListener('click', function () {
        var raw = window.prompt('Paste a full ICC / ops summary. It will fill the Flight section (unmarked compose — existing parser path).');
        if (raw == null) return;
        setCanonical(raw);
        if (_onChange) _onChange(compose());
      });
    }

    if (_syncEl && _syncEl.value) setCanonical(_syncEl.value);
    else scan();

    return {
      compose: compose,
      sync: syncHidden,
      setCanonical: setCanonical,
      scan: scan,
      getSections: sectionValues
    };
  }

  return {
    mount: mount,
    compose: compose,
    sync: syncHidden,
    setCanonical: setCanonical,
    getSections: sectionValues
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DefendAbleStructuredPrompt;
}
