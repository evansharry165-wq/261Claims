/* DIO · territory — TERRITORY_MAP + geographical helpers + airport-scope lookups.
   Session 1 of Option B: split of the original 669-line dio_helpers.js.
   Depends on: DIOCore (uses getDIOProfile-style facts via getActiveUser), CaseFiling. */
(function (global) {
  'use strict';

  var TERRITORY_MAP = {
    EH: {
      label: 'United Kingdom + Ireland',
      short_label: 'UK + IE',
      airports_icao: ['EGLL','EGKK','EGSS','EGGW','EGLC','EGCC','EGPH','EGPF','EGGD','EGBB','EGAA','EGNX','EIDW'],
      airports_iata: ['LHR','LGW','STN','LTN','LCY','MAN','EDI','GLA','BRS','BHX','BFS','EMA','DUB'],
      countries_iso: ['GB','IE'],
      countries_name: ['United Kingdom','Ireland'],
      firs: ['EGTT','EGPX','EISN'],
      keywords: ['UK','British','England','Wales','Scotland','Northern Ireland','Ireland','Britain','easyJet','British Airways','Jet2','Ryanair UK','Wizz Air UK'],
    },
    FD: {
      label: 'France',
      short_label: 'FR',
      airports_icao: ['LFPG','LFPO','LFMN','LFML','LFLL','LFBO','LFBD'],
      airports_iata: ['CDG','ORY','NCE','MRS','LYS','TLS','BOD'],
      countries_iso: ['FR'],
      countries_name: ['France'],
      firs: ['LFFF','LFMM','LFBB','LFRR','LFEE'],
      keywords: ['France','French','DGAC','Air France','Transavia France'],
    },
    SR: {
      label: 'España',
      short_label: 'ES',
      airports_icao: ['LEMD','LEBL','LEPA','LEAL','LEIB','LEMG','GCLP','GCTS','LPPT','LPPR'],
      airports_iata: ['MAD','BCN','PMI','ALC','IBZ','AGP','LPA','TFS','LIS','OPO'],
      countries_iso: ['ES','PT'],
      countries_name: ['Spain','Portugal'],
      firs: ['LECM','LECB','LECS','GCCC','LPPC'],
      keywords: ['Spain','España','Portugal','Portuguese','Vueling','Iberia','TAP','ENAIRE','AENA'],
    },
  };

  function getTerritory(uid) {
    uid = uid || (typeof getActiveUser === 'function' ? getActiveUser() : 'EH');
    return TERRITORY_MAP[uid] || TERRITORY_MAP.EH;
  }

  function matchIncidentToTerritory(item, territory) {
    if (!item || !territory) return false;
    var hay = ((item.title || '') + ' ' +
               (item.description || '') + ' ' +
               (item.name || '') + ' ' +
               (item.country || '') + ' ' +
               (item.iso3 || '')).toUpperCase();
    if (!hay.trim()) return false;
    var airportHit = territory.airports_icao.some(function (a) { return hay.indexOf(a) >= 0; }) ||
                     territory.airports_iata.some(function (a) { return hay.indexOf(' '+a+' ') >= 0 || hay.indexOf(a+',') >= 0 || hay.indexOf(a+')') >= 0; });
    if (airportHit) return true;
    var countryHit = territory.countries_iso.some(function (c) { return hay.indexOf(c) >= 0; }) ||
                     territory.countries_name.some(function (c) { return hay.indexOf(c.toUpperCase()) >= 0; });
    if (countryHit) return true;
    return (territory.keywords || []).some(function (k) { return hay.indexOf(k.toUpperCase()) >= 0; });
  }

  /* All-active case reader used by territorial + portfolio helpers */
  function _allActiveCases() {
    var seen = {};
    var out = [];
    function push(c) {
      if (!c || c.stage === 'resolve' || seen[c.ref]) return;
      seen[c.ref] = true;
      out.push(c);
    }
    if (typeof CaseFiling !== 'undefined' && CaseFiling.listCases) {
      CaseFiling.listCases({}).forEach(push);
    }
    (typeof ALL_CASES !== 'undefined' ? ALL_CASES : []).forEach(push);
    return out;
  }

  function casesInTerritory(uid) {
    var territory = getTerritory(uid);
    var iatas = territory.airports_iata.map(function (x) { return x.toUpperCase(); });
    return _allActiveCases().filter(function (c) {
      var dep = (c.dep || '').toUpperCase();
      var arr = (c.arr || '').toUpperCase();
      return iatas.indexOf(dep) >= 0 || iatas.indexOf(arr) >= 0;
    });
  }

  function casesByAirport(iata_or_icao, territory) {
    territory = territory || getTerritory();
    var iatas = territory.airports_iata;
    var icaos = territory.airports_icao;
    var target = String(iata_or_icao || '').toUpperCase();
    var idx = icaos.indexOf(target);
    var iataMatch = idx >= 0 ? iatas[idx] : target;
    return _allActiveCases().filter(function (c) {
      var dep = (c.dep || '').toUpperCase();
      var arr = (c.arr || '').toUpperCase();
      return dep === iataMatch || arr === iataMatch;
    });
  }

  function caseCountByAirport(territory) {
    var counts = {};
    territory.airports_icao.forEach(function (a) { counts[a] = 0; });
    var seen = {};
    function tally(c) {
      if (!c || c.stage === 'resolve' || seen[c.ref]) return;
      seen[c.ref] = true;
      var dep = (c.dep || '').toUpperCase();
      var arr = (c.arr || '').toUpperCase();
      territory.airports_iata.forEach(function (iata, i) {
        if (dep === iata || arr === iata) {
          counts[territory.airports_icao[i]] = (counts[territory.airports_icao[i]] || 0) + 1;
        }
      });
    }
    if (typeof CaseFiling !== 'undefined' && CaseFiling.listCases) {
      CaseFiling.listCases({}).forEach(tally);
    }
    (typeof ALL_CASES !== 'undefined' ? ALL_CASES : []).forEach(tally);
    return counts;
  }

  function staleAttachDays(caseRef) {
    if (typeof CaseFiling === 'undefined' || !CaseFiling.getCase) return null;
    var c = CaseFiling.getCase(caseRef);
    if (!c || !c.meta) return null;
    var repo = c.meta.evidenceRepository;
    if (!repo || !repo.items || !repo.items.length) return null;
    var latest = repo.items.reduce(function (acc, it) {
      var t = Date.parse(it.attachedAt || 0) || 0;
      return t > acc ? t : acc;
    }, 0);
    if (!latest) return null;
    return Math.floor((Date.now() - latest) / 86400000);
  }

  function jurisdictionCases(jur) {
    return (typeof ALL_CASES !== 'undefined' ? ALL_CASES : []).filter(function (c) {
      return c.jurisdiction === jur && c.stage !== 'resolve';
    });
  }

  global.DIOTerritory = {
    TERRITORY_MAP: TERRITORY_MAP,
    getTerritory: getTerritory,
    matchIncidentToTerritory: matchIncidentToTerritory,
    casesInTerritory: casesInTerritory,
    casesByAirport: casesByAirport,
    caseCountByAirport: caseCountByAirport,
    staleAttachDays: staleAttachDays,
    jurisdictionCases: jurisdictionCases,
    _allActiveCases: _allActiveCases,
  };
})(typeof window !== 'undefined' ? window : this);
