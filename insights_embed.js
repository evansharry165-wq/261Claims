/* Embed mode for Insights tab iframes + direct-access redirects */
(function () {
  var params = new URLSearchParams(window.location.search);
  var embed = params.get('embed') === '1';
  var file = window.location.pathname.split('/').pop() || '';

  if (!embed) {
    if (file === 'module6-mi.html') {
      window.location.replace('insights.html?tab=reporting');
      return;
    }
    if (file === 'module7-education.html') {
      window.location.replace('education.html');
      return;
    }
    return;
  }

  document.documentElement.classList.add('embed-mode');

  function applyEmbed() {
    document.body.classList.add('embed-mode');
    var style = document.getElementById('insights-embed-style');
    if (!style) {
      style = document.createElement('style');
      style.id = 'insights-embed-style';
      style.textContent =
        'body.embed-mode .global-nav,body.embed-mode .nav,body.embed-mode .topbar,body.embed-mode #user-modal{display:none!important}' +
        'body.embed-mode .app,body.embed-mode .page{height:100%!important;min-height:0}' +
        'body.embed-mode .content,body.embed-mode .main{flex:1;overflow-y:auto;min-height:0}' +
        'html.embed-mode,body.embed-mode{height:100%!important}';
      document.head.appendChild(style);
    }
  }

  if (document.body) applyEmbed();
  else document.addEventListener('DOMContentLoaded', applyEmbed);
})();
