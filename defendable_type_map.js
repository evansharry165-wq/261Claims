/* DefendAble — RM_DB disruption ids ↔ decision-tree ids */
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

  return {
    RM_TO_DT: RM_TO_DT,
    DT_TO_RM: DT_TO_RM,
    rmToTreeId: rmToTreeId,
    treeToRmId: treeToRmId,
    preferTreeForText: preferTreeForText
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DefendAbleTypeMap;
}
