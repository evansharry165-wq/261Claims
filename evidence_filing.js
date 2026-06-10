/**
 * Evidence Filing System — mirrors SharePoint structure:
 *   Category → Year → Month → Day → Files
 *
 * Evidence team uploads here; legal team pulls into evidence packs.
 * Persisted in localStorage (261c_evidence_filing).
 */
(function (global) {
  'use strict';

  var STORAGE_KEY = '261c_evidence_filing';
  var VERSION = 1;

  var FILING_CATEGORIES = [
    { id: 'tops', name: 'Operational delay records system — Flight Details & Legislation', icon: 'ti-report-analytics', libKey: 'tops', tier: 'K', group: 'Always required' },
    { id: 'disco', name: 'Disruption data system — Disruption Records', icon: 'ti-timeline-event', libKey: 'disco', tier: 'K', group: 'Always required' },
    { id: 'aims', name: 'Crew scheduling system — Crew Route & FDP', icon: 'ti-users', libKey: 'aims', tier: 'K', group: 'Always required' },
    { id: 'safetynet', name: 'Safety reporting system Reports', icon: 'ti-shield-check', libKey: 'safetynet', tier: 'K', group: 'Always required' },
    { id: 'eurocontrol', name: 'Eurocontrol — ATFM & Flight Data', icon: 'ti-radar', libKey: 'eurocontrol', tier: 'K', group: 'ATC' },
    { id: 'weather', name: 'Weather — METAR, TAF & SIGMET', icon: 'ti-cloud-rain', libKey: 'ogimet', tier: 'K', group: 'Weather' },
    { id: 'met_office', name: 'Met Office — Hazard Forecasts', icon: 'ti-temperature', libKey: 'met_office', tier: 'K', group: 'Weather' },
    { id: 'notam', name: 'NOTAM Records', icon: 'ti-alert-triangle', libKey: 'notam', tier: 'K', group: 'Airport' },
    { id: 'amos', name: 'Maintenance records system — Technical Events', icon: 'ti-tool', libKey: 'amos', tier: 'K', group: 'Technical' },
    { id: 'max_ops', name: 'MAX OPS — Passenger Communications', icon: 'ti-message', libKey: 'max_ops', tier: 'S', group: 'Passenger care' },
    { id: 'dpm', name: 'DPM Notes & Ops Review', icon: 'ti-notes', libKey: 'dpm', tier: 'S', group: 'Operational context' },
    { id: 'internal_email', name: 'Internal Emails & Ops Comms', icon: 'ti-mail', libKey: 'internal_email', tier: 'S', group: 'Operational context' },
    { id: 'flight_tracking', name: 'Flight Tracking — FR24 & FlightStats', icon: 'ti-route', libKey: 'flightradar', tier: 'S', group: 'Operational context' },
    { id: 'network_out', name: 'Network Outlook & LIDO', icon: 'ti-world', libKey: 'network_out', tier: 'S', group: 'Operational context' },
    { id: 'wider_ref', name: 'Wider Reference & Case Studies', icon: 'ti-books', libKey: 'case_studies', tier: 'W', group: 'Wider reference' },
  ];

  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  function pad(n) { return n < 10 ? '0' + n : String(n); }

  function parseDate(iso) {
    var p = String(iso || '').split('-');
    if (p.length !== 3) return null;
    return { year: p[0], month: parseInt(p[1], 10), day: parseInt(p[2], 10), iso: iso };
  }

  function dateParts(iso) {
    var d = parseDate(iso);
    if (!d) return { year: '', monthName: '', dayLabel: '', iso: '' };
    var dt = new Date(parseInt(d.year, 10), d.month - 1, d.day);
    return {
      year: d.year,
      month: d.month,
      monthName: MONTHS[d.month - 1] || '',
      day: d.day,
      dayLabel: dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      iso: iso,
    };
  }

  function categoryById(id) {
    for (var i = 0; i < FILING_CATEGORIES.length; i++) {
      if (FILING_CATEGORIES[i].id === id) return FILING_CATEGORIES[i];
    }
    return null;
  }

  function categoryByLibKey(libKey) {
    for (var i = 0; i < FILING_CATEGORIES.length; i++) {
      if (FILING_CATEGORIES[i].libKey === libKey) return FILING_CATEGORIES[i];
    }
    return null;
  }

  function loadStore() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var data = JSON.parse(raw);
        if (data && data.version === VERSION && Array.isArray(data.files)) return data;
      }
    } catch (e) { /* seed fresh */ }
    return { version: VERSION, files: seedFiles(), audit: seedAudit() };
  }

  function saveStore(store) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch (e) { /* quota */ }
  }

  function seedAudit() {
    return [
      { t: 'Evidence filing system initialised — SharePoint mirror structure loaded', type: 'create', time: '05 Jun 2026 09:00', by: 'System' },
      { t: 'Seeded 24 files across 8 evidence categories for demo operations days', type: 'upload', time: '05 Jun 2026 09:01', by: 'E. Hughes' },
    ];
  }

  function seedFiles() {
    return [
      mk('f001', 'tops', '2026-03-14', 'HC1184_Operational delay records system_FlightDetails_14Mar2026.pdf', { flights: ['HC 1184'], routes: 'LTN-BCN', uploadedBy: 'EH', source: 'API', size: 284000 }),
      mk('f002', 'disco', '2026-03-14', 'HC1184_Disruption data system_DisruptionRecord_14Mar2026.pdf', { flights: ['HC 1184'], routes: 'LTN-BCN', uploadedBy: 'EH', source: 'API', size: 156000 }),
      mk('f003', 'aims', '2026-03-14', 'HC1184_Crew scheduling system_CrewFDP_14Mar2026.pdf', { flights: ['HC 1184'], routes: 'LTN-BCN', uploadedBy: 'EH', source: 'API', size: 98000 }),
      mk('f004', 'eurocontrol', '2026-03-14', 'Eurocontrol_ATFM_WestEurope_14Mar2026.pdf', { flights: ['HC 1184', 'HC 307'], routes: 'Network', uploadedBy: 'EH', source: 'API', size: 412000 }),
      mk('f005', 'weather', '2026-03-14', 'BCN_METAR_SIGMET_14Mar2026.pdf', { flights: ['HC 1184'], routes: 'LTN-BCN', uploadedBy: 'EH', source: 'API', size: 67000 }),
      mk('f006', 'notam', '2026-03-14', 'BCN_NOTAM_14Mar2026.pdf', { flights: ['HC 1184'], routes: 'LTN-BCN', uploadedBy: 'EH', source: 'API', size: 45000 }),
      mk('f007', 'dpm', '2026-03-14', 'DPM_Notes_WeatherDiversion_14Mar2026.docx', { flights: ['HC 1184'], routes: 'LTN-BCN', uploadedBy: 'EH', source: 'Manual', size: 52000 }),
      mk('f008', 'tops', '2026-04-09', 'HC307_Operational delay records system_DelayCode_09Apr2026.pdf', { flights: ['HC 307'], routes: 'MAN-AMS', uploadedBy: 'EH', source: 'API', size: 271000 }),
      mk('f009', 'disco', '2026-04-09', 'HC307_Disruption data system_ATCDelay_09Apr2026.pdf', { flights: ['HC 307'], routes: 'MAN-AMS', uploadedBy: 'EH', source: 'API', size: 143000 }),
      mk('f010', 'eurocontrol', '2026-04-09', 'Eurocontrol_Regulation_AMS_09Apr2026.pdf', { flights: ['HC 307'], routes: 'MAN-AMS', uploadedBy: 'EH', source: 'API', size: 389000 }),
      mk('f011', 'aims', '2026-04-09', 'HC307_Crew scheduling system_CrewRoute_09Apr2026.pdf', { flights: ['HC 307'], routes: 'MAN-AMS', uploadedBy: 'EH', source: 'API', size: 91000 }),
      mk('f012', 'safetynet', '2026-04-09', 'HC307_Safety reporting system_09Apr2026.pdf', { flights: ['HC 307'], routes: 'MAN-AMS', uploadedBy: 'EH', source: 'API', size: 76000 }),
      mk('f013', 'tops', '2026-04-28', 'HC330_Operational delay records system_WeatherDelay_28Apr2026.pdf', { flights: ['HC 330'], routes: 'LGW-ALC', uploadedBy: 'EH', source: 'API', size: 295000 }),
      mk('f014', 'weather', '2026-04-28', 'ALC_METAR_SIGMET_28Apr2026.pdf', { flights: ['HC 330'], routes: 'LGW-ALC', uploadedBy: 'EH', source: 'API', size: 71000 }),
      mk('f015', 'notam', '2026-04-28', 'ALC_NOTAM_28Apr2026.pdf', { flights: ['HC 330'], routes: 'LGW-ALC', uploadedBy: 'EH', source: 'API', size: 48000 }),
      mk('f016', 'disco', '2026-04-28', 'HC330_Disruption data system_Weather_28Apr2026.pdf', { flights: ['HC 330'], routes: 'LGW-ALC', uploadedBy: 'EH', source: 'API', size: 152000 }),
      mk('f017', 'max_ops', '2026-04-28', 'HC330_MAXOPS_PassengerComms_28Apr2026.pdf', { flights: ['HC 330'], routes: 'LGW-ALC', uploadedBy: 'EH', source: 'API', size: 88000 }),
      mk('f018', 'dpm', '2026-04-28', 'DPM_Notes_ALCWeather_28Apr2026.docx', { flights: ['HC 330'], routes: 'LGW-ALC', uploadedBy: 'EH', source: 'Manual', size: 49000 }),
      mk('f019', 'aims', '2026-04-28', 'HC330_Crew scheduling system_CrewFDP_28Apr2026.pdf', { flights: ['HC 330'], routes: 'LGW-ALC', uploadedBy: 'EH', source: 'API', size: 94000 }),
      mk('f020', 'safetynet', '2026-04-28', 'HC330_Safety reporting system_28Apr2026.pdf', { flights: ['HC 330'], routes: 'LGW-ALC', uploadedBy: 'EH', source: 'API', size: 73000 }),
      mk('f021', 'eurocontrol', '2026-04-28', 'Eurocontrol_Network_28Apr2026.pdf', { flights: ['HC 330'], routes: 'LGW-ALC', uploadedBy: 'EH', source: 'API', size: 401000 }),
      mk('f022', 'met_office', '2026-04-28', 'MetOffice_HazardForecast_28Apr2026.pdf', { flights: ['HC 330'], routes: 'LGW-ALC', uploadedBy: 'EH', source: 'API', size: 112000 }),
      mk('f023', 'flight_tracking', '2026-03-14', 'HC1184_Flightradar24_Track_14Mar2026.pdf', { flights: ['HC 1184'], routes: 'LTN-BCN', uploadedBy: 'EH', source: 'API', size: 134000 }),
      mk('f024', 'internal_email', '2026-03-14', 'ICC_DiversionAlert_HC1184_14Mar2026.msg', { flights: ['HC 1184'], routes: 'LTN-BCN', uploadedBy: 'EH', source: 'Manual', size: 28000 }),
    ];
  }

  function mk(id, categoryId, dateIso, filename, opts) {
    opts = opts || {};
    var cat = categoryById(categoryId);
    var parts = dateParts(dateIso);
    return {
      id: id,
      categoryId: categoryId,
      libKey: cat ? cat.libKey : categoryId,
      tier: cat ? cat.tier : 'K',
      date: dateIso,
      year: parts.year,
      month: parts.month,
      monthName: parts.monthName,
      dayLabel: parts.dayLabel,
      filename: filename,
      flights: opts.flights || [],
      routes: opts.routes || '',
      uploadedBy: opts.uploadedBy || 'EH',
      uploadedAt: opts.uploadedAt || parts.dayLabel + ' 08:30',
      source: opts.source || 'Manual',
      size: opts.size || 0,
      notes: opts.notes || '',
    };
  }

  function getAllFiles() {
    return loadStore().files.slice();
  }

  function getAuditLog() {
    return loadStore().audit.slice();
  }

  function addAuditEntry(text, type, by) {
    var store = loadStore();
    store.audit.unshift({
      t: text,
      type: type || 'action',
      time: new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
      by: by || 'User',
    });
    store.audit = store.audit.slice(0, 100);
    saveStore(store);
  }

  function formatSize(bytes) {
    if (!bytes) return '—';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return Math.round(bytes / 1024) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }

  /** Build folder tree: category → year → month → days with file counts */
  function getFolderTree() {
    var files = getAllFiles();
    var tree = {};
    files.forEach(function (f) {
      if (!tree[f.categoryId]) {
        var cat = categoryById(f.categoryId);
        tree[f.categoryId] = { id: f.categoryId, name: cat ? cat.name : f.categoryId, icon: cat ? cat.icon : 'ti-folder', tier: cat ? cat.tier : 'K', years: {} };
      }
      var catNode = tree[f.categoryId];
      if (!catNode.years[f.year]) catNode.years[f.year] = { id: f.year, months: {} };
      var yearNode = catNode.years[f.year];
      if (!yearNode.months[f.month]) yearNode.months[f.month] = { id: f.month, name: f.monthName, days: {} };
      var monthNode = yearNode.months[f.month];
      if (!monthNode.days[f.date]) monthNode.days[f.date] = { id: f.date, label: f.dayLabel, count: 0 };
      monthNode.days[f.date].count++;
    });
    return tree;
  }

  function getFilesInPath(categoryId, year, month, dateIso) {
    return getAllFiles().filter(function (f) {
      if (categoryId && f.categoryId !== categoryId) return false;
      if (year && f.year !== String(year)) return false;
      if (month && f.month !== parseInt(month, 10)) return false;
      if (dateIso && f.date !== dateIso) return false;
      return true;
    });
  }

  function getUniqueDates() {
    var seen = {}, dates = [];
    getAllFiles().forEach(function (f) {
      if (!seen[f.date]) {
        seen[f.date] = true;
        dates.push({ date: f.date, label: f.dayLabel, flights: f.flights, routes: f.routes });
      }
    });
    return dates.sort(function (a, b) { return a.date < b.date ? 1 : -1; });
  }

  function getDaySummary(dateIso) {
    var files = getFilesInPath(null, null, null, dateIso);
    var flights = {}, categories = {};
    files.forEach(function (f) {
      f.flights.forEach(function (fl) { flights[fl] = true; });
      categories[f.categoryId] = (categories[f.categoryId] || 0) + 1;
    });
    var keyCount = files.filter(function (f) { return f.tier === 'K'; }).length;
    var secCount = files.filter(function (f) { return f.tier === 'S'; }).length;
    var totalKey = 8;
    var totalSec = 6;
    var gold = Math.min(100, Math.round(((keyCount + secCount) / (totalKey + totalSec)) * 100));
    return {
      date: dateIso,
      label: files.length ? files[0].dayLabel : dateParts(dateIso).dayLabel,
      fileCount: files.length,
      flights: Object.keys(flights),
      routes: files.length ? files[0].routes : '',
      gold: gold,
      goldReady: gold >= 80,
      completion: gold,
    };
  }

  /** Parse flight date from case string e.g. "14 March 2026" → 2026-03-14 */
  function parseFlightDate(str) {
    if (!str) return null;
    var months = { january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
      janvier: 1, février: 2, mars: 3, avril: 4, mai: 5, juin: 6, juillet: 7, août: 8, septembre: 9, octobre: 10, novembre: 11, décembre: 12,
      enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8, septiembre: 9, octubre: 10, noviembre: 11, diciembre: 12 };
    var s = String(str).toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
    var m = s.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/);
    if (!m) return null;
    var mo = months[m[2]];
    if (!mo) return null;
    return m[3] + '-' + pad(mo) + '-' + pad(parseInt(m[1], 10));
  }

  function normaliseFlight(num) {
    return String(num || '').replace(/\s+/g, ' ').trim().toUpperCase();
  }

  /** Find repository files matching a case's flight + date */
  function findFilesForCase(flightNum, flightDate, libKey) {
    var iso = parseFlightDate(flightDate);
    var flight = normaliseFlight(flightNum);
    return getAllFiles().filter(function (f) {
      var dateMatch = !iso || f.date === iso;
      var flightMatch = !flight || f.flights.some(function (fl) { return normaliseFlight(fl) === flight; });
      var libMatch = !libKey || f.libKey === libKey || f.categoryId === libKey;
      if (libKey) return dateMatch && (flightMatch || libMatch) && (f.libKey === libKey || categoryByLibKey(libKey) && f.categoryId === categoryByLibKey(libKey).id);
      return dateMatch && flightMatch;
    });
  }

  /** Match all LIB keys for a case — returns { libKey: [files] } */
  function matchRepositoryForCase(flightNum, flightDate, libKeys) {
    var out = {};
    (libKeys || []).forEach(function (key) {
      var matches = findFilesForCase(flightNum, flightDate, key);
      if (matches.length) out[key] = matches;
    });
    return out;
  }

  function uploadFile(meta) {
    var store = loadStore();
    var cat = categoryById(meta.categoryId);
    var id = 'f' + Date.now().toString().slice(-8);
    var file = mk(id, meta.categoryId, meta.date, meta.filename, {
      flights: meta.flights || [],
      routes: meta.routes || '',
      uploadedBy: meta.uploadedBy || 'EH',
      source: meta.source || 'Manual',
      size: meta.size || 0,
      notes: meta.notes || '',
      uploadedAt: new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
    });
    store.files.unshift(file);
    saveStore(store);
    addAuditEntry('Uploaded "' + file.filename + '" → ' + (cat ? cat.name : file.categoryId) + ' / ' + file.dayLabel, 'upload', meta.uploadedByName || 'E. Hughes');
    return file;
  }

  function deleteFile(fileId) {
    var store = loadStore();
    var idx = store.files.findIndex(function (f) { return f.id === fileId; });
    if (idx < 0) return false;
    var removed = store.files.splice(idx, 1)[0];
    saveStore(store);
    addAuditEntry('Removed "' + removed.filename + '" from filing system', 'action', 'User');
    return true;
  }

  function searchFiles(query) {
    var q = String(query || '').toLowerCase();
    if (!q) return getAllFiles();
    return getAllFiles().filter(function (f) {
      var hay = [f.filename, f.categoryId, f.flights.join(' '), f.routes, f.dayLabel, f.source].join(' ').toLowerCase();
      return hay.indexOf(q) >= 0;
    });
  }

  function resetToSeed() {
    localStorage.removeItem(STORAGE_KEY);
    return loadStore();
  }

  var EvidenceFiling = {
    STORAGE_KEY: STORAGE_KEY,
    FILING_CATEGORIES: FILING_CATEGORIES,
    MONTHS: MONTHS,
    getAllFiles: getAllFiles,
    getAuditLog: getAuditLog,
    addAuditEntry: addAuditEntry,
    getFolderTree: getFolderTree,
    getFilesInPath: getFilesInPath,
    getUniqueDates: getUniqueDates,
    getDaySummary: getDaySummary,
    findFilesForCase: findFilesForCase,
    matchRepositoryForCase: matchRepositoryForCase,
    uploadFile: uploadFile,
    deleteFile: deleteFile,
    searchFiles: searchFiles,
    categoryById: categoryById,
    categoryByLibKey: categoryByLibKey,
    dateParts: dateParts,
    parseFlightDate: parseFlightDate,
    formatSize: formatSize,
    resetToSeed: resetToSeed,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = EvidenceFiling;
  } else {
    global.EvidenceFiling = EvidenceFiling;
  }
})(typeof window !== 'undefined' ? window : this);
