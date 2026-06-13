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

['shared_data.js', 'case_helpers.js', 'work_dashboard.js', 'dio_helpers.js'].forEach(function (f) {
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

assert(typeof DISRUPTION_EVENTS !== 'undefined' && DISRUPTION_EVENTS.length >= 5, 'DISRUPTION_EVENTS defined');

var navSrc = fs.readFileSync(path.join(root, 'shared_nav.js'), 'utf8');
assert(navSrc.indexOf('DIO_NAV') >= 0, 'DIO_NAV defined');
assert(navSrc.indexOf("href: 'dio.html'") >= 0, 'DIO nav points to dio.html');
assert(navSrc.indexOf('dio-knowledge.html') >= 0, 'DIO knowledge nav');
assert(navSrc.indexOf("u.team === 'dio'") >= 0, 'DIO nav routing');

var indexSrc = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
assert(indexSrc.indexOf("window.location.replace('dio.html')") >= 0, 'DIO redirect in index');
assert(indexSrc.indexOf('WorkDashboard.isDIOUser') >= 0, 'DIO routing in index');

var casesSrc = fs.readFileSync(path.join(root, 'cases.html'), 'utf8');
assert(casesSrc.indexOf('renderDIOCases') >= 0, 'renderDIOCases in cases.html');
assert(casesSrc.indexOf('dio-case.html') >= 0, 'DIO case links in cases.html');

assert(fs.existsSync(path.join(root, 'dio.html')), 'dio.html exists');
assert(fs.existsSync(path.join(root, 'dio-case.html')), 'dio-case.html exists');
assert(fs.existsSync(path.join(root, 'dio-knowledge.html')), 'dio-knowledge.html exists');

assert(fs.existsSync(path.join(root, 'shared_user_switch.js')), 'shared_user_switch.js exists');
var switchSrc = fs.readFileSync(path.join(root, 'shared_user_switch.js'), 'utf8');
assert(switchSrc.indexOf('DemoUserSwitch') >= 0, 'DemoUserSwitch defined');

var dioSrc = fs.readFileSync(path.join(root, 'dio.html'), 'utf8');
assert(dioSrc.indexOf('shared_user_switch.js') >= 0, 'dio.html uses shared user switch');
assert(dioSrc.indexOf('user-dropdown"></div>') >= 0, 'dio.html delegates user menu to shared switcher');

var helpersSrc = fs.readFileSync(path.join(root, 'case_helpers.js'), 'utf8');
assert(helpersSrc.indexOf('dio-case.html') >= 0, 'openCase routes DIO to dio-case.html');

if (failures.length) {
  console.error('FAILED (' + failures.length + '):');
  failures.forEach(function (f) { console.error('  -', f); });
  process.exit(1);
}

console.log('OK — DIO role health check passed');
console.log('  E&W cases:', ewCases.length, '| FR cases:', frCases.length);
