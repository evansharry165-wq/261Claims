/* DIO · core — auth, profile, guards, session-storage helpers, label utils.
   Session 1 of Option B: split of the original 669-line dio_helpers.js. */
(function (global) {
  'use strict';

  var JUR_LABELS = {
    'england-wales': '🇬🇧 England & Wales',
    france: '🇫🇷 France',
    spain: '🇪🇸 Spain',
  };

  /* ── Auth / profile ───────────────────────────────────────────────── */
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

  /* ── Access guards (single home for DIO route policy) ─────────────── */
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

  /* ── Per-case evidence state (session-storage backed) ─────────────── */
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

  /* ── Label helpers — engine points → DIO-friendly text ────────────── */
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
    var cleaned = claim.replace(/^(CRIT|IMPO|SUPP)\s*[—-]\s*/i, '');
    var keyLookup = LABEL_MAP[cleaned.toLowerCase().replace(/[^a-z0-9_]/g, '_')];
    if (keyLookup) cleaned = keyLookup;
    if (!doc || doc === 'Marked requested' || doc === 'Marked missing' || doc === 'Engine priority' || doc === 'Condition before final response') {
      doc = 'Provide the source document / record that evidences this point';
    }
    return { claim: cleaned, evidenceDoc: doc };
  }

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

  global.DIOCore = {
    isDIOUser: isDIOUser,
    getDIOProfile: getDIOProfile,
    ensureDIOAccess: ensureDIOAccess,
    guardModuleAccess: guardModuleAccess,
    dioCaseUrl: dioCaseUrl,
    getEvidenceState: getEvidenceState,
    saveEvidenceState: saveEvidenceState,
    caseHasOpenRequest: caseHasOpenRequest,
    LABEL_MAP: LABEL_MAP,
    dioFriendlyPointLabel: dioFriendlyPointLabel,
    ensureCaseSummary: ensureCaseSummary,
    JUR_LABELS: JUR_LABELS,
  };
})(typeof window !== 'undefined' ? window : this);
