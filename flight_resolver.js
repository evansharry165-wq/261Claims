/* Flight Query Resolver — resolves an arbitrary flight number + date into the
   same facts shape CaseEvidenceRepository.getCaseFacts(caseRef) returns, for
   flights that don't have a case yet (the front-door query-bar search).

   Known gap, not papered over: no live flight-schedule data source exists in
   this system. EvidenceCollection has no "look up flight EZY7823 on
   2026-08-01, return its airports/aircraft reg" source — opensky-flight-tracks
   gives ADS-B tracks for an aircraft already known to be airborne, not a
   number+date schedule lookup, and is itself marked PLANNED not LIVE in
   case_evidence_repository_ui.js's source catalogue. This resolver is seeded,
   the same pattern case_filing.js already uses for demo cases, pending a real
   schedule-lookup integration.

   Public API — window.FlightQueryResolver:
     .resolve(flightNumber, date) -> facts object (getCaseFacts shape) | null
     .SEED_FLIGHTS -> the seed table, for inspection/extension
*/
(function (global) {
  'use strict';

  /* Etna eruption scenario, reshaped from the discarded etna_fixture.json into
     the real facts/rotation shape. G-EZAB's rotation: LGW-CTA (31 Jul) →
     grounded at CTA by the ash closure → EZY7823 CTA-LGW cancelled (1 Aug) →
     ferried CTA-GVA once airspace reopened (3 Aug) → EZY4412 GVA-LGW is the
     cascade flight, one sector removed from the root cause. */
  // Rotation legs carry both IATA and ICAO for each airport — evidence items
  // from real sources are keyed by ICAO (METAR/TAF/NOTAM always are), so
  // evidence_cascade_match.js needs ICAO on the rotation legs too, not just
  // the flight's own origin/dest.
  var SEED_FLIGHTS = [
    {
      number: 'EZY7823', date: '2026-08-01',
      originIata: 'CTA', destIata: 'LGW', originIcao: 'LICC', destIcao: 'EGKK',
      reg: 'G-EZAB', carrier: 'EZY',
      rotation: [
        { fno: 'EZY7822', from: 'LGW', to: 'CTA', fromIcao: 'EGKK', toIcao: 'LICC', date: '2026-07-31' },
        { fno: 'EZY7823', from: 'CTA', to: 'LGW', fromIcao: 'LICC', toIcao: 'EGKK', date: '2026-08-01' }
      ]
    },
    {
      number: 'EZY4412', date: '2026-08-03',
      originIata: 'GVA', destIata: 'LGW', originIcao: 'LSGG', destIcao: 'EGKK',
      reg: 'G-EZAB', carrier: 'EZY',
      rotation: [
        { fno: 'EZY7822', from: 'LGW', to: 'CTA', fromIcao: 'EGKK', toIcao: 'LICC', date: '2026-07-31' },
        { fno: 'EZY7823', from: 'CTA', to: 'LGW', fromIcao: 'LICC', toIcao: 'EGKK', date: '2026-08-01' },
        { fno: 'EZY-FERRY', from: 'CTA', to: 'GVA', fromIcao: 'LICC', toIcao: 'LSGG', date: '2026-08-03' },
        { fno: 'EZY4412', from: 'GVA', to: 'LGW', fromIcao: 'LSGG', toIcao: 'EGKK', date: '2026-08-03' }
      ]
    }
  ];

  function norm(s) { return (s || '').replace(/\s+/g, '').toUpperCase(); }

  function resolve(flightNumber, date) {
    var num = norm(flightNumber);
    var match = SEED_FLIGHTS.find(function (f) {
      return norm(f.number) === num && f.date === date;
    });
    if (!match) return null;
    return {
      ref: null,
      originIata: match.originIata,
      destIata: match.destIata,
      originIcao: match.originIcao,
      destIcao: match.destIcao,
      date: match.date,
      flightNum: match.number,
      reg: match.reg,
      carrier: match.carrier,
      rotation: match.rotation || [],
      _packet: null
    };
  }

  global.FlightQueryResolver = {
    resolve: resolve,
    SEED_FLIGHTS: SEED_FLIGHTS
  };
})(typeof window !== 'undefined' ? window : this);
