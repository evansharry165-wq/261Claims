/* DefendAble — Confirmed LOF → deterministic tree bridge tests */
/* Run: node defendable_lof_legal_tests.js */

var fs = require('fs');
var path = require('path');
var root = __dirname;

function stripExports(code) {
  return code.replace(/if\s*\(\s*typeof\s+module\s*!==\s*['"]undefined['"]\s*&&\s*module\.exports\s*\)\s*\{[\s\S]*?\n\}/g, '');
}

// Top-level eval so `var` bindings land in this module scope (same pattern as defendable_v2_tests.js)
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

var passed = 0;
var failed = 0;

function assert(cond, msg) {
  if (cond) {
    passed++;
    console.log('  OK  ' + msg);
  } else {
    failed++;
    console.log(' FAIL ' + msg);
  }
}

console.log('\n=== Type map ===');
assert(DefendAbleTypeMap.rmToTreeId('atfm') === 'DT-01', 'atfm → DT-01');
assert(DefendAbleTypeMap.rmToTreeId('weather') === 'DT-02', 'weather → DT-02');
assert(DefendAbleTypeMap.rmToTreeId('birdstrike') === 'DT-04', 'birdstrike → DT-04');
assert(DefendAbleTypeMap.rmToTreeId('crew-sick') === 'DT-06', 'crew-sick → DT-06');
assert(DefendAbleTypeMap.rmToTreeId('medical') === 'DT-09', 'medical → DT-09');
assert(DefendAbleTypeMap.preferTreeForText('weather', 'lightning strike mandatory inspection') === 'DT-05', 'lightning prefers DT-05');

console.log('\n=== Confirmed record + ATC trees ===');
(function () {
  var record = DefendAbleLofLegalBridge.buildConfirmedRecord({
    lofRows: [
      { flight: 'EZY3061', route: 'GVA → PMI', std: '0650Z', atd: '0842Z', sta: '', ata: '1110Z', status: 'Delayed', note: 'ATFM CTOT' },
      { flight: 'EZY7253', route: 'PMI → BHX', std: '1300Z', atd: '', sta: '', ata: '', status: 'Diverted', note: 'weather diversion' }
    ],
    facts: { flightNum: 'EZY7253', depIata: 'PMI', arrIata: 'BHX' },
    causalNodes: [
      { type: 'root', label: 'Eurocontrol ATFM CTOT', sub: 'French FIR regulation' }
    ],
    rawText: 'EZY7253 PMI-BHX. Eurocontrol ATFM CTOT on prior sector GVA-PMI. Adverse windshear BHX diversion.',
    tlEvStatus: {},
    dt: { id: 'atfm', limb1Status: 'extraordinary' },
    evidenceDb: null
  });
  assert(!!record.lockedNarrative && /EZY7253|ATFM|CTOT/i.test(record.lockedNarrative), 'locked narrative contains LOF + ATFM');
  var run = DefendAbleLofLegalBridge.runTreesOnConfirmedRecord(record);
  assert(run.treeResults && run.treeResults.length > 0, 'ATC/weather path returns tree results');
  assert(!!run.preRating && !!run.preRating.band, 'pre-rating band present');
  console.log('    primary tree:', run.treeResults[0] && run.treeResults[0].treeId,
    'exit:', run.treeResults[0] && run.treeResults[0].exit && run.treeResults[0].exit.verdict,
    'band:', run.preRating.band);
})();

console.log('\n=== Crew illness → concede / investigate ===');
(function () {
  var record = DefendAbleLofLegalBridge.buildConfirmedRecord({
    lofRows: [{ flight: 'BA123', route: 'LHR → EDI', std: '0900Z', atd: '', sta: '', ata: '', status: 'Cancelled', note: 'captain sick' }],
    causalNodes: [{ type: 'root', label: 'Crew illness', sub: 'captain sick no replacement' }],
    rawText: 'Flight cancelled — captain sick, no replacement crew. Crew illness.',
    dt: { id: 'crew-sick', limb1Status: 'unlikely' }
  });
  var run = DefendAbleLofLegalBridge.runTreesOnConfirmedRecord(record);
  var verdict = run.treeResults[0] && run.treeResults[0].exit && run.treeResults[0].exit.verdict;
  assert(verdict === 'CONCEDE' || run.preRating.band === 'investigate', 'crew illness not defendable (got ' + verdict + ' / ' + run.preRating.band + ')');
})();

console.log('\n=== Own staff strike → concede ===');
(function () {
  var record = DefendAbleLofLegalBridge.buildConfirmedRecord({
    lofRows: [{ flight: 'EZY9923', route: 'LTN → BCN', std: '0600Z', atd: '', sta: '', ata: '', status: 'Cancelled', note: 'own staff strike' }],
    causalNodes: [{ type: 'root', label: 'Own staff strike', sub: 'pilot union' }],
    rawText: 'Own staff strike — pilot union own pilot staff participating. 40% fleet grounded.',
    dt: { id: 'own-ia', limb1Status: 'contested' }
  });
  var run = DefendAbleLofLegalBridge.runTreesOnConfirmedRecord(record);
  var verdict = run.treeResults[0] && run.treeResults[0].exit && run.treeResults[0].exit.verdict;
  assert(verdict === 'CONCEDE' || run.preRating.band === 'investigate', 'own strike not defendable (got ' + verdict + ')');
})();

console.log('\n=== Birdstrike tree matches ===');
(function () {
  var primary = DefendAbleTrees.resolvePrimary('EZY456 birdstrike on take-off, engine ingestion, mandatory post-strike inspection', []);
  assert(primary && primary.treeId === 'DT-04', 'birdstrike resolves DT-04');
  var run = DefendAbleTrees.runTree('DT-04', {
    iccText: 'birdstrike engine ingestion mandatory inspection second technician waited',
    causalChain: [],
    evidenceManager: DefendAbleEvidence.createEvidenceManager(),
    confidenceManager: DefendAbleConfidence.createConfidenceManager()
  }, true);
  assert(run.applicable !== false, 'DT-04 runs');
  var g3 = (run.gates || []).find(function (g) { return g.gateId === 'DT4-G3'; });
  assert(!!g3, 'Pešková post-strike gate DT4-G3 present');
})();

console.log('\n=== CASELAW id sanity (analyser extract) ===');
(function () {
  var html = fs.readFileSync(path.join(root, 'defendable_analyser_v3.html'), 'utf8');
  assert(html.indexOf("caselawIds: ['lipton', 'wallentin'") === -1, 'broken crew-sick caselawIds removed');
  assert(html.indexOf("'lipton-cityflyer'") !== -1, 'lipton-cityflyer present');
  assert(html.indexOf("id: 'airhelp-swiss'") !== -1, 'airhelp-swiss in CASELAW_DB');
  assert(html.indexOf("id: 'airhelp-lightning'") !== -1, 'airhelp-lightning in CASELAW_DB');
  assert(html.indexOf("id: 'ec261-reform-2026'") !== -1, 'ec261-reform-2026 in CASELAW_DB');
  assert(/id: 'medical'[\s\S]{0,1200}?limb1Status: 'unlikely'/.test(html), 'medical limb1Status unlikely');
  assert(html.indexOf('defendable_lof_legal_bridge.js') !== -1, 'bridge script wired into analyser v3');
  assert(html.indexOf('defendable_trees.js') !== -1, 'trees script wired into analyser v3');
})();

console.log('\n=== Causal chain break detection ===');
(function () {
  var chain = DefendAbleLofLegalBridge.buildCausalChain(
    [{ type: 'cascade', label: 'Wait', sub: 'voluntarily waited for delayed passengers' }],
    [],
    {}
  );
  assert(chain[0].chainBreak === true, 'voluntary wait sets chainBreak');
})();

console.log('\n' + passed + ' passed, ' + failed + ' failed\n');
process.exit(failed ? 1 : 0);
