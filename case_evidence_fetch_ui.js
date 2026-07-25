/**
 * DefendAble — case Evidence on-demand fetch UI.
 *
 * Adds the "Fetch fresh evidence" button + confirm modal + PAT prompt +
 * status toast to the case Evidence Repository panel. Called from
 * CaseEvidenceRepoUI.render() — mounts into a designated slot.
 *
 * Public API — window.CaseEvidenceFetchUI:
 *   .mountButton(targetEl, caseRef, onComplete)  — inject the button+behaviour
 */
(function(global){
  'use strict';

  function css(){
    if (document.getElementById('cef-ui-css')) return;
    var s = document.createElement('style');
    s.id = 'cef-ui-css';
    s.textContent = [
      '.cef-btn{font-size:12px;padding:8px 16px;background:var(--accent,#1B3A6B);color:#fff;border:none;border-radius:3px;cursor:pointer;font-weight:500;font-family:var(--font,Helvetica Neue,Arial,sans-serif);display:inline-flex;align-items:center;gap:6px;transition:background .15s}',
      '.cef-btn:hover{background:var(--ink,#1A1A2E)}',
      '.cef-btn:disabled{background:var(--text3,#6B6B80);cursor:not-allowed}',
      '.cef-btn i{font-size:14px}',
      '.cef-modal-backdrop{position:fixed;inset:0;background:rgba(26,26,46,0.45);z-index:900;display:flex;align-items:center;justify-content:center;padding:20px}',
      '.cef-modal{background:var(--surface,#fff);border:1px solid var(--border,#D8D8E0);border-radius:4px;max-width:640px;width:100%;max-height:90vh;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 12px 40px rgba(0,0,0,0.24)}',
      '.cef-modal-hdr{padding:18px 24px;border-bottom:1px solid var(--rule2,#EBEBF0);background:linear-gradient(180deg,var(--surface,#fff) 0%,var(--surface2,#F7F7F9) 100%)}',
      '.cef-modal-hdr h3{font-family:var(--font-serif,Georgia,serif);font-size:18px;font-weight:400;margin:0 0 4px}',
      '.cef-modal-hdr p{margin:0;font-size:12px;color:var(--text3,#6B6B80);line-height:1.5}',
      '.cef-modal-body{padding:20px 24px;overflow-y:auto;flex:1}',
      '.cef-modal-body h4{font-family:var(--font-serif,Georgia,serif);font-size:14px;font-weight:400;margin:0 0 8px;color:var(--text,#1A1A2E)}',
      '.cef-modal-body h4:not(:first-child){margin-top:20px}',
      '.cef-check{background:var(--surface2,#F7F7F9);border:1px solid var(--rule2,#EBEBF0);border-radius:3px;padding:12px 14px;margin-bottom:12px;font-size:11.5px;line-height:1.5}',
      '.cef-check.covered{border-left:3px solid var(--confirm,#1A5C3A)}',
      '.cef-check.partial{border-left:3px solid var(--caution,#7A4E00)}',
      '.cef-check.none{border-left:3px solid var(--alert,#8B1A1A)}',
      '.cef-check strong{display:block;font-size:12px;font-family:var(--mono,Courier New,monospace);text-transform:uppercase;letter-spacing:.04em;margin-bottom:5px}',
      '.cef-check.covered strong{color:var(--confirm,#1A5C3A)}',
      '.cef-check.partial strong{color:var(--caution,#7A4E00)}',
      '.cef-check.none strong{color:var(--alert,#8B1A1A)}',
      '.cef-src-list{display:flex;flex-direction:column;gap:4px;font-family:var(--mono,Courier New,monospace);font-size:11px;color:var(--text2,#2D2D44)}',
      '.cef-src-list .row{display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px dashed var(--rule2,#EBEBF0)}',
      '.cef-src-list .row:last-child{border-bottom:none}',
      '.cef-src-list .row .cnt{font-weight:600}',
      '.cef-cost{font-size:11px;color:var(--text3,#6B6B80);margin-top:12px;padding-top:12px;border-top:1px solid var(--rule2,#EBEBF0);line-height:1.5}',
      '.cef-cost strong{color:var(--text,#1A1A2E);font-family:var(--mono,Courier New,monospace)}',
      '.cef-input{width:100%;font-family:var(--mono,Courier New,monospace);font-size:11px;padding:9px 12px;border:1px solid var(--border,#D8D8E0);border-radius:3px;background:var(--surface2,#F7F7F9);color:var(--text,#1A1A2E)}',
      '.cef-input:focus{outline:none;border-color:var(--accent2,#254E91);background:var(--surface,#fff)}',
      '.cef-hint{font-size:11px;color:var(--text3,#6B6B80);margin-top:8px;line-height:1.5}',
      '.cef-hint a{color:var(--accent2,#254E91);text-decoration:none}',
      '.cef-hint a:hover{text-decoration:underline}',
      '.cef-modal-ftr{padding:14px 24px;border-top:1px solid var(--rule2,#EBEBF0);display:flex;justify-content:space-between;gap:10px;align-items:center;background:var(--surface2,#F7F7F9)}',
      '.cef-btn-secondary{font-size:12px;padding:8px 14px;background:var(--surface,#fff);color:var(--text2,#2D2D44);border:1px solid var(--border,#D8D8E0);border-radius:3px;cursor:pointer;font-family:var(--font,Helvetica Neue,Arial,sans-serif)}',
      '.cef-btn-secondary:hover{background:var(--surface3,#EFEFF2)}',
      '.cef-status{background:var(--surface2,#F7F7F9);border:1px solid var(--rule2,#EBEBF0);border-radius:3px;padding:14px 18px;margin-top:14px;font-size:12px;color:var(--text2,#2D2D44)}',
      '.cef-status-hdr{display:flex;align-items:center;gap:8px;margin-bottom:8px;font-weight:500}',
      '.cef-status-hdr i{color:var(--accent2,#254E91)}',
      '.cef-progress{display:flex;flex-direction:column;gap:4px;font-family:var(--mono,Courier New,monospace);font-size:11px;color:var(--text3,#6B6B80);margin-top:6px}',
      '.spinner-sm{display:inline-block;width:12px;height:12px;border:2px solid var(--rule,#D8D8E0);border-top-color:var(--accent2,#254E91);border-radius:50%;animation:cefspin 0.7s linear infinite;vertical-align:middle;margin-right:6px}',
      '@keyframes cefspin{to{transform:rotate(360deg)}}',
      '.cef-toast{position:fixed;bottom:20px;right:20px;background:var(--ink,#1A1A2E);color:#fff;padding:12px 18px;border-radius:4px;box-shadow:0 8px 24px rgba(0,0,0,0.3);z-index:1000;font-size:12px;max-width:400px;line-height:1.5}',
      '.cef-toast.ok{background:var(--confirm,#1A5C3A)}',
      '.cef-toast.err{background:var(--alert,#8B1A1A)}',
    ].join('');
    document.head.appendChild(s);
  }

  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }

  function toast(msg, kind){
    var el = document.createElement('div');
    el.className = 'cef-toast' + (kind ? ' '+kind : '');
    el.innerHTML = msg;
    document.body.appendChild(el);
    setTimeout(function(){ el.style.opacity = '0'; el.style.transition = 'opacity .4s'; }, 4000);
    setTimeout(function(){ el.remove(); }, 4600);
  }

  function closeModal(){
    var m = document.querySelector('.cef-modal-backdrop');
    if (m) m.remove();
  }

  function openTokenModal(caseRef, onComplete){
    css();
    var html =
      '<div class="cef-modal-backdrop"><div class="cef-modal">'+
        '<div class="cef-modal-hdr"><h3>Enable on-demand fetch</h3><p>Paste a GitHub fine-grained personal access token with <span style="font-family:var(--mono,Courier New,monospace)">actions:write</span> on <span style="font-family:var(--mono,Courier New,monospace)">evansharry165-wq/evidence-collection</span>. Stored in browser localStorage — used only as the "start button" for the on-demand workflow.</p></div>'+
        '<div class="cef-modal-body">'+
          '<h4>Personal access token</h4>'+
          '<input class="cef-input" id="cef-pat-input" type="password" placeholder="github_pat_...">'+
          '<div class="cef-hint">Generate at <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">github.com/settings/personal-access-tokens/new</a>. Repository access → Only select repositories → tick <strong>evidence-collection</strong>. Permissions → Actions: <strong>Read and write</strong>, Contents: Read, Metadata: Read.</div>'+
        '</div>'+
        '<div class="cef-modal-ftr">'+
          '<button class="cef-btn-secondary" data-cef-cancel>Cancel</button>'+
          '<button class="cef-btn" data-cef-save-token>Save token</button>'+
        '</div>'+
      '</div></div>';
    document.body.insertAdjacentHTML('beforeend', html);
    document.querySelector('[data-cef-cancel]').onclick = closeModal;
    document.querySelector('[data-cef-save-token]').onclick = function(){
      var v = document.getElementById('cef-pat-input').value.trim();
      if (!v){ toast('Token cannot be empty', 'err'); return; }
      global.CaseEvidenceFetch.setToken(v);
      closeModal();
      openFetchModal(caseRef, onComplete);
    };
  }

  function openFetchModal(caseRef, onComplete){
    css();
    var facts = global.CaseEvidenceRepository.getCaseFacts(caseRef);
    var factsList = [];
    if (facts.flightNum) factsList.push('flight <strong>'+esc(facts.flightNum)+'</strong>');
    if (facts.date)      factsList.push('date <strong>'+esc(facts.date)+'</strong>');
    if (facts.originIcao) factsList.push('origin <strong>'+esc(facts.originIcao)+'</strong>');
    if (facts.destIcao)   factsList.push('dest <strong>'+esc(facts.destIcao)+'</strong>');

    var html =
      '<div class="cef-modal-backdrop"><div class="cef-modal">'+
        '<div class="cef-modal-hdr"><h3>Fetch fresh evidence for this case</h3><p>Checking daily-snapshot coverage first…</p></div>'+
        '<div class="cef-modal-body">'+
          '<h4>Case context</h4>'+
          '<div class="cef-check" style="border-left-color:var(--accent2,#254E91)">'+ (factsList.join(' · ') || 'No case facts loaded.') +'</div>'+
          '<h4>Daily snapshot coverage</h4>'+
          '<div id="cef-check-slot"><div class="cef-status"><span class="spinner-sm"></span>Running smart pre-check across all sources…</div></div>'+
          '<h4>Estimated impact</h4>'+
          '<div class="cef-cost">Fetch time: <strong>~60 seconds</strong> total (Phase A). API cost: <strong>$0</strong> — all Phase A sources are free tier. Data lands in <strong>data/case-fetches/'+esc(caseRef)+'/</strong> and this case\'s Evidence Repository refreshes automatically. Full audit row written to <strong>data/case-fetches/audit.csv</strong>.</div>'+
        '</div>'+
        '<div class="cef-modal-ftr">'+
          '<button class="cef-btn-secondary" data-cef-cancel>Cancel</button>'+
          '<button class="cef-btn" data-cef-fire disabled><i class="ti ti-cloud-download"></i>Fetch fresh evidence</button>'+
        '</div>'+
      '</div></div>';
    document.body.insertAdjacentHTML('beforeend', html);
    document.querySelector('[data-cef-cancel]').onclick = closeModal;

    // Run smart pre-check
    global.CaseEvidenceFetch.smartCheck(caseRef).then(function(check){
      var slot = document.getElementById('cef-check-slot');
      var cls = check.fullyCovered ? 'covered' : check.notCovered ? 'none' : 'partial';
      var head = check.fullyCovered
        ? 'Fully covered · ' + check.totalHits + ' hits across daily snapshot'
        : check.notCovered
          ? 'No daily coverage · fresh fetch strongly recommended'
          : 'Partially covered · ' + check.totalHits + ' hits, ' + check.gaps.length + ' gaps';
      var rows = Object.values(check.perSource).map(function(r){
        return '<div class="row"><span>'+esc(r.id)+'</span><span class="cnt">'+r.count+' hit' + (r.count===1?'':'s') + '</span></div>';
      }).join('');
      slot.innerHTML = '<div class="cef-check '+cls+'"><strong>'+head+'</strong>Per-source breakdown below. Fresh fetch will pull the case-specific slice at ~30-minute resolution across the 18h disruption window.</div>'+
        '<div class="cef-src-list">'+rows+'</div>';
      var fire = document.querySelector('[data-cef-fire]');
      fire.disabled = false;
      // Adapt button label to coverage state
      var lbl = check.fullyCovered ? 'Fetch fresh anyway' : check.notCovered ? 'Fetch — no daily coverage' : 'Fetch to fill '+check.gaps.length+' gap' + (check.gaps.length===1?'':'s');
      fire.innerHTML = '<i class="ti ti-cloud-download"></i>' + lbl;
      fire.onclick = function(){ runFetch(caseRef, onComplete); };
    });
  }

  function runFetch(caseRef, onComplete){
    // Swap modal body to a status view while workflow runs
    var body = document.querySelector('.cef-modal-body');
    var ftr  = document.querySelector('.cef-modal-ftr');
    if (body){
      body.innerHTML = '<div class="cef-status">'+
        '<div class="cef-status-hdr"><i class="ti ti-cloud-upload"></i>Dispatching workflow to evidence-collection…</div>'+
        '<div id="cef-progress" class="cef-progress"><div><span class="spinner-sm"></span>Sending workflow_dispatch request</div></div>'+
      '</div>';
    }
    if (ftr) ftr.innerHTML = '<div style="font-size:11px;color:var(--text3,#6B6B80)">You can close this and check the case Repository tab later — the fetch runs in the background.</div><button class="cef-btn-secondary" data-cef-cancel>Close</button>';
    var closeBtn = document.querySelector('[data-cef-cancel]');
    if (closeBtn) closeBtn.onclick = closeModal;

    global.CaseEvidenceFetch.dispatch(caseRef, {}).then(function(res){
      var prog = document.getElementById('cef-progress');
      if (prog) prog.insertAdjacentHTML('beforeend', '<div><i class="ti ti-check" style="color:var(--confirm,#1A5C3A)"></i> Workflow dispatched · <a href="'+res.workflow_run_url+'" target="_blank" rel="noopener">run '+res.runId+'</a></div>');
      if (res.runId){
        global.CaseEvidenceFetch.waitForCompletion(res.runId, function(s, tries){
          var el = document.getElementById('cef-progress');
          if (!el) return;
          el.insertAdjacentHTML('beforeend', '<div>Status: '+s.status+(s.conclusion ? ' · '+s.conclusion : '')+' (poll '+tries+')</div>');
        }).then(function(final){
          toast(final.conclusion === 'success' ? 'Fetch complete — refreshing Repository panel' : 'Fetch finished with status: ' + (final.conclusion || 'unknown'), final.conclusion === 'success' ? 'ok' : 'err');
          closeModal();
          if (onComplete) onComplete(final);
        });
      } else {
        toast('Fetch dispatched but run ID not retrieved. Check Actions tab.', 'ok');
      }
    }).catch(function(err){
      var body2 = document.querySelector('.cef-modal-body');
      if (body2){
        body2.insertAdjacentHTML('beforeend', '<div class="cef-check none" style="margin-top:14px"><strong>Dispatch failed</strong>'+esc(err && err.message || String(err))+'</div>');
      }
    });
  }

  function mountButton(target, caseRef, onComplete){
    css();
    var el = typeof target === 'string' ? document.querySelector(target) : target;
    if (!el) return;
    el.innerHTML = '<button class="cef-btn" id="cef-launch"><i class="ti ti-cloud-download"></i>Fetch fresh evidence</button>';
    document.getElementById('cef-launch').onclick = function(){
      if (!global.CaseEvidenceFetch) { toast('Fetch module not loaded.', 'err'); return; }
      if (!global.CaseEvidenceFetch.hasToken()){ openTokenModal(caseRef, onComplete); return; }
      openFetchModal(caseRef, onComplete);
    };
  }

  global.CaseEvidenceFetchUI = { mountButton: mountButton, openFetchModal: openFetchModal, openTokenModal: openTokenModal };
})(typeof window !== 'undefined' ? window : this);
