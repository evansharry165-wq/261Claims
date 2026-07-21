/**
 * Tests for defendable_icc_parse.js — EZY4470/4471 ops narrative.
 */
const parse = require('./defendable_icc_parse.js');

const ICC = `inbound rotation (EZY4470 PMI-LGW) was held at PMI from 0820z due ATFM slot restrictions at LGW - London TMA holding significant CBs moving through from 0630z, LGW went into GDP around 0700z. slot issued to 4470 was 1015z dep PMI which pushed her back to blocks LGW approx 1215z.

4471 sched dep LGW 1030z, pax boarded 0945z, doors closed 1020z. Held on stand as inbound not yet in. Captain made PA at 1025z advising ATC delay, no further detail given. Pax remained on board throughout.

inbound finally blocked in 1217z - crew changeover not required (same crew, within FDP). Turnaround commenced immediately, ground ops priority tagged. Fuel uplift delayed approx 20mins as fueller assigned to another aircraft on stand - had to be recalled. Dep clearance received 1328z, airbourne 1341z.

PMI ETA now 1545z local (1345z utc). Sched arr was 1240z utc. Arrival delay approx 3h05m.

pax count 187 (185 revenue + 2 staff tix). 6 connecting pax onboard - connections at PMI all missed, hotel being arranged PMI end.

METAR LGW 0600-1100z available, showing TS+RA CB significant. Commanders report being completed. ATFM slot documentation - not yet pulled from network ops. no PIREP yet for 4471.

Art 9 - refreshments offered on board approx 1100z (water and snack pack). no meal service provided despite delay exceeding 3hrs on stand.

OCC decision at 1130z to hold pax on board rather than disembark - captain concurred. Rationale: expected clearance imminent (was not). Pax remained on board approx 3h20m total.

261 exposure flagged to legal - awaiting classification. Duty manager authorised hold decision. No pax complained formally on board but cabin crew noted several asking about compensation rights.`;

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    failed++;
    console.error('FAIL:', msg);
  } else {
    console.log('ok:', msg);
  }
}

// Times
assert(parse.normalizeOpsTime('0820z') === '08:20Z', '0820z → 08:20Z');
assert(parse.normalizeOpsTime('10:30Z') === '10:30Z', '10:30Z passthrough');
assert(parse.normalizeOpsTime('1345z utc') === '13:45Z', '1345z utc');

// Flights — no TO4470 false positive; bare 4471 carries EZY
const refs = parse.extractFlightRefs(ICC);
const codes = refs.map((r) => r.code);
assert(codes.includes('EZY4470'), 'finds EZY4470');
assert(codes.includes('EZY4471'), 'finds bare 4471 as EZY4471');
assert(!codes.includes('TO4470'), 'does not false-match to 4470 as TO4470');

// LOF rows
const rows = parse.parseLOFFromText(ICC);
assert(rows.length >= 2, 'at least 2 LOF rows, got ' + rows.length);
const r0 = rows.find((r) => r.flight === 'EZY4470');
const r1 = rows.find((r) => r.flight === 'EZY4471');
assert(!!r0, 'LOF has EZY4470');
assert(!!r1, 'LOF has EZY4471');
assert(/PMI/.test(r0.route) && /LGW/.test(r0.route), '4470 route PMI-LGW: ' + r0.route);
assert(r0.atd === '10:15Z' || r0.note.indexOf('10:15') >= 0 || r0.note.indexOf('Slot') >= 0, '4470 slot/ATD captured: atd=' + r0.atd + ' note=' + r0.note);
assert(r0.ata === '12:15Z' || r0.ata === '12:17Z' || /12:1[57]/.test(r0.ata + r0.note), '4470 blocks time: ata=' + r0.ata);
assert(r1.std === '10:30Z', '4471 STD 10:30Z, got ' + r1.std);
assert(r1.atd === '13:41Z' || r1.atd === '13:28Z', '4471 ATD airborne/clearance, got ' + r1.atd);
assert(/LGW/.test(r1.route) && /PMI/.test(r1.route), '4471 route LGW-PMI: ' + r1.route);

// Claimed flight / facts
const facts = parse.enrichFacts({}, ICC);
assert(facts.flightNum === 'EZY4471', 'claimed flight is 4471, got ' + facts.flightNum);
assert(facts.depIata === 'LGW', 'dep LGW, got ' + facts.depIata);
assert(facts.arrIata === 'PMI', 'arr PMI, got ' + facts.arrIata);
assert(facts.depTime === '10:30Z', 'STD 10:30Z, got ' + facts.depTime);
assert(facts.atdTime === '13:41Z' || facts.atdTime === '13:28Z', 'ATD set, got ' + facts.atdTime);
assert(facts.staTime === '12:40Z', 'STA 12:40Z, got ' + facts.staTime);
assert(facts.ataTime === '13:45Z', 'ATA/ETA 13:45Z, got ' + facts.ataTime);
assert(/3h0?5/.test(facts.delayText || ''), 'delay text 3h05m, got ' + facts.delayText);
assert(facts.paxCount === '187', 'pax 187, got ' + facts.paxCount);

// Factors
const hints = parse.disruptionFactorHints(ICC);
assert(hints.weatherBonus >= 6, 'weather bonus from METAR/CB');
assert(hints.factors.some((f) => f.id === 'weather'), 'weather factor');
assert(hints.factors.some((f) => f.id === 'atfm'), 'atfm factor');
assert(hints.factors.some((f) => f.id === 'fuelling'), 'fuelling factor');

// Story events
const story = parse.extractStoryEvents(ICC);
const labels = story.map((s) => s.label).join(' | ');
assert(story.some((s) => /weather|CB|Adverse/i.test(s.label)), 'story has weather: ' + labels);
assert(story.some((s) => /ATFM|Slot/i.test(s.label)), 'story has ATFM');
assert(story.some((s) => /Fuel/i.test(s.label)), 'story has fuelling');
assert(story.some((s) => /Art 9|Care Gap/i.test(s.label)), 'story has Art 9 gap');

if (failed) {
  console.error('\n' + failed + ' failed');
  process.exit(1);
}
console.log('\nAll ICC parse tests passed.');
