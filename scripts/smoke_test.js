#!/usr/bin/env node
/* DefendAble comprehensive smoke test — run: node scripts/smoke_test.js */
var fs = require('fs');
var path = require('path');
var vm = require('vm');
var root = path.join(__dirname, '..');

var results = {};
var allFailures = [];

function section(name) {
  results[name] = { pass: true, failures: [], name: name };
  return results[name];
}

function assert(sec, cond, msg) {
  if (!cond) {
    sec.pass = false;
    sec.failures.push(msg);
    allFailures.push('[' + sec.name + '] ' + msg);
  }
}

function mockStorage() {
  var data = {};
  return {
    getItem: function (k) { return data[k] != null ? data[k] : null; },
    setItem: function (k, v) { data[k] = String(v); },
    removeItem: function (k) { delete data[k]; },
    clear: function () { data = {}; },
  };
}

function loadScripts(files) {
  files.forEach(function (f) {
    var fp = path.join(root, f);
    if (!fs.existsSync(fp)) throw new Error('Missing script: ' + f);
    vm.runInThisContext(fs.readFileSync(fp, 'utf8'), { filename: f });
  });
}

function lineOf(file, pattern) {
  var lines = fs.readFileSync(path.join(root, file), 'utf8').split('\n');
  for (var i = 0; i < lines.length; i++) {
    if (pattern.test(lines[i])) return file + ':' + (i + 1);
  }
  return file + ':?';
}

function listHtmlFiles() {
  return fs.readdirSync(root).filter(function (f) {
    return f.endsWith('.html') && fs.statSync(path.join(root, f)).isFile();
  }).sort();
}

function extractLocalScriptSrcs(html) {
  var srcs = [];
  var re = /<script[^>]+src=["']([^"']+)["']/gi;
  var m;
  while ((m = re.exec(html)) !== null) {
    var src = m[1];
    if (/^https?:\/\//i.test(src)) continue;
    srcs.push(src.split('?')[0].split('#')[0]);
  }
  return srcs;
}

function extractHtmlHrefs(content) {
  var hrefs = [];
  var patterns = [
    /href=["']([a-zA-Z0-9_.-]+\.html[^"']*)["']/gi,
    /location\.href\s*=\s*['"]([a-zA-Z0-9_.-]+\.html[^'"]*)['"]/gi,
    /onclick=["'][^"']*location\.href\s*=\s*\\?['"]([a-zA-Z0-9_.-]+\.html[^'"]*)\\?['"]/gi,
  ];
  patterns.forEach(function (re) {
    var m;
    while ((m = re.exec(content)) !== null) {
      var h = m[1].replace(/\\'/g, "'").split('?')[0].split('#')[0];
      if (/^[a-zA-Z0-9_.-]+\.html$/.test(h)) hrefs.push(h);
    }
  });
  return hrefs;
}

// ── 1. Primary HTML pages & script tags ─────────────────────────────────────
(function testHtmlPages() {
  var sec = section('1. HTML pages & script tags');
  var primary = [
    'index.html', 'cases.html', 'case.html', 'intake.html', 'terminal.html',
    'repository.html', 'requests.html', 'insights.html', 'education.html',
    'dio.html', 'dio-case.html', 'dio-knowledge.html', 'defendable_analyser.html',
    'mass-upload.html',
    'module1-intake.html', 'module2-case-management.html', 'module3-cpr.html',
    'module4-evidence.html', 'module5-drafting.html', 'module6-mi.html',
    'module7-education.html',
    'module2-case-workspace.html', 'module3-cpr-workspace.html',
    'module4-evidence-workspace.html', 'module5-drafting-workspace.html',
    'module8-terminal-workspace.html',
  ];

  primary.forEach(function (page) {
    var fp = path.join(root, page);
    assert(sec, fs.existsSync(fp), page + ' missing');
    if (!fs.existsSync(fp)) return;
    var html = fs.readFileSync(fp, 'utf8');
    var scripts = extractLocalScriptSrcs(html);
    scripts.forEach(function (src) {
      var exists = fs.existsSync(path.join(root, src));
      assert(sec, exists, page + ' → script 404: ' + src + ' (' + lineOf(page, new RegExp(src.replace('.', '\\.'))) + ')');
    });
    if (page.indexOf('workspace') >= 0 || ['index.html', 'cases.html', 'case.html'].indexOf(page) >= 0) {
      assert(sec, html.indexOf('shared_data.js') >= 0, page + ' must load shared_data.js (' + lineOf(page, /shared_data\.js/) + ')');
    }
  });
})();

// ── Setup VM globals for JS module tests ────────────────────────────────────
global.window = global;
global.document = { createElement: function () { return {}; } };
global.localStorage = mockStorage();
global.sessionStorage = mockStorage();
global.location = { href: '', pathname: '/index.html', search: '', replace: function (u) { global.location.href = u; } };
global.URLSearchParams = function (qs) {
  var q = (qs || '').replace(/^\?/, '');
  var map = {};
  q.split('&').filter(Boolean).forEach(function (pair) {
    var p = pair.split('=');
    map[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || '');
  });
  this.get = function (k) { return map[k] != null ? map[k] : null; };
};

try {
  loadScripts([
    'shared_data.js', 'case_helpers.js', 'case_filing.js', 'evidence_filing.js',
    'terminal_health.js', 'work_dashboard.js', 'dio_helpers.js', 'intel_ai_search.js',
    'defendable_framework.js', 'defendable_demo_v2.js',
  ]);
} catch (e) {
  var boot = section('0. Script bootstrap');
  assert(boot, false, e.message);
}

// ── 2. shared_data.js ───────────────────────────────────────────────────────
(function testSharedData() {
  var sec = section('2. shared_data.js');
  assert(sec, typeof getCase === 'function', 'getCase missing');
  assert(sec, typeof normaliseCaseRef === 'function', 'normaliseCaseRef missing');
  assert(sec, typeof ALL_CASES !== 'undefined' && Array.isArray(ALL_CASES), 'ALL_CASES not defined');
  assert(sec, ALL_CASES.length === 14, 'ALL_CASES count expected 14, got ' + (ALL_CASES && ALL_CASES.length));

  var alias = normaliseCaseRef('AC-2026-0089');
  assert(sec, alias === 'DEF-2026-EW-0089', 'normaliseCaseRef AC-2026-0089 → ' + alias);

  var c = getCase('DEF-2026-EW-0089');
  assert(sec, !!c && c.claimant === 'Daniel Hartley', 'getCase(DEF-2026-EW-0089) flagship case');
  assert(sec, !!getCase('AC-2026-0089'), 'getCase alias AC-2026-0089');
})();

// ── 3. case_helpers.js — flagship case ──────────────────────────────────────
(function testCaseHelpers() {
  var sec = section('3. case_helpers.js');
  var ref = 'DEF-2026-EW-0089';
  var c = getCase(ref);

  assert(sec, typeof openCase === 'function', 'openCase missing');
  assert(sec, typeof advanceCaseStage === 'function', 'advanceCaseStage missing');
  assert(sec, typeof getWaitingOn === 'function', 'getWaitingOn missing');
  assert(sec, typeof getNextAction === 'function', 'getNextAction missing');

  global.location.href = '';
  sessionStorage.setItem('dfa_user', 'SB');
  openCase(ref);
  assert(sec, global.location.href.indexOf('case.html?ref=' + encodeURIComponent(ref)) === 0,
    'openCase routes to case.html (' + global.location.href + ')');

  var prevStage = c.stage;
  advanceCaseStage(ref, 'drafting', 'Smoke test stage bump');
  assert(sec, c.stage === 'drafting', 'advanceCaseStage updates stage');
  c.stage = prevStage;

  var waiting = getWaitingOn(c);
  assert(sec, Array.isArray(waiting) && waiting.length > 0,
    'getWaitingOn returns blockers for evidence-stage flagship');
  assert(sec, waiting.some(function (b) { return b.who === 'Evidence team'; }),
    'getWaitingOn includes Evidence team blocker');

  var next = getNextAction(c);
  assert(sec, next && typeof next.text === 'string' && next.text.length > 0,
    'getNextAction returns action text');
  assert(sec, next.tab === 'evidence', 'getNextAction tab for evidence stage');
})();

// ── 4. defendable_demo_v2.js ────────────────────────────────────────────────
(function testDefendAbleDemo() {
  var sec = section('4. defendable_demo_v2.js');
  assert(sec, typeof DefendAbleDemoV2 !== 'undefined', 'DefendAbleDemoV2 missing');
  assert(sec, typeof DefendAbleDemoV2.analyze === 'function', 'analyze() missing');

  var samples = [
    { text: 'Flight delayed LTN due to Eurocontrol CTOT restriction, network-wide ATFM regulation.', expect: ['DEFEND', 'DEFEND_WITH_CONDITIONS', 'INVESTIGATE', 'JUDGMENT_REQUIRED'] },
    { text: 'G-EZAB birdstrike on approach MAN. Aircraft AOG — engine ingestion confirmed.', expect: ['DEFEND_WITH_CONDITIONS'] },
    { text: 'Pilot union strike — carrier own pilot staff participating. 40% of fleet grounded.', expect: ['CONCEDE'] },
  ];

  samples.forEach(function (s) {
    var r = DefendAbleDemoV2.analyze(s.text);
    assert(sec, r && r.verdict, 'analyze() returns verdict for: ' + s.text.substring(0, 40) + '…');
    assert(sec, s.expect.indexOf(r.verdict) >= 0,
      'analyze() verdict ' + r.verdict + ' in expected set for sample');
    assert(sec, r.evidencePack && r.evidencePack.length > 0, 'analyze() evidence pack populated');
  });
})();

// ── 5. intel_ai_search.js ───────────────────────────────────────────────────
(function testIntelSearch() {
  var sec = section('5. intel_ai_search.js');
  assert(sec, typeof IntelAISearch !== 'undefined', 'IntelAISearch missing');
  assert(sec, typeof IntelAISearch.parseQuery === 'function', 'parseQuery missing');
  assert(sec, typeof IntelAISearch.filterCases === 'function', 'filterCases missing');

  var parsed = IntelAISearch.parseQuery('weather delays from LTN england');
  assert(sec, parsed && parsed.raw, 'parseQuery returns parsed object');
  assert(sec, parsed.jurisdictions.indexOf('england-wales') >= 0 || parsed.disruptionTypes.indexOf('Weather') >= 0,
    'parseQuery detects weather or E&W jurisdiction');

  var filtered = IntelAISearch.filterCases(ALL_CASES, parsed);
  assert(sec, Array.isArray(filtered), 'filterCases returns array');
  assert(sec, filtered.length > 0 && filtered.length <= ALL_CASES.length,
    'filterCases returns subset (got ' + filtered.length + ')');
})();

// ── 6. dio_helpers.js — jurisdiction routing ────────────────────────────────
(function testDioHelpers() {
  var sec = section('6. dio_helpers.js');
  assert(sec, typeof DIO !== 'undefined', 'DIO global missing');
  assert(sec, typeof DIO.jurisdictionCases === 'function', 'jurisdictionCases missing');
  assert(sec, typeof DIO.dioCaseUrl === 'function', 'dioCaseUrl missing');

  sessionStorage.setItem('dfa_user', 'EH');
  var ew = DIO.jurisdictionCases('england-wales');
  var fr = DIO.jurisdictionCases('france');
  assert(sec, ew.length >= 5, 'EH jurisdictionCases england-wales (got ' + ew.length + ')');
  assert(sec, fr.length >= 3, 'jurisdictionCases france pool exists');

  sessionStorage.setItem('dfa_user', 'FD');
  var fdEw = DIO.jurisdictionCases('england-wales');
  var fdFr = DIO.jurisdictionCases('france');
  assert(sec, fdFr.every(function (c) { return c.jurisdiction === 'france'; }),
    'FD sees only France jurisdiction cases');

  var url = DIO.dioCaseUrl('DEF-2026-EW-0089');
  assert(sec, url === 'dio-case.html?ref=DEF-2026-EW-0089', 'dioCaseUrl format');
})();

// ── 7. case_filing, evidence_filing, terminal_health load ───────────────────
(function testFilingModules() {
  var sec = section('7. Filing & terminal modules');
  assert(sec, typeof CaseFiling !== 'undefined', 'CaseFiling missing');
  assert(sec, typeof CaseFiling.getCase === 'function', 'CaseFiling.getCase missing');
  assert(sec, typeof EvidenceFiling !== 'undefined', 'EvidenceFiling missing');
  assert(sec, typeof EvidenceFiling.FILING_CATEGORIES !== 'undefined' && EvidenceFiling.FILING_CATEGORIES.length > 0,
    'EvidenceFiling.FILING_CATEGORIES populated');
  assert(sec, typeof TerminalHealth !== 'undefined', 'TerminalHealth missing');
  assert(sec, typeof TerminalHealth.runCheck === 'function', 'TerminalHealth.runCheck missing');

  var cf = CaseFiling.getCase('DEF-2026-EW-0076');
  assert(sec, !!cf, 'CaseFiling seed for DEF-2026-EW-0076');

  var health = TerminalHealth.runCheck('DEF-2026-EW-0076', getCase('DEF-2026-EW-0076'));
  assert(sec, health && typeof health.score === 'number', 'TerminalHealth.runCheck returns score');
})();

// ── 8. Workspace HTML uses shared_data.js, not embedded ALL_CASES ───────────
(function testWorkspaceDataSource() {
  var sec = section('8. Workspace data source');
  var workspaces = fs.readdirSync(root).filter(function (f) {
    return f.indexOf('workspace') >= 0 && f.endsWith('.html');
  });

  workspaces.forEach(function (page) {
    var html = fs.readFileSync(path.join(root, page), 'utf8');
    assert(sec, html.indexOf('shared_data.js') >= 0,
      page + ' must reference shared_data.js (' + lineOf(page, /shared_data\.js/) + ')');
    assert(sec, !/const\s+ALL_CASES\s*=\s*\[/.test(html) && !/var\s+ALL_CASES\s*=\s*\[/.test(html),
      page + ' must NOT embed ALL_CASES array (' + lineOf(page, /ALL_CASES\s*=\s*\[/) + ')');
  });
})();

// ── 9. Legacy redirects ───────────────────────────────────────────────────────
(function testLegacyRedirects() {
  var sec = section('9. Legacy redirects');
  var src = fs.readFileSync(path.join(root, 'legacy_redirect.js'), 'utf8');
  assert(sec, fs.existsSync(path.join(root, 'legacy_redirect.js')), 'legacy_redirect.js exists');

  var map = {
    'module1-intake.html': 'intake.html',
    'module2-case-management.html': 'cases.html',
    'module3-cpr.html': 'cases.html?filter=deadlines',
    'module4-evidence.html': 'cases.html?filter=evidence',
    'module5-drafting.html': 'cases.html?filter=drafting',
    'module6-mi.html': 'insights.html?tab=reporting',
    'module7-education.html': 'education.html',
  };

  Object.keys(map).forEach(function (from) {
    assert(sec, src.indexOf("'" + from + "'") >= 0, 'legacy MAP includes ' + from);
    var target = map[from].split('?')[0];
    assert(sec, fs.existsSync(path.join(root, target)), from + ' redirect target exists: ' + target);
  });

  assert(sec, src.indexOf("uid === 'EH'") >= 0 && src.indexOf("'requests.html'") >= 0,
    'module4-evidence EH override to requests.html');

  ['module1-intake.html', 'module2-case-management.html', 'module3-cpr.html',
    'module4-evidence.html', 'module5-drafting.html', 'module7-education.html'].forEach(function (p) {
    var html = fs.readFileSync(path.join(root, p), 'utf8');
    assert(sec, html.indexOf('legacy_redirect.js') >= 0,
      p + ' loads legacy_redirect.js (' + lineOf(p, /legacy_redirect\.js/) + ')');
  });
})();

// ── 10. Broken onclick / href to dead pages ─────────────────────────────────
(function testDeadLinks() {
  var sec = section('10. Dead page links');
  var knownHtml = {};
  listHtmlFiles().forEach(function (f) { knownHtml[f] = true; });

  var dead = [];
  listHtmlFiles().forEach(function (page) {
    var content = fs.readFileSync(path.join(root, page), 'utf8');
    extractHtmlHrefs(content).forEach(function (target) {
      if (!knownHtml[target]) {
        dead.push({ page: page, target: target, line: lineOf(page, new RegExp(target.replace('.', '\\.'))) });
      }
    });
  });

  ['shared_nav.js', 'case_helpers.js', 'nav.js', '_nav.js'].forEach(function (js) {
    var fp = path.join(root, js);
    if (!fs.existsSync(fp)) return;
    var content = fs.readFileSync(fp, 'utf8');
    var re = /href:\s*['"]([a-zA-Z0-9_.-]+\.html)['"]/g;
    var m;
    while ((m = re.exec(content)) !== null) {
      if (!knownHtml[m[1]]) dead.push({ page: js, target: m[1], line: lineOf(js, new RegExp(m[1].replace('.', '\\.'))) });
    }
  });

  dead.forEach(function (d) {
    assert(sec, false, d.page + ' → dead link ' + d.target + ' (' + d.line + ')');
  });
  if (!dead.length) assert(sec, true, 'no dead internal .html links found');
})();

// ── Report ──────────────────────────────────────────────────────────────────
console.log('\nDefendAble Smoke Test Report');
console.log('='.repeat(60));

var areaOrder = Object.keys(results).sort();
var totalPass = 0;
var totalFail = 0;

areaOrder.forEach(function (key) {
  var r = results[key];
  var status = r.pass ? 'PASS' : 'FAIL';
  if (r.pass) totalPass++; else totalFail++;
  console.log('\n' + status + '  ' + key);
  if (r.failures.length) {
    r.failures.forEach(function (f) { console.log('       • ' + f); });
  }
});

console.log('\n' + '='.repeat(60));
console.log('Summary: ' + totalPass + ' passed, ' + totalFail + ' failed, ' + areaOrder.length + ' areas');

if (allFailures.length) {
  console.log('\nRecommended fixes before email send:');
  allFailures.forEach(function (f, i) { console.log('  ' + (i + 1) + '. ' + f); });
  process.exit(1);
}

console.log('\nAll feature areas passed — ready for demo/email send.');
process.exit(0);
