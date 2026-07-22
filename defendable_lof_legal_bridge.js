/* DefendAble — Confirmed LOF → deterministic tree runner + Decide helpers */
var DefendAbleLofLegalBridge = (function () {

  var AUTHORITY_JURISDICTION = {
    'Wallentin-Hermann C-549/07': { bindingFor: ['EU', 'UK'], court: 'CJEU', era: 'pre-IP' },
    'Pešková C-315/15': { bindingFor: ['EU', 'UK'], court: 'CJEU', era: 'pre-IP' },
    'Sturgeon C-402/07': { bindingFor: ['EU', 'UK'], court: 'CJEU', era: 'pre-IP' },
    'Moens C-159/18': { bindingFor: ['EU', 'UK'], court: 'CJEU', era: 'pre-IP' },
    'van der Lans C-257/14': { bindingFor: ['EU', 'UK'], court: 'CJEU', era: 'pre-IP' },
    'Krüsemann C-195/17': { bindingFor: ['EU', 'UK'], court: 'CJEU', era: 'pre-IP' },
    'Lipton [2024] UKSC 24': { bindingFor: ['UK'], court: 'UKSC', era: 'UK', persuasiveFor: ['EU'] },
    'Jet2.com v Huzar [2014] EWCA Civ 791': { bindingFor: ['UK'], court: 'EWCA', era: 'UK', persuasiveFor: ['EU'] },
    'T-656/24': { bindingFor: ['EU'], court: 'General Court', era: 'post-IP', persuasiveFor: ['UK'] },
    'C-45/24': { bindingFor: ['EU'], court: 'CJEU', era: 'post-IP', persuasiveFor: ['UK'] },
    'C-399/24': { bindingFor: ['EU'], court: 'CJEU', era: 'post-IP', persuasiveFor: ['UK'] },
    'Matkustaja C-385/23': { bindingFor: ['EU'], court: 'CJEU', era: 'post-IP', persuasiveFor: ['UK'] },
    'Blanche v EasyJet': { bindingFor: ['UK'], court: 'UK', era: 'UK', persuasiveFor: ['EU'] }
  };

  function buildLockedNarrative(lofRows, facts, causalNodes, rawText) {
    var parts = [];
    (lofRows || []).forEach(function (r) {
      if (!(r.flight || '').trim()) return;
      var line = [r.flight, r.route, r.std && ('STD ' + r.std), r.atd && ('ATD ' + r.atd),
        r.sta && ('STA ' + r.sta), r.ata && ('ATA ' + r.ata), r.status, r.note]
        .filter(Boolean).join(' · ');
      parts.push(line);
    });
    (causalNodes || []).forEach(function (n) {
      if (n && n.label) parts.push(n.label + (n.sub ? (': ' + n.sub) : ''));
    });
    if (facts) {
      if (facts.flightNum) parts.push('Flight ' + facts.flightNum);
      if (facts.depIata && facts.arrIata) parts.push(facts.depIata + '-' + facts.arrIata);
      if (facts.delayText) parts.push(facts.delayText);
    }
    var locked = parts.join('. ');
    if (rawText && rawText.trim()) locked = locked + '. ' + rawText.trim();
    return locked;
  }

  function buildCausalChain(causalNodes, lofRows, annotations) {
    var chain = [];
    (causalNodes || []).forEach(function (n, idx) {
      var note = '';
      if (annotations) {
        if (typeof annotations[idx] === 'string') note = annotations[idx];
        else if (annotations[idx] && annotations[idx].text) note = annotations[idx].text;
      }
      var desc = ((n && n.sub) || '') + ' ' + note;
      var chainBreak = !!(n && n.chainBreak) ||
        /\bvoluntar|\bchose to wait|\bwaited for (delayed )?passengers|\bcommercial decision|\bdiscretion\b/i.test(desc);
      chain.push({
        type: (n && n.type) || 'event',
        label: (n && n.label) || ('Event ' + (idx + 1)),
        description: desc.trim(),
        chainBreak: chainBreak,
        time: (n && n.time) || null
      });
    });
    (lofRows || []).forEach(function (r) {
      if (!(r.flight || '').trim()) return;
      var note = r.note || '';
      chain.push({
        type: 'sector',
        label: r.flight + (r.route ? (' ' + r.route) : ''),
        description: [r.status, note].filter(Boolean).join(' — '),
        chainBreak: /\bvoluntar|\bchose to wait|\bwaited for\b|\bcommercial\b/i.test(note),
        time: r.atd || r.std || null
      });
    });
    return chain;
  }

  function seedEvidenceFromTimeline(evidenceManager, tlEvStatus, evidenceDb, dtId) {
    if (!evidenceManager || typeof DefendAbleEvidencePack === 'undefined') return;
    var disruptionType = null;
    var seedText = dtId || '';
    disruptionType = DefendAbleEvidencePack.detectDisruptionType(seedText) ||
      DefendAbleEvidencePack.detectDisruptionType(
        dtId === 'atfm' ? 'eurocontrol CTOT ATFM' :
        dtId === 'weather' ? 'thunderstorm METAR diversion' :
        dtId === 'birdstrike' ? 'birdstrike ingestion' :
        dtId === 'medical' ? 'medical emergency diversion' :
        dtId === 'own-ia' ? 'own staff strike' :
        dtId === 'crew-sick' ? 'crew illness pilot sick' :
        dtId === 'technical' ? 'hydraulic technical AOG defect' :
        seedText
      );
    if (disruptionType) {
      DefendAbleEvidencePack.seedPackToEvidenceManager(evidenceManager, disruptionType);
    }

    var items = (evidenceDb && dtId && evidenceDb[dtId]) ? evidenceDb[dtId] : [];
    Object.keys(tlEvStatus || {}).forEach(function (key) {
      var status = tlEvStatus[key];
      if (!status) return;
      var evId = key.split('_').slice(1).join('_');
      var meta = items.find(function (i) { return i.id === evId; });
      if (!meta) return;
      try {
        if (status === 'available' && evidenceManager.receiveEvidence) {
          if (!evidenceManager.has || !evidenceManager.has(evId)) {
            if (evidenceManager.addEvidence) {
              evidenceManager.addEvidence(evId, meta.name, meta.source || 'LOF', [], []);
            }
          }
          evidenceManager.receiveEvidence(evId, [{ type: 'LOF_TIMELINE_AVAILABLE', description: meta.proves || meta.name }]);
        }
      } catch (e) { /* non-fatal seed */ }
    });
  }

  function classifyAuthority(citation, jurisdiction) {
    var meta = null;
    Object.keys(AUTHORITY_JURISDICTION).forEach(function (k) {
      if (!meta && citation && citation.indexOf(k) >= 0) meta = AUTHORITY_JURISDICTION[k];
      if (!meta && citation && k.indexOf(citation) >= 0) meta = AUTHORITY_JURISDICTION[k];
    });
    // Loose match common short forms
    if (!meta && citation) {
      if (/T-656|T-134\/25/i.test(citation)) meta = AUTHORITY_JURISDICTION['T-656/24'];
      if (/Lipton/i.test(citation)) meta = AUTHORITY_JURISDICTION['Lipton [2024] UKSC 24'];
      if (/C-45\/24/i.test(citation)) meta = AUTHORITY_JURISDICTION['C-45/24'];
      if (/Wallentin/i.test(citation)) meta = AUTHORITY_JURISDICTION['Wallentin-Hermann C-549/07'];
      if (/Pe[sš]kov/i.test(citation)) meta = AUTHORITY_JURISDICTION['Pešková C-315/15'];
      if (/Moens/i.test(citation)) meta = AUTHORITY_JURISDICTION['Moens C-159/18'];
    }
    var regime = (jurisdiction === 'UK261' || jurisdiction === 'UK') ? 'UK' : 'EU';
    if (!meta) {
      return { citation: citation, weight: 'persuasive', regime: regime, note: 'No jurisdiction flag in reference data — treat as persuasive until tagged.' };
    }
    var binding = (meta.bindingFor || []).indexOf(regime) >= 0;
    return {
      citation: citation,
      weight: binding ? 'binding' : 'persuasive',
      regime: regime,
      court: meta.court,
      note: binding
        ? ('Binding in ' + regime)
        : ('Persuasive only in ' + regime + (meta.era === 'post-IP' ? ' (post-IP CJEU)' : ''))
    };
  }

  function collectAuthorities(treeResults, jurisdiction) {
    var seen = {};
    var out = [];
    (treeResults || []).forEach(function (tr) {
      var auth = (tr.exit && tr.exit.authority) || tr.authority || '';
      if (auth) {
        String(auth).split(/;|,/).forEach(function (part) {
          var c = part.trim();
          if (!c || seen[c]) return;
          seen[c] = true;
          out.push(classifyAuthority(c, jurisdiction));
        });
      }
      (tr.gates || []).forEach(function (g) {
        var ga = g.authority || (g.gate && g.gate.authority);
        if (!ga) return;
        String(ga).split(/;|,/).forEach(function (part) {
          var c = part.trim();
          if (!c || seen[c]) return;
          seen[c] = true;
          out.push(classifyAuthority(c, jurisdiction));
        });
      });
    });
    return out;
  }

  function evidenceGapCount(treeResults) {
    var n = 0;
    (treeResults || []).forEach(function (tr) {
      (tr.gates || []).forEach(function (g) {
        n += (g.gaps || []).length;
      });
    });
    return n;
  }

  function hasEcEstablished(treeResults) {
    return (treeResults || []).some(function (tr) {
      var v = tr.exit && tr.exit.verdict;
      return v === 'DEFEND' || v === 'DEFEND_WITH_CONDITIONS' || v === 'DEFEND_HOLD';
    }) || (treeResults || []).some(function (tr) {
      return (tr.gates || []).some(function (g) {
        return g.answer === 'yes' && /EC|extraordinary|CTOT|weather/i.test((g.conclusion || '') + (g.reason || ''));
      });
    });
  }

  /**
   * U-7 / T-656 causal chain check — lawyer-visible post-tree gate.
   */
  function runCausalChainCheck(record, treeResults) {
    var text = (record && (record.lockedNarrative || record.rawText)) || '';
    var chain = (record && record.causalChain) || [];
    var autoDecision = chain.some(function (e) { return e.chainBreak; }) ||
      /\bvoluntar(y|ily)\b|\bchose to wait\b|\bwaited\s+(?:\d+\s*mins?\s+)?for\s+(?:the\s+)?(?:delayed\s+)?(?:connecting\s+)?(?:passengers|pax)\b|\bwaited for (the )?delayed (passengers|pax)\b|\bcommercial (decision|choice)\b|\bdiscretionary\b/i.test(text);
    var required = /\bobligat|\bmandatory\b|\brequired by\b|\bno (legal )?choice\b|\bcommander (order|decision)\b|\batc (instruct|mandat)/i.test(text);
    var risk = autoDecision && !required;
    return {
      id: 'causal_chain_check',
      label: 'U-7 / T-656 — Causal chain after EC event',
      questions: [
        {
          id: 'q1',
          text: 'Did the carrier make any autonomous operational decision after the EC event?',
          answer: autoDecision ? 'yes' : 'unknown',
          systemHint: autoDecision ? 'Narrative/flags suggest a post-EC carrier decision.' : 'No voluntary-wait / commercial language detected on locked facts.'
        },
        {
          id: 'q2',
          text: 'Was that decision operationally required, or discretionary?',
          answer: !autoDecision ? 'n/a' : (required ? 'required' : 'discretionary'),
          systemHint: required ? 'Language suggests obligation/mandate.' : (autoDecision ? 'Treat as discretionary until lawyer confirms — T-656/24 risk.' : '')
        },
        {
          id: 'q3',
          text: 'If discretionary — flag borderline regardless of tree exit?',
          answer: risk ? 'yes' : 'no',
          systemHint: risk ? 'Causal chain at risk (NI, HZ v European Air Charter T-656/24).' : 'No discretionary chain-break flag raised.'
        }
      ],
      risk: risk,
      authority: 'T-656/24 · Wallentin-Hermann C-549/07 (U-7 per event)',
      override: null,
      note: ''
    };
  }

  function mapTreeExitToVerdict(treeResults, causalCheck, limb1Status, typePriority) {
    var primary = selectHeadlineTree(treeResults, typePriority);
    var secondaryNotes = collectSecondaryNotes(treeResults, primary && primary.treeId, typePriority);
    var verdict = primary && primary.exit && primary.exit.verdict;
    var conditions = ((primary && primary.exit && primary.exit.conditions) || []).concat(secondaryNotes);
    var gaps = evidenceGapCount(treeResults);
    var ecOk = hasEcEstablished(treeResults) || limb1Status === 'extraordinary';

    if (causalCheck && causalCheck.risk && !(causalCheck.override && causalCheck.override === 'accept_chain')) {
      return {
        verdict: 'JUDGMENT_REQUIRED',
        frameworkLabel: 'JUDGMENT REQUIRED',
        band: 'borderline',
        title: 'Judgment required — causal chain risk',
        text: 'Tree path may establish EC, but a discretionary post-EC carrier decision is flagged (T-656/24). Lawyer must confirm chain holds or concede intervening cause.',
        conditionType: null,
        conditions: conditions.concat(['Confirm whether post-EC decision was obligatory or discretionary (T-656/24).']),
        treeVerdict: verdict,
        treeId: primary && primary.treeId
      };
    }

    if (verdict === 'DEFEND_HOLD') {
      return {
        verdict: 'DEFEND_HOLD',
        frameworkLabel: 'DEFEND HOLD',
        band: 'borderline',
        title: 'Defend — evidence hold',
        text: 'Primary tree ' + (primary && primary.treeId) + ' holds defence pending proof. Missing documents are not an adverse finding.',
        conditionType: 'EVIDENCE_HOLD',
        conditions: conditions,
        treeVerdict: verdict,
        treeId: primary && primary.treeId
      };
    }

    if (verdict === 'DEFEND' && gaps > 0 && ecOk) {
      return {
        verdict: 'DEFEND_WITH_CONDITIONS',
        frameworkLabel: 'DEFEND WITH CONDITIONS',
        band: 'borderline',
        title: 'Defend — evidence hold',
        text: 'EC path established on locked facts, but ' + gaps + ' evidence gap(s) remain. Issue holding response; chase critical documents before final defend.',
        conditionType: 'EVIDENCE_HOLD',
        conditions: conditions.concat(['EVIDENCE_HOLD: collect outstanding proof (e.g. ATFM/Eurocontrol log) then reconfirm defend.']),
        treeVerdict: verdict,
        treeId: primary && primary.treeId
      };
    }

    if (verdict === 'DEFEND') {
      return {
        verdict: 'DEFEND',
        frameworkLabel: 'DEFEND',
        band: 'defendable',
        title: 'Defendable — EC established, chain holds, RM supported',
        text: 'Primary tree ' + (primary && primary.treeId) + ' exited DEFEND on the confirmed record.',
        conditionType: null,
        conditions: conditions,
        treeVerdict: verdict,
        treeId: primary && primary.treeId
      };
    }

    if (verdict === 'DEFEND_WITH_CONDITIONS') {
      var hold = gaps > 0;
      return {
        verdict: 'DEFEND_WITH_CONDITIONS',
        frameworkLabel: 'DEFEND WITH CONDITIONS',
        band: 'borderline',
        title: hold ? 'Defend with conditions — evidence hold' : 'Defend with conditions',
        text: hold
          ? 'EC established but reasonable measures / evidence incomplete. Holding letter path (not weak-EC borderline).'
          : ((primary.exit && primary.exit.conditions && primary.exit.conditions.join('; ')) || 'Conditions must be met before a clean defend.'),
        conditionType: hold ? 'EVIDENCE_HOLD' : 'CONDITIONS',
        conditions: conditions,
        treeVerdict: verdict,
        treeId: primary && primary.treeId
      };
    }

    if (verdict === 'CONCEDE') {
      return {
        verdict: 'CONCEDE',
        frameworkLabel: 'CONCEDE',
        band: 'investigate',
        title: 'Concede — no sustainable EC defence',
        text: 'Tree exit CONCEDE (e.g. own-staff / crew illness / ordinary technical / denied boarding).',
        conditionType: null,
        conditions: conditions,
        treeVerdict: verdict,
        treeId: primary && primary.treeId
      };
    }

    if (verdict === 'SETTLE') {
      return {
        verdict: 'SETTLE',
        frameworkLabel: 'SETTLE',
        band: 'investigate',
        title: 'Settle — EC fails or RM failure',
        text: 'Tree exit SETTLE. Assess quantum and early resolution.',
        conditionType: null,
        conditions: conditions,
        treeVerdict: verdict,
        treeId: primary && primary.treeId
      };
    }

    if (verdict === 'JUDGMENT_REQUIRED' || verdict === 'ESCALATE') {
      return {
        verdict: verdict === 'ESCALATE' ? 'ESCALATE' : 'JUDGMENT_REQUIRED',
        frameworkLabel: verdict === 'ESCALATE' ? 'ESCALATE' : 'JUDGMENT REQUIRED',
        band: 'borderline',
        title: verdict === 'ESCALATE' ? 'Escalate — Montreal / novel / group exposure' : 'Judgment required',
        text: 'Ambiguous chain or elevated exposure — human decision required.',
        conditionType: null,
        conditions: conditions,
        treeVerdict: verdict,
        treeId: primary && primary.treeId
      };
    }

    // INVESTIGATE / unknown
    return {
      verdict: verdict || 'INVESTIGATE',
      frameworkLabel: 'JUDGMENT REQUIRED',
      band: 'investigate',
      title: 'Needs further investigation',
      text: 'Tree ' + ((primary && primary.treeId) || '?') + ' exited ' + (verdict || 'without a clear verdict') + '.',
      conditionType: null,
      conditions: conditions,
      treeVerdict: verdict,
      treeId: primary && primary.treeId
    };
  }

  /** PRIMARY tree drives headline; never min() across unrelated trees. */
  function selectHeadlineTree(treeResults, typePriority) {
    var results = treeResults || [];
    var primaryId = typePriority && typePriority.primaryTree;
    var secondaries = (typePriority && typePriority.secondaryTrees) || [];

    function hasUsableExit(t) {
      return t && t.applicable !== false && t.exit && t.exit.verdict &&
        t.gates && t.gates.length > 0 &&
        t.exit.verdict !== 'INVESTIGATE';
    }

    if (primaryId) {
      var primary = results.find(function (t) { return t.treeId === primaryId; });
      if (hasUsableExit(primary)) return primary;
      // Primary stub / no gates — fall to type-map secondaries in order
      for (var i = 0; i < secondaries.length; i++) {
        var sec = results.find(function (t) { return t.treeId === secondaries[i]; });
        if (hasUsableExit(sec)) return sec;
      }
    }

    // Prefer first result that was sorted as primary / has usable exit
    var usable = results.find(hasUsableExit);
    if (usable) return usable;
    return results.find(function (t) { return t && t.exit; }) || results[0] || null;
  }

  function collectSecondaryNotes(treeResults, headlineId, typePriority) {
    var notes = [];
    var secondaryIds = (typePriority && typePriority.secondaryTrees) || [];
    (treeResults || []).forEach(function (t) {
      if (!t || t.treeId === headlineId) return;
      if (secondaryIds.length && secondaryIds.indexOf(t.treeId) < 0 && t.treeId !== (typePriority && typePriority.primaryTree)) {
        // Unrelated tree that somehow ran — do not let it drive; note only if DEFEND path
        if (t.exit && (t.exit.verdict === 'SETTLE' || t.exit.verdict === 'CONCEDE')) {
          notes.push('Note: ' + t.treeId + ' exited ' + t.exit.verdict + ' — not headline (secondary/unrelated).');
        }
        return;
      }
      if (t.exit && t.exit.conditions && t.exit.conditions.length) {
        notes.push('Secondary ' + t.treeId + ': ' + t.exit.verdict + ' — ' + t.exit.conditions.slice(0, 2).join('; '));
      } else if (t.exit && t.exit.verdict) {
        notes.push('Secondary ' + t.treeId + ': ' + t.exit.verdict);
      }
    });
    return notes;
  }

  /** Sturgeon Art 7 pre-gate — per-sector compensability before defence position. */
  function parseDelayMinutes(str) {
    if (!str) return null;
    var s = String(str);
    var hm = s.match(/(\d+)\s*h(?:ours?)?\s*(?:(\d+)\s*m(?:ins?|inutes?)?)?/i);
    if (hm) return (parseInt(hm[1], 10) * 60) + (hm[2] ? parseInt(hm[2], 10) : 0);
    var mOnly = s.match(/(\d+)\s*m(?:ins?|inutes?)\b/i);
    if (mOnly) return parseInt(mOnly[1], 10);
    var plainH = s.match(/\b(\d+)\s*hours?\b/i);
    if (plainH) return parseInt(plainH[1], 10) * 60;
    var num = s.match(/\b(\d+)\b/);
    if (num && /delay/i.test(s)) {
      var n = parseInt(num[1], 10);
      // Heuristic: values < 10 likely hours when paired with "hours"; else minutes if large
      if (/hour/i.test(s)) return n * 60;
      if (n >= 60) return n;
    }
    return null;
  }

  function assessSectorCompensation(record) {
    var sectors = [];
    var text = (record && (record.lockedNarrative || record.rawText)) || '';
    var rows = (record && record.lofRows) || [];

    function delayNearFlight(flight, haystack) {
      if (!flight || !haystack) return null;
      var esc = flight.replace(/([.*+?^${}()|[\]\\])/g, '\\$1');
      // Require the flight code to be the grammatical subject of the delay clause
      var patterns = [
        new RegExp(esc + '\\b[^\\n.]{0,40}?had an arrival delay\\s+(?:of\\s+)?(\\d+\\s*h(?:ours?)?(?:\\s*\\d+\\s*m(?:ins?)?)?|\\d+\\s*hours?(?:\\s*\\d+\\s*m(?:ins?)?)?)', 'i'),
        new RegExp(esc + '\\b[^\\n.]{0,40}?arrival delay\\s+(?:of\\s+)?(\\d+\\s*h(?:ours?)?(?:\\s*\\d+\\s*m(?:ins?)?)?|\\d+\\s*hours?(?:\\s*\\d+\\s*m(?:ins?)?)?)', 'i'),
        new RegExp(esc + '\\b[^\\n.]{0,30}?(\\d+h\\d{2}m|\\d+\\s*h(?:ours?)?\\s*\\d+\\s*m)\\b', 'i')
      ];
      for (var i = 0; i < patterns.length; i++) {
        var m = haystack.match(patterns[i]);
        if (!m) continue;
        // Reject if another flight code sits between this flight and the delay phrase
        var idx = m.index;
        var between = haystack.slice(idx + flight.length, idx + m[0].length);
        if (/(?:EZY|U2|EJU|FR|BA|LS|RK)\s?\d{2,4}/i.test(between)) continue;
        var mins = parseDelayMinutes(m[1]);
        if (mins != null) return mins;
      }
      return null;
    }

    if (rows.length) {
      rows.forEach(function (r) {
        if (!(r.flight || '').trim()) return;
        var noteBlob = [r.note, r.status].filter(Boolean).join(' ');
        var mins = null;
        // Prefer delay stated on the LOF note for this row
        if (/arrival delay|delay\s+of|\d+\s*h|\d+h\d/i.test(noteBlob)) {
          mins = parseDelayMinutes(noteBlob);
        }
        if (mins == null) mins = delayNearFlight(r.flight, text);
        var status;
        if (mins == null) {
          status = 'EVIDENCE_HOLD';
        } else if (mins < 180) {
          status = 'NOT_COMPENSABLE';
        } else {
          status = 'COMPENSABLE';
        }
        sectors.push({
          flight: r.flight,
          route: r.route || '',
          delayMinutes: mins,
          art7Status: status,
          label: status === 'NOT_COMPENSABLE'
            ? (r.flight + ' — No compensation due — below Sturgeon 3h threshold')
            : (status === 'COMPENSABLE'
              ? (r.flight + ' — Art 7 compensable (≥3h)')
              : (r.flight + ' — EVIDENCE_HOLD: arrival delay not stated'))
        });
      });
    }

    // Narrative-only delays without LOF rows
    if (!sectors.length && text) {
      var reAll = /((?:EZY|U2|EJU|FR|BA|LS|RK)\s?\d{2,4})[^\n.]{0,100}?arrival delay\s+(?:of\s+)?(\d+\s*h(?:ours?)?(?:\s*\d+\s*m(?:ins?)?)?|\d+\s*hours?)/gi;
      var seen = {};
      var mm;
      while ((mm = reAll.exec(text)) !== null) {
        var fl = (mm[1] || '').replace(/\s+/g, '').toUpperCase();
        if (seen[fl]) continue;
        seen[fl] = true;
        var minsN = parseDelayMinutes(mm[2]);
        sectors.push({
          flight: fl,
          route: '',
          delayMinutes: minsN,
          art7Status: minsN != null && minsN < 180 ? 'NOT_COMPENSABLE' : (minsN != null ? 'COMPENSABLE' : 'EVIDENCE_HOLD'),
          label: minsN != null && minsN < 180
            ? (fl + ' — No compensation due — below Sturgeon 3h threshold')
            : (fl + (minsN != null ? ' — Art 7 compensable (≥3h)' : ' — EVIDENCE_HOLD: arrival delay not stated'))
        });
      }
    }

    return sectors;
  }

  function applySturgeonPreGate(position, sectorAssessments) {
    if (!sectorAssessments || !sectorAssessments.length) return position;
    var notComp = sectorAssessments.filter(function (s) { return s.art7Status === 'NOT_COMPENSABLE'; });
    var hold = sectorAssessments.filter(function (s) { return s.art7Status === 'EVIDENCE_HOLD'; });
    var comp = sectorAssessments.filter(function (s) { return s.art7Status === 'COMPENSABLE'; });
    var labels = sectorAssessments.map(function (s) { return s.label; });
    var next = Object.assign({}, position);
    next.sectorAssessments = sectorAssessments;
    next.conditions = (next.conditions || []).concat(labels);

    // All sectors below threshold — defence moot for Art 7
    if (notComp.length && !comp.length && !hold.length) {
      next.verdict = 'NOT_COMPENSABLE';
      next.frameworkLabel = 'NOT COMPENSABLE';
      next.band = 'defendable';
      next.title = 'No Art 7 compensation — below Sturgeon threshold';
      next.text = 'Per-sector delay under 3 hours. Art 7 not engaged; Art 9 care/expenses may still apply.';
      return next;
    }

    // Mixed: some not compensable, some need defence — keep defend position but surface flags
    if (notComp.length) {
      next.title = (next.title || 'Position') + ' — ' + notComp.map(function (s) { return s.flight; }).join(', ') + ' not compensable';
    }
    if (hold.length && (next.verdict === 'DEFEND' || next.verdict === 'DEFEND_WITH_CONDITIONS' || next.verdict === 'DEFEND_HOLD')) {
      hold.forEach(function (s) {
        next.conditions.push('EVIDENCE_HOLD: ' + s.flight + ' arrival time — do not assume compensability');
      });
      if (next.verdict === 'DEFEND') {
        next.verdict = 'DEFEND_HOLD';
        next.frameworkLabel = 'DEFEND HOLD';
        next.conditionType = 'EVIDENCE_HOLD';
      }
    }
    return next;
  }

  // Back-compat alias used by older tests
  function mapTreeExitToPreRating(treeResults, limb1Status) {
    var mapped = mapTreeExitToVerdict(treeResults, null, limb1Status, null);
    return {
      band: mapped.band,
      title: mapped.title,
      text: mapped.text,
      treeVerdict: mapped.treeVerdict,
      treeId: mapped.treeId,
      conditions: mapped.conditions,
      verdict: mapped.verdict,
      frameworkLabel: mapped.frameworkLabel,
      conditionType: mapped.conditionType
    };
  }

  function runTreesOnConfirmedRecord(record) {
    var iccText = record.lockedNarrative || record.rawText || '';
    var chain = record.causalChain || [];
    var evidenceManager = null;
    var confidenceManager = null;

    if (typeof DefendAbleEvidence !== 'undefined' && DefendAbleEvidence.createEvidenceManager) {
      evidenceManager = DefendAbleEvidence.createEvidenceManager();
    }
    if (typeof DefendAbleConfidence !== 'undefined' && DefendAbleConfidence.createConfidenceManager) {
      confidenceManager = DefendAbleConfidence.createConfidenceManager();
    }

    if (evidenceManager) {
      seedEvidenceFromTimeline(evidenceManager, record.tlEvStatus, record.evidenceDb, record.dtId);
    }

    var priority = null;
    if (typeof DefendAbleTypeMap !== 'undefined' && DefendAbleTypeMap.resolvePriority) {
      priority = DefendAbleTypeMap.resolvePriority({
        rmId: record.dtId,
        factorIds: record.factorIds || [],
        iccText: iccText
      });
    }

    var ctx = {
      iccText: iccText,
      causalChain: chain,
      evidenceManager: evidenceManager,
      confidenceManager: confidenceManager
    };

    var results = [];
    if (typeof DefendAbleOrchestrator !== 'undefined' && DefendAbleOrchestrator.runDecisionTrees) {
      results = DefendAbleOrchestrator.runDecisionTrees(evidenceManager, confidenceManager, iccText, { causalChain: chain }) || [];
    } else if (typeof DefendAbleTrees !== 'undefined' && DefendAbleTrees.runAllApplicable) {
      results = DefendAbleTrees.runAllApplicable(ctx) || [];
    }

    // Honour type-map primary: ensure primary tree runs first / is forced if missing
    if (priority && priority.primaryTree && typeof DefendAbleTrees !== 'undefined') {
      var hasPrimary = results.some(function (r) { return r.treeId === priority.primaryTree; });
      if (!hasPrimary) {
        var forced = DefendAbleTrees.runTree(priority.primaryTree, ctx, true);
        if (forced) results = [forced].concat(results || []);
      } else {
        results = results.slice().sort(function (a, b) {
          if (a.treeId === priority.primaryTree) return -1;
          if (b.treeId === priority.primaryTree) return 1;
          return 0;
        });
      }
      (priority.secondaryTrees || []).forEach(function (sid) {
        if (results.some(function (r) { return r.treeId === sid; })) return;
        var sec = DefendAbleTrees.runTree(sid, ctx, true);
        if (sec) results.push(sec);
      });
    }

    if ((!results || !results.length) && typeof DefendAbleTrees !== 'undefined' && typeof DefendAbleTypeMap !== 'undefined') {
      var forcedId = DefendAbleTypeMap.preferTreeForText(record.dtId, iccText);
      if (forcedId) {
        var forcedOnly = DefendAbleTrees.runTree(forcedId, ctx, true);
        if (forcedOnly) results = [forcedOnly];
      }
    }

    // Negation strengths — crew expressly excluded
    var strengths = [];
    if (typeof DefendAbleTreeEngine !== 'undefined' && DefendAbleTreeEngine.crewExpresslyExcluded(iccText)) {
      strengths.push('Crew within FDP — no crew issue');
    }

    var causalCheck = runCausalChainCheck(record, results);
    var position = mapTreeExitToVerdict(results, causalCheck, record.limb1Status, priority);
    var sectorAssessments = assessSectorCompensation(record);
    position = applySturgeonPreGate(position, sectorAssessments);
    position.strengths = strengths;
    var authorities = collectAuthorities(results, record.jurisdiction);

    return {
      treeResults: results,
      preRating: position,
      position: position,
      causalCheck: causalCheck,
      typePriority: priority,
      authorities: authorities,
      lockedNarrative: iccText,
      causalChain: chain,
      sectorAssessments: sectorAssessments,
      strengths: strengths
    };
  }

  function buildConfirmedRecord(opts) {
    opts = opts || {};
    var lofRows = opts.lofRows || [];
    var facts = opts.facts || null;
    var causalNodes = opts.causalNodes || [];
    var rawText = opts.rawText || '';
    var tlEvStatus = opts.tlEvStatus || {};
    var annotations = opts.nodeAnnotations || {};
    var dt = opts.dt || null;
    var jurisdiction = opts.jurisdiction || 'UK261';

    var lockedNarrative = buildLockedNarrative(lofRows, facts, causalNodes, rawText);
    var causalChain = buildCausalChain(causalNodes, lofRows, annotations);

    return {
      lofRows: lofRows,
      facts: facts,
      causalNodes: causalNodes,
      rawText: rawText,
      tlEvStatus: tlEvStatus,
      nodeAnnotations: annotations,
      dtId: dt && dt.id,
      limb1Status: dt && dt.limb1Status,
      factorIds: opts.factorIds || [],
      evidenceDb: opts.evidenceDb || null,
      lockedNarrative: lockedNarrative,
      causalChain: causalChain,
      jurisdiction: jurisdiction,
      confirmedAt: new Date().toISOString(),
      evidenceRequests: [],
      g1: null
    };
  }

  function buildCasePacket(record, extras) {
    extras = extras || {};
    return {
      schemaVersion: 1,
      type: 'case_packet',
      createdAt: new Date().toISOString(),
      jurisdiction: record.jurisdiction || null,
      facts: record.facts || null,
      lofRows: record.lofRows || [],
      causalChain: record.causalChain || [],
      lockedNarrative: record.lockedNarrative || '',
      evidenceMarks: record.tlEvStatus || {},
      evidenceRequests: record.evidenceRequests || [],
      disruptionType: record.dtId || null,
      // Future G3/G4 fields — pre-populated nulls
      totalExposure: null,
      settlementAuthorityCeiling: null,
      limitationDeadline: null,
      meta: extras.meta || null
    };
  }

  function buildDecisionPacket(record, run, g1) {
    run = run || {};
    var position = run.position || run.preRating || {};
    var trail = null;
    var critActions = null;
    if (typeof DefendAbleDecideWorkspace !== 'undefined') {
      if (DefendAbleDecideWorkspace.buildThinkingTrail) {
        trail = DefendAbleDecideWorkspace.buildThinkingTrail(record, run);
      }
      if (DefendAbleDecideWorkspace.buildCritActionList) {
        critActions = DefendAbleDecideWorkspace.buildCritActionList(record, run);
      }
    }
    return {
      schemaVersion: 1,
      type: 'decision_packet',
      createdAt: new Date().toISOString(),
      jurisdiction: record.jurisdiction || null,
      verdict: position.verdict || null,
      frameworkLabel: position.frameworkLabel || null,
      conditionType: position.conditionType || null,
      conditions: position.conditions || [],
      conditionsBeforeFinalResponse: position.conditions || [],
      thinkingTrail: trail,
      evidencePriorities: critActions,
      treeResults: run.treeResults || record.treeResults || [],
      typePriority: run.typePriority || null,
      causalCheck: run.causalCheck || null,
      authorities: run.authorities || [],
      g1: g1 || record.g1 || null,
      evidenceRequests: record.evidenceRequests || [],
      // Future G3/G4 fields — pre-populated nulls
      totalExposure: null,
      settlementAuthorityCeiling: null,
      limitationDeadline: null,
      quantum: null
    };
  }

    return {
    AUTHORITY_JURISDICTION: AUTHORITY_JURISDICTION,
    buildConfirmedRecord: buildConfirmedRecord,
    buildLockedNarrative: buildLockedNarrative,
    buildCausalChain: buildCausalChain,
    runTreesOnConfirmedRecord: runTreesOnConfirmedRecord,
    runCausalChainCheck: runCausalChainCheck,
    mapTreeExitToPreRating: mapTreeExitToPreRating,
    mapTreeExitToVerdict: mapTreeExitToVerdict,
    selectHeadlineTree: selectHeadlineTree,
    assessSectorCompensation: assessSectorCompensation,
    parseDelayMinutes: parseDelayMinutes,
    classifyAuthority: classifyAuthority,
    collectAuthorities: collectAuthorities,
    buildCasePacket: buildCasePacket,
    buildDecisionPacket: buildDecisionPacket
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DefendAbleLofLegalBridge;
}
