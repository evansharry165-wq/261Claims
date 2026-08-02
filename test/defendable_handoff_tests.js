/* DefendAble — Case Handoff Pack + Manage create invariants */
/* Run: node defendable_handoff_tests.js */

var fs = require('fs');
var path = require('path');
var root = __dirname;

function stripExports(code) {
  return code.replace(/if\s*\(\s*typeof\s+module\s*!==\s*['"]undefined['"]\s*&&\s*module\.exports\s*\)\s*\{[\s\S]*?\n\}/g, '');
}

var storeMem = {};
var sessionMem = {};
global.localStorage = {
  getItem: function (k) { return storeMem[k] != null ? storeMem[k] : null; },
  setItem: function (k, v) { storeMem[k] = String(v); },
  removeItem: function (k) { delete storeMem[k]; }
};
global.sessionStorage = {
  getItem: function (k) { return sessionMem[k] != null ? sessionMem[k] : null; },
  setItem: function (k, v) { sessionMem[k] = String(v); },
  removeItem: function (k) { delete sessionMem[k]; }
};
global.window = global;
global.USERS = { SB: { name: 'S. Booth', full: 'Sarah Booth', initials: 'SB' } };
global.ALL_CASES = [];

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
eval(stripExports(fs.readFileSync(path.join(root, 'defendable_decide_workspace.js'), 'utf8')));
eval(stripExports(fs.readFileSync(path.join(root, 'defendable_case_handoff.js'), 'utf8')));
eval(fs.readFileSync(path.join(root, 'case_filing.js'), 'utf8'));
eval(fs.readFileSync(path.join(root, 'case_helpers.js'), 'utf8'));

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

console.log('\n=== Handoff pack from confirmedRecord + Decide ===');
(function () {
  storeMem = {};
  sessionMem = {};
  var record = DefendAbleLofLegalBridge.buildConfirmedRecord({
    lofRows: [
      { flight: 'EZY3061', route: 'GVA → PMI', std: '0650Z', atd: '0842Z', sta: '', ata: '1110Z', status: 'Delayed', note: 'ATFM CTOT' }
    ],
    facts: { flightNum: 'EZY3061', depIata: 'GVA', arrIata: 'PMI', date: '2026-03-14' },
    causalNodes: [
      { type: 'root', label: 'Eurocontrol ATFM CTOT', sub: 'French FIR regulation' }
    ],
    rawText: 'EZY3061 GVA-PMI. Eurocontrol ATFM CTOT slot restriction.',
    tlEvStatus: { 'Eurocontrol ATFM data': 'requested', 'CTOT message': 'available' },
    dt: { id: 'DT-01', limb1Status: 'extraordinary' },
    factorIds: ['atfm'],
    jurisdiction: 'UK261'
  });
  var run = DefendAbleLofLegalBridge.runTreesOnConfirmedRecord(record);
  record.g1 = { action: 'approve', by: 'HE', note: 'Demo sign-off', at: new Date().toISOString() };

  var pack = DefendAbleCaseHandoff.buildPack(record, run, {});
  assert(!!pack && pack.type === 'case_handoff_pack', 'pack builds');
  assert(pack.factsSection.flightNum === 'EZY3061', 'facts section has flight');
  assert(pack.factsSection.lofRows.length === 1, 'LOF rows mirrored');
  assert(pack.factsSection.evidenceMarks.length >= 2, 'evidence marks checklist');
  assert(pack.meta.locReady === false, 'locReady false by default');
  assert(!!pack.meta.caseRef, 'case ref suggested');
  assert(!!pack.meta.caseSummary, 'case summary prefilled');
  assert(!!pack.decideSection.verdictTitle || !!pack.decideSection.frameworkLabel, 'verdict present');
  assert(pack.decideSection.g1 && pack.decideSection.g1.action === 'approve', 'G1 on pack');

  pack.meta.claimant = 'Test Claimant';
  pack.meta.solicitor = 'Test Firm LLP';
  pack.meta.caseRef = 'DA-TEST-HANDOFF-1';
  pack.meta.assignedTo = 'SB';
  pack.meta.stage = run.position && run.position.conditionType === 'EVIDENCE_HOLD' ? 'evidence' : 'triage';

  console.log('\n=== Confirm → Manage create invariants ===');
  var result = DefendAbleCaseHandoff.fileIntoManage(pack);
  assert(result.ref === 'DA-TEST-HANDOFF-1', 'returns case ref');

  var cf = CaseFiling.getCase(result.ref);
  assert(!!cf, 'CaseFiling case exists');
  assert(cf.origin === 'legal_engine', 'origin legal_engine');
  assert(cf.locReady === false, 'filing locReady false');
  assert(cf.claimant === 'Test Claimant', 'claimant stored');
  assert((cf.points || []).length > 0, 'points seeded');

  var docs = CaseFiling.getDocuments(result.ref);
  var folders = docs.map(function (d) { return d.folderId; });
  assert(folders.indexOf('legal') < 0, 'never uses invalid folderId legal');
  assert(docs.some(function (d) { return d.docKey === 'case_summary' && d.folderId === 'intake'; }), 'case summary in intake');
  assert(docs.some(function (d) { return d.docKey === 'legal_position' && d.folderId === 'legal_drafts'; }), 'legal position in legal_drafts');
  assert(docs.some(function (d) { return d.docKey === 'evidence_pack_index' && d.folderId === 'evidence_index'; }), 'evidence index folder');
  assert(docs.some(function (d) { return d.name === 'case_packet.json' && d.folderId === 'legal_drafts'; }), 'case_packet in legal_drafts');
  assert(docs.some(function (d) { return d.name === 'decision_packet.json' && d.folderId === 'legal_drafts'; }), 'decision_packet in legal_drafts');

  var converted = caseFromFilingRecord(cf);
  assert(converted.origin === 'legal_engine', 'caseFromFilingRecord preserves origin');
  assert(converted.locReady === false, 'caseFromFilingRecord preserves locReady');
  assert(!!converted.caseSummary, 'caseSummary on portfolio shape');

  var merged = getMergedCasesForUser('SB');
  assert(merged.some(function (c) { return c.ref === 'DA-TEST-HANDOFF-1'; }), 'merged cases list includes engine case');

  console.log('\n=== LOC path ===');
  markLocReceived(result.ref, { content: 'Dear Sirs, Letter of Claim…', by: 'HE', stage: 'cpr' });
  var after = CaseFiling.getCase(result.ref);
  assert(after.locReady === true, 'locReady true after markLocReceived');
  assert(CaseFiling.getDocuments(result.ref).some(function (d) { return d.docKey === 'loc' && d.folderId === 'intake'; }), 'LOC in intake');

  var action = getNextAction(converted);
  // converted still has locReady false from before mark — re-resolve
  var resolved = resolveCase(result.ref);
  var action2 = getNextAction(resolved);
  assert(action2.tab !== undefined, 'getNextAction works for engine case after LOC');
  assert(resolved.locReady === true, 'resolveCase sees locReady');
})();

console.log('\n=== CaseFiling.fileFromEngineHandoff ===');
(function () {
  var record = DefendAbleLofLegalBridge.buildConfirmedRecord({
    lofRows: [{ flight: 'EZY9999', route: 'LGW → ALC', std: '', atd: '', status: 'Delayed', note: '' }],
    facts: { flightNum: 'EZY9999', depIata: 'LGW', arrIata: 'ALC' },
    causalNodes: [{ type: 'root', label: 'ATFM' }],
    rawText: 'ATFM only',
    tlEvStatus: {},
    dt: { id: 'DT-01', limb1Status: 'extraordinary' },
    factorIds: ['atfm'],
    jurisdiction: 'UK261'
  });
  var run = DefendAbleLofLegalBridge.runTreesOnConfirmedRecord(record);
  record.g1 = { action: 'approve', by: 'HE', at: new Date().toISOString() };
  var pack = DefendAbleCaseHandoff.buildPack(record, run, {});
  pack.meta.claimant = 'Wrapper Claimant';
  pack.meta.caseRef = 'DA-TEST-WRAP-2';
  var wrapped = CaseFiling.fileFromEngineHandoff(pack);
  assert(wrapped.ref === 'DA-TEST-WRAP-2', 'CaseFiling.fileFromEngineHandoff works');
  assert(CaseFiling.folderById('legal') === null, 'legal is not a valid folder');
  assert(!!CaseFiling.folderById('legal_drafts'), 'legal_drafts is valid');
})();

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
