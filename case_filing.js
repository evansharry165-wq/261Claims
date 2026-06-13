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
        createdAt: now,
        updatedAt: now,
        documents: [],
        activity: [{ text: 'Live case file created', time: new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }), type: 'create', by: meta.uploadedByName || 'System' }],
      };
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
    return getDocuments(ref, 'legal_drafts').concat(getDocuments(ref, 'correspondence')).find(function (d) {
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
    formatSize: formatSize,
    stageLabel: stageLabel,
  };
})(typeof window !== 'undefined' ? window : this);
