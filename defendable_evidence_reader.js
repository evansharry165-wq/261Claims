/**
 * DefendAble — evidence-collection reader.
 *
 * Client-side module that reads nightly-refreshed snapshots from the
 * evidence-collection repo via raw.githubusercontent.com. Read-only —
 * the app never writes back to that repo.
 *
 * Repo:  https://github.com/evansharry165-wq/evidence-collection
 * Base:  https://raw.githubusercontent.com/evansharry165-wq/evidence-collection/main/data/latest/
 *
 * Public API (all attached to window.EvidenceCollection):
 *   .SOURCES              — array of {id, category, provider, evidenceRows[]}
 *   .SOURCE_MAP           — map source-id → evidence-row ids it can populate
 *   .get(sourceId)        — async → {source_id, pulled_at, rows, data, provenance} or null on failure
 *   .status()             — async → array of {source_id, status, pulled_at, rows, live_url}
 *   .sourcesForEvidence(evidenceRowId)  — array of source-ids that can populate that evidence row
 *
 * Caching:
 *   Snapshots are cached in sessionStorage for 6 hours per source. Reload the
 *   page or open a new tab to force-refresh. Manifest status is cached for 1 hour.
 */
(function (global) {
  'use strict';

  var BASE = 'https://raw.githubusercontent.com/evansharry165-wq/evidence-collection/main/data/latest/';
  var MANIFEST_URL = 'https://raw.githubusercontent.com/evansharry165-wq/evidence-collection/main/data/manifest_log.csv';
  var SNAPSHOT_TTL_MS = 6 * 60 * 60 * 1000;
  var STATUS_TTL_MS = 60 * 60 * 1000;

  /* Mapping: which evidence rows in the engine can each source feed?
     Evidence row IDs come from defendable_analyser_v3.html EVIDENCE registry.
     Extend this map as we add more sources or refine the engine's evidence catalogue. */
  var SOURCES = [
    { id: 'aviationweather-metar-taf',  category: 'Weather',           provider: 'NOAA AviationWeather.gov', evidenceRows: ['metar', 'taf', 'ogimet', 'met-office-dihf'] },
    { id: 'opensky-flight-tracks',      category: 'Flight tracks',     provider: 'OpenSky Network',          evidenceRows: ['flight-track', 'diversion-track', 'tops-track'] },
    { id: 'nasa-firms-wildfires',       category: 'Natural disaster',  provider: 'NASA FIRMS',               evidenceRows: ['wildfire-proximity', 'natural-disaster'] },
    { id: 'copernicus-effis',           category: 'Natural disaster',  provider: 'Copernicus EFFIS',         evidenceRows: ['wildfire-proximity', 'natural-disaster', 'ems-activation'] },
    { id: 'dgac-france-notices',        category: 'Industrial action', provider: 'DGAC France',              evidenceRows: ['third-party-ia-notice', 'atc-strike-notice'] },
    { id: 'enac-italy-notices',         category: 'Industrial action', provider: 'ENAC Italy',               evidenceRows: ['third-party-ia-notice', 'atc-strike-notice'] },
    { id: 'eurocontrol-nm-public',      category: 'ATFM',              provider: 'Eurocontrol NM',           evidenceRows: ['eurocontrol', 'atfm-regulation', 'ops-log'] },
    { id: 'vaac-london-qva',            category: 'Volcanic ash',      provider: 'Met Office VAAC London',   evidenceRows: ['volcanic-ash', 'vaac-advisory'] },
  ];

  var SOURCE_MAP = {};
  SOURCES.forEach(function (s) { SOURCE_MAP[s.id] = s; });

  function evidenceRowToSources(rowId) {
    return SOURCES.filter(function (s) { return s.evidenceRows.indexOf(rowId) >= 0; }).map(function (s) { return s.id; });
  }

  function cacheKey(sourceId) { return 'ec.snap.' + sourceId; }
  function statusCacheKey() { return 'ec.status.v1'; }

  function readCache(key, ttl) {
    try {
      var raw = sessionStorage.getItem(key);
      if (!raw) return null;
      var wrap = JSON.parse(raw);
      if (Date.now() - wrap.t > ttl) return null;
      return wrap.v;
    } catch (e) { return null; }
  }

  function writeCache(key, value) {
    try { sessionStorage.setItem(key, JSON.stringify({ t: Date.now(), v: value })); } catch (e) {}
  }

  function fetchJson(url) {
    return fetch(url, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  }

  function fetchText(url) {
    return fetch(url, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.text();
    });
  }

  function get(sourceId) {
    if (!SOURCE_MAP[sourceId]) return Promise.resolve(null);
    var cached = readCache(cacheKey(sourceId), SNAPSHOT_TTL_MS);
    if (cached) return Promise.resolve(cached);
    return fetchJson(BASE + sourceId + '.json').then(function (payload) {
      writeCache(cacheKey(sourceId), payload);
      return payload;
    }).catch(function () { return null; });
  }

  function status() {
    var cached = readCache(statusCacheKey(), STATUS_TTL_MS);
    if (cached) return Promise.resolve(cached);
    return fetchText(MANIFEST_URL).then(function (csv) {
      // Take latest row per source_id from the append-only log
      var lines = csv.trim().split('\n');
      if (lines.length < 2) return [];
      var latest = {};
      for (var i = 1; i < lines.length; i++) {
        var cells = lines[i].split(',');
        if (cells.length < 4) continue;
        var runUtc = cells[0], sid = cells[1], st = cells[2], rows = +cells[3] || 0;
        latest[sid] = { source_id: sid, status: st, pulled_at: runUtc, rows: rows, live_url: BASE + sid + '.json' };
      }
      var arr = Object.keys(latest).map(function (k) { return latest[k]; });
      writeCache(statusCacheKey(), arr);
      return arr;
    }).catch(function () { return []; });
  }

  global.EvidenceCollection = {
    SOURCES: SOURCES,
    SOURCE_MAP: SOURCE_MAP,
    BASE_URL: BASE,
    get: get,
    status: status,
    sourcesForEvidence: evidenceRowToSources,
  };
})(typeof window !== 'undefined' ? window : this);
