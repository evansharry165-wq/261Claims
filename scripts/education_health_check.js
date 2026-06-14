#!/usr/bin/env node
/* Education hub health check — run: node scripts/education_health_check.js */
var fs = require('fs');
var path = require('path');
var root = path.join(__dirname, '..');

var failures = [];
function assert(cond, msg) {
  if (!cond) failures.push(msg);
}

var src = fs.readFileSync(path.join(root, 'education.html'), 'utf8');

assert(src.indexOf('var SECTIONS') >= 0, 'SECTIONS defined');
assert(src.indexOf('function render()') >= 0, 'render() defined');
assert(src.indexOf('initIntelligenceHub') >= 0, 'initIntelligenceHub defined');
assert(src.indexOf("showSection('contribute')") < 0, 'no broken showSection quote');
assert(src.indexOf("filterIntel(this,''") < 0, 'no broken filterIntel quote');

var scriptMatch = src.match(/<script>\s*var CASE_LAW_INDEX[\s\S]*?<\/script>/);
assert(scriptMatch, 'main education script block found');
try {
  new Function(scriptMatch[0].replace(/^<script>/, '').replace(/<\/script>$/, ''));
} catch (e) {
  failures.push('education script syntax: ' + e.message);
}

assert(fs.existsSync(path.join(root, 'knowledge_store.json')), 'knowledge_store.json exists');

if (failures.length) {
  console.error('FAILED (' + failures.length + '):');
  failures.forEach(function (f) { console.error('  -', f); });
  process.exit(1);
}

console.log('OK — education hub health check passed');
