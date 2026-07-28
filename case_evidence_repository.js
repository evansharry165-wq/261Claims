/**
 * DefendAble — case-level Evidence Repository.
 *
 * Bridge between the raw evidence-collection GitHub feed and a case's own
 * permanent evidence bundle. When Sam (or the lawyer) confirms a piece of
 * evidence-collection data is genuinely relevant to a case, we snapshot the
 * item into case_packet.evidenceRepository so it survives:
 *   - the source's 90-day retention window
 *   - the raw snapshot being overwritten by tomorrow's nightly pull
 *   - the source being deprecated later
 *
 * Public API — window.CaseEvidenceRepository:
 *   .getCaseFacts(caseRef)             → {originIcao,destIcao,date,flightNum,reg,carrier} or null
 *   .fetchRelevantSlice(caseRef,sid)   → async → array of case-relevant items from that source
 *   .listAttached(caseRef)             → array of already-attached items
 *   .attachItem(caseRef,sid,item,note) → sync persist to case_packet, returns new attachment
 *   .removeAttached(caseRef,itemId)    → sync remove
 *   .exportBundle(caseRef)             → JSON of the full attached bundle (for LOR pack)
 *
 * Depends on window.EvidenceCollection (reader) + window.CaseFiling (persistence).
 */
(function (global) {
  'use strict';

  var STORAGE_META_KEY = 'evidenceRepository';

  function log(m){ if (global.console && console.debug) console.debug('[CaseEvidenceRepo]', m); }

  /* ── Case-fact extraction — pulls the fields we need for filtering ── */
  function getCaseFacts(caseRef){
    if (!caseRef || !global.CaseFiling) return null;
    var cf = global.CaseFiling.getCase(caseRef);
    if (!cf) return null;
    // Look up case_packet doc if present — that has the richer flight facts
    var packetDoc = (cf.documents || []).find(function(d){ return d.docKey === 'case_packet'; });
    var packet = null;
    if (packetDoc && packetDoc.content){
      try { packet = JSON.parse(packetDoc.content); } catch(e){}
    }
    var facts = (packet && packet.facts) || (cf.meta || {});
    return {
      ref:        caseRef,
      originIata: facts.originIata || facts.depIata || facts.origin || cf.meta && cf.meta.origin,
      destIata:   facts.destIata || facts.arrIata || facts.destination || cf.meta && cf.meta.destination,
      originIcao: iataToIcao(facts.originIata || facts.depIata || facts.origin || (cf.meta||{}).origin),
      destIcao:   iataToIcao(facts.destIata || facts.arrIata || facts.destination || (cf.meta||{}).destination),
      date:       facts.date || (cf.meta||{}).flightDate,
      flightNum:  facts.flightNum || (cf.meta||{}).flightNum || (cf.meta||{}).flight,
      reg:        facts.aircraftReg || (cf.meta||{}).registration,
      carrier:    facts.carrier || (cf.meta||{}).carrier,
      rotation:   (packet && packet.rotation) || [],
      _packet:    packet,
    };
  }

  /* ── Naive IATA→ICAO for the 63 airports we know ── */
  var IATA_TO_ICAO = {
    LHR:'EGLL',LGW:'EGKK',STN:'EGSS',LTN:'EGGW',LCY:'EGLC',MAN:'EGCC',EDI:'EGPH',GLA:'EGPF',BRS:'EGGD',BHX:'EGBB',BFS:'EGAA',EMA:'EGNX',DUB:'EIDW',
    CDG:'LFPG',ORY:'LFPO',NCE:'LFMN',MRS:'LFML',LYS:'LFLL',TLS:'LFBO',BOD:'LFBD',
    AMS:'EHAM',BRU:'EBBR',
    FRA:'EDDF',MUC:'EDDM',DUS:'EDDL',BER:'EDDB',HAM:'EDDH',CGN:'EDDK',
    ZRH:'LSZH',GVA:'LSGG',BSL:'LFSB',VIE:'LOWW',
    MAD:'LEMD',BCN:'LEBL',PMI:'LEPA',ALC:'LEAL',IBZ:'LEIB',AGP:'LEMG',LPA:'GCLP',TFS:'GCTS',LIS:'LPPT',OPO:'LPPR',
    FCO:'LIRF',MXP:'LIMC',LIN:'LIML',VCE:'LIPZ',NAP:'LIRN',BGY:'LIME',
    PRG:'LKPR',WAW:'EPWA',KRK:'EPKK',GDN:'EPGD',BUD:'LHBP',OTP:'LROP',SOF:'LBSF',
    ARN:'ESSA',OSL:'ENGM',CPH:'EKCH',
    ATH:'LGAV',HER:'LGIR',RHO:'LGRP',LCA:'LCLK',MLA:'LMML',
  };
  function iataToIcao(iata){ return iata ? (IATA_TO_ICAO[String(iata).toUpperCase()] || null) : null; }

  /* ── Coordinate approximations for airport bounding-box filters ── */
  var AIRPORT_COORDS = {
    EGLL:[51.47,-0.45],EGKK:[51.15,-0.19],EHAM:[52.31,4.76],LFPG:[49.01,2.55],EDDF:[50.03,8.56],LEMD:[40.47,-3.56],LIRF:[41.80,12.24],LEBL:[41.30,2.08],LSZH:[47.46,8.55],LSGG:[46.24,6.11],LEPA:[39.55,2.74],EIDW:[53.42,-6.27],EDDM:[48.35,11.79],LIMC:[45.63,8.72],EPWA:[52.17,20.97],LOWW:[48.11,16.57],
    // add lightweight defaults for the rest as needed
  };
  function distanceKm(a, b){
    var toRad = function(x){ return x*Math.PI/180; };
    var R = 6371;
    var dLat = toRad(b[0]-a[0]), dLon = toRad(b[1]-a[1]);
    var s1 = Math.sin(dLat/2)*Math.sin(dLat/2) + Math.cos(toRad(a[0]))*Math.cos(toRad(b[0]))*Math.sin(dLon/2)*Math.sin(dLon/2);
    return 2*R*Math.atan2(Math.sqrt(s1), Math.sqrt(1-s1));
  }

  /* ── Date helpers ── */
  function parseCaseDate(s){
    if (!s) return null;
    // Accept DD/MM/YYYY or YYYY-MM-DD or ISO
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)){ var p = s.split('/'); return new Date(+p[2], +p[1]-1, +p[0]); }
    var d = new Date(s); return isNaN(d.getTime()) ? null : d;
  }
  function withinDays(iso, caseDate, days){
    if (!iso || !caseDate) return true;
    var d = new Date(iso); if (isNaN(d.getTime())) return true;
    return Math.abs(d.getTime() - caseDate.getTime()) <= days * 86400000;
  }

  /* ── Per-source filtering: return the items from a snapshot that are case-relevant ── */
  function filterSnapshot(sourceId, snapshot, facts){
    if (!snapshot || !snapshot.data) return [];
    var data = snapshot.data;
    var icaos = [facts.originIcao, facts.destIcao].filter(Boolean);
    var caseDate = parseCaseDate(facts.date);

    if (sourceId === 'aviationweather-metar-taf'){
      var out = [];
      (data.metar || []).forEach(function(m){
        var stn = (m.icaoId || m.icao || m.station_id || '').toUpperCase();
        if (icaos.indexOf(stn) >= 0) out.push({ _kind:'metar', _key:'metar-'+stn, station:stn, raw: m.rawOb || m.raw || m.rawText || '', obs: m });
      });
      (data.taf || []).forEach(function(t){
        var stn = (t.icaoId || t.icao || t.station_id || '').toUpperCase();
        if (icaos.indexOf(stn) >= 0) out.push({ _kind:'taf', _key:'taf-'+stn, station:stn, raw: t.rawTAF || t.raw || t.rawText || '', obs: t });
      });
      return out;
    }
    if (sourceId === 'faa-notams'){
      var out = [];
      Object.keys(data.per_airport || {}).forEach(function(icao){
        if (icaos.indexOf(icao) < 0) return;
        (data.per_airport[icao].notams || []).forEach(function(n, i){
          out.push({ _kind:'notam', _key:'notam-'+icao+'-'+(n.number || n.id || i), station:icao, notam:n, raw:n.text });
        });
      });
      return out;
    }
    if (sourceId === 'aviation-herald-news' || sourceId === 'simple-flying-news'){
      var out = [];
      var needles = [facts.flightNum, facts.carrier, facts.originIata, facts.destIata, facts.originIcao, facts.destIcao].filter(Boolean).map(function(s){return String(s).toUpperCase();});
      (data.items || []).forEach(function(it, i){
        var hay = ((it.title||'') + ' ' + (it.description||'')).toUpperCase();
        var kw = needles.some(function(n){ return n && hay.indexOf(n) >= 0; });
        var dateOK = withinDays(it.pub_date, caseDate, 14);
        if (kw && dateOK) out.push({ _kind:'news', _key:'news-'+(it.guid || it.link || i), item:it });
      });
      return out;
    }
    if (sourceId === 'nasa-firms-wildfires'){
      var out = [];
      var refs = icaos.map(function(icao){ return AIRPORT_COORDS[icao]; }).filter(Boolean);
      (data.hotspots || []).forEach(function(h, i){
        if (h.lat == null || h.lon == null) return;
        var minDist = refs.length ? Math.min.apply(null, refs.map(function(r){ return distanceKm(r, [h.lat, h.lon]); })) : Infinity;
        if (minDist > 200) return; // 200 km radius
        var dateOK = withinDays(h.acq_date, caseDate, 3);
        if (!dateOK) return;
        out.push({ _kind:'wildfire', _key:'fire-'+i+'-'+(h.acq_date||''), hotspot:h, distanceKm: Math.round(minDist) });
      });
      return out.slice(0,40);
    }
    if (sourceId === 'gdacs-global-disasters'){
      var out = [];
      var refs = icaos.map(function(icao){ return AIRPORT_COORDS[icao]; }).filter(Boolean);
      (data.events || []).forEach(function(e){
        var withinWindow = withinDays(e.from_date, caseDate, 7);
        if (!withinWindow) return;
        var minDist = Infinity;
        if (refs.length && e.lat != null && e.lon != null){
          minDist = Math.min.apply(null, refs.map(function(r){ return distanceKm(r, [e.lat, e.lon]); }));
        }
        if (minDist < 500 || minDist === Infinity){
          out.push({ _kind:'gdacs', _key:'gdacs-'+(e.id||e.name), event:e, distanceKm: isFinite(minDist) ? Math.round(minDist) : null });
        }
      });
      return out;
    }
    if (sourceId === 'copernicus-effis'){
      var out = [];
      (data.fire_activations || []).forEach(function(a, i){
        if (withinDays(a.pub_date, caseDate, 7))
          out.push({ _kind:'copernicus', _key:'ems-'+i, activation:a });
      });
      return out;
    }
    if (sourceId === 'smithsonian-volcanoes'){
      var out = [];
      (data.volcanoes || []).forEach(function(v, i){
        if (withinDays(v.pub_date, caseDate, 30))
          out.push({ _kind:'volcano', _key:'volcano-'+i, volcano:v });
      });
      return out;
    }
    if (sourceId === 'dgac-france-notices' || sourceId === 'enac-italy-notices'){
      var out = [];
      (data.notices || []).forEach(function(n, i){
        out.push({ _kind:'strike', _key:'strike-'+sourceId+'-'+i, notice:n });
      });
      return out.slice(0,30);
    }
    if (sourceId === 'eurocontrol-nm-public' || sourceId === 'eurocontrol-coda'){
      var out = [];
      (data.publications || data.operational_links || []).forEach(function(p, i){
        out.push({ _kind:'atfm', _key:'atfm-'+sourceId+'-'+i, publication:p });
      });
      return out.slice(0,20);
    }
    if (sourceId === 'opensky-flight-tracks'){
      var callsign = (facts.flightNum || '').replace(/\s+/g,'').toUpperCase();
      var out = [];
      (data.states || []).forEach(function(s){
        if (callsign && s.callsign && s.callsign.indexOf(callsign) >= 0){
          out.push({ _kind:'track', _key:'track-'+s.icao24, state:s });
        }
      });
      return out;
    }
    if (sourceId === 'met-office-charts'){
      // Whole chart set relevant — no filtering, just return the pack
      return (data.charts || []).map(function(c, i){ return { _kind:'chart', _key:'chart-'+i, chart:c }; });
    }
    // Default: return nothing (means "not per-case filterable yet")
    return [];
  }

  /* On-demand source IDs mirror daily-source IDs with "-on-demand" suffix.
     Reader prefers targeted fetch when present. */
  function targetedSourceId(daily){ return daily + '-on-demand'; }

  function hasTargetedFetch(caseRef, sourceId){
    if (!global.EvidenceCollection || !global.EvidenceCollection.getCaseFetch) return Promise.resolve(false);
    var targetedSid = targetedSourceId(sourceId);
    return global.EvidenceCollection.getCaseFetch(caseRef, targetedSid).then(function(x){ return !!x; });
  }

  function fetchRelevantSlice(caseRef, sourceId){
    var facts = getCaseFacts(caseRef);
    if (!facts) return Promise.resolve([]);
    if (!global.EvidenceCollection) return Promise.resolve([]);
    // Try targeted case-fetch first — if present, always prefer it
    var targetedSid = targetedSourceId(sourceId);
    return global.EvidenceCollection.getCaseFetch(caseRef, targetedSid).then(function(targeted){
      if (targeted && targeted.data){
        var items = filterOnDemandSnapshot(sourceId, targeted, facts);
        // Tag every item so UI can badge them as targeted
        items.forEach(function(it){ it._fetchKind = 'targeted'; it._pulled_at = targeted.pulled_at; });
        return items;
      }
      // Fall back to daily snapshot
      return global.EvidenceCollection.get(sourceId).then(function(snap){
        if (!snap) return [];
        var items = filterSnapshot(sourceId, snap, facts);
        items.forEach(function(it){ it._fetchKind = 'snapshot'; it._pulled_at = snap.pulled_at; });
        return items;
      });
    }).catch(function(){ return []; });
  }

  /* On-demand snapshots have a slightly different shape (per_airport keyed on ICAO
     for weather, etc.). Convert to items[] the same way filterSnapshot does. */
  function filterOnDemandSnapshot(sourceId, snap, facts){
    var data = snap.data || {};
    if (sourceId === 'aviationweather-metar-taf'){
      var out = [];
      var perAp = data.per_airport || {};
      Object.keys(perAp).forEach(function(icao){
        var block = perAp[icao] || {};
        (block.metar || []).forEach(function(m, i){
          out.push({ _kind:'metar', _key:'metar-'+icao+'-'+(m.reportTime||m.obsTime||i), station:icao, raw: m.rawOb || m.raw || m.rawText || '', obs: m });
        });
        (block.taf || []).forEach(function(t, i){
          out.push({ _kind:'taf', _key:'taf-'+icao+'-'+i, station:icao, raw: t.rawTAF || t.raw || t.rawText || '', obs: t });
        });
      });
      return out;
    }
    // For other on-demand sources, fall back to the daily filter (they inherit the same shape)
    return filterSnapshot(sourceId, snap, facts);
  }

  /* ── Persistence ── */
  function readRepo(caseRef){
    if (!global.CaseFiling) return { items: [] };
    var cf = global.CaseFiling.getCase(caseRef);
    if (!cf) return { items: [] };
    var meta = cf.meta || {};
    return (meta[STORAGE_META_KEY] && Array.isArray(meta[STORAGE_META_KEY].items))
      ? meta[STORAGE_META_KEY]
      : { items: [] };
  }
  function writeRepo(caseRef, repo){
    if (!global.CaseFiling) return;
    var patch = {};
    patch[STORAGE_META_KEY] = repo;
    global.CaseFiling.updateCaseMeta(caseRef, patch);
  }
  function listAttached(caseRef){ return readRepo(caseRef).items; }
  function attachItem(caseRef, sourceId, item, note){
    if (!item || !item._key) return null;
    var repo = readRepo(caseRef);
    // De-dupe: don't attach the same _key twice
    if (repo.items.some(function(x){ return x.itemKey === item._key; })){
      return repo.items.find(function(x){ return x.itemKey === item._key; });
    }
    var user = (global.getActiveUser && global.getActiveUser()) || 'SB';
    var attachment = {
      id:         'ATT-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,8),
      itemKey:    item._key,
      sourceId:   sourceId,
      sourceProvider: (global.EvidenceCollection && (global.EvidenceCollection.SOURCE_MAP[sourceId] || {}).provider) || sourceId,
      kind:       item._kind,
      attachedAt: new Date().toISOString(),
      attachedBy: user,
      note:       (note || '').trim() || null,
      snapshot:   item,   // full item preserved for post-retention access
      summary:    summarise(item),
    };
    repo.items.push(attachment);
    writeRepo(caseRef, repo);
    if (global.CaseFiling.addActivity){
      global.CaseFiling.addActivity(caseRef, 'Evidence attached · ' + attachment.summary + ' (' + attachment.sourceProvider + ')', 'evidence', user);
    }
    /* Also add a lightweight document reference so attached evidence appears in the case's Documents tab —
       this closes the loop Harry described: "grab it, save it, upload it into the repository where it joins the cases documents". */
    if (global.CaseFiling.addDocument){
      try {
        global.CaseFiling.addDocument(caseRef, {
          id: 'evidence-' + attachment.id,
          name: attachment.summary || 'Evidence item',
          folderId: 'evidence',
          docKey: 'evidence_' + attachment.sourceId,
          filename: (attachment.summary || 'evidence').slice(0, 80).replace(/[^a-z0-9_\-. ]/gi, '') + '.json',
          content: JSON.stringify(attachment.snapshot || attachment, null, 2),
          mimeType: 'application/json',
          size: JSON.stringify(attachment).length,
          status: 'on_file',
          source: attachment.sourceProvider || 'evidence-collection',
          uploadedBy: user,
          uploadedByName: user,
          uploadedAt: attachment.attachedAt,
          note: attachment.note || null,
        });
      } catch(e) { if (global.console) console.debug('addDocument failed for evidence attach:', e); }
    }
    return attachment;
  }
  function removeAttached(caseRef, itemId){
    var repo = readRepo(caseRef);
    var i = repo.items.findIndex(function(x){ return x.id === itemId; });
    if (i < 0) return false;
    var removed = repo.items.splice(i, 1)[0];
    writeRepo(caseRef, repo);
    if (global.CaseFiling.addActivity){
      var user = (global.getActiveUser && global.getActiveUser()) || 'SB';
      global.CaseFiling.addActivity(caseRef, 'Evidence removed · ' + (removed.summary || itemId), 'evidence', user);
    }
    return true;
  }
  function exportBundle(caseRef){
    var repo = readRepo(caseRef);
    return {
      case_ref: caseRef,
      exported_at: new Date().toISOString(),
      item_count: repo.items.length,
      items: repo.items,
    };
  }

  /* ── Item → one-line summary ── */
  function summarise(item){
    if (!item || !item._kind) return 'Evidence item';
    switch(item._kind){
      case 'metar':      return 'METAR ' + item.station + ' — ' + (item.raw||'').slice(0,60);
      case 'taf':        return 'TAF ' + item.station + ' — ' + (item.raw||'').slice(0,60);
      case 'notam':      return 'NOTAM ' + item.station + ' ' + (item.notam.number||item.notam.id||'');
      case 'news':       return (item.item.title || 'News item').slice(0,90);
      case 'wildfire':   return 'Wildfire hotspot ' + item.distanceKm + ' km · ' + (item.hotspot.acq_date||'');
      case 'gdacs':      return (item.event.name || 'GDACS event') + (item.distanceKm != null ? ' · ' + item.distanceKm + ' km' : '');
      case 'copernicus': return 'Copernicus EMS · ' + (item.activation.title || '').slice(0,80);
      case 'volcano':    return 'Volcano · ' + (item.volcano.volcano || 'unnamed');
      case 'strike':     return 'Strike notice · ' + (item.notice.date_match || '') + ' — ' + (item.notice.snippet || '').slice(0,60);
      case 'atfm':       return (item.publication.title || 'ATFM publication').slice(0,90);
      case 'track':      return 'Flight track ' + (item.state.callsign || item.state.icao24);
      case 'chart':      return (item.chart.alt || 'Weather chart') + ' — ' + (item.chart.url || '').slice(0,60);
    }
    return 'Evidence item';
  }

  global.CaseEvidenceRepository = {
    getCaseFacts:       getCaseFacts,
    fetchRelevantSlice: fetchRelevantSlice,
    hasTargetedFetch:   hasTargetedFetch,
    targetedSourceId:   targetedSourceId,
    listAttached:       listAttached,
    attachItem:         attachItem,
    removeAttached:     removeAttached,
    exportBundle:       exportBundle,
    summarise:          summarise,
  };
})(typeof window !== 'undefined' ? window : this);
