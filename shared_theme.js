/**
 * Load legal typography theme and easyJet brand overrides on every page.
 */
(function () {
  'use strict';

  if (!document.getElementById('dfa-theme-css')) {
    var fonts = document.createElement('link');
    fonts.rel = 'stylesheet';
    fonts.href =
      'https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,wght@0,300;0,400;1,300;1,400&display=swap';
    document.head.appendChild(fonts);

    var theme = document.createElement('link');
    theme.id = 'dfa-theme-css';
    theme.rel = 'stylesheet';
    theme.href = 'shared_theme.css';
    document.head.appendChild(theme);
  }

  if (!document.getElementById('dfa-brand-css')) {
    var brand = document.createElement('link');
    brand.id = 'dfa-brand-css';
    brand.rel = 'stylesheet';
    brand.href = 'brand_theme_easyjet.css';
    document.head.appendChild(brand);
  }
})();
