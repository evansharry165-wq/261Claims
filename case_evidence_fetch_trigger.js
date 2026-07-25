/**
 * DefendAble — case Evidence on-demand fetch trigger.
 *
 * Fires the on-demand-fetch.yml workflow in the evidence-collection repo
 * via GitHub REST API. Handles PAT storage, workflow dispatch, and status
 * polling. The PAT itself is only a "start button" — it authenticates the
 * dispatch call and nothing else. Actual data movement happens inside the
 * workflow using its own per-source credentials.
 *
 * Public API — window.CaseEvidenceFetch:
 *   .hasToken()                     → bool (is PAT stored?)
 *   .setToken(pat)                  → persist to localStorage
 *   .clearToken()                   → remove
 *   .smartCheck(caseRef)            → Promise<{fullyCovered, gaps[], perSource}>
 *   .dispatch(caseRef, options)     → Promise<{ok, workflow_run_url, runId}>
 *   .pollStatus(runId)              → Promise<{status,conclusion}> — polls once
 *   .waitForCompletion(runId,onTick)→ Promise<{status,conclusion,fetched}> — polls until done
 */
(function (global) {
  'use strict';

  var REPO_OWNER = 'evansharry165-wq';
  var REPO_NAME  = 'evidence-collection';
  var WORKFLOW_FILE = 'on-demand-fetch.yml';
  var TOKEN_KEY = 'ec_fetch_pat';
  var API_BASE = 'https://api.github.com/repos/' + REPO_OWNER + '/' + REPO_NAME;

  function getToken(){ try { return localStorage.getItem(TOKEN_KEY) || null; } catch(e){ return null; } }
  function setToken(pat){ try { localStorage.setItem(TOKEN_KEY, pat); } catch(e){} }
  function clearToken(){ try { localStorage.removeItem(TOKEN_KEY); } catch(e){} }
  function hasToken(){ return !!getToken(); }

  function apiHeaders(){
    var pat = getToken();
    return {
      'Accept': 'application/vnd.github+json',
      'Authorization': pat ? ('token ' + pat) : '',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    };
  }

  /* ── Smart pre-check: is the daily-snapshot layer already covering this case? ─────
     For each source that could feed this case, ask the reader whether it has
     any matching items in the current daily snapshot. Returns a per-source map
     plus a summary of gaps (sources where daily has zero hits for this case). */
  function smartCheck(caseRef){
    if (!global.CaseEvidenceRepository || !global.EvidenceCollection) {
      return Promise.resolve({fullyCovered: false, gaps: [], perSource: {}, reason: 'reader-not-loaded'});
    }
    var sources = global.EvidenceCollection.SOURCES;
    var promises = sources.map(function(s){
      return global.CaseEvidenceRepository.fetchRelevantSlice(caseRef, s.id).then(function(items){
        return {id: s.id, category: s.category, provider: s.provider, count: (items || []).length};
      }).catch(function(){ return {id: s.id, category: s.category, provider: s.provider, count: 0, error: true}; });
    });
    return Promise.all(promises).then(function(results){
      var perSource = {};
      var gaps = [];
      var totalHits = 0;
      results.forEach(function(r){
        perSource[r.id] = r;
        totalHits += r.count;
        if (r.count === 0) gaps.push(r);
      });
      return {
        fullyCovered: gaps.length === 0 && totalHits > 0,
        partiallyCovered: gaps.length > 0 && totalHits > 0,
        notCovered:  totalHits === 0,
        totalHits: totalHits,
        gaps: gaps,
        perSource: perSource,
        source_count: sources.length,
      };
    });
  }

  /* ── Dispatch the workflow ── */
  function dispatch(caseRef, options){
    if (!hasToken()) return Promise.reject(new Error('no-token'));
    options = options || {};
    var facts = global.CaseEvidenceRepository && global.CaseEvidenceRepository.getCaseFacts(caseRef);
    if (!facts) return Promise.reject(new Error('no-case-facts'));

    // Normalise date to ISO
    var dateIso = options.date_iso || facts.date || '';
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateIso)){ var p = dateIso.split('/'); dateIso = p[2] + '-' + p[1] + '-' + p[0]; }

    var airports = options.airports || [facts.originIcao, facts.destIcao].filter(Boolean);
    var body = {
      ref: 'main',
      inputs: {
        case_ref:            caseRef,
        date_iso:            dateIso,
        airports:            airports.join(','),
        flight_num:          facts.flightNum || '',
        reg:                 facts.reg || '',
        sources:             (options.sources || []).join(','),
        window_hours_before: String(options.window_hours_before || 12),
        window_hours_after:  String(options.window_hours_after  || 6),
      },
    };

    var dispatchUrl = API_BASE + '/actions/workflows/' + WORKFLOW_FILE + '/dispatches';
    return fetch(dispatchUrl, {
      method: 'POST',
      headers: apiHeaders(),
      body: JSON.stringify(body),
    }).then(function(resp){
      if (!resp.ok){
        return resp.text().then(function(text){
          throw new Error('dispatch failed HTTP ' + resp.status + ': ' + text);
        });
      }
      // GitHub returns 204 no-content on dispatch — we don't get the run ID directly.
      // Fetch the latest run for this workflow to get an approximate run URL.
      return waitAndGetLatestRunId(dispatchUrl);
    }).then(function(runId){
      return {
        ok: true,
        runId: runId,
        workflow_run_url: runId ? ('https://github.com/' + REPO_OWNER + '/' + REPO_NAME + '/actions/runs/' + runId) : null,
      };
    });
  }

  function waitAndGetLatestRunId(dispatchUrl){
    // Wait 3s for GitHub to register the run, then query
    return new Promise(function(resolve){
      setTimeout(function(){
        fetch(API_BASE + '/actions/workflows/' + WORKFLOW_FILE + '/runs?per_page=1', {
          headers: apiHeaders(),
        }).then(function(r){ return r.ok ? r.json() : {workflow_runs: []}; })
          .then(function(d){ var runs = d.workflow_runs || []; resolve(runs.length ? runs[0].id : null); })
          .catch(function(){ resolve(null); });
      }, 3000);
    });
  }

  function pollStatus(runId){
    if (!runId) return Promise.resolve({status:'unknown'});
    return fetch(API_BASE + '/actions/runs/' + runId, { headers: apiHeaders() })
      .then(function(r){ return r.ok ? r.json() : {}; })
      .then(function(d){ return { status: d.status, conclusion: d.conclusion, html_url: d.html_url }; })
      .catch(function(){ return {status:'unknown'}; });
  }

  function waitForCompletion(runId, onTick){
    return new Promise(function(resolve){
      var tries = 0;
      function tick(){
        tries++;
        pollStatus(runId).then(function(s){
          if (onTick) onTick(s, tries);
          if (s.status === 'completed' || tries > 60){ resolve(s); return; }
          setTimeout(tick, 5000);   // poll every 5s, up to ~5 min
        });
      }
      tick();
    });
  }

  global.CaseEvidenceFetch = {
    hasToken:          hasToken,
    setToken:          setToken,
    clearToken:        clearToken,
    smartCheck:        smartCheck,
    dispatch:          dispatch,
    pollStatus:        pollStatus,
    waitForCompletion: waitForCompletion,
    _config: { REPO_OWNER: REPO_OWNER, REPO_NAME: REPO_NAME, WORKFLOW_FILE: WORKFLOW_FILE },
  };
})(typeof window !== 'undefined' ? window : this);
