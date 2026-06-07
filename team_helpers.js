/* Team assignment and workload helpers */
var USER_COLORS = {
  SB: '#0B1628',
  JP: '#2A6FDB',
  KR: '#4338CA',
  MD: '#1a3a6b',
  PL: '#1D4ED8',
  CG: '#6b1a1a',
  IM: '#B45309',
  EH: '#164E63'
};

var ASSIGNABLE_USERS = ['SB', 'JP', 'KR', 'MD', 'PL', 'CG', 'IM'];

function getCaseLoad(uid) {
  return (ALL_CASES || []).filter(function (c) {
    return c.assignedTo === uid && c.stage !== 'resolve';
  }).length;
}

function getAssignableUsers() {
  return ASSIGNABLE_USERS.filter(function (id) {
    return USERS[id];
  });
}

function getWorkloadByUser() {
  var counts = {};
  getAssignableUsers().forEach(function (uid) {
    counts[uid] = 0;
  });
  (ALL_CASES || []).forEach(function (c) {
    if (c.stage !== 'resolve' && counts.hasOwnProperty(c.assignedTo)) {
      counts[c.assignedTo]++;
    }
  });
  return getAssignableUsers()
    .filter(function (uid) {
      return counts[uid] >= 1;
    })
    .map(function (uid) {
      return { uid: uid, count: counts[uid], user: USERS[uid] };
    })
    .sort(function (a, b) {
      return b.count - a.count;
    });
}

function assignCaseTo(ref, uid) {
  if (typeof STATE === 'undefined') return null;
  var u = USERS[uid];
  var c = STATE.updateCase(ref, { assignedTo: uid });
  if (c) {
    STATE.appendActivity(ref, {
      text: 'Case reassigned to ' + (u ? u.name : uid),
      time: 'Just now',
      type: 'action'
    });
  }
  return c;
}

function userBadgeColor(uid) {
  return USER_COLORS[uid] || '#374151';
}

function assigneeOptionsHtml(selectedUid) {
  return getAssignableUsers()
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
        ' case' +
        (load !== 1 ? 's' : '') +
        ')</option>'
      );
    })
    .join('');
}

function assignDropdownHtml(ref, currentUid) {
  return (
    '<div class="assign-menu" onclick="event.stopPropagation()">' +
    getAssignableUsers()
      .map(function (uid) {
        var u = USERS[uid];
        var load = getCaseLoad(uid);
        var on = uid === currentUid ? ' current' : '';
        return (
          '<button type="button" class="assign-opt' +
          on +
          '" onclick="assignCaseRow(\'' +
          ref +
          '\',\'' +
          uid +
          '\',event)"><span class="assign-opt-av" style="background:' +
          userBadgeColor(uid) +
          '">' +
          (u ? u.initials : uid) +
          '</span><span class="assign-opt-meta"><span class="assign-opt-name">' +
          (u ? u.name : uid) +
          '</span><span class="assign-opt-load">' +
          load +
          ' active case' +
          (load !== 1 ? 's' : '') +
          '</span></span></button>'
        );
      })
      .join('') +
    '</div>'
  );
}

function workloadBarHtml() {
  var rows = getWorkloadByUser();
  if (!rows.length) return '';
  var max = Math.max.apply(
    null,
    rows.map(function (r) {
      return r.count;
    })
  );
  return (
    '<div class="workload-bar"><div class="workload-bar-title"><i class="ti ti-users"></i> Team workload</div><div class="workload-items">' +
    rows
      .map(function (r) {
        var pct = Math.round((r.count / max) * 100);
        return (
          '<div class="workload-item"><span class="wl-av" style="background:' +
          userBadgeColor(r.uid) +
          '">' +
          r.user.initials +
          '</span><span class="wl-name">' +
          r.user.name +
          '</span><span class="wl-count">' +
          r.count +
          '</span><div class="wl-track"><div class="wl-fill" style="width:' +
          pct +
          '%;background:' +
          userBadgeColor(r.uid) +
          '"></div></div></div>'
        );
      })
      .join('') +
    '</div></div>'
  );
}

function renderUserDropdownLabels() {
  document.querySelectorAll('.ud-item[id^="ud-"]').forEach(function (el) {
    var uid = el.id.replace('ud-', '');
    var u = typeof USERS !== 'undefined' ? USERS[uid] : null;
    if (!u) return;
    var nameEl = el.querySelector('.ud-name');
    if (nameEl) {
      var load = getCaseLoad(uid);
      nameEl.textContent = u.name + ' — ' + load + ' case' + (load !== 1 ? 's' : '');
    }
  });
}
