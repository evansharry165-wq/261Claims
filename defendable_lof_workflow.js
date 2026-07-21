/**
 * DefendAble LOF evidence workflow
 * Turns the post-ICC story into an editable facts + evidence-pack workspace.
 */
(function (root) {
  'use strict';

  var STORAGE_KEY = 'dfa_lof_workflows';

  var EV_TO_LIB = {
    'safety-report': ['safetynet'],
    metar: ['ogimet', 'weather', 'met_office'],
    'hazard-fcst': ['met_office', 'ogimet'],
    eurocontrol: ['eurocontrol'],
    ctot: ['eurocontrol'],
    'eurocontrol-oplog': ['eurocontrol'],
    notam: ['notam'],
    'third-party-track': ['flightradar', 'flight_tracking'],
    'ops-log': ['dpm', 'tops', 'disco', 'internal_email'],
    'maint-log': ['amos'],
    'tech-log': ['amos'],
    'crew-duty': ['aims'],
    'standby-deployment': ['aims'],
    'standby-availability': ['aims'],
    'crew-occ-log': ['aims', 'dpm'],
    'art9-care': ['max_ops', 'welfare_docs'],
    'sick-cert': ['aims'],
    'ops-manual': ['crew_docs'],
    'official-notice': ['internal_email', 'notam'],
    'nat-caa': ['notam'],
    'medical-records': ['safetynet'],
    'authority-statement': ['safetynet', 'internal_email'],
    'crew-witness': ['safetynet', 'aims'],
    'police-records': ['safetynet'],
    'handler-report': ['amos', 'internal_email'],
    'airport-statement': ['network_out', 'notam'],
    'govt-declaration': ['notam'],
    'govt-advisory': ['notam'],
    news: ['case_studies'],
    'hr-records': ['aims', 'internal_email'],
    'union-correspondence': ['internal_email']
  };

  var BEAT_EXTRA_EV = {
    weather: [
      { id: 'metar', name: 'METAR / TAF Records', source: 'Met authority / Ogimet', proves: 'Objective weather at the relevant aerodrome', priority: 'primary' },
      { id: 'eurocontrol', name: 'Eurocontrol Network / GDP Records', source: 'Eurocontrol NOP', proves: 'Weather-driven network restrictions', priority: 'supporting' }
    ],
    atfm: [
      { id: 'ctot', name: 'Eurocontrol Regulation Record / CTOT', source: 'Eurocontrol Network Manager', proves: 'ATFM slot / regulation for the flight', priority: 'primary' },
      { id: 'ops-log', name: "Duty Controller's Operations Log", source: 'OCC', proves: 'Timeline of hold / clearance decisions', priority: 'supporting' }
    ],
    fuel: [
      { id: 'ops-log', name: 'Turnaround / Fuelling Log', source: 'Ground ops / OCC', proves: 'Fuel uplift delay and allocation', priority: 'primary' },
      { id: 'dpm', name: 'DPM / Ground Handler Notes', source: 'DPM', proves: 'Fueller assignment and recall', priority: 'supporting' }
    ],
    art9: [
      { id: 'art9-care', name: 'Art 9 Care / Passenger Comms', source: 'MAX-OPS / ground ops', proves: 'Refreshments, meals, hold-on-board decisions', priority: 'primary' }
    ],
    hold: [
      { id: 'ops-log', name: 'OCC Hold Decision Record', source: 'OCC / Duty Manager', proves: 'Authorisation to hold passengers on board', priority: 'primary' }
    ],
    flight: [
      { id: 'ops-log', name: 'Operational Delay / Sector Record', source: 'TOPS / OCC', proves: 'Sector times and delay codes', priority: 'primary' },
      { id: 'third-party-track', name: 'Third-party Flight Tracking', source: 'FR24 / FlightStats', proves: 'Independent timing corroboration', priority: 'supporting' }
    ]
  };

  var state = null;

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function uniq(arr) {
    var out = [];
    var seen = {};
    (arr || []).forEach(function (x) {
      if (!x || seen[x]) return;
      seen[x] = 1;
      out.push(x);
    });
    return out;
  }

  function keywordsFromText(text) {
    var lower = String(text || '').toLowerCase();
    var keys = [];
    var patterns = [
      ['metar', /metar|taf|sigmet/],
      ['weather', /\bcb\b|cumulonimbus|thunderstorm|ts\+?ra|gdp|ground delay/],
      ['atfm', /atfm|ctot|eurocontrol|slot|atc/],
      ['fuel', /fuel|fueller|bowser|uplift/],
      ['art9', /art\s*9|refreshment|meal|hotel|snack/],
      ['hold', /held on stand|disembark|on board|occ decision/],
      ['crew', /crew|fdp|aims|duty/],
      ['tracking', /flight.?track|flightradar|fr24/],
      ['safety', /commander|occurrence|safety report|pirep/]
    ];
    patterns.forEach(function (p) {
      if (p[1].test(lower)) keys.push(p[0]);
    });
    return keys;
  }

  function beatEvidenceBucket(label, desc) {
    var t = ((label || '') + ' ' + (desc || '')).toLowerCase();
    if (/weather|metar|cb|cumulonimbus|thunderstorm/.test(t)) return 'weather';
    if (/atfm|slot|ctot|atc|gdp/.test(t)) return 'atfm';
    if (/fuel|fueller|bowser|uplift/.test(t)) return 'fuel';
    if (/art\s*9|care|refreshment|meal|snack/.test(t)) return 'art9';
    if (/hold|disembark|occ|on.?board/.test(t)) return 'hold';
    if (/flight|boarded|doors|airborne|blocks|arrival|missed connection/.test(t)) return 'flight';
    return null;
  }

  function libKeysForItem(item) {
    var mapped = EV_TO_LIB[item.id] || [];
    var fromName = [];
    var n = ((item.name || '') + ' ' + (item.source || '')).toLowerCase();
    if (/metar|taf|ogimet|weather/.test(n)) fromName.push('weather', 'ogimet', 'met_office');
    if (/eurocontrol|ctot|atfm|network/.test(n)) fromName.push('eurocontrol');
    if (/crew|aims|fdp|duty/.test(n)) fromName.push('aims');
    if (/ops.?log|dpm|occ|controller/.test(n)) fromName.push('dpm', 'tops', 'disco');
    if (/track|flightradar|flightstats/.test(n)) fromName.push('flight_tracking', 'flightradar');
    if (/art\s*9|passenger|max.?ops|care|meal|refresh/.test(n)) fromName.push('max_ops');
    if (/notam/.test(n)) fromName.push('notam');
    if (/safety|occurrence|commander/.test(n)) fromName.push('safetynet');
    if (/fuel|turnaround|ground/.test(n)) fromName.push('dpm', 'tops', 'internal_email');
    return uniq(mapped.concat(fromName));
  }

  function searchTerms(beat, item, facts) {
    var terms = [];
    if (facts && facts.flightNum) terms.push(facts.flightNum);
    if (facts && facts.depIata) terms.push(facts.depIata);
    if (facts && facts.arrIata) terms.push(facts.arrIata);
    if (item && item.name) terms.push(item.name);
    if (item && item.source) terms.push(item.source);
    if (beat && beat.label) terms.push(beat.label);
    keywordsFromText((beat && beat.desc) || '').forEach(function (k) { terms.push(k); });
    keywordsFromText((beat && beat.note) || '').forEach(function (k) { terms.push(k); });
    return uniq(terms.map(function (t) { return String(t).trim(); }).filter(Boolean));
  }

  function scoreFile(file, terms, libKeys) {
    var hay = [file.filename, file.categoryId, file.libKey, (file.flights || []).join(' '), file.routes, file.source, file.notes]
      .join(' ')
      .toLowerCase();
    var score = 0;
    (terms || []).forEach(function (t) {
      var q = String(t).toLowerCase();
      if (!q) return;
      if (hay.indexOf(q) >= 0) score += 3;
      if ((file.flights || []).some(function (fl) { return String(fl).toUpperCase().replace(/\s+/g, '') === q.replace(/\s+/g, ''); })) score += 5;
    });
    (libKeys || []).forEach(function (k) {
      if (file.libKey === k || file.categoryId === k) score += 4;
    });
    return score;
  }

  function searchRepository(beat, item, facts) {
    if (typeof EvidenceFiling === 'undefined') return [];
    var terms = searchTerms(beat, item, facts);
    var libKeys = libKeysForItem(item || {});
    var flight = facts && facts.flightNum;
    var date = facts && facts.date;
    var matches = [];

    // Case-aware first
    if (flight) {
      libKeys.forEach(function (k) {
        try {
          matches = matches.concat(EvidenceFiling.findFilesForCase(flight, date, k) || []);
        } catch (e) {}
      });
      try {
        matches = matches.concat(EvidenceFiling.findFilesForCase(flight, date, null) || []);
      } catch (e) {}
    }

    // Keyword search across repository
    var all = [];
    try {
      all = EvidenceFiling.getAllFiles() || [];
    } catch (e) {
      all = [];
    }
    all.forEach(function (f) {
      var s = scoreFile(f, terms, libKeys);
      if (s > 0) matches.push(Object.assign({}, f, { _score: s }));
    });

    // De-dupe by id, sort by score
    var byId = {};
    matches.forEach(function (f) {
      var s = f._score != null ? f._score : scoreFile(f, terms, libKeys);
      if (!byId[f.id] || s > (byId[f.id]._score || 0)) {
        byId[f.id] = Object.assign({}, f, { _score: s });
      }
    });
    return Object.keys(byId)
      .map(function (id) { return byId[id]; })
      .sort(function (a, b) { return (b._score || 0) - (a._score || 0); })
      .slice(0, 6);
  }

  function ensureEvidenceEntry(beatId, evId, item) {
    if (!state) return null;
    var key = beatId + '::' + evId;
    if (!state.evidence[key]) {
      state.evidence[key] = {
        key: key,
        beatId: beatId,
        evId: evId,
        name: item.name,
        source: item.source,
        proves: item.proves,
        priority: item.priority || 'supporting',
        status: 'unreviewed',
        matches: [],
        attached: [],
        note: '',
        requestedAt: null,
        libKeys: libKeysForItem(item)
      };
    }
    return state.evidence[key];
  }

  function buildBeats(facts, causalNodes, dt, evidenceDb) {
    var beats = [];
    if (facts && facts.flightNum) {
      beats.push({
        id: 'beat-flight',
        type: 'flight-dep',
        label: facts.flightNum + ((facts.depIata && facts.arrIata) ? ' — ' + facts.depIata + ' → ' + facts.arrIata : ''),
        desc: [
          facts.date ? 'Date: ' + facts.date : '',
          facts.aircraftReg ? 'A/C: ' + facts.aircraftReg : '',
          facts.depTime ? 'STD: ' + facts.depTime : '',
          facts.atdTime ? 'ATD: ' + facts.atdTime : '',
          facts.staTime ? 'STA: ' + facts.staTime : '',
          facts.ataTime ? 'ATA: ' + facts.ataTime : '',
          facts.delayText ? 'Delay: ' + facts.delayText : '',
          facts.paxCount ? 'Pax: ' + facts.paxCount : ''
        ].filter(Boolean).join(' · ') || 'Verify sector times against OCC records',
        time: facts.depTime || '',
        note: '',
        evidenceItems: (BEAT_EXTRA_EV.flight || []).slice()
      });
    }

    (causalNodes || []).forEach(function (cn, idx) {
      var id = 'beat-cn-' + idx;
      var bucket = beatEvidenceBucket(cn.label, cn.sub);
      var items = [];
      if (idx === 0 && cn.type === 'root' && evidenceDb && dt && evidenceDb[dt.id]) {
        items = evidenceDb[dt.id].slice();
      } else if (bucket && BEAT_EXTRA_EV[bucket]) {
        items = BEAT_EXTRA_EV[bucket].slice();
      } else if (cn.type === 'outcome') {
        items = (evidenceDb && evidenceDb['crew-fdp'] ? evidenceDb['crew-fdp'].filter(function (e) {
          return e.id === 'crew-duty' || e.id === 'standby-deployment';
        }) : []).concat(BEAT_EXTRA_EV.flight || []);
      }
      // Deduplicate by id
      var seen = {};
      items = items.filter(function (it) {
        if (seen[it.id]) return false;
        seen[it.id] = 1;
        return true;
      });
      beats.push({
        id: id,
        type: cn.type || 'cascade',
        label: cn.label,
        desc: cn.sub || '',
        time: cn.time || '',
        icon: cn.icon || '',
        note: '',
        evidenceItems: items
      });
    });
    return beats;
  }

  function init(opts) {
    opts = opts || {};
    state = {
      id: 'lof_' + Date.now().toString(36),
      createdAt: new Date().toISOString(),
      inputText: opts.inputText || '',
      facts: opts.facts || {},
      dt: opts.dt || null,
      rows: opts.rows || [],
      beats: buildBeats(opts.facts, opts.causalNodes, opts.dt, opts.evidenceDb),
      evidence: {},
      confirmed: false,
      snapshot: null
    };

    // Auto-search repository for every requirement
    state.beats.forEach(function (beat) {
      (beat.evidenceItems || []).forEach(function (item) {
        var entry = ensureEvidenceEntry(beat.id, item.id, item);
        entry.matches = searchRepository(beat, item, state.facts);
        if (entry.matches.length && entry.status === 'unreviewed') {
          entry.status = 'found';
        }
      });
    });

    persist();
    return state;
  }

  function getState() {
    return state;
  }

  function getBeat(beatId) {
    if (!state) return null;
    for (var i = 0; i < state.beats.length; i++) {
      if (state.beats[i].id === beatId) return state.beats[i];
    }
    return null;
  }

  function getEvidence(beatId, evId) {
    if (!state) return null;
    return state.evidence[beatId + '::' + evId] || null;
  }

  function setBeatNote(beatId, text) {
    var beat = getBeat(beatId);
    if (!beat) return;
    beat.note = text;
    // Re-search using note keywords
    (beat.evidenceItems || []).forEach(function (item) {
      var entry = ensureEvidenceEntry(beat.id, item.id, item);
      entry.matches = searchRepository(beat, item, state.facts);
      if (entry.matches.length && (entry.status === 'unreviewed' || entry.status === 'missing' || entry.status === 'requested')) {
        if (entry.status === 'unreviewed') entry.status = 'found';
      }
    });
    persist();
    return beat;
  }

  function attachFile(beatId, evId, fileId) {
    var entry = getEvidence(beatId, evId);
    if (!entry || typeof EvidenceFiling === 'undefined') return null;
    var file = (EvidenceFiling.getAllFiles() || []).find(function (f) { return f.id === fileId; });
    if (!file) return null;
    if (!entry.attached.some(function (a) { return a.id === fileId; })) {
      entry.attached.push({
        id: file.id,
        filename: file.filename,
        categoryId: file.categoryId,
        libKey: file.libKey,
        source: file.source,
        date: file.date
      });
    }
    entry.status = 'attached';
    try {
      EvidenceFiling.addAuditEntry(
        'Attached "' + file.filename + '" to LOF beat evidence "' + entry.name + '"',
        'action',
        'Legal'
      );
    } catch (e) {}
    persist();
    return entry;
  }

  function markAvailable(beatId, evId) {
    var entry = getEvidence(beatId, evId);
    if (!entry) return null;
    entry.status = entry.attached.length ? 'attached' : 'available';
    persist();
    return entry;
  }

  function markMissing(beatId, evId) {
    var entry = getEvidence(beatId, evId);
    if (!entry) return null;
    entry.status = 'missing';
    persist();
    return entry;
  }

  function requestEvidence(beatId, evId, note) {
    var beat = getBeat(beatId);
    var entry = getEvidence(beatId, evId);
    if (!entry || !beat) return null;
    entry.status = 'requested';
    entry.note = note || entry.note || '';
    entry.requestedAt = new Date().toISOString();

    var facts = state.facts || {};
    var req = {
      id: 'req_' + Date.now().toString(36),
      createdAt: entry.requestedAt,
      flightNum: facts.flightNum || '',
      route: (facts.depIata && facts.arrIata) ? facts.depIata + '-' + facts.arrIata : '',
      date: facts.date || '',
      evidenceName: entry.name,
      beatLabel: beat.label,
      beatDesc: beat.desc,
      keywords: searchTerms(beat, entry, facts),
      proves: entry.proves,
      note: entry.note,
      status: 'open',
      libKeys: entry.libKeys
    };

    try {
      var raw = sessionStorage.getItem('dfa_evidence_requests');
      var list = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(list)) list = [];
      list.unshift(req);
      sessionStorage.setItem('dfa_evidence_requests', JSON.stringify(list.slice(0, 100)));
    } catch (e) {}

    try {
      if (typeof EvidenceFiling !== 'undefined') {
        EvidenceFiling.addAuditEntry(
          'Requested "' + entry.name + '" for ' + (facts.flightNum || 'ICC case') + ' · ' + beat.label,
          'action',
          'Legal'
        );
      }
    } catch (e2) {}

    // Re-run search after request (in case note added keywords)
    entry.matches = searchRepository(beat, entry, facts);
    persist();
    return { entry: entry, request: req };
  }

  function chaseFromNote(beatId) {
    var beat = getBeat(beatId);
    if (!beat) return [];
    setBeatNote(beatId, beat.note || '');
    var results = [];
    (beat.evidenceItems || []).forEach(function (item) {
      var entry = getEvidence(beat.id, item.id);
      if (entry) results.push(entry);
    });
    return results;
  }

  function packSummary() {
    if (!state) {
      return { total: 0, attached: 0, available: 0, found: 0, requested: 0, missing: 0, unreviewed: 0, items: [] };
    }
    var summary = {
      total: 0,
      attached: 0,
      available: 0,
      found: 0,
      requested: 0,
      missing: 0,
      unreviewed: 0,
      items: []
    };
    Object.keys(state.evidence).forEach(function (k) {
      var e = state.evidence[k];
      summary.total++;
      summary[e.status] = (summary[e.status] || 0) + 1;
      summary.items.push(e);
    });
    return summary;
  }

  function confirmSnapshot(rows) {
    if (!state) return null;
    state.rows = rows || state.rows || [];
    state.confirmed = true;
    state.snapshot = {
      confirmedAt: new Date().toISOString(),
      facts: JSON.parse(JSON.stringify(state.facts || {})),
      rows: JSON.parse(JSON.stringify(state.rows || [])),
      beats: JSON.parse(JSON.stringify(state.beats || [])),
      evidence: JSON.parse(JSON.stringify(state.evidence || {})),
      pack: packSummary()
    };
    persist();
    return state.snapshot;
  }

  function unlock() {
    if (!state) return;
    state.confirmed = false;
    state.snapshot = null;
    persist();
  }

  function persist() {
    if (!state) return;
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      var all = raw ? JSON.parse(raw) : {};
      if (!all || typeof all !== 'object') all = {};
      all.latest = state;
      all[state.id] = {
        id: state.id,
        createdAt: state.createdAt,
        confirmed: state.confirmed,
        flightNum: (state.facts && state.facts.flightNum) || '',
        pack: packSummary()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    } catch (e) {}
  }

  function statusLabel(status) {
    return ({
      unreviewed: 'Unreviewed',
      found: 'Found in repository',
      attached: 'Attached to pack',
      available: 'Available',
      requested: 'Requested',
      missing: 'Missing'
    })[status] || status;
  }

  function renderEvidenceItemHtml(beat, item) {
    var entry = ensureEvidenceEntry(beat.id, item.id, item);
    var st = entry.status;
    var cls = st === 'attached' || st === 'available' ? 'ev-available'
      : st === 'requested' || st === 'found' ? 'ev-requested'
      : st === 'missing' ? 'ev-missing' : '';
    var indicator = st === 'attached' || st === 'available' ? '●'
      : st === 'requested' ? '→'
      : st === 'found' ? '◇'
      : st === 'missing' ? '✗' : '○';

    var matchesHtml = '';
    if (entry.matches && entry.matches.length) {
      matchesHtml = '<div class="lof-ev-matches">' +
        entry.matches.slice(0, 4).map(function (f) {
          var attached = entry.attached.some(function (a) { return a.id === f.id; });
          return '<div class="lof-ev-match">' +
            '<div class="lof-ev-match-meta">' +
              '<div class="lof-ev-match-name">' + esc(f.filename) + '</div>' +
              '<div class="lof-ev-match-sub">' + esc(f.categoryId) + ' · ' + esc(f.source || 'Repository') + (f.date ? ' · ' + esc(f.date) : '') + '</div>' +
            '</div>' +
            (attached
              ? '<span class="lof-ev-pill attached">Attached</span>'
              : '<button type="button" class="lof-ev-btn" onclick="lofAttachEvidence(\'' + beat.id + '\',\'' + item.id + '\',\'' + f.id + '\')">Attach</button>') +
          '</div>';
        }).join('') +
        '</div>';
    } else {
      matchesHtml = '<div class="lof-ev-empty">No repository match yet — add a note with keywords and chase, or request from Evidence.</div>';
    }

    var attachedHtml = '';
    if (entry.attached.length) {
      attachedHtml = '<div class="lof-ev-attached">' +
        entry.attached.map(function (a) {
          return '<span class="lof-ev-pill attached">📎 ' + esc(a.filename) + '</span>';
        }).join(' ') +
        '</div>';
    }

    return '<div class="tl-ev-item lof-ev-card ' + cls + '" id="evi-' + beat.id + '_' + item.id + '">' +
      '<div class="lof-ev-top">' +
        '<span class="tl-ev-indicator">' + indicator + '</span>' +
        '<div class="lof-ev-copy">' +
          '<div class="tl-ev-name">' + esc(item.name) +
            (item.priority === 'primary' ? ' <span class="lof-ev-priority">Primary</span>' : '') +
          '</div>' +
          '<div class="lof-ev-proves">' + esc(item.proves || '') + '</div>' +
        '</div>' +
        '<span class="tl-ev-status">' + esc(statusLabel(st)) + '</span>' +
      '</div>' +
      attachedHtml +
      matchesHtml +
      '<div class="lof-ev-actions">' +
        '<button type="button" class="lof-ev-btn" onclick="lofChaseEvidence(\'' + beat.id + '\',\'' + item.id + '\')">Chase repository</button>' +
        '<button type="button" class="lof-ev-btn primary" onclick="lofRequestEvidence(\'' + beat.id + '\',\'' + item.id + '\')">Request</button>' +
        '<button type="button" class="lof-ev-btn" onclick="lofMarkEvidence(\'' + beat.id + '\',\'' + item.id + '\',\'available\')">Mark available</button>' +
        '<button type="button" class="lof-ev-btn danger" onclick="lofMarkEvidence(\'' + beat.id + '\',\'' + item.id + '\',\'missing\')">Missing</button>' +
        '<a class="lof-ev-btn link" href="repository.html" target="_blank" rel="noopener">Open repository</a>' +
      '</div>' +
    '</div>';
  }

  function renderPackPanelHtml() {
    var s = packSummary();
    var reviewed = s.attached + s.available + s.requested + s.missing + s.found;
    var pct = s.total ? Math.round(((s.attached + s.available) / s.total) * 100) : 0;
    var rows = s.items.slice().sort(function (a, b) {
      var order = { attached: 0, available: 1, found: 2, requested: 3, missing: 4, unreviewed: 5 };
      return (order[a.status] || 9) - (order[b.status] || 9);
    }).map(function (e) {
      return '<tr>' +
        '<td>' + esc(e.name) + '</td>' +
        '<td>' + esc(statusLabel(e.status)) + '</td>' +
        '<td>' + (e.attached.length ? esc(e.attached.map(function (a) { return a.filename; }).join(', ')) : '—') + '</td>' +
      '</tr>';
    }).join('');

    return '<div class="lof-pack" id="lof-evidence-pack">' +
      '<div class="lof-pack-hdr">' +
        '<div>' +
          '<div class="lof-pack-eyebrow">Evidence pack · building now</div>' +
          '<div class="lof-pack-title">Defence evidence workspace</div>' +
          '<div class="lof-pack-sub">Attach repository files, request gaps, and lock the factual pack with Confirm LOF.</div>' +
        '</div>' +
        '<div class="lof-pack-stats">' +
          '<div><strong>' + (s.attached + s.available) + '</strong><span>in pack</span></div>' +
          '<div><strong>' + s.found + '</strong><span>found</span></div>' +
          '<div><strong>' + s.requested + '</strong><span>requested</span></div>' +
          '<div><strong>' + s.missing + '</strong><span>missing</span></div>' +
        '</div>' +
      '</div>' +
      '<div class="lof-pack-meter"><div class="lof-pack-meter-fill" style="width:' + pct + '%"></div></div>' +
      '<div class="lof-pack-meter-label">' + pct + '% attached/available · ' + reviewed + '/' + s.total + ' requirements reviewed</div>' +
      '<table class="lof-pack-table"><thead><tr><th>Requirement</th><th>Status</th><th>Attached file</th></tr></thead><tbody>' +
        (rows || '<tr><td colspan="3">No evidence requirements yet — run analysis first.</td></tr>') +
      '</tbody></table>' +
      '<div class="lof-pack-foot">Repository: <a href="repository.html" target="_blank" rel="noopener">open filing system</a> · Requests stay in this session for Evidence / DIO chase.</div>' +
    '</div>';
  }

  function toTlEvStatus() {
    // Bridge for legacy meter / pre-rating
    var out = {};
    if (!state) return out;
    Object.keys(state.evidence).forEach(function (k) {
      var e = state.evidence[k];
      var legacyKey = e.beatId + '_' + e.evId;
      if (e.status === 'attached' || e.status === 'available') out[legacyKey] = 'available';
      else if (e.status === 'requested' || e.status === 'found') out[legacyKey] = 'requested';
      else if (e.status === 'missing') out[legacyKey] = 'missing';
    });
    return out;
  }

  root.DefendableLofWorkflow = {
    init: init,
    getState: getState,
    getBeat: getBeat,
    getEvidence: getEvidence,
    setBeatNote: setBeatNote,
    attachFile: attachFile,
    markAvailable: markAvailable,
    markMissing: markMissing,
    requestEvidence: requestEvidence,
    chaseFromNote: chaseFromNote,
    searchRepository: searchRepository,
    packSummary: packSummary,
    confirmSnapshot: confirmSnapshot,
    unlock: unlock,
    renderEvidenceItemHtml: renderEvidenceItemHtml,
    renderPackPanelHtml: renderPackPanelHtml,
    toTlEvStatus: toTlEvStatus,
    statusLabel: statusLabel,
    EV_TO_LIB: EV_TO_LIB
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
