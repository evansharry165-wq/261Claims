/**
 * DefendAble — case Evidence Repository panel UI.
 *
 * Renders the "Evidence repository" tab content inside case_shell.
 * Depends on window.CaseEvidenceRepository (data) + window.EvidenceCollection (source list).
 *
 * Public API — window.CaseEvidenceRepoUI:
 *   .render(caseRef, targetEl)   — build the full panel into targetEl
 */
(function (global) {
  'use strict';

  function css(){
    if (document.getElementById('cer-ui-css')) return;
    var s = document.createElement('style');
    s.id = 'cer-ui-css';
    s.textContent = [
      '.cer-wrap{padding:16px 22px;font-family:var(--font,Helvetica Neue,Arial,sans-serif);color:var(--text,#1A1A2E);font-size:14px}',
      '.cer-hero{background:var(--surface,#fff);border:1px solid var(--border,#D8D8E0);border-radius:3px;padding:14px 18px;margin-bottom:16px;display:grid;grid-template-columns:1fr auto;gap:14px;align-items:center}',
      '.cer-hero-info h3{font-family:var(--font-serif,Georgia,serif);font-size:16px;font-weight:400;margin:0 0 4px}',
      '.cer-hero-info p{margin:0;font-size:12px;color:var(--text3,#6B6B80);line-height:1.5}',
      '.cer-hero-stats{display:flex;gap:20px;text-align:right}',
      '.cer-hero-stat .n{font-family:var(--font-serif,Georgia,serif);font-size:24px;font-weight:400;color:var(--text,#1A1A2E);line-height:1}',
      '.cer-hero-stat .l{font-size:9.5px;color:var(--text3,#6B6B80);text-transform:uppercase;letter-spacing:.06em;margin-top:4px}',
      '.cer-facts{padding:10px 18px 12px;background:var(--surface2,#F7F7F9);border:1px solid var(--rule2,#EBEBF0);border-radius:3px;margin-bottom:16px;font-size:11.5px;display:flex;flex-wrap:wrap;gap:10px 22px}',
      '.cer-facts .k{font-family:var(--mono,Courier New,monospace);color:var(--text3,#6B6B80);font-size:10px;text-transform:uppercase;letter-spacing:.06em;margin-right:6px}',
      '.cer-facts .v{font-family:var(--mono,Courier New,monospace);color:var(--text,#1A1A2E);font-weight:600}',
      '.cer-sec-hdr{display:flex;justify-content:space-between;align-items:baseline;margin:24px 0 10px}',
      '.cer-sec-hdr h4{font-family:var(--font-serif,Georgia,serif);font-size:15px;font-weight:400;margin:0}',
      '.cer-sec-hdr .hint{font-size:11px;color:var(--text3,#6B6B80)}',
      '.cer-attached{display:flex;flex-direction:column;gap:8px}',
      '.cer-att{background:var(--surface,#fff);border:1px solid var(--border,#D8D8E0);border-left:3px solid var(--confirm,#1A5C3A);border-radius:3px;padding:11px 14px;display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center}',
      '.cer-att-icon{width:32px;height:32px;border-radius:3px;display:flex;align-items:center;justify-content:center;font-size:15px}',
      '.cer-att-body{min-width:0}',
      '.cer-att-summary{font-size:12.5px;color:var(--text,#1A1A2E);font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.cer-att-meta{font-size:10.5px;color:var(--text3,#6B6B80);margin-top:2px;font-family:var(--mono,Courier New,monospace)}',
      '.cer-att-actions{display:flex;gap:6px}',
      '.cer-att-btn{font-size:11px;padding:4px 9px;border:1px solid var(--border,#D8D8E0);background:var(--surface,#fff);color:var(--text2,#2D2D44);border-radius:3px;cursor:pointer;font-family:var(--font,Helvetica Neue,Arial,sans-serif)}',
      '.cer-att-btn:hover{background:var(--surface2,#F7F7F9)}',
      '.cer-att-btn.danger:hover{background:var(--red-faint,#FBF0F0);color:var(--red,#8B1A1A);border-color:var(--red,#8B1A1A)}',
      '.cer-empty{padding:26px 18px;background:var(--surface2,#F7F7F9);border:1px dashed var(--rule,#D8D8E0);border-radius:3px;text-align:center;color:var(--text3,#6B6B80);font-size:12px}',
      '.cer-sources{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:12px}',
      '.cer-src{background:var(--surface,#fff);border:1px solid var(--border,#D8D8E0);border-radius:3px;overflow:hidden;display:flex;flex-direction:column}',
      '.cer-src-hdr{padding:11px 14px 10px;border-bottom:1px solid var(--rule2,#EBEBF0);display:flex;justify-content:space-between;align-items:flex-start;gap:8px}',
      '.cer-src-name{font-family:var(--mono,Courier New,monospace);font-size:11px;font-weight:600;color:var(--text,#1A1A2E)}',
      '.cer-src-provider{font-size:11px;color:var(--text3,#6B6B80);margin-top:2px}',
      '.cer-src-chip{padding:2px 8px;border-radius:8px;font-family:var(--mono,Courier New,monospace);font-size:9.5px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;flex-shrink:0}',
      '.chip-hit{background:var(--confirm-faint,#EEF7F2);color:var(--confirm,#1A5C3A)}',
      '.chip-nohit{background:var(--surface3,#EFEFF2);color:var(--text3,#6B6B80)}',
      '.chip-loading{background:var(--accent-faint,#EEF2F8);color:var(--accent,#1B3A6B)}',
      '.cer-src-body{padding:8px 14px 12px;flex:1;font-size:11.5px;max-height:280px;overflow-y:auto}',
      '.cer-item-row{display:grid;grid-template-columns:1fr auto;gap:8px;padding:7px 0;border-bottom:1px dashed var(--rule2,#EBEBF0);align-items:center}',
      '.cer-item-row:last-child{border-bottom:none}',
      '.cer-item-summary{font-size:11.5px;color:var(--text2,#2D2D44);line-height:1.4;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}',
      '.cer-item-btn{font-size:10.5px;padding:3px 9px;border:1px solid var(--accent,#1B3A6B);background:var(--surface,#fff);color:var(--accent,#1B3A6B);border-radius:3px;cursor:pointer;font-family:var(--font,Helvetica Neue,Arial,sans-serif);white-space:nowrap;font-weight:500}',
      '.cer-item-btn:hover{background:var(--accent,#1B3A6B);color:#fff}',
      '.cer-item-btn.done{background:var(--confirm,#1A5C3A);color:#fff;border-color:var(--confirm,#1A5C3A);cursor:default}',
      '.cer-item-none{padding:14px 0;color:var(--text3,#6B6B80);font-size:11px;font-style:italic;text-align:center}',
      '.cer-actions-strip{background:var(--surface,#fff);border:1px solid var(--border,#D8D8E0);border-radius:3px;padding:12px 16px;margin-top:20px;display:flex;justify-content:space-between;align-items:center;gap:12px}',
      '.cer-btn-primary{font-size:12px;padding:8px 16px;background:var(--ink,#1A1A2E);color:#fff;border:none;border-radius:3px;cursor:pointer;font-weight:500;font-family:var(--font,Helvetica Neue,Arial,sans-serif);display:inline-flex;align-items:center;gap:6px}',
      '.cer-btn-primary:hover{background:var(--ink2,#2D2D44)}',
      '.cer-btn-primary i{font-size:14px}',
    ].join('');
    document.head.appendChild(s);
  }

  function iconFor(kind){
    switch(kind){
      case 'metar': case 'taf': return {icon:'ti ti-cloud-storm', bg:'#EEF2F8', fg:'#254E91'};
      case 'notam':              return {icon:'ti ti-file-text',  bg:'#FDF4E3', fg:'#7A4E00'};
      case 'news':               return {icon:'ti ti-news',       bg:'#EEF7F2', fg:'#1A5C3A'};
      case 'wildfire': case 'gdacs': case 'copernicus': case 'volcano': return {icon:'ti ti-flame', bg:'#FBF0F0', fg:'#8B1A1A'};
      case 'strike':             return {icon:'ti ti-hand-stop',  bg:'#F0EEFC', fg:'#5B4A9F'};
      case 'atfm':               return {icon:'ti ti-traffic-cone',bg:'#E4EEF2', fg:'#1F5C68'};
      case 'track':              return {icon:'ti ti-plane',      bg:'#F3F0FA', fg:'#4338CA'};
      case 'chart':              return {icon:'ti ti-photo',      bg:'#EEF2F8', fg:'#254E91'};
    }
    return {icon:'ti ti-file', bg:'#EFEFF2', fg:'#6B6B80'};
  }

  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }

  function renderAttached(items, caseRef){
    if (!items.length) return '<div class="cer-empty">No evidence attached to this case yet. Below, each source with a green "hit" chip has case-relevant material you can attach.</div>';
    return '<div class="cer-attached">' + items.map(function(a){
      var ic = iconFor(a.kind);
      return '<div class="cer-att">'+
        '<div class="cer-att-icon" style="background:'+ic.bg+';color:'+ic.fg+'"><i class="'+ic.icon+'"></i></div>'+
        '<div class="cer-att-body"><div class="cer-att-summary">'+esc(a.summary)+'</div>'+
        '<div class="cer-att-meta">'+esc(a.sourceProvider)+' · attached '+esc(a.attachedAt.slice(0,10))+' by '+esc(a.attachedBy)+(a.note?' · <em>'+esc(a.note)+'</em>':'')+'</div></div>'+
        '<div class="cer-att-actions">'+
          '<button class="cer-att-btn" data-view="'+a.id+'">View</button>'+
          '<button class="cer-att-btn danger" data-remove="'+a.id+'">Remove</button>'+
        '</div>'+
      '</div>';
    }).join('') + '</div>';
  }

  function renderSourcePanel(source, itemsPromise, alreadyAttachedKeys, caseRef){
    var panelId = 'cer-src-' + source.id;
    var html = '<div class="cer-src" id="'+panelId+'">'+
      '<div class="cer-src-hdr"><div><div class="cer-src-name">'+esc(source.id)+'</div><div class="cer-src-provider">'+esc(source.provider)+' · '+esc(source.category)+'</div></div>'+
      '<span class="cer-src-chip chip-loading" data-chip="'+source.id+'">loading…</span></div>'+
      '<div class="cer-src-body" data-body="'+source.id+'"><div class="cer-item-none">Fetching…</div></div>'+
    '</div>';
    itemsPromise.then(function(items){
      var chip = document.querySelector('[data-chip="'+source.id+'"]');
      var body = document.querySelector('[data-body="'+source.id+'"]');
      if (!chip || !body) return;
      if (!items || !items.length){
        chip.className = 'cer-src-chip chip-nohit'; chip.textContent = 'no case-relevant items';
        body.innerHTML = '<div class="cer-item-none">Nothing in the latest snapshot matches this case\'s date / airports / flight.</div>';
        return;
      }
      chip.className = 'cer-src-chip chip-hit'; chip.textContent = items.length + ' hits';
      body.innerHTML = items.slice(0,10).map(function(it){
        var isAttached = alreadyAttachedKeys.indexOf(it._key) >= 0;
        var summary = global.CaseEvidenceRepository.summarise(it);
        return '<div class="cer-item-row">'+
          '<div class="cer-item-summary">'+esc(summary)+'</div>'+
          (isAttached
            ? '<button class="cer-item-btn done" disabled>Attached</button>'
            : '<button class="cer-item-btn" data-attach="'+source.id+'" data-key="'+it._key+'">Attach</button>')+
        '</div>';
      }).join('') + (items.length > 10 ? '<div class="cer-item-none">+' + (items.length - 10) + ' more not shown</div>' : '');
      // Wire attach buttons
      Array.prototype.forEach.call(body.querySelectorAll('[data-attach]'), function(btn){
        btn.onclick = function(){
          var srcId = btn.getAttribute('data-attach');
          var key = btn.getAttribute('data-key');
          var item = items.find(function(x){ return x._key === key; });
          if (!item) return;
          global.CaseEvidenceRepository.attachItem(caseRef, srcId, item, '');
          // Re-render the whole panel to refresh state
          var host = document.getElementById('cer-root');
          if (host) render(caseRef, host);
        };
      });
    });
    return html;
  }

  function render(caseRef, target){
    css();
    var el = typeof target === 'string' ? document.querySelector(target) : target;
    if (!el) return;
    el.id = 'cer-root';
    var facts = global.CaseEvidenceRepository.getCaseFacts(caseRef);
    if (!facts){ el.innerHTML = '<div class="cer-wrap"><div class="cer-empty">Could not load case facts. Open the case again after case_packet is generated.</div></div>'; return; }
    var attached = global.CaseEvidenceRepository.listAttached(caseRef);
    var attachedKeys = attached.map(function(a){ return a.itemKey; });

    var factsRow = ''+
      '<div class="cer-facts">'+
        (facts.flightNum ? '<div><span class="k">Flight</span><span class="v">'+esc(facts.flightNum)+'</span></div>' : '') +
        (facts.date ? '<div><span class="k">Date</span><span class="v">'+esc(facts.date)+'</span></div>' : '') +
        (facts.originIcao ? '<div><span class="k">Origin</span><span class="v">'+esc(facts.originIcao)+' / '+esc(facts.originIata||'')+'</span></div>' : '') +
        (facts.destIcao ? '<div><span class="k">Dest</span><span class="v">'+esc(facts.destIcao)+' / '+esc(facts.destIata||'')+'</span></div>' : '') +
        (facts.reg ? '<div><span class="k">Reg</span><span class="v">'+esc(facts.reg)+'</span></div>' : '') +
        (facts.carrier ? '<div><span class="k">Carrier</span><span class="v">'+esc(facts.carrier)+'</span></div>' : '') +
      '</div>';

    var sources = (global.EvidenceCollection && global.EvidenceCollection.SOURCES) || [];
    var sourceCards = sources.map(function(s){
      return renderSourcePanel(s, global.CaseEvidenceRepository.fetchRelevantSlice(caseRef, s.id), attachedKeys, caseRef);
    }).join('');

    el.innerHTML =
      '<div class="cer-wrap">'+
        '<div class="cer-hero">'+
          '<div class="cer-hero-info"><h3>Evidence repository</h3><p>Case-specific slice of the DefendAble evidence-collection pipeline. Attach any item to lock it into this case permanently — it survives the 90-day retention window on the raw source.</p></div>'+
          '<div class="cer-hero-stats">'+
            '<div class="cer-hero-stat"><div class="n">'+attached.length+'</div><div class="l">Attached</div></div>'+
            '<div class="cer-hero-stat"><div class="n">'+sources.length+'</div><div class="l">Sources</div></div>'+
          '</div>'+
        '</div>'+
        factsRow +
        '<div class="cer-sec-hdr"><h4>Attached to this case</h4><span class="hint">Permanent — stored in case_packet, survives raw-snapshot rotation.</span></div>'+
        renderAttached(attached, caseRef) +
        '<div class="cer-sec-hdr"><h4>Available from evidence-collection</h4><span class="hint">Auto-filtered to this case. Green chip = hits.</span></div>'+
        '<div class="cer-sources">' + sourceCards + '</div>' +
        '<div class="cer-actions-strip">'+
          '<div style="font-size:11.5px;color:var(--text3,#6B6B80)">Bundle contents export for LOR pack / disclosure.</div>'+
          '<button class="cer-btn-primary" id="cer-export"><i class="ti ti-download"></i>Export bundle JSON</button>'+
        '</div>'+
      '</div>';

    // Wire attached-item action buttons
    Array.prototype.forEach.call(el.querySelectorAll('[data-remove]'), function(btn){
      btn.onclick = function(){
        var id = btn.getAttribute('data-remove');
        if (!confirm('Remove this evidence from the case?')) return;
        global.CaseEvidenceRepository.removeAttached(caseRef, id);
        render(caseRef, el);
      };
    });
    var exportBtn = document.getElementById('cer-export');
    if (exportBtn){
      exportBtn.onclick = function(){
        var bundle = global.CaseEvidenceRepository.exportBundle(caseRef);
        var blob = new Blob([JSON.stringify(bundle, null, 2)], {type:'application/json'});
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a'); a.href = url; a.download = caseRef + '-evidence-bundle.json'; a.click();
        setTimeout(function(){ URL.revokeObjectURL(url); }, 500);
      };
    }
  }

  global.CaseEvidenceRepoUI = { render: render };
})(typeof window !== 'undefined' ? window : this);
