/* Terminal — case health check: case file vs documents vs pipeline readiness */
var TerminalHealth = (function () {
  var PRIMARY_SEND_KEYS = ['lor', 'defence', 'loa'];
  var DOC_LABELS = {
    loa: 'Letter of Acknowledgement',
    lor: 'Letter of Response',
    defence: 'Defence',
    witness: 'Witness Statement',
    n181: 'Directions Questionnaire (N181)',
    p36: 'Part 36 Offer',
    settlement: 'Settlement Agreement'
  };

  function getEvidencePct(ref, caseData) {
    if (typeof getEffectiveEvidencePct === 'function' && caseData) {
      return getEffectiveEvidencePct(caseData);
    }
    if (typeof getStoredEvidencePct === 'function') {
      var stored = getStoredEvidencePct(ref);
      if (stored !== null) return stored;
    }
    return caseData && caseData.evidencePct != null ? caseData.evidencePct : 0;
  }

  function getDraftingState(ref) {
    try {
      return JSON.parse(sessionStorage.getItem('dfa_drafting_' + ref) || 'null') || {};
    } catch (e) {
      return {};
    }
  }

  function getTerminalState(ref) {
    try {
      return JSON.parse(sessionStorage.getItem('dfa_terminal_' + ref) || 'null') || {};
    } catch (e) {
      return {};
    }
  }

  function caseFileDocs(ref) {
    if (typeof CaseFiling === 'undefined') return [];
    return CaseFiling.getDocuments(ref) || [];
  }

  function findDocByKey(ref, docKey) {
    if (typeof CaseFiling === 'undefined') return null;
    return CaseFiling.findByDocKey(ref, docKey);
  }

  function approvedDocsInFile(ref) {
    return caseFileDocs(ref).filter(function (d) {
      return d.status === 'approved' || d.source === 'drafting';
    });
  }

  function pointsSummary(points) {
    var pts = points || [];
    var red = pts.filter(function (p) { return p.evidenceStatus === 'red'; }).length;
    var amber = pts.filter(function (p) { return p.evidenceStatus === 'amber'; }).length;
    var green = pts.filter(function (p) { return p.evidenceStatus === 'green'; }).length;
    return { total: pts.length, red: red, amber: amber, green: green };
  }

  function runCheck(ref, caseData) {
    caseData = caseData || (typeof getCase === 'function' ? getCase(ref) : null) || {};
    var filing = typeof CaseFiling !== 'undefined' ? CaseFiling.getCase(ref) : null;
    var evPct = getEvidencePct(ref, caseData);
    var pts = pointsSummary(caseData.points || filing && filing.points || []);
    var checks = [];
    var score = 100;

    function add(id, label, status, detail, tab) {
      checks.push({ id: id, label: label, status: status, detail: detail, tab: tab || null });
      if (status === 'fail') score -= 18;
      else if (status === 'warn') score -= 8;
    }

    var hasLoc = caseFileDocs(ref).some(function (d) { return d.folderId === 'intake'; });
    add('loc', 'Letter of claim on file', hasLoc ? 'pass' : 'warn',
      hasLoc ? 'LOC indexed in case file intake folder.' : 'No LOC in live case file — confirm intake deposit.',
      'overview');

    var loaDoc = findDocByKey(ref, 'loa');
    var loaOk = caseData.loaStatus === 'sent' || caseData.loaStatus === 'approved' || !!loaDoc;
    add('loa', 'CPR acknowledgement (LOA)', loaOk ? 'pass' : 'warn',
      loaOk ? 'Letter of acknowledgement sent or on file.' : 'LOA not marked sent — check Deadlines tab.',
      'deadlines');

    var lorDoc = findDocByKey(ref, 'lor');
    var defenceDoc = findDocByKey(ref, 'defence');
    var primaryDoc = lorDoc || defenceDoc;
    add('primary_doc', 'Primary response document', primaryDoc ? 'pass' : 'fail',
      primaryDoc
        ? (primaryDoc.name || 'Response') + ' approved and filed in ' + (primaryDoc.folderId || 'legal_drafts') + '.'
        : 'No approved Letter of Response or Defence in case file — complete Documents tab first.',
      'documents');

    if (evPct >= 70) {
      add('evidence', 'Evidence pack', 'pass', 'Evidence ' + evPct + '% — sufficient for send.', 'evidence');
    } else if (evPct >= 40) {
      add('evidence', 'Evidence pack', 'warn', 'Evidence ' + evPct + '% — consider completing gold pack before send.', 'evidence');
    } else {
      add('evidence', 'Evidence pack', 'warn', 'Evidence ' + evPct + '% — key items may still be outstanding.', 'evidence');
    }

    if (pts.red === 0) {
      add('points', 'Points of claim coverage', pts.amber ? 'warn' : 'pass',
        pts.total
          ? pts.green + ' green · ' + pts.amber + ' amber · ' + pts.red + ' red across ' + pts.total + ' points.'
          : 'No structured claim points — triage data may be incomplete.',
        'triage');
    } else {
      add('points', 'Points of claim coverage', 'warn',
        pts.red + ' point(s) still red — verify citations in response match evidence on file.',
        'evidence');
    }

    var cprDays = caseData.cprDaysLeft != null ? caseData.cprDaysLeft : 21;
    if (cprDays <= 3) {
      add('cpr', 'CPR deadline', 'warn', cprDays + ' days remaining — prioritise dispatch today.', 'deadlines');
    } else if (cprDays <= 7) {
      add('cpr', 'CPR deadline', 'pass', cprDays + ' days to CPR deadline.', 'deadlines');
    } else {
      add('cpr', 'CPR deadline', 'pass', cprDays + ' days — within normal window.', 'deadlines');
    }

    if (filing) {
      add('case_file', 'Live case file', 'pass', 'Case file synced — ' + (filing.documents || []).length + ' documents indexed.', 'overview');
    } else {
      add('case_file', 'Live case file', 'warn', 'No live case file record — add approved docs from Documents tab.', 'documents');
    }

    var terminalState = getTerminalState(ref);
    if (terminalState.sentAt) {
      add('sent', 'Dispatch status', 'pass', 'Sent ' + terminalState.sentAt + ' via ' + (terminalState.method || 'email') + '.', null);
    }

    score = Math.max(0, Math.min(100, score));
    var blockers = checks.filter(function (c) { return c.status === 'fail'; });
    var warnings = checks.filter(function (c) { return c.status === 'warn'; });
    var status = blockers.length ? 'blocked' : warnings.length ? 'warnings' : 'ready';

    var pack = approvedDocsInFile(ref).map(function (d) {
      return {
        id: d.id,
        docKey: d.docKey || '',
        name: d.name,
        folderId: d.folderId,
        status: d.status,
        uploadedAt: d.uploadedAt,
        label: DOC_LABELS[d.docKey] || d.name
      };
    });

    var drafting = getDraftingState(ref);
    Object.keys(DOC_LABELS).forEach(function (key) {
      if (drafting.approved && drafting.approved[key] && !pack.some(function (p) { return p.docKey === key; })) {
        pack.push({
          docKey: key,
          name: DOC_LABELS[key],
          label: DOC_LABELS[key],
          status: 'approved',
          pendingFile: true
        });
      }
    });

    return {
      ref: ref,
      score: score,
      status: status,
      checks: checks,
      blockers: blockers.length,
      warnings: warnings.length,
      evidencePct: evPct,
      documents: pack,
      canSend: blockers.length === 0 && pack.length > 0 && !terminalState.sentAt,
      alreadySent: !!terminalState.sentAt,
      terminalState: terminalState,
      summary: status === 'ready'
        ? 'Case file and documents align — ready for final review and send.'
        : status === 'warnings'
          ? 'Send possible with ' + warnings.length + ' warning(s) — review before dispatch.'
          : 'Resolve ' + blockers.length + ' blocker(s) before sending.'
    };
  }

  function listTerminalQueue(cases) {
    return (cases || []).filter(function (c) {
      if (c.stage === 'resolve') return false;
      var health = runCheck(c.ref, c);
      if (health.alreadySent) return false;
      return health.documents.length > 0 || health.checks.some(function (ch) { return ch.id === 'primary_doc' && ch.status === 'pass'; });
    }).map(function (c) {
      var health = runCheck(c.ref, c);
      return {
        ref: c.ref,
        claimant: c.claimant,
        solicitor: c.solicitor,
        flightNum: c.flightNum,
        cprDaysLeft: c.cprDaysLeft,
        score: health.score,
        status: health.status,
        docCount: health.documents.length,
        canSend: health.canSend
      };
    }).sort(function (a, b) {
      return (a.cprDaysLeft || 99) - (b.cprDaysLeft || 99);
    });
  }

  return {
    DOC_LABELS: DOC_LABELS,
    PRIMARY_SEND_KEYS: PRIMARY_SEND_KEYS,
    runCheck: runCheck,
    listTerminalQueue: listTerminalQueue,
    getTerminalState: getTerminalState,
    approvedDocsInFile: approvedDocsInFile
  };
})();
