/**
 * Smoke tests for LOF evidence workflow + repository chase.
 */
const path = require('path');

// Minimal localStorage/sessionStorage for Node
global.localStorage = {
  _d: {},
  getItem(k) { return this._d[k] || null; },
  setItem(k, v) { this._d[k] = String(v); },
  removeItem(k) { delete this._d[k]; }
};
global.sessionStorage = {
  _d: {},
  getItem(k) { return this._d[k] || null; },
  setItem(k, v) { this._d[k] = String(v); },
  removeItem(k) { delete this._d[k]; }
};

const EF = require('./evidence_filing.js');
global.EvidenceFiling = EF;
require('./defendable_lof_workflow.js');

const WF = global.DefendableLofWorkflow || globalThis.DefendableLofWorkflow;

let failed = 0;
function assert(c, m) {
  if (!c) { failed++; console.error('FAIL:', m); }
  else console.log('ok:', m);
}

assert(!!EF, 'EvidenceFiling loaded');
assert(!!WF, 'DefendableLofWorkflow loaded');

const files = EF.getAllFiles();
assert(files.some(f => (f.flights || []).join(' ').includes('EZY4471')), 'seed includes EZY4471 files');
assert(files.some(f => /METAR|CB|ATFM|Fueller|Art9|OCC_Hold/i.test(f.filename + f.notes)), 'seed has weather/ATFM/fuel/art9 files');

const facts = {
  flightNum: 'EZY4471',
  depIata: 'LGW',
  arrIata: 'PMI',
  date: '16/06/24',
  depTime: '10:30Z',
  atdTime: '13:41Z',
  staTime: '12:40Z',
  ataTime: '13:45Z',
  delayText: '3h05m',
  paxCount: '187'
};

const causalNodes = [
  { type: 'root', label: 'Adverse Weather at LGW', sub: 'Significant CBs / METAR available; GDP in force' },
  { type: 'cascade', label: 'ATFM Slot Restriction', sub: 'ATFM under GDP' },
  { type: 'operational', label: 'Fuelling Delay', sub: 'Fueller assigned to another aircraft' },
  { type: 'operational', label: 'Art 9 — Care Gap Flagged', sub: 'Refreshments only; no meal service' },
  { type: 'outcome', label: 'Arrival Delay', sub: '3h05m at destination' }
];

const evidenceDb = {
  weather: [
    { id: 'metar', name: 'METAR / TAF Records', source: 'Ogimet', proves: 'Weather record', priority: 'primary' },
    { id: 'eurocontrol', name: 'Eurocontrol Network Records', source: 'Eurocontrol', proves: 'GDP/ATFM', priority: 'supporting' }
  ]
};

const state = WF.init({
  inputText: 'EZY4471 LGW-PMI METAR CB ATFM fueller Art 9',
  facts,
  dt: { id: 'weather', label: 'Weather Disruption' },
  causalNodes,
  evidenceDb,
  rows: [{ flight: 'EZY4471', route: 'LGW → PMI' }]
});

assert(state.beats.length >= 5, 'beats created: ' + state.beats.length);
assert(Object.keys(state.evidence).length > 0, 'evidence requirements created: ' + Object.keys(state.evidence).length);

const metarKey = Object.keys(state.evidence).find(k => k.endsWith('::metar'));
assert(!!metarKey, 'metar requirement exists');
const metar = state.evidence[metarKey];
assert(metar.matches.length > 0, 'metar matched repository files: ' + metar.matches.length);
assert(/METAR|weather|LGW/i.test(metar.matches[0].filename), 'top metar match looks right: ' + metar.matches[0].filename);

const attached = WF.attachFile(metar.beatId, 'metar', metar.matches[0].id);
assert(attached && attached.status === 'attached', 'attach sets status attached');

const fuelBeat = state.beats.find(b => /Fuel/i.test(b.label));
assert(!!fuelBeat, 'fuelling beat present');
if (fuelBeat && fuelBeat.evidenceItems[0]) {
  const req = WF.requestEvidence(fuelBeat.id, fuelBeat.evidenceItems[0].id, 'Need fueller allocation log');
  assert(req && req.entry.status === 'requested', 'request sets requested');
  const stored = JSON.parse(sessionStorage.getItem('dfa_evidence_requests') || '[]');
  assert(stored.length > 0, 'request persisted to sessionStorage');
}

const snap = WF.confirmSnapshot([{ flight: 'EZY4471', route: 'LGW → PMI', std: '10:30Z' }]);
assert(snap && snap.confirmedAt, 'confirm snapshot created');
assert(state.confirmed === true, 'state marked confirmed');

const pack = WF.packSummary();
assert(pack.attached >= 1, 'pack has attached items');
assert(pack.total > 0, 'pack has requirements');

if (failed) {
  console.error('\n' + failed + ' failed');
  process.exit(1);
}
console.log('\nAll LOF workflow tests passed.');
