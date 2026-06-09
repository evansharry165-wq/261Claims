/**
 * Load legal typography theme on every page.
 */
(function () {
  'use strict';

  if (document.getElementById('261c-theme-css')) return;

  var fonts = document.createElement('link');
  fonts.rel = 'stylesheet';
  fonts.href =
    'https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Source+Sans+3:ital,wght@0,400;0,500;0,600;1,400&display=swap';
  document.head.appendChild(fonts);

  var theme = document.createElement('link');
  theme.id = '261c-theme-css';
  theme.rel = 'stylesheet';
  theme.href = 'shared_theme.css';
  document.head.appendChild(theme);
})();
