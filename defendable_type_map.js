/* DefendAble — RM_DB disruption ids ↔ decision-tree ids + legal priority */
var DefendAbleTypeMap = (function () {
  var RM_TO_DT = {
    atfm: 'DT-01',
    weather: 'DT-02',
    'airport-closure': 'DT-03',
    birdstrike: 'DT-04',
    technical: 'DT-05',
    'crew-fdp': 'DT-06',
    'crew-sick': 'DT-06',
    'own-ia': 'DT-07',
    'third-party-ia': 'DT-07',
    security: 'DT-08',
    medical: 'DT-09',
    'disruptive-pax': 'DT-10',
    'natural-disaster': 'DT-11',
    'political-unrest': 'DT-11',
    'ground-damage': 'DT-05'
  };

  var DT_TO_RM = {
    'DT-01': 'atfm',
    'DT-02': 'weather',
    'DT-03': 'airport-closure',
    'DT-04': 'birdstrike',
    'DT-05': 'technical',
    'DT-06': 'crew-fdp',
    'DT-07': 'third-party-ia',
    'DT-08': 'security',
    'DT-09': 'medical',
    'DT-10': 'disruptive-pax',
    'DT-11': 'natural-disaster'
  };

  function rmToTreeId(rmId) {
    return RM_TO_DT[rmId] || null;
  }

  function treeToRmId(treeId) {
    return DT_TO_RM[treeId] || null;
  }

  function preferTreeForText(rmId, iccText) {
    var t = iccText || '';
    if (/\blightning\b/i.test(t)) return 'DT-05';
    if (rmId === 'own-ia') return 'DT-07';
    if (rmId === 'crew-sick') return 'DT-06';
    return rmToTreeId(rmId);
  }

  /**
   * Legal priority for multi-factor cases.
   * Operative-cause rule (not “weather always wins”):
   * - If the hold/restriction that delayed the flight is ATC/ATFM (CTOT, GDP, slot),
   *   primary is DT-01 (Moens / ATC) even when weather is upstream of the regulation.
   * - If weather itself is the direct EC (METAR below minima, weather diversion,
   *   thunderstorm blocking ops without a discrete ATFM hold as the delay driver),
   *   primary is DT-02; ATFM/ops appear as secondary.
   * - Fuel/turnround after weather+ATFM is operational secondary, not a primary tree.
   */
  function resolvePriority(opts) {
    opts = opts || {};
    var rmId = opts.rmId || null;
    var factorIds = (opts.factorIds || []).slice();
    var text = opts.iccText || '';
    var hasWeather = factorIds.indexOf('weather') >= 0 || rmId === 'weather' ||
      /\bmetar\b|\btaf\b|\bsigmet\b|\bthunderstorm\b|\bcb\b|\bts\+?ra\b|\bbelow minima\b|\bweather diversion\b/i.test(text);
    var hasAtfm = factorIds.indexOf('atfm') >= 0 || rmId === 'atfm' ||
      /\bctot\b|\batfm\b|\bgdp\b|\beurocontrol\b|\bslot (hold|restriction|delay)\b|\bflow (control|regulation)\b/i.test(text);
    var hasFuel = /\bfuel(ling)?\b|\bturnround\b|\brefuel\b/i.test(text);

    var primary = null;
    var secondary = [];
    var rationale = '';

    if (hasWeather && hasAtfm) {
      // Weather-triggered GDP/CTOT: operative cause is usually the ATC restriction
      // unless the narrative centres on destination minima / diversion.
      var weatherDirect = /\bbelow minima\b|\bweather diversion\b|\bdivert(ed|ion).{0,40}(weather|thunderstorm|metar)\b|\bapproach.{0,20}minima\b/i.test(text);
      if (weatherDirect) {
        primary = 'DT-02';
        secondary = ['DT-01'];
        rationale = 'Weather is the direct EC (minima/diversion). ATFM/CTOT is secondary evidence of network impact (Recital 14 + Moens).';
      } else {
        primary = 'DT-01';
        secondary = ['DT-02'];
        rationale = 'Operative delay driver is ATC/ATFM restriction (CTOT/GDP/slot). Weather is upstream context — primary tree DT-01 (Moens); weather DT-02 secondary.';
      }
      if (hasFuel) {
        secondary.push('DT-13');
        rationale += ' Fuelling/turnround treated as cascade/ops secondary (DT-13), not a separate EC root.';
      }
    } else if (hasAtfm) {
      primary = 'DT-01';
      rationale = 'ATC/ATFM restriction is the sole mapped disruption — DT-01 primary.';
    } else if (hasWeather) {
      primary = 'DT-02';
      rationale = 'Weather is the sole mapped disruption — DT-02 primary.';
    } else {
      primary = preferTreeForText(rmId, text) || rmToTreeId(rmId);
      rationale = primary
        ? ('Mapped from classification id ' + (rmId || 'unknown') + ' → ' + primary)
        : 'No type-map match — orchestrator matchers will select.';
    }

    // Deduplicate secondary and drop primary if listed
    secondary = secondary.filter(function (id, i, arr) {
      return id && id !== primary && arr.indexOf(id) === i;
    });

    return {
      primaryTree: primary,
      secondaryTrees: secondary,
      rationale: rationale,
      factorIds: factorIds
    };
  }

  return {
    RM_TO_DT: RM_TO_DT,
    DT_TO_RM: DT_TO_RM,
    rmToTreeId: rmToTreeId,
    treeToRmId: treeToRmId,
    preferTreeForText: preferTreeForText,
    resolvePriority: resolvePriority
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DefendAbleTypeMap;
}
