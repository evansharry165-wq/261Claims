/* Global navigation — Phase 1 (4-item nav) */
(function () {
  var FALLBACK = {
    work: 'Work',
    cases: 'Cases',
    repository: 'Repository',
    insights: 'Insights',
    education: 'Education',
    terminal: 'Terminal',
    requests: 'Requests'
  };

  var LEGAL_NAV = [
    { key: 'work', icon: 'ti-layout-dashboard', href: 'index.html' },
    { key: 'cases', icon: 'ti-briefcase', href: 'cases.html' },
    { key: 'terminal', icon: 'ti-send', href: 'terminal.html' },
    { key: 'repository', icon: 'ti-database', href: 'repository.html' },
    { key: 'insights', icon: 'ti-chart-dots', href: 'insights.html' },
    { key: 'education', icon: 'ti-school', href: 'education.html' }
  ];

  var DIO_NAV = [
    { key: 'work', icon: 'ti-layout-dashboard', href: 'index.html' },
    { key: 'requests', icon: 'ti-inbox', href: 'requests.html' },
    { key: 'cases', icon: 'ti-files', href: 'cases.html' },
    { key: 'knowledge', icon: 'ti-book-2', href: 'education.html' },
    { key: 'repository', icon: 'ti-database', href: 'repository.html' }
  ];

  var EVIDENCE_NAV = [
    { key: 'work', icon: 'ti-layout-dashboard', href: 'index.html' },
    { key: 'requests', icon: 'ti-user-question', href: 'requests.html' },
    { key: 'repository', icon: 'ti-database', href: 'repository.html' },
    { key: 'insights', icon: 'ti-chart-dots', href: 'insights.html' },
    { key: 'education', icon: 'ti-school', href: 'education.html' }
  ];

  function activePageKey() {
    var p = window.location.pathname.split('/').pop() || 'index.html';
    if (p === 'index.html' || p === '') return 'work';
    if (p === 'case.html' || p === 'cases.html') return 'cases';
    if (p === 'terminal.html' || p.indexOf('module8') >= 0) return 'terminal';
    if (p === 'intake.html' || p.indexOf('module1') >= 0 || p.indexOf('intake') >= 0) return 'cases';
    if (p === 'requests.html') return 'requests';
    if (p.indexOf('module2') >= 0 || p.indexOf('module3') >= 0) return 'cases';
    if (p.indexOf('module4-evidence.html') >= 0 || p.indexOf('module4') >= 0) {
      var uid = typeof getActiveUser === 'function' ? getActiveUser() : 'SB';
      var u = typeof USERS !== 'undefined' ? USERS[uid] : null;
      if (u && u.team === 'dio') return 'cases';
      return u && u.team === 'evidence' ? 'requests' : 'cases';
    }
    if (p.indexOf('module5') >= 0) return 'cases';
    if (p === 'insights.html' || p.indexOf('module6') >= 0) return 'insights';
    if (p === 'education.html' || p.indexOf('module7') >= 0 || p.indexOf('education') >= 0) return 'education';
    if (p.indexOf('repository') >= 0) return 'repository';
    return 'work';
  }

  function urgentCaseCount(uid) {
    if (typeof getMergedCasesForUser === 'function') {
      return getMergedCasesForUser(uid).filter(function (c) {
        return c.cprDaysLeft <= 7 && c.stage !== 'resolve';
      }).length;
    }
    if (typeof getCasesForUser !== 'function' || typeof ALL_CASES === 'undefined') return 0;
    return getCasesForUser(uid).filter(function (c) {
      return c.cprDaysLeft <= 7 && c.stage !== 'resolve';
    }).length;
  }

  function terminalQueueCount(uid) {
    if (typeof WorkDashboard !== 'undefined' && WorkDashboard.getTerminalQueueForUser) {
      return WorkDashboard.getTerminalQueueForUser(uid).length;
    }
    return 0;
  }

  function renderGlobalNav() {
    if (typeof t !== 'function') return;

    var uid = typeof getActiveUser === 'function' ? getActiveUser() : 'SB';
    var u = typeof USERS !== 'undefined' ? USERS[uid] : null;
    var isDIO = u && u.team === 'dio';
    var isEvidence = u && u.team === 'evidence';
    var links = isDIO ? DIO_NAV : isEvidence ? EVIDENCE_NAV : LEGAL_NAV;
    var active = activePageKey();
    var urgentN = !isEvidence && !isDIO ? urgentCaseCount(uid) : 0;

    var avEl = document.getElementById('nav-av') || document.getElementById('u-av');
    var unEl = document.getElementById('nav-user') || document.getElementById('u-name');
    if (avEl && u) avEl.textContent = u.initials;
    if (unEl && u) unEl.textContent = u.name;

    var linksEl = document.getElementById('gn-links') || document.querySelector('.gn-links');
    if (linksEl) {
      var linkCls = linksEl.classList.contains('nav-links') ? 'nl' : 'gn-link';
      linksEl.innerHTML = links
        .map(function (l) {
          var label = typeof t === 'function' ? t(l.key) : null;
          if (!label || label === l.key) label = FALLBACK[l.key] || l.key;
          var isActive = active === l.key;
          var badge =
            l.key === 'cases' && urgentN > 0
              ? ' <span class="gn-badge" style="margin-left:4px;font-size:9px;font-weight:600;background:#C0392B;color:#fff;border-radius:10px;padding:1px 6px;line-height:1.4">' +
                urgentN +
                '</span>'
              : l.key === 'terminal' && !isEvidence && !isDIO && terminalQueueCount(uid) > 0
                ? ' <span class="gn-badge" style="margin-left:4px;font-size:9px;font-weight:600;background:#0F766E;color:#fff;border-radius:10px;padding:1px 6px;line-height:1.4">' +
                  terminalQueueCount(uid) +
                  '</span>'
                : '';
          return (
            '<a href="' +
            l.href +
            '" class="' +
            linkCls +
            (isActive ? ' active' : '') +
            '" id="gnl-' +
            l.key +
            '"><i class="ti ' +
            l.icon +
            '"></i> <span class="gnl">' +
            label +
            badge +
            '</span></a>'
          );
        })
        .join('');
    }

    var repoLink = document.querySelector('.gn-right .repo-nav');
    if (repoLink) repoLink.style.display = 'none';
  }

  window.renderGlobalNav = renderGlobalNav;

  function loadSharedAssets() {
    if (!document.getElementById('dfa-theme-loader')) {
      var theme = document.createElement('script');
      theme.id = 'dfa-theme-loader';
      theme.src = 'shared_theme.js';
      document.head.appendChild(theme);
    }
    if (!document.getElementById('dfa-demo-reset')) {
      var reset = document.createElement('script');
      reset.id = 'dfa-demo-reset';
      reset.src = 'demo_reset.js';
      document.head.appendChild(reset);
    }
    if (!document.getElementById('dfa-user-menu')) {
      var menu = document.createElement('script');
      menu.id = 'dfa-user-menu';
      menu.src = 'shared_user_menu.js';
      document.head.appendChild(menu);
    }
  }

  function init() {
    loadSharedAssets();
    renderGlobalNav();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  setTimeout(renderGlobalNav, 120);
})();
