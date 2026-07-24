/**
 * DefendAble — Case Handoff Pack (Analyse + Decide → Manage)
 * Editable review surface before Confirm creates a live Manage case.
 */
var DefendAbleCaseHandoff = (function () {
  'use strict';

  var DRAFT_KEY = 'dfa_handoff_draft';
  var VALID_FOLDERS = { intake: 1, correspondence: 1, legal_drafts: 1, evidence_index: 1, activity: 1 };

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function plainVerdict(pos) {
    if (typeof DefendAbleDecideWorkspace !== 'undefined' && DefendAbleDecideWorkspace.plainVerdict) {
      return DefendAbleDecideWorkspace.plainVerdict(pos);
    }
    var v = (pos && (pos.verdict || pos.frameworkLabel)) || 'Position pending';
    return { title: String(v).replace(/_/g, ' '), sub: (pos && pos.text) || '' };
  }

  function evidenceChecklist(record) {
    var marks = record && record.tlEvStatus ? record.tlEvStatus : {};
    return Object.keys(marks).map(function (key) {
      return { key: key, status: marks[key] || 'missing', note: '' };
    });
  }

  function buildCritNotes(record, run) {
    var actions = [];
    if (typeof DefendAbleDecideWorkspace !== 'undefined' && DefendAbleDecideWorkspace.buildCritActionList) {
      actions = DefendAbleDecideWorkspace.buildCritActionList(record, run) || [];
    }
    return actions.map(function (a) {
      return {
        badge: a.badge || 'IMPO',
        text: a.text || '',
        system: a.system || '',
        statusNote: ''
      };
    });
  }

  function suggestStage(pos) {
    if (!pos) return 'triage';
    if (pos.conditionType === 'EVIDENCE_HOLD') return 'evidence';
    var v = pos.verdict || '';
    if (v === 'DEFEND' || v === 'DEFEND_WITH_CONDITIONS') return 'triage';
    if (v === 'INVESTIGATE' || v === 'JUDGMENT_REQUIRED') return 'evidence';
    if (v === 'ESCALATE') return 'triage';
    return 'triage';
  }

  function suggestRef(facts, lofRows) {
    var flight = (facts && facts.flightNum) ||
      (lofRows && lofRows[0] && lofRows[0].flight) ||
      'UNKNOWN';
    flight = String(flight).replace(/\s+/g, '');
    return 'DA-' + flight + '-' + String(Date.now()).slice(-6);
  }

  /* ── Plain-English case summary — for the case-page viewer.
     Structure: (1) one-paragraph what-happened for a first-time reader,
     (2) linear numbered timeline of the tail's day (one line per sector),
     (3) blank line separator, (4) evidence-you-need-to-collect list.
     The blank line is what lets the case-page viewer split the doc into
     'What happened' + 'Evidence you need to collect' sections cleanly. */
  function buildCaseSummary(record, run, brief) {
    var facts = (record && record.facts) || {};
    var rotation = (facts.rotation || []).slice().sort(function (a, b) {
      return String(a.std || '').localeCompare(String(b.std || ''));
    });
    var claimed = rotation.find(function (r) { return r.fno === facts.flightNum; }) || facts;
    var root = facts.rootCause || null;
    var pos = (run && (run.position || run.preRating)) || {};
    var lines = [];

    // Paragraph 1 — plain what-happened, 2-3 sentences
    var story = '';
    var routeStr = (facts.depIata && facts.arrIata) ? (facts.depIata + '–' + facts.arrIata) : '';
    var date = facts.date || facts.flightDate || '';
    var whatHappened =
      claimed.isCancelled || claimed.status === 'CANCELLED'
        ? ('flight ' + facts.flightNum + ' (' + routeStr + ', ' + date + ') was cancelled')
      : claimed.isDiverted || claimed.status === 'DIVERTED'
        ? ('flight ' + facts.flightNum + ' (' + routeStr + ', ' + date + ') was diverted to ' + (facts.divertedTo || 'an alternate airport'))
      : (facts.delayMins != null && facts.delayMins > 0)
        ? ('flight ' + facts.flightNum + ' (' + routeStr + ', ' + date + ') arrived ' + facts.delayMins + ' minutes late at ' + facts.arrIata)
        : ('flight ' + facts.flightNum + ' (' + routeStr + ', ' + date + ') was disrupted');
    var claimedSector = 'On the day in question, ' + whatHappened + '.';
    var rootSector = '';
    if (root && root.fno && root.fno !== facts.flightNum) {
      rootSector = ' The event began earlier in the day on the same aircraft: ' + root.fno + ' (' + (root.frm || '') + '–' + (root.to || '') + ') suffered ' + (String(root.reason || 'a disruption').toLowerCase()) + ', which propagated to the claimed sector.';
    }
    var mass = facts.mass && facts.mass.code
      ? ' This forms part of a wider disruption event (' + facts.mass.code + (facts.mass.note ? ' — ' + facts.mass.note : '') + ').'
      : '';
    lines.push(claimedSector + rootSector + mass);

    // Numbered linear timeline
    if (rotation.length) {
      lines.push('');
      lines.push('Timeline of the aircraft\'s day:');
      rotation.forEach(function (r, i) {
        var st = r.status === 'ON TIME' ? 'operated on time'
          : r.status === 'CANCELLED' ? 'CANCELLED'
          : r.status === 'DIVERTED' ? ('DIVERTED to ' + (r.divTo || 'alternate'))
          : r.status === 'DELAYED' ? ('DELAYED by ' + (r.arrDelay || 0) + ' minutes')
          : 'operated';
        var flag = (r.fno === facts.flightNum) ? '  ← the claim' : '';
        lines.push('  ' + (i + 1) + '. ' + r.fno + '  ' + (r.frm || '') + ' → ' + (r.to || '') + '  ·  ' + st + flag);
      });
    }

    // Blank line separator — case-page viewer uses this to split into two sections
    lines.push('');

    // Evidence-you-need-to-collect paragraph
    var evStr = 'The evidence you need to gather to defend this claim is set out below.';
    var missing = [];
    (record.evidenceMarks || []).forEach(function (m) {
      var held = (m.status === 'available' || m.status === 'on_file' || m.status === 'held');
      if (!held) missing.push(m.name || m.label || m.key);
    });
    // Add tree-gate gaps if any
    ((run && run.treeResults) || []).forEach(function (t) {
      (t.gates || []).forEach(function (g) {
        (g.gaps || []).forEach(function (gap) {
          var lbl = String(gap.label || gap.name || gap || '').trim();
          if (!lbl) return;
          if (missing.indexOf(lbl) < 0) missing.push(lbl);
        });
      });
    });
    if (missing.length) {
      evStr += ' The following documents are outstanding and should be requested via the Evidence workspace: ' + missing.slice(0, 6).join('; ') + '.';
    } else {
      evStr += ' All essential documents already appear on file.';
    }
    evStr += ' Once the evidence pack is complete, the defence letter can be drafted in the Documents workspace.';
    lines.push(evStr);

    return lines.join('\n');
  }

  function buildTriageNote(pos, critNotes) {
    var bits = [];
    if (pos && pos.conditionType) bits.push(pos.conditionType);
    if (pos && pos.conditions && pos.conditions.length) bits.push(pos.conditions.join('; '));
    (critNotes || []).slice(0, 4).forEach(function (c) {
      if (c.badge === 'CRIT' && c.text) bits.push('CRIT: ' + c.text);
    });
    return bits.join(' · ');
  }

  /**
   * Build handoff pack from confirmed LOF + Decide run.
   * opts: { quantumBand, limitation, claimants, assignee }
   */
  function buildPack(record, run, opts) {
    opts = opts || {};
    record = record || {};
    run = run || {};
    var pos = run.position || run.preRating || {};
    var facts = record.facts || {};
    var brief = plainVerdict(pos);
    var trail = null;
    if (typeof DefendAbleDecideWorkspace !== 'undefined' && DefendAbleDecideWorkspace.buildThinkingTrail) {
      trail = DefendAbleDecideWorkspace.buildThinkingTrail(record, run);
    }
    var critNotes = buildCritNotes(record, run);
    var authorities = run.authorities || [];
    var flightNum = facts.flightNum || ((record.lofRows && record.lofRows[0] && record.lofRows[0].flight) || '');
    var route = (facts.depIata && facts.arrIata)
      ? (facts.depIata + ' → ' + facts.arrIata)
      : ((record.lofRows && record.lofRows[0] && record.lofRows[0].route) || '');
    var delay = '';
    if (facts.delayMinutes != null) delay = facts.delayMinutes + ' min';
    else if (facts.delay) delay = String(facts.delay);

    var pack = {
      schemaVersion: 1,
      type: 'case_handoff_pack',
      createdAt: new Date().toISOString(),
      factsSection: {
        flightNum: flightNum,
        route: route,
        flightDate: facts.date || '',
        delay: delay,
        jurisdiction: record.jurisdiction || 'UK261',
        lofRows: (record.lofRows || []).slice(),
        lockedNarrative: record.lockedNarrative || '',
        causalLabels: ((record.causalChain || []).filter(function (e) {
          return e && e.type !== 'sector';
        }).map(function (e, i) {
          return 'E' + (i + 1) + ': ' + (e.label || e.description || '');
        })),
        evidenceMarks: evidenceChecklist(record),
        factsNotes: ''
      },
      decideSection: {
        verdictTitle: brief.title,
        verdictSub: brief.sub,
        frameworkLabel: pos.frameworkLabel || pos.verdict || '',
        verdict: pos.verdict || '',
        conditionType: pos.conditionType || null,
        conditions: (pos.conditions || []).slice(),
        thinkingTrail: trail,
        critNotes: critNotes,
        authorities: authorities,
        g1: record.g1 || null
      },
      meta: {
        claimant: '',
        solicitor: '',
        caseRef: suggestRef(facts, record.lofRows),
        assignedTo: opts.assignee || 'SB',
        stage: suggestStage(pos),
        locReady: false,
        caseSummary: buildCaseSummary(record, run, brief),
        triageNote: buildTriageNote(pos, critNotes),
        classification: pos.frameworkLabel || pos.verdict || 'JUDGMENT REQUIRED',
        disruptionType: record.dtId || '',
        totalExposure: null,
        limitationDeadline: null,
        value: ''
      },
      source: {
        record: record,
        run: run
      }
    };

    if (opts.quantumBand) {
      var band = opts.quantumBand;
      var n = opts.claimants || 1;
      pack.meta.value = '€' + (band.eur * n) + ' / £' + (band.gbp * n);
      pack.meta.totalExposure = pack.meta.value;
    }
    if (opts.limitation && opts.limitation.expiry) {
      pack.meta.limitationDeadline = opts.limitation.expiry.toISOString
        ? opts.limitation.expiry.toISOString().slice(0, 10)
        : String(opts.limitation.expiry);
    }

    return pack;
  }

  function calcEvidencePct(marks) {
    marks = marks || [];
    if (!marks.length) return 0;
    var avail = marks.filter(function (m) { return m.status === 'available'; }).length;
    var req = marks.filter(function (m) { return m.status === 'requested'; }).length;
    return Math.round(((avail + req * 0.35) / marks.length) * 100);
  }

  function pointsFromPack(pack) {
    var points = [];
    var n = 1;
    (pack.decideSection.conditions || []).forEach(function (c) {
      points.push({
        n: n++,
        claim: c,
        evidenceStatus: pack.decideSection.conditionType === 'EVIDENCE_HOLD' ? 'amber' : 'amber',
        evidenceDoc: 'Condition before final response'
      });
    });
    (pack.decideSection.critNotes || []).forEach(function (c) {
      points.push({
        n: n++,
        claim: (c.badge ? c.badge + ' — ' : '') + c.text,
        evidenceStatus: c.badge === 'CRIT' ? 'red' : 'amber',
        evidenceDoc: c.statusNote || c.system || 'Engine priority'
      });
    });
    (pack.factsSection.evidenceMarks || []).forEach(function (m) {
      var status = m.status === 'available' ? 'green' : (m.status === 'requested' ? 'amber' : 'red');
      points.push({
        n: n++,
        claim: m.key,
        evidenceStatus: status,
        evidenceDoc: m.note || ('Marked ' + m.status)
      });
    });
    return points;
  }

  function legalPositionText(pack) {
    // Plain-English legal position — the professional lawyer's document that
    // sits in the case file. Structured so a lawyer new to the case can pick
    // it up and know: what happened, why we can (or can't) defend it, what
    // evidence proves that, and what to do next.
    var d = pack.decideSection || {};
    var m = pack.meta || {};
    var f = pack.factsSection || {};
    var lines = [];

    // Header
    lines.push('LEGAL POSITION');
    lines.push('Case ' + (m.caseRef || '') + (m.claimant ? ' — ' + m.claimant : ''));
    lines.push('Flight ' + (f.flightNum || '') + '  ·  ' + (f.route || '') + '  ·  ' + (f.flightDate || ''));
    lines.push('');
    lines.push('----------------------------------------');
    lines.push('');

    // Plain verdict + one-line rationale
    var v = String(d.verdict || d.frameworkLabel || 'JUDGMENT REQUIRED').toUpperCase();
    var word = v.indexOf('DEFEND_WITH_CONDITIONS') >= 0 || v.indexOf('CONDITIONS') >= 0 ? 'Defendable — subject to evidence'
             : v.indexOf('DEFEND_HOLD') >= 0 || v.indexOf('HOLD') >= 0 ? 'Defendable — pending evidence'
             : v.indexOf('DEFEND') >= 0 ? 'Defendable'
             : v.indexOf('SETTLE') >= 0 || v.indexOf('CONCEDE') >= 0 ? 'Consider settling'
             : 'Judgment call needed';
    lines.push('POSITION');
    lines.push(word + '.');
    lines.push('');

    // 1. What we are facing
    lines.push('1. WHAT WE ARE FACING');
    var factsPara = '';
    var causal = (f.causalLabels || []).slice();
    if (causal.length) {
      factsPara = 'The claim arises from the following sequence of events: ' + causal.map(function (c, i) { return (i + 1) + ') ' + c; }).join('; ') + '.';
    } else {
      factsPara = 'The claim arises from the disruption to flight ' + (f.flightNum || 'in question') + ' on ' + (f.flightDate || 'the date claimed') + '.';
    }
    if (m.value) factsPara += ' The passenger claim exposure on this sector is ' + m.value + '.';
    lines.push(factsPara);
    lines.push('');

    // 2. Why this is defendable (or not)
    lines.push('2. WHY THIS IS ' + (word.toUpperCase().indexOf('SETTLING') >= 0 ? 'NOT ' : '') + 'DEFENDABLE');
    var dtype = String(m.disruptionType || '').toLowerCase();
    var basisMap = {
      weather: 'Adverse meteorological conditions incompatible with the safe operation of the flight are within the Recital 14 examples of extraordinary circumstances (Wallentin-Hermann C-549/07). This is capable of engaging the Article 5(3) defence.',
      atfm: 'Air traffic management restrictions imposed by Eurocontrol or a national ATC provider are third-party decisions beyond the carrier\'s control (Moens v Ryanair C-159/18; Recital 15).',
      'third-party-ia': 'Industrial action by third parties — ATC, ANSP, airport authority, ground handlers — is generally extraordinary. Reasonable measures must show alternative providers were sought (Touristic Aviation Services C-405/23).',
      'own-ia': 'Own-staff industrial action is NOT extraordinary (Airhelp v SAS C-28/20; Krüsemann C-195/17). Compensation is payable.',
      birdstrike: 'A bird strike is extraordinary regardless of whether damage results (Pešková v Travel Service C-315/15). Every post-strike delay node must nonetheless be shown to be reasonable.',
      technical: 'Technical defects are inherent to airline operation and NOT extraordinary (Wallentin-Hermann C-549/07; Van der Lans C-257/14; Huzar [2014] EWCA Civ 791). The narrow exception is a hidden design defect confirmed by the OEM or by EASA/CAA (C-385/23 Finnair; C-411/23 D.S.A.) — this requires the airworthiness directive as evidence.',
      medical: 'A passenger medical emergency requiring the commander to divert is not inherent in airline operations and is beyond the carrier\'s control. The position follows a fortiori from LE v Transportes Aéreos Portugueses (C-74/19).',
      security: 'Security events genuinely mandated by authority — bomb threats, evacuations, government-imposed airspace restrictions — are within Recital 14. Routine screening delays are not.',
      'disruptive-pax': 'Unruly passenger conduct requiring diversion is extraordinary (LE v Transportes Aéreos Portugueses C-74/19). The reasonable measures test is strict: rerouting via third-party carriers must be shown.',
      'ground-damage': 'Where the damage originates from a third party (ground handler, airport vehicle, FOD), the defence may hold by analogy to Moens (C-159/18). Damage from the carrier\'s own operation is not extraordinary.',
      'airport-closure': 'Airport or infrastructure closure imposed by the operator or a competent authority is extraordinary (Moens C-159/18; SATA International C-308/21).',
      'natural-disaster': 'Natural disasters fall within Recital 14 (McDonagh v Ryanair C-12/11 for volcanic ash). Note: Article 9 care obligations are absolute and remain owed regardless.',
      'political-unrest': 'Airspace closures, sanctions and armed conflict fall within the Recital 14 "political instability" example. In the modern Ukraine/Russia context, EASA CZIB 2022-01 is the regulatory anchor.',
      'crew-fdp': 'A crew Flight Duty Period breach is not independently extraordinary — the analysis attaches to the upstream event that consumed the duty period (Eglītis v Latvia C-294/10 requires the carrier to have provided reserve time and adequate standby cover).',
      'crew-sick': 'Crew illness is NOT extraordinary. Lipton v BA CityFlyer [2024] UKSC 24 (UK Supreme Court) is binding on this point.'
    };
    lines.push(basisMap[dtype] || 'The extraordinary-circumstances position for this disruption type turns on the specific facts and the two-limb Wallentin-Hermann test (C-549/07): the event must not be inherent to airline operation, and must be beyond the carrier\'s control.');
    lines.push('');

    // 3. What we need to prove it (evidence gaps in plain language)
    lines.push('3. WHAT WE NEED TO PROVE IT');
    var missing = [];
    (d.conditions || []).forEach(function (c) {
      var clean = String(c || '').replace(/^(EVIDENCE_HOLD|DEFEND_HOLD|SETTLE|DEFEND)\s*[:\-—]\s*/i, '')
                                 .replace(/^Collect key evidence:\s*/i, '')
                                 .replace(/\s+—\s+proof pending$/i, '')
                                 .replace(/\s+—\s+Flight Details.*$/i, '')
                                 .trim();
      if (clean && clean.length > 3 && missing.indexOf(clean) < 0) missing.push(clean);
    });
    ((f.evidenceMarks || [])).forEach(function (mk) {
      var held = (mk.status === 'available' || mk.status === 'on_file' || mk.status === 'held');
      if (!held) {
        var lbl = mk.name || mk.label || mk.key;
        if (lbl && missing.indexOf(lbl) < 0) missing.push(lbl);
      }
    });
    if (missing.length) {
      lines.push('To hold the position above, the case file needs the following evidence. Request these through the Evidence workspace; the Documentary Intelligence Officer will pursue them via the repository.');
      lines.push('');
      missing.slice(0, 8).forEach(function (item, i) { lines.push('   ' + (i + 1) + '. ' + item); });
    } else {
      lines.push('All essential evidence for the defence is on file. The case is ready to proceed to Documents for drafting.');
    }
    lines.push('');

    // 4. Authorities engaged
    lines.push('4. AUTHORITIES ENGAGED');
    var auths = d.authorities || [];
    if (auths.length) {
      auths.slice(0, 6).forEach(function (a) {
        var weight = String(a.weight || 'persuasive').toUpperCase();
        var name = a.citation || a.ref || a.name || String(a);
        lines.push('   ' + weight + ' — ' + name);
      });
    } else if (auths.binding || auths.persuasive) {
      (auths.binding || []).forEach(function (a) { lines.push('   BINDING — ' + (a.citation || a.ref || a.name || String(a))); });
      (auths.persuasive || []).forEach(function (a) { lines.push('   PERSUASIVE — ' + (a.citation || a.ref || a.name || String(a))); });
    } else {
      lines.push('   (No specific authorities engaged — the two-limb Wallentin-Hermann test governs.)');
    }
    lines.push('');

    // 5. What to do next
    lines.push('5. WHAT TO DO NEXT');
    if (missing.length) {
      lines.push('   1. Open the Evidence workspace and mark the outstanding items above as requested.');
      lines.push('   2. Once the pack is complete, review the position again and confirm the defence.');
      lines.push('   3. Draft the Letter of Response in the Documents workspace, citing the authorities above.');
    } else {
      lines.push('   1. Confirm the position is still correct against the facts on file.');
      lines.push('   2. Open the Documents workspace and draft the Letter of Response, citing the authorities above.');
      lines.push('   3. Route through Terminal for final review and signature before sending to the claimant.');
    }
    lines.push('');
    if (d.g1) {
      lines.push('Approved by ' + (d.g1.by || 'lawyer') + ' on ' + (d.g1.at || '') + '.');
    }
    return lines.join('\n');
  }

  function evidenceIndexText(pack) {
    var lines = ['EVIDENCE PACK INDEX — Engine handoff', ''];
    (pack.factsSection.evidenceMarks || []).forEach(function (m) {
      lines.push('• [' + String(m.status).toUpperCase() + '] ' + m.key + (m.note ? ' — ' + m.note : ''));
    });
    lines.push('');
    lines.push('CRIT / IMPO');
    (pack.decideSection.critNotes || []).forEach(function (c) {
      lines.push('• [' + (c.badge || '') + '] ' + c.text);
    });
    if (pack.decideSection.conditionType === 'EVIDENCE_HOLD') {
      lines.push('');
      lines.push('Stage: EVIDENCE_HOLD — do not finalise response until gaps closed.');
    }
    return lines.join('\n');
  }

  function collectFromDom(root) {
    root = root || document.getElementById('handoff-modal');
    if (!root || !root._pack) return null;
    var pack = JSON.parse(JSON.stringify(root._pack));
    function val(id) {
      var el = root.querySelector('[data-field="' + id + '"]');
      if (!el) return '';
      if (el.type === 'checkbox') return !!el.checked;
      return (el.value != null ? el.value : el.textContent || '').trim();
    }
    pack.factsSection.factsNotes = val('factsNotes');
    pack.decideSection.verdictTitle = val('verdictTitle') || pack.decideSection.verdictTitle;
    pack.decideSection.verdictSub = val('verdictSub') || pack.decideSection.verdictSub;
    var condRaw = val('conditions');
    pack.decideSection.conditions = condRaw
      ? condRaw.split(/\n+/).map(function (s) { return s.replace(/^\s*[\d.•\-]+\s*/, '').trim(); }).filter(Boolean)
      : [];
    pack.decideSection.critNotes = (pack.decideSection.critNotes || []).map(function (c, i) {
      return Object.assign({}, c, { statusNote: val('critNote-' + i) });
    });
    pack.meta.claimant = val('claimant');
    pack.meta.solicitor = val('solicitor');
    pack.meta.caseRef = val('caseRef') || pack.meta.caseRef;
    pack.meta.assignedTo = val('assignedTo') || 'SB';
    pack.meta.stage = val('stage') || pack.meta.stage;
    pack.meta.locReady = !!val('locReady');
    pack.meta.caseSummary = val('caseSummary');
    pack.meta.triageNote = val('triageNote');
    return pack;
  }

  function saveDraft(pack) {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(pack));
      return true;
    } catch (e) {
      return false;
    }
  }

  function loadDraft() {
    try {
      var raw = localStorage.getItem(DRAFT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function renderLofTable(rows) {
    if (!rows || !rows.length) return '<div class="handoff-muted">No LOF sectors locked.</div>';
    return (
      '<table class="handoff-table"><thead><tr>' +
      '<th>Flight</th><th>Route</th><th>STD</th><th>ATD</th><th>Status</th><th>Note</th>' +
      '</tr></thead><tbody>' +
      rows.map(function (r) {
        return (
          '<tr><td>' + esc(r.flight) + '</td><td>' + esc(r.route) + '</td><td>' + esc(r.std) +
          '</td><td>' + esc(r.atd) + '</td><td>' + esc(r.status) + '</td><td>' + esc(r.note) + '</td></tr>'
        );
      }).join('') +
      '</tbody></table>'
    );
  }

  function renderTrail(trail) {
    if (!trail || !trail.steps || !trail.steps.length) {
      return '<div class="handoff-muted">No thinking trail.</div>';
    }
    return (
      '<ol class="handoff-trail">' +
      trail.steps.map(function (s) {
        return (
          '<li><strong>' + esc(s.id || '') + '</strong> ' + esc(s.label || '') +
          (s.description ? '<div class="handoff-muted">' + esc(String(s.description).slice(0, 220)) + '</div>' : '') +
          '</li>'
        );
      }).join('') +
      '</ol>'
    );
  }

  function renderAuthorities(auth) {
    if (Array.isArray(auth)) {
      if (!auth.length) return '<div class="handoff-muted">No authorities listed.</div>';
      return auth.map(function (a) {
        return (
          '<div class="handoff-auth"><span class="handoff-pill">' + esc((a.weight || 'persuasive').toUpperCase()) + '</span> ' +
          esc(a.citation || a.ref || a.name || '') +
          (a.note ? '<div class="handoff-muted">' + esc(a.note) + '</div>' : '') +
          '</div>'
        );
      }).join('');
    }
    auth = auth || {};
    var bind = auth.binding || [];
    var pers = auth.persuasive || [];
    if (!bind.length && !pers.length) return '<div class="handoff-muted">No authorities listed.</div>';
    function row(a, kind) {
      return (
        '<div class="handoff-auth"><span class="handoff-pill">' + esc(kind) + '</span> ' +
        esc(a.citation || a.ref || a.name || '') +
        (a.ratio || a.note ? '<div class="handoff-muted">' + esc(a.ratio || a.note) + '</div>' : '') +
        '</div>'
      );
    }
    return bind.map(function (a) { return row(a, 'Binding'); }).join('') +
      pers.map(function (a) { return row(a, 'Persuasive'); }).join('');
  }

  function open(pack, hooks) {
    hooks = hooks || {};
    close();
    var g1Ok = !!(pack.decideSection && pack.decideSection.g1);
    var marks = pack.factsSection.evidenceMarks || [];
    var crit = pack.decideSection.critNotes || [];

    var html =
      '<div id="handoff-modal-backdrop" class="handoff-backdrop">' +
      '<div id="handoff-modal" class="handoff-modal" role="dialog" aria-label="Case Handoff Pack">' +
      '<div class="handoff-hdr">' +
      '<div class="handoff-kicker">Case Handoff Pack · Analyse + Decide → Manage</div>' +
      '<div class="handoff-title">Review everything about to enter Manage</div>' +
      '<div class="handoff-muted">Editable fields travel with the case. Locked LOF facts stay read-only.</div>' +
      '</div>' +

      '<div class="handoff-body">' +

      '<section class="handoff-sec">' +
      '<h3>A · Facts (Analyse / G0)</h3>' +
      '<div class="handoff-grid">' +
      '<div><label>Flight</label><div class="handoff-ro">' + esc(pack.factsSection.flightNum) + '</div></div>' +
      '<div><label>Route</label><div class="handoff-ro">' + esc(pack.factsSection.route) + '</div></div>' +
      '<div><label>Date</label><div class="handoff-ro">' + esc(pack.factsSection.flightDate) + '</div></div>' +
      '<div><label>Delay</label><div class="handoff-ro">' + esc(pack.factsSection.delay || '—') + '</div></div>' +
      '<div><label>Jurisdiction</label><div class="handoff-ro">' + esc(pack.factsSection.jurisdiction) + '</div></div>' +
      '</div>' +
      '<label>Locked LOF</label>' + renderLofTable(pack.factsSection.lofRows) +
      '<label>Story / causal chain</label><div class="handoff-ro handoff-block">' +
      esc(pack.factsSection.lockedNarrative) +
      ((pack.factsSection.causalLabels || []).length
        ? '<ul>' + pack.factsSection.causalLabels.map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('') + '</ul>'
        : '') +
      '</div>' +
      '<label>Evidence marks</label><ul class="handoff-marks">' +
      (marks.length
        ? marks.map(function (m) {
          return '<li><span class="handoff-pill handoff-' + esc(m.status) + '">' + esc(m.status) + '</span> ' + esc(m.key) + '</li>';
        }).join('')
        : '<li class="handoff-muted">No evidence chips marked yet</li>') +
      '</ul>' +
      '<label>Facts notes (editable)</label>' +
      '<textarea data-field="factsNotes" rows="2" placeholder="Optional lawyer notes on facts…">' +
      esc(pack.factsSection.factsNotes || '') + '</textarea>' +
      '</section>' +

      '<section class="handoff-sec">' +
      '<h3>B · Legal application (Decide)</h3>' +
      '<label>Verdict title</label>' +
      '<input data-field="verdictTitle" type="text" value="' + esc(pack.decideSection.verdictTitle) + '" />' +
      '<label>Verdict sub</label>' +
      '<input data-field="verdictSub" type="text" value="' + esc(pack.decideSection.verdictSub) + '" />' +
      '<label>Thinking trail (read-only)</label>' + renderTrail(pack.decideSection.thinkingTrail) +
      '<label>CONDITIONS BEFORE FINAL RESPONSE (one per line)</label>' +
      '<textarea data-field="conditions" rows="4">' +
      esc((pack.decideSection.conditions || []).join('\n')) + '</textarea>' +
      '<label>CRIT / IMPO status notes</label>' +
      (crit.length
        ? crit.map(function (c, i) {
          return (
            '<div class="handoff-crit"><span class="handoff-pill">' + esc(c.badge) + '</span> ' +
            esc(c.text) +
            '<input data-field="critNote-' + i + '" type="text" placeholder="Status note…" value="' +
            esc(c.statusNote || '') + '" /></div>'
          );
        }).join('')
        : '<div class="handoff-muted">No CRIT/IMPO items</div>') +
      '<label>Authorities</label>' + renderAuthorities(pack.decideSection.authorities) +
      '<label>G1 sign-off</label><div class="handoff-ro">' +
      (pack.decideSection.g1
        ? esc(pack.decideSection.g1.action) + ' · ' + esc(pack.decideSection.g1.by || '') + ' · ' + esc(pack.decideSection.g1.at || '')
        : '<span class="handoff-warn">G1 required before Confirm into Manage</span>') +
      '</div>' +
      '</section>' +

      '<section class="handoff-sec">' +
      '<h3>C · Handoff meta (required for Manage)</h3>' +
      '<div class="handoff-grid">' +
      '<div><label>Claimant name *</label><input data-field="claimant" type="text" placeholder="Claimant full name" value="' +
      esc(pack.meta.claimant) + '" /></div>' +
      '<div><label>Solicitor / firm</label><input data-field="solicitor" type="text" value="' +
      esc(pack.meta.solicitor) + '" /></div>' +
      '<div><label>Case ref</label><input data-field="caseRef" type="text" value="' +
      esc(pack.meta.caseRef) + '" /></div>' +
      '<div><label>Assignee</label><input data-field="assignedTo" type="text" value="' +
      esc(pack.meta.assignedTo) + '" /></div>' +
      '<div><label>Stage</label><select data-field="stage">' +
      ['intake', 'triage', 'cpr', 'evidence', 'drafting'].map(function (s) {
        return '<option value="' + s + '"' + (pack.meta.stage === s ? ' selected' : '') + '>' + s + '</option>';
      }).join('') +
      '</select></div>' +
      '<div><label class="handoff-check"><input data-field="locReady" type="checkbox"' +
      (pack.meta.locReady ? ' checked' : '') +
      ' /> LOC already in hand (locReady)</label>' +
      '<div class="handoff-muted">Default off for engine-origin cases — awaiting Letter of Claim</div></div>' +
      '</div>' +
      '<label>Case summary</label>' +
      '<textarea data-field="caseSummary" rows="5">' + esc(pack.meta.caseSummary) + '</textarea>' +
      '<label>Triage note</label>' +
      '<textarea data-field="triageNote" rows="3">' + esc(pack.meta.triageNote) + '</textarea>' +
      '</section>' +

      '</div>' +

      '<div class="handoff-ftr">' +
      '<button type="button" class="handoff-btn" id="handoff-save">Save draft</button>' +
      '<button type="button" class="handoff-btn" id="handoff-print">Print pack</button>' +
      '<button type="button" class="handoff-btn" id="handoff-close">Close</button>' +
      '<button type="button" class="handoff-btn handoff-btn-primary" id="handoff-confirm"' +
      (g1Ok ? '' : ' disabled') + '>Confirm into Manage →</button>' +
      '<span id="handoff-status" class="handoff-muted"></span>' +
      '</div>' +
      '</div></div>';

    document.body.insertAdjacentHTML('beforeend', html);
    var modal = document.getElementById('handoff-modal');
    modal._pack = pack;

    document.getElementById('handoff-close').onclick = close;
    document.getElementById('handoff-modal-backdrop').addEventListener('click', function (e) {
      if (e.target.id === 'handoff-modal-backdrop') close();
    });
    document.getElementById('handoff-save').onclick = function () {
      var p = collectFromDom(modal);
      saveDraft(p);
      var st = document.getElementById('handoff-status');
      if (st) st.textContent = 'Draft saved.';
    };
    document.getElementById('handoff-print').onclick = function () { window.print(); };
    document.getElementById('handoff-confirm').onclick = function () {
      var p = collectFromDom(modal);
      var st = document.getElementById('handoff-status');
      if (!p.decideSection.g1) {
        if (st) st.textContent = 'G1 sign-off required.';
        return;
      }
      if (!p.meta.claimant) {
        if (st) st.textContent = 'Claimant name is required.';
        return;
      }
      if (hooks.onConfirm) hooks.onConfirm(p);
    };
  }

  function close() {
    var el = document.getElementById('handoff-modal-backdrop');
    if (el) el.remove();
  }

  /**
   * File pack into CaseFiling + return portfolio case shape.
   * Uses valid folder IDs only.
   */
  function fileIntoManage(pack) {
    if (typeof CaseFiling === 'undefined') throw new Error('CaseFiling missing');
    var meta = pack.meta || {};
    var facts = pack.factsSection || {};
    var decide = pack.decideSection || {};
    var record = (pack.source && pack.source.record) || {};
    var run = (pack.source && pack.source.run) || {};
    // ── Engine Inbox routing — cases from the engine land unassigned in the inbox
    //    S. Booth (or a lead) assigns them out from cases.html. The suggested
    //    stage becomes the case's post-assignment stage, stored for later.
    meta.suggestedStage = meta.stage || 'triage';
    meta.stage = 'inbox';
    meta.assignedTo = null;
    meta.source = 'engine';
    var ref = meta.caseRef || suggestRef(facts, facts.lofRows);
    var juris = facts.jurisdiction === 'UK261' || facts.jurisdiction === 'england-wales'
      ? 'england-wales'
      : (facts.jurisdiction === 'france' || facts.jurisdiction === 'spain'
        ? facts.jurisdiction
        : 'england-wales');
    var routeParts = String(facts.route || '').split(/\s*[–\-→]\s*/);
    var dep = routeParts[0] ? routeParts[0].trim() : '';
    var arr = routeParts[1] ? routeParts[1].trim() : '';
    var points = pointsFromPack(pack);
    var evidencePct = calcEvidencePct(facts.evidenceMarks);
    var by = (decide.g1 && decide.g1.by) || 'Legal Engine';

    CaseFiling.ensureCaseFile({
      ref: ref,
      claimant: meta.claimant || 'Unknown claimant',
      solicitor: meta.solicitor || '',
      flightNum: facts.flightNum || '',
      route: facts.route || '',
      dep: dep,
      arr: arr,
      flight: (facts.flightNum || '') + (facts.route ? (' — ' + facts.route) : ''),
      flightDate: facts.flightDate || '',
      jurisdiction: juris,
      stage: meta.stage || 'triage',
      disruptionType: meta.disruptionType || record.dtId || '',
      classification: meta.classification || decide.frameworkLabel || '',
      triageNote: meta.triageNote || '',
      assignedTo: (meta.assignedTo === null ? null : (meta.assignedTo || 'SB')),
      source: meta.source || 'user',
      suggestedStage: meta.suggestedStage || null,
      evidencePct: evidencePct,
      type: 'EC261 / UK261',
      value: meta.value || meta.totalExposure || '',
      locDate: meta.locReady ? new Date().toISOString().slice(0, 10) : '',
      uploadedByName: by,
      origin: 'legal_engine',
      locReady: !!meta.locReady,
      points: points,
      caseSummary: meta.caseSummary || '',
      verdictTitle: decide.verdictTitle || '',
      verdictSub: decide.verdictSub || '',
      conditions: decide.conditions || [],
      totalExposure: meta.totalExposure || null,
      limitationDeadline: meta.limitationDeadline || null
    });

    if (typeof CaseFiling.updateCaseMeta === 'function') {
      CaseFiling.updateCaseMeta(ref, {
        origin: 'legal_engine',
        locReady: !!meta.locReady,
        points: points,
        caseSummary: meta.caseSummary || '',
        verdictTitle: decide.verdictTitle || '',
        verdictSub: decide.verdictSub || '',
        conditions: decide.conditions || [],
        totalExposure: meta.totalExposure || null,
        limitationDeadline: meta.limitationDeadline || null,
        evidencePct: evidencePct,
        classification: meta.classification || decide.frameworkLabel || ''
      });
    }

    CaseFiling.addDocument(ref, {
      name: 'Case summary — ' + (meta.claimant || ref),
      folderId: 'intake',
      docKey: 'case_summary',
      mimeType: 'text/plain',
      content: meta.caseSummary || '',
      source: 'Legal Engine',
      uploadedByName: by
    });

    CaseFiling.addDocument(ref, {
      name: 'Legal position — ' + (decide.verdictTitle || decide.frameworkLabel || ref),
      folderId: 'legal_drafts',
      docKey: 'legal_position',
      mimeType: 'text/plain',
      content: legalPositionText(pack),
      source: 'Legal Engine',
      uploadedByName: by
    });

    CaseFiling.addDocument(ref, {
      name: 'Evidence pack index',
      folderId: 'evidence_index',
      docKey: 'evidence_pack_index',
      mimeType: 'text/plain',
      content: evidenceIndexText(pack),
      source: 'Legal Engine',
      uploadedByName: by
    });

    var casePacket = null;
    var decisionPacket = null;
    if (typeof DefendAbleLofLegalBridge !== 'undefined') {
      casePacket = DefendAbleLofLegalBridge.buildCasePacket(record, { meta: { ref: ref } });
      decisionPacket = DefendAbleLofLegalBridge.buildDecisionPacket(record, run, decide.g1);
      if (meta.totalExposure) {
        casePacket.totalExposure = meta.totalExposure;
        decisionPacket.totalExposure = meta.totalExposure;
      }
      if (meta.limitationDeadline) {
        casePacket.limitationDeadline = meta.limitationDeadline;
        decisionPacket.limitationDeadline = meta.limitationDeadline;
      }
    } else {
      casePacket = { type: 'case_packet', meta: { ref: ref }, lockedNarrative: facts.lockedNarrative };
      decisionPacket = { type: 'decision_packet', g1: decide.g1, verdict: decide.verdict };
    }

    CaseFiling.addDocument(ref, {
      name: 'case_packet.json',
      folderId: 'legal_drafts',
      docKey: 'case_packet',
      mimeType: 'application/json',
      content: JSON.stringify(casePacket, null, 2),
      source: 'Legal Engine',
      uploadedByName: by
    });
    CaseFiling.addDocument(ref, {
      name: 'decision_packet.json',
      folderId: 'legal_drafts',
      docKey: 'decision_packet',
      mimeType: 'application/json',
      content: JSON.stringify(decisionPacket, null, 2),
      source: 'Legal Engine',
      uploadedByName: by
    });

    // ── Verdict-driven legal document drafts (G2 approval required in Manage) ──
    if (typeof DefendAbleDocTemplates !== 'undefined' && DefendAbleDocTemplates.draftsForPack) {
      DefendAbleDocTemplates.draftsForPack(pack).forEach(function (doc) {
        CaseFiling.addDocument(ref, {
          name: doc.name,
          folderId: doc.folderId,
          docKey: doc.docKey,
          filename: doc.filename,
          content: doc.content,
          status: 'draft',
          source: 'Legal Engine',
          uploadedByName: by
        });
      });
      CaseFiling.addActivity(ref, 'Response documents drafted — awaiting G2 lawyer approval', 'legal', by);
    }

    CaseFiling.addActivity(
      ref,
      'Received from Legal Engine — G1 ' + ((decide.g1 && decide.g1.action) || ''),
      'legal',
      by
    );
    if (!meta.locReady) {
      CaseFiling.addActivity(ref, 'No LOC yet — ops/analyse origin (locReady=false)', 'create', by);
    }
    if (decide.conditionType === 'EVIDENCE_HOLD') {
      CaseFiling.addActivity(ref, 'EVIDENCE_HOLD — evidence requests seeded from engine', 'action', by);
    }

    var portfolio = {
      ref: ref,
      assignedTo: meta.assignedTo || 'SB',
      claimant: meta.claimant || 'Unknown claimant',
      solicitor: meta.solicitor || '',
      flight: (facts.flightNum || '') + (facts.route ? (' — ' + facts.route) : ''),
      flightNum: facts.flightNum || '',
      dep: dep || 'TBD',
      arr: arr || 'TBD',
      flightDate: facts.flightDate || '',
      value: meta.value || meta.totalExposure || '',
      type: 'EC261 / UK261',
      locDate: meta.locReady ? new Date().toISOString().slice(0, 10) : '',
      stage: meta.stage || 'triage',
      cat: 'B',
      jurisdiction: juris,
      lang: 'en',
      disruptionType: meta.disruptionType || record.dtId || '',
      classification: meta.classification || decide.frameworkLabel || '',
      evidencePct: evidencePct,
      cprDaysLeft: meta.locReady ? 21 : 21,
      points: points,
      loaStatus: '',
      triageNote: meta.triageNote || '',
      origin: 'legal_engine',
      locReady: !!meta.locReady,
      caseSummary: meta.caseSummary || '',
      verdictTitle: decide.verdictTitle || '',
      verdictSub: decide.verdictSub || '',
      conditions: decide.conditions || [],
      activity: [
        { text: 'Received from Legal Engine — G1 ' + ((decide.g1 && decide.g1.action) || ''), time: 'Just now', type: 'legal' }
      ]
    };

    if (typeof persistPortfolioCase === 'function') persistPortfolioCase(portfolio);

    if (decide.conditionType === 'EVIDENCE_HOLD' && typeof pushEvidenceRequest === 'function') {
      var missing = (decide.critNotes || [])
        .filter(function (c) { return c.badge === 'CRIT'; })
        .map(function (c) { return c.text; });
      if (!missing.length) missing = (decide.conditions || []).slice();
      pushEvidenceRequest({
        id: 'REQ-ENG-' + String(Date.now()).slice(-6),
        ref: ref,
        claimant: portfolio.claimant,
        flight: portfolio.flight,
        pack: 'Gold',
        priority: 'Urgent',
        due: '7d',
        status: 'open',
        requestedBy: by,
        requestType: 'Engine EVIDENCE_HOLD',
        requestDate: new Date().toISOString().slice(0, 10),
        missing: missing.length ? missing : ['Complete evidence pack from engine handoff'],
        note: meta.triageNote || 'Seeded from Legal Engine handoff',
        since: 'Just now'
      });
    }

    try {
      localStorage.setItem('dfa_last_manage_ref', ref);
      localStorage.removeItem(DRAFT_KEY);
    } catch (e) { /* ignore */ }

    return { ref: ref, portfolio: portfolio, foldersValid: true, validFolders: VALID_FOLDERS };
  }

  return {
    DRAFT_KEY: DRAFT_KEY,
    VALID_FOLDERS: VALID_FOLDERS,
    buildPack: buildPack,
    open: open,
    close: close,
    collectFromDom: collectFromDom,
    saveDraft: saveDraft,
    loadDraft: loadDraft,
    fileIntoManage: fileIntoManage,
    legalPositionText: legalPositionText,
    evidenceIndexText: evidenceIndexText,
    pointsFromPack: pointsFromPack,
    calcEvidencePct: calcEvidencePct,
    suggestStage: suggestStage
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DefendAbleCaseHandoff;
}
