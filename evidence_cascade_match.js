/* Evidence Cascade Match — classifies items already returned by
   CaseEvidenceRepository.fetchRelevantSlice/fetchRelevantSliceForFacts into
   confidence tiers (direct / cascade / route / event-supporting) against a
   resolved flight's facts, and produces a reason string.

   This is a pure classifier — it does no fetching or filtering of its own,
   deliberately kept separate from case_evidence_repository.js (fetch/filter/
   attach/persist) since confidence-tiering is a presentation/ranking concern,
   not a storage one.

   "Cascade" (aircraft rego -> prior sector -> downstream flight impact) reads
   facts.rotation[] — entries of {fno, from, to, date} for sectors other than
   the queried flight's own. Real, live rotation data isn't available yet (see
   flight_resolver.js's header) — this works against whatever rotation array
   the facts object carries, seeded or real, without caring which.

   Tier assignment picks the single highest-priority tier that applies
   (direct > cascade > route > event-supporting), same ranking BUILD_SPEC
   originally specified.

   Public API — window.EvidenceCascadeMatch:
     .classify(facts, item) -> {confidence, reason} | null
     .rank(facts, items) -> items[] each annotated with .confidence/.reason,
                            sorted direct > cascade > route > event-supporting
*/
(function (global) {
  'use strict';

  var TIER_RANK = { direct: 0, cascade: 1, route: 2, 'event-supporting': 3 };

  // Only metar/taf/notam items carry a clean airport code today (see
  // case_evidence_repository.js's filterSnapshot — other kinds are already
  // matched via the source's own broader criteria, not a specific station).
  function itemStation(item) {
    return item && item.station ? String(item.station).toUpperCase() : null;
  }

  // Best-effort item date, currently only reliably available for metar/taf.
  function itemDate(item) {
    if (!item || !item.obs) return null;
    var raw = item.obs.obsTime || item.obs.reportTime;
    if (!raw) return null;
    var d = new Date(raw);
    return isNaN(d.getTime()) ? null : d;
  }

  function daysBetween(a, b) {
    return Math.abs(a.getTime() - b.getTime()) / 86400000;
  }

  function legMatches(leg, code) {
    var fields = [leg.fromIcao, leg.toIcao, leg.from, leg.to];
    return fields.some(function (f) { return f && f.toUpperCase() === code; });
  }

  function rotationMatch(facts, station) {
    if (!facts.rotation || !station) return null;
    return facts.rotation.find(function (r) { return legMatches(r, station); }) || null;
  }

  function classify(facts, item) {
    if (!facts || !item) return null;
    var station = itemStation(item);
    var ownAirports = [facts.originIcao, facts.destIcao, facts.originIata, facts.destIata]
      .filter(Boolean).map(function (a) { return a.toUpperCase(); });

    if (station && ownAirports.indexOf(station) >= 0) {
      var d = itemDate(item);
      var flightDate = facts.date ? new Date(facts.date) : null;
      if (d && flightDate && daysBetween(d, flightDate) > 1) {
        return {
          confidence: 'route',
          reason: 'Route match: ' + (item._kind || 'item') + ' at ' + station +
            ', ' + Math.round(daysBetween(d, flightDate)) + ' day(s) from this flight\'s date.'
        };
      }
      return {
        confidence: 'direct',
        reason: 'Direct match: ' + (item._kind || 'item') + ' at ' + station + ' — this flight\'s own sector.'
      };
    }

    if (station) {
      var rot = rotationMatch(facts, station);
      if (rot) {
        return {
          confidence: 'cascade',
          reason: 'Cascade match: aircraft ' + (facts.reg || 'unknown') + ' — ' + (item._kind || 'item') +
            ' at ' + station + ' relates to a prior sector (' + rot.fno + ', ' + rot.date + '), same aircraft. ' +
            'Next scheduled sector affected: this flight.'
        };
      }
    }

    return {
      confidence: 'event-supporting',
      reason: 'Event context: ' + (item._kind || 'item') + ' matched via source-level relevance criteria (date/keyword window), not a direct airport match on this flight or its rotation.'
    };
  }

  function rank(facts, items) {
    var out = (items || []).map(function (item) {
      var hit = classify(facts, item);
      if (!hit) return null;
      var copy = Object.assign({}, item);
      copy.confidence = hit.confidence;
      copy.reason = hit.reason;
      return copy;
    }).filter(Boolean);
    out.sort(function (a, b) { return TIER_RANK[a.confidence] - TIER_RANK[b.confidence]; });
    return out;
  }

  global.EvidenceCascadeMatch = {
    classify: classify,
    rank: rank
  };
})(typeof window !== 'undefined' ? window : this);
