/**
 * Evidence document extraction — reads uploaded / repository files and
 * populates disruption fields, per-item snippets, and points-of-claim notes.
 * Uses case-specific operational profiles for demo variety; parses text files when available.
 */
(function (global) {
  'use strict';

  var PROFILES = {
    'HC 1184': {
      ref: 'AC-2026-0089',
      flightNum: 'HC 1184',
      dep: 'LTN',
      arr: 'BCN',
      diverted: 'VLC',
      disruptionType: 'Weather',
      acReg: 'G-EZAB',
      crewBase: 'LTN',
      std: '06:45Z',
      sta: '09:55Z',
      atd: '07:12Z',
      ata: '11:48Z',
      maxFDP: '12:30',
      plannedFDP: '08:45',
      sectors: '2',
      primaryCause: 'Thunderstorm activity BCN TMA — METAR 09051G28KT 3000 TSRA',
      secondaryCause: 'Diversion to Valencia (VLC) — crew FDP within limits post-diversion',
      summary: 'HC 1184 LTN-BCN departed 27 mins late due pre-departure weather hold. En-route SIGMET WS001 active over Catalonia. Diverted VLC 11:22Z; passengers disembarked 11:48Z. Delay at arrival 3h 53m.',
      acPlan: 'Planned: HC1184 LTN-BCN 06:45Z. Actual: LTN-VLC diversion, arr 11:48Z.',
      delayCode: '71 — Weather',
      metar: 'BCN 140930Z 09051G28KT 3000 TSRA FEW010CB SCT015 BKN025 18/16 Q1012',
      sigmet: 'WS001 Catalonia TS embedded CB 140800/141400 FL100/450',
      eurocontrol: 'No ATFM slot restriction on file for HC1184 sector LTN-BCN',
      dpmNote: 'ICC notified 07:05Z. Passenger care at VLC — hotel vouchers issued for 47 pax overnight.',
    },
    'HC 307': {
      ref: 'AC-2026-0091',
      flightNum: 'HC 307',
      dep: 'MAN',
      arr: 'AMS',
      disruptionType: 'ATC Restrictions',
      acReg: 'G-EZCD',
      crewBase: 'MAN',
      std: '08:15Z',
      sta: '10:45Z',
      atd: '11:53Z',
      ata: '14:21Z',
      maxFDP: '13:00',
      plannedFDP: '09:30',
      sectors: '2',
      primaryCause: 'ATFM slot restriction AMS — regulation ID A1234/26',
      secondaryCause: 'Network congestion MAN departures 08:00–12:00 UTC',
      summary: 'HC 307 MAN-AMS ATD 11:53Z (3h 38m late). Eurocontrol regulation A1234/26 active 08:00–14:00Z. Arrival delay 3h 36m — extraordinary circumstances per Eurocontrol oplog.',
      acPlan: 'Planned: HC307 MAN-AMS 08:15Z. Actual: dep 11:53Z, arr 14:21Z.',
      delayCode: '89 — ATC / ATFM',
      metar: 'AMS 090930Z 25012KT 9999 FEW030 14/08 Q1020',
      sigmet: 'Nil significant weather SIGMET active AMS FIR',
      eurocontrol: 'Regulation A1234/26 — AMS arrival rate reduced 28/hr. Slot CTOT 11:47Z assigned HC307.',
      dpmNote: 'Refreshments offered at MAN gate 09:30–11:00. No hotel required — same-day departure.',
    },
    'HC 330': {
      ref: 'AC-2026-0076',
      flightNum: 'HC 330',
      dep: 'LGW',
      arr: 'ALC',
      disruptionType: 'Weather',
      acReg: 'G-EZEF',
      crewBase: 'LGW',
      std: '07:30Z',
      sta: '10:40Z',
      atd: '08:05Z',
      ata: '12:50Z',
      maxFDP: '12:30',
      plannedFDP: '08:15',
      sectors: '2',
      primaryCause: 'Low visibility ALC — METAR 28002KT 0800 FG BKN002',
      secondaryCause: 'Holding pattern LEPA 10:15–10:55Z before approach',
      summary: 'HC 330 LGW-ALC delayed departure 35 mins (ATC flow). Arrival ALC delayed 4h 10m due fog / LVP procedures. METAR/SIGMET confirm extraordinary circumstances.',
      acPlan: 'Planned: HC330 LGW-ALC 07:30Z. Actual: dep 08:05Z, arr 12:50Z.',
      delayCode: '71 — Weather',
      metar: 'ALC 280930Z 28002KT 0800 FG BKN002 12/11 Q1018',
      sigmet: 'WS002 Balearics fog LVP 280600/281200',
      eurocontrol: 'No ATFM restriction — delay attributable to destination weather',
      dpmNote: 'Passenger care: refreshments LGW; coach transfer ALC for 12 pax missing connections.',
    },
    'HC 556': {
      ref: 'AC-2026-0079',
      flightNum: 'HC 556',
      dep: 'LHR',
      arr: 'DUB',
      disruptionType: 'ATC Restrictions',
      acReg: 'G-EZGH',
      crewBase: 'LGW',
      std: '14:20Z',
      sta: '15:35Z',
      atd: '15:08Z',
      ata: '16:53Z',
      maxFDP: '11:30',
      plannedFDP: '07:45',
      sectors: '4',
      primaryCause: 'ATFM en-route restriction LHR departures — regulation B0891/26',
      secondaryCause: 'Crew rotation knock-on from earlier sector delay',
      summary: 'HC 556 LHR-DUB dep 15:08Z (48m late). Eurocontrol B0891/26. Arrival delay 3h 15m.',
      acPlan: 'Planned: HC556 LHR-DUB 14:20Z. Actual: dep 15:08Z, arr 16:53Z.',
      delayCode: '89 — ATC / ATFM',
      eurocontrol: 'Regulation B0891/26 LHR outbound rate 32/hr. CTOT 15:02Z.',
      dpmNote: 'Standard ATC delay — no passenger care issues reported.',
    },
    'HC 442': {
      ref: 'AC-2026-0094',
      flightNum: 'HC 442',
      dep: 'LGW',
      arr: 'BCN',
      disruptionType: 'ATC Restrictions',
      acReg: 'G-EZIJ',
      crewBase: 'LGW',
      std: '09:00Z',
      sta: '12:15Z',
      atd: '10:22Z',
      ata: '13:08Z',
      maxFDP: '13:00',
      plannedFDP: '09:00',
      sectors: '2',
      primaryCause: 'ATFM slot LGW — network delay post weather recovery',
      secondaryCause: 'Aircraft swap G-EZIJ for G-EZKL (tech log item deferred)',
      summary: 'HC 442 LGW-BCN ATD 10:22Z. Eurocontrol data pending full pull.',
      acPlan: 'Planned: HC442 LGW-BCN 09:00Z. Actual: dep 10:22Z.',
      delayCode: '89 — ATC / ATFM',
      eurocontrol: 'Eurocontrol data requested — preliminary slot delay 82 mins.',
      dpmNote: 'Aircraft change communicated to passengers 08:45Z.',
    },
    'HC 612': {
      ref: 'ES-2026-0031',
      flightNum: 'HC 612',
      dep: 'BCN',
      arr: 'LGW',
      disruptionType: 'ATC Restrictions',
      acReg: 'G-EZKL',
      crewBase: 'BCN',
      std: '11:10Z',
      sta: '12:25Z',
      atd: '12:48Z',
      ata: '14:02Z',
      maxFDP: '12:00',
      plannedFDP: '08:30',
      sectors: '2',
      primaryCause: 'ATFM restriction BCN departures — Eurocontrol C0456/26',
      secondaryCause: 'Ground delay programme BCN 11:00–14:00Z',
      summary: 'HC 612 BCN-LGW delay 3h 52m. Eurocontrol C0456/26 extraordinary circumstances.',
      acPlan: 'Planned: HC612 BCN-LGW 11:10Z. Actual: dep 12:48Z, arr 14:02Z.',
      delayCode: '89 — ATC / ATFM',
      eurocontrol: 'Regulation C0456/26 BCN departure rate 22/hr.',
      dpmNote: 'Comida no proporcionada en BCN — registros pendientes.',
    },
  };

  var LIB_SNIPPETS = {
    tops: function (p) {
      return 'Flight ' + p.flightNum + ' ' + p.dep + '-' + p.arr + '. STD ' + p.std + ', ATD ' + p.atd + ', ATA ' + p.ata + '. Delay code: ' + (p.delayCode || '—') + '. Reg ' + p.acReg + '.';
    },
    disco: function (p) {
      return (p.summary || p.primaryCause) + ' Primary: ' + p.primaryCause + '.';
    },
    aims: function (p) {
      return 'Crew base ' + p.crewBase + '. Max FDP ' + p.maxFDP + ', planned ' + p.plannedFDP + ', sectors ' + p.sectors + '. ' + (p.secondaryCause || '');
    },
    safetynet: function (p) {
      return 'No safety event filed for ' + p.flightNum + '. Ops normal post-disruption.';
    },
    eurocontrol: function (p) {
      return p.eurocontrol || 'Eurocontrol data — no regulation on file.';
    },
    ogimet: function (p) {
      return 'METAR: ' + (p.metar || 'Pending') + (p.sigmet ? ' | SIGMET: ' + p.sigmet : '');
    },
    met_office: function (p) {
      return 'Hazard forecast confirms ' + (p.disruptionType === 'Weather' ? 'weather disruption consistent with METAR/SIGMET.' : 'no significant en-route hazard.');
    },
    notam: function (p) {
      return p.diverted
        ? 'NOTAM active ' + p.arr + ' and ' + p.diverted + ' during ops period.'
        : 'NOTAM review ' + p.dep + '/' + p.arr + ' — no airport closure.';
    },
    dpm: function (p) {
      return p.dpmNote || 'DPM notes — operational context recorded.';
    },
    internal_email: function (p) {
      return 'ICC alert ' + p.flightNum + ': ' + p.primaryCause;
    },
    flightradar: function (p) {
      return 'Track confirms ' + p.acPlan;
    },
    max_ops: function (p) {
      return 'Passenger comms sent — delay reason: ' + p.primaryCause.split('—')[0].trim();
    },
    ops_review: function (p) {
      return 'Ops review: defend position supported on ' + p.disruptionType.toLowerCase() + ' evidence.';
    },
    montreal_conv: function (p) {
      return 'Consequential loss documentation — verify causation chain independent of EC261 delay.';
    },
  };

  var FIELD_MAP = {
    tops: ['flightNum', 'dep', 'arr', 'std', 'sta', 'atd', 'ata', 'acReg', 'acPlan'],
    disco: ['primaryCause', 'secondaryCause', 'summary'],
    aims: ['crewBase', 'maxFDP', 'plannedFDP', 'sectors', 'reportTime'],
    eurocontrol: ['primaryCause'],
    ogimet: ['primaryCause'],
    met_office: ['secondaryCause'],
    safetynet: [],
    notam: [],
    dpm: ['summary'],
    internal_email: ['summary'],
    flightradar: ['acPlan'],
    max_ops: [],
    ops_review: ['summary'],
  };

  var POINT_HINTS = {
    tops: { match: /delay|art 7|retard|retraso/i, doc: function (p) { return 'Operational delay records confirmed — ATD ' + p.atd + ', ATA ' + p.ata; } },
    disco: { match: /extraordinary|circonstances|circunstancias|weather|atc|atfm/i, doc: function (p) { return p.primaryCause; } },
    eurocontrol: { match: /extraordinary|atc|atfm/i, doc: function (p) { return p.eurocontrol || 'Eurocontrol data on file'; } },
    ogimet: { match: /extraordinary|weather|météo|meteorolog/i, doc: function (p) { return 'METAR/SIGMET: ' + (p.metar || 'on file'); } },
    met_office: { match: /weather|météo|meteorolog/i, doc: function (p) { return 'Met Office hazard forecast supports weather defence'; } },
    dpm: { match: /art 9|duty of care|refreshment|hotel|care/i, doc: function (p) { return p.dpmNote || 'DPM passenger care notes on file'; } },
    max_ops: { match: /art 9|refreshment|care|expense/i, doc: function (p) { return 'MAX OPS passenger comms log on file'; } },
  };

  function normalizeFlight(fn) {
    if (!fn) return '';
    var m = String(fn).match(/([A-Z]{2})\s*(\d{3,4})/i);
    return m ? (m[1].toUpperCase() + ' ' + m[2]) : String(fn).trim();
  }

  function getProfile(caseCtx) {
    caseCtx = caseCtx || {};
    var fn = normalizeFlight(caseCtx.flightNum || caseCtx.flight || '');
    if (PROFILES[fn]) return Object.assign({}, PROFILES[fn]);

    var ref = caseCtx.ref || '';
    for (var k in PROFILES) {
      if (PROFILES[k].ref === ref) return Object.assign({}, PROFILES[k]);
    }

    var dt = caseCtx.disruptionType || 'ATC Restrictions';
    var dep = caseCtx.dep || 'LTN';
    var arr = caseCtx.arr || 'AMS';
    var isWeather = /weather|météo|meteorolog/i.test(dt);
    return {
      ref: ref,
      flightNum: fn || 'HC 000',
      dep: dep,
      arr: arr,
      disruptionType: dt,
      acReg: 'G-EZ' + String((ref || 'X').charCodeAt(ref.length - 1) % 26 + 65),
      crewBase: dep,
      std: '08:00Z',
      sta: '11:00Z',
      atd: isWeather ? '08:35Z' : '10:15Z',
      ata: isWeather ? '12:20Z' : '13:45Z',
      maxFDP: '13:00',
      plannedFDP: '09:15',
      sectors: '2',
      primaryCause: isWeather
        ? 'Weather — METAR/SIGMET ' + arr + ' below minima'
        : 'ATFM slot restriction ' + arr + ' — regulation pending',
      secondaryCause: isWeather ? 'Holding / approach delays' : 'Network congestion',
      summary: fn + ' ' + dep + '-' + arr + ' — ' + dt + ' disruption. Extracted from uploaded document.',
      acPlan: 'Planned: ' + fn + ' ' + dep + '-' + arr + '. Actual times from document.',
      delayCode: isWeather ? '71 — Weather' : '89 — ATC / ATFM',
      metar: arr + ' — METAR extracted from document',
      eurocontrol: isWeather ? 'No ATFM restriction' : 'Eurocontrol regulation — extracted from document',
      dpmNote: 'Operational notes extracted from uploaded file.',
    };
  }

  function parseFilenameMeta(filename) {
    var n = String(filename || '');
    var out = { flight: '', dep: '', arr: '' };
    var fm = n.match(/([A-Z]{2})\s?(\d{3,4})/i);
    if (fm) out.flight = fm[1].toUpperCase() + ' ' + fm[2];
    var rm = n.match(/([A-Z]{3})[_\-\s]+([A-Z]{3})/i);
    if (rm) {
      out.dep = rm[1].toUpperCase();
      out.arr = rm[2].toUpperCase();
    }
    return out;
  }

  function inferLibKeyFromFilename(filename, fallbackKey) {
    var u = String(filename || '').toUpperCase();
    if (u.indexOf('EUROCONTROL') >= 0 || u.indexOf('ATFM') >= 0) return 'eurocontrol';
    if (u.indexOf('CREW') >= 0 || u.indexOf('FDP') >= 0 || u.indexOf('AIMS') >= 0) return 'aims';
    if (u.indexOf('DISRUPTION') >= 0 || u.indexOf('DISCO') >= 0) return 'disco';
    if (u.indexOf('METAR') >= 0 || u.indexOf('SIGMET') >= 0 || u.indexOf('OGIMET') >= 0) return 'ogimet';
    if (u.indexOf('MET OFFICE') >= 0 || u.indexOf('METOFFICE') >= 0) return 'met_office';
    if (u.indexOf('NOTAM') >= 0) return 'notam';
    if (u.indexOf('DPM') >= 0 || u.indexOf('OPSREVIEW') >= 0) return 'dpm';
    if (u.indexOf('SAFETY') >= 0) return 'safetynet';
    if (u.indexOf('FLIGHTRADAR') >= 0 || u.indexOf('FR24') >= 0) return 'flightradar';
    if (u.indexOf('MAXOPS') >= 0 || u.indexOf('MAX_OPS') >= 0) return 'max_ops';
    if (u.indexOf('EMAIL') >= 0 || u.indexOf('ICC') >= 0 || u.indexOf('.MSG') >= 0) return 'internal_email';
    if (u.indexOf('OPERATIONAL DELAY') >= 0 || u.indexOf('TOPS') >= 0 || u.indexOf('FLIGHTDETAIL') >= 0) return 'tops';
    return fallbackKey || 'tops';
  }

  function buildSnippet(libKey, profile) {
    var fn = LIB_SNIPPETS[libKey];
    return fn ? fn(profile) : 'Data extracted from document for ' + profile.flightNum + '.';
  }

  function buildFields(libKey, profile) {
    var keys = FIELD_MAP[libKey] || [];
    var fields = {};
    keys.forEach(function (k) {
      if (profile[k]) fields[k] = profile[k];
    });
    return fields;
  }

  function extractFromDocument(caseCtx, libKey, filename, textContent) {
    libKey = libKey || inferLibKeyFromFilename(filename, 'tops');
    var profile = getProfile(caseCtx);
    var meta = parseFilenameMeta(filename);
    if (meta.flight) profile.flightNum = normalizeFlight(meta.flight);
    if (meta.dep) profile.dep = meta.dep;
    if (meta.arr) profile.arr = meta.arr;

    if (textContent && textContent.length > 20) {
      var delayM = textContent.match(/(?:delay|ATD|departed)\s*[:\s]*(\d{1,2}:\d{2}Z?)/i);
      if (delayM) profile.atd = delayM[1].indexOf('Z') >= 0 ? delayM[1] : delayM[1] + 'Z';
      var regM = textContent.match(/G-[A-Z]{4}/i);
      if (regM) profile.acReg = regM[0].toUpperCase();
      var causeM = textContent.match(/(?:cause|reason)[:\s]+(.{10,120})/i);
      if (causeM) profile.primaryCause = causeM[1].trim();
    }

    return {
      libKey: libKey,
      filename: filename || '',
      snippet: buildSnippet(libKey, profile),
      fields: buildFields(libKey, profile),
      profile: profile,
      extractedAt: new Date().toISOString(),
      source: textContent ? 'document+profile' : 'profile',
    };
  }

  function mergeIntoDisruption(D, fields, onlyEmpty) {
    D = D || {};
    fields = fields || {};
    var filled = [];
    Object.keys(fields).forEach(function (k) {
      if (fields[k] == null || fields[k] === '') return;
      if (onlyEmpty && D[k]) return;
      D[k] = fields[k];
      filled.push(k);
    });
    return filled;
  }

  function applyPointUpdates(points, libKey, extraction) {
    if (!points || !points.length || !extraction) return points;
    var hint = POINT_HINTS[libKey];
    if (!hint) return points;
    var p = extraction.profile || getProfile({});
    points.forEach(function (pt) {
      if (!hint.match.test(pt.claim || '')) return;
      var doc = hint.doc(p);
      if (doc) {
        pt.evidenceDoc = doc;
        if (pt.evidenceStatus === 'red') pt.evidenceStatus = 'amber';
        else if (pt.evidenceStatus === 'amber' && /confirmed|on file|supports/i.test(doc)) pt.evidenceStatus = 'green';
      }
    });
    return points;
  }

  function readFileText(file, callback) {
    if (!file) {
      callback('');
      return;
    }
    var name = file.name || '';
    var isText = /\.(txt|csv|msg|log|json)$/i.test(name);
    if (!isText) {
      callback('');
      return;
    }
    var reader = new FileReader();
    reader.onload = function () {
      callback(String(reader.result || '').slice(0, 8000));
    };
    reader.onerror = function () {
      callback('');
    };
    reader.readAsText(file);
  }

  global.EvidenceExtract = {
    getProfile: getProfile,
    extractFromDocument: extractFromDocument,
    mergeIntoDisruption: mergeIntoDisruption,
    applyPointUpdates: applyPointUpdates,
    readFileText: readFileText,
    inferLibKeyFromFilename: inferLibKeyFromFilename,
    buildSnippet: buildSnippet,
  };
})(typeof window !== 'undefined' ? window : this);
