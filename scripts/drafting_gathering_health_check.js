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
assert(m5.indexOf("'+gatheringHtml+evStrip") >= 0, 'gathering panel rendered inside doc-focus-scroll');
assert(m5.indexOf('insertAdjacentHTML') < 0 || m5.indexOf("workspace.insertAdjacentHTML('afterbegin',html)") < 0, 'gathering panel not injected outside scroll container');
assert(m5.indexOf('function cancelGathering') >= 0, 'cancelGathering defined');
assert(embed.indexOf('gathering-panel') >= 0, 'case_embed routes scroll for gathering panel');
assert(shell.indexOf("doc.getElementById('gathering-panel')") >= 0, 'case_shell prefers doc-focus-scroll when gathering panel open');
assert(shell.indexOf('gathering-panel') >= 0 && shell.indexOf("data-scroll-mode', 'panel'") >= 0, 'case_shell expands iframe in gathering mode');

if (failures.length) {
  console.error('FAILED (' + failures.length + '):');
  failures.forEach(function (f) { console.error('  -', f); });
  process.exit(1);
}

console.log('OK — drafting gathering health check passed');
