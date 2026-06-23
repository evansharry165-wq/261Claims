/**
 * Legacy shim — use shared_nav.js on new pages.
 * Loads shared_nav.js when this file is requested directly.
 */
(function () {
  'use strict';
  if (document.getElementById('dfa-shared-nav-shim')) return;
  var s = document.createElement('script');
  s.id = 'dfa-shared-nav-shim';
  s.src = 'shared_nav.js';
  document.head.appendChild(s);
})();
