/**
 * Case Filing System — live case files for active matters.
 * Intake creates a case file; drafting and deposits add documents;
 * Repository Cases area browses, views and edits the full file.
 * Persisted in localStorage (dfa_case_filing).
 */
(function (global) {
  'use strict';

  var STORAGE_KEY = 'dfa_case_filing';
  var VERSION = 2;

  var CASE_FOLDERS = [
    { id: 'intake', name: 'Intake', icon: 'ti-upload', desc: 'LOC and initial claim documents' },
    { id: 'correspondence', name: 'Correspondence', icon: 'ti-mail', desc: 'Letters, emails and solicitor communications' },
    { id: 'legal_drafts', name: 'Legal drafts', icon: 'ti-file-pencil', desc: 'Approved and draft court documents' },
    { id: 'evidence_index', name: 'Evidence index', icon: 'ti-database', desc: 'Linked evidence and supporting documents' },
    { id: 'activity', name: 'Activity log', icon: 'ti-history', desc: 'Case timeline and team actions' },
  ];

  function folderById(id) {
    for (var i = 0; i < CASE_FOLDERS.length; i++) {
      if (CASE_FOLDERS[i].id === id) return CASE_FOLDERS[i];
    }
    return null;
  }

  function loadStore() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var data = JSON.parse(raw);
        if (data && data.version === VERSION && data.cases) return data;
      }
    } catch (e) { /* seed fresh */ }
    return { version: VERSION, cases: seedCases(), audit: seedAudit() };
  }

  function saveStore(store) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch (e) { /* quota */ }
  }

  function seedAudit() {
    return [
      { t: 'Case filing system initialised — live case files ready', type: 'create', time: '05 Jun 2026 09:00', by: 'System', ref: '' },
    ];
  }

  function mkDoc(id, folderId, name, opts) {
    opts = opts || {};
    return {
      id: id,
      folderId: folderId,
      name: name,
      docKey: opts.docKey || '',
      filename: opts.filename || name,
      content: opts.content || '',
      status: opts.status || 'on_file',
      mimeType: opts.mimeType || 'text/plain',
      size: opts.size || (opts.content ? opts.content.length : 0),
      uploadedBy: opts.uploadedBy || 'SB',
      uploadedByName: opts.uploadedByName || 'Sarah Booth',
      uploadedAt: opts.uploadedAt || new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      source: opts.source || 'system',
    };
  }

  function normaliseRef(ref) {
    if (typeof normaliseCaseRef === 'function') return normaliseCaseRef(ref);
    var aliases = {
      'AC-2026-0089': 'DEF-2026-EW-0089',
      'AC-2026-0076': 'DEF-2026-EW-0076',
      'FR-2026-0009': 'DEF-2026-FR-0009',
      'ES-2026-0027': 'DEF-2026-ES-0027',
    };
    return aliases[ref] || ref;
  }

  function migrateCaseAliases(cases) {
    Object.keys(cases).forEach(function (oldRef) {
      var newRef = normaliseRef(oldRef);
      if (newRef === oldRef) return;
      if (!cases[newRef]) {
        cases[newRef] = cases[oldRef];
        cases[newRef].ref = newRef;
      }
      delete cases[oldRef];
    });
  }

  function enrichDraftingSendPack(cases, ref, opts) {
    opts = opts || {};
    var c = cases[ref];
    if (!c) return;
    var hasLor = (c.documents || []).some(function (d) { return d.docKey === 'lor' || d.docKey === 'defence'; });
    if (hasLor) return;
    c.stage = c.stage || 'drafting';
    c.evidencePct = opts.evidencePct != null ? opts.evidencePct : 100;
    c.loaStatus = c.loaStatus || 'sent';
    if (!(c.documents || []).some(function (d) { return d.folderId === 'intake'; })) {
      c.documents.push(mkDoc('cf-' + ref.slice(-4) + '-loc', 'intake', opts.locName || 'Letter of Claim', {
        filename: ref + '-LOC.pdf',
        content: opts.locContent || 'Letter of claim on file.',
        status: 'on_file',
        source: 'intake',
        uploadedAt: opts.locDate || '22 May 2026 09:00',
      }));
    }
    if (!(c.documents || []).some(function (d) { return d.docKey === 'loa'; })) {
      c.documents.push(mkDoc('cf-' + ref.slice(-4) + '-loa', 'correspondence', opts.loaName || 'Letter of Acknowledgement', {
        docKey: 'loa',
        filename: ref + '-LOA.txt',
        content: opts.loaContent || 'Letter of acknowledgement sent — CPR compliance.',
        status: 'approved',
        source: 'drafting',
        uploadedAt: opts.loaDate || '24 May 2026 11:30',
      }));
    }
    c.documents.push(mkDoc('cf-' + ref.slice(-4) + '-lor', 'legal_drafts', opts.lorName || 'Letter of Response', {
      docKey: 'lor',
      filename: ref + '-Letter-of-Response.txt',
      content: opts.lorContent || 'Approved letter of response — extraordinary circumstances defence.',
      status: 'approved',
      source: 'drafting',
      uploadedAt: opts.lorDate || '05 Jun 2026 10:00',
    }));
    c.activity = c.activity || [];
    c.activity.push(
      { text: opts.lorName || 'Letter of Response approved and filed', time: opts.lorDate || '05 Jun 2026 10:00', type: 'approve', by: opts.by || 'Legal team' }
    );
  }

  function seedCases() {
    var cases = {};
    var all = typeof ALL_CASES !== 'undefined' ? ALL_CASES : [];

    all.forEach(function (c) {
      if (c.stage === 'resolve') return;
      var route = (c.dep && c.arr) ? c.dep + '–' + c.arr : (c.flight || '').split('—')[1] || '';
      cases[c.ref] = {
        ref: c.ref,
        claimant: c.claimant,
        solicitor: c.solicitor || '',
        flightNum: c.flightNum || '',
        route: route.trim(),
        jurisdiction: c.jurisdiction || 'england-wales',
        stage: c.stage || 'intake',
        disruptionType: c.disruptionType || '',
        value: c.value || '',
        assignedTo: c.assignedTo || 'SB',
        evidencePct: c.evidencePct || 0,
        createdAt: '2026-05-22T09:00:00Z',
        updatedAt: new Date().toISOString(),
        documents: [],
        activity: [{ text: 'Case file created from intake', time: '22 May 2026 09:00', type: 'create', by: 'System' }],
      };
    });

    if (cases['AC-2026-0089'] || cases['DEF-2026-EW-0089']) {
      var h = cases['DEF-2026-EW-0089'] || cases['AC-2026-0089'];
      if (cases['AC-2026-0089'] && !cases['DEF-2026-EW-0089']) {
        h = JSON.parse(JSON.stringify(cases['AC-2026-0089']));
        h.ref = 'DEF-2026-EW-0089';
        cases['DEF-2026-EW-0089'] = h;
        delete cases['AC-2026-0089'];
      }
      h.classification = 'ESCALATE';
      h.cprDaysLeft = 3;
      h.triageNote = 'ESCALATE — Montreal Convention consequential loss (£38,250) is the primary exposure. Challenge causation, foreseeability and mitigation. EC261 extraordinary circumstances defence strong on weather diversion.';
      h.points = [
        { n: 1, claim: 'Delay — Art 7(1)(a)', evidenceStatus: 'green', evidenceDoc: 'Operational delay records system confirmed' },
        { n: 2, claim: 'Extraordinary circumstances — weather', evidenceStatus: 'amber', evidenceDoc: 'METAR/SIGMET pending' },
        { n: 3, claim: 'Article 9 — duty of care', evidenceStatus: 'red', evidenceDoc: 'Valencia ground records outstanding' },
        { n: 4, claim: 'Consequential loss — £38,250 (Montreal Convention)', evidenceStatus: 'red', evidenceDoc: 'Request third-party contract documentation; challenge causation and mitigation; obtain independent verification — Montreal Convention does not provide recovery of speculative commercial losses' },
        { n: 5, claim: 'Travel & subsistence — £141.80', evidenceStatus: 'amber', evidenceDoc: 'Receipts pending' }
      ];
      h.documents = [
        mkDoc('cf-h-001', 'intake', 'Letter of Claim — Hartley', {
          filename: 'Hartley_LOC_22May2026.pdf',
          content: 'LETTER OF CLAIM\n\nDaniel Hartley v. [Airline]\nFlight HC 1184 LTN–BCN, 14 March 2026\n\nClaim for delay, diversion to Valencia, consequential loss £38,250 under the Montreal Convention (causation and mitigation to be challenged) and expenses £141.80 under EC Regulation 261/2004.',
          status: 'on_file',
          source: 'intake',
          uploadedBy: 'SB',
          uploadedByName: 'Sarah Booth',
          uploadedAt: '22 May 2026 09:14',
          mimeType: 'application/pdf',
          size: 248000,
        }),
        mkDoc('cf-h-002', 'correspondence', 'Letter of Acknowledgement', {
          docKey: 'loa',
          filename: 'DEF-2026-EW-0089-Letter-of-Acknowledgement.txt',
          content: 'Letter of Acknowledgement sent to Pemberton & Associates — CPR Pre-Action Protocol compliance.',
          status: 'approved',
          source: 'drafting',
          uploadedBy: 'SB',
          uploadedByName: 'Sarah Booth',
          uploadedAt: '24 May 2026 11:30',
        }),
        mkDoc('cf-h-003', 'evidence_index', 'Evidence pack index — HC 1184', {
          filename: 'DEF-2026-EW-0089-Evidence-Index.txt',
          content: 'Evidence on file (35%):\n• Operational delay records system flight details — on file\n• Disruption data system disruption record — on file\n• METAR/SIGMET BCN — on file\n• Eurocontrol ATFM — on file\n• Valencia ground records — requested',
          status: 'on_file',
          source: 'evidence',
          uploadedBy: 'EH',
          uploadedByName: 'Emma Hughes',
          uploadedAt: '04 Jun 2026 14:20',
        }),
      ];
      h.activity.push(
        { text: 'LOC deposited — AI extraction complete', time: '22 May 2026 09:14', type: 'upload', by: 'S. Booth' },
        { text: 'Letter of Acknowledgement approved', time: '24 May 2026 11:30', type: 'approve', by: 'S. Booth' },
        { text: 'Evidence pack 35% — evidence gathering in progress', time: '04 Jun 2026 14:20', type: 'stage', by: 'E. Hughes' }
      );
      h.evidencePct = 35;
      h.stage = 'evidence';
    }

    enrichDraftingSendPack(cases, 'DEF-2026-EW-0076', {
      locName: 'Letter of Claim — Taylor',
      locContent: 'LOC for Sarah Taylor — HC 330 LGW–ALC. ATC Ground Stop Manchester — extraordinary circumstances.',
      loaContent: 'LOA sent to Thompsons Solicitors — CPR acknowledgement.',
      lorName: 'Letter of Response — Taylor',
      lorContent: 'LETTER OF RESPONSE\n\nRe: Sarah Taylor v [Airline] — Flight HC 330\n\nWe maintain extraordinary circumstances apply due to ATC Ground Stop at Manchester (Eurocontrol CRCO EU-ATC-20260312-MAN). Compensation not payable under UK261.',
      lorDate: '04 Jun 2026 09:30',
      by: 'J. Patel',
    });

    enrichDraftingSendPack(cases, 'DEF-2026-FR-0009', {
      locName: 'Lettre de réclamation — Fontaine',
      locContent: 'Réclamation Isabelle Fontaine — vol HC 881 MRS–LGW. Retard grève ATC.',
      loaName: 'Accusé de réception',
      loaContent: 'Accusé de réception envoyé à Maître Dumas — conformité délais.',
      lorName: 'Lettre de réponse',
      lorContent: 'LETTRE DE RÉPONSE\n\nAffaire Fontaine — vol HC 881\n\nCirconstances extraordinaires établies (grève ATC du 14 mars — arrêté préfectoral et communiqué DGAC). Indemnisation CE261 non due.',
      lorDate: '03 Jun 2026 11:00',
      by: 'P. Laurent',
    });

    enrichDraftingSendPack(cases, 'DEF-2026-ES-0027', {
      locName: 'Carta de reclamación — Ruiz',
      locContent: 'Reclamación Carmen Ruiz — vuelo HC 339 AGP–LTN. Retraso meteorológico granizo.',
      loaName: 'Acuse de recibo',
      loaContent: 'Acuse de recibo enviado a Bufete Morales.',
      lorName: 'Escrito de respuesta',
      lorContent: 'ESCRITO DE RESPUESTA\n\nAsunto Ruiz — vuelo HC 339\n\nCircunstancias extraordinarias plenamente documentadas (AEMET + NOTAM cierre pista). Compensación CE261 no procede.',
      lorDate: '02 Jun 2026 15:00',
      by: 'I. Martín',
    });


    /* B1.2 · Seed evidence-repository attachments so primary demo cases open with
       real-looking attachments rather than an empty repository. Every seeded item
       carries snapshot._isSeed = true so the new provenance chip flags it clearly. */
    function seedEvidenceAttachments(ref, items){
      if (!cases[ref]) return;
      cases[ref].meta = cases[ref].meta || {};
      var repo = { items: [] };
      var now = new Date().toISOString();
      items.forEach(function(it, i){
        repo.items.push({
          id:              'SEED-' + ref + '-' + (i+1),
          itemKey:         it.itemKey || ('seed-' + ref + '-' + (i+1)),
          sourceId:        it.sourceId || 'aviationweather-metar-taf',
          sourceProvider:  it.sourceProvider || 'Seeded demo source',
          kind:            it.kind || 'metar',
          attachedAt:      it.attachedAt || now,
          attachedBy:      it.attachedBy || 'SB',
          /* Session B · capturedBy — who at the DIO originally captured this
             into the evidence pool, distinct from attachedBy (who filed it to
             THIS case). Absent on every seed call except Etna's — that's what
             gives B.1's "no attribution for Hartley's older items" its real,
             unforced fallback case rather than a hardcoded exception. */
          capturedBy:      it.capturedBy || null,
          /* Session B · how the DIO originally captured this item —
             'api-pull' | 'pdf' | 'pending-connection'. Only meaningful
             alongside capturedBy; absent everywhere else. */
          captureMethod:   it.captureMethod || null,
          note:            it.note || null,
          snapshot:        Object.assign({ _isSeed: true, _key: it.itemKey || ('seed-'+ref+'-'+(i+1)), _kind: it.kind || 'metar' }, it.snapshot || {}),
          summary:         it.summary,
        });
      });
      cases[ref].meta.evidenceRepository = repo;
    }

    /* Hartley (DEF-2026-EW-0089) — primary walkthrough case. Four seeded items
       covering weather (METAR/SIGMET), operational timing, and Article 9 records. */
    seedEvidenceAttachments('DEF-2026-EW-0089', [
      { itemKey: 'seed-metar-LEVC-140326', sourceId: 'aviationweather-metar-taf', sourceProvider: 'NOAA AviationWeather.gov',
        kind: 'metar', attachedAt: '2026-05-24T10:12:00Z', attachedBy: 'SB',
        summary: 'METAR LEVC 141350Z TSRA BKN020CB — Valencia thunderstorm activity confirmed at ATA',
        snapshot: { station:'LEVC', obsTime:'2026-03-14T13:50Z', text:'LEVC 141350Z 12015KT TSRA FEW015 BKN020CB 18/16 Q1014 RETSRA' } },
      { itemKey: 'seed-sigmet-EGTT-140326', sourceId: 'aviationweather-metar-taf', sourceProvider: 'NOAA AviationWeather.gov',
        kind: 'metar', attachedAt: '2026-05-24T10:18:00Z', attachedBy: 'SB',
        summary: 'SIGMET EGTT 141200-141800 — embedded TS with cell tops FL340 over Iberia',
        snapshot: { station:'EGTT', obsTime:'2026-03-14T12:00Z', text:'SIGMET EGTT VALID 141200/141800 — EMBD TS FL280/FL340 STNR NC' } },
      { itemKey: 'seed-atfm-LZL30A-140326', sourceId: 'eurocontrol-nm-public', sourceProvider: 'Eurocontrol NM',
        kind: 'atfm', attachedAt: '2026-05-24T10:33:00Z', attachedBy: 'SB',
        summary: 'ATFM regulation LZL30A — Valencia arrivals, weather cause, 1310-1745Z',
        snapshot: { regulationId:'LZL30A', reason:'Weather - CB/TS', fromTime:'2026-03-14T13:10Z', toTime:'2026-03-14T17:45Z' } },
      { itemKey: 'seed-a9-vlc-14032026', sourceId: 'internal-max-ops', sourceProvider: 'MAX OPS (customer comms)',
        kind: 'chart', attachedAt: '2026-05-25T09:04:00Z', attachedBy: 'SB',
        summary: 'Article 9 duty-of-care records — Valencia refreshment vouchers × 148 pax',
        note: 'Vouchers issued at gate 14:35Z. Hotel offered but declined per pax email.',
        snapshot: { source:'MAX OPS', voucherCount:148, hotelOffered:true, hotelAccepted:false } },
    ]);

    /* Sarah Taylor DEF-2026-EW-0076 — complete case at drafting stage.
       Two seeded items showing the full-evidence-pack look. */
    seedEvidenceAttachments('DEF-2026-EW-0076', [
      { itemKey: 'seed-atc-MAN-280426', sourceId: 'eurocontrol-nm-public', sourceProvider: 'Eurocontrol NM',
        kind: 'atfm', attachedAt: '2026-04-22T14:22:00Z', attachedBy: 'JP',
        summary: 'MAN ATC Ground Stop 06:45-09:30 · Reference EU-ATC-20260428-MAN',
        snapshot: { regulationId:'EU-ATC-20260428-MAN', reason:'ATC Ground Stop', fromTime:'2026-04-28T06:45Z', toTime:'2026-04-28T09:30Z' } },
      { itemKey: 'seed-metar-EGCC-280426', sourceId: 'aviationweather-metar-taf', sourceProvider: 'NOAA AviationWeather.gov',
        kind: 'metar', attachedAt: '2026-04-22T14:25:00Z', attachedBy: 'JP',
        summary: 'METAR EGCC 280700Z — visibility 0400 FG · low-visibility procedures active',
        snapshot: { station:'EGCC', obsTime:'2026-04-28T07:00Z', text:'EGCC 280700Z 00000KT 0400 R05L/1200 FG VV002 08/08 Q1024 NOSIG' } },
    ]);

    /* Engine shell DEF-ENG-2026-EW-0201 — proactive weather diversion.
       One partial attachment to demonstrate the "started building" state. */
    seedEvidenceAttachments('DEF-ENG-2026-EW-0201', [
      { itemKey: 'seed-metar-EGKK-250726', sourceId: 'aviationweather-metar-taf', sourceProvider: 'NOAA AviationWeather.gov',
        kind: 'metar', attachedAt: '2026-07-26T09:15:00Z', attachedBy: 'EH',
        summary: 'METAR EGKK 251400-251800Z sequence — CB thunderstorm activity confirmed',
        note: 'Proactive pull — engine flagged CB activity from operational feed; sequence collected before LOC arrives.',
        snapshot: { station:'EGKK', obsTime:'2026-07-25T14:00Z', text:'EGKK 251400Z 22015G28KT 6000 TSRA FEW015CB BKN025 20/17 Q1012 RETSRA' } },
    ]);

    /* Evidence Bus Phase 1 · DEF-DEMO-ETNA-CASCADE — the cascade differentiator
       demo case. EZY4412 GVA-LGW, 3 Aug 2026, aircraft G-EZAB, one sector removed
       from the Etna ash-closure root cause (see flight_resolver.js's SEED_FLIGHTS
       for the full rotation). Phase 1 left this deliberately empty to prove the
       live attachItem/CaseAuditTrail.append pipeline for real (see Phase 1
       verification). Phase 3 now also pre-seeds it — same instant-open pattern as
       Hartley/Taylor/engine-shell below — so the case Repository tab has real
       content the moment a lawyer opens it, not just whatever gets attached live
       during a demo session. Both are true at once: the seeded items below were
       genuinely attached once (Phase 1), and are also hand-baked here exactly like
       Hartley's, so the case reads as complete on first load. */
    if (!cases['DEF-DEMO-ETNA-CASCADE']) {
      cases['DEF-DEMO-ETNA-CASCADE'] = {
        ref: 'DEF-DEMO-ETNA-CASCADE',
        claimant: 'Demo — Etna cascade (Evidence Bus)',
        solicitor: '',
        flightNum: 'EZY4412',
        route: 'GVA–LGW',
        jurisdiction: 'england-wales',
        stage: 'evidence',
        disruptionType: 'Natural Disaster',
        value: '£400',
        assignedTo: 'SB',
        /* Session B · dep/arr — DIOTerritory.casesInTerritory()/caseCountByAirport()
           and dio-case.html's own facts row all read c.dep/c.arr, not route.
           Without these the case (and its territory-pulse contribution) is
           invisible on Emma's dashboard even though route already says GVA–LGW. */
        dep: 'GVA',
        arr: 'LGW',
        evidencePct: 0,
        createdAt: '2026-08-03T09:00:00Z',
        updatedAt: new Date().toISOString(),
        documents: [],
        activity: [{ text: 'Demo case seeded — Etna cascade scenario for Evidence Bus Phase 1/3', time: '03 Aug 2026 09:00', type: 'create', by: 'System' }],
        meta: {
          originIata: 'GVA',
          destIata: 'LGW',
          flightDate: '2026-08-03',
          flightNum: 'EZY4412',
          registration: 'G-EZAB',
          carrier: 'EZY',
          /* Phase 3 closeout 1 · same rotation[] flight_resolver.js's
             SEED_FLIGHTS carries for EZY4412 — kept identical so the
             case-based path (getCaseFacts, this) and the case-less path
             (FlightQueryResolver, the front-door query bar) agree on the
             same rotation regardless of which one a caller hits. */
          rotation: [
            { fno: 'EZY7822', from: 'LGW', to: 'CTA', fromIcao: 'EGKK', toIcao: 'LICC', date: '2026-07-31' },
            { fno: 'EZY7823', from: 'CTA', to: 'LGW', fromIcao: 'LICC', toIcao: 'EGKK', date: '2026-08-01' },
            { fno: 'EZY-FERRY', from: 'CTA', to: 'GVA', fromIcao: 'LICC', toIcao: 'LSGG', date: '2026-08-03' },
            { fno: 'EZY4412', from: 'GVA', to: 'LGW', fromIcao: 'LSGG', toIcao: 'EGKK', date: '2026-08-03' }
          ]
        }
      };
    }

    /* Phase 3 · Etna evidence pack — five items across the real sourceIds this
       system actually has: the ash advisory that grounded the aircraft at CTA,
       the airport NOTAM, the ATFM regulation, and METAR bookends (ash at LICC on
       1 Aug; clear conditions confirming the 3 Aug cascade flight itself had no
       local weather cause). NOTAM sourceId corrected to 'faa-notams' — that's
       what filterSnapshot/EVIDENCE_CATALOGUE actually use for NOTAMs;
       'eurocontrol-nm-public' is ATFM regulations, not NOTAMs (see Hartley's own
       ATFM item below for that source's real use). kind:'volcano' reused for the
       ash advisory rather than inventing a new 'vaac' kind — already has full
       icon support in case_evidence_repository_ui.js and evidence-workspace.html. */
    /* Session B · capturedBy — distinct from attachedBy. attachedBy is who
       pulled the item into THIS case (Sarah, correct — she filed it here).
       capturedBy is who at the DIO originally captured the item into the
       evidence pool (Emma). The audit chain below records the attach event
       and stays keyed to 'SB' — untouched — since that's the true actor of
       record for the attach action itself. */
    seedEvidenceAttachments('DEF-DEMO-ETNA-CASCADE', [
      { itemKey: 'seed-vaac-etna-310726', sourceId: 'vaac-london-qva', sourceProvider: 'Met Office VAAC London',
        kind: 'volcano', attachedAt: '2026-08-03T09:12:00Z', attachedBy: 'SB', capturedBy: 'EH', captureMethod: 'api-pull',
        summary: 'VAAC London ash advisory VA20260731/01 — Mt Etna eruption, ash to FL350, Catania (LICC) airspace closed',
        snapshot: { volcano: 'Etna', advisoryId: 'VA20260731/01', affectedIcao: 'LICC', issued: '2026-07-31T18:00Z', ashTop: 'FL350' } },
      { itemKey: 'seed-notam-cta-310726', sourceId: 'faa-notams', sourceProvider: 'FAA / AutoRouter NOTAMs',
        kind: 'notam', attachedAt: '2026-08-03T09:18:00Z', attachedBy: 'SB', capturedBy: 'EH', captureMethod: 'api-pull',
        summary: 'NOTAM LICC A1234/26 — Catania Fontanarossa airport closed, volcanic ash, effective 31 Jul 2026 18:00Z',
        snapshot: { station: 'LICC', number: 'A1234/26', text: 'AERODROME CLOSED DUE VOLCANIC ASH', effectiveFrom: '2026-07-31T18:00Z' } },
      { itemKey: 'seed-atfm-cta-010826', sourceId: 'eurocontrol-nm-public', sourceProvider: 'Eurocontrol NM',
        kind: 'atfm', attachedAt: '2026-08-03T09:24:00Z', attachedBy: 'SB', capturedBy: 'EH', captureMethod: 'api-pull',
        summary: 'ATFM regulation LIRC01A — Catania airspace, volcanic ash (Etna), 31 Jul 1800Z-1 Aug 1600Z',
        snapshot: { regulationId: 'LIRC01A', reason: 'Volcanic ash - Etna eruption', fromTime: '2026-07-31T18:00Z', toTime: '2026-08-01T16:00Z' } },
      { itemKey: 'seed-metar-licc-010826', sourceId: 'aviationweather-metar-taf', sourceProvider: 'NOAA AviationWeather.gov',
        kind: 'metar', attachedAt: '2026-08-03T09:30:00Z', attachedBy: 'SB', capturedBy: 'EH', captureMethod: 'api-pull',
        summary: 'METAR LICC 010800Z VA PLUME OBSC SKY — volcanic ash observed, visibility reduced',
        snapshot: { station: 'LICC', obsTime: '2026-08-01T08:00Z', text: 'LICC 010800Z 09008KT 2000 VA FEW020 SCT100 22/14 Q1015 VA PLUME OBSC SKY' } },
      { itemKey: 'seed-metar-egkk-030826', sourceId: 'aviationweather-metar-taf', sourceProvider: 'NOAA AviationWeather.gov',
        kind: 'metar', attachedAt: '2026-08-03T09:36:00Z', attachedBy: 'SB', capturedBy: 'EH', captureMethod: 'api-pull',
        summary: 'METAR EGKK 030800Z — clear conditions at LGW; cascade traced to prior sector at LICC, not local weather',
        note: 'No independent weather cause at destination — confirms the delay traces through the aircraft rotation to the CTA ash closure, not a separate LGW event.',
        snapshot: { station: 'EGKK', obsTime: '2026-08-03T08:00Z', text: 'EGKK 030800Z 21012KT 9999 FEW025 19/12 Q1018 NOSIG' } },
    ]);




    /* P3 · Sam-prep · Pre-computed hash-chained audit trail for the same seeded
       attachments above.  Hashes were computed at build time with the exact same
       payload construction the runtime uses (see case_audit_trail.js _doAppend),
       so "Verify chain" passes on first open with no runtime rehashing needed. */
    function seedAuditChain(ref, entries){
      if (!cases[ref]) return;
      cases[ref].meta = cases[ref].meta || {};
      cases[ref].meta.evidenceAuditTrail = entries;
    }

    seedAuditChain('DEF-2026-EW-0089', [
      {"seq":1,"ts":"2026-05-24T10:12:00Z","actor":"SB","action":"attach","itemKey":"seed-metar-LEVC-140326","itemId":"SEED-DEF-2026-EW-0089-1","sourceId":"aviationweather-metar-taf","summary":"METAR LEVC 141350Z TSRA BKN020CB — Valencia thunderstorm activity confirmed at ATA","note":null,"prevHash":"0000000000000000000000000000000000000000000000000000000000000000","hash":"91952d1ecc040ecc955b9f419505739d7569ab560b70f5120ad47a87cf1fd4ff"},
      {"seq":2,"ts":"2026-05-24T10:18:00Z","actor":"SB","action":"attach","itemKey":"seed-sigmet-EGTT-140326","itemId":"SEED-DEF-2026-EW-0089-2","sourceId":"aviationweather-metar-taf","summary":"SIGMET EGTT 141200-141800 — embedded TS with cell tops FL340 over Iberia","note":null,"prevHash":"91952d1ecc040ecc955b9f419505739d7569ab560b70f5120ad47a87cf1fd4ff","hash":"b00ed21e8278e95dc2126e2b700211a6cfd20260ff101d96738168d64c35b4db"},
      {"seq":3,"ts":"2026-05-24T10:33:00Z","actor":"SB","action":"attach","itemKey":"seed-atfm-LZL30A-140326","itemId":"SEED-DEF-2026-EW-0089-3","sourceId":"eurocontrol-nm-public","summary":"ATFM regulation LZL30A — Valencia arrivals, weather cause, 1310-1745Z","note":null,"prevHash":"b00ed21e8278e95dc2126e2b700211a6cfd20260ff101d96738168d64c35b4db","hash":"71eaf28935e0a8e4cd6d0d4927fcf4b30dbd3a4bb46ed0facfa5098810bbe616"},
      {"seq":4,"ts":"2026-05-25T09:04:00Z","actor":"SB","action":"attach","itemKey":"seed-a9-vlc-14032026","itemId":"SEED-DEF-2026-EW-0089-4","sourceId":"internal-max-ops","summary":"Article 9 duty-of-care records — Valencia refreshment vouchers × 148 pax","note":null,"prevHash":"71eaf28935e0a8e4cd6d0d4927fcf4b30dbd3a4bb46ed0facfa5098810bbe616","hash":"7e9b403258f5dd21a1c20b3b4ec483f2242abb369738ad4a2554c8231a2d4ff4"}
    ]);

    seedAuditChain('DEF-2026-EW-0076', [
      {"seq":1,"ts":"2026-04-22T14:22:00Z","actor":"JP","action":"attach","itemKey":"seed-atc-MAN-280426","itemId":"SEED-DEF-2026-EW-0076-1","sourceId":"eurocontrol-nm-public","summary":"MAN ATC Ground Stop 06:45-09:30 · Reference EU-ATC-20260428-MAN","note":null,"prevHash":"0000000000000000000000000000000000000000000000000000000000000000","hash":"85d18ac35577465f026809ef4b5126a5371e6d972ab1c812d86d8c9e04c65991"},
      {"seq":2,"ts":"2026-04-22T14:25:00Z","actor":"JP","action":"attach","itemKey":"seed-metar-EGCC-280426","itemId":"SEED-DEF-2026-EW-0076-2","sourceId":"aviationweather-metar-taf","summary":"METAR EGCC 280700Z — visibility 0400 FG · low-visibility procedures active","note":null,"prevHash":"85d18ac35577465f026809ef4b5126a5371e6d972ab1c812d86d8c9e04c65991","hash":"d8e7d38b661c844dba58955ab42915830297f61b92c718f36f58ae1770fbe753"}
    ]);

    seedAuditChain('DEF-ENG-2026-EW-0201', [
      {"seq":1,"ts":"2026-07-26T09:15:00Z","actor":"EH","action":"attach","itemKey":"seed-metar-EGKK-250726","itemId":"SEED-DEF-ENG-2026-EW-0201-1","sourceId":"aviationweather-metar-taf","summary":"METAR EGKK 251400-251800Z sequence — CB thunderstorm activity confirmed","note":"Proactive pull — engine flagged CB activity from operational feed; sequence collected before LOC arrives.","prevHash":"0000000000000000000000000000000000000000000000000000000000000000","hash":"cf6b831ec339701c09398f0ff2af0542a53d7768f4f2b7a0e1c6b66df15877f8"}
    ]);

    /* Phase 3 · Pre-computed hash chain for the Etna evidence pack above — same
       build-time computation as Hartley's, payload shape matches
       case_audit_trail.js's _doAppend exactly (seq/ts/actor/action/itemKey/
       itemId/sourceId/summary/note/prevHash, in that key order), so "Verify
       chain" passes on first open with no runtime rehashing. Verified against the
       live CaseAuditTrail.verify() in the browser, not just computed offline. */
    seedAuditChain('DEF-DEMO-ETNA-CASCADE', [
      {"seq":1,"ts":"2026-08-03T09:12:00Z","actor":"SB","action":"attach","itemKey":"seed-vaac-etna-310726","itemId":"SEED-DEF-DEMO-ETNA-CASCADE-1","sourceId":"vaac-london-qva","summary":"VAAC London ash advisory VA20260731/01 — Mt Etna eruption, ash to FL350, Catania (LICC) airspace closed","note":null,"prevHash":"0000000000000000000000000000000000000000000000000000000000000000","hash":"a1771312095fe304b3d801989c6a1d3d7d50f5c11ec73580bef0bfe0a3b723ca"},
      {"seq":2,"ts":"2026-08-03T09:18:00Z","actor":"SB","action":"attach","itemKey":"seed-notam-cta-310726","itemId":"SEED-DEF-DEMO-ETNA-CASCADE-2","sourceId":"faa-notams","summary":"NOTAM LICC A1234/26 — Catania Fontanarossa airport closed, volcanic ash, effective 31 Jul 2026 18:00Z","note":null,"prevHash":"a1771312095fe304b3d801989c6a1d3d7d50f5c11ec73580bef0bfe0a3b723ca","hash":"02172695e640797d5342d62b8db20095d05f1714dbc45a96e8b468631b797be1"},
      {"seq":3,"ts":"2026-08-03T09:24:00Z","actor":"SB","action":"attach","itemKey":"seed-atfm-cta-010826","itemId":"SEED-DEF-DEMO-ETNA-CASCADE-3","sourceId":"eurocontrol-nm-public","summary":"ATFM regulation LIRC01A — Catania airspace, volcanic ash (Etna), 31 Jul 1800Z-1 Aug 1600Z","note":null,"prevHash":"02172695e640797d5342d62b8db20095d05f1714dbc45a96e8b468631b797be1","hash":"1a1cc5db219cced70c77c3692187adbf31310335ec697221527af598f6068179"},
      {"seq":4,"ts":"2026-08-03T09:30:00Z","actor":"SB","action":"attach","itemKey":"seed-metar-licc-010826","itemId":"SEED-DEF-DEMO-ETNA-CASCADE-4","sourceId":"aviationweather-metar-taf","summary":"METAR LICC 010800Z VA PLUME OBSC SKY — volcanic ash observed, visibility reduced","note":null,"prevHash":"1a1cc5db219cced70c77c3692187adbf31310335ec697221527af598f6068179","hash":"5969d8bf52443b37f4ee6a98d24293cf70ff99b7b9f53f6cbf9d167d9e0783b3"},
      {"seq":5,"ts":"2026-08-03T09:36:00Z","actor":"SB","action":"attach","itemKey":"seed-metar-egkk-030826","itemId":"SEED-DEF-DEMO-ETNA-CASCADE-5","sourceId":"aviationweather-metar-taf","summary":"METAR EGKK 030800Z — clear conditions at LGW; cascade traced to prior sector at LICC, not local weather","note":null,"prevHash":"5969d8bf52443b37f4ee6a98d24293cf70ff99b7b9f53f6cbf9d167d9e0783b3","hash":"b455e5c20a161955f8984a405847d44b1bfa5ed80b6ed946e6d608b8e5a9228d"}
    ]);

    migrateCaseAliases(cases);
    return cases;
  }

  function getStore() {
    return loadStore();
  }

  function listCases(opts) {
    opts = opts || {};
    var store = loadStore();
    var list = Object.keys(store.cases).map(function (ref) {
      return store.cases[ref];
    });
    if (opts.stage) {
      list = list.filter(function (c) { return c.stage === opts.stage; });
    }
    if (opts.assignedTo) {
      list = list.filter(function (c) { return c.assignedTo === opts.assignedTo; });
    }
    if (opts.query) {
      var q = opts.query.toLowerCase();
      list = list.filter(function (c) {
        return [c.ref, c.claimant, c.solicitor, c.flightNum, c.route, c.disruptionType].join(' ').toLowerCase().indexOf(q) >= 0;
      });
    }
    return list.sort(function (a, b) {
      return (b.updatedAt || '').localeCompare(a.updatedAt || '');
    });
  }

  function getCase(ref) {
    ref = normaliseRef(ref);
    var store = loadStore();
    return store.cases[ref] || null;
  }

  function ensureCaseFile(meta) {
    if (!meta || !meta.ref) return null;
    var store = loadStore();
    var existing = store.cases[meta.ref];
    var now = new Date().toISOString();
    if (existing) {
      Object.keys(meta).forEach(function (k) {
        if (meta[k] != null && meta[k] !== '') existing[k] = meta[k];
      });
      existing.updatedAt = now;
    } else {
      store.cases[meta.ref] = {
        ref: meta.ref,
        claimant: meta.claimant || 'Unknown claimant',
        solicitor: meta.solicitor || '',
        flightNum: meta.flightNum || '',
        route: meta.route || '',
        dep: meta.dep || '',
        arr: meta.arr || '',
        flight: meta.flight || '',
        flightDate: meta.flightDate || '',
        jurisdiction: meta.jurisdiction || 'england-wales',
        lang: meta.lang || 'en',
        stage: meta.stage || 'intake',
        disruptionType: meta.disruptionType || '',
        value: meta.value || '',
        type: meta.type || '',
        locDate: meta.locDate || '',
        classification: meta.classification || '',
        cat: meta.cat || 'B',
        cprDaysLeft: meta.cprDaysLeft != null ? meta.cprDaysLeft : 21,
        triageNote: meta.triageNote || '',
        assignedTo: meta.assignedTo || 'SB',
        evidencePct: meta.evidencePct || 0,
        origin: meta.origin || '',
        locReady: meta.locReady != null ? !!meta.locReady : true,
        points: meta.points || [],
        caseSummary: meta.caseSummary || '',
        verdictTitle: meta.verdictTitle || '',
        verdictSub: meta.verdictSub || '',
        conditions: meta.conditions || [],
        totalExposure: meta.totalExposure != null ? meta.totalExposure : null,
        limitationDeadline: meta.limitationDeadline || null,
        createdAt: now,
        updatedAt: now,
        documents: [],
        activity: [{ text: 'Live case file created', time: new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }), type: 'create', by: meta.uploadedByName || 'System' }],
      };
      // Preserve additional handoff / engine fields on create
      Object.keys(meta).forEach(function (k) {
        if (store.cases[meta.ref][k] == null && meta[k] != null && meta[k] !== '') {
          store.cases[meta.ref][k] = meta[k];
        }
      });
      addAuditEntry('Case file created: ' + meta.ref + ' — ' + (meta.claimant || ''), 'create', meta.uploadedByName || 'System', meta.ref);
    }
    saveStore(store);
    return store.cases[meta.ref];
  }

  function updateCaseMeta(ref, meta) {
    var store = loadStore();
    if (!store.cases[ref]) return null;
    Object.keys(meta).forEach(function (k) {
      store.cases[ref][k] = meta[k];
    });
    store.cases[ref].updatedAt = new Date().toISOString();
    saveStore(store);
    return store.cases[ref];
  }

  function getDocuments(ref, folderId) {
    var c = getCase(ref);
    if (!c) return [];
    var docs = c.documents || [];
    if (folderId && folderId !== 'all') {
      docs = docs.filter(function (d) { return d.folderId === folderId; });
    }
    return docs.slice();
  }

  function getDocument(ref, docId) {
    var c = getCase(ref);
    if (!c) return null;
    for (var i = 0; i < c.documents.length; i++) {
      if (c.documents[i].id === docId) return c.documents[i];
    }
    return null;
  }

  function findByDocKey(ref, docKey) {
    return getDocuments(ref).find(function (d) {
      return d.docKey === docKey;
    }) || null;
  }

  function isDocInCaseFile(ref, docKey) {
    return !!findByDocKey(ref, docKey);
  }

  function addDocument(ref, doc) {
    var store = loadStore();
    if (!store.cases[ref]) return null;
    var id = doc.id || 'cf-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
    var entry = mkDoc(id, doc.folderId || 'correspondence', doc.name || 'Document', doc);
    store.cases[ref].documents.unshift(entry);
    store.cases[ref].updatedAt = new Date().toISOString();
    addAuditEntry('Document added to ' + ref + ': ' + entry.name, 'upload', entry.uploadedByName || 'User', ref);
    saveStore(store);
    return entry;
  }

  function updateDocument(ref, docId, updates) {
    var store = loadStore();
    var c = store.cases[ref];
    if (!c) return null;
    for (var i = 0; i < c.documents.length; i++) {
      if (c.documents[i].id === docId) {
        Object.keys(updates).forEach(function (k) {
          c.documents[i][k] = updates[k];
        });
        if (updates.content) c.documents[i].size = updates.content.length;
        c.documents[i].updatedAt = new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        c.updatedAt = new Date().toISOString();
        addAuditEntry('Document updated in ' + ref + ': ' + c.documents[i].name, 'edit', updates.uploadedByName || 'User', ref);
        saveStore(store);
        return c.documents[i];
      }
    }
    return null;
  }

  function addActivity(ref, text, type, by) {
    var store = loadStore();
    if (!store.cases[ref]) return;
    store.cases[ref].activity = store.cases[ref].activity || [];
    store.cases[ref].activity.unshift({
      text: text,
      time: new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      type: type || 'action',
      by: by || 'User',
    });
    store.cases[ref].activity = store.cases[ref].activity.slice(0, 50);
    store.cases[ref].updatedAt = new Date().toISOString();
    saveStore(store);
  }

  function addAuditEntry(text, type, by, ref) {
    var store = loadStore();
    store.audit = store.audit || [];
    store.audit.unshift({
      t: text,
      type: type || 'action',
      time: new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
      by: by || 'User',
      ref: ref || '',
    });
    store.audit = store.audit.slice(0, 100);
    saveStore(store);
  }

  function getAuditLog(ref) {
    var store = loadStore();
    if (!ref) return store.audit.slice();
    return store.audit.filter(function (e) { return !e.ref || e.ref === ref; }).slice();
  }

  function getFolderCounts(ref) {
    var counts = { all: 0 };
    CASE_FOLDERS.forEach(function (f) { counts[f.id] = 0; });
    getDocuments(ref).forEach(function (d) {
      counts.all++;
      if (counts[d.folderId] != null) counts[d.folderId]++;
    });
    return counts;
  }

  /**
   * Create a rich Manage case from an engine Case Handoff Pack.
   * Delegates to DefendAbleCaseHandoff.fileIntoManage when available.
   */
  function fileFromEngineHandoff(pack) {
    if (typeof DefendAbleCaseHandoff !== 'undefined' && DefendAbleCaseHandoff.fileIntoManage) {
      return DefendAbleCaseHandoff.fileIntoManage(pack);
    }
    throw new Error('DefendAbleCaseHandoff.fileIntoManage unavailable');
  }

  function saveDraftToCaseFile(ref, docKey, name, content, meta) {
    meta = meta || {};
    var existing = findByDocKey(ref, docKey);
    if (existing) {
      return updateDocument(ref, existing.id, {
        content: content,
        status: meta.status || 'approved',
        name: name,
        uploadedBy: meta.uploadedBy,
        uploadedByName: meta.uploadedByName,
      });
    }
    return addDocument(ref, {
      folderId: meta.folderId || 'legal_drafts',
      name: name,
      docKey: docKey,
      filename: ref + '-' + (name || docKey).replace(/\s+/g, '-') + '.txt',
      content: content,
      status: meta.status || 'approved',
      source: 'drafting',
      uploadedBy: meta.uploadedBy,
      uploadedByName: meta.uploadedByName,
    });
  }

  function formatSize(bytes) {
    if (!bytes) return '—';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return Math.round(bytes / 1024) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }

  function stageLabel(stage) {
    var labels = {
      intake: 'Intake',
      triage: 'Triage',
      cpr: 'CPR',
      evidence: 'Evidence',
      drafting: 'Drafting',
      defence: 'Defence',
      resolve: 'Resolved',
    };
    return labels[stage] || stage;
  }

  global.CaseFiling = {
    STORAGE_KEY: STORAGE_KEY,
    CASE_FOLDERS: CASE_FOLDERS,
    folderById: folderById,
    listCases: listCases,
    getCase: getCase,
    ensureCaseFile: ensureCaseFile,
    updateCaseMeta: updateCaseMeta,
    getDocuments: getDocuments,
    getDocument: getDocument,
    findByDocKey: findByDocKey,
    isDocInCaseFile: isDocInCaseFile,
    addDocument: addDocument,
    updateDocument: updateDocument,
    addActivity: addActivity,
    getAuditLog: getAuditLog,
    getFolderCounts: getFolderCounts,
    saveDraftToCaseFile: saveDraftToCaseFile,
    fileFromEngineHandoff: fileFromEngineHandoff,
    formatSize: formatSize,
    stageLabel: stageLabel,
  };
})(typeof window !== 'undefined' ? window : this);
