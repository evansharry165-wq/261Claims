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
          /* Default embed: scroll the iframe document (reliable wheel/touch in nested iframes) */
          'html.embed-mode,body.embed-mode{height:100%!important;overflow-y:auto!important;overflow-x:hidden;-webkit-overflow-scrolling:touch}' +
          'body.embed-mode .app{height:auto!important;min-height:100%!important}' +
          'body.embed-mode .body{grid-template-columns:1fr!important;display:block!important;height:auto!important;overflow:visible!important;min-height:0!important}' +
          'body.embed-mode .main{height:auto!important;overflow:visible!important;min-height:0!important}' +
          /* Drafting keeps nested inner scroll regions */
          'html.drafting-embed,body.drafting-embed,body.embed-mode.drafting-embed .app{height:100%!important;overflow:hidden!important;min-height:0!important}' +
          'html.drafting-embed,body.drafting-embed{overflow:hidden!important}' +
          'body.embed-mode .body.drafting-layout{display:grid!important;height:100%!important;overflow:hidden!important;grid-template-columns:200px 1fr!important;min-height:0!important}' +
          'body.embed-mode .body.drafting-layout.doc-focused{grid-template-columns:1fr!important}' +
          'body.embed-mode .body.drafting-layout.doc-focused .sidebar-left{display:none!important}' +
          'body.embed-mode .drafting-layout .sidebar-right{display:none!important}' +
          'body.embed-mode .body.drafting-layout .main{height:100%!important;overflow:hidden!important;min-height:0!important}';
        document.head.appendChild(style);
      }
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
