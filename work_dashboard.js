/**
 * Work dashboard helpers — role-aware activity, CPR calendar, ICS export.
 */
(function (global) {
  'use strict';

  var DEMO_TODAY = new Date(2026, 5, 9, 9, 0, 0); // 9 Jun 2026 — demo anchor
  var LAST_VISIT_KEY = '261c_last_visit_';
  var WORK_NOTES_KEY = '261c_work_notes';

  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var MONTHS_FR = { janvier: 0, fevrier: 1, février: 1, mars: 2, avril: 3, mai: 4, juin: 5, juillet: 6, aout: 7, août: 7, septembre: 8, octobre: 9, novembre: 10, decembre: 11, décembre: 11 };
  var MONTHS_ES = { enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5, julio: 6, agosto: 7, septiembre: 8, octubre: 9, noviembre: 10, diciembre: 11 };

  function pad(n) {
    return n < 10 ? '0' + n : String(n);
  }

  function isoDate(d) {
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function getDemoToday() {
    return new Date(DEMO_TODAY.getTime());
  }

  function addDays(d, n) {
    var x = new Date(d.getTime());
    x.setDate(x.getDate() + n);
    return x;
  }

  function parseMonthToken(token) {
    var t = String(token || '').toLowerCase().replace(/[^a-zà-ÿ]/gi, '');
    var en = MONTHS_SHORT.map(function (m) {
      return m.toLowerCase();
    });
    var i = en.indexOf(t.slice(0, 3));
    if (i >= 0) return i;
    if (MONTHS_FR[t] != null) return MONTHS_FR[t];
    if (MONTHS_ES[t] != null) return MONTHS_ES[t];
    return -1;
  }

  function parseLocDate(str) {
    if (!str) return null;
    var s = String(str).trim();
    if (/^today$/i.test(s) || /^date pending$/i.test(s)) return getDemoToday();
    var m = s.match(/(\d{1,2})\s+([A-Za-zÀ-ÿ]+)\s+(\d{4})/);
    if (m) {
      var mo = parseMonthToken(m[2]);
      if (mo >= 0) return new Date(parseInt(m[3], 10), mo, parseInt(m[1], 10));
    }
    return null;
  }

  function parseActivityTime(str) {
    if (!str) return null;
    var s = String(str).trim();
    var today = getDemoToday();
    if (/just now/i.test(s)) return new Date(today.getTime());
    if (/today/i.test(s)) {
      var d = new Date(today.getTime());
      var tm = s.match(/(\d{1,2}):(\d{2})/);
      if (tm) d.setHours(parseInt(tm[1], 10), parseInt(tm[2], 10), 0, 0);
      return d;
    }
    if (/yesterday/i.test(s)) {
      var y = addDays(today, -1);
      var tm2 = s.match(/(\d{1,2}):(\d{2})/);
      if (tm2) y.setHours(parseInt(tm2[1], 10), parseInt(tm2[2], 10), 0, 0);
      return y;
    }
    var dm = s.match(/(\d{1,2})\s+([A-Za-zÀ-ÿ]+)(?:\s+(\d{4}))?(?:\s+(\d{1,2}):(\d{2}))?/);
    if (dm) {
      var mo = parseMonthToken(dm[2]);
      if (mo >= 0) {
        var yr = dm[3] ? parseInt(dm[3], 10) : today.getFullYear();
        var dt = new Date(yr, mo, parseInt(dm[1], 10));
        if (dm[4]) dt.setHours(parseInt(dm[4], 10), parseInt(dm[5], 10), 0, 0);
        return dt;
      }
    }
    return null;
  }

  function getLastVisit(uid) {
    try {
      var raw = localStorage.getItem(LAST_VISIT_KEY + uid);
      if (raw) return new Date(raw);
    } catch (e) {}
    return addDays(getDemoToday(), -1);
  }

  function recordVisit(uid) {
    try {
      localStorage.setItem(LAST_VISIT_KEY + uid, getDemoToday().toISOString());
    } catch (e) {}
  }

  function isEvidenceUser(uid) {
    var u = typeof USERS !== 'undefined' ? USERS[uid] : null;
    return !!(u && u.team === 'evidence');
  }

  function urgencyFromDays(d) {
    if (d <= 3) return 'urgent';
    if (d <= 7) return 'warn';
    return 'ok';
  }

  function buildCprEventsForCase(c) {
    var events = [];
    var today = getDemoToday();
    var loc = parseLocDate(c.locDate) || today;
    var jur = typeof getJurisdiction === 'function' ? getJurisdiction(c.jurisdiction) : null;

    if (c.cprDaysLeft != null && c.stage !== 'resolve') {
      var cprDate = addDays(today, c.cprDaysLeft);
      events.push({
        id: c.ref + '-cpr-next',
        ref: c.ref,
        claimant: c.claimant,
        date: cprDate,
        iso: isoDate(cprDate),
        label: 'Next CPR deadline',
        note: (c.cprDaysLeft <= 3 ? 'URGENT — ' : '') + c.cprDaysLeft + ' days remaining on pre-action clock',
        type: 'cpr',
        urgency: urgencyFromDays(c.cprDaysLeft),
        tab: 'deadlines',
      });
    }

    if (jur && jur.keyDates) {
      jur.keyDates.forEach(function (kd, idx) {
        var d = addDays(loc, kd.days);
        if (d < addDays(today, -30)) return;
        var daysUntil = Math.round((d - today) / 86400000);
        events.push({
          id: c.ref + '-kd-' + idx,
          ref: c.ref,
          claimant: c.claimant,
          date: d,
          iso: isoDate(d),
          label: kd.label,
          note: kd.note || jur.procedureNote || '',
          type: 'deadline',
          urgency: daysUntil <= 3 ? 'urgent' : daysUntil <= 7 ? 'warn' : kd.urgency === 'critical' ? 'warn' : 'ok',
          tab: 'deadlines',
        });
      });
    }

    if (c.triageNote) {
      events.push({
        id: c.ref + '-note',
        ref: c.ref,
        claimant: c.claimant,
        date: today,
        iso: isoDate(today),
        label: 'Case note',
        note: c.triageNote,
        type: 'comment',
        urgency: 'ok',
        tab: getPrimaryTab ? getPrimaryTab(c) : 'overview',
      });
    }

    return events;
  }

  function buildCalendarEvents(cases) {
    var events = [];
    (cases || []).forEach(function (c) {
      if (c.stage === 'resolve') return;
      events = events.concat(buildCprEventsForCase(c));
    });
    return events.sort(function (a, b) {
      return a.date - b.date;
    });
  }

  function collectActivity(cases, uid) {
    var items = [];
    (cases || []).forEach(function (c) {
      (c.activity || []).forEach(function (a, i) {
        var when = parseActivityTime(a.time) || getDemoToday();
        items.push({
          id: c.ref + '-act-' + i,
          ref: c.ref,
          claimant: c.claimant,
          text: a.text,
          time: a.time,
          when: when,
          type: a.type || 'action',
          tab: typeof getPrimaryTab === 'function' ? getPrimaryTab(c) : 'overview',
          by: c.assignedTo,
        });
      });
    });

    if (typeof getNotifications === 'function') {
      getNotifications(uid).forEach(function (n, i) {
        items.push({
          id: 'notif-' + (n.id || i),
          ref: n.ref || '',
          claimant: '',
          text: (n.title ? n.title + ' — ' : '') + (n.body || ''),
          time: n.time || 'Today',
          when: parseActivityTime(n.time) || getDemoToday(),
          type: 'notification',
          tab: n.tab || 'evidence',
          by: n.from || 'System',
          unread: !n.read,
        });
      });
    }

    if (typeof CaseFiling !== 'undefined') {
      try {
        CaseFiling.listCases({ assignedTo: uid }).forEach(function (cf) {
          (cf.activity || []).slice(0, 5).forEach(function (a, i) {
            items.push({
              id: cf.ref + '-cf-' + i,
              ref: cf.ref,
              claimant: cf.claimant,
              text: a.text,
              time: a.time,
              when: parseActivityTime(a.time) || getDemoToday(),
              type: a.type || 'upload',
              tab: 'overview',
              by: a.by || 'Team',
            });
          });
        });
      } catch (e) {}
    }

    items.sort(function (a, b) {
      return b.when - a.when;
    });
    return items;
  }

  function getUpdatesSinceLogin(cases, uid) {
    var last = getLastVisit(uid);
    return collectActivity(cases, uid).filter(function (a) {
      return a.when > last || a.unread;
    });
  }

  function getOngoingCases(cases) {
    return (cases || [])
      .filter(function (c) {
        return c.stage !== 'resolve';
      })
      .map(function (c) {
        var action = typeof getNextAction === 'function' ? getNextAction(c) : { text: 'Open case', tab: 'overview' };
        var evPct = typeof getEffectiveEvidencePct === 'function' ? getEffectiveEvidencePct(c) : c.evidencePct || 0;
        return {
          ref: c.ref,
          claimant: c.claimant,
          flightNum: c.flightNum,
          stage: c.stage,
          value: c.value,
          cprDaysLeft: c.cprDaysLeft,
          evidencePct: evPct,
          action: action.text,
          tab: action.tab,
          urgency: urgencyFromDays(c.cprDaysLeft || 99),
        };
      })
      .sort(function (a, b) {
        return a.cprDaysLeft - b.cprDaysLeft;
      });
  }

  function eventsInMonth(events, year, month) {
    return events.filter(function (e) {
      return e.date.getFullYear() === year && e.date.getMonth() === month;
    });
  }

  function eventsOnDate(events, iso) {
    return events.filter(function (e) {
      return e.iso === iso;
    });
  }

  function buildMonthGrid(year, month, events, selectedIso) {
    var first = new Date(year, month, 1);
    var startDow = (first.getDay() + 6) % 7;
    var daysInMonth = new Date(year, month + 1, 0).getDate();
    var todayIso = isoDate(getDemoToday());
    var cells = [];
    var i;
    for (i = 0; i < startDow; i++) cells.push({ empty: true });
    for (var day = 1; day <= daysInMonth; day++) {
      var iso = year + '-' + pad(month + 1) + '-' + pad(day);
      var dayEvents = eventsOnDate(events, iso);
      cells.push({
        day: day,
        iso: iso,
        isToday: iso === todayIso,
        isSelected: iso === selectedIso,
        events: dayEvents,
        hasUrgent: dayEvents.some(function (e) {
          return e.urgency === 'urgent';
        }),
      });
    }
    return cells;
  }

  function fmtIcs(dt) {
    return dt.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  }

  function buildIcsEvent(ev) {
    var start = new Date(ev.date.getTime());
    start.setHours(9, 0, 0, 0);
    var end = new Date(start.getTime() + 3600000);
    var uid = ev.id + '@261claims';
    var desc = (ev.note || '').replace(/\r?\n/g, '\\n').replace(/,/g, '\\,');
    return (
      'BEGIN:VEVENT\r\n' +
      'UID:' +
      uid +
      '\r\n' +
      'DTSTART:' +
      fmtIcs(start) +
      '\r\n' +
      'DTEND:' +
      fmtIcs(end) +
      '\r\n' +
      'SUMMARY:' +
      ev.label +
      ' — ' +
      ev.claimant +
      ' (' +
      ev.ref +
      ')\r\n' +
      'DESCRIPTION:' +
      desc +
      '\r\n' +
      'END:VEVENT\r\n'
    );
  }

  function downloadCalendarIcs(events, filename) {
    var body = events.map(buildIcsEvent).join('');
    var ics = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//261Claims//EN\r\nCALSCALE:GREGORIAN\r\n' + body + 'END:VCALENDAR\r\n';
    var blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename || '261Claims-CPR-deadlines.ics';
    a.click();
    setTimeout(function () {
      URL.revokeObjectURL(a.href);
    }, 500);
  }

  function roleSummary(uid, cases, updates, tasks) {
    var u = typeof USERS !== 'undefined' ? USERS[uid] : null;
    var urgent = (cases || []).filter(function (c) {
      return c.cprDaysLeft <= 7 && c.stage !== 'resolve';
    }).length;
    return {
      role: u ? u.role : '',
      team: u && u.team === 'evidence' ? 'evidence' : 'legal',
      urgent: urgent,
      updates: updates.length,
      active: (cases || []).filter(function (c) {
        return c.stage !== 'resolve';
      }).length,
      tasks: tasks.length,
    };
  }

  global.WorkDashboard = {
    DEMO_TODAY: DEMO_TODAY,
    getDemoToday: getDemoToday,
    isoDate: isoDate,
    getLastVisit: getLastVisit,
    recordVisit: recordVisit,
    isEvidenceUser: isEvidenceUser,
    buildCalendarEvents: buildCalendarEvents,
    collectActivity: collectActivity,
    getUpdatesSinceLogin: getUpdatesSinceLogin,
    getOngoingCases: getOngoingCases,
    eventsInMonth: eventsInMonth,
    eventsOnDate: eventsOnDate,
    buildMonthGrid: buildMonthGrid,
    downloadCalendarIcs: downloadCalendarIcs,
    roleSummary: roleSummary,
    MONTHS: MONTHS,
  };
})(typeof window !== 'undefined' ? window : this);
