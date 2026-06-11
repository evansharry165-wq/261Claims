/* Team assignment and intake lead helpers */
var INTAKE_LEADS = ['SB', 'MD', 'CG'];

var ASSIGNABLE_BY_JURIS = {
  EW: ['JP', 'KR', 'SB'],
  EU: ['JP', 'KR', 'SB'],
  FR: ['MD', 'PL'],
  ES: ['CG', 'IM']
};

function isIntakeLead(uid) {
  return INTAKE_LEADS.indexOf(uid) >= 0;
}

function getAssignableUsers(jurisdictionCode) {
  var pool = ASSIGNABLE_BY_JURIS[jurisdictionCode || 'EW'] || ASSIGNABLE_BY_JURIS.EW;
  return pool.filter(function (id) {
    return USERS[id];
  });
}

function getCaseLoad(uid, extraCases) {
  if (typeof getAllCasesForUser === 'function') {
    return getAllCasesForUser(uid).filter(function (c) {
      return c.stage !== 'resolve';
    }).length;
  }
  var count = (ALL_CASES || []).filter(function (c) {
    return c.assignedTo === uid && c.stage !== 'resolve';
  }).length;
  (extraCases || []).forEach(function (c) {
    if (c.assignedTo === uid && c.stage !== 'resolve') count++;
  });
  (typeof uploadedCases !== 'undefined' ? uploadedCases : []).forEach(function (c) {
    if (c.assignedTo === uid && c.stage !== 'resolve') count++;
  });
  return count;
}

function suggestAssignee(jurisdictionCode, extraCases) {
  return pickDeterministicAssignee(jurisdictionCode, extraCases);
}

function pickDeterministicAssignee(jurisdictionCode, extraCases) {
  var pool = getAssignableUsers(jurisdictionCode);
  if (!pool.length) return 'SB';
  pool.sort(function (a, b) {
    var loadA = getCaseLoad(a, extraCases);
    var loadB = getCaseLoad(b, extraCases);
    if (loadA !== loadB) return loadA - loadB;
    return a.localeCompare(b);
  });
  return pool[0];
}

function assigneeOptionsHtml(selectedUid, jurisdictionCode) {
  return getAssignableUsers(jurisdictionCode)
    .map(function (uid) {
      var u = USERS[uid];
      var load = getCaseLoad(uid);
      return (
        '<option value="' +
        uid +
        '"' +
        (uid === selectedUid ? ' selected' : '') +
        '>' +
        (u ? u.name : uid) +
        ' (' +
        load +
        ' cases)</option>'
      );
    })
    .join('');
}

function getWorkloadByUser() {
  var ids = ['SB', 'JP', 'KR', 'MD', 'PL', 'CG', 'IM'];
  return ids
    .filter(function (uid) {
      return USERS[uid];
    })
    .map(function (uid) {
      return { uid: uid, count: getCaseLoad(uid), user: USERS[uid] };
    })
    .filter(function (x) {
      return x.count > 0;
    })
    .sort(function (a, b) {
      return b.count - a.count;
    });
}
