/**
 * Tests — DefendAbleDocTemplates (node)
 * Run: node defendable_doc_templates_tests.js
 */
var T = require('./defendable_doc_templates.js');

var pass = 0, fail = 0;
function ok(cond, label) {
  if (cond) { pass++; console.log('  OK  ' + label); }
  else { fail++; console.log('  FAIL ' + label); }
}

function fixturePack(overrides) {
  var pack = {
    schemaVersion: 1,
    factsSection: {
      flightNum: 'EZY848', route: 'MAN → BCN', flightDate: '22/07/2026',
      delay: '194 min', jurisdiction: 'UK261',
      causalLabels: ['E1: Adverse Weather — thunderstorms BCN', 'E2: ATC / ATFM Restriction', 'E3: Aircraft diverted to VLC'],
      evidenceMarks: [], lofRows: []
    },
    decideSection: {
      verdict: 'DEFEND_WITH_CONDITIONS',
      authorities: [
        { weight: 'binding', citation: 'Pešková C-315/15' },
        { weight: 'binding', citation: 'Wallentin-Hermann C-549/07' },
        { weight: 'persuasive', citation: 'T-656/24' }
      ],
      conditions: ['METAR/TAF BCN on file'], critNotes: []
    },
    meta: { caseRef: 'DEF-2026-EW-0101', claimant: 'Test Claimant', solicitor: 'Test & Co',
      classification: 'DEFEND_WITH_CONDITIONS', disruptionType: 'weather', value: '£220' }
  };
  Object.keys(overrides || {}).forEach(function (k) {
    Object.keys(overrides[k]).forEach(function (k2) { pack[k][k2] = overrides[k][k2]; });
  });
  return pack;
}

console.log('=== Holding response ===');
var loa = T.holdingResponse(fixturePack());
ok(loa.docKey === 'loa' && loa.folderId === 'correspondence', 'docKey/folder correct');
ok(loa.content.indexOf('DRAFT — AWAITING LAWYER APPROVAL (G2)') >= 0, 'draft banner present');
ok(loa.content.indexOf('within 30 days') >= 0, 'reform 30-day clock stated');
ok(loa.content.indexOf('Article 5(3) UK261') >= 0, 'UK261 statutory language');
ok(loa.content.indexOf('Pre-Action Conduct') >= 0, 'UK protocol para');

console.log('=== Defence letter — UK weather ===');
var lor = T.defenceLetter(fixturePack());
ok(lor.docKey === 'lor' && lor.folderId === 'legal_drafts', 'docKey/folder correct');
ok(lor.content.indexOf('as retained in UK law') >= 0, 'UK261 regulation name');
ok(lor.content.indexOf('adverse meteorological conditions') >= 0, 'weather defence basis');
ok(lor.content.indexOf('Pešková C-315/15') >= 0 && lor.content.indexOf('We rely in particular') >= 0, 'binding authorities cited');
ok(lor.content.indexOf('T-656/24') >= 0 && lor.content.indexOf('Further support') >= 0, 'persuasive authorities separated');
ok(lor.content.indexOf('E1: Adverse Weather') >= 0, 'factual chronology recited');
ok(lor.content.indexOf('Wallentin-Hermann') >= 0, 'two-limb test stated');
ok(lor.content.indexOf('Eglītis') >= 0, 'reasonable measures standard');
ok(lor.content.indexOf('Article 9 UK261') >= 0, 'care para jurisdiction-correct');

console.log('=== Defence letter — EC ATFM variant ===');
var lorEC = T.defenceLetter(fixturePack({ factsSection: { jurisdiction: 'EC261' }, meta: { disruptionType: 'atfm' } }));
ok(lorEC.content.indexOf('("EC261")') >= 0 && lorEC.content.indexOf('retained in UK law') < 0, 'EC261 language, no UK retained-law text');
ok(lorEC.content.indexOf('Moens (C-159/18)') >= 0, 'ATFM defence basis with Moens');

console.log('=== Settlement offer ===');
var so = T.settlementOffer(fixturePack({ meta: { value: '£440' } }));
ok(so.docKey === 'settlement_offer', 'docKey correct');
ok(so.content.indexOf('WITHOUT PREJUDICE SAVE AS TO COSTS') === so.content.indexOf('WITHOUT') && so.content.indexOf('WITHOUT PREJUDICE') >= 0, 'without prejudice header');
ok(so.content.indexOf('£440') >= 0, 'quantum inserted');
ok(so.content.indexOf('full and final settlement') >= 0, 'full and final terms');
ok(so.content.indexOf('14 days') >= 0, 'acceptance window');
ok(so.content.indexOf('no admission') >= 0 || so.content.indexOf('Without any admission') >= 0, 'no admission of liability');

console.log('=== Verdict-driven selection ===');
var defendDocs = T.draftsForPack(fixturePack());
ok(defendDocs.length === 2 && defendDocs[1].docKey === 'lor', 'DEFEND_WITH_CONDITIONS → LOA + LOR');
var settleDocs = T.draftsForPack(fixturePack({ decideSection: { verdict: 'SETTLE' }, meta: { classification: 'SETTLE' } }));
ok(settleDocs.length === 2 && settleDocs[1].docKey === 'settlement_offer', 'SETTLE → LOA + settlement offer');
var jrDocs = T.draftsForPack(fixturePack({ decideSection: { verdict: 'JUDGMENT REQUIRED' }, meta: { classification: 'JUDGMENT REQUIRED' } }));
ok(jrDocs.length === 1 && jrDocs[0].docKey === 'loa', 'JUDGMENT REQUIRED → holding only');
var holdDocs = T.draftsForPack(fixturePack({ decideSection: { verdict: 'DEFEND_HOLD' } }));
ok(holdDocs.length === 2 && holdDocs[1].docKey === 'lor', 'DEFEND_HOLD → LOA + LOR');

console.log('=== Placeholder integrity (missing fields) ===');
var bare = T.defenceLetter({ factsSection: { jurisdiction: 'UK261' }, decideSection: {}, meta: {} });
ok(bare.content.indexOf('[CLAIMANT NAME]') >= 0 && bare.content.indexOf('[CLAIMANT SOLICITOR]') >= 0, 'placeholders survive empty meta');
ok(bare.content.indexOf('Wallentin-Hermann (C-549/07)') >= 0, 'fallback authority cited when none supplied');
ok(bare.content.indexOf('undefined') < 0 && bare.content.indexOf('null') < 0, 'no undefined/null leakage');

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
