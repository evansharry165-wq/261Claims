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
    function applyEmbed() {
      document.body.classList.add('embed-mode');
      var style = document.getElementById('embed-style');
      if (!style) {
        style = document.createElement('style');
        style.id = 'embed-style';
        style.textContent =
          'body.embed-mode .global-nav,body.embed-mode .topbar,body.embed-mode .sidebar,body.embed-mode #user-modal,body.embed-mode .advance-bar{display:none!important}' +
          'html.embed-mode,body.embed-mode,body.embed-mode .app{height:100%!important;min-height:0}' +
          'body.embed-mode .body{grid-template-columns:1fr!important;height:auto!important;min-height:100%;overflow:visible}' +
          'body.embed-mode .body.drafting-layout{grid-template-columns:200px 1fr!important}' +
          'body.embed-mode .body.drafting-layout.doc-focused{grid-template-columns:1fr!important}' +
          'body.embed-mode .body.drafting-layout.doc-focused .sidebar-left{display:none!important}' +
          'body.embed-mode .drafting-layout .sidebar-right{display:none!important}' +
          'body.embed-mode .main{height:auto;min-height:100%;overflow-y:auto}' +
          'body.embed-mode .stage-rail{display:none!important}';
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
