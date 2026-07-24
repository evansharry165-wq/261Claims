// Case routing and task helpers — Phase 1 redesign

var STAGE_TAB_MAP = {
  intake: 'overview',
  triage: 'triage',
  cpr: 'deadlines',
  evidence: 'evidence',
  drafting: 'documents',
  defence: 'terminal',
  resolve: 'overview'
};

var LEGACY_WORKSPACE_ROUTES = {
  overview: 'module2-case-workspace.html',
  triage: 'module2-case-workspace.html',
  deadlines: 'module3-cpr-workspace.html',
  evidence: 'module4-evidence-workspace.html',
  documents: 'module5-drafting-workspace.html',
  terminal: 'module8-terminal-workspace.html',
  activity: 'module2-case-workspace.html'
};

function getPrimaryTab(c) {
  if (!c) return 'overview';
  // Engine-filed cases open on Overview so the reworked LOF/evidence/LOC/verdict panels are the entry point.
  if (c && (c.origin === 'legal_engine' || c.source === 'engine')) return 'overview';
  return STAGE_TAB_MAP[c.stage] || 'overview';
}

function CASE_ROUTE(ref, tab) {
  var q = 'case.html?ref=' + encodeURIComponent(ref);
  if (tab) q += '&tab=' + encodeURIComponent(tab);
  return q;
}

function legacyRouteForTab(tab) {
  return LEGACY_WORKSPACE_ROUTES[tab] || LEGACY_WORKSPACE_ROUTES.overview;
}

function routeForStage(stage) {
  var tab = STAGE_TAB_MAP[stage] || 'overview';
  return legacyRouteForTab(tab);
}

function getStoredEvidencePct(ref) {
  try {
    var st = JSON.parse(sessionStorage.getItem('dfa_evidence_' + ref) || 'null');
    if (st && typeof st.evidencePct === 'number') return st.evidencePct;
  } catch (e) {}
  return null;
}

function syncCaseEvidencePct(ref, pct, readyForDrafting) {
  var c = typeof getCase === 'function' ? getCase(ref) : null;
  if (!c) return;
  c.evidencePct = pct;
  if (readyForDrafting) {
    c.evidenceReady = true;
    c.classification = 'DRAFTING';
  }
  try {
    var stored = JSON.parse(sessionStorage.getItem('dfa_case') || 'null');
    if (stored && stored.ref === ref) {
      stored.evidencePct = pct;
      if (readyForDrafting) {
        stored.evidenceReady = true;
        stored.classification = 'DRAFTING';
      }
      sessionStorage.setItem('dfa_case', JSON.stringify(stored));
    }
    var aero = JSON.parse(sessionStorage.getItem('aeroCaseData') || 'null');
    if (aero && aero.ref === ref) {
      aero.evidencePct = pct;
      sessionStorage.setItem('aeroCaseData', JSON.stringify(aero));
    }
  } catch (e) {}
}

function getEffectiveEvidencePct(c) {
  if (!c) return 0;
  var stored = getStoredEvidencePct(c.ref);
  return stored !== null ? stored : c.evidencePct || 0;
}

function hasApprovedSendPack(ref) {
  if (typeof CaseFiling === 'undefined') return false;
  return !!(CaseFiling.findByDocKey(ref, 'lor') || CaseFiling.findByDocKey(ref, 'defence'));
}

function getNextAction(c) {
  if (!c) return { text: 'Open case', tab: 'overview', icon: 'ti-file', urgency: 99 };
  var tab = getPrimaryTab(c);
  var text = 'Review case';
  var icon = 'ti-file';
  var evPct = getEffectiveEvidencePct(c);

  if (c.origin === 'legal_engine' && c.locReady === false) {
    return {
      text: 'Awaiting Letter of Claim — flag when LOC arrives',
      tab: 'overview',
      icon: 'ti-mail',
      urgency: c.cprDaysLeft,
      blocker: 'LOC'
    };
  }

  if (c.stage === 'intake') {
    text = 'Review extracted claim and confirm triage';
    tab = 'triage';
    icon = 'ti-inbox';
  } else if (c.stage === 'triage') {
    text = 'Complete triage checklist';
    tab = 'triage';
    icon = 'ti-search';
  } else if (c.stage === 'cpr') {
    text = c.loaStatus === 'sent' || c.loaStatus === 'approved' ? 'Review CPR deadlines' : 'Send letter of acknowledgement';
    tab = 'deadlines';
    icon = 'ti-calendar-due';
  } else if (c.stage === 'evidence' && evPct < 100) {
    text = 'Complete gold evidence pack';
    tab = 'evidence';
    icon = 'ti-folder-open';
  } else if (c.stage === 'evidence' && evPct >= 100) {
    text = 'Move to drafting';
    tab = 'documents';
    icon = 'ti-file-pencil';
  } else if (c.stage === 'drafting' && typeof hasApprovedSendPack === 'function' && hasApprovedSendPack(c.ref)) {
    text = 'Finish and send response — Terminal';
    tab = 'terminal';
    icon = 'ti-send';
  } else if (c.stage === 'drafting' || c.stage === 'defence') {
    text = c.stage === 'defence' ? 'Review sent response in Terminal' : 'Review AI draft and sign off';
    tab = c.stage === 'defence' ? 'terminal' : 'documents';
    icon = c.stage === 'defence' ? 'ti-send' : 'ti-file-pencil';
  } else if (c.stage === 'resolve') {
    text = 'Review resolved case';
    tab = 'overview';
    icon = 'ti-circle-check';
  }

  if (c.cprDaysLeft <= 7 && c.stage !== 'resolve' && c.stage !== 'intake') {
    if (c.stage === 'cpr' && (!c.loaStatus || c.loaStatus === '')) {
      text = 'CPR acknowledgement due — send LOA';
    }
  }

  return {
    text: text,
    tab: tab,
    icon: icon,
    urgency: c.cprDaysLeft,
    blocker: ''
  };
}

var EVIDENCE_REQUEST_SEED = [
  {
    id: 'REQ-001',
    ref: 'AC-2026-0089',
    claimant: 'Daniel Hartley',
    flight: 'HC 1184 — LTN → BCN',
    pack: 'Gold',
    priority: 'Urgent',
    due: '3d',
    status: 'open',
    requestedBy: 'S. Booth',
    requestType: 'Daily Operations Review',
    requestDate: '24MAR24',
    missing: ['Daily Operations Review for 24MAR24', 'Valencia ground handling records', 'Passenger care evidence'],
    note: 'Pull all left gaps on passenger care and diversion ground handling.',
    since: '2d ago'
  },
  {
    id: 'REQ-002',
    ref: 'AC-2026-0091',
    claimant: 'Rebecca Walsh',
    flight: 'HC 307 — MAN → AMS',
    pack: 'Gold',
    priority: 'Normal',
    due: '7d',
    status: 'open',
    requestedBy: 'J. Patel',
    missing: ['Eurocontrol regulation PDF', 'Passenger communications log'],
    note: 'ATC delay pack — network outlook still missing.',
    since: '1d ago'
  }
];

var CASE_FILTER_MAP = {
  intake: ['intake'],
  triage: ['triage'],
  deadlines: ['cpr'],
  evidence: ['evidence'],
  drafting: ['drafting', 'defence'],
  urgent: null
};

function filterCasesByParam(cases, filter) {
  if (!filter) return cases;
  if (filter === 'urgent') {
    return cases.filter(function (c) {
      return c.cprDaysLeft <= 7 && c.stage !== 'resolve';
    });
  }
  var stages = CASE_FILTER_MAP[filter];
  if (!stages) return cases;
  return cases.filter(function (c) {
    return stages.indexOf(c.stage) >= 0;
  });
}

function sortCases(cases, sort) {
  var list = cases.slice();
  if (sort === 'stage') {
    var order = ['intake', 'triage', 'cpr', 'evidence', 'drafting', 'defence', 'resolve'];
    list.sort(function (a, b) {
      return order.indexOf(a.stage) - order.indexOf(b.stage);
    });
  } else if (sort === 'value') {
    list.sort(function (a, b) {
      var av = parseInt(String(a.value).replace(/,/g, '').match(/\d+/) || '0', 10);
      var bv = parseInt(String(b.value).replace(/,/g, '').match(/\d+/) || '0', 10);
      return bv - av;
    });
  } else {
    list.sort(function (a, b) {
      return a.cprDaysLeft - b.cprDaysLeft;
    });
  }
  return list;
}

function getNotifications(uid) {
  var all = [];
  try {
    all = JSON.parse(sessionStorage.getItem('dfa_notifications') || '[]');
  } catch (e) {}
  return all.filter(function (n) {
    return !uid || n.to === uid || n.to === 'all';
  });
}

function pushNotification(notif) {
  var all = [];
  try {
    all = JSON.parse(sessionStorage.getItem('dfa_notifications') || '[]');
  } catch (e) {}
  all.unshift(
    Object.assign(
      {
        id: 'N-' + Date.now(),
        time: new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
        read: false
      },
      notif
    )
  );
  try {
    sessionStorage.setItem('dfa_notifications', JSON.stringify(all.slice(0, 40)));
  } catch (e) {}
}

function markNotificationsRead(uid) {
  var all = [];
  try {
    all = JSON.parse(sessionStorage.getItem('dfa_notifications') || '[]');
  } catch (e) {}
  all = all.map(function (n) {
    if (n.to === uid) return Object.assign({}, n, { read: true });
    return n;
  });
  try {
    sessionStorage.setItem('dfa_notifications', JSON.stringify(all));
  } catch (e) {}
}

function unreadNotificationCount(uid) {
  return getNotifications(uid).filter(function (n) {
    return !n.read;
  }).length;
}

function updateEvidenceRequest(id, status) {
  var reqs = [];
  try {
    reqs = JSON.parse(sessionStorage.getItem('dfa_evidence_requests') || '[]');
  } catch (e) {}
  var found = false;
  var updated = null;
  reqs = reqs.map(function (r) {
    if (r.id === id) {
      found = true;
      updated = Object.assign({}, r, { status: status });
      return updated;
    }
    return r;
  });
  if (!found) {
    var seed = EVIDENCE_REQUEST_SEED.find(function (r) {
      return r.id === id;
    });
    if (seed) {
      updated = Object.assign({}, seed, { status: status });
      reqs.push(updated);
    }
  }
  try {
    sessionStorage.setItem('dfa_evidence_requests', JSON.stringify(reqs));
  } catch (e) {}
  return updated;
}

function completeEvidenceRequest(id) {
  var req = updateEvidenceRequest(id, 'complete');
  if (!req) return null;
  var requester = 'SB';
  if (req.requestedBy) {
    var u = Object.keys(USERS || {}).find(function (k) {
      return USERS[k].name === req.requestedBy || USERS[k].full === req.requestedBy;
    });
    if (u) requester = u;
  }
  pushNotification({
    to: requester,
    type: 'evidence-complete',
    ref: req.ref,
    title: 'Evidence request complete',
    body: (req.claimant || req.ref) + ' — documents uploaded to repository. Gold pack ready for review.',
    tab: 'evidence'
  });
  return req;
}

function pushEvidenceRequest(req) {
  if (!req || !req.ref) return null;
  var reqs = [];
  try {
    reqs = JSON.parse(sessionStorage.getItem('dfa_evidence_requests') || '[]');
  } catch (e) {
    reqs = [];
  }
  var entry = Object.assign(
    {
      id: 'REQ-' + Date.now(),
      status: 'open',
      since: 'Just now',
      pack: 'Gold',
      priority: 'Normal',
      missing: []
    },
    req
  );
  reqs.unshift(entry);
  try {
    sessionStorage.setItem('dfa_evidence_requests', JSON.stringify(reqs.slice(0, 80)));
  } catch (e) {}
  if (typeof notifyEvidenceTeamRequest === 'function') notifyEvidenceTeamRequest(entry);
  return entry;
}

function notifyEvidenceTeamRequest(req) {
  pushNotification({
    to: 'EH',
    type: 'evidence-request',
    ref: req.ref,
    requestId: req.id,
    title: 'New evidence request',
    body: (req.requestedBy || 'Legal team') + ' requests completion for ' + (req.claimant || req.ref),
    tab: 'requests'
  });
}

function getEvidenceRequests() {
  var reqs = [];
  try {
    reqs = JSON.parse(sessionStorage.getItem('dfa_evidence_requests') || '[]');
  } catch (e) {}
  var byId = {};
  EVIDENCE_REQUEST_SEED.concat(reqs).forEach(function (r) {
    byId[r.id] = r;
  });
  return Object.keys(byId).map(function (k) {
    return byId[k];
  });
}

function getWaitingOn(c) {
  return [];
}

function getWaitingOnSummary(c) {
  return '';
}

function getActiveEvidenceRequest(ref) {
  return getEvidenceRequests().find(function (r) {
    return r.ref === ref && r.status !== 'complete';
  }) || null;
}

function saveEvidenceWorkspaceState(ref, state) {
  try {
    sessionStorage.setItem('dfa_evidence_' + ref, JSON.stringify(state));
  } catch (e) {}
}

function loadEvidenceWorkspaceState(ref) {
  try {
    return JSON.parse(sessionStorage.getItem('dfa_evidence_' + ref) || 'null');
  } catch (e) {
    return null;
  }
}

function openCase(ref, tab) {
  var uid = typeof getActiveUser === 'function' ? getActiveUser() : '';
  var u = typeof USERS !== 'undefined' ? USERS[uid] : null;
  if (u && u.team === 'dio') {
    window.location.href = 'dio-case.html?ref=' + encodeURIComponent(ref);
    return;
  }
  var c = typeof resolveCase === 'function' ? resolveCase(ref) : (typeof getCase === 'function' ? getCase(ref) : null);
  if (!c) return;
  try {
    sessionStorage.setItem('dfa_case', JSON.stringify(c));
  } catch (e) {}
  var targetTab = tab || getPrimaryTab(c);
  window.location.href = CASE_ROUTE(ref, targetTab);
}

function collectDoNowTasks(cases, limit) {
  var tasks = [];
  (cases || []).forEach(function (c) {
    var action = getNextAction(c);
    tasks.push({
      ref: c.ref,
      txt: action.text,
      icon: action.icon,
      urg: action.urgency,
      tab: action.tab,
      claimant: c.claimant,
      blocker: action.blocker
    });
    if (c.cprDaysLeft <= 7 && c.stage !== 'resolve' && c.stage !== 'intake') {
      var hasCpr = tasks.some(function (t) {
        return t.ref === c.ref && t.txt.indexOf('CPR') >= 0;
      });
      if (!hasCpr && c.stage !== 'cpr') {
        tasks.push({
          ref: c.ref,
          txt: 'CPR deadline check due',
          icon: 'ti-calendar-due',
          urg: c.cprDaysLeft,
          tab: 'deadlines',
          claimant: c.claimant,
          blocker: ''
        });
      }
    }
  });
  tasks.sort(function (a, b) {
    return a.urg - b.urg;
  });
  var seen = {};
  var deduped = [];
  tasks.forEach(function (t) {
    var key = t.ref + '|' + t.txt;
    if (!seen[key]) {
      seen[key] = true;
      deduped.push(t);
    }
  });
  return deduped.slice(0, limit || 5);
}

function buildWatchItems(cases) {
  return (cases || [])
    .filter(function (c) {
      return c.cprDaysLeft <= 7 && c.stage !== 'resolve';
    })
    .sort(function (a, b) {
      return a.cprDaysLeft - b.cprDaysLeft;
    })
    .slice(0, 5)
    .map(function (c) {
      var parts = [c.ref, 'CPR ' + c.cprDaysLeft + 'd'];
      if (c.stage === 'evidence') parts.push('Evidence ' + getEffectiveEvidencePct(c) + '%');
      return { ref: c.ref, text: parts.join(' · '), urgency: c.cprDaysLeft, tab: getPrimaryTab(c) };
    });
}

function portfolioSummary(cases) {
  var stages = ['intake', 'triage', 'cpr', 'evidence', 'drafting', 'defence', 'resolve'];
  var counts = stages.map(function (s) {
    return { stage: s, n: cases.filter(function (c) {
      return c.stage === s;
    }).length };
  }).filter(function (x) {
    return x.n > 0;
  });
  var totalValue = cases.reduce(function (sum, c) {
    var m = String(c.value).replace(/,/g, '').match(/\d+/);
    return sum + (m ? parseInt(m[0], 10) : 0);
  }, 0);
  return { counts: counts, total: cases.length, totalValue: totalValue };
}

function parseLocDateReceived(dateStr) {
  if (!dateStr || dateStr === 'Today') return new Date();
  var direct = new Date(dateStr);
  if (!isNaN(direct.getTime())) return direct;
  var match = String(dateStr).match(/(\d{1,2})\s+(\w+)\s+(\d{4})/);
  if (match) {
    var parsed = new Date(match[1] + ' ' + match[2] + ' ' + match[3]);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}

function caseFromFilingRecord(cf) {
  if (!cf) return null;
  var dep = cf.dep || '';
  var arr = cf.arr || '';
  if ((!dep || !arr) && cf.route) {
    var routeParts = String(cf.route).split(/\s*[–\-→]\s*/);
    if (!dep) dep = (routeParts[0] || '').trim();
    if (!arr) arr = (routeParts[1] || '').trim();
  }
  var jur = cf.jurisdiction || 'england-wales';
  var langByJur = { 'england-wales': 'en', france: 'fr', spain: 'es' };
  var cprDaysLeft = cf.cprDaysLeft;
  if (cprDaysLeft == null && cf.locDate) {
    var parsed = parseLocDateReceived(cf.locDate);
    cprDaysLeft = Math.max(0, Math.round((new Date(parsed.getTime() + 21 * 86400000) - Date.now()) / 86400000));
  }
  if (cprDaysLeft == null) cprDaysLeft = 21;

  return {
    ref: cf.ref,
    assignedTo: cf.assignedTo || 'SB',
    claimant: cf.claimant || 'Unknown claimant',
    solicitor: cf.solicitor || '',
    flight: cf.flight || ((cf.flightNum || 'HC TBD') + ' — ' + (dep || 'TBD') + ' → ' + (arr || 'TBD')),
    flightNum: cf.flightNum || '',
    dep: dep || 'TBD',
    arr: arr || 'TBD',
    flightDate: cf.flightDate || '',
    value: cf.value || cf.totalExposure || '',
    type: cf.type || cf.claimType || 'EC261 — New claim',
    locDate: cf.locDate || '',
    stage: cf.stage || 'intake',
    cat: cf.cat || 'B',
    jurisdiction: jur,
    lang: cf.lang || langByJur[jur] || 'en',
    disruptionType: cf.disruptionType || '',
    classification: cf.classification || cf.triage || 'INVESTIGATE',
    evidencePct: cf.evidencePct || 0,
    cprDaysLeft: cprDaysLeft,
    points: cf.points || [],
    loaStatus: cf.loaStatus || '',
    triageNote: cf.triageNote || cf.notes || '',
    origin: cf.origin || '',
    locReady: cf.locReady != null ? !!cf.locReady : true,
    caseSummary: cf.caseSummary || '',
    verdictTitle: cf.verdictTitle || '',
    verdictSub: cf.verdictSub || '',
    conditions: cf.conditions || [],
    totalExposure: cf.totalExposure || null,
    limitationDeadline: cf.limitationDeadline || null,
    activity: (cf.activity || []).map(function (a) {
      return { text: a.text, time: a.time, type: a.type, by: a.by };
    }),
  };
}

/**
 * Mark LOC received on an engine-origin (or any) case: locReady, intake doc, activity, stage bump.
 */
function markLocReceived(ref, opts) {
  opts = opts || {};
  ref = typeof normaliseCaseRef === 'function' ? normaliseCaseRef(ref) : ref;
  var content = opts.content || opts.text || 'Letter of Claim received.';
  var name = opts.name || ('Letter of Claim — ' + (opts.claimant || ref));
  var by = opts.by || 'Lawyer';
  var stage = opts.stage || 'cpr';

  if (typeof CaseFiling !== 'undefined') {
    CaseFiling.updateCaseMeta(ref, {
      locReady: true,
      locDate: opts.locDate || new Date().toISOString().slice(0, 10),
      stage: stage
    });
    CaseFiling.addDocument(ref, {
      folderId: 'intake',
      name: name,
      docKey: 'loc',
      filename: (opts.filename || (ref + '-LOC.txt')),
      content: content,
      mimeType: opts.mimeType || 'text/plain',
      source: opts.source || 'case_workspace',
      uploadedByName: by
    });
    CaseFiling.addActivity(ref, 'LOC received — ready for CPR/response', 'upload', by);
  }

  var c = typeof resolveCase === 'function' ? resolveCase(ref) : null;
  if (c) {
    c.locReady = true;
    c.locDate = opts.locDate || new Date().toISOString().slice(0, 10);
    c.stage = stage;
    if (typeof persistPortfolioCase === 'function') persistPortfolioCase(c);
    try {
      sessionStorage.setItem('dfa_case', JSON.stringify(c));
    } catch (e) {}
  }
  return c;
}

function resolveCase(ref) {
  ref = typeof normaliseCaseRef === 'function' ? normaliseCaseRef(ref) : ref;
  var c = typeof getCase === 'function' ? getCase(ref) : null;
  if (c) return c;
  if (typeof CaseFiling !== 'undefined') {
    var cf = CaseFiling.getCase(ref);
    if (cf) return caseFromFilingRecord(cf);
  }
  if (typeof uploadedCases !== 'undefined') {
    for (var i = 0; i < uploadedCases.length; i++) {
      if (uploadedCases[i].ref === ref) return uploadedCases[i];
    }
  }
  return null;
}

function markCaseResolved(ref, outcome, meta) {
  ref = typeof normaliseCaseRef === 'function' ? normaliseCaseRef(ref) : ref;
  outcome = outcome || 'Defended / response issued';
  meta = meta || {};
  var c = resolveCase(ref);
  var uid = typeof getActiveUser === 'function' ? getActiveUser() : 'SB';
  var u = (typeof USERS !== 'undefined' ? USERS[uid] : null) || { full: 'User', name: 'User' };
  var now = new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  try {
    var stored = JSON.parse(sessionStorage.getItem('dfa_case') || 'null');
    if (stored && stored.ref === ref) {
      stored.stage = 'resolve';
      stored.resolvedAt = now;
      stored.outcome = outcome;
      sessionStorage.setItem('dfa_case', JSON.stringify(stored));
    }
  } catch (e) {}

  if (typeof CaseFiling !== 'undefined') {
    CaseFiling.updateCaseMeta(ref, { stage: 'resolve', outcome: outcome, resolvedAt: now });
    CaseFiling.addActivity(ref, 'Case closed — ' + outcome, 'stage', u.full || u.name);
  }

  try {
    var repo = JSON.parse(sessionStorage.getItem('dfa_repository') || '[]');
    repo.unshift({
      ref: ref,
      claimant: (c && c.claimant) || meta.claimant || '',
      outcome: outcome,
      stored: new Date().toISOString(),
      documents: meta.documents || [],
      value: (c && c.value) || meta.value || '',
      flightNum: (c && c.flightNum) || meta.flightNum || '',
      disruptionType: (c && c.type) || meta.disruptionType || '',
      solicitor: (c && c.solicitor) || meta.solicitor || '',
    });
    sessionStorage.setItem('dfa_repository', JSON.stringify(repo.slice(0, 30)));
  } catch (e) {}

  if (window.parent !== window) {
    window.parent.postMessage({ type: 'case-shell', action: 'log', text: 'Case resolved — ' + outcome, logType: 'stage' }, '*');
    window.parent.postMessage({ type: 'case-shell', action: 'stageComplete', tab: 'overview' }, '*');
  }
  return true;
}

function normaliseAssigneeId(id) {
  return String(id == null ? '' : id).trim().toUpperCase();
}

function caseAssignedToUser(c, uid) {
  if (!c) return false;
  var normUid = normaliseAssigneeId(uid);
  if (normUid === 'SB') return true;
  return normaliseAssigneeId(c.assignedTo) === normUid;
}

function getCasesForUser(uid, stage) {
  uid = normaliseAssigneeId(uid || (typeof getActiveUser === 'function' ? getActiveUser() : 'SB'));
  var pool = typeof ALL_CASES !== 'undefined' ? ALL_CASES : [];
  return pool.filter(function (c) {
    if (!caseAssignedToUser(c, uid)) return false;
    if (stage && c.stage !== stage) return false;
    return true;
  });
}

function getMergedCasesForUser(uid, stage) {
  uid = normaliseAssigneeId(uid || (typeof getActiveUser === 'function' ? getActiveUser() : 'SB'));
  var merged = getCasesForUser(uid, stage);
  var seen = {};
  merged.forEach(function (c) {
    seen[c.ref] = true;
  });

  if (typeof CaseFiling !== 'undefined') {
    var opts = { assignedTo: uid };
    if (stage) opts.stage = stage;
    try {
      CaseFiling.listCases(opts).forEach(function (cf) {
        if (seen[cf.ref]) return;
        var converted = caseFromFilingRecord(cf);
        if (!converted) return;
        if (stage && converted.stage !== stage) return;
        merged.push(converted);
        seen[cf.ref] = true;
      });
    } catch (e) { /* filing store unavailable */ }
  }

  if (typeof uploadedCases !== 'undefined') {
    uploadedCases.forEach(function (c) {
      if (!caseAssignedToUser(c, uid)) return;
      if (stage && c.stage !== stage) return;
      if (seen[c.ref]) return;
      merged.push(c);
      seen[c.ref] = true;
    });
  }

  return merged;
}

function persistPortfolioCase(c) {
  if (!c || !c.ref) return;
  try {
    var list = JSON.parse(sessionStorage.getItem('dfa_portfolio_cases') || '[]');
    list = list.filter(function (x) {
      return x.ref !== c.ref;
    });
    list.unshift(c);
    sessionStorage.setItem('dfa_portfolio_cases', JSON.stringify(list.slice(0, 500)));
  } catch (e) {}
}

function getPortfolioCases() {
  var seen = {};
  var out = [];
  function add(c) {
    if (!c || !c.ref || seen[c.ref]) return;
    var norm = typeof normaliseCaseRef === 'function' ? normaliseCaseRef(c.ref) : c.ref;
    if (seen[norm]) return;
    seen[c.ref] = true;
    seen[norm] = true;
    out.push(c);
  }
  if (typeof ALL_CASES !== 'undefined') {
    ALL_CASES.forEach(add);
  }
  try {
    JSON.parse(sessionStorage.getItem('dfa_portfolio_cases') || '[]').forEach(add);
  } catch (e) {}
  if (typeof uploadedCases !== 'undefined') {
    uploadedCases.forEach(add);
  }
  if (typeof CaseFiling !== 'undefined') {
    try {
      CaseFiling.listCases({}).forEach(function (cf) {
        if (typeof caseFromFilingRecord === 'function') add(caseFromFilingRecord(cf));
      });
    } catch (e) {}
  }
  return out;
}

function buildCaseFromRow(row, confirmedAssigneeId, parsedDateReceived) {
  row = row || {};
  var jurisMap = { EW: 'england-wales', FR: 'france', ES: 'spain', EU: 'england-wales' };
  var langMap = { EW: 'en', FR: 'fr', ES: 'es', EU: 'en' };
  var catMap = { Standard: 'B', Complex: 'C', 'High Value': 'C' };
  var jCode = row.jurisdictionCode || 'EW';
  var parsed = parsedDateReceived instanceof Date && !isNaN(parsedDateReceived.getTime())
    ? parsedDateReceived
    : parseLocDateReceived(row.dateReceived);
  var uid = typeof getActiveUser === 'function' ? getActiveUser() : 'SB';
  var uploader = USERS[uid] || {};
  var comp = parseFloat(row.compSought);
  if (isNaN(comp)) comp = 0;

  return {
    ref: row.ref,
    claimant: row.surname + ' ' + row.firstName,
    solicitor: row.solicitor,
    flightNum: row.flightNum,
    dep: row.dep,
    arr: row.arr,
    route: row.dep + '–' + row.arr,
    flight: row.flightNum + ' — ' + row.dep + ' → ' + row.arr,
    flightDate: row.flightDate,
    value: (row.currency === 'GBP' ? '£' : '€') + comp.toFixed(0),
    type: row.claimType,
    jurisdiction: jurisMap[jCode] || 'england-wales',
    lang: langMap[jCode] || 'en',
    disruptionType: typeof mapDisruptionType === 'function' ? mapDisruptionType(row.disruptionType) : (row.disruptionType || 'Pending review'),
    classification: row.triage || 'INVESTIGATE',
    cat: catMap[row.complexity] || 'B',
    stage: 'intake',
    assignedTo: confirmedAssigneeId,
    locDate: row.dateReceived,
    triageNote: row.notes,
    evidencePct: 0,
    cprDaysLeft: typeof computeCprDaysLeft === 'function'
      ? computeCprDaysLeft(row.dateReceived, jurisMap[jCode] || 'england-wales')
      : Math.max(0, Math.round((new Date(parsed.getTime() + 21 * 86400000) - Date.now()) / 86400000)),
    uploadedByName: uploader.full || uploader.name || 'User'
  };
}

(function guardDIOFromSolicitorModules() {
  if (typeof window === 'undefined' || typeof USERS === 'undefined') return;
  var uid = typeof getActiveUser === 'function' ? getActiveUser() : '';
  var u = USERS[uid];
  if (!u || u.team !== 'dio') return;
  var p = window.location.pathname.split('/').pop() || '';
  if (/^module[2345]/.test(p) || p === 'case.html') {
    var ref = new URLSearchParams(window.location.search).get('ref');
    window.location.replace(ref ? 'dio-case.html?ref=' + encodeURIComponent(ref) : 'dio.html');
  }
})();
