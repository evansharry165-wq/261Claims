/* STATE engine — persists ALL_CASES and notes to localStorage */
(function (global) {
  var STORAGE_KEY = '261c_cases';
  var NOTES_KEY = '261c_notes';
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

  function loadNotesStore() {
    try {
      var raw = localStorage.getItem(NOTES_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return {};
  }

  function saveNotesStore(store) {
    try {
      localStorage.setItem(NOTES_KEY, JSON.stringify(store));
    } catch (e) {}
  }

  function seedDemoNotes() {
    var store = loadNotesStore();
    if (!store['AC-2026-0089'] || !store['AC-2026-0089'].length) {
      store['AC-2026-0089'] = [
        {
          text: 'Called Pemberton re: consequential loss — they will not accept without FDR evidence. Escalating to senior counsel.',
          userId: 'SB',
          time: '6 Jun 2026, 14:30'
        }
      ];
      saveNotesStore(store);
    }
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
    seedDemoNotes();
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
    getNotes: function (ref) {
      var store = loadNotesStore();
      return (store[ref] || []).slice();
    },
    addNote: function (ref, note) {
      var store = loadNotesStore();
      if (!store[ref]) store[ref] = [];
      var entry = Object.assign(
        {
          time: new Date().toLocaleString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })
        },
        note || {}
      );
      store[ref].unshift(entry);
      store[ref] = store[ref].slice(0, 50);
      saveNotesStore(store);
      return entry;
    },
    assignCase: function (ref, uid) {
      return this.updateCase(ref, { assignedTo: uid });
    },
    getCaseLoad: function (uid) {
      return (ALL_CASES || []).filter(function (c) {
        return c.assignedTo === uid && c.stage !== 'resolve';
      }).length;
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
