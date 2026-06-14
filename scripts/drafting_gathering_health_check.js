#!/usr/bin/env node
/* Drafting gathering panel scroll — run: node scripts/drafting_gathering_health_check.js */
var fs = require('fs');
var path = require('path');
var root = path.join(__dirname, '..');

var failures = [];
function assert(cond, msg) {
  if (!cond) failures.push(msg);
}

var m5 = fs.readFileSync(path.join(root, 'module5-drafting-workspace.html'), 'utf8');
var embed = fs.readFileSync(path.join(root, 'case_embed.js'), 'utf8');
var shell = fs.readFileSync(path.join(root, 'case_shell.js'), 'utf8');

assert(m5.indexOf('function buildGatheringPanelHtml') >= 0, 'buildGatheringPanelHtml defined');
assert(m5.indexOf('function showGatheringOverlay') >= 0, 'showGatheringOverlay defined');
assert(m5.indexOf('function requestGenerateDraft') >= 0, 'requestGenerateDraft defined');
assert(m5.indexOf('isCaseEmbed()') >= 0 && m5.indexOf('generateDoc(id)') >= 0, 'embed mode skips questionnaire');
assert(m5.indexOf('gathering-overlay') >= 0, 'gathering overlay CSS present');
assert(m5.indexOf("workspace.insertAdjacentHTML('afterbegin',html)") < 0, 'gathering panel not injected outside scroll container');
assert(embed.indexOf('gathering-overlay') >= 0, 'case_embed routes scroll for gathering overlay');
assert(shell.indexOf('gathering-overlay') >= 0, 'case_shell routes scroll for gathering overlay');

if (failures.length) {
  console.error('FAILED (' + failures.length + '):');
  failures.forEach(function (f) { console.error('  -', f); });
  process.exit(1);
}

console.log('OK — drafting gathering health check passed');
