/* dio_helpers.js — compat shim.
   The old 669-line monolith was split (Option B · Session 1) into:
       dio_core.js       – auth, guards, session-storage, label utils
       dio_territory.js  – TERRITORY_MAP + geographical helpers
       dio_data.js       – collectors, notifications, portfolio, engine intake
   This file keeps window.DIO alive so nothing that imports the old name breaks.
   Load order: dio_core.js → dio_territory.js → dio_data.js → dio_helpers.js.
*/
(function (global) {
  'use strict';

  var missing = [];
  if (!global.DIOCore) missing.push('DIOCore');
  if (!global.DIOTerritory) missing.push('DIOTerritory');
  if (!global.DIOData) missing.push('DIOData');
  if (missing.length) {
    console.warn('[dio_helpers.js] shim loaded before: ' + missing.join(', ') +
                 ' — include dio_core.js / dio_territory.js / dio_data.js first.');
  }

  var DIO = global.DIO || {};
  var extend = function (src) {
    if (!src) return;
    Object.keys(src).forEach(function (k) {
      if (k.charAt(0) === '_') return;   // don't re-export internal helpers
      DIO[k] = src[k];
    });
  };

  extend(global.DIOCore);
  extend(global.DIOTerritory);
  extend(global.DIOData);

  global.DIO = DIO;
})(typeof window !== 'undefined' ? window : this);
