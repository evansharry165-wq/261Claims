/**
 * DefendAble — Structured ICC prompt UI (single-box, live-highlight)
 * One text box. Ghost placeholder teaches the 3-part structure.
 * Recognised keywords highlight IN the box as you type (backdrop overlay).
 * Composes canonical text into a hidden sync element for the analyser.
 */
var DefendAbleStructuredPrompt = (function () {
  'use strict';

  var _root = null;
  var _syncEl = null;
  var _onChange = null;
  var _debounce = null;
  var _ta = null;
  var _backdrop = null;
  var _triggerRe = null;

  function banks() {
    return typeof DefendAblePromptBanks !== 'undefined' ? DefendAblePromptBanks : null;
  }

  /* ── trigger regex built once from every bank's trigger lexicon ── */
  function triggerRegex() {
    if (_triggerRe) return _triggerRe;
    var B = banks();
    if (!B || !B.BANKS) return null;
    var terms = [];
    B.BANKS.forEach(function (b) {
      (b.triggers || []).forEach(function (t) {
        var clean = String(t).trim();
        if (clean) terms.push(clean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+'));
      });
    });
    terms.sort(function (a, b) { return b.length - a.length; });
    _triggerRe = new RegExp('(^|[^A-Za-z0-9])(' + terms.join('|') + ')(s?)(?=$|[^A-Za-z0-9])', 'gi');
    return _triggerRe;
  }

  function escHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function getText() {
    return _ta ? _ta.value : '';
  }

  function compose() {
    return getText();
  }

  function syncHidden() {
    var text = compose();
    if (_syncEl) _syncEl.value = text;
    return text;
  }

  function setCanonical(text) {
    var B = banks();
    var body = text || '';
    if (B && B.stripMarkers && /\[(FLIGHT|CAUSE|MEASURES)\]/.test(body)) {
      // Flatten marked canonical text into readable single-box prose
      body = body.replace(/\s*\[(FLIGHT|CAUSE|MEASURES)\]\s*/g, function (m, k, off) {
        return off === 0 ? '' : '\n\n';
      });
    }
    if (_ta) { _ta.value = body; }
    if (_syncEl) _syncEl.value = text || '';
    scan();
  }

  function getSections() {
    var B = banks();
    var text = getText();
    if (B && B.parseSections) {
      var p = B.parseSections(text);
      if (p.cause || p.measures) return p;
      return { flight: text, cause: '', measures: '' };
    }
    return { flight: text, cause: '', measures: '' };
  }

  /* ── live in-box highlight ── */
  function renderBackdrop() {
    if (!_backdrop) return;
    var re = triggerRegex();
    var html = escHtml(getText());
    if (re) {
      re.lastIndex = 0;
      html = html.replace(re, function (m, pre, term, plural) {
        return pre + '<mark class="spi-mark">' + term + (plural || '') + '</mark>';
      });
    }
    _backdrop.innerHTML = html + '\n';
    _backdrop.scrollTop = _ta.scrollTop;
  }

  /* ── structure meter: three steps light as narrative satisfies each section ── */
  function renderStructureGuide() {
    var B = banks();
    if (!B || !_root) return;
    var text = getText();
    B.SECTION_DEFS.forEach(function (def) {
      var step = _root.querySelector('[data-spi-step="' + def.id + '"]');
      if (!step) return;
      var score = B.meterScore(text, def.needs);
      var max = def.needs.length;
      step.classList.toggle('done', score >= max);
      step.classList.toggle('part', score > 0 && score < max);
      var meter = step.querySelector('.spi-step-meter');
      if (meter) {
        Array.prototype.forEach.call(meter.children, function (bar, i) {
          bar.classList.toggle('on', i < score);
        });
      }
    });
  }

  /* ── recognition strip: chips + warnings + insertable suggestions ── */
  function renderChips() {
    var B = banks();
    var box = _root.querySelector('[data-spi-chips="main"]');
    if (!box || !B) return;
    box.innerHTML = '';
    var text = getText();
    var engaged = B.scanText(text);
    var low = ' ' + text.toLowerCase() + ' ';
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
        g.onclick = function () { insertPhrase(s); };
        box.appendChild(g);
      });
    });
  }

  function insertPhrase(phrase) {
    if (!_ta) return;
    _ta.value = _ta.value.replace(/\s*$/, '') + (_ta.value ? '. ' : '') + phrase;
    _ta.focus();
    scan();
    syncHidden();
    if (_onChange) _onChange(compose());
  }

  function renderRail() {
    var B = banks();
    if (!B || !_root) return;
    var allText = getText();
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
    var B2 = banks();
    var measuresTouched = B2.meterScore(allText, B2.SECTION_DEFS[2].needs) > 1;
    if (!measuresTouched && list.some(function (e) { return String(e.bank.tree).indexOf('DT-') === 0; })) {
      evMap['Reasonable measures narrative — standby / re-routing / network state'] = false;
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
    renderBackdrop();
    renderStructureGuide();
    renderChips();
    renderRail();
  }

  function scheduleScan() {
    clearTimeout(_debounce);
    renderBackdrop(); // instant — highlight must feel live
    _debounce = setTimeout(function () {
      scan();
      syncHidden();
      if (_onChange) _onChange(compose());
    }, 220);
  }

  var GHOST =
    'Tell the disruption in three parts —\n' +
    '1 · THE FLIGHT — number(s), date, tail, route; what happened to the aircraft across the day (inbound sectors, inherited delay, swaps, diversions)\n' +
    '2 · THE CAUSE — why it was disrupted and the consequence chain (weather, ATC, technical, pax… → what it did to the operation)\n' +
    '3 · THE MEASURES — why the airline could not save it on the day (standby, re-crew, re-routing checked, network state, curfew, FDP)\n\n' +
    'e.g. EZY4470 LGW–AMS 21/07, G-EZBX. Ground hold LGW, ATD 0941 vs STD 0620, arrival delay 194 mins. CB activity Amsterdam FIR, Eurocontrol ATFM regulation, CTOT 0920. No standby available LGW — subs deployed. Re-routing checked: no earlier arrival.';

  function injectStyles() {
    if (document.getElementById('spi-singlebox-style')) return;
    var st = document.createElement('style');
    st.id = 'spi-singlebox-style';
    st.textContent =
      '.spi-hlwrap{position:relative;border:1px solid var(--rule,#e6e2d8);border-radius:6px;background:var(--surface-card,#fff);overflow:hidden}' +
      '.spi-hlwrap:focus-within{border-color:var(--ink-secondary,#8a6d1f)}' +
      '.spi-backdrop,.spi-ta-main{font-family:Georgia,\'Times New Roman\',serif;font-size:14px;line-height:1.65;padding:14px 16px;margin:0;border:0;width:100%;box-sizing:border-box;white-space:pre-wrap;word-wrap:break-word;overflow-wrap:break-word;}' +
      '.spi-backdrop{position:absolute;inset:0;color:transparent;pointer-events:none;overflow:hidden;z-index:0}' +
      '.spi-backdrop .spi-mark{color:transparent;background:rgba(138,109,31,.18);border-bottom:2px solid rgba(138,109,31,.55);border-radius:2px}' +
      '.spi-ta-main{position:relative;z-index:1;background:transparent;display:block;resize:vertical;min-height:170px;outline:none;color:var(--ink,#1a1a18)}' +
      '.spi-ta-main::placeholder{color:#b8b3a6;font-style:italic;font-size:12.5px;line-height:1.6}' +
      '.spi-structure{display:flex;gap:8px;margin:0 0 8px;flex-wrap:wrap}' +
      '.spi-step{display:inline-flex;align-items:center;gap:7px;font-family:var(--font-mono,monospace);font-size:9.5px;letter-spacing:.08em;text-transform:uppercase;color:#8a867d;border:1px solid var(--rule,#e6e2d8);border-radius:3px;padding:4px 9px;background:var(--surface-card,#fff)}' +
      '.spi-step .spi-step-meter{display:inline-flex;gap:2px}' +
      '.spi-step .spi-step-meter i{width:9px;height:3px;border-radius:1px;background:var(--rule,#e6e2d8)}' +
      '.spi-step .spi-step-meter i.on{background:#1f6f43}' +
      '.spi-step.part{color:#5c584e}' +
      '.spi-step.done{color:#1f6f43;border-color:#cfe4d6}' +
      '.spi-hint-line{font-family:var(--font-mono,monospace);font-size:9px;letter-spacing:.06em;color:#a9a396;margin-top:6px}';
    document.head.appendChild(st);
  }

  function mount(opts) {
    opts = opts || {};
    _root = typeof opts.root === 'string' ? document.querySelector(opts.root) : opts.root;
    _syncEl = typeof opts.syncEl === 'string' ? document.querySelector(opts.syncEl) : opts.syncEl;
    _onChange = opts.onChange || null;
    if (!_root) return null;

    injectStyles();
    var B = banks();
    var defs = (B && B.SECTION_DEFS) || [];

    var stepsHtml = defs.map(function (def, i) {
      return (
        '<span class="spi-step" data-spi-step="' + def.id + '">' +
          '<b>' + (i + 1) + '</b> ' + (B ? B.esc(def.title) : def.title) +
          '<span class="spi-step-meter">' +
            def.needs.map(function () { return '<i></i>'; }).join('') +
          '</span>' +
        '</span>'
      );
    }).join('');

    _root.innerHTML =
      '<div class="spi-wrap">' +
        '<div class="spi-main">' +
          '<div class="spi-structure">' + stepsHtml + '</div>' +
          '<div class="spi-hlwrap">' +
            '<div class="spi-backdrop" aria-hidden="true"></div>' +
            '<textarea class="spi-ta-main" data-spi="main" rows="8" spellcheck="false" placeholder="' +
            (B ? B.esc(GHOST) : '') + '"></textarea>' +
          '</div>' +
          '<div class="spi-hint-line">Recognised terms highlight as you type — each one connects the narrative to a disruption tree, its evidence set and its authorities.</div>' +
          '<div class="spi-chips" data-spi-chips="main"></div>' +
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

    _ta = _root.querySelector('.spi-ta-main');
    _backdrop = _root.querySelector('.spi-backdrop');

    _ta.addEventListener('input', function () {
      if (typeof currentScenarioKey !== 'undefined') currentScenarioKey = '';
      scheduleScan();
    });
    _ta.addEventListener('paste', function () { setTimeout(scheduleScan, 0); });
    _ta.addEventListener('scroll', function () { _backdrop.scrollTop = _ta.scrollTop; });

    if (_syncEl && _syncEl.value) setCanonical(_syncEl.value);
    else scan();

    return {
      compose: compose,
      sync: syncHidden,
      setCanonical: setCanonical,
      scan: scan,
      getSections: getSections
    };
  }

  return {
    mount: mount,
    compose: compose,
    sync: syncHidden,
    setCanonical: setCanonical,
    getSections: getSections
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DefendAbleStructuredPrompt;
}
