#!/usr/bin/env node
/* Pitch readiness health check — run: node scripts/pitch_readiness_health_check.js */
var fs = require('fs');
var path = require('path');
var root = path.join(__dirname, '..');

var failures = [];
function assert(cond, msg) {
  if (!cond) failures.push(msg);
}

assert(fs.existsSync(path.join(root, 'report_engine.js')), 'report_engine.js exists');
assert(fs.existsSync(path.join(root, 'flight_data.js')), 'flight_data.js exists');

var helpers = fs.readFileSync(path.join(root, 'case_helpers.js'), 'utf8');
assert(helpers.indexOf('function getPortfolioCases') >= 0, 'getPortfolioCases defined');
assert(helpers.indexOf('function persistPortfolioCase') >= 0, 'persistPortfolioCase defined');

var mi = fs.readFileSync(path.join(root, 'module6-mi.html'), 'utf8');
assert(mi.indexOf('report_engine.js') >= 0, 'MI includes report_engine');
assert(mi.indexOf('ReportEngine.build') >= 0, 'MI uses live ReportEngine');

var insights = fs.readFileSync(path.join(root, 'insights.html'), 'utf8');
assert(insights.indexOf('getPortfolioCases') >= 0, 'insights uses getPortfolioCases');
assert(insights.indexOf('ATFM extraordinary circumstances cohort') >= 0, 'ATFM correlation card');

var dio = fs.readFileSync(path.join(root, 'dio.html'), 'utf8');
assert(dio.indexOf('flight_data.js') >= 0, 'DIO includes flight_data');
assert(dio.indexOf('refreshLiveFlights') >= 0, 'DIO live flight refresh');

var template = fs.readFileSync(path.join(root, 'intake_template.js'), 'utf8');
assert(template.indexOf('defenceRefForRow') >= 0, 'batch DEF ref helper');

try {
  new Function(fs.readFileSync(path.join(root, 'report_engine.js'), 'utf8'));
  new Function(fs.readFileSync(path.join(root, 'flight_data.js'), 'utf8'));
} catch (e) {
  failures.push('engine syntax: ' + e.message);
}

if (failures.length) {
  console.error('FAILED (' + failures.length + '):');
  failures.forEach(function (f) {
    console.error('  -', f);
  });
  process.exit(1);
}

console.log('OK — pitch readiness health check passed');
