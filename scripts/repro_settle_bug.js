/* DefendAble — Confirmed LOF → Decide bridge tests */
/* Run: node defendable_lof_legal_tests.js */

var fs = require('fs');
var path = require('path');
var root = path.join(__dirname, '..');

function stripExports(code) {
  return code.replace(/if\s*\(\s*typeof\s+module\s*!==\s*['"]undefined['"]\s*&&\s*module\.exports\s*\)\s*\{[\s\S]*?\n\}/g, '');
}

eval(stripExports(fs.readFileSync(path.join(root, 'defendable_framework.js'), 'utf8')));
eval(stripExports(fs.readFileSync(path.join(root, 'defendable_evidence_manager.js'), 'utf8')));
eval(stripExports(fs.readFileSync(path.join(root, 'defendable_confidence_manager.js'), 'utf8')));
eval(stripExports(fs.readFileSync(path.join(root, 'defendable_registry.js'), 'utf8')));
eval(stripExports(fs.readFileSync(path.join(root, 'defendable_evidence_pack.js'), 'utf8')));
eval(stripExports(fs.readFileSync(path.join(root, 'defendable_tree_engine.js'), 'utf8')));
eval(stripExports(fs.readFileSync(path.join(root, 'defendable_tree_dt01_atc.js'), 'utf8')));
eval(stripExports(fs.readFileSync(path.join(root, 'defendable_tree_dt02_weather.js'), 'utf8')));
eval(stripExports(fs.readFileSync(path.join(root, 'defendable_trees.js'), 'utf8')));
eval(stripExports(fs.readFileSync(path.join(root, 'defendable_pass2.js'), 'utf8')));
eval(stripExports(fs.readFileSync(path.join(root, 'defendable_orchestrator.js'), 'utf8')));
eval(stripExports(fs.readFileSync(path.join(root, 'defendable_type_map.js'), 'utf8')));
eval(stripExports(fs.readFileSync(path.join(root, 'defendable_lof_legal_bridge.js'), 'utf8')));

var text =
  'EZY848, G-EZTY, MAN BCN MAN was diverted to VLC EZY848 had an arrival delay ' +
  'of 2 hours due to this. EZY849 was further delayed due to ATC restrictions at ' +
  'BCN due to the thunderstorms disrupting flow. The diversion was caused by ' +
  'thunderstorms over BCN. The return sector, EZY849 was further delayed by ATC ' +
  'restrictions. The crew were operating within hours and did not need replacing. ' +
  'forecast predicted that weather would clear within an hour or two.';

var record = DefendAbleLofLegalBridge.buildConfirmedRecord({
  lofRows: [
    { flight: 'EZY848', route: 'MAN → BCN', status: 'Diverted', note: 'VLC 2h' },
    { flight: 'EZY849', route: 'BCN → MAN', status: 'Delayed', note: 'ATC' }
  ],
  facts: { flightNum: 'EZY849', depIata: 'BCN', arrIata: 'MAN' },
  causalNodes: [
    { type: 'root', label: 'Thunderstorms BCN' },
    { type: 'event', label: 'ATC restrictions' }
  ],
  rawText: text,
  tlEvStatus: {},
  dt: { id: 'weather', limb1Status: 'extraordinary' },
  factorIds: ['weather', 'atfm'],
  jurisdiction: 'UK261'
});

var run = DefendAbleLofLegalBridge.runTreesOnConfirmedRecord(record);
console.log('priority', JSON.stringify(run.typePriority));
run.treeResults.forEach(function (t) {
  console.log(t.treeId, 'exit=' + (t.exit && t.exit.verdict), 'gates=' + (t.gates && t.gates.length), t.disruptionType);
  (t.gates || []).forEach(function (g) {
    console.log(' ', g.gateId, g.answer, g.confidence);
  });
});
console.log('POS', run.position.verdict, '|', run.position.title, '|', run.position.conditionType);
console.log('DT06', DefendAbleTrees.getDefinition('DT-06').matches(text), 'DT13', DefendAbleTrees.getDefinition('DT-13').matches(text));
console.log('primary resolve', DefendAbleTrees.resolvePrimary(text));
console.log('DT01 matches', DefendAbleTreeDT01.matches(text));
console.log('DT02 matches', DefendAbleTreeDT02.matches(text));
