/* DefendAble v2 demo engine — keyword routing & legal mapping tests */
/* Run: node defendable_v2_tests.js */

var fs = require('fs');
eval(fs.readFileSync(__dirname + '/defendable_framework.js', 'utf8'));
eval(fs.readFileSync(__dirname + '/defendable_demo_v2.js', 'utf8'));

var EXAMPLES = {
  atc: 'Flight delayed LTN due to Eurocontrol CTOT restriction, network-wide ATFM regulation in force. All carriers affected. Airport curfew breached. Flight OND — completed next day.',
  weather: 'HC 1184 LTN-BCN 14/03/26. Thunderstorms BCN — approach below minima, mandatory ATC diversion Valencia. Standby LTN could not position — thunderstorms BCN. Passengers cared for Valencia, coach transfer arranged.',
  birdstrike: 'G-EZAB birdstrike on approach MAN. Aircraft AOG — engine ingestion confirmed, mandatory EASA inspection required. Replacement aircraft unavailable. Flight cancelled. Passengers rebooked next day.',
  industrial: 'ATC industrial action France — sector capacity reduced 60%. ATFM restrictions imposed Eurocontrol. All flights via French airspace delayed or cancelled. Third-party strike confirmed NOTAM.',
  cascade: 'Late inbound aircraft from BCN delayed due to weather on prior rotation. Crew reached FTL limits on inbound sector. No standby crew available LGW. Flight delayed 4h 20m.',
  technical: 'G-EZTK hydraulic fault identified during pre-flight checks LGW. MEL dispatch not possible — Category A defect. Aircraft AOG. Maintenance believe possible hidden manufacturing defect — no prior AD or service bulletin for this failure mode. No spare aircraft available. Flight cancelled.',
  medical: 'Flight EZY4356 BCN-LTN diverted to OPO due to passenger welfare incident — pax cardiac arrest. Severity of incident and time taken to disembark pax meant crew were out of hours. Standby A/C could not save flight as none could make it in time due to airport curfew at OPO. Flight completed following day.',
  security: 'Flight delayed LGW due to security alert — suspicious item found in hold. Airport security authority mandated full hold search and passenger re-screening. Police attended. Two passengers offloaded. Baggage reconciliation required. Delay 3h 45m.',
  disruptive: 'Flight EZY7821 returned to gate at LGW after departure due to highly disruptive passenger — threatening behaviour toward cabin crew. Police met aircraft. Passenger and baggage offloaded. Baggage reconciliation required. Delay 1h 55m to departure. Arrival delay at destination 2h 10m.',
  ownStrike: 'Pilot union strike — carrier own pilot staff participating. 40% of fleet grounded. 180 flights cancelled across the network. Passengers notified 4 days before disruption.',
  positioning: 'The flight was originally delayed because the operating crew were positioning on an earlier flight disrupted by ATC and weather. That aircraft was AOG (fuel leak), causing further delay and putting the crew out of hours. A replacement crew was sourced, but one crew member could not operate due to fatigue (18 hour wake rule) and there were no SBY crew available.',
  weatherCtot: 'EZY3279 delayed due to thunderstorms at arrival destination (ACE). CTOTS as a result of the weather disruption pushing the flight over 3 hours delay',
  lvp: 'LTN departure delayed 3h — LVP in force, SNOWTAM active, runway closure. All carriers affected.'
};

var TESTS = [
  { name: 'EXAMPLE atc', text: EXAMPLES.atc, verdict: 'DEFEND_WITH_CONDITIONS', mustChain: /ctot|atfm/i, mustNotChain: /valencia|handler strike/i },
  { name: 'EXAMPLE weather diversion', text: EXAMPLES.weather, verdict: 'DEFEND_WITH_CONDITIONS', mustChain: /valencia|diversion|below minima/i, mustNotChain: /handler strike/i },
  { name: 'EXAMPLE birdstrike', text: EXAMPLES.birdstrike, verdict: 'DEFEND_WITH_CONDITIONS', mustChain: /birdstrike|ingestion/i, mustNotChain: /valencia/i },
  { name: 'EXAMPLE industrial 3rd party ATC', text: EXAMPLES.industrial, verdict: 'DEFEND', mustChain: /industrial|atfm/i, mustNotChain: /own.staff|krüsemann/i },
  { name: 'EXAMPLE cascade', text: EXAMPLES.cascade, verdict: 'JUDGMENT_REQUIRED', mustChain: /late inbound|ftl/i, mustNotChain: /valencia/i },
  { name: 'EXAMPLE hidden defect', text: EXAMPLES.technical, verdict: 'DEFEND_WITH_CONDITIONS', mustChain: /hidden|hydraulic|category a/i, mustNotChain: /valencia/i },
  { name: 'EXAMPLE medical', text: EXAMPLES.medical, verdict: 'DEFEND_WITH_CONDITIONS', mustChain: /medical|cardiac|welfare/i, mustNotChain: /valencia/i },
  { name: 'EXAMPLE security', text: EXAMPLES.security, verdict: 'DEFEND', mustChain: /security|suspicious/i, mustNotChain: /disruptive passenger/i },
  { name: 'EXAMPLE disruptive', text: EXAMPLES.disruptive, verdict: 'DEFEND', mustChain: /disruptive|threatening/i, mustNotChain: /suspicious item/i },
  { name: 'EXAMPLE own strike', text: EXAMPLES.ownStrike, verdict: 'CONCEDE', mustChain: /own|pilot union/i, mustNotChain: /third.party handler/i },
  { name: 'EXAMPLE positioning', text: EXAMPLES.positioning, verdict: 'JUDGMENT_REQUIRED', mustChain: /positioning|fuel leak|wake rule/i, mustNotChain: /valencia/i },
  { name: 'EZY3456 ATC+handler+OND', text: 'EZY3456 was OND due to ATC delays caused by CDG baggage handlers Industrial Action. Flight could not be rescued as there were no standby aircraft. Crew hours became in breach. Flight operated next day under EZY9456', verdict: 'DEFEND_WITH_CONDITIONS', mustChain: /atc|handler|standby|ftl|ond/i, mustNotChain: /valencia/i },
  { name: 'EZY3279 weather ACE+CTOTS', text: 'EZY3279 delayed due to thunderstorms at arrival destination (ACE). CTOTS as a result of the weather disruption pushing the flight over 3 hours delay', verdict: 'DEFEND_WITH_CONDITIONS', mustChain: /ACE|thunderstorm|ctot|3 hour/i, mustNotChain: /valencia|diversion/i },
  { name: 'Crew illness Lipton', text: 'EZY1234 cancelled — captain sick, crew illness, unable to operate. No standby crew.', verdict: 'CONCEDE', mustChain: /illness|sick/i, mustNotChain: /extraordinary/i },
  { name: 'Weather only no diversion', text: 'Flight delayed 4 hours due to thunderstorms at destination', verdict: 'INVESTIGATE', mustChain: /thunderstorm|weather/i, mustNotChain: /valencia|diversion to alternate/i },
  { name: 'LVP origin systemic', text: 'LTN departure delayed 3h — LVP in force, SNOWTAM active, runway closure. All carriers affected.', verdict: 'INVESTIGATE', mustChain: /lvp|snowtam|runway closure/i, mustNotChain: /valencia/i },
  { name: 'NATS outage', text: 'Network-wide delays due to NATS system outage. Eurocontrol ATFM restrictions imposed. Flight delayed 4h.', verdict: 'DEFEND_WITH_CONDITIONS', mustChain: /outage|atfm/i, mustNotChain: /valencia/i },
  { name: 'Volcanic ash', text: 'Flight cancelled due to volcanic ash SIGMET. Airspace closure NOTAM in force.', verdict: 'DEFEND_WITH_CONDITIONS', mustChain: /volcanic|natural disaster|ash/i, mustNotChain: /valencia/i },
  { name: 'Denied boarding', text: 'Passenger denied boarding due to overbooking. Involuntary offload.', verdict: 'CONCEDE', mustChain: /denied boarding|overbook/i, mustNotChain: /birdstrike/i },
  { name: 'Concurrent LVP+hydraulic', text: 'Simultaneous LVP at origin and hydraulic fault on aircraft — neither alone caused 3 hour delay alone', verdict: 'JUDGMENT_REQUIRED', mustChain: /lvp|hydraulic/i, mustNotChain: /valencia/i },
  { name: 'Handler strike without ATC', text: 'CDG baggage handler industrial action caused 4 hour delay. No ATC involvement.', verdict: 'INVESTIGATE', mustChain: /handler|industrial/i, mustNotChain: /atc delay.*handler strike.*atc/i },
  { name: 'Birdstrike must not trigger weather', text: 'G-EZAB birdstrike on approach MAN', verdict: 'DEFEND_WITH_CONDITIONS', mustChain: /birdstrike/i, mustNotChain: /valencia|diversion to alternate/i }
];

var passed = 0;
var failed = 0;

console.log('DefendAble v2 keyword routing tests\n' + '='.repeat(50));

TESTS.forEach(function (t) {
  var r = DefendAbleDemoV2.analyze(t.text);
  var chain = (r.causalChain || []).map(function (e) { return e.description; }).join(' | ');
  var ok = true;
  var reasons = [];

  if (t.verdict && r.verdict !== t.verdict) {
    ok = false;
    reasons.push('verdict: got ' + r.verdict + ', expected ' + t.verdict);
  }
  if (t.mustChain && !t.mustChain.test(chain)) {
    ok = false;
    reasons.push('chain missing: ' + t.mustChain);
  }
  if (t.mustNotChain && t.mustNotChain.test(chain)) {
    ok = false;
    reasons.push('chain must not match: ' + t.mustNotChain);
  }
  if (!r.evidencePack || !r.evidencePack.length) {
    ok = false;
    reasons.push('no evidence pack');
  }

  if (ok) {
    passed++;
    console.log('OK  ' + t.name);
  } else {
    failed++;
    console.log('FAIL ' + t.name);
    reasons.forEach(function (x) { console.log('     ' + x); });
    console.log('     chain: ' + chain.substring(0, 140));
  }
});

console.log('\n' + '='.repeat(50));
console.log('Passed: ' + passed + '/' + TESTS.length);
if (failed) {
  console.log('Failed: ' + failed);
  process.exit(1);
}

/* Orchestrator + pass2 enrichment tests */
eval(fs.readFileSync(__dirname + '/defendable_evidence_manager.js', 'utf8'));
eval(fs.readFileSync(__dirname + '/defendable_confidence_manager.js', 'utf8'));
eval(fs.readFileSync(__dirname + '/defendable_registry.js', 'utf8'));
eval(fs.readFileSync(__dirname + '/defendable_pass2.js', 'utf8'));
eval(fs.readFileSync(__dirname + '/defendable_evidence_pack.js', 'utf8'));
eval(fs.readFileSync(__dirname + '/defendable_tree_dt01_atc.js', 'utf8'));
eval(fs.readFileSync(__dirname + '/defendable_tree_dt02_weather.js', 'utf8'));
eval(fs.readFileSync(__dirname + '/defendable_orchestrator.js', 'utf8'));

var orchPassed = 0;
var orchFailed = 0;

function orchTest(name, fn) {
  try {
    fn();
    orchPassed++;
    console.log('OK  orch: ' + name);
  } catch (e) {
    orchFailed++;
    console.log('FAIL orch: ' + name + ' — ' + e.message);
  }
}

console.log('\nDefendAble orchestrator tests\n' + '='.repeat(50));

orchTest('registry maps DT-01 to semantic conclusions', function () {
  var ids = DefendAbleRegistry.getSemanticIdsForNode('DT-01');
  if (ids.indexOf('DT1_CTOT_CONFIRMED') < 0) throw new Error('missing DT1_CTOT_CONFIRMED');
});

orchTest('pass2 enrich collects CTOT evidence for ATC scenario', function () {
  var text = EXAMPLES.atc;
  var result = DefendAbleDemoV2.analyze(text);
  var passes = DefendAbleDemoV2.toPasses(result, text);
  var collected = (passes.pass2.evidencePack || []).filter(function (e) { return (e.status || '').toLowerCase() === 'collected'; });
  if (!collected.length) throw new Error('no collected evidence in enriched pass2');
});

orchTest('full pipeline upgrades semantic conclusion after pass3', function () {
  var text = EXAMPLES.atc;
  var result = DefendAbleDemoV2.analyze(text);
  var passes = DefendAbleDemoV2.toPasses(result, text);
  var orch = DefendAbleOrchestrator.createOrchestrator();
  orch.afterPass1(passes.pass1);
  orch.afterPass2(passes.pass2);
  orch.afterPass3(result);
  var c = orch.getConfidenceManager().getConclusion('DT1_CTOT_CONFIRMED');
  if (!c) throw new Error('DT1_CTOT_CONFIRMED not registered');
  if (c.status !== 'green' && c.status !== 'amber') throw new Error('expected green/amber got ' + c.status);
});

orchTest('evidence manager receives collected items from pass2', function () {
  var text = EXAMPLES.cascade;
  var result = DefendAbleDemoV2.analyze(text);
  var passes = DefendAbleDemoV2.toPasses(result, text);
  var orch = DefendAbleOrchestrator.createOrchestrator();
  orch.afterPass1(passes.pass1);
  orch.afterPass2(passes.pass2);
  var pool = orch.getEvidenceManager().getPool();
  var collected = pool.filter(function (p) { return p.status === 'collected'; });
  if (!collected.length) throw new Error('no collected evidence in pool');
});

console.log('\n' + '='.repeat(50));
console.log('Orchestrator passed: ' + orchPassed + '/4');
if (orchFailed) {
  console.log('Orchestrator failed: ' + orchFailed);
  process.exit(1);
}

/* DT-01 tree + evidence pack tests */
var dtPassed = 0;
var dtFailed = 0;

function dtTest(name, fn) {
  try {
    fn();
    dtPassed++;
    console.log('OK  dt01: ' + name);
  } catch (e) {
    dtFailed++;
    console.log('FAIL dt01: ' + name + ' — ' + e.message);
  }
}

console.log('\nDefendAble DT-01 tests\n' + '='.repeat(50));

dtTest('ATC evidence pack order matches case management MATRIX', function () {
  var expectedK = ['tops', 'disco', 'aims', 'safetynet', 'eurocontrol', 'notam'];
  var expectedS = ['connected', 'network_out', 'lido', 'hermes', 'max_ops', 'dpm', 'internal_email', 'flightradar', 'flightstats', 'ops_review'];
  var expectedW = ['case_studies', 'eurocontrol_w', 'caa_docs', 'ac_ops', 'airport_info'];
  var matrix = DefendAbleEvidencePack.getMatrix('ATC Restrictions');
  if (!matrix) throw new Error('missing ATC matrix');
  expectedK.forEach(function (k, i) {
    if (matrix.K[i] !== k) throw new Error('K order mismatch at ' + i + ': ' + matrix.K[i] + ' vs ' + k);
  });
  expectedS.forEach(function (k, i) {
    if (matrix.S[i] !== k) throw new Error('S order mismatch at ' + i);
  });
  expectedW.forEach(function (k, i) {
    if (matrix.W[i] !== k) throw new Error('W order mismatch at ' + i);
  });
  var ordered = DefendAbleEvidencePack.getPackItems('ATC Restrictions').map(function (p) { return p.libKey; });
  var flat = expectedK.concat(expectedS).concat(expectedW);
  if (ordered.join(',') !== flat.join(',')) throw new Error('pack order mismatch');
});

dtTest('pass2 enrich seeds full ATC pack with K/S/W tiers', function () {
  var text = EXAMPLES.atc;
  var result = DefendAbleDemoV2.analyze(text);
  var passes = DefendAbleDemoV2.toPasses(result, text);
  var pack = passes.pass2.evidencePack || [];
  if (pack.length < 21) throw new Error('expected 21 ATC pack items, got ' + pack.length);
  var kItems = pack.filter(function (e) { return e.tier === 'K'; });
  if (kItems.length !== 6) throw new Error('expected 6 key items, got ' + kItems.length);
  if (kItems[0].libKey !== 'tops') throw new Error('first key item should be tops');
  var collected = pack.filter(function (e) { return (e.status || '').toLowerCase() === 'collected'; });
  if (!collected.some(function (e) { return e.evidenceId === 'EUROCONTROL_CTOT'; })) {
    throw new Error('CTOT evidence not collected in demo');
  }
});

dtTest('DT-01 tree runs on ATC scenario with gates', function () {
  var text = EXAMPLES.atc;
  var result = DefendAbleDemoV2.analyze(text);
  var passes = DefendAbleDemoV2.toPasses(result, text);
  var orch = DefendAbleOrchestrator.createOrchestrator();
  orch.setIccText(text);
  orch.afterPass1(passes.pass1);
  orch.afterPass2(passes.pass2);
  var out = orch.afterPass3(result);
  var dt01 = (out.treeResults || []).find(function (t) { return t.treeId === 'DT-01'; });
  if (!dt01 || !dt01.applicable) throw new Error('DT-01 not applicable');
  if (!dt01.gates || dt01.gates.length < 3) throw new Error('expected gate results');
  var g1 = dt01.gates.find(function (g) { return g.gateId === 'DT1-G1'; });
  if (!g1 || g1.answer !== 'yes') throw new Error('G1 should confirm CTOT');
  if (!dt01.exit || !dt01.exit.verdict) throw new Error('missing tree exit verdict');
});

dtTest('DT-01 tree not applicable for weather-only case', function () {
  var text = EXAMPLES.weather;
  var tree = DefendAbleTreeDT01.runTree({ iccText: text, causalChain: [], evidenceManager: DefendAbleEvidence.createEvidenceManager() });
  if (tree.applicable) throw new Error('DT-01 should not apply to weather diversion');
});

console.log('\n' + '='.repeat(50));
console.log('DT-01 passed: ' + dtPassed + '/4');
if (dtFailed) {
  console.log('DT-01 failed: ' + dtFailed);
  process.exit(1);
}

/* DT-02 tree + evidence pack tests */
var dt2Passed = 0;
var dt2Failed = 0;

function dt2Test(name, fn) {
  try {
    fn();
    dt2Passed++;
    console.log('OK  dt02: ' + name);
  } catch (e) {
    dt2Failed++;
    console.log('FAIL dt02: ' + name + ' — ' + e.message);
  }
}

console.log('\nDefendAble DT-02 tests\n' + '='.repeat(50));

dt2Test('Weather evidence pack order matches case management MATRIX', function () {
  var expectedK = ['tops', 'disco', 'aims', 'safetynet', 'eurocontrol', 'ogimet', 'met_office', 'notam'];
  var expectedS = ['connected', 'network_out', 'lido', 'hermes', 'max_ops', 'dpm', 'internal_email', 'flightradar', 'flightstats', 'ops_review', 'airport_web'];
  var expectedW = ['case_studies', 'weather_briefs', 'eurocontrol_w', 'caa_docs', 'ac_ops', 'airport_info', 'montreal_conv'];
  var matrix = DefendAbleEvidencePack.getMatrix('Weather');
  if (!matrix) throw new Error('missing Weather matrix');
  expectedK.forEach(function (k, i) {
    if (matrix.K[i] !== k) throw new Error('K order mismatch at ' + i);
  });
  expectedS.forEach(function (k, i) {
    if (matrix.S[i] !== k) throw new Error('S order mismatch at ' + i);
  });
  expectedW.forEach(function (k, i) {
    if (matrix.W[i] !== k) throw new Error('W order mismatch at ' + i);
  });
  var ordered = DefendAbleEvidencePack.getPackItems('Weather').map(function (p) { return p.libKey; });
  var flat = expectedK.concat(expectedS).concat(expectedW);
  if (ordered.join(',') !== flat.join(',')) throw new Error('pack order mismatch');
});

dt2Test('pass2 enrich seeds full Weather pack with K/S/W tiers', function () {
  var text = EXAMPLES.weather;
  var result = DefendAbleDemoV2.analyze(text);
  var passes = DefendAbleDemoV2.toPasses(result, text);
  var pack = passes.pass2.evidencePack || [];
  if (pack.length < 26) throw new Error('expected 26 Weather pack items, got ' + pack.length);
  var kItems = pack.filter(function (e) { return e.tier === 'K'; });
  if (kItems.length !== 8) throw new Error('expected 8 key items, got ' + kItems.length);
  if (kItems[0].libKey !== 'tops') throw new Error('first key item should be tops');
  if (kItems[5].libKey !== 'ogimet') throw new Error('ogimet should be 6th key item');
  var collected = pack.filter(function (e) { return (e.status || '').toLowerCase() === 'collected'; });
  if (!collected.some(function (e) { return e.evidenceId === 'METAR_DESTINATION'; })) {
    throw new Error('METAR evidence not collected in demo');
  }
});

dt2Test('DT-02 tree runs on weather diversion with gates', function () {
  var text = EXAMPLES.weather;
  var result = DefendAbleDemoV2.analyze(text);
  var passes = DefendAbleDemoV2.toPasses(result, text);
  var orch = DefendAbleOrchestrator.createOrchestrator();
  orch.setIccText(text);
  orch.afterPass1(passes.pass1);
  orch.afterPass2(passes.pass2);
  var out = orch.afterPass3(result);
  var dt02 = (out.treeResults || []).find(function (t) { return t.treeId === 'DT-02'; });
  if (!dt02 || !dt02.applicable) throw new Error('DT-02 not applicable');
  var dt01 = (out.treeResults || []).find(function (t) { return t.treeId === 'DT-01'; });
  if (dt01 && dt01.applicable) throw new Error('DT-01 should not run on weather diversion');
  var g1 = dt02.gates.find(function (g) { return g.gateId === 'DT2-G1'; });
  if (!g1 || g1.answer !== 'yes') throw new Error('G1 should confirm weather');
  if (!dt02.exit || !dt02.exit.verdict) throw new Error('missing tree exit verdict');
});

dt2Test('weather+CTOT routes to DT-02 not DT-01', function () {
  var text = EXAMPLES.weatherCtot || 'EZY3279 delayed due to thunderstorms at arrival destination (ACE). CTOTS as a result of the weather disruption pushing the flight over 3 hours delay';
  if (!DefendAbleEvidencePack.detectDisruptionType(text)) throw new Error('should detect Weather disruption type');
  var result = DefendAbleDemoV2.analyze(text);
  var passes = DefendAbleDemoV2.toPasses(result, text);
  var orch = DefendAbleOrchestrator.createOrchestrator();
  orch.setIccText(text);
  orch.afterPass1(passes.pass1);
  orch.afterPass2(passes.pass2);
  var out = orch.afterPass3(result);
  var dt02 = (out.treeResults || []).find(function (t) { return t.treeId === 'DT-02'; });
  if (!dt02 || !dt02.applicable) throw new Error('DT-02 should apply for weather+CTOT');
  var dt01 = (out.treeResults || []).find(function (t) { return t.treeId === 'DT-01'; });
  if (dt01 && dt01.applicable) throw new Error('DT-01 should not apply when weather is primary');
});

dt2Test('DT-02 not applicable for origin LVP-only case', function () {
  var text = EXAMPLES.lvp || 'LTN departure delayed 3h — LVP in force, SNOWTAM active, runway closure. All carriers affected.';
  var tree = DefendAbleTreeDT02.runTree({ iccText: text, causalChain: [], evidenceManager: DefendAbleEvidence.createEvidenceManager() });
  if (tree.applicable) throw new Error('DT-02 should not apply to origin LVP (DT-03 territory)');
});

console.log('\n' + '='.repeat(50));
console.log('DT-02 passed: ' + dt2Passed + '/5');
if (dt2Failed) {
  console.log('DT-02 failed: ' + dt2Failed);
  process.exit(1);
}
