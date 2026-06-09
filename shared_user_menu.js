/**
 * Injects "Reset demo data" into profile / user switcher menus site-wide.
 */
(function () {
  'use strict';

  function resetButtonHtml() {
    return (
      '<div class="ud-divider"></div>' +
      '<button type="button" class="ud-reset-demo" onclick="refreshDemoData()">' +
      '<i class="ti ti-refresh"></i>' +
      '<span class="ud-reset-text"><strong>Reset demo data</strong>' +
      '<small>Restore fresh cases, evidence and drafts</small></span>' +
      '</button>'
    );
  }

  function ensureResetInMenus() {
    document.querySelectorAll('.user-dropdown').forEach(function (dd) {
      if (dd.querySelector('.ud-reset-demo')) return;
      var wrap = document.createElement('div');
      wrap.className = 'ud-footer';
      wrap.innerHTML = resetButtonHtml();
      dd.appendChild(wrap);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureResetInMenus);
  } else {
    ensureResetInMenus();
  }
  setTimeout(ensureResetInMenus, 150);
})();
