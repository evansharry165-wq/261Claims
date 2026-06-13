#!/usr/bin/env node
/* DIO role integration check — run: node scripts/dio_health_check.js */
var fs = require('fs');
var path = require('path');
var vm = require('vm');
var root = path.join(__dirname, '..');

function mockStorage() {
  var data = {};
  return {
    getItem: function (k) { return data[k] != null ? data[k] : null; },
    setItem: function (k, v) { data[k] = String(v); },
  };
}

global.window = global;
global.localStorage = mockStorage();
global.sessionStorage = mockStorage();

['shared_data.js', 'case_helpers.js', 'work_dashboard.js'].forEach(function (f) {
  vm.runInThisContext(fs.readFileSync(path.join(root, f), 'utf8'), { filename: f });
});

var failures = [];
function assert(cond, msg) {
  if (!cond) failures.push(msg);
}

assert(WorkDashboard.isDIOUser('EH'), 'EH is DIO');
assert(WorkDashboard.isDIOUser('FD'), 'FD is DIO');
assert(WorkDashboard.isDIOUser('SR'), 'SR is DIO');
assert(!WorkDashboard.isDIOUser('SB'), 'SB is not DIO');
assert(WorkDashboard.isEvidenceUser('EH'), 'EH counts as evidence-capable user');

assert(USERS.EH.team === 'dio' && USERS.EH.jurisdiction === 'england-wales', 'EH profile');
assert(USERS.FD.team === 'dio' && USERS.FD.jurisdiction === 'france', 'FD profile');
assert(USERS.SR.team === 'dio' && USERS.SR.jurisdiction === 'spain', 'SR profile');

var ewCases = ALL_CASES.filter(function (c) {
  return c.jurisdiction === 'england-wales' && c.stage !== 'resolve';
});
var frCases = ALL_CASES.filter(function (c) {
  return c.jurisdiction === 'france' && c.stage !== 'resolve';
});
assert(ewCases.length > 0 && frCases.length > 0, 'jurisdiction case pools exist');

var navSrc = fs.readFileSync(path.join(root, 'shared_nav.js'), 'utf8');
assert(navSrc.indexOf('DIO_NAV') >= 0, 'DIO_NAV defined');
assert(navSrc.indexOf("u.team === 'dio'") >= 0, 'DIO nav routing');

var indexSrc = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
assert(indexSrc.indexOf('renderDIOWork') >= 0, 'renderDIOWork in index');
assert(indexSrc.indexOf('WorkDashboard.isDIOUser') >= 0, 'DIO routing in index');

var casesSrc = fs.readFileSync(path.join(root, 'cases.html'), 'utf8');
assert(casesSrc.indexOf('renderDIOCases') >= 0, 'renderDIOCases in cases.html');

if (failures.length) {
  console.error('FAILED (' + failures.length + '):');
  failures.forEach(function (f) { console.error('  -', f); });
  process.exit(1);
}

console.log('OK — DIO role health check passed');
console.log('  E&W cases:', ewCases.length, '| FR cases:', frCases.length);
