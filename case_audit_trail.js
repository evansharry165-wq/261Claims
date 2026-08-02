/* case_audit_trail.js — B2A.11 · Hash-chained tamper-evident log of evidence
   attach / detach events per case.  Uses crypto.subtle (SHA-256) so the chain
   is cryptographically verifiable — every entry hashes the previous entry's
   hash + its own payload.  Persists inside case.meta.evidenceAuditTrail[].

   Public API (attached to window.CaseAuditTrail):
     .append(caseRef, event)        → Promise<entry>   – add + persist
     .list(caseRef)                 → array of entries – read
     .verify(caseRef)               → Promise<{ok, breaks[]}> – recompute chain
     .lastHash(caseRef)             → string | null
     .genesisHash()                 → string           – hash of the empty chain
*/
(function (global) {
  'use strict';

  var STORAGE_META_KEY = 'evidenceAuditTrail';
  var GENESIS = '0000000000000000000000000000000000000000000000000000000000000000';

  /* ── crypto ───────────────────────────────────────────────────────── */
  function sha256(text){
    try {
      if (global.crypto && global.crypto.subtle && global.crypto.subtle.digest){
        var buf = new TextEncoder().encode(text);
        return global.crypto.subtle.digest('SHA-256', buf).then(function(hashBuf){
          return Array.prototype.map.call(new Uint8Array(hashBuf), function(b){
            return b.toString(16).padStart(2, '0');
          }).join('');
        });
      }
    } catch (e){}
    /* Fallback for non-browser environments — FNV-1a 64-bit hex.
       Not cryptographic, but chain integrity is still deterministic. */
    var h1 = 0x811c9dc5, h2 = 0x84222325;
    for (var i = 0; i < text.length; i++){
      var c = text.charCodeAt(i);
      h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
      h2 = Math.imul(h2 ^ c, 0x01000193) >>> 0;
    }
    var hex = h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0');
    while (hex.length < 64) hex += hex;
    return Promise.resolve(hex.slice(0, 64));
  }

  /* ── persistence ─────────────────────────────────────────────────── */
  function readChain(caseRef){
    if (!global.CaseFiling || !global.CaseFiling.getCase) return [];
    var c = global.CaseFiling.getCase(caseRef);
    if (!c || !c.meta) return [];
    var chain = c.meta[STORAGE_META_KEY];
    return Array.isArray(chain) ? chain : [];
  }
  function writeChain(caseRef, chain){
    if (!global.CaseFiling || !global.CaseFiling.updateCaseMeta || !global.CaseFiling.getCase) return;
    var c = global.CaseFiling.getCase(caseRef);
    var existingMeta = (c && c.meta) ? c.meta : {};
    var newMeta = Object.assign({}, existingMeta);
    newMeta[STORAGE_META_KEY] = chain;
    global.CaseFiling.updateCaseMeta(caseRef, { meta: newMeta });
  }

  function lastHash(caseRef){
    var chain = readChain(caseRef);
    return chain.length ? chain[chain.length - 1].hash : GENESIS;
  }

  /* ── append ──────────────────────────────────────────────────────── */
  /* P2 · Per-case promise-lock — serialises concurrent appends so rapid attaches
     can't produce two entries that both compute prevHash=GENESIS (which would
     cause the second write to clobber the first via the whole-meta overwrite in
     writeChain). Each caseRef gets its own promise chain; new appends wait for
     any in-flight append on the same case to finish before reading the chain. */
  var _lockChains = {};

  function _doAppend(caseRef, event){
    var chain = readChain(caseRef);
    var prevHash = chain.length ? chain[chain.length - 1].hash : GENESIS;
    var actor = (global.getActiveUser && global.getActiveUser()) || 'unknown';
    var entry = {
      seq:        chain.length + 1,
      ts:         new Date().toISOString(),
      actor:      actor,
      action:     event.action || 'unknown',
      itemKey:    event.itemKey || null,
      itemId:     event.itemId || null,
      sourceId:   event.sourceId || null,
      summary:    event.summary || null,
      note:       event.note || null,
      prevHash:   prevHash,
    };
    var payload = JSON.stringify({
      seq: entry.seq, ts: entry.ts, actor: entry.actor, action: entry.action,
      itemKey: entry.itemKey, itemId: entry.itemId, sourceId: entry.sourceId,
      summary: entry.summary, note: entry.note, prevHash: entry.prevHash,
    });
    return sha256(payload).then(function(hash){
      entry.hash = hash;
      chain.push(entry);
      writeChain(caseRef, chain);
      return entry;
    });
  }

  function append(caseRef, event){
    var prior = _lockChains[caseRef] || Promise.resolve();
    var next = prior.then(function(){ return _doAppend(caseRef, event); });
    // Keep the lock alive even if this append rejects — don't break the chain.
    _lockChains[caseRef] = next.catch(function(){});
    return next;
  }

  /* ── verify ──────────────────────────────────────────────────────── */
  function verify(caseRef){
    var chain = readChain(caseRef);
    if (!chain.length) return Promise.resolve({ ok: true, entries: 0, breaks: [] });
    var breaks = [];
    var prevExpected = GENESIS;
    var i = 0;
    function next(){
      if (i >= chain.length) return { ok: breaks.length === 0, entries: chain.length, breaks: breaks };
      var entry = chain[i];
      if (entry.prevHash !== prevExpected){
        breaks.push({ seq: entry.seq, reason: 'prevHash mismatch', expected: prevExpected, actual: entry.prevHash });
      }
      var payload = JSON.stringify({
        seq: entry.seq, ts: entry.ts, actor: entry.actor, action: entry.action,
        itemKey: entry.itemKey, itemId: entry.itemId, sourceId: entry.sourceId,
        summary: entry.summary, note: entry.note, prevHash: entry.prevHash,
      });
      return sha256(payload).then(function(hash){
        if (hash !== entry.hash){
          breaks.push({ seq: entry.seq, reason: 'hash mismatch', expected: hash, actual: entry.hash });
        }
        prevExpected = entry.hash;
        i += 1;
        return next();
      });
    }
    return Promise.resolve().then(next);
  }

  function list(caseRef){ return readChain(caseRef); }
  function genesisHash(){ return GENESIS; }

  global.CaseAuditTrail = {
    append:      append,
    list:        list,
    verify:      verify,
    lastHash:    lastHash,
    genesisHash: genesisHash,
  };
})(typeof window !== 'undefined' ? window : this);
