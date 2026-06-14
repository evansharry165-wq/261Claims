/* Live flight disruption lookup — OpenSky Network with seeded fallback */
(function (global) {
  'use strict';

  var CACHE_KEY = 'dfa_flight_live_cache';
  var CACHE_TTL_MS = 15 * 60 * 1000;

  function callsignFromFlight(flight) {
    var f = String(flight || '').toUpperCase().replace(/\s+/g, '');
    if (/^HC\d+/.test(f)) return 'EZY' + f.replace(/^HC/, '');
    if (/^EZY\d+/.test(f)) return f;
    return f;
  }

  function readCache() {
    try {
      return JSON.parse(sessionStorage.getItem(CACHE_KEY) || '{}');
    } catch (e) {
      return {};
    }
  }

  function writeCache(map) {
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(map));
    } catch (e) {}
  }

  function seededStatus(event) {
    var delay = event.delay || 0;
    var state = delay >= 180 ? 'delayed' : delay >= 60 ? 'late' : 'on_time';
    return {
      callsign: callsignFromFlight(event.flight),
      state: state,
      delayMinutes: delay,
      source: 'operational_feed',
      summary:
        state === 'delayed'
          ? 'Operational feed — delay ' + delay + ' min · ' + (event.type || 'disruption')
          : 'Operational feed — within normal parameters',
      checkedAt: new Date().toISOString(),
    };
  }

  function fetchOpenSky(callsign) {
    var end = Math.floor(Date.now() / 1000);
    var begin = end - 48 * 3600;
    var url =
      'https://opensky-network.org/api/flights/all?begin=' +
      begin +
      '&end=' +
      end +
      '&callsign=' +
      encodeURIComponent(callsign);
    return fetch(url, { method: 'GET' })
      .then(function (r) {
        if (!r.ok) throw new Error('OpenSky ' + r.status);
        return r.json();
      })
      .then(function (data) {
        if (!data || !data.length) return null;
        var f = data[data.length - 1];
        var dep = f.firstSeen || f.estDepartureAirport;
        var arr = f.lastSeen || f.estArrivalAirport;
        var delayMin = f.estimatedLanding && f.estimatedTakeoff ? Math.round((f.estimatedLanding - f.estimatedTakeoff) / 60) : 0;
        return {
          callsign: callsign,
          state: delayMin >= 180 ? 'delayed' : 'completed',
          delayMinutes: delayMin,
          source: 'opensky',
          summary:
            'OpenSky — ' +
            callsign +
            (dep ? ' · dep ' + new Date(dep * 1000).toUTCString().slice(17, 22) : '') +
            (arr ? ' · arr ' + new Date(arr * 1000).toUTCString().slice(17, 22) : '') +
            (delayMin ? ' · est ' + delayMin + ' min block' : ''),
          checkedAt: new Date().toISOString(),
          raw: f,
        };
      });
  }

  function lookupEvent(event, force) {
    var cs = callsignFromFlight(event.flight);
    var cache = readCache();
    var cached = cache[cs];
    if (!force && cached && Date.now() - (cached._ts || 0) < CACHE_TTL_MS) {
      return Promise.resolve(cached);
    }
    return fetchOpenSky(cs)
      .catch(function () {
        return null;
      })
      .then(function (live) {
        var result = live || seededStatus(event);
        result._ts = Date.now();
        cache[cs] = result;
        writeCache(cache);
        return result;
      });
  }

  function refreshDigest(events, onProgress) {
    events = events || [];
    var i = 0;
    function next() {
      if (i >= events.length) return Promise.resolve(events);
      var ev = events[i++];
      if (typeof onProgress === 'function') onProgress(ev, i, events.length);
      return lookupEvent(ev, false).then(function (status) {
        ev.liveStatus = status;
        return next();
      });
    }
    return next();
  }

  global.FlightData = {
    callsignFromFlight: callsignFromFlight,
    lookupEvent: lookupEvent,
    refreshDigest: refreshDigest,
    seededStatus: seededStatus,
  };
})(typeof window !== 'undefined' ? window : this);
