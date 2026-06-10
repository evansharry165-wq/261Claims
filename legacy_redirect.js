/* Redirect legacy module list pages to redesigned URLs */
(function () {
  var params = new URLSearchParams(window.location.search);
  if (params.get('embed') === '1') return;

  var file = window.location.pathname.split('/').pop() || '';
  var qs = window.location.search || '';
  var uid = 'SB';
  try {
    uid = sessionStorage.getItem('261c_user') || 'SB';
  } catch (e) {}

  var MAP = {
    'module1-intake.html': 'intake.html',
    'module2-case-management.html': 'cases.html',
    'module3-cpr.html': 'cases.html?filter=deadlines',
    'module4-evidence.html': 'cases.html?filter=evidence',
    'module5-drafting.html': 'cases.html?filter=drafting',
    'module6-mi.html': 'insights.html?tab=reporting',
    'module7-education.html': 'education.html'
  };

  var target = MAP[file];
  if (!target) return;

  if (file === 'module4-evidence.html' && uid === 'EH') {
    target = 'requests.html';
  }

  if (qs) {
    target += (target.indexOf('?') >= 0 ? '&' : '?') + qs.replace(/^\?/, '');
  }

  window.location.replace(target);
})();
