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
    if (t.indexOf('ords') >= 0 || t.indexOf('operational') >= 0) return 'Ops team — Operational delay records system / movement records';
    if (t.indexOf('crew') >= 0 || t.indexOf('roster') >= 0 || t.indexOf('css') >= 0) return 'Crew scheduling / Crew scheduling system';
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
      /* Extended keyword table — covers seed + engine + evidence-collection vocab.
         Each entry: [name-substring, doc-substring] — either match direction OK. */
      var kwPairs = [
        ['metar','metar'], ['taf','taf'], ['sigmet','sigmet'],
        ['eurocontrol','eurocontrol'], ['atfm','atfm'], ['crco','crco'], ['coda','coda'], ['nm','network manager'],
        ['crew','crew'], ['css','crew'], ['fdp','crew'], ['ords','ords'],
        ['notam','notam'], ['nots','notam'],
        ['montreal','montreal'], ['third-party','third-party'], ['third party','third party'],
        ['wildfire','fire'], ['firms','fire'], ['gdacs','disaster'], ['copernicus','ems'],
        ['strike','strike'], ['ia notice','industrial'], ['dgac','strike'], ['enac','strike'],
        ['ash','volcanic'], ['vaac','volcanic'], ['volcano','volcanic'],
        ['chart','chart'], ['synoptic','pressure'], ['met office','met office'],
        ['track','track'], ['opensky','track'], ['adsb','track'],
        ['aviation herald','incident'], ['news','news'],
        ['dpm','dpm'], ['max ops','max ops'], ['flight ops','ops'], ['ops review','ops'],
        ['airport','airport'], ['runway','runway'], ['ground','ground'],
      ];
      var kwHit = kwPairs.some(function(pair){
        return name.indexOf(pair[0]) >= 0 && doc.indexOf(pair[1]) >= 0;
      });
      if (doc.indexOf(name.slice(0, 8)) >= 0 || kwHit) {
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


  /* ── Territory model — Session 1 addition ─────────────────────────
     Each DIO owns a territory (airports + airspace + countries). Their live
     evidence feed filters to this territory automatically. Evidence requests
     from solicitors are pooled communally — visible to ALL DIOs regardless
     of jurisdiction, so workload can flex across the team. */

  var TERRITORY_MAP = {
    EH: {
      label: 'United Kingdom + Ireland',
      short_label: 'UK + IE',
      airports_icao: ['EGLL','EGKK','EGSS','EGGW','EGLC','EGCC','EGPH','EGPF','EGGD','EGBB','EGAA','EGNX','EIDW'],
      airports_iata: ['LHR','LGW','STN','LTN','LCY','MAN','EDI','GLA','BRS','BHX','BFS','EMA','DUB'],
      countries_iso: ['GB','IE'],
      countries_name: ['United Kingdom','Ireland'],
      firs: ['EGTT','EGPX','EISN'],
      keywords: ['UK','British','England','Wales','Scotland','Northern Ireland','Ireland','Britain','easyJet','British Airways','Jet2','Ryanair UK','Wizz Air UK'],
    },
    FD: {
      label: 'France',
      short_label: 'FR',
      airports_icao: ['LFPG','LFPO','LFMN','LFML','LFLL','LFBO','LFBD'],
      airports_iata: ['CDG','ORY','NCE','MRS','LYS','TLS','BOD'],
      countries_iso: ['FR'],
      countries_name: ['France'],
      firs: ['LFFF','LFMM','LFBB','LFRR','LFEE'],
      keywords: ['France','French','DGAC','Air France','Transavia France'],
    },
    SR: {
      label: 'España',
      short_label: 'ES',
      airports_icao: ['LEMD','LEBL','LEPA','LEAL','LEIB','LEMG','GCLP','GCTS','LPPT','LPPR'],
      airports_iata: ['MAD','BCN','PMI','ALC','IBZ','AGP','LPA','TFS','LIS','OPO'],
      countries_iso: ['ES','PT'],
      countries_name: ['Spain','Portugal'],
      firs: ['LECM','LECB','LECS','GCCC','LPPC'],
      keywords: ['Spain','España','Portugal','Portuguese','Vueling','Iberia','TAP','ENAIRE','AENA'],
    },
  };

  function getTerritory(uid) {
    uid = uid || (typeof getActiveUser === 'function' ? getActiveUser() : 'EH');
    return TERRITORY_MAP[uid] || TERRITORY_MAP.EH;
  }

  function matchIncidentToTerritory(item, territory) {
    if (!item || !territory) return false;
    var hay = ((item.title || '') + ' ' + (item.description || '') + ' ' +
               (item.name || '') + ' ' + (item.country || '') + ' ' + (item.iso3 || '')).toUpperCase();
    if (!hay.trim()) return false;
    var airportHit = territory.airports_icao.some(function(a){ return hay.indexOf(a) >= 0; }) ||
                     territory.airports_iata.some(function(a){ return hay.indexOf(' '+a+' ') >= 0 || hay.indexOf(a+',') >= 0 || hay.indexOf(a+')') >= 0; });
    if (airportHit) return true;
    var countryHit = territory.countries_iso.some(function(c){ return hay.indexOf(c) >= 0; }) ||
                     territory.countries_name.some(function(c){ return hay.indexOf(c.toUpperCase()) >= 0; });
    if (countryHit) return true;
    var kwHit = (territory.keywords || []).some(function(k){ return hay.indexOf(k.toUpperCase()) >= 0; });
    return kwHit;
  }

  function collectCommunalRequests() {
    var all = [];
    var cases = (typeof ALL_CASES !== 'undefined' ? ALL_CASES : []);
    cases.forEach(function (c) {
      if (c.stage === 'resolve') return;
      var st = getEvidenceState(c.ref);
      if (!st.evidenceRequests) return;
      Object.keys(st.evidenceRequests).forEach(function (k) {
        var r = st.evidenceRequests[k];
        if (r.status !== 'pending' && r.status !== 'received') return;
        var reqMs = r.requestedAtMs || Date.parse(r.requestedAt) || Date.now();
        var daysAgo = Math.max(0, Math.floor((Date.now() - reqMs) / 86400000));
        all.push({
          id: r.id || k, name: r.name || 'Evidence request', status: r.status,
          caseRef: c.ref, claimantName: c.name, flight: c.flightNum || c.flight,
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

  function caseCountByAirport(territory) {
    /* Read from CaseFiling live store first (covers engine-filed cases),
       fall back to ALL_CASES for anything not yet in the live store.
       Use dep/arr (correct airport fields) — c.origin is a source marker
       ('legal_engine') on engine cases and empty on seed cases. */
    var counts = {};
    territory.airports_icao.forEach(function(a){ counts[a] = 0; });
    var seen = {};
    function tally(c) {
      if (!c || c.stage === 'resolve' || seen[c.ref]) return;
      seen[c.ref] = true;
      var dep = (c.dep || '').toUpperCase();
      var arr = (c.arr || '').toUpperCase();
      territory.airports_iata.forEach(function(iata, i){
        if (dep === iata || arr === iata) {
          counts[territory.airports_icao[i]] = (counts[territory.airports_icao[i]] || 0) + 1;
        }
      });
    }
    if (typeof CaseFiling !== 'undefined' && CaseFiling.listCases) {
      CaseFiling.listCases({}).forEach(tally);
    }
    (typeof ALL_CASES !== 'undefined' ? ALL_CASES : []).forEach(tally);
    return counts;
  }

  
  /* dioFriendlyPointLabel — translate engine raw claim/evidenceDoc into a
     DIO-actionable label. Engine points from decideSection.critNotes come
     in like "CRIT — foo bar" or "IMPO — baz"; evidenceMarks come in with
     raw keys ("notam", "eurocontrol"). Seed cases already have human labels.
     Called at render time in dio-case.html; no schema change needed. */
  var LABEL_MAP = {
    metar: 'METAR / weather observation records',
    taf: 'TAF / weather forecast records',
    notam: 'NOTAM notices (airport / airspace)',
    eurocontrol: 'Eurocontrol ATFM / CRCO records',
    coda: 'Eurocontrol CODA delay analysis',
    dpm: 'Daily Performance Metrics report',
    max_ops: 'MAX OPS operational log',
    ops_review: 'Daily Operations Review',
    crew: 'Crew duty / FDP records',
    css: 'Crew Scheduling System export',
    fdp: 'Flight Duty Period breakdown',
    montreal_conv: 'Montreal Convention third-party contract documentation',
    ash: 'Volcanic ash advisory (VAAC)',
    fire: 'Wildfire proximity data (NASA FIRMS)',
    strike: 'Third-party industrial-action notice',
    chart: 'Met Office synoptic / SIGWX charts',
    track: 'Flight track data (OpenSky / ADS-B)',
    news: 'Aviation Herald / press incident report',
  };
  function dioFriendlyPointLabel(point) {
    if (!point) return { claim: '', evidenceDoc: '' };
    var claim = String(point.claim || '');
    var doc = String(point.evidenceDoc || '');
    // Strip legacy CRIT/IMPO/SUPP prefixes
    var cleaned = claim.replace(/^(CRIT|IMPO|SUPP)\s*[—-]\s*/i, '');
    // If claim is a bare key from evidenceMarks, look up friendly label
    var keyLookup = LABEL_MAP[cleaned.toLowerCase().replace(/[^a-z0-9_]/g,'_')];
    if (keyLookup) cleaned = keyLookup;
    // Fallback evidence doc
    if (!doc || doc === 'Marked requested' || doc === 'Marked missing' || doc === 'Engine priority' || doc === 'Condition before final response') {
      doc = 'Provide the source document / record that evidences this point';
    }
    return { claim: cleaned, evidenceDoc: doc };
  }

  /* ensureCaseSummary — fallback so DIO surfaces never render empty caseSummary.
     Uses triageNote if caseSummary missing; falls back to a short auto-summary
     built from route + disruption type. Called by DIO surfaces on read. */
  function ensureCaseSummary(c) {
    if (!c) return '';
    if (c.caseSummary && c.caseSummary.trim()) return c.caseSummary;
    if (c.triageNote && c.triageNote.trim()) return c.triageNote;
    var parts = [];
    if (c.flightNum) parts.push(c.flightNum);
    if (c.dep && c.arr) parts.push(c.dep + ' → ' + c.arr);
    if (c.flightDate) parts.push('on ' + c.flightDate);
    if (c.disruptionType) parts.push('· ' + c.disruptionType);
    if (c.classification) parts.push('(' + c.classification + ')');
    return parts.join(' ') || 'Case awaiting summary';
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
    TERRITORY_MAP: TERRITORY_MAP,
    getTerritory: getTerritory,
    matchIncidentToTerritory: matchIncidentToTerritory,
    collectCommunalRequests: collectCommunalRequests,
    caseCountByAirport: caseCountByAirport,
    dioFriendlyPointLabel: dioFriendlyPointLabel,
    ensureCaseSummary: ensureCaseSummary,
    LABEL_MAP: LABEL_MAP,
  };
})(typeof window !== 'undefined' ? window : this);
