/* demo_fixture.js — Phase 3 · Etna cascade demo augment.

   Problem: the query bar's live cross-source search (evidence_query_bar.js)
   calls the REAL EvidenceCollection.get(sourceId), which only ever returns
   whatever the nightly cron most recently pulled. The Etna demo dates
   (31 Jul-3 Aug 2026) are outside any live snapshot's window by the time this
   demo gets shown, so a live-only search returns nothing — a query bar that
   surfaces nothing on demo day undermines the whole point of it.

   Fix, scoped narrowly: patch EvidenceCollection.get() to layer a small, fixed
   set of Etna rows into the raw snapshot .data for the sources that ARE
   genuinely live and onboarded — aviationweather-metar-taf and
   eurocontrol-nm-public — in the exact raw upstream shape their real feeds use,
   so they flow through filterSnapshot()/EvidenceCascadeMatch exactly like real
   data would. This is additive only (existing keys are concatenated, never
   replaced) and does not touch defendable_evidence_reader.js's real fetch/cache
   logic — remove this <script> tag and the augment disappears with no other
   code changes required.

   Deliberately NOT augmenting vaac-london-qva: that source is explicitly
   pending onboarding in this system's own design (see evidence-ash.html —
   access-gated, no live feed exists at all, not even an empty stub). Building
   fake filterSnapshot support for it would misrepresent a known-not-live
   source as live. The Etna case's VAAC citation still exists — as a seeded,
   pre-attached case item (case_filing.js), which is honest because it's
   provenance metadata on an offline attachment, not a claim that the source is
   live-fetchable today.

   Every injected row carries _isDemoFixture:true for inspectability. */
(function (global) {
  'use strict';

  var FIXTURE_RAW = {
    'aviationweather-metar-taf': {
      metar: [
        { icaoId: 'LICC', rawOb: 'LICC 010800Z 09008KT 2000 VA FEW020 SCT100 22/14 Q1015 VA PLUME OBSC SKY', obsTime: '2026-08-01T08:00:00Z', _isDemoFixture: true },
      ],
    },
    'eurocontrol-nm-public': {
      publications: [
        { title: 'ATFM regulation LIRC01A — Catania (LICC) airspace, volcanic ash (Etna eruption), 31 Jul 1800Z-1 Aug 1600Z', fromTime: '2026-07-31T18:00:00Z', toTime: '2026-08-01T16:00:00Z', _isDemoFixture: true },
      ],
    },
  };

  function mergeFixture(sourceId, snap) {
    var fx = FIXTURE_RAW[sourceId];
    if (!fx) return snap;
    var base = snap || { source_id: sourceId, pulled_at: new Date().toISOString(), data: {} };
    var merged = Object.assign({}, base, { data: Object.assign({}, base.data) });
    Object.keys(fx).forEach(function (field) {
      var existing = Array.isArray(merged.data[field]) ? merged.data[field] : [];
      merged.data[field] = existing.concat(fx[field]);
    });
    return merged;
  }

  function install() {
    if (!global.EvidenceCollection || global.EvidenceCollection._demoFixtureInstalled) return;
    var origGet = global.EvidenceCollection.get;
    global.EvidenceCollection.get = function (sourceId) {
      return origGet(sourceId).then(function (snap) {
        return mergeFixture(sourceId, snap);
      });
    };
    global.EvidenceCollection._demoFixtureInstalled = true;
  }

  install();
})(typeof window !== 'undefined' ? window : this);
