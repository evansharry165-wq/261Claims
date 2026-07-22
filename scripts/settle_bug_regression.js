/* DefendAble — settle-bug regression suite (specs/defendable_defect_report_settle_bug.md) */
/* Run: node scripts/settle_bug_regression.js */

var fs = require('fs');
var path = require('path');
var root = path.join(__dirname, '..');

function stripExports(code) {
  return code.replace(/if\s*\(\s*typeof\s+module\s*!==\s*['"]undefined['"]\s*&&\s*module\.exports\s*\)\s*\{[\s\S]*?\n\}/g, '');
}

var root = path.join(__dirname, '..');
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
eval(stripExports(fs.readFileSync(path.join(root, 'defendable_prompt_banks.js'), 'utf8')));

var failed = 0;
function assert(cond, msg) {
  if (!cond) {
    failed++;
    console.error('FAIL:', msg);
  } else {
    console.log('OK  :', msg);
  }
}

var REPRO =
  'EZY848, G-EZTY, MAN BCN MAN was diverted to VLC EZY848 had an arrival delay ' +
  'of 2 hours due to this. EZY849 was further delayed due to ATC restrictions at ' +
  'BCN due to the thunderstorms disrupting flow. The diversion was caused by ' +
  'thunderstorms over BCN. The return sector, EZY849 was further delayed by ATC ' +
  'restrictions. The crew were operating within hours and did not need replacing. ' +
  'forecast predicted that weather would clear within an hour or two.';

function runCase(text, extra) {
  extra = extra || {};
  var record = DefendAbleLofLegalBridge.buildConfirmedRecord({
    lofRows: extra.lofRows || [
      { flight: 'EZY848', route: 'MAN → BCN', status: 'Diverted', note: 'VLC arrival delay 2 hours' },
      { flight: 'EZY849', route: 'BCN → MAN', status: 'Delayed', note: 'ATC' }
    ],
    facts: extra.facts || { flightNum: 'EZY849', depIata: 'BCN', arrIata: 'MAN' },
    causalNodes: extra.causalNodes || [
      { type: 'root', label: 'Thunderstorms BCN', sub: 'Diversion to VLC' },
      { type: 'cascade', label: 'ATC restrictions', sub: 'Flow disrupted by thunderstorms' }
    ],
    rawText: text,
    tlEvStatus: {},
    dt: extra.dt || { id: 'weather', limb1Status: 'extraordinary' },
    factorIds: extra.factorIds || ['weather', 'atfm'],
    jurisdiction: 'UK261'
  });
  return DefendAbleLofLegalBridge.runTreesOnConfirmedRecord(record);
}

console.log('\n=== 1. Repro case ===');
var r1 = runCase(REPRO);
var trees1 = (r1.treeResults || []).map(function (t) { return t.treeId; });
var engaged13 = trees1.indexOf('DT-13') >= 0 && (r1.treeResults.find(function (t) { return t.treeId === 'DT-13'; }) || {}).applicable;
var engaged06 = trees1.indexOf('DT-06') >= 0 && (r1.treeResults.find(function (t) { return t.treeId === 'DT-06'; }) || {}).applicable !== false &&
  DefendAbleTrees.getDefinition('DT-06').matches(REPRO);
assert(!DefendAbleTrees.getDefinition('DT-06').matches(REPRO), '1a DT-06 does not match negated crew language');
assert(!DefendAbleTrees.getDefinition('DT-13').matches(REPRO), '1b DT-13 cascade does not match');
assert(!engaged06, '1c DT-06 not engaged');
assert(!(engaged13 && r1.treeResults.some(function (t) { return t.treeId === 'DT-13' && t.exit && t.exit.verdict === 'SETTLE'; })), '1d DT-13 not driving SETTLE');
var e848 = (r1.sectorAssessments || []).find(function (s) { return /EZY848/.test(s.flight); });
assert(e848 && e848.art7Status === 'NOT_COMPENSABLE', '1e EZY848 NOT_COMPENSABLE (<3h)');
assert(
  r1.position.verdict === 'DEFEND_HOLD' || r1.position.verdict === 'DEFEND_WITH_CONDITIONS',
  '1f headline DEFEND_HOLD/DEFEND_WITH_CONDITIONS (got ' + r1.position.verdict + ')'
);
assert(r1.position.verdict !== 'SETTLE', '1g never SETTLE on repro');
assert((r1.strengths || []).some(function (s) { return /Crew within FDP/i.test(s); }), '1h strength: Crew within FDP — no crew issue');
assert(r1.typePriority && (r1.typePriority.primaryTree === 'DT-02' || r1.typePriority.primaryTree === 'DT-01'), '1i primary DT-02 or DT-01');
var headline = r1.position.treeId;
assert(headline === 'DT-02' || headline === 'DT-01', '1j headline from primary/secondary weather-ATC (got ' + headline + ')');

console.log('\n=== 2. Same + captain sick ⇒ crew tree engages ===');
var sickText = REPRO + ' The captain went sick at VLC.';
var r2 = runCase(sickText);
assert(DefendAbleTrees.getDefinition('DT-06').matches(sickText), '2a DT-06 matches captain sick');
var has06 = (r2.treeResults || []).some(function (t) { return t.treeId === 'DT-06' && t.applicable !== false; });
assert(has06 || DefendAbleTrees.resolveSecondary(sickText, [], 'DT-02').indexOf('DT-06') >= 0, '2b DT-06 engaged as secondary or match');

console.log('\n=== 3. EZY4470/4471 weather+ATFM+fuel ===');
var fuelText =
  'EZY4470 LGW AMS delayed by thunderstorms and Eurocontrol ATFM CTOT. ' +
  'EZY4471 return delayed — additional fuel uplift and turnround extended. No crew issue.';
var r3 = runCase(fuelText, {
  lofRows: [
    { flight: 'EZY4470', route: 'LGW → AMS', status: 'Delayed', note: 'ATFM weather' },
    { flight: 'EZY4471', route: 'AMS → LGW', status: 'Delayed', note: 'fuel turnround' }
  ],
  factorIds: ['weather', 'atfm'],
  dt: { id: 'atfm', limb1Status: 'extraordinary' }
});
assert(r3.typePriority.primaryTree === 'DT-01' || r3.typePriority.primaryTree === 'DT-02', '3a primary DT-01 or DT-02');
assert(!DefendAbleTrees.getDefinition('DT-06').matches(fuelText), '3b no DT-06');
assert(
  !(r3.treeResults || []).some(function (t) { return t.treeId === 'DT-13' && t.exit && t.exit.verdict === 'SETTLE'; }),
  '3c DT-13 not SETTLE headline'
);

console.log('\n=== 4. Fresh narrative, zero evidence ⇒ never SETTLE ===');
var fresh = 'Flight delayed due to ATC restrictions and thunderstorms at destination. Diversion to alternate.';
var r4 = runCase(fresh, {
  lofRows: [{ flight: 'EZY100', route: 'MAN → BCN', status: 'Diverted', note: 'weather' }],
  factorIds: ['weather', 'atfm']
});
assert(r4.position.verdict !== 'SETTLE', '4a never SETTLE with zero evidence (got ' + r4.position.verdict + ')');
assert(
  r4.position.verdict === 'DEFEND_HOLD' || r4.position.verdict === 'DEFEND_WITH_CONDITIONS',
  '4b DEFEND_HOLD/DEFEND_WITH_CONDITIONS'
);

console.log('\n=== 5. Waited 40 mins for connecting passengers ⇒ T-656 ===');
var waitText = REPRO + ' Waited 40 mins for connecting passengers.';
var record5 = DefendAbleLofLegalBridge.buildConfirmedRecord({
  lofRows: [{ flight: 'EZY849', route: 'BCN → MAN', status: 'Delayed', note: 'Waited 40 mins for connecting passengers' }],
  rawText: waitText,
  causalNodes: [{ type: 'root', label: 'ATC', sub: 'Waited 40 mins for connecting passengers' }],
  dt: { id: 'atfm', limb1Status: 'extraordinary' },
  factorIds: ['atfm']
});
var check5 = DefendAbleLofLegalBridge.runCausalChainCheck(record5, []);
assert(check5.risk === true, '5a T-656 causal risk flagged');

console.log('\n=== 6. Sturgeon threshold 2h50m / 3h05m ===');
assert(DefendAbleLofLegalBridge.parseDelayMinutes('2h50m') === 170, '6a parse 2h50m = 170');
assert(DefendAbleLofLegalBridge.parseDelayMinutes('3h05m') === 185, '6b parse 3h05m = 185');
var s650 = DefendAbleLofLegalBridge.assessSectorCompensation({
  lofRows: [{ flight: 'EZY1', note: 'arrival delay of 2h50m' }],
  lockedNarrative: 'EZY1 had an arrival delay of 2h50m'
});
var s605 = DefendAbleLofLegalBridge.assessSectorCompensation({
  lofRows: [{ flight: 'EZY2', note: 'arrival delay of 3h05m' }],
  lockedNarrative: 'EZY2 had an arrival delay of 3h05m'
});
assert(s650[0] && s650[0].art7Status === 'NOT_COMPENSABLE', '6c 2h50m not compensable');
assert(s605[0] && s605[0].art7Status === 'COMPENSABLE', '6d 3h05m compensable');

console.log('\n=== 7. Redaction — no carrier-internal system names in display LIB ===');
var leakRe = /tops|safetynet|hermes|max.?ops|dpm|connected portal/i;
var lib = DefendAbleEvidencePack.LIB;
Object.keys(lib).forEach(function (k) {
  var meta = lib[k];
  var blob = (meta.name || '') + ' ' + (meta.system || '');
  // Internal keys may exist; display name/system must not leak carrier brands
  if (k === 'tops' || k === 'safetynet' || k === 'hermes' || k === 'max_ops' || k === 'dpm' || k === 'connected') {
    assert(!leakRe.test(blob), '7 ' + k + ' display redacted (got "' + blob + '")');
  }
});
// Pack item rendered names
var packItems = DefendAbleEvidencePack.getPackItems('Weather') || [];
packItems.forEach(function (item) {
  var blob = (item.name || '') + ' ' + (item.system || '');
  assert(!leakRe.test(blob), '7 pack item redacted: ' + blob.slice(0, 60));
});

console.log('\n=== DT-01 force gates ===');
var forced = DefendAbleTrees.runTree('DT-01', { iccText: REPRO, causalChain: [], evidenceManager: DefendAbleEvidence.createEvidenceManager() }, true);
assert(forced && forced.gates && forced.gates.length >= 5, 'DT-01 force-run has ≥5 gates');
assert(forced.exit && forced.exit.verdict, 'DT-01 force-run produces exit');

console.log('\n' + (failed ? failed + ' FAILURES' : 'ALL PASSED'));
process.exit(failed ? 1 : 0);
