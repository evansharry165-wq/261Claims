/* Embed mode + redirect for legacy case workspaces */
(function () {
  var params = new URLSearchParams(window.location.search);
  var ref = params.get('ref');
  var embed = params.get('embed') === '1';

  var TAB_BY_FILE = {
    'module2-case-workspace.html': 'triage',
    'module3-cpr-workspace.html': 'deadlines',
    'module4-evidence-workspace.html': 'evidence',
    'module5-drafting-workspace.html': 'documents'
  };

  var file = window.location.pathname.split('/').pop() || '';
  var tab = TAB_BY_FILE[file] || 'overview';

  if (!embed && ref) {
    window.location.replace('case.html?ref=' + encodeURIComponent(ref) + '&tab=' + tab);
    return;
  }

  if (embed) {
    document.documentElement.classList.add('embed-mode');
    var isDraftingEmbed = file === 'module5-drafting-workspace.html';
    if (isDraftingEmbed) {
      document.documentElement.classList.add('drafting-embed');
    }
    function applyEmbed() {
      document.body.classList.add('embed-mode');
      if (isDraftingEmbed) document.body.classList.add('drafting-embed');
      var style = document.getElementById('embed-style');
      if (!style) {
        style = document.createElement('style');
        style.id = 'embed-style';
        style.textContent =
          'body.embed-mode .global-nav,body.embed-mode .topbar,body.embed-mode .sidebar,body.embed-mode #user-modal,body.embed-mode .advance-bar{display:none!important}' +
          'body.embed-mode .stage-rail{display:none!important}' +
          /* Expanded iframe tabs: content grows to natural height; parent tab-panel scrolls */
          'html.embed-mode:not(.drafting-embed),body.embed-mode:not(.drafting-embed){height:auto!important;min-height:100%;overflow:visible!important}' +
          'body.embed-mode:not(.drafting-embed) .app{height:auto!important;min-height:0!important;overflow:visible!important}' +
          'body.embed-mode:not(.drafting-embed) .body{display:block!important;height:auto!important;overflow:visible!important;min-height:0!important}' +
          'body.embed-mode:not(.drafting-embed) .main{height:auto!important;overflow:visible!important;min-height:0!important}' +
          /* Drafting tab: fixed viewport with inner scroll panes */
          'html.drafting-embed,body.drafting-embed{height:100%!important;overflow:hidden!important}' +
          'body.drafting-embed .app{height:100%!important;overflow:hidden!important;min-height:0!important;display:flex!important;flex-direction:column!important}' +
          'body.drafting-embed .body.drafting-layout{display:grid!important;height:100%!important;overflow:hidden!important;grid-template-columns:minmax(280px,300px) 1fr!important;grid-template-rows:minmax(0,1fr)!important;min-height:0!important}' +
          'body.drafting-embed .body.drafting-layout.doc-focused{grid-template-columns:1fr!important}' +
          'body.drafting-embed .body.drafting-layout.doc-focused .sidebar-left{display:none!important}' +
          'body.drafting-embed .drafting-layout .sidebar-right{display:none!important}' +
          'body.drafting-embed .body.drafting-layout .main{height:100%!important;overflow:hidden!important;min-height:0!important}';
        document.head.appendChild(style);
      }
      bindEmbedScroll(isDraftingEmbed);
    }

    function bindEmbedScroll(isDrafting) {
      if (window.parent === window || window._embedScrollBound) return;
      window._embedScrollBound = true;

      function findDraftingScrollEl() {
        return (
          document.querySelector('.doc-focus-scroll') ||
          document.querySelector('.library-home') ||
          document.querySelector('.sidebar-left') ||
          document.querySelector('.sidebar-right')
        );
      }

      function scrollDrafting(deltaY) {
        var scrollEl = findDraftingScrollEl();
        if (!scrollEl) return false;
        var max = scrollEl.scrollHeight - scrollEl.clientHeight;
        if (max <= 0) return false;
        var next = scrollEl.scrollTop + deltaY;
        if ((deltaY > 0 && scrollEl.scrollTop < max) || (deltaY < 0 && scrollEl.scrollTop > 0)) {
          scrollEl.scrollTop = Math.max(0, Math.min(max, next));
          return true;
        }
        return false;
      }

      window.addEventListener(
        'wheel',
        function (e) {
          if (isDrafting) {
            if (scrollDrafting(e.deltaY)) {
              e.preventDefault();
              return;
            }
            return;
          }
          e.preventDefault();
          try {
            window.parent.postMessage({ type: 'case-shell', action: 'panelScroll', deltaY: e.deltaY }, '*');
          } catch (err) {}
        },
        { passive: false, capture: true }
      );

      var touchY = 0;
      window.addEventListener('touchstart', function (e) {
        if (e.touches.length) touchY = e.touches[0].clientY;
      }, { passive: true });
      window.addEventListener(
        'touchmove',
        function (e) {
          if (!e.touches.length) return;
          var deltaY = touchY - e.touches[0].clientY;
          touchY = e.touches[0].clientY;
          if (isDrafting) {
            if (scrollDrafting(deltaY)) {
              e.preventDefault();
            }
            return;
          }
          e.preventDefault();
          try {
            window.parent.postMessage({ type: 'case-shell', action: 'panelScroll', deltaY: deltaY }, '*');
          } catch (err) {}
        },
        { passive: false, capture: true }
      );
    }
    if (document.body) applyEmbed();
    else document.addEventListener('DOMContentLoaded', applyEmbed);
  }

  window.notifyCaseShell = function (action, data) {
    if (!embed || window.parent === window) return;
    try {
      window.parent.postMessage(Object.assign({ type: 'case-shell', action: action }, data || {}), '*');
    } catch (e) {}
  };

  window.shellGo = function (tab, logText) {
    if (!embed || window.parent === window) return false;
    if (logText) notifyCaseShell('log', { text: logText, logType: 'stage' });
    notifyCaseShell('stageComplete', { tab: tab });
    return true;
  };
})();
