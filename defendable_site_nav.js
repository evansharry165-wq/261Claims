/**
 * DefendAble site spine — keeps intelligence pages + Manage on one line.
 *
 * Home → Analyse → Journey → Law → Cases → Guide
 */
(function () {
  var SPINE = [
    { key: 'home', label: 'Home', href: 'index.html' },
    { key: 'analyse', label: 'Analyse', href: 'defendable_analyser_v3.html' },
    { key: 'journey', label: 'Journey', href: 'defendable_product_flow.html' },
    { key: 'law', label: 'Law', href: 'defendable_reference.html' },
    { key: 'cases', label: 'Cases', href: 'cases.html' },
    { key: 'guide', label: 'Guide', href: 'defendable_phase3_guide.html' }
  ];

  function pageFile() {
    return (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
  }

  function activeKey() {
    var p = pageFile();
    if (p === 'index.html' || p === '' || p === 'dio.html') return 'home';
    if (p.indexOf('defendable_analyser') === 0 || p === 'defendable_lof_v1.html') return 'analyse';
    if (p === 'defendable_product_flow.html') return 'journey';
    if (p === 'defendable_reference.html') return 'law';
    if (p === 'cases.html' || p === 'case.html' || p === 'dio-case.html') return 'cases';
    if (p === 'defendable_phase3_guide.html') return 'guide';
    return null;
  }

  /**
   * Fill a container with spine links.
   * @param {Element|string} elOrSelector
   * @param {{ exclude?: string[], linkClass?: string, activeClass?: string, wrapTag?: string }} opts
   */
  function renderDefendableSiteNav(elOrSelector, opts) {
    opts = opts || {};
    var el =
      typeof elOrSelector === 'string'
        ? document.querySelector(elOrSelector)
        : elOrSelector;
    if (!el) return;

    var exclude = opts.exclude || [];
    var linkClass = opts.linkClass || '';
    var activeClass = opts.activeClass || 'active';
    var wrapTag = opts.wrapTag || null;
    var active = activeKey();

    var html = SPINE.filter(function (item) {
      return exclude.indexOf(item.key) === -1;
    })
      .map(function (item) {
        var isActive = active === item.key;
        var cls = [linkClass, isActive ? activeClass : ''].filter(Boolean).join(' ');
        var a =
          '<a href="' +
          item.href +
          '"' +
          (cls ? ' class="' + cls + '"' : '') +
          (isActive ? ' aria-current="page"' : '') +
          '>' +
          item.label +
          '</a>';
        return wrapTag ? '<' + wrapTag + '>' + a + '</' + wrapTag + '>' : a;
      })
      .join('');

    el.innerHTML = html;
  }

  function enhanceBrandLinks() {
    document.querySelectorAll('[data-defendable-brand]').forEach(function (a) {
      if (!a.getAttribute('href') || a.getAttribute('href') === '#') {
        a.setAttribute('href', 'index.html');
      }
    });
  }

  function autoMount() {
    enhanceBrandLinks();
    document.querySelectorAll('[data-defendable-nav]').forEach(function (el) {
      var wrap = el.getAttribute('data-wrap') || null;
      var linkClass = el.getAttribute('data-link-class') || '';
      var activeClass = el.getAttribute('data-active-class') || 'active';
      var excludeAttr = el.getAttribute('data-exclude') || '';
      var exclude = excludeAttr
        ? excludeAttr.split(',').map(function (s) {
            return s.trim();
          })
        : [];
      renderDefendableSiteNav(el, {
        wrapTag: wrap,
        linkClass: linkClass,
        activeClass: activeClass,
        exclude: exclude
      });
    });
  }

  window.DEFENDABLE_SITE_NAV = SPINE;
  window.renderDefendableSiteNav = renderDefendableSiteNav;
  window.defendableNavActiveKey = activeKey;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoMount);
  } else {
    autoMount();
  }
})();
