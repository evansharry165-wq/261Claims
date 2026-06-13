/**
 * Demo user switcher — full role list with team-aware routing.
 */
(function (global) {
  'use strict';

  var ALL_IDS = ['SB', 'JP', 'KR', 'MD', 'PL', 'CG', 'IM', 'EH', 'FD', 'SR'];
  var AVATAR_BG = {
    EH: '#164E63',
    FD: '#4A3728',
    SR: '#2D4A3E',
    MD: '#1a3a6b',
    PL: '#1a3a6b',
    CG: '#6b1a1a',
    IM: '#6b1a1a',
  };

  var GROUPS = [
    { ids: ['SB', 'JP', 'KR'] },
    { ids: ['MD', 'PL'] },
    { ids: ['CG', 'IM'] },
    { ids: ['EH', 'FD', 'SR'] },
  ];

  var DIO_PAGES = ['dio.html', 'dio-case.html', 'dio-knowledge.html'];
  var SOLICITOR_ONLY = [
    'index.html',
    '',
    'terminal.html',
    'insights.html',
    'education.html',
    'intake.html',
    'case.html',
  ];

  function currentPage() {
    return window.location.pathname.split('/').pop() || '';
  }

  function isDioPage() {
    return DIO_PAGES.indexOf(currentPage()) >= 0;
  }

  function homeForUser(uid) {
    var u = typeof USERS !== 'undefined' ? USERS[uid] : null;
    if (!u) return 'index.html';
    if (u.team === 'dio') return 'dio.html';
    if (u.team === 'evidence') return 'requests.html';
    return 'index.html';
  }

  function escapeHtml(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  function userItemHtml(uid) {
    var u = typeof USERS !== 'undefined' ? USERS[uid] : null;
    if (!u) return '';
    var bg = AVATAR_BG[uid] ? ' style="background:' + AVATAR_BG[uid] + '"' : '';
    return (
      '<div class="ud-item" id="ud-' +
      uid +
      '" onclick="DemoUserSwitch.switch(\'' +
      uid +
      '\')">' +
      '<div class="ud-av"' +
      bg +
      '>' +
      escapeHtml(u.initials) +
      '</div>' +
      '<div><div class="ud-name">' +
      escapeHtml(u.full) +
      '</div><div class="ud-role">' +
      escapeHtml(u.role) +
      '</div></div>' +
      '<i class="ti ti-check ud-tick"></i></div>'
    );
  }

  function dropdownHtml() {
    var parts = ['<div class="ud-header">Switch user — demo</div>'];
    GROUPS.forEach(function (g, i) {
      if (i > 0) {
        parts.push('<div style="height:1px;background:var(--border,var(--rule));margin:4px 0"></div>');
      }
      g.ids.forEach(function (uid) {
        parts.push(userItemHtml(uid));
      });
    });
    return parts.join('');
  }

  function markCurrent(uid) {
    ALL_IDS.forEach(function (id) {
      var el = document.getElementById('ud-' + id);
      if (el) el.classList.toggle('current', id === uid);
    });
    var u = typeof USERS !== 'undefined' ? USERS[uid] : null;
    if (!u) return;
    var av = document.getElementById('nav-av');
    var un = document.getElementById('nav-user');
    if (av) av.textContent = u.initials;
    if (un) un.textContent = u.name;
  }

  function switchUser(uid) {
    if (typeof setActiveUser === 'function') setActiveUser(uid);
    try {
      sessionStorage.removeItem('dfa_lang');
    } catch (e) {}
    var page = currentPage();
    if (page.indexOf('workspace') >= 0 || page === 'case.html') {
      try {
        sessionStorage.removeItem('dfa_case');
        sessionStorage.removeItem('aeroCaseData');
      } catch (e) {}
    }
    closeMenu();

    var u = typeof USERS !== 'undefined' ? USERS[uid] : null;
    var team = u && u.team ? u.team : 'legal';

    if (isDioPage() && team !== 'dio') {
      window.location.href = homeForUser(uid);
      return;
    }
    if (team === 'dio' && SOLICITOR_ONLY.indexOf(page) >= 0) {
      window.location.href = 'dio.html';
      return;
    }
    if (page.indexOf('module') >= 0 && team === 'dio') {
      var ref = new URLSearchParams(window.location.search).get('ref');
      window.location.href = ref ? 'dio-case.html?ref=' + encodeURIComponent(ref) : 'dio.html';
      return;
    }
    if (page === 'requests.html' && team !== 'dio' && team !== 'evidence') {
      window.location.href = homeForUser(uid);
      return;
    }

    markCurrent(uid);
    if (typeof renderGlobalNav === 'function') renderGlobalNav();
    if (typeof render === 'function') render();
    else if (typeof init === 'function') init();
  }

  function toggleMenu() {
    var m = document.getElementById('user-modal');
    if (m) m.classList.toggle('open');
  }

  function closeMenu() {
    var m = document.getElementById('user-modal');
    if (m) m.classList.remove('open');
  }

  function mountDropdown() {
    var dd = document.querySelector('#user-modal .user-dropdown');
    if (!dd || dd.getAttribute('data-full-menu') === '1') return;
    dd.innerHTML = dropdownHtml();
    dd.setAttribute('data-full-menu', '1');
    var uid = typeof getActiveUser === 'function' ? getActiveUser() : 'SB';
    markCurrent(uid);
  }

  global.DemoUserSwitch = {
    switch: switchUser,
    toggleMenu: toggleMenu,
    closeMenu: closeMenu,
    mountDropdown: mountDropdown,
    homeForUser: homeForUser,
  };

  global.switchUser = switchUser;
  global.toggleUserMenu = toggleMenu;
  global.closeMenu = closeMenu;

  function init() {
    mountDropdown();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  setTimeout(mountDropdown, 120);
})(typeof window !== 'undefined' ? window : this);
