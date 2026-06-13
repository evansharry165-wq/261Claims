#!/usr/bin/env node
/* Terminal integration health check — run: node scripts/terminal_health_check.js */
var fs = require('fs');
var path = require('path');
var vm = require('vm');
var root = path.join(__dirname, '..');

function mockStorage() {
  var data = {};
  return {
    _data: data,
    getItem: function (k) { return data[k] != null ? data[k] : null; },
    setItem: function (k, v) { data[k] = String(v); },
    removeItem: function (k) { delete data[k]; },
    clear: function () { data = {}; },
  };
}

global.window = global;
global.localStorage = mockStorage();
global.sessionStorage = mockStorage();

['shared_data.js', 'case_helpers.js', 'case_filing.js', 'terminal_health.js', 'work_dashboard.js'].forEach(function (f) {
  var code = fs.readFileSync(path.join(root, f), 'utf8');
  vm.runInThisContext(code, { filename: f });
});

var failures = [];
function assert(cond, msg) {
  if (!cond) failures.push(msg);
}

assert(typeof normaliseCaseRef === 'function', 'normaliseCaseRef exists');
assert(normaliseCaseRef('AC-2026-0076') === 'DEF-2026-EW-0076', 'ref alias AC-2026-0076');
assert(getCase('AC-2026-0076') && getCase('AC-2026-0076').ref === 'DEF-2026-EW-0076', 'getCase alias');

var cf = CaseFiling.getCase('DEF-2026-EW-0076');
assert(!!cf, 'case filing seed DEF-2026-EW-0076');
assert(!!CaseFiling.findByDocKey('DEF-2026-EW-0076', 'lor'), 'LOR on file for 0076');
assert(!!CaseFiling.findByDocKey('DEF-2026-FR-0009', 'lor'), 'LOR on file for FR-0009');
assert(!!CaseFiling.findByDocKey('DEF-2026-ES-0027', 'lor'), 'LOR on file for ES-0027');

var drafting = ALL_CASES.filter(function (c) { return c.stage === 'drafting'; });
drafting.forEach(function (c) {
  var h = TerminalHealth.runCheck(c.ref, c);
  assert(h.documents.length > 0 || h.checks.some(function (ch) { return ch.id === 'primary_doc' && ch.status === 'pass'; }),
    'health has docs or primary pass for ' + c.ref);
});

var queue = TerminalHealth.listTerminalQueue(drafting);
assert(queue.length >= 3, 'terminal queue has drafting cases (got ' + queue.length + ')');

var jpQueue = WorkDashboard.getTerminalQueueForUser('JP');
assert(jpQueue.some(function (q) { return q.ref === 'DEF-2026-EW-0076'; }), 'JP terminal queue includes Taylor');

var taylorHealth = TerminalHealth.runCheck('DEF-2026-EW-0076', getCase('DEF-2026-EW-0076'));
assert(taylorHealth.canSend === true, 'Taylor case can send');
assert(taylorHealth.blockers === 0, 'Taylor has no blockers');

assert(typeof markCaseResolved === 'function', 'markCaseResolved exists');

if (failures.length) {
  console.error('FAILED (' + failures.length + '):');
  failures.forEach(function (f) { console.error('  -', f); });
  process.exit(1);
}

console.log('OK — Terminal health check passed');
console.log('  Queue size (drafting):', queue.length);
console.log('  Taylor health score:', taylorHealth.score, taylorHealth.status);
console.log('  JP queue:', jpQueue.map(function (q) { return q.ref + '(' + q.score + ')'; }).join(', '));
