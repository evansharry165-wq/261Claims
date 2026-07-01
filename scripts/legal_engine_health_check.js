#!/usr/bin/env node
/* Legal Engine health check — Intelligence Engine v2 + framework */
/* Run: node scripts/legal_engine_health_check.js */

var fs = require('fs');
var path = require('path');

var ROOT = path.join(__dirname, '..');
var failures = [];
var warnings = [];
var passed = 0;

function assert(cond, msg) {
  if (cond) { passed++; return; }
  failures.push(msg);
}

function warn(msg) {
  warnings.push(msg);
}

function loadScript(file) {
  var fp = path.join(ROOT, file);
  if (!fs.existsSync(fp)) throw new Error('Missing: ' + file);
  return fs.readFileSync(fp, 'utf8');
}

eval(loadScript('defendable_framework.js'));
eval(loadScript('defendable_demo_v2.js'));

console.log('DefendAble Legal Engine Health Check');
console.log('='.repeat(56));

// ── 1. Module load ──
var Framework = DefendAbleFramework;
var DemoV2 = DefendAbleDemoV2;
assert(!!Framework, 'DefendAbleFramework loads');
assert(!!DemoV2 && typeof DemoV2.analyze === 'function', 'DefendAbleDemoV2.analyze loads');
assert(typeof DemoV2.runDemo === 'function', 'DefendAbleDemoV2.runDemo loads');

// ── 2. Framework taxonomy ──
assert(Framework.CLAIM_TYPES.length === 11, '11 claim types (CL-01–11)');
assert(Framework.EC_DEFENCES.length === 20, '20 EC defence trees (DT-01–20)');
assert(Framework.UNIVERSAL_LEGAL.length === 12, '12 universal legal nodes (UL-01–12)');

var dtIds = Framework.EC_DEFENCES.map(function (d) { return d.id; });
assert(dtIds.indexOf('DT-18') >= 0 && dtIds.indexOf('DT-19') >= 0 && dtIds.indexOf('DT-20') >= 0,
  'DT-18 (Lipton), DT-19 (positioning), DT-20 (wake rule) present in framework');

// ── 3. Analyser page wiring ──
var analyser = fs.readFileSync(path.join(ROOT, 'defendable_analyser.html'), 'utf8');
assert(analyser.indexOf('defendable_framework.js') >= 0, 'analyser loads defendable_framework.js');
assert(analyser.indexOf('defendable_demo_v2.js') >= 0, 'analyser loads defendable_demo_v2.js');
assert(analyser.indexOf('defendable_engine.js') < 0, 'analyser does NOT load deprecated v1 engine');

var chipKeys = ['atc', 'weather', 'birdstrike', 'industrial', 'cascade', 'technical', 'medical', 'security', 'disruptive', 'ownStrike', 'positioning'];
chipKeys.forEach(function (k) {
  assert(analyser.indexOf("sx('" + k + "')") >= 0, 'example chip: ' + k);
  assert(analyser.indexOf(k + ':') >= 0 || analyser.indexOf(k + ':"') >= 0, 'EXAMPLES.' + k + ' defined in analyser');
});

// ── 4. IP alias hygiene in engine files ──
['defendable_framework.js', 'defendable_demo_v2.js', 'defendable_analyser.html'].forEach(function (f) {
  var src = loadScript(f);
  assert(!/\bTOPS\b|\bAIMS\b|\bDISCO\b|\bSafetyNet\b|\bHERMES\b|\bAMOS\b|\bDocuNet\b/.test(src),
    'no real system names in ' + f);
});

// ── 5. Verdict taxonomy ──
var VALID_VERDICTS = ['DEFEND', 'DEFEND_WITH_CONDITIONS', 'JUDGMENT_REQUIRED', 'CONCEDE', 'INVESTIGATE', 'SETTLE'];

// ── 6. Full scenario battery (matches defendable_v2_tests.js) ──
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
  positioning: 'The flight was originally delayed because the operating crew were positioning on an earlier flight disrupted by ATC and weather. That aircraft was AOG (fuel leak), causing further delay and putting the crew out of hours. A replacement crew was sourced, but one crew member could not operate due to fatigue (18 hour wake rule) and there were no SBY crew available.'
};

var SCENARIOS = [
  { name: 'ATC / CTOT overnight', key: 'atc', verdict: 'DEFEND_WITH_CONDITIONS' },
  { name: 'Weather diversion', key: 'weather', verdict: 'DEFEND_WITH_CONDITIONS' },
  { name: 'Birdstrike', key: 'birdstrike', verdict: 'DEFEND_WITH_CONDITIONS' },
  { name: 'Industrial action (3rd party ATC)', key: 'industrial', verdict: 'DEFEND' },
  { name: 'Cascading delay', key: 'cascade', verdict: 'JUDGMENT_REQUIRED' },
  { name: 'Hidden defect', key: 'technical', verdict: 'DEFEND_WITH_CONDITIONS' },
  { name: 'Medical emergency', key: 'medical', verdict: 'DEFEND_WITH_CONDITIONS' },
  { name: 'Security alert', key: 'security', verdict: 'DEFEND' },
  { name: 'Disruptive passenger', key: 'disruptive', verdict: 'DEFEND' },
  { name: 'Own staff strike (Krüsemann)', key: 'ownStrike', verdict: 'CONCEDE' },
  { name: 'Positioning complex', key: 'positioning', verdict: 'JUDGMENT_REQUIRED' },
  { name: 'Crew illness (Lipton)', text: 'EZY1234 cancelled — captain sick, crew illness, unable to operate. No standby crew.', verdict: 'CONCEDE' },
  { name: 'Weather only (no diversion)', text: 'Flight delayed 4 hours due to thunderstorms at destination', verdict: 'INVESTIGATE' },
  { name: 'Handler strike without ATC', text: 'CDG baggage handler industrial action caused 4 hour delay. No ATC involvement.', verdict: 'INVESTIGATE' },
  { name: 'Denied boarding', text: 'Passenger denied boarding due to overbooking. Involuntary offload.', verdict: 'CONCEDE' },
  { name: 'NATS outage', text: 'Network-wide delays due to NATS system outage. Eurocontrol ATFM restrictions imposed. Flight delayed 4h.', verdict: 'DEFEND_WITH_CONDITIONS' },
  { name: 'Volcanic ash', text: 'Flight cancelled due to volcanic ash SIGMET. Airspace closure NOTAM in force.', verdict: 'DEFEND_WITH_CONDITIONS' },
  { name: 'Composable fallback', text: 'Minor delay reported at gate — cause unclear, awaiting ops update.', verdict: 'INVESTIGATE' }
];

function checkResultSchema(r, label) {
  assert(r && typeof r === 'object', label + ': result object');
  assert(VALID_VERDICTS.indexOf(r.verdict) >= 0, label + ': valid verdict (' + r.verdict + ')');
  assert(Array.isArray(r.causalChain) && r.causalChain.length > 0, label + ': causal chain non-empty');
  assert(Array.isArray(r.evidencePack) && r.evidencePack.length > 0, label + ': evidence pack non-empty');
  assert(r.verdictSub && r.verdictSub.length > 10, label + ': verdict rationale present');
  assert(r.causationStructure, label + ': causation structure set');
  assert(r.artNineStatus, label + ': Art 9 status set');
  assert(r.artEightStatus, label + ': Art 8 status set');
  assert(Array.isArray(r.nodes), label + ': legal nodes array');
  assert(Array.isArray(r.keywords), label + ': keywords array');
}

SCENARIOS.forEach(function (s) {
  var text = s.text || EXAMPLES[s.key];
  var r = DemoV2.analyze(text);
  checkResultSchema(r, s.name);
  if (s.verdict) assert(r.verdict === s.verdict, s.name + ': verdict ' + r.verdict + ' (expected ' + s.verdict + ')');
});

// ── 7. Negative gates must never DEFEND ──
['Pilot union strike — own pilot staff', 'Captain sick crew illness no standby'].forEach(function (t) {
  var r = DemoV2.analyze(t);
  assert(r.verdict === 'CONCEDE', 'negative gate CONCEDE for: ' + t.substring(0, 40));
});

// ── 8. Framework screening integration ──
var sample = EXAMPLES.weather;
var landscape = Framework.landscapeSummary(sample);
assert(landscape.claimsMatched >= 1, 'framework detects claim types in weather scenario');
assert(landscape.defencesMatched >= 1, 'framework detects defences in weather scenario');
var universal = Framework.buildUniversalNodes(sample);
assert(universal.length >= 1, 'framework builds universal legal nodes');

// ── 10. Composable EC status not over-confident ──
(function () {
  var r = DemoV2.analyze('Flight delayed 4 hours due to thunderstorms at destination');
  var established = (r.causalChain || []).filter(function (e) { return e.ecStatus === 'ESTABLISHED'; });
  if (established.length > 0) warn('composable path has ESTABLISHED EC on ' + established.length + ' event(s) — curated paths may still use ESTABLISHED');
})();

// ── 11. Footer / marketing copy accuracy ──
if (analyser.indexOf('16 universal legal nodes') >= 0 && Framework.UNIVERSAL_LEGAL.length === 12) {
  warn('Footer claims 16 universal legal nodes; framework defines 12 (UL-01–12) — cosmetic doc drift');
}

// ── 12. v1 engine isolation ──
fs.readdirSync(ROOT).filter(function (f) { return f.endsWith('.html'); }).forEach(function (f) {
  var src = fs.readFileSync(path.join(ROOT, f), 'utf8');
  if (src.indexOf('defendable_engine.js') >= 0) failures.push('deprecated v1 engine referenced in ' + f);
});

// ── 9. runDemo 3-pass shape ──
(function runDemoCheck() {
  var events = [];
  return DemoV2.runDemo(EXAMPLES.atc, function (ev, a, b) {
    events.push(ev);
    if (ev === 'done') {
      assert(!!b && !!b.pass1 && !!b.pass2, 'runDemo returns 3-pass structure');
      assert(b.pass1.causalChain && b.pass1.causalChain.length > 0, 'pass1 causal chain');
      assert(b.pass2.evidencePack && b.pass2.evidencePack.length > 0, 'pass2 evidence pack');
    }
  }).then(function () {
    assert(events.indexOf('pass1') >= 0 || events.some(function (e) { return e === 'pass'; }), 'runDemo fires progress events');
    assert(events.indexOf('done') >= 0, 'runDemo completes');
  });
})();

// ── Summary after async runDemo (~3.8s simulated latency) ──
Promise.resolve()
  .then(function () {
    return new Promise(function (resolve) {
      setTimeout(resolve, 4000);
    });
  })
  .then(function () {
    console.log('');
    if (failures.length) {
      console.log('FAILED (' + failures.length + '):');
      failures.forEach(function (f) { console.log('  ✗ ' + f); });
    }
    if (warnings.length) {
      console.log('WARNINGS (' + warnings.length + '):');
      warnings.forEach(function (w) { console.log('  ⚠ ' + w); });
    }
    console.log('');
    console.log('Assertions passed: ' + passed);
    if (failures.length) {
      console.log('Legal engine health check: FAIL');
      process.exit(1);
    }
    console.log('Legal engine health check: PASS — ready for demo/email send');
    if (warnings.length) console.log('(review warnings above for email caveats)');
  });
