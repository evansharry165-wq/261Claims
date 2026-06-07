// Case routing and task helpers — Phase 1 redesign

var STAGE_TAB_MAP = {
  intake: 'overview',
  triage: 'triage',
  cpr: 'deadlines',
  evidence: 'evidence',
  drafting: 'documents',
  defence: 'documents',
  resolve: 'overview'
};

var LEGACY_WORKSPACE_ROUTES = {
  overview: 'module2-case-workspace.html',
  triage: 'module2-case-workspace.html',
  deadlines: 'module3-cpr-workspace.html',
  evidence: 'module4-evidence-workspace.html',
  documents: 'module5-drafting-workspace.html',
  activity: 'module2-case-workspace.html'
};

function getPrimaryTab(c) {
  if (!c) return 'overview';
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
    var st = JSON.parse(sessionStorage.getItem('261c_evidence_' + ref) || 'null');
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
    var stored = JSON.parse(sessionStorage.getItem('261c_case') || 'null');
    if (stored && stored.ref === ref) {
      stored.evidencePct = pct;
      if (readyForDrafting) {
        stored.evidenceReady = true;
        stored.classification = 'DRAFTING';
      }
      sessionStorage.setItem('261c_case', JSON.stringify(stored));
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

function getNextAction(c) {
  if (!c) return { text: 'Open case', tab: 'overview', icon: 'ti-file', urgency: 99 };
  var tab = getPrimaryTab(c);
  var text = 'Review case';
  var icon = 'ti-file';
  var evPct = getEffectiveEvidencePct(c);

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
  } else if (c.stage === 'drafting' || c.stage === 'defence') {
    text = 'Review AI draft and sign off';
    tab = 'documents';
    icon = 'ti-file-pencil';
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
    missing: ['Eurocontrol regulation PDF', 'MAX OPS passenger communications'],
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
    all = JSON.parse(sessionStorage.getItem('261c_notifications') || '[]');
  } catch (e) {}
  return all.filter(function (n) {
    return !uid || n.to === uid || n.to === 'all';
  });
}

function pushNotification(notif) {
  var all = [];
  try {
    all = JSON.parse(sessionStorage.getItem('261c_notifications') || '[]');
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
    sessionStorage.setItem('261c_notifications', JSON.stringify(all.slice(0, 40)));
  } catch (e) {}
}

function markNotificationsRead(uid) {
  var all = [];
  try {
    all = JSON.parse(sessionStorage.getItem('261c_notifications') || '[]');
  } catch (e) {}
  all = all.map(function (n) {
    if (n.to === uid) return Object.assign({}, n, { read: true });
    return n;
  });
  try {
    sessionStorage.setItem('261c_notifications', JSON.stringify(all));
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
    reqs = JSON.parse(sessionStorage.getItem('261c_evidence_requests') || '[]');
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
    sessionStorage.setItem('261c_evidence_requests', JSON.stringify(reqs));
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
    reqs = JSON.parse(sessionStorage.getItem('261c_evidence_requests') || '[]');
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
    sessionStorage.setItem('261c_evidence_' + ref, JSON.stringify(state));
  } catch (e) {}
}

function loadEvidenceWorkspaceState(ref) {
  try {
    return JSON.parse(sessionStorage.getItem('261c_evidence_' + ref) || 'null');
  } catch (e) {
    return null;
  }
}

function openCase(ref, tab) {
  var c = typeof getCase === 'function' ? getCase(ref) : null;
  if (!c) return;
  try {
    sessionStorage.setItem('261c_case', JSON.stringify(c));
  } catch (e) {}
  var targetTab = tab || 'overview';
  window.location.href = CASE_ROUTE(ref, targetTab);
}

function classificationUnset(c) {
  return !c.classification || c.classification === 'PENDING';
}

function deriveDoNowTask(c) {
  if (!c || c.stage === 'resolve') return null;
  var evPct = getEffectiveEvidencePct(c);

  if (c.cprDaysLeft <= 3) {
    var daysText =
      c.cprDaysLeft < 0
        ? Math.abs(c.cprDaysLeft) + ' days overdue'
        : c.cprDaysLeft + ' day' + (c.cprDaysLeft === 1 ? '' : 's') + ' remaining';
    return {
      ref: c.ref,
      claimant: c.claimant,
      flight: c.flight || c.flightNum,
      txt: 'File CPR response — ' + daysText,
      priority: 'URGENT',
      priorityClass: 'urgent',
      tab: 'deadlines',
      sort: c.cprDaysLeft
    };
  }
  if (c.stage === 'evidence' && evPct < 50) {
    return {
      ref: c.ref,
      claimant: c.claimant,
      flight: c.flight || c.flightNum,
      txt: 'Complete evidence pack — ' + evPct + '% done',
      priority: 'ACTION',
      priorityClass: 'action',
      tab: 'evidence',
      sort: 10 + evPct
    };
  }
  if (c.stage === 'intake') {
    return {
      ref: c.ref,
      claimant: c.claimant,
      flight: c.flight || c.flightNum,
      txt: 'Review extracted claim and confirm triage',
      priority: 'ACTION',
      priorityClass: 'action',
      tab: 'triage',
      sort: 20 + c.cprDaysLeft
    };
  }
  if (c.stage === 'triage' && classificationUnset(c)) {
    return {
      ref: c.ref,
      claimant: c.claimant,
      flight: c.flight || c.flightNum,
      txt: 'Complete AI triage classification',
      priority: 'ACTION',
      priorityClass: 'action',
      tab: 'triage',
      sort: 30 + c.cprDaysLeft
    };
  }
  return null;
}

function collectDoNowTasks(cases, limit) {
  return (cases || [])
    .map(deriveDoNowTask)
    .filter(Boolean)
    .sort(function (a, b) {
      return a.sort - b.sort;
    })
    .slice(0, limit || 3);
}

function buildWatchItems(cases) {
  return (cases || [])
    .filter(function (c) {
      if (c.stage === 'resolve') return false;
      var evPct = getEffectiveEvidencePct(c);
      var cprWatch = c.cprDaysLeft >= 4 && c.cprDaysLeft <= 14;
      var evWatch = evPct >= 50 && evPct <= 79;
      return cprWatch || evWatch;
    })
    .sort(function (a, b) {
      return a.cprDaysLeft - b.cprDaysLeft;
    })
    .slice(0, 3)
    .map(function (c) {
      var evPct = getEffectiveEvidencePct(c);
      var parts = [];
      if (c.cprDaysLeft >= 4 && c.cprDaysLeft <= 14) {
        parts.push('CPR ' + c.cprDaysLeft + 'd');
      }
      if (evPct >= 50 && evPct <= 79) {
        parts.push('Evidence ' + evPct + '%');
      }
      return {
        ref: c.ref,
        claimant: c.claimant,
        flight: c.flight || c.flightNum,
        text: c.ref + ' · ' + c.claimant + ' · ' + parts.join(' · '),
        urgency: c.cprDaysLeft,
        tab: getPrimaryTab(c)
      };
    });
}

function portfolioSummary(cases) {
  var active = (cases || []).filter(function (c) {
    return c.stage !== 'resolve';
  });
  var urgent = active.filter(function (c) {
    return c.cprDaysLeft <= 7;
  });
  var exposure =
    typeof formatGBP === 'function' && typeof sumCasesValueGBP === 'function'
      ? formatGBP(sumCasesValueGBP(active))
      : '£0';
  var stages = ['intake', 'triage', 'cpr', 'evidence', 'drafting', 'defence'];
  var counts = stages
    .map(function (s) {
      return {
        stage: s,
        n: active.filter(function (c) {
          return c.stage === s;
        }).length
      };
    })
    .filter(function (x) {
      return x.n > 0;
    });
  return {
    counts: counts,
    total: active.length,
    urgent: urgent.length,
    exposure: exposure,
    active: active
  };
}
