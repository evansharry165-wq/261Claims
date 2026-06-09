/**
 * Case Filing System — live case files for active matters.
 * Intake creates a case file; drafting and deposits add documents;
 * Repository Cases area browses, views and edits the full file.
 * Persisted in localStorage (261c_case_filing).
 */
(function (global) {
  'use strict';

  var STORAGE_KEY = '261c_case_filing';
  var VERSION = 1;

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

    if (cases['AC-2026-0089']) {
      var h = cases['AC-2026-0089'];
      h.documents = [
        mkDoc('cf-h-001', 'intake', 'Letter of Claim — Hartley', {
          filename: 'Hartley_LOC_22May2026.pdf',
          content: 'LETTER OF CLAIM\n\nDaniel Hartley v TestAirways\nFlight HC 1184 LTN–BCN, 14 March 2026\n\nClaim for delay, diversion to Valencia, consequential loss £38,250 and expenses £141.80 under EC Regulation 261/2004.',
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
          filename: 'AC-2026-0089-Letter-of-Acknowledgement.txt',
          content: 'Letter of Acknowledgement sent to Pemberton & Associates — CPR Pre-Action Protocol compliance.',
          status: 'approved',
          source: 'drafting',
          uploadedBy: 'SB',
          uploadedByName: 'Sarah Booth',
          uploadedAt: '24 May 2026 11:30',
        }),
        mkDoc('cf-h-003', 'evidence_index', 'Evidence pack index — HC 1184', {
          filename: 'AC-2026-0089-Evidence-Index.txt',
          content: 'Evidence on file (70%):\n• TOPS flight details — on file\n• DISCO disruption record — on file\n• METAR/SIGMET BCN — on file\n• Eurocontrol ATFM — on file\n• Valencia ground records — requested',
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
        { text: 'Evidence pack 70% — drafting in progress', time: '04 Jun 2026 14:20', type: 'stage', by: 'E. Hughes' }
      );
      h.evidencePct = 70;
      h.stage = 'drafting';
    }

    if (cases['AC-2026-0076']) {
      cases['AC-2026-0076'].documents.push(
        mkDoc('cf-t-001', 'intake', 'Letter of Claim — Foster', {
          filename: 'Foster_LOC.pdf',
          content: 'LOC for Angela Foster — HC 203 LGW–ALC weather delay.',
          status: 'on_file',
          source: 'intake',
        })
      );
    }

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
        jurisdiction: meta.jurisdiction || 'england-wales',
        stage: meta.stage || 'intake',
        disruptionType: meta.disruptionType || '',
        value: meta.value || '',
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
