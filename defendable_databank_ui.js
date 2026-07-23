/**
 * DefendAble — Week in Aviation panel (data-first demo source)
 * Mounts at the top of the engine. Browses the data bank's disrupted
 * flights by day; selecting one composes the ICC narrative from data
 * and feeds it into the structured prompt → analyser pipeline.
 */
var DefendAbleDataBankUI = (function () {
  'use strict';

  var _root = null;
  var _onSelect = null;
  var _day = '15/07/2026'; // storm day default — richest demo

  function bank() { return typeof DefendAbleDataBank !== 'undefined' ? DefendAbleDataBank : null; }

  var DAYS = [
    ['Mon', '13/07/2026'], ['Tue', '14/07/2026'], ['Wed', '15/07/2026'],
    ['Thu', '16/07/2026'], ['Fri', '17/07/2026'], ['Sat', '18/07/2026'], ['Sun', '19/07/2026']
  ];

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function injectStyles() {
    if (document.getElementById('dbank-style')) return;
    var st = document.createElement('style');
    st.id = 'dbank-style';
    st.textContent =
      '.dbank{border:1px solid var(--rule,#e6e2d8);border-radius:6px;background:var(--surface-card,#fff);margin-bottom:18px;overflow:hidden}' +
      '.dbank-head{display:flex;align-items:center;gap:12px;padding:10px 16px;background:#1e3a5f;color:#fff;cursor:pointer}' +
      '.dbank-head .t{font-family:var(--font-mono,monospace);font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase}' +
      '.dbank-head .s{font-family:var(--font-mono,monospace);font-size:9px;color:rgba(255,255,255,.55)}' +
      '.dbank-head .toggle{margin-left:auto;font-family:var(--font-mono,monospace);font-size:9px;color:rgba(255,255,255,.7)}' +
      '.dbank-body{display:none}.dbank.open .dbank-body{display:block}' +
      '.dbank-days{display:flex;gap:4px;padding:10px 14px 0;flex-wrap:wrap}' +
      '.dbank-day{font-family:var(--font-mono,monospace);font-size:10px;letter-spacing:.06em;padding:4px 11px;border:1px solid var(--rule,#e6e2d8);border-radius:3px;cursor:pointer;color:#6b675d;background:var(--surface-card,#fff)}' +
      '.dbank-day.on{background:#1e3a5f;color:#fff;border-color:#1e3a5f}' +
      '.dbank-day .n{opacity:.6;margin-left:5px}' +
      '.dbank-mass{padding:8px 14px 0;font-family:var(--font-mono,monospace);font-size:9px;color:#8a6d1f}' +
      '.dbank-list{padding:10px 14px 12px;max-height:280px;overflow-y:auto}' +
      '.dbank-row{display:flex;align-items:center;gap:10px;padding:7px 10px;border:1px solid var(--rule,#e6e2d8);border-left-width:4px;border-radius:4px;margin-bottom:6px;cursor:pointer;background:var(--surface-card,#fff)}' +
      '.dbank-row:hover{border-color:#1e3a5f;border-left-color:#1e3a5f}' +
      '.dbank-row.st-DELAYED{border-left-color:#c9a227}.dbank-row.st-CANCELLED{border-left-color:#a33b2e}.dbank-row.st-DIVERTED{border-left-color:#4a6fa5}' +
      '.dbank-row .f{font-family:var(--font-mono,monospace);font-size:11px;font-weight:700;min-width:64px}' +
      '.dbank-row .r{font-family:var(--font-mono,monospace);font-size:10px;color:#6b675d;min-width:86px}' +
      '.dbank-row .d{font-size:11px;color:#44423d;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
      '.dbank-row .st{font-family:var(--font-mono,monospace);font-size:9px;letter-spacing:.06em;padding:2px 7px;border-radius:2px}' +
      '.dbank-row .st.DELAYED{background:#fdf3d7;color:#8a6d1f}.dbank-row .st.CANCELLED{background:#f9dedc;color:#a33b2e}.dbank-row .st.DIVERTED{background:#e2e8f5;color:#3c5a8a}' +
      '.dbank-row .cas{font-family:var(--font-mono,monospace);font-size:9px;color:#8a867d}' +
      '.dbank-foot{padding:0 14px 12px;font-family:var(--font-mono,monospace);font-size:9px;color:#a9a396}';
    document.head.appendChild(st);
  }

  function disruptionsFor(date) {
    var B = bank();
    return B.DISRUPTIONS.filter(function (d) { return d.date === date; })
      .sort(function (a, b) { return (b.arrDelay || 0) - (a.arrDelay || 0); });
  }

  function render() {
    var B = bank();
    if (!B || !_root) return;
    var list = disruptionsFor(_day);
    var massCodes = {};
    list.forEach(function (d) { if (d.mass) massCodes[d.mass] = B.MASS[d.mass] || d.mass; });

    _root.querySelector('.dbank-days').innerHTML = DAYS.map(function (dd) {
      var n = disruptionsFor(dd[1]).length;
      return '<span class="dbank-day' + (dd[1] === _day ? ' on' : '') + '" data-day="' + dd[1] + '">' +
        dd[0] + '<span class="n">' + n + '</span></span>';
    }).join('');

    _root.querySelector('.dbank-mass').innerHTML = Object.keys(massCodes).length
      ? Object.keys(massCodes).map(function (k) { return '⚡ ' + k + ' — ' + esc(massCodes[k]); }).join(' &nbsp;·&nbsp; ')
      : 'No mass events this day — singles and knock-ons only.';

    _root.querySelector('.dbank-list').innerHTML = list.map(function (d, i) {
      var delayTxt = d.status === 'CANCELLED' ? 'CANX' :
        (d.arrDelay != null ? '+' + d.arrDelay + 'm' : '');
      return '<div class="dbank-row st-' + esc(d.status) + '" data-i="' + i + '">' +
        '<span class="f">' + esc(d.fno) + '</span>' +
        '<span class="r">' + esc(d.frm) + '–' + esc(d.to) + ' · ' + esc(d.reg) + '</span>' +
        '<span class="d">' + esc(d.dtype) + '</span>' +
        (d.causedBy ? '<span class="cas">↳ ' + esc(d.causedBy) + '</span>' : '') +
        '<span class="st ' + esc(d.status) + '">' + esc(d.status) + ' ' + delayTxt + '</span>' +
        '</div>';
    }).join('') || '<div style="font-size:11px;color:#a9a396;padding:6px 0">Clean day — no disruptions.</div>';

    Array.prototype.forEach.call(_root.querySelectorAll('.dbank-day'), function (el) {
      el.onclick = function (e) { e.stopPropagation(); _day = el.getAttribute('data-day'); render(); };
    });
    Array.prototype.forEach.call(_root.querySelectorAll('.dbank-row'), function (el) {
      el.onclick = function () {
        var d = list[parseInt(el.getAttribute('data-i'), 10)];
        var narrative = B.buildNarrative(d);
        if (_onSelect) _onSelect(narrative, d);
      };
    });
  }

  function mount(opts) {
    opts = opts || {};
    _root = typeof opts.root === 'string' ? document.querySelector(opts.root) : opts.root;
    _onSelect = opts.onSelect || null;
    if (!_root || !bank()) return null;
    injectStyles();
    var total = bank().DISRUPTIONS.length;
    _root.innerHTML =
      '<div class="dbank open">' +
        '<div class="dbank-head">' +
          '<span class="t">A Week in Aviation — Live Data Bank</span>' +
          '<span class="s">13–19 Jul 2026 · 448 sectors · 12 tails · U2/E2/H2 · ' + total + ' disruptions</span>' +
          '<span class="toggle">collapse ▾</span>' +
        '</div>' +
        '<div class="dbank-body">' +
          '<div class="dbank-days"></div>' +
          '<div class="dbank-mass"></div>' +
          '<div class="dbank-list"></div>' +
          '<div class="dbank-foot">Select a disrupted flight — the factual narrative composes from the data bank (tail, rotation, root cause, evidence) and feeds the engine. Source: DefendAble_Data_Bank_Week_in_Aviation.xlsx</div>' +
        '</div>' +
      '</div>';
    _root.querySelector('.dbank-head').onclick = function () {
      var el = _root.querySelector('.dbank');
      el.classList.toggle('open');
      _root.querySelector('.toggle').textContent = el.classList.contains('open') ? 'collapse ▾' : 'expand ▸';
    };
    render();
    return { render: render };
  }

  return { mount: mount };
})();
if (typeof module !== 'undefined' && module.exports) { module.exports = DefendAbleDataBankUI; }
