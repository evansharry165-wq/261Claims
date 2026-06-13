/**
 * Reset demo session and persisted stores to fresh seed state.
 */
(function (global) {
  'use strict';

  var SESSION_PREFIX = 'dfa_';
  var LOCAL_STORE_KEYS = ['dfa_case_filing', 'dfa_evidence_filing'];

  function resetAll(opts) {
    opts = opts || {};
    try {
      var sessionKeys = [];
      for (var i = 0; i < sessionStorage.length; i++) {
        var key = sessionStorage.key(i);
        if (key && (key.indexOf(SESSION_PREFIX) === 0 || key === 'aeroCaseData')) {
          sessionKeys.push(key);
        }
      }
      sessionKeys.forEach(function (k) {
        sessionStorage.removeItem(k);
      });

      LOCAL_STORE_KEYS.forEach(function (k) {
        localStorage.removeItem(k);
      });

      var localKeys = [];
      for (var j = 0; j < localStorage.length; j++) {
        var lk = localStorage.key(j);
        if (lk && lk.indexOf('dfa_last_visit_') === 0) localKeys.push(lk);
      }
      localKeys.forEach(function (k) {
        localStorage.removeItem(k);
      });

      if (opts.keepUser !== true && typeof setActiveUser === 'function') {
        setActiveUser(opts.userId || 'SB');
      }
    } catch (e) {
      /* storage blocked */
    }
    return true;
  }

  function refreshDemoData() {
    if (
      !confirm(
        'Reset all demo data?\n\nThis restores fresh cases, evidence packs, case files, notifications and drafts — as if opening the demo for the first time.'
      )
    ) {
      return false;
    }
    resetAll({ userId: typeof getActiveUser === 'function' ? getActiveUser() : 'SB', keepUser: true });
    window.location.href = 'index.html';
    return true;
  }

  global.DemoReset = {
    resetAll: resetAll,
    refreshDemoData: refreshDemoData,
  };
  global.refreshDemoData = refreshDemoData;
})(typeof window !== 'undefined' ? window : this);
