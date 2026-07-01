/* DefendAble Intelligence Engine v2 — Pass 2 demo enrichment */
var DefendAblePass2 = (function () {

  function inferFindingsFromEvidence(ev) {
    var text = ((ev.name || '') + ' ' + (ev.whatItProves || '') + ' ' + (ev.source || '')).toLowerCase();
    var findings = [];
    if (/ctot|atfm|eurocontrol|flow control/.test(text)) {
      findings.push({ type: 'TOPS_CTOT_CONFIRMED', description: ev.whatItProves || 'CTOT/ATFM restriction confirmed' });
    }
    if (/delay code|81-89|codes 81/.test(text)) {
      findings.push({ type: 'TOPS_DELAY_CODE_81_89', description: 'ATC delay codes 81-89 recorded' });
    }
    if (/below minima|metar|thunderstorm|weather/.test(text)) {
      findings.push({ type: 'METAR_BELOW_ILS_MINIMA', description: ev.whatItProves || 'Destination weather below minima' });
    }
    if (/sigmet/.test(text)) findings.push({ type: 'SIGMET_IN_FORCE', description: 'SIGMET corroboration' });
    if (/fdp elevated|elevated before/.test(text)) {
      findings.push({ type: 'AIMS_FDP_ELEVATED_BEFORE_DISRUPTION', description: 'FDP elevated before disruption' });
    }
    if (/no prior defect|no prior ad|inspection/.test(text)) {
      findings.push({ type: 'AMOS_NO_PRIOR_DEFECT', description: 'No prior defect on component' });
    }
    if (/category a|mel category a/.test(text)) {
      findings.push({ type: 'AMOS_MEL_CATEGORY_A', description: 'MEL Category A — no dispatch' });
    }
    if (/police|external authority/.test(text)) {
      findings.push({ type: 'POLICE_EXTERNAL_AUTHORITY', description: 'External authority involvement' });
    }
    if (/cross.?carrier|flightstats|all carriers/.test(text)) {
      findings.push({ type: 'FLIGHTSTATS_MULTI_CARRIER_IMPACT', description: 'Systemic multi-carrier impact' });
    }
    if (/positioning/.test(text)) {
      findings.push({ type: 'TOPS_POSITIONING_FLIGHT', description: 'Positioning flight identified' });
    }
    if (/prior sector|rotation|cascade/.test(text)) {
      findings.push({ type: 'TOPS_PRIOR_SECTOR_DELAY', description: 'Prior sector delay in rotation' });
    }
    if (/ond|overnight|next day/.test(text)) {
      findings.push({ type: 'TOPS_OND', description: 'Overnight/next-day operation' });
    }
    if (/diversion/.test(text)) {
      findings.push({ type: 'TOPS_DIVERSION', description: 'Diversion event' });
    }
    if (/birdstrike|bird strike/.test(text)) {
      findings.push({ type: 'AMOS_BIRDSTRIKE', description: 'Birdstrike event' });
    }
    if (!findings.length) {
      findings.push({ type: 'EVIDENCE_RECEIVED', description: ev.whatItProves || ev.name || 'Evidence collected' });
    }
    return findings;
  }

  function upsertPackItem(pack, item) {
    var reg = typeof DefendAbleRegistry !== 'undefined' ? DefendAbleRegistry : null;
    var id = item.evidenceId || (reg ? reg.deriveEvidenceId(item.name, item.source) : item.name);
    var idx = -1;
    for (var i = 0; i < pack.length; i++) {
      if (pack[i].evidenceId && item.evidenceId && pack[i].evidenceId === item.evidenceId) {
        idx = i;
        break;
      }
      var existingId = pack[i].evidenceId || (reg ? reg.deriveEvidenceId(pack[i].name, pack[i].source) : pack[i].name);
      if (existingId === id) { idx = i; break; }
    }
    if (idx >= 0) {
      pack[idx] = Object.assign({}, pack[idx], item, { evidenceId: id });
    } else {
      pack.push(Object.assign({}, item, { evidenceId: id }));
    }
  }

  function enrichAtcEvidencePack(pass2, iccText, scenario) {
    if (typeof DefendAbleEvidencePack === 'undefined') return;
    var disruptionType = DefendAbleEvidencePack.detectDisruptionType(iccText);
    if (!disruptionType) return;

    var chain = pass2.updatedCausalChain || [];
    var collectedById = {};
    var missingById = {};
    (scenario.collected || []).forEach(function (item) {
      collectedById[item.id] = item;
    });
    (scenario.missing || []).forEach(function (eid) {
      missingById[eid] = true;
    });

    var packIds = {};
    DefendAbleEvidencePack.getPackItems(disruptionType).forEach(function (item) {
      packIds[item.evidenceId] = true;
    });
    var retained = (pass2.evidencePack || []).filter(function (e) {
      var id = e.evidenceId || (typeof DefendAbleRegistry !== 'undefined'
        ? DefendAbleRegistry.deriveEvidenceId(e.name, e.source) : e.name);
      return !packIds[id];
    });
    pass2.evidencePack = retained;

    DefendAbleEvidencePack.getPackItems(disruptionType).forEach(function (item) {
      var status = 'requested';
      var findings = item.findings;
      if (collectedById[item.evidenceId]) {
        status = 'collected';
        findings = collectedById[item.evidenceId].findings || findings;
      } else if (missingById[item.evidenceId]) {
        status = 'missing';
      }

      var packItem = {
        status: status,
        name: item.name,
        source: item.system,
        chainEventRef: chain[0] ? chain[0].id : 'E1',
        tier: item.tier,
        tierLabel: item.tierLabel,
        libKey: item.libKey,
        evidenceId: item.evidenceId,
        priority: item.tier === 'K' ? 'critical' : item.tier === 'S' ? 'high' : 'medium'
      };
      if (status === 'collected') {
        packItem.whatItProves = (findings[0] && findings[0].description) || item.name;
        packItem.findings = findings;
      } else if (status === 'missing') {
        packItem.absenceConsequence = (typeof DefendAbleEvidence !== 'undefined' && DefendAbleEvidence.ABSENCE_CONSEQUENCES[item.evidenceId])
          ? DefendAbleEvidence.ABSENCE_CONSEQUENCES[item.evidenceId].consequence
          : 'Evidence gap — adverse inference risk';
      }
      upsertPackItem(pass2.evidencePack, packItem);
    });
  }

  function buildEvidenceRequiredForEvent(ev, iccText) {
    var reg = typeof DefendAbleRegistry !== 'undefined' ? DefendAbleRegistry : null;
    var desc = (ev.description || '').toLowerCase();
    var required = [];
    if (reg) {
      reg.CHAIN_EVIDENCE_TRIGGERS.forEach(function (tr) {
        if (tr.pattern.test(desc)) {
          tr.evidenceIds.forEach(function (eid) {
            var meta = reg.getEvidenceMeta(eid);
            required.push({
              evidenceType: meta.name,
              system: meta.system,
              whatItProves: 'Required to establish facts at ' + (ev.id || 'event'),
              priority: 'CRITICAL',
              status: 'PENDING'
            });
          });
        }
      });
    }
    if (!required.length) {
      required.push({
        evidenceType: 'TOPS Delay Record',
        system: 'TOPS',
        whatItProves: 'Delay duration and cause',
        priority: 'CRITICAL',
        status: 'PENDING'
      });
    }
    return required;
  }

  function enrichPass2ForDemo(pass1, pass2, iccText) {
    pass2 = pass2 ? Object.assign({}, pass2) : {};
    pass2.evidencePack = (pass2.evidencePack || []).slice();
    var chain = (pass1 && pass1.causalChain) || pass2.updatedCausalChain || [];
    var reg = typeof DefendAbleRegistry !== 'undefined' ? DefendAbleRegistry : null;
    var scenario = reg ? reg.matchDemoEvidenceScenario(iccText || '') : { collected: [], missing: [] };

    enrichAtcEvidencePack(pass2, iccText, scenario);

    scenario.collected.forEach(function (item) {
      var meta = reg ? reg.getEvidenceMeta(item.id) : { name: item.id, system: 'TOPS' };
      upsertPackItem(pass2.evidencePack, {
        status: 'collected',
        name: meta.name,
        source: meta.system,
        chainEventRef: chain[0] ? chain[0].id : 'E1',
        whatItProves: (item.findings[0] && item.findings[0].description) || 'Demo repository match',
        priority: 'critical',
        findings: item.findings
      });
    });

    scenario.missing.forEach(function (eid) {
      var meta = reg ? reg.getEvidenceMeta(eid) : { name: eid, system: 'Unknown' };
      upsertPackItem(pass2.evidencePack, {
        status: 'missing',
        name: meta.name,
        source: meta.system,
        chainEventRef: chain[chain.length - 1] ? chain[chain.length - 1].id : 'E1',
        absenceConsequence: (typeof DefendAbleEvidence !== 'undefined' && DefendAbleEvidence.ABSENCE_CONSEQUENCES[eid])
          ? DefendAbleEvidence.ABSENCE_CONSEQUENCES[eid].consequence : 'Evidence gap — adverse inference risk',
        priority: 'critical'
      });
    });

    pass2.updatedCausalChain = chain.map(function (ev) {
      var copy = Object.assign({}, ev);
      copy.evidenceRequired = buildEvidenceRequiredForEvent(ev, iccText);
      return copy;
    });

    if (!pass2.dynamicEvidenceRequests) pass2.dynamicEvidenceRequests = [];
    if (scenario.collected.some(function (c) {
      return (c.findings || []).some(function (f) { return f.type === 'TOPS_PRIOR_SECTOR_DELAY'; });
    })) {
      pass2.dynamicEvidenceRequests.push({
        trigger: 'Prior sector delay identified in TOPS',
        evidenceRequested: 'TOPS Full Tail Line of Flying',
        system: 'TOPS',
        chainEventRef: chain[0] ? chain[0].id : 'E1',
        priority: 'CRITICAL',
        legalReason: 'Full rotation required to establish cascade root cause'
      });
    }

    return pass2;
  }

  return {
    enrichPass2ForDemo: enrichPass2ForDemo,
    enrichAtcEvidencePack: enrichAtcEvidencePack,
    inferFindingsFromEvidence: inferFindingsFromEvidence,
    buildEvidenceRequiredForEvent: buildEvidenceRequiredForEvent
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DefendAblePass2;
}
