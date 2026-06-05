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

function getNextAction(c) {
  if (!c) return { text: 'Open case', tab: 'overview', icon: 'ti-file', urgency: 99 };
  var tab = getPrimaryTab(c);
  var text = 'Review case';
  var icon = 'ti-file';

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
  } else if (c.stage === 'evidence' && c.evidencePct < 70) {
    text = 'Complete key evidence pack';
    tab = 'evidence';
    icon = 'ti-folder-open';
  } else if (c.stage === 'evidence') {
    text = 'Review evidence pack readiness';
    tab = 'evidence';
    icon = 'ti-folder-open';
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
    blocker: getWaitingOnSummary(c)
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
    missing: ['Valencia ground handling records', 'Passenger care evidence', 'DPM notes'],
    note: 'Pull all left gaps on passenger care and diversion ground handling.',
    since: '2d ago'
  },
  {
    id: 'REQ-002',
    ref: 'AC-2026-0091',
    claimant: 'Rebecca Walsh',
    flight: 'HC 307 — MAN → AMS',
    pack: 'Bronze',
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

function updateEvidenceRequest(id, status) {
  var reqs = [];
  try {
    reqs = JSON.parse(sessionStorage.getItem('261c_evidence_requests') || '[]');
  } catch (e) {}
  var found = false;
  reqs = reqs.map(function (r) {
    if (r.id === id) {
      found = true;
      return Object.assign({}, r, { status: status });
    }
    return r;
  });
  if (!found) {
    var seed = EVIDENCE_REQUEST_SEED.find(function (r) {
      return r.id === id;
    });
    if (seed) reqs.push(Object.assign({}, seed, { status: status }));
  }
  try {
    sessionStorage.setItem('261c_evidence_requests', JSON.stringify(reqs));
  } catch (e) {}
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
  if (!c) return [];
  return getEvidenceRequests().filter(function (r) {
    return r.ref === c.ref && r.status !== 'complete';
  });
}

function getWaitingOnSummary(c) {
  var waiting = getWaitingOn(c);
  if (!waiting.length) return '';
  var items = waiting.reduce(function (acc, r) {
    return acc.concat(r.missing || []);
  }, []);
  return 'Evidence team · ' + items.slice(0, 2).join(', ') + (items.length > 2 ? '…' : '');
}

function openCase(ref, tab) {
  var c = typeof getCase === 'function' ? getCase(ref) : null;
  if (!c) return;
  try {
    sessionStorage.setItem('261c_case', JSON.stringify(c));
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
      var waiting = getWaitingOnSummary(c);
      var parts = [c.ref, 'CPR ' + c.cprDaysLeft + 'd'];
      if (c.stage === 'evidence') parts.push('Evidence ' + c.evidencePct + '%');
      if (waiting) parts.push(waiting);
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
