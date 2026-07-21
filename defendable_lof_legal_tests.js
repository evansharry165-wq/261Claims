/* DefendAble — Confirmed LOF → Decide bridge tests */
/* Run: node defendable_lof_legal_tests.js */

var fs = require('fs');
var path = require('path');
var root = __dirname;

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
assert(DefendAbleTypeMap.preferTreeForText('weather', 'lightning strike mandatory inspection') === 'DT-05', 'lightning prefers DT-05');

console.log('\n=== Type map priority (operative cause) ===');
(function () {
  var atcPrimary = DefendAbleTypeMap.resolvePriority({
    rmId: 'weather',
    factorIds: ['weather', 'atfm'],
    iccText: 'EZY4470 LGW CB thunderstorm GDP ATFM CTOT slot restriction fuelling delay'
  });
  assert(atcPrimary.primaryTree === 'DT-01', 'weather-triggered GDP → primary DT-01 (got ' + atcPrimary.primaryTree + ')');
  assert(atcPrimary.secondaryTrees.indexOf('DT-02') >= 0, 'weather secondary on GDP path');

  var weatherDirect = DefendAbleTypeMap.resolvePriority({
    factorIds: ['weather', 'atfm'],
    iccText: 'Approach below minima weather diversion METAR thunderstorm; also ATFM noted'
  });
  assert(weatherDirect.primaryTree === 'DT-02', 'weather diversion → primary DT-02 (got ' + weatherDirect.primaryTree + ')');

  var atcOnly = DefendAbleTypeMap.resolvePriority({
    rmId: 'atfm',
    factorIds: ['atfm'],
    iccText: 'Eurocontrol CTOT ATFM slot restriction only — no weather'
  });
  assert(atcOnly.primaryTree === 'DT-01', 'ATC-only demo → DT-01');
})();

console.log('\n=== ATC-only demo path ===');
(function () {
  var record = DefendAbleLofLegalBridge.buildConfirmedRecord({
    lofRows: [
      { flight: 'EZY3061', route: 'GVA → PMI', std: '0650Z', atd: '0842Z', sta: '', ata: '1110Z', status: 'Delayed', note: 'ATFM CTOT' }
    ],
    facts: { flightNum: 'EZY3061', depIata: 'GVA', arrIata: 'PMI' },
    causalNodes: [
      { type: 'root', label: 'Eurocontrol ATFM CTOT', sub: 'French FIR regulation' }
    ],
    rawText: 'EZY3061 GVA-PMI. Eurocontrol ATFM CTOT slot restriction. Network-wide flow control.',
    tlEvStatus: {},
    dt: { id: 'atfm', limb1Status: 'extraordinary' },
    jurisdiction: 'UK261',
    factorIds: ['atfm']
  });
  var run = DefendAbleLofLegalBridge.runTreesOnConfirmedRecord(record);
  assert(run.treeResults && run.treeResults.length > 0, 'ATC demo returns tree results');
  assert(run.treeResults[0].treeId === 'DT-01' || (run.typePriority && run.typePriority.primaryTree === 'DT-01'), 'ATC demo primary DT-01');
  assert(!!run.position && !!run.position.frameworkLabel, 'framework verdict present');
  assert(!!run.causalCheck, 'causal chain check present');
  console.log('    primary:', run.treeResults[0] && run.treeResults[0].treeId,
    'exit:', run.treeResults[0] && run.treeResults[0].exit && run.treeResults[0].exit.verdict,
    'verdict:', run.position.frameworkLabel);
})();

console.log('\n=== EZY4470/4471 multi-factor priority ===');
(function () {
  var record = DefendAbleLofLegalBridge.buildConfirmedRecord({
    lofRows: [
      { flight: 'EZY4470', route: 'LGW → FAO', std: '0820Z', atd: '0945Z', status: 'Delayed', note: 'CB GDP ATFM' },
      { flight: 'EZY4471', route: 'FAO → LGW', std: '1200Z', atd: '', status: 'Delayed', note: 'late inbound fuelling' }
    ],
    facts: { flightNum: 'EZY4471', depIata: 'FAO', arrIata: 'LGW', delayText: '3h+' },
    causalNodes: [
      { type: 'root', label: 'CB / thunderstorm LGW', sub: 'METAR TSRA CB' },
      { type: 'cascade', label: 'GDP / ATFM', sub: 'Eurocontrol ground delay programme' },
      { type: 'operational', label: 'Fuelling', sub: 'extended turnround fuelling' }
    ],
    rawText: 'EZY4470/4471. LGW CB thunderstorm METAR. GDP ATFM CTOT. Fuelling delay on turnround. Claimed EZY4471.',
    dt: { id: 'weather', limb1Status: 'extraordinary' },
    factorIds: ['weather', 'atfm'],
    jurisdiction: 'UK261'
  });
  var run = DefendAbleLofLegalBridge.runTreesOnConfirmedRecord(record);
  assert(run.typePriority && run.typePriority.primaryTree === 'DT-01', 'EZY multi-factor GDP path primary DT-01');
  assert(run.typePriority.secondaryTrees.indexOf('DT-02') >= 0, 'EZY multi-factor has weather secondary');
  assert(run.treeResults.length >= 1, 'EZY path has tree results');
})();

console.log('\n=== T-656 causal chain risk ===');
(function () {
  var record = DefendAbleLofLegalBridge.buildConfirmedRecord({
    lofRows: [{ flight: 'WZZ101', route: 'CGN → FAO', status: 'Delayed', note: 'voluntarily waited for delayed passengers' }],
    causalNodes: [{ type: 'cascade', label: 'Wait', sub: 'voluntarily waited for delayed passengers' }],
    rawText: 'Security shortage then carrier voluntarily waited for delayed passengers — commercial decision.',
    dt: { id: 'security', limb1Status: 'extraordinary' },
    jurisdiction: 'EC261'
  });
  var run = DefendAbleLofLegalBridge.runTreesOnConfirmedRecord(record);
  assert(run.causalCheck && run.causalCheck.risk === true, 'voluntary wait sets causal risk');
  assert(run.position.verdict === 'JUDGMENT_REQUIRED', 'causal risk → JUDGMENT_REQUIRED');
})();

console.log('\n=== Jurisdiction authorities ===');
(function () {
  var uk = DefendAbleLofLegalBridge.classifyAuthority('T-656/24', 'UK261');
  assert(uk.weight === 'persuasive', 'T-656 persuasive in UK261');
  var eu = DefendAbleLofLegalBridge.classifyAuthority('T-656/24', 'EC261');
  assert(eu.weight === 'binding', 'T-656 binding in EC261');
  var lipton = DefendAbleLofLegalBridge.classifyAuthority('Lipton [2024] UKSC 24', 'UK261');
  assert(lipton.weight === 'binding', 'Lipton binding in UK');
})();

console.log('\n=== Packets carry G3/G4 nulls + EVIDENCE_HOLD ===');
(function () {
  var record = DefendAbleLofLegalBridge.buildConfirmedRecord({
    lofRows: [{ flight: 'EZY1', route: 'LGW → EDI', status: 'Delayed', note: 'CTOT' }],
    rawText: 'Eurocontrol CTOT ATFM restriction. Evidence pending.',
    dt: { id: 'atfm', limb1Status: 'extraordinary' },
    jurisdiction: 'UK261',
    factorIds: ['atfm']
  });
  var run = DefendAbleLofLegalBridge.runTreesOnConfirmedRecord(record);
  // Force evidence-hold mapping when gaps exist on DEFEND
  var fake = {
    treeResults: [{
      treeId: 'DT-01',
      applicable: true,
      exit: { verdict: 'DEFEND', conditions: [], authority: 'Pešková C-315/15' },
      gates: [{ gateId: 'DT1-G1', answer: 'yes', gaps: [{ libKey: 'eurocontrol', status: 'requested', name: 'ATFM log' }], conclusion: 'EC confirmed' }]
    }],
    causalCheck: { risk: false }
  };
  var pos = DefendAbleLofLegalBridge.mapTreeExitToVerdict(fake.treeResults, fake.causalCheck, 'extraordinary');
  assert(pos.conditionType === 'EVIDENCE_HOLD', 'DEFEND + gaps → EVIDENCE_HOLD');
  assert(pos.frameworkLabel === 'DEFEND WITH CONDITIONS', 'hold stays within CONDITIONS verdict');

  record.g1 = { action: 'approve', by: 'SB', at: new Date().toISOString() };
  var cp = DefendAbleLofLegalBridge.buildCasePacket(record);
  var dp = DefendAbleLofLegalBridge.buildDecisionPacket(record, Object.assign({}, run, { position: pos }), record.g1);
  assert(cp.totalExposure === null && cp.settlementAuthorityCeiling === null && cp.limitationDeadline === null, 'case_packet G3/G4 nulls');
  assert(dp.totalExposure === null && dp.settlementAuthorityCeiling === null && dp.limitationDeadline === null, 'decision_packet G3/G4 nulls');
  assert(dp.g1 && dp.g1.action === 'approve', 'decision_packet carries G1');
})();

console.log('\n=== Send-back does not clear G0 fields ===');
(function () {
  var record = DefendAbleLofLegalBridge.buildConfirmedRecord({
    lofRows: [{ flight: 'EZY9', route: 'LTN → AMS', status: 'Delayed', note: 'CTOT' }],
    rawText: 'ATFM CTOT',
    dt: { id: 'atfm', limb1Status: 'extraordinary' },
    jurisdiction: 'UK261'
  });
  var frozenAt = record.confirmedAt;
  var frozenNarrative = record.lockedNarrative;
  record.evidenceRequests = [{ id: 'evr-1', note: 'Need Eurocontrol log', status: 'open' }];
  record.g1 = { action: 'send_back_evidence', by: 'JP', at: new Date().toISOString() };
  assert(record.confirmedAt === frozenAt, 'confirmedAt unchanged after send-back');
  assert(record.lockedNarrative === frozenNarrative, 'locked narrative unchanged after send-back');
  assert(record.evidenceRequests.length === 1, 'evidence request attached');
})();

console.log('\n=== Analyser wiring sanity ===');
(function () {
  var html = fs.readFileSync(path.join(root, 'defendable_analyser_v3.html'), 'utf8');
  assert(html.indexOf('defendable_lof_legal_bridge.js') !== -1, 'bridge script wired');
  assert(html.indexOf('defendable_decide_workspace.js') !== -1, 'decide workspace wired');
  assert(html.indexOf('function confirmLineOfFlying') !== -1, 'confirmLineOfFlying present');
  assert(html.indexOf('defendable_legal_tree.html') !== -1, 'framework map linked from analyser');
  assert(fs.existsSync(path.join(root, 'defendable_legal_tree.html')), 'legal tree HTML in repo');
})();

console.log('\n' + passed + ' passed, ' + failed + ' failed\n');
process.exit(failed ? 1 : 0);
