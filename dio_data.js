/* DIO · data — request collectors, evidence gaps, portfolio, engine intake, notifications.
   Session 1 of Option B: split of the original 669-line dio_helpers.js.
   Depends on: DIOCore + DIOTerritory. */
(function (global) {
  'use strict';

  var EVENTS_KEY = 'dfa_disruption_events';
  var PENDING_KNOWLEDGE_KEY = 'dfa_dio_pending_knowledge';

  /* ── Evidence requests + gaps ─────────────────────────────────────── */
  function collectEvidenceRequests(jur) {
    var out = [];
    DIOTerritory.jurisdictionCases(jur).forEach(function (c) {
      var st = DIOCore.getEvidenceState(c.ref);
      if (!st.evidenceRequests) return;
      Object.keys(st.evidenceRequests).forEach(function (k) {
        var r = st.evidenceRequests[k];
        if (r.status !== 'pending' && r.status !== 'received') return;
        var reqMs = r.requestedAtMs || Date.parse(r.requestedAt) || Date.now();
        var daysAgo = Math.max(0, Math.floor((Date.now() - reqMs) / 86400000));
        out.push({
          id: r.id || k, name: r.name || 'Evidence request', status: r.status,
          caseRef: c.ref, claimantName: c.claimant, flight: c.flightNum || c.flight,
          cprDaysLeft: c.cprDaysLeft || 21, requestedBy: r.requestedBy || 'Legal',
          daysAgo: daysAgo, overdue: daysAgo > (r.slaDays || 3),
        });
      });
    });
    out.sort(function (a, b) {
      if (a.overdue && !b.overdue) return -1;
      if (!a.overdue && b.overdue) return 1;
      return (b.daysAgo || 0) - (a.daysAgo || 0);
    });
    return out;
  }

  function collectEvidenceGaps(jur) {
    return DIOTerritory.jurisdictionCases(jur)
      .filter(function (c) {
        return c.evidencePct < 100 && c.stage === 'evidence' && !DIOCore.caseHasOpenRequest(c.ref);
      })
      .map(function (c) {
        var missing = (c.points || []).filter(function (p) {
          return p.evidenceStatus === 'red' || p.evidenceStatus === 'amber';
        });
        return {
          ref: c.ref, claimant: c.claimant, missingCount: missing.length,
          cprDaysLeft: c.cprDaysLeft || 21, evidencePct: c.evidencePct || 0,
        };
      })
      .sort(function (a, b) {
        return (a.cprDaysLeft || 99) - (b.cprDaysLeft || 99);
      });
  }

  function collectCommunalRequests() {
    var all = [];
    var cases = (typeof ALL_CASES !== 'undefined' ? ALL_CASES : []);
    cases.forEach(function (c) {
      if (c.stage === 'resolve') return;
      var st = DIOCore.getEvidenceState(c.ref);
      if (!st.evidenceRequests) return;
      Object.keys(st.evidenceRequests).forEach(function (k) {
        var r = st.evidenceRequests[k];
        if (r.status !== 'pending' && r.status !== 'received') return;
        var reqMs = r.requestedAtMs || Date.parse(r.requestedAt) || Date.now();
        var daysAgo = Math.max(0, Math.floor((Date.now() - reqMs) / 86400000));
        all.push({
          id: r.id || k, name: r.name || 'Evidence request', status: r.status,
          caseRef: c.ref, claimantName: c.claimant, flight: c.flightNum || c.flight,
          jurisdiction: c.jurisdiction, cprDaysLeft: c.cprDaysLeft || 21,
          requestedBy: r.requestedBy || 'Legal', daysAgo: daysAgo,
          overdue: daysAgo > (r.slaDays || 3),
        });
      });
    });
    all.sort(function (a, b) {
      if (a.overdue && !b.overdue) return -1;
      if (!a.overdue && b.overdue) return 1;
      return (b.daysAgo || 0) - (a.daysAgo || 0);
    });
    return all;
  }

  /* ── Disruption events (session-storage patched over base list) ───── */
  function loadDisruptionEvents(jur) {
    var base = (typeof DISRUPTION_EVENTS !== 'undefined' ? DISRUPTION_EVENTS : []).slice();
    try {
      var stored = JSON.parse(sessionStorage.getItem(EVENTS_KEY) || 'null');
      if (stored && Array.isArray(stored)) {
        var map = {};
        stored.forEach(function (e) { map[e.id] = e; });
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
    var idx = stored.findIndex(function (e) { return e.id === id; });
    if (idx >= 0) stored[idx] = Object.assign({}, stored[idx], patch);
    else stored.push(Object.assign({ id: id }, patch));
    sessionStorage.setItem(EVENTS_KEY, JSON.stringify(stored));
  }

  function sourceHint(text) {
    var l = String(text || '').toLowerCase();
    if (l.indexOf('metar') >= 0 || l.indexOf('sigmet') >= 0 || l.indexOf('weather') >= 0) return 'Met Office / METAR';
    if (l.indexOf('crco') >= 0 || l.indexOf('eurocontrol') >= 0 || l.indexOf('atfm') >= 0) return 'Eurocontrol B2B';
    if (l.indexOf('crew') >= 0 || l.indexOf('fdp') >= 0) return 'MAX OPS / Crew scheduling';
    if (l.indexOf('notam') >= 0) return 'FAA / AutoRouter NOTAM feed';
    if (l.indexOf('montreal') >= 0 || l.indexOf('third-party') >= 0) return 'Contract archive · DIO chase';
    return null;
  }

  function solicitorCountForJurisdiction(jur) {
    if (typeof USERS === 'undefined') return 0;
    return Object.keys(USERS).filter(function (uid) {
      var u = USERS[uid];
      return u && u.team !== 'dio' && u.jurisdiction === jur;
    }).length;
  }

  /* ── Pending-knowledge store (DIO publishes → solicitor sees) ─────── */
  function loadPendingKnowledge() {
    try {
      return JSON.parse(sessionStorage.getItem(PENDING_KNOWLEDGE_KEY) || '[]') || [];
    } catch (e) { return []; }
  }

  function savePendingKnowledge(entries) {
    try {
      sessionStorage.setItem(PENDING_KNOWLEDGE_KEY, JSON.stringify(entries));
    } catch (e) {}
  }

  function addPendingKnowledge(entry) {
    var e = loadPendingKnowledge();
    e.unshift(entry);
    savePendingKnowledge(e.slice(0, 50));
  }

  function ensureDemoEvidenceRequests() {
    /* Hartley demo requests are created via Request all outstanding in evidence workspace */
  }

  /* ── Point ↔ request matching ─────────────────────────────────────── */
  function findRequestForPoint(ref, point) {
    var st = DIOCore.getEvidenceState(ref);
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
      var kwPairs = [
        ['metar','metar'],['taf','taf'],['sigmet','sigmet'],
        ['eurocontrol','eurocontrol'],['atfm','atfm'],['crco','crco'],['coda','coda'],['nm','network manager'],
        ['crew','crew'],['css','crew'],['fdp','crew'],['ords','ords'],
        ['notam','notam'],['nots','notam'],
        ['montreal','montreal'],['third-party','third-party'],['third party','third party'],
        ['wildfire','fire'],['firms','fire'],['gdacs','disaster'],['copernicus','ems'],
        ['strike','strike'],['ia notice','industrial'],['dgac','strike'],['enac','strike'],
        ['ash','volcanic'],['vaac','volcanic'],['volcano','volcanic'],
        ['chart','chart'],['synoptic','pressure'],['met office','met office'],
        ['track','track'],['opensky','track'],['adsb','track'],
        ['aviation herald','incident'],['news','news'],
        ['dpm','dpm'],['max ops','max ops'],['flight ops','ops'],['ops review','ops'],
        ['airport','airport'],['runway','runway'],['ground','ground'],
      ];
      var kwHit = kwPairs.some(function (pair) {
        return name.indexOf(pair[0]) >= 0 && doc.indexOf(pair[1]) >= 0;
      });
      if (doc.indexOf(name.slice(0, 8)) >= 0 || kwHit) {
        return req;
      }
    }
    return null;
  }

  /* ── Solicitor notification loop-back ─────────────────────────────── */
  function notifyEvidenceFilingComplete(ref, payload) {
    payload = payload || {};
    ref = typeof normaliseCaseRef === 'function' ? normaliseCaseRef(ref) : ref;
    var st = DIOCore.getEvidenceState(ref);
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
          requestedAtMs: Date.now(),
        };
      } else {
        st.evidenceRequests[payload.requestId].status = 'received';
      }
    }
    if (payload.fileName) st.uploads[payload.requestId || 'bulk'] = payload.fileName;
    DIOCore.saveEvidenceState(ref, st);

    // Recompute case evidence-pct + push notification via CaseFiling
    if (typeof CaseFiling !== 'undefined') {
      var c = CaseFiling.getCase(ref);
      if (c && c.points) {
        var resolved = c.points.filter(function (p) {
          var ov = st.pointOverrides[String(p.n)];
          return (ov || p.evidenceStatus) === 'green';
        }).length;
        var pct = c.points.length ? Math.round((resolved / c.points.length) * 100) : c.evidencePct || 0;
        c.evidencePct = pct;
        st.evidencePct = pct;
        DIOCore.saveEvidenceState(ref, st);
        if (CaseFiling.updateCaseMeta) CaseFiling.updateCaseMeta(ref, { evidencePct: pct });
        if (payload.aliasRef && payload.aliasRef !== ref) {
          var aero = CaseFiling.getCase(payload.aliasRef);
          if (aero) {
            aero.evidencePct = pct;
            CaseFiling.updateCaseMeta(payload.aliasRef, { evidencePct: pct });
          }
        }
      }
      if (CaseFiling.addActivity) {
        CaseFiling.addActivity(ref, 'Evidence filed by DIO', 'evidence', 'E. Hughes');
      }
      if (typeof pushNotification === 'function' && c) {
        pushNotification({
          to: c.assignedTo || 'SB',
          type: 'evidence-filed',
          ref: ref,
          title: 'Evidence filed by DIO',
          body: (payload.label || 'Evidence item') + ' — ' + (c.claimant || ref),
          time: new Date().toLocaleString('en-GB'),
          read: false,
        });
      }
    }
  }

  /* ── Portfolio matrix (used by dio.html Portfolio widget) ─────────── */
  function collectPortfolioMatrix(uid) {
    var cases = DIOTerritory.casesInTerritory(uid);
    return cases.map(function (c) {
      var attachCount = 0;
      var lastAttach = DIOTerritory.staleAttachDays(c.ref);
      if (typeof CaseFiling !== 'undefined' && CaseFiling.getCase) {
        var cf = CaseFiling.getCase(c.ref);
        var repo = cf && cf.meta && cf.meta.evidenceRepository;
        attachCount = (repo && repo.items) ? repo.items.length : 0;
      }
      var pointsTotal = (c.points || []).length;
      var pointsRed = (c.points || []).filter(function (p) { return (p.evidenceStatus || 'red') === 'red'; }).length;
      var pointsAmber = (c.points || []).filter(function (p) { return p.evidenceStatus === 'amber'; }).length;
      return {
        ref: c.ref, claimant: c.claimant, flightNum: c.flightNum || c.flight, dep: c.dep, arr: c.arr,
        flightDate: c.flightDate || '', stage: c.stage, evidencePct: c.evidencePct || 0,
        cprDaysLeft: c.cprDaysLeft || 21, disruptionType: c.disruptionType || '',
        classification: c.classification || '', triageNote: c.triageNote || '',
        source: c.source || c.origin || 'seed',
        attachCount: attachCount, staleDays: lastAttach,
        pointsTotal: pointsTotal, pointsRed: pointsRed, pointsAmber: pointsAmber,
        gapScore: (pointsRed * 3) + pointsAmber + (attachCount === 0 ? 5 : 0),
      };
    }).sort(function (a, b) {
      var aScore = a.gapScore + (a.cprDaysLeft <= 7 ? 10 : a.cprDaysLeft <= 14 ? 5 : 0);
      var bScore = b.gapScore + (b.cprDaysLeft <= 7 ? 10 : b.cprDaysLeft <= 14 ? 5 : 0);
      return bScore - aScore;
    });
  }

  function collectEngineIntake() {
    if (typeof CaseFiling === 'undefined' || !CaseFiling.listCases) return [];
    return CaseFiling.listCases({}).filter(function (c) {
      var isEngine = c.source === 'engine' || c.origin === 'legal_engine';
      var needsReview = c.stage === 'inbox' || c.stage === 'triage';
      return isEngine && needsReview;
    }).sort(function (a, b) {
      return (a.cprDaysLeft || 99) - (b.cprDaysLeft || 99);
    });
  }

  function collectRecentActivity(uid, limit) {
    limit = limit || 8;
    var cases = DIOTerritory.casesInTerritory(uid).slice(0, 30);
    var acts = [];
    cases.forEach(function (c) {
      if (typeof CaseFiling === 'undefined' || !CaseFiling.getCase) return;
      var cf = CaseFiling.getCase(c.ref);
      if (!cf || !cf.activity) return;
      cf.activity.slice(-4).forEach(function (a) {
        acts.push({ text: a.text, time: a.time, type: a.type, by: a.by, ref: c.ref, claimant: c.claimant });
      });
    });
    acts.sort(function (a, b) { return String(b.time || '').localeCompare(String(a.time || '')); });
    return acts.slice(0, limit);
  }

  global.DIOData = {
    collectEvidenceRequests: collectEvidenceRequests,
    collectEvidenceGaps: collectEvidenceGaps,
    collectCommunalRequests: collectCommunalRequests,
    loadDisruptionEvents: loadDisruptionEvents,
    saveDisruptionEventPatch: saveDisruptionEventPatch,
    sourceHint: sourceHint,
    solicitorCountForJurisdiction: solicitorCountForJurisdiction,
    loadPendingKnowledge: loadPendingKnowledge,
    savePendingKnowledge: savePendingKnowledge,
    addPendingKnowledge: addPendingKnowledge,
    ensureDemoEvidenceRequests: ensureDemoEvidenceRequests,
    findRequestForPoint: findRequestForPoint,
    notifyEvidenceFilingComplete: notifyEvidenceFilingComplete,
    collectPortfolioMatrix: collectPortfolioMatrix,
    collectEngineIntake: collectEngineIntake,
    collectRecentActivity: collectRecentActivity,
  };
})(typeof window !== 'undefined' ? window : this);
