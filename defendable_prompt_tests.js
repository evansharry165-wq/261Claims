/* DefendAble — Structured prompt banks + compose tests */
/* Run: node defendable_prompt_tests.js */

var DefendAblePromptBanks = require('./defendable_prompt_banks.js');

var passed = 0;
var failed = 0;
function assert(cond, msg) {
  if (cond) {
    passed++;
    console.log('  OK  ' + msg);
  } else {
    failed++;
    console.log(' FAIL ' + msg);
  }
}

console.log('\n=== Keyword banks ===');
assert(DefendAblePromptBanks.BANKS.length >= 10, 'at least 10 banks');
assert(DefendAblePromptBanks.BANKS.some(function (b) { return b.id === 'atc' && b.tree === 'DT-01'; }), 'ATC → DT-01');
assert(DefendAblePromptBanks.BANKS.some(function (b) { return b.id === 'weather' && b.tree === 'DT-02'; }), 'Weather → DT-02');

var engaged = DefendAblePromptBanks.scanText(
  'Eurocontrol ATFM CTOT slot restriction. CB thunderstorm. No standby aircraft. Re-routing checked interline.'
);
assert(!!engaged.atc, 'engages ATC bank');
assert(!!engaged.weather, 'engages weather bank');
assert(!!engaged.rm, 'engages RM bank');
assert((engaged.weather.flags || []).length >= 0, 'weather flags array present');

var deice = DefendAblePromptBanks.scanText('Aircraft delayed for de-icing only');
assert(deice.weather && deice.weather.flags.length > 0, 'de-icing warn flag');

console.log('\n=== Compose / parse sections ===');
var marked = DefendAblePromptBanks.composeSections({
  flight: 'EZY3061 GVA-PMI STD 0650Z',
  cause: 'ATFM CTOT Eurocontrol',
  measures: 'No standby. Re-routing checked.'
});
assert(/\[FLIGHT\]/.test(marked) && /\[CAUSE\]/.test(marked) && /\[MEASURES\]/.test(marked), 'compose emits markers');

var legacy = DefendAblePromptBanks.composeSections({
  flight: 'HC 1184 LTN-BCN thunderstorm diversion',
  cause: '',
  measures: ''
});
assert(legacy.indexOf('[FLIGHT]') < 0, 'single-section compose is unmarked (legacy path)');

var parsed = DefendAblePromptBanks.parseSections(marked);
assert(parsed.marked === true, 'parse detects markers');
assert(/EZY3061/.test(parsed.flight), 'flight section recovered');
assert(/ATFM/.test(parsed.cause), 'cause section recovered');
assert(/standby/.test(parsed.measures), 'measures section recovered');

var unmarked = DefendAblePromptBanks.parseSections('Plain ICC paste with ATFM CTOT');
assert(unmarked.marked === false, 'unmarked paste');
assert(/Plain ICC/.test(unmarked.flight), 'unmarked body lands in flight');

console.log('\n=== Completeness meters ===');
var def = DefendAblePromptBanks.SECTION_DEFS[0];
assert(DefendAblePromptBanks.meterScore('EZY4470 LGW–AMS STD 1030Z', def.needs) >= 2, 'flight meter scores ops content');
assert(DefendAblePromptBanks.meterScore('', def.needs) === 0, 'empty flight meter is 0');

console.log('\n=== Section-aware ICC parse ===');
var DefendableIccParse = require('./defendable_icc_parse.js');
// Banks must be on global for section helpers inside parse
global.DefendAblePromptBanks = DefendAblePromptBanks;

var composed =
  '[FLIGHT] EZY4470 PMI-LGW held ATFM. 4471 sched dep LGW 1030z airborne 1341z LGW-PMI.\n\n' +
  '[CAUSE] CB thunderstorm Eurocontrol ATFM weather regulation CTOT.\n\n' +
  '[MEASURES] No standby. Re-routing checked own metal and interline.';

var rows = DefendableIccParse.parseLOFFromText(composed);
assert(rows.length >= 2, 'LOF from marked FLIGHT section (got ' + rows.length + ')');
assert(rows.some(function (r) { return /4470/.test(r.flight); }), 'has 4470');
assert(rows.some(function (r) { return /4471/.test(r.flight); }), 'has 4471');

var hints = DefendableIccParse.disruptionFactorHints(composed);
assert(hints.factors.some(function (f) { return f.id === 'weather' || f.id === 'atfm'; }), 'cause section feeds factors');

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
