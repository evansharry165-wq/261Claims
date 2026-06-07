// Case routing and task helpers — Phase 1 redesign

var STAGE_TAB_MAP = {
  intake: 'overview',
  triage: 'triage',
  cpr: 'deadlines',
  evidence: 'evidence',
  drafting: 'documents',
  defence: 'documents',
  review: 'review',
  resolve: 'review'
};

var CASE_DOC_NAMES = {
  loa: 'Letter of Acknowledgement',
  lor: 'Letter of Response',
  defence: 'Defence (CPR Part 16)',
  witness: 'Witness Statement (CPR Part 32)',
  n181: 'Directions Questionnaire (N181)',
  p36: 'Part 36 Offer Letter',
  settlement: 'Settlement Agreement'
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

function getRequiredDocumentIds(c) {
  if (!c) return ['lor'];
  var ids = ['lor'];
  if (c.loaStatus === 'sent' || c.loaStatus === 'approved') ids.unshift('loa');
  if (c.classification === 'DEFEND' || c.classification === 'ESCALATE') {
    if (ids.indexOf('defence') < 0) ids.push('defence');
  }
  return ids;
}

function loadDraftingState(ref) {
  try {
    return JSON.parse(sessionStorage.getItem('261c_drafting_' + ref) || 'null');
  } catch (e) {
    return null;
  }
}

function saveDraftingState(ref, state) {
  try {
    sessionStorage.setItem('261c_drafting_' + ref, JSON.stringify(state));
  } catch (e) {}
}

function getDraftingProgress(ref, c) {
  var base = c || (typeof getCase === 'function' ? getCase(ref) : null);
  var st = loadDraftingState(ref);
  var approved = (st && st.docApproved) || {};
  var docStates = (st && st.docStates) || {};
  var required = getRequiredDocumentIds(base);
  var drafted = required.filter(function (id) {
    var ds = docStates[id];
    return ds && (ds.generated || ds.status === 'approved' || ds.status === 'draft');
  });
  var approvedList = required.filter(function (id) {
    return approved[id];
  });
  return {
    required: required,
    drafted: drafted,
    approved: approvedList,
    allDrafted: drafted.length === required.length,
    allApproved: approvedList.length === required.length,
    docStates: docStates,
    docApproved: approved
  };
}

function getCompletedCases() {
  try {
    return JSON.parse(sessionStorage.getItem('261c_completed_cases') || '[]');
  } catch (e) {
    return [];
  }
}

function isCaseCompleted(ref) {
  return getCompletedCases().some(function (c) {
    return c.ref === ref;
  });
}

function getMergedCase(ref) {
  var c = typeof getCase === 'function' ? getCase(ref) : null;
  if (!c) {
    return (
      getCompletedCases().find(function (x) {
        return x.ref === ref;
      }) || null
    );
  }
  c = Object.assign({}, c);
  try {
    var stored = JSON.parse(sessionStorage.getItem('261c_case') || 'null');
    if (stored && stored.ref === ref) c = Object.assign(c, stored);
  } catch (e) {}
  if (isCaseCompleted(ref)) {
    var completed = getCompletedCases().find(function (x) {
      return x.ref === ref;
    });
    if (completed) c = Object.assign(c, completed, { stage: 'resolve', completed: true });
  }
  return c;
}

function getReviewChecklist(c) {
  if (!c) return [];
  var evPct = getEffectiveEvidencePct(c);
  var drafting = getDraftingProgress(c.ref, c);
  var loaOk = c.loaStatus === 'sent' || c.loaStatus === 'approved' || c.stage === 'evidence' || c.stage === 'drafting' || c.stage === 'defence' || c.stage === 'review' || c.stage === 'resolve';
  var onboarded = c.stage !== 'intake';
  if (c.stage === 'triage' && !c.triageNote && !c.classification) onboarded = false;
  if (isCaseCompleted(c.ref)) onboarded = true;

  var cprDetail = 'CPR window — ' + c.cprDaysLeft + ' days remaining';
  if (c.loaStatus === 'sent' || c.loaStatus === 'approved') {
    cprDetail = 'Acknowledgement sent · ' + c.cprDaysLeft + ' days to letter of response';
  }

  return [
    {
      id: 'onboarded',
      label: 'Onboarded',
      detail: c.claimant + ' · ' + (c.solicitor || 'Claim received'),
      done: onboarded
    },
    {
      id: 'cpr',
      label: 'CPR deadline date',
      detail: cprDetail,
      done: loaOk
    },
    {
      id: 'evidence',
      label: 'Evidence collected',
      detail: evPct + '% of gold evidence pack on file',
      done: evPct >= 100
    },
    {
      id: 'documents',
      label: 'Documents drafted',
      detail:
        drafting.approved.length +
        ' of ' +
        drafting.required.length +
        ' approved — ' +
        drafting.required.map(function (id) {
          return CASE_DOC_NAMES[id] || id;
        }).join(', '),
      done: drafting.allApproved
    }
  ];
}

function isReviewReady(c) {
  return getReviewChecklist(c).every(function (item) {
    return item.done;
  });
}

function completeCaseAndUpload(ref) {
  var c = getMergedCase(ref);
  if (!c || !isReviewReady(c)) return null;

  var drafting = getDraftingProgress(ref, c);
  var evState = loadEvidenceWorkspaceState(ref);
  var completed = Object.assign({}, c, {
    ref: ref,
    stage: 'resolve',
    completed: true,
    completedAt: new Date().toISOString(),
    completedBy: typeof getActiveUser === 'function' ? getActiveUser() : 'SB',
    evidencePct: getEffectiveEvidencePct(c),
    documents: drafting.approved.map(function (id) {
      return CASE_DOC_NAMES[id] || id;
    }),
    documentIds: drafting.approved.slice(),
    draftingSnapshot: loadDraftingState(ref),
    evidenceSnapshot: evState,
    outcome: c.classification === 'ESCALATE' ? 'settled' : 'defended',
    summary:
      'Completed via Review — intake, CPR, evidence (' +
      getEffectiveEvidencePct(c) +
      '%), and approved documents archived to the repository.',
    saving: c.value,
    route: c.flight || c.flightNum || 'Case file',
    confidence: 92,
    caseLaw: ['Repository learning'],
    education: 'Internal precedent',
    recommendation: 'Use this completed file when handling similar ' + (c.disruptionType || 'claims') + '.'
  });

  var completedList = getCompletedCases().filter(function (x) {
    return x.ref !== ref;
  });
  completedList.unshift(completed);
  try {
    sessionStorage.setItem('261c_completed_cases', JSON.stringify(completedList.slice(0, 50)));
  } catch (e) {}

  try {
    var repo = JSON.parse(sessionStorage.getItem('261c_repository') || '[]');
    repo = repo.filter(function (r) {
      return r.ref !== ref;
    });
    repo.unshift({
      ref: ref,
      claimant: c.claimant,
      outcome: 'Completed case',
      stored: completed.completedAt,
      documents: completed.documents,
      value: c.value,
      flightNum: c.flightNum,
      disruptionType: c.disruptionType || c.type,
      solicitor: c.solicitor,
      completed: true,
      caseRecord: completed
    });
    sessionStorage.setItem('261c_repository', JSON.stringify(repo.slice(0, 50)));
  } catch (e) {}

  try {
    sessionStorage.setItem('261c_case', JSON.stringify(Object.assign({}, c, { stage: 'resolve', completed: true })));
  } catch (e) {}

  return completed;
}

function searchAllCases(q) {
  q = (q || '').toLowerCase().trim();
  if (!q) return [];
  var hayMatch = function (parts) {
    return parts.join(' ').toLowerCase().indexOf(q) >= 0;
  };
  var active = ALL_CASES.filter(function (c) {
    var J = typeof getJurisdiction === 'function' ? getJurisdiction(c.jurisdiction) : { name: '' };
    return hayMatch([c.ref, c.claimant, c.flightNum, c.flight, c.solicitor, c.disruptionType, c.type, J.name]);
  }).map(function (c) {
    return { ref: c.ref, claimant: c.claimant, source: 'active', caseData: c };
  });
  var completed = getCompletedCases()
    .filter(function (c) {
      return hayMatch([c.ref, c.claimant, c.flightNum, c.flight, c.solicitor, c.disruptionType, c.type, c.route || '']);
    })
    .map(function (c) {
      return { ref: c.ref, claimant: c.claimant, source: 'completed', caseData: c };
    });
  var seen = {};
  return active.concat(completed).filter(function (row) {
    if (seen[row.ref]) return false;
    seen[row.ref] = true;
    return true;
  });
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
    var drafting = getDraftingProgress(c.ref, c);
    if (drafting.allApproved) {
      text = 'Proceed to final review';
      tab = 'review';
      icon = 'ti-list-check';
    } else {
      text = 'Review AI draft and sign off';
      tab = 'documents';
      icon = 'ti-file-pencil';
    }
  } else if (c.stage === 'review') {
    text = isReviewReady(c) ? 'Complete case and upload to repository' : 'Complete review checklist';
    tab = 'review';
    icon = 'ti-list-check';
  } else if (c.stage === 'resolve' || isCaseCompleted(c.ref)) {
    text = 'View completed case archive';
    tab = 'review';
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
  review: ['review'],
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
    var order = ['intake', 'triage', 'cpr', 'evidence', 'drafting', 'defence', 'review', 'resolve'];
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
  var c = getMergedCase(ref);
  if (!c) return;
  try {
    sessionStorage.setItem('261c_case', JSON.stringify(c));
  } catch (e) {}
  var targetTab = tab || (isCaseCompleted(ref) ? 'review' : getPrimaryTab(c));
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
  var stages = ['intake', 'triage', 'cpr', 'evidence', 'drafting', 'defence', 'review', 'resolve'];
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
