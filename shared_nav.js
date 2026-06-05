/* Global navigation — Phase 1 (4-item nav) */
(function () {
  var FALLBACK = {
    work: 'Work',
    cases: 'Cases',
    repository: 'Repository',
    insights: 'Insights',
    requests: 'Requests'
  };

  var LEGAL_NAV = [
    { key: 'work', icon: 'ti-layout-dashboard', href: 'index.html' },
    { key: 'cases', icon: 'ti-briefcase', href: 'cases.html' },
    { key: 'repository', icon: 'ti-database', href: 'repository.html' },
    { key: 'insights', icon: 'ti-chart-dots', href: 'insights.html' }
  ];

  var EVIDENCE_NAV = [
    { key: 'work', icon: 'ti-layout-dashboard', href: 'index.html' },
    { key: 'requests', icon: 'ti-user-question', href: 'requests.html' },
    { key: 'repository', icon: 'ti-database', href: 'repository.html' },
    { key: 'insights', icon: 'ti-chart-dots', href: 'insights.html' }
  ];

  function activePageKey() {
    var p = window.location.pathname.split('/').pop() || 'index.html';
    if (p === 'index.html' || p === '') return 'work';
    if (p === 'case.html' || p === 'cases.html') return 'cases';
    if (p === 'intake.html' || p.indexOf('module1') >= 0 || p.indexOf('intake') >= 0) return 'cases';
    if (p === 'requests.html') return 'requests';
    if (p.indexOf('module2') >= 0 || p.indexOf('module3') >= 0) return 'cases';
    if (p.indexOf('module4-evidence.html') >= 0 || p.indexOf('module4') >= 0) {
      var uid = typeof getActiveUser === 'function' ? getActiveUser() : 'SB';
      var u = typeof USERS !== 'undefined' ? USERS[uid] : null;
      return u && u.team === 'evidence' ? 'requests' : 'cases';
    }
    if (p.indexOf('module5') >= 0) return 'cases';
    if (p === 'insights.html' || p.indexOf('module6') >= 0 || p.indexOf('education') >= 0 || p.indexOf('module7') >= 0) return 'insights';
    if (p.indexOf('repository') >= 0) return 'repository';
    return 'work';
  }

  function renderGlobalNav() {
    if (typeof t !== 'function') return;

    var uid = typeof getActiveUser === 'function' ? getActiveUser() : 'SB';
    var u = typeof USERS !== 'undefined' ? USERS[uid] : null;
    var isEvidence = u && u.team === 'evidence';
    var links = isEvidence ? EVIDENCE_NAV : LEGAL_NAV;
    var active = activePageKey();

    var avEl = document.getElementById('nav-av') || document.getElementById('u-av');
    var unEl = document.getElementById('nav-user') || document.getElementById('u-name');
    if (avEl && u) avEl.textContent = u.initials;
    if (unEl && u) unEl.textContent = u.name;

    var linksEl = document.getElementById('gn-links') || document.querySelector('.gn-links');
    if (linksEl) {
      var linkCls = linksEl.classList.contains('nav-links') ? 'nl' : 'gn-link';
      linksEl.innerHTML = links
        .map(function (l) {
          var label = (typeof t === 'function' ? t(l.key) : null) || FALLBACK[l.key] || l.key;
          var isActive = active === l.key;
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
            '</span></a>'
          );
        })
        .join('');
    }

    var repoLink = document.querySelector('.gn-right .repo-nav');
    if (repoLink) repoLink.style.display = 'none';
  }

  window.renderGlobalNav = renderGlobalNav;

  function init() {
    renderGlobalNav();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  setTimeout(renderGlobalNav, 120);
})();
