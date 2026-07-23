/**
 * DefendAble — ICC File Intake (data-first demo start)
 * Replicates the airline reality: the day/week disruption log arrives as a
 * jumbled spreadsheet. Upload it (or load the bundled demo week) — the engine
 * sorts sectors into tails and rotations, extracts the claim-liable flights,
 * and queues them to be worked one by one. Manual typing remains below.
 */
var DefendAbleDataBankUI = (function () {
  'use strict';

  var _root = null;
  var _onSelect = null;
  var _queue = [];
  var _worked = {};
  var _rows = null; // uploaded flight rows (defaults to bundled bank)

  function bank() { return typeof DefendAbleDataBank !== 'undefined' ? DefendAbleDataBank : null; }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  function injectStyles() {
    if (document.getElementById('dbank-style')) return;
    var st = document.createElement('style');
    st.id = 'dbank-style';
    st.textContent =
      '.dbank{border:1px solid var(--rule,#C9C2B6);border-radius:8px;background:var(--surface,#F8F5EF);margin-bottom:18px;overflow:hidden}' +
      '.dbank-head{display:flex;align-items:center;gap:12px;padding:11px 16px;background:var(--navy,#1A2F45);color:#fff}' +
      '.dbank-head .t{font-family:var(--serif,Georgia,serif);font-size:13px;letter-spacing:.02em}' +
      '.dbank-head .s{font-family:var(--mono,monospace);font-size:9px;color:rgba(255,255,255,.55);letter-spacing:.06em;text-transform:uppercase}' +
      '.dbank-intake{display:flex;align-items:center;gap:12px;padding:14px 16px;flex-wrap:wrap}' +
      '.dbank-btn{font-family:var(--mono,monospace);font-size:10px;letter-spacing:.08em;text-transform:uppercase;padding:9px 16px;border-radius:4px;cursor:pointer;border:1px solid var(--navy,#1A2F45)}' +
      '.dbank-btn.primary{background:var(--navy,#1A2F45);color:#fff}' +
      '.dbank-btn.primary:hover{background:var(--navy-mid,#2A4A6B)}' +
      '.dbank-btn.ghost{background:transparent;color:var(--navy,#1A2F45)}' +
      '.dbank-btn.ghost:hover{background:var(--claim-bg,#E8F0FA)}' +
      '.dbank-intake .hint{font-family:var(--mono,monospace);font-size:9px;color:var(--ink-3,#6B7280);flex-basis:100%}' +
      '.dbank-proc{padding:4px 16px 12px;display:none}' +
      '.dbank-proc.show{display:block}' +
      '.dbank-proc .step{font-family:var(--mono,monospace);font-size:10px;color:var(--ink-2,#3A3F4A);padding:3px 0;opacity:0;transition:opacity .3s}' +
      '.dbank-proc .step.on{opacity:1}' +
      '.dbank-proc .step b{color:var(--ec,#1B5C3A)}' +
      '.dbank-queue{display:none;padding:6px 16px 14px}' +
      '.dbank-queue.show{display:block}' +
      '.dbank-qhead{font-family:var(--mono,monospace);font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-3,#6B7280);padding:8px 0 6px;border-top:1px solid var(--rule-soft,#DDD6CA)}' +
      '.dbank-qlist{max-height:300px;overflow-y:auto}' +
      '.dbank-row{display:flex;align-items:center;gap:10px;padding:8px 12px;border:1px solid var(--rule-soft,#DDD6CA);border-left-width:4px;border-radius:5px;margin-bottom:6px;background:var(--surface-2,#FFFCF7)}' +
      '.dbank-row.st-DELAYED{border-left-color:var(--judgment-border,#E0C45A)}' +
      '.dbank-row.st-CANCELLED{border-left-color:var(--settle,#7A1A1A)}' +
      '.dbank-row.st-DIVERTED{border-left-color:var(--claim-border,#8BB0D9)}' +
      '.dbank-row.done{opacity:.55}' +
      '.dbank-row .n{font-family:var(--mono,monospace);font-size:9px;color:var(--ink-3,#6B7280);min-width:20px}' +
      '.dbank-row .f{font-family:var(--mono,monospace);font-size:11px;font-weight:600;min-width:62px;color:var(--ink,#16181D)}' +
      '.dbank-row .r{font-family:var(--mono,monospace);font-size:10px;color:var(--ink-3,#6B7280);min-width:120px}' +
      '.dbank-row .d{font-family:var(--sans,sans-serif);font-size:11.5px;color:var(--ink-2,#3A3F4A);flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
      '.dbank-row .st{font-family:var(--mono,monospace);font-size:9px;letter-spacing:.05em;padding:2px 7px;border-radius:2px}' +
      '.dbank-row .st.DELAYED{background:var(--judgment-bg,#FFF6D6);color:var(--judgment,#8A6B00)}' +
      '.dbank-row .st.CANCELLED{background:#F4E0DE;color:var(--settle,#7A1A1A)}' +
      '.dbank-row .st.DIVERTED{background:var(--claim-bg,#E8F0FA);color:var(--claim,#1E4D8C)}' +
      '.dbank-row .work{font-family:var(--mono,monospace);font-size:9.5px;letter-spacing:.06em;text-transform:uppercase;padding:5px 12px;border-radius:3px;border:1px solid var(--navy,#1A2F45);background:transparent;color:var(--navy,#1A2F45);cursor:pointer}' +
      '.dbank-row .work:hover{background:var(--navy,#1A2F45);color:#fff}' +
      '.dbank-row.done .work{border-color:var(--ec-border,#8FC9A8);color:var(--ec,#1B5C3A);cursor:default}' ;
    document.head.appendChild(st);
  }

  /* ── parse an uploaded workbook / csv into flight rows ── */
  function rowsFromWorkbook(wbData) {
    if (typeof XLSX === 'undefined') return null;
    var wb = XLSX.read(wbData, { type: 'array' });
    var sheetName = wb.SheetNames.find(function (n) { return /flight log/i.test(n); }) || wb.SheetNames[0];
    var raw = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: '' });
    if (!raw.length) return null;
    return raw.map(function (r) {
      var arr = r['Arr delay (min)'];
      return {
        date: String(r['Date'] || r['Date of flight'] || ''), dow: r['Day'] || '',
        fno: String(r['Flight #'] || ''), reg: r['Reg'] || r['Registration'] || '',
        actype: r['A/C Type'] || '', aoc: r['AOC'] || '', frm: r['From'] || '', to: r['To'] || '',
        band: r['Band (€)'] || '', rot: r['Rotation'] || '',
        std: String(r['STD'] || ''), atd: String(r['ATD'] || ''), sta: String(r['STA'] || ''), ata: String(r['ATA'] || ''),
        arrDelay: (arr === '' || arr === '—') ? null : Number(arr),
        status: r['Status'] || '', divTo: r['Diverted to'] || '',
        code: String(r['Delay code (IATA)'] || ''), reason: r['Delay reason'] || '',
        causedBy: r['Caused by'] || '', mass: r['Mass code'] || '', pax: r['Pax'] || '',
        crew: r['Crew'] || '', notes: r['Notes'] || ''
      };
    }).filter(function (r) { return r.fno && r.date; });
  }

  /* ── the processing sequence: sort → group → extract → queue ── */
  function process(rows, label) {
    var B = bank();
    _rows = rows;
    var proc = _root.querySelector('.dbank-proc');
    var queueEl = _root.querySelector('.dbank-queue');
    proc.classList.add('show');
    queueEl.classList.remove('show');

    var tails = {};
    rows.forEach(function (f) { tails[f.reg] = 1; });
    var nTails = Object.keys(tails).length;
    var disrupted = rows.filter(function (f) { return f.status && f.status !== 'ON TIME'; });
    _queue = B.extractLiable(rows);
    _worked = {};

    var steps = [
      'Received ' + label + ' — <b>' + rows.length + ' sectors</b>, rows unsorted (as uploaded)',
      'Sorting into <b>' + nTails + ' tails</b> · rotations reconstructed by registration and STD',
      'Screening: <b>' + disrupted.length + ' disrupted sectors</b> identified (delay / cancellation / diversion)',
      'Applying claim-liability tests — Sturgeon 3h arrival threshold · Art 5 cancellation rights · diversion outcomes',
      '<b>' + _queue.length + ' claim-liable flights extracted</b> → queued for legal review, one by one'
    ];
    proc.innerHTML = steps.map(function (t) { return '<div class="step">▸ ' + t + '</div>'; }).join('');
    var els = proc.querySelectorAll('.step');
    var i = 0;
    (function reveal() {
      if (i < els.length) { els[i].classList.add('on'); i++; setTimeout(reveal, 420); }
      else { renderQueue(); queueEl.classList.add('show'); }
    })();
  }

  function renderQueue() {
    var B = bank();
    var el = _root.querySelector('.dbank-qlist');
    var head = _root.querySelector('.dbank-qhead');
    var done = Object.keys(_worked).length;
    head.textContent = 'Work queue — ' + _queue.length + ' claim-liable flights · ' + done + ' worked';
    el.innerHTML = _queue.map(function (q, i) {
      var f = q.flight;
      var key = f.fno + '|' + f.date;
      var isDone = _worked[key];
      var delayTxt = f.status === 'CANCELLED' ? 'CANX' : (f.arrDelay != null ? '+' + f.arrDelay + 'm' : '');
      return '<div class="dbank-row st-' + esc(f.status) + (isDone ? ' done' : '') + '">' +
        '<span class="n">' + (i + 1) + '</span>' +
        '<span class="f">' + esc(f.fno) + '</span>' +
        '<span class="r">' + esc(f.date) + ' · ' + esc(f.frm) + '–' + esc(f.to) + ' · ' + esc(f.reg) + '</span>' +
        '<span class="d">' + esc(q.why) + (f.causedBy ? ' · ↳ root ' + esc(f.causedBy) : '') + '</span>' +
        '<span class="st ' + esc(f.status) + '">' + esc(f.status) + ' ' + delayTxt + '</span>' +
        '<button class="work" data-i="' + i + '">' + (isDone ? '✓ Worked' : 'Work →') + '</button>' +
        '</div>';
    }).join('');
    Array.prototype.forEach.call(el.querySelectorAll('.work'), function (btn) {
      btn.onclick = function () {
        var q = _queue[parseInt(btn.getAttribute('data-i'), 10)];
        var f = q.flight;
        var B2 = bank();
        var bankFlight = B2.findFlight(f.fno, f.date);
        var d = B2.disruptionFor(bankFlight || f);
        var narrative = bankFlight ? B2.buildNarrative(d) : fallbackNarrative(f);
        _worked[f.fno + '|' + f.date] = true;
        renderQueue();
        if (_onSelect) _onSelect(narrative, d);
      };
    });
  }

  function fallbackNarrative(f) {
    return f.fno + ' ' + f.frm + '-' + f.to + ' ' + f.date + ', ' + f.reg +
      '. STD ' + f.std + (f.atd ? ' ATD ' + f.atd : '') + ', STA ' + f.sta + (f.ata ? ' ATA ' + f.ata : '') +
      (f.status === 'CANCELLED' ? ' — CANCELLED.' : (f.arrDelay != null ? ' — arrival delay ' + f.arrDelay + ' mins.' : '.')) +
      ' ' + (f.reason || '') + (f.notes ? '. ' + f.notes : '');
  }

  function mount(opts) {
    opts = opts || {};
    _root = typeof opts.root === 'string' ? document.querySelector(opts.root) : opts.root;
    _onSelect = opts.onSelect || null;
    if (!_root || !bank()) return null;
    injectStyles();
    _root.innerHTML =
      '<div class="dbank">' +
        '<div class="dbank-head">' +
          '<span class="t">ICC File Intake</span>' +
          '<span class="s">Upload the day / week disruption log — the engine sorts, extracts and queues the claims</span>' +
        '</div>' +
        '<div class="dbank-intake">' +
          '<button class="dbank-btn primary" id="dbank-upload-btn">Upload ICC file (.xlsx / .csv)</button>' +
          '<input type="file" id="dbank-file" accept=".xlsx,.xls,.csv" style="display:none">' +
          '<button class="dbank-btn ghost" id="dbank-demo-btn">Load demo week — 13–19 Jul 2026</button>' +
          '<span class="hint">Expected format: ops flight log (Date, Flight #, Reg, times, status). Rows may be in any order — sorting is the engine\'s job. Or type a single case below.</span>' +
        '</div>' +
        '<div class="dbank-proc"></div>' +
        '<div class="dbank-queue"><div class="dbank-qhead"></div><div class="dbank-qlist"></div></div>' +
      '</div>';

    _root.querySelector('#dbank-upload-btn').onclick = function () {
      _root.querySelector('#dbank-file').click();
    };
    _root.querySelector('#dbank-file').addEventListener('change', function (e) {
      var file = e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function (ev) {
        var rows = null;
        try { rows = rowsFromWorkbook(new Uint8Array(ev.target.result)); } catch (err) { rows = null; }
        if (rows && rows.length) process(rows, '"' + file.name + '"');
        else {
          var proc = _root.querySelector('.dbank-proc');
          proc.classList.add('show');
          proc.innerHTML = '<div class="step on">▸ Could not read a flight log from "' + esc(file.name) + '" — expected columns: Date, Flight #, Reg, STD/ATD/STA/ATA, Status. Try the demo week.</div>';
        }
      };
      reader.readAsArrayBuffer(file);
    });
    _root.querySelector('#dbank-demo-btn').onclick = function () {
      process(bank().FLIGHTS, 'bundled demo week (jumbled ICC export)');
    };
    return { process: process };
  }

  return { mount: mount };
})();
if (typeof module !== 'undefined' && module.exports) { module.exports = DefendAbleDataBankUI; }
