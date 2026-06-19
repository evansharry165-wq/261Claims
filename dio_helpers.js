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
    /* Hartley demo requests are created via Request all outstanding in evidence workspace */
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
        keys[i] === 'montreal_conv' &&
        (String(point.claim || '').toLowerCase().indexOf('montreal') >= 0 ||
          doc.indexOf('montreal') >= 0 ||
          doc.indexOf('third-party') >= 0)
      ) {
        return req;
      }
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

  function notifyEvidenceFilingComplete(ref, payload) {
    payload = payload || {};
    ref = typeof normaliseCaseRef === 'function' ? normaliseCaseRef(ref) : ref;
    var st = getEvidenceState(ref);
    if (!st.pointOverrides) st.pointOverrides = {};
    if (!st.evidenceRequests) st.evidenceRequests = {};
    if (!st.uploads) st.uploads = {};
    if (payload.pointN != null) {
      st.pointOverrides[String(payload.pointN)] = payload.status || 'green';
    }
    if (payload.requestId) {
      if (!st.evidenceRequests[payload.requestId]) {
        st.evidenceRequests[payload.requestId] = {
          id: payload.requestId,
          name: payload.label || 'Evidence filing',
          status: 'received',
          caseRef: ref,
          requestedAt: new Date().toLocaleString('en-GB'),
          requestedAtMs: Date.now()
        };
      } else {
        st.evidenceRequests[payload.requestId].status = 'received';
      }
      st.uploads[payload.requestId] = payload.fileName || st.uploads[payload.requestId] || 'filed.pdf';
    }
    saveEvidenceState(ref, st);

    var c = typeof getCase === 'function' ? getCase(ref) : null;
    if (c && c.points && payload.pointN != null) {
      c.points.forEach(function (p) {
        if (p.n === payload.pointN) {
          p.evidenceStatus = payload.status || 'green';
          if (payload.fileName) p.evidenceDoc = (p.evidenceDoc || '') + ' — ' + payload.fileName + ' on file';
        }
      });
      var resolved = c.points.filter(function (p) {
        var ov = st.pointOverrides[String(p.n)];
        return (ov || p.evidenceStatus) === 'green';
      }).length;
      var pct = c.points.length ? Math.round((resolved / c.points.length) * 100) : c.evidencePct || 0;
      c.evidencePct = pct;
      st.evidencePct = pct;
      saveEvidenceState(ref, st);
      if (typeof syncCaseEvidencePct === 'function') syncCaseEvidencePct(ref, pct, pct >= 100);
      try {
        sessionStorage.setItem('dfa_case', JSON.stringify(c));
        var aero = JSON.parse(sessionStorage.getItem('aeroCaseData') || 'null');
        if (aero && (aero.ref === ref || aero.ref === payload.aliasRef)) {
          aero.points = c.points;
          aero.evidencePct = pct;
          sessionStorage.setItem('aeroCaseData', JSON.stringify(aero));
        }
      } catch (e) {}
    }

    var assignee = c && c.assignedTo ? c.assignedTo : 'SB';
    if (typeof pushNotification === 'function') {
      pushNotification({
        to: assignee,
        type: 'evidence-filed',
        ref: ref,
        title: 'Evidence filed by DIO',
        body: (payload.label || 'Document') + ' received for ' + (c ? c.claimant : ref) + ' — review in Evidence tab.',
        tab: 'evidence'
      });
    }
    if (payload.requestId && typeof completeEvidenceRequest === 'function') {
      completeEvidenceRequest(payload.requestId);
    }
    return st;
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
    notifyEvidenceFilingComplete: notifyEvidenceFilingComplete,
  };
})(typeof window !== 'undefined' ? window : this);
