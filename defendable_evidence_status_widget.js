/**
 * DefendAble — evidence-collection status widget.
 *
 * Small dashboard tile that shows the live health of the evidence-collection
 * pipeline: one row per source, with status chip + last-pull timestamp + row count.
 * Mount by calling: EvidenceStatusWidget.mount('#target-selector').
 *
 * Depends on defendable_evidence_reader.js being loaded first.
 */
(function (global) {
  'use strict';

  function chipHtml(st) {
    var color = st === 'live' ? '#0a7b3a' : st === 'planned' ? '#8a7d1c' : st === 'failed' ? '#a02222' : '#666';
    var bg = st === 'live' ? '#e6f6ec' : st === 'planned' ? '#fff8dc' : st === 'failed' ? '#fbe6e6' : '#eee';
    return '<span style="display:inline-block;padding:2px 8px;border-radius:10px;font-family:ui-monospace,Menlo,monospace;font-size:10px;font-weight:600;color:' + color + ';background:' + bg + '">' + (st || 'unknown') + '</span>';
  }

  function fmtTime(iso) {
    if (!iso) return '—';
    try {
      var d = new Date(iso);
      return d.toISOString().slice(0, 16).replace('T', ' ') + 'Z';
    } catch (e) { return iso; }
  }

  function render(target, statuses) {
    var el = typeof target === 'string' ? document.querySelector(target) : target;
    if (!el) return;
    var byId = {};
    statuses.forEach(function (r) { byId[r.source_id] = r; });
    var rows = global.EvidenceCollection.SOURCES.map(function (s) {
      var r = byId[s.id] || { status: 'no-data', pulled_at: '', rows: 0 };
      return '<tr>' +
        '<td style="padding:6px 10px;font-family:ui-monospace,Menlo,monospace;font-size:11px;">' + s.id + '</td>' +
        '<td style="padding:6px 10px;font-size:11px;color:#555">' + s.category + '</td>' +
        '<td style="padding:6px 10px">' + chipHtml(r.status) + '</td>' +
        '<td style="padding:6px 10px;font-size:11px;color:#555">' + fmtTime(r.pulled_at) + '</td>' +
        '<td style="padding:6px 10px;font-size:11px;color:#555;text-align:right">' + (r.rows || 0) + '</td>' +
        '<td style="padding:6px 10px"><a href="' + (r.live_url || (global.EvidenceCollection.BASE_URL + s.id + '.json')) + '" target="_blank" rel="noopener" style="font-size:11px;color:#4b7bec;text-decoration:none">view →</a></td>' +
        '</tr>';
    }).join('');

    var liveCount = statuses.filter(function (r) { return r.status === 'live'; }).length;
    var failedCount = statuses.filter(function (r) { return r.status === 'failed'; }).length;

    el.innerHTML =
      '<div style="border:1px solid #d5d9dc;border-radius:8px;background:#fff;overflow:hidden">' +
        '<div style="padding:10px 14px;background:#f7f8fa;border-bottom:1px solid #d5d9dc;display:flex;justify-content:space-between;align-items:center">' +
          '<div><strong style="font-size:13px">Evidence collection · pipeline health</strong>' +
          '<div style="font-size:11px;color:#666;margin-top:2px">' + liveCount + ' live · ' + failedCount + ' failed · ' + (global.EvidenceCollection.SOURCES.length - liveCount - failedCount) + ' planned</div></div>' +
          '<a href="https://github.com/evansharry165-wq/evidence-collection" target="_blank" rel="noopener" style="font-size:11px;color:#4b7bec;text-decoration:none">repo ↗</a>' +
        '</div>' +
        '<table style="width:100%;border-collapse:collapse">' +
          '<thead><tr style="background:#fafbfc;font-size:10px;color:#666;text-transform:uppercase;letter-spacing:.05em">' +
            '<th style="text-align:left;padding:6px 10px">Source</th>' +
            '<th style="text-align:left;padding:6px 10px">Category</th>' +
            '<th style="text-align:left;padding:6px 10px">Status</th>' +
            '<th style="text-align:left;padding:6px 10px">Last pull (UTC)</th>' +
            '<th style="text-align:right;padding:6px 10px">Rows</th>' +
            '<th style="padding:6px 10px"></th>' +
          '</tr></thead>' +
          '<tbody>' + rows + '</tbody>' +
        '</table>' +
      '</div>';
  }

  function mount(target) {
    var el = typeof target === 'string' ? document.querySelector(target) : target;
    if (!el) return;
    el.innerHTML = '<div style="padding:14px;font-size:11px;color:#666;display:flex;align-items:center;gap:8px"><span style="display:inline-block;width:12px;height:12px;border:2px solid #d8d8e0;border-top-color:#254E91;border-radius:50%;animation:esw-spin 0.7s linear infinite"></span>Loading evidence-collection status…</div><style>@keyframes esw-spin{to{transform:rotate(360deg)}}</style>';
    global.EvidenceCollection.status().then(function (s) { render(el, s); });
  }

  global.EvidenceStatusWidget = { mount: mount };
})(typeof window !== 'undefined' ? window : this);
