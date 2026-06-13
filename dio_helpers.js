/* DIO — shared helpers for purpose-built DIO interface */
(function (global) {
  'use strict';

  var JUR_LABELS = {
    'england-wales': '🇬🇧 England & Wales',
    france: '🇫🇷 France',
    spain: '🇪🇸 Spain',
  };

  var EVENTS_KEY = 'dfa_disruption_events';
  var PENDING_KNOWLEDGE_KEY = 'dfa_dio_pending_knowledge';

  function isDIOUser(uid) {
    uid = uid || (typeof getActiveUser === 'function' ? getActiveUser() : '');
    var u = typeof USERS !== 'undefined' ? USERS[uid] : null;
    return !!(u && u.team === 'dio');
  }

  function getDIOProfile(uid) {
    uid = uid || (typeof getActiveUser === 'function' ? getActiveUser() : 'EH');
    var u = typeof USERS !== 'undefined' ? USERS[uid] : null;
    return {
      uid: uid,
      user: u,
      jurisdiction: (u && u.jurisdiction) || 'england-wales',
      label: JUR_LABELS[(u && u.jurisdiction) || 'england-wales'] || 'England & Wales',
    };
  }

  function ensureDIOAccess(redirect) {
    if (!isDIOUser()) {
      window.location.replace(redirect || 'index.html');
      return false;
    }
    return true;
  }

  function guardModuleAccess() {
    if (!isDIOUser()) return;
    var p = window.location.pathname.split('/').pop() || '';
    if (/^module[2345]/.test(p) || p === 'case.html') {
      var ref = new URLSearchParams(window.location.search).get('ref');
      window.location.replace(ref ? 'dio-case.html?ref=' + encodeURIComponent(ref) : 'dio.html');
    }
  }

  function dioCaseUrl(ref) {
    return 'dio-case.html?ref=' + encodeURIComponent(ref || '');
  }

  function jurisdictionCases(jur) {
    return (typeof ALL_CASES !== 'undefined' ? ALL_CASES : []).filter(function (c) {
      return c.jurisdiction === jur && c.stage !== 'resolve';
    });
  }

  function getEvidenceState(ref) {
    try {
      return JSON.parse(sessionStorage.getItem('dfa_evidence_' + ref) || 'null') || {};
    } catch (e) {
      return {};
    }
  }

  function saveEvidenceState(ref, state) {
    try {
      sessionStorage.setItem('dfa_evidence_' + ref, JSON.stringify(state));
    } catch (e) {}
  }

  function caseHasOpenRequest(ref) {
    var st = getEvidenceState(ref);
    var reqs = st.evidenceRequests || {};
    return Object.keys(reqs).some(function (k) {
      return reqs[k].status === 'pending' || reqs[k].status === 'received';
    });
  }

  function collectEvidenceRequests(jur) {
    var out = [];
    jurisdictionCases(jur).forEach(function (c) {
      var st = getEvidenceState(c.ref);
      if (!st.evidenceRequests) return;
      Object.keys(st.evidenceRequests).forEach(function (k) {
        var req = st.evidenceRequests[k];
        if (req.status !== 'pending' && req.status !== 'received') return;
        var daysAgo = req.requestedAtMs
          ? Math.floor((Date.now() - req.requestedAtMs) / 86400000)
          : 0;
        out.push(
          Object.assign({}, req, {
            id: k,
            caseRef: c.ref,
            claimant: c.claimant,
            cprDaysLeft: c.cprDaysLeft || 21,
            daysAgo: daysAgo,
            overdue: daysAgo > (req.slaDays || 5),
          })
        );
      });
    });
    out.sort(function (a, b) {
      if (a.overdue && !b.overdue) return -1;
      if (!a.overdue && b.overdue) return 1;
      return (a.cprDaysLeft || 99) - (b.cprDaysLeft || 99);
    });
    return out;
  }

  function collectEvidenceGaps(jur) {
    return jurisdictionCases(jur)
      .filter(function (c) {
        return c.evidencePct < 100 && c.stage === 'evidence' && !caseHasOpenRequest(c.ref);
      })
      .map(function (c) {
        var missing = (c.points || []).filter(function (p) {
          return p.evidenceStatus === 'red' || p.evidenceStatus === 'amber';
        });
        return {
          ref: c.ref,
          claimant: c.claimant,
          missingCount: missing.length,
          cprDaysLeft: c.cprDaysLeft || 21,
          evidencePct: c.evidencePct || 0,
        };
      })
      .sort(function (a, b) {
        return (a.cprDaysLeft || 99) - (b.cprDaysLeft || 99);
      });
  }

  function loadDisruptionEvents(jur) {
    var base = (typeof DISRUPTION_EVENTS !== 'undefined' ? DISRUPTION_EVENTS : []).slice();
    try {
      var stored = JSON.parse(sessionStorage.getItem(EVENTS_KEY) || 'null');
      if (stored && Array.isArray(stored)) {
        var map = {};
        stored.forEach(function (e) {
          map[e.id] = e;
        });
        base = base.map(function (e) {
          return map[e.id] ? Object.assign({}, e, map[e.id]) : e;
        });
      }
    } catch (e) {}
    if (jur) {
      base = base.filter(function (e) {
        return !e.jurisdiction || e.jurisdiction === jur;
      });
    }
    return base;
  }

  function saveDisruptionEventPatch(id, patch) {
    var stored = [];
    try {
      stored = JSON.parse(sessionStorage.getItem(EVENTS_KEY) || '[]') || [];
    } catch (e) {
      stored = [];
    }
    var idx = stored.findIndex(function (e) {
      return e.id === id;
    });
    if (idx >= 0) stored[idx] = Object.assign({}, stored[idx], patch);
    else stored.push(Object.assign({ id: id }, patch));
    try {
      sessionStorage.setItem(EVENTS_KEY, JSON.stringify(stored));
    } catch (e) {}
  }

  function sourceHint(text) {
    var t = String(text || '').toLowerCase();
    if (t.indexOf('metar') >= 0 || t.indexOf('sigmet') >= 0 || t.indexOf('notam') >= 0 || t.indexOf('aemet') >= 0)
      return 'Met office / NOTAM archive';
    if (t.indexOf('eurocontrol') >= 0 || t.indexOf('atfm') >= 0 || t.indexOf('atc') >= 0) return 'Eurocontrol / Ops ATFM desk';
    if (t.indexOf('tops') >= 0 || t.indexOf('operational') >= 0) return 'Ops team — TOPS / movement records';
    if (t.indexOf('crew') >= 0 || t.indexOf('roster') >= 0 || t.indexOf('aims') >= 0) return 'Crew scheduling / AIMS';
    if (t.indexOf('ground') >= 0 || t.indexOf('valencia') >= 0) return 'Ground handling / station records';
    return 'Ops team / repository search';
  }

  function solicitorCountForJurisdiction(jur) {
    var keys = { 'england-wales': ['SB', 'JP', 'KR'], france: ['MD', 'PL'], spain: ['CG', 'IM'] };
    return (keys[jur] || []).length;
  }

  function loadPendingKnowledge() {
    try {
      var raw = sessionStorage.getItem(PENDING_KNOWLEDGE_KEY);
      if (raw) return JSON.parse(raw) || [];
    } catch (e) {}
    return [];
  }

  function savePendingKnowledge(entries) {
    try {
      sessionStorage.setItem(PENDING_KNOWLEDGE_KEY, JSON.stringify(entries));
    } catch (e) {}
  }

  function addPendingKnowledge(entry) {
    var list = loadPendingKnowledge();
    list.unshift(entry);
    savePendingKnowledge(list.slice(0, 20));
    return list;
  }

  function ensureDemoEvidenceRequests() {
    try {
      var key = 'dfa_evidence_DEF-2026-EW-0089';
      var st = JSON.parse(sessionStorage.getItem(key) || 'null');
      if (st && st.evidenceRequests && Object.keys(st.evidenceRequests).length) return;
      var baseMs = Date.now() - 8 * 86400000;
      var baseMs2 = Date.now() - 2 * 86400000;
      st = st || {};
      st.evidenceRequests = {
        eurocontrol: {
          id: 'eurocontrol',
          name: 'Eurocontrol CRCO reference',
          recipient: 'Ops team',
          recipientEmail: 'ops-legal@[client].com',
          requestedBy: 'S. Booth',
          requestedAt: '4 Jun 2026 10:00',
          requestedAtMs: baseMs,
          slaDays: 5,
          status: 'pending',
          caseRef: 'DEF-2026-EW-0089',
          cprDaysLeft: 3,
        },
        aims: {
          id: 'aims',
          name: 'Crew roster records (AIMS)',
          recipient: 'Crew scheduling',
          recipientEmail: 'crew-scheduling@[client].com',
          requestedBy: 'S. Booth',
          requestedAt: '10 Jun 2026 14:30',
          requestedAtMs: baseMs2,
          slaDays: 5,
          status: 'pending',
          caseRef: 'DEF-2026-EW-0089',
          cprDaysLeft: 3,
        },
      };
      sessionStorage.setItem(key, JSON.stringify(st));
    } catch (e) {}
  }

  function findRequestForPoint(ref, point) {
    var st = getEvidenceState(ref);
    var reqs = st.evidenceRequests || {};
    var doc = String(point.evidenceDoc || '').toLowerCase();
    var keys = Object.keys(reqs);
    for (var i = 0; i < keys.length; i++) {
      var req = reqs[keys[i]];
      var name = String(req.name || '').toLowerCase();
      if (
        doc.indexOf(name.slice(0, 8)) >= 0 ||
        name.indexOf('metar') >= 0 && doc.indexOf('metar') >= 0 ||
        name.indexOf('eurocontrol') >= 0 && doc.indexOf('eurocontrol') >= 0 ||
        name.indexOf('crew') >= 0 && doc.indexOf('crew') >= 0 ||
        name.indexOf('aims') >= 0 && doc.indexOf('crew') >= 0 ||
        name.indexOf('tops') >= 0 && doc.indexOf('tops') >= 0
      ) {
        return req;
      }
    }
    return null;
  }

  global.DIO = {
    JUR_LABELS: JUR_LABELS,
    isDIOUser: isDIOUser,
    getDIOProfile: getDIOProfile,
    ensureDIOAccess: ensureDIOAccess,
    guardModuleAccess: guardModuleAccess,
    dioCaseUrl: dioCaseUrl,
    jurisdictionCases: jurisdictionCases,
    getEvidenceState: getEvidenceState,
    saveEvidenceState: saveEvidenceState,
    caseHasOpenRequest: caseHasOpenRequest,
    collectEvidenceRequests: collectEvidenceRequests,
    collectEvidenceGaps: collectEvidenceGaps,
    loadDisruptionEvents: loadDisruptionEvents,
    saveDisruptionEventPatch: saveDisruptionEventPatch,
    sourceHint: sourceHint,
    solicitorCountForJurisdiction: solicitorCountForJurisdiction,
    loadPendingKnowledge: loadPendingKnowledge,
    addPendingKnowledge: addPendingKnowledge,
    ensureDemoEvidenceRequests: ensureDemoEvidenceRequests,
    findRequestForPoint: findRequestForPoint,
  };
})(typeof window !== 'undefined' ? window : this);
