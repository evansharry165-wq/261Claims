/* STATE engine — persists ALL_CASES to localStorage */
(function (global) {
  var STORAGE_KEY = '261c_cases';
  var USER_KEY = '261c_user';

  function loadStored() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return null;
  }

  function saveCases() {
    if (typeof ALL_CASES === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ALL_CASES));
    } catch (e) {}
  }

  function hydrate() {
    if (typeof ALL_CASES === 'undefined') return;
    var stored = loadStored();
    if (stored && stored.length) {
      ALL_CASES.length = 0;
      stored.forEach(function (c) {
        ALL_CASES.push(c);
      });
    } else {
      saveCases();
    }
  }

  function generateNextRef() {
    var max = 0;
    (ALL_CASES || []).forEach(function (c) {
      var m = String(c.ref || '').match(/^AC-2026-(\d{4})$/);
      if (m) max = Math.max(max, parseInt(m[1], 10));
    });
    return 'AC-2026-' + String(max + 1).padStart(4, '0');
  }

  var STATE = {
    init: hydrate,
    save: saveCases,
    getCases: function () {
      return ALL_CASES;
    },
    getCase: function (ref) {
      return ALL_CASES.find(function (c) {
        return c.ref === ref;
      }) || null;
    },
    addCase: function (c) {
      ALL_CASES.unshift(c);
      saveCases();
      return c;
    },
    updateCase: function (ref, patch) {
      var c = this.getCase(ref);
      if (!c) return null;
      Object.keys(patch || {}).forEach(function (k) {
        c[k] = patch[k];
      });
      saveCases();
      return c;
    },
    appendActivity: function (ref, entry) {
      var c = this.getCase(ref);
      if (!c) return null;
      if (!c.activity) c.activity = [];
      c.activity.unshift(entry);
      saveCases();
      return c;
    },
    generateNextRef: generateNextRef,
    getActiveUser: function () {
      return sessionStorage.getItem(USER_KEY) || 'SB';
    },
    setActiveUser: function (id) {
      sessionStorage.setItem(USER_KEY, id);
    },
    reset: function () {
      localStorage.removeItem(STORAGE_KEY);
      location.reload();
    }
  };

  global.STATE = STATE;
  hydrate();
})(typeof window !== 'undefined' ? window : this);
