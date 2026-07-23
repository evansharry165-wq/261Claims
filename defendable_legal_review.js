/**
 * DefendAble — Legal Review (three-page horizontal slideshow)
 * Full-screen backdrop-blur. Fixed action bar. Numbered chips (1 REVIEW · 2 VERIFY · 3 CONFIRM).
 * 300ms ease-in-out horizontal translate. Keyboard: ← / → / Escape. Progress chips clickable.
 * Plain-English throughout — no DT-nn, no CRIT/IMPO/SUPP, no U-7/T-656, no jargon.
 * SEED-AUTHORITATIVE — every field derives from the confirmed record + data-bank seed.
 */
var DefendAbleLegalReview = (function () {
  'use strict';

  function esc(s) { return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  /* ── Plain-English disruption labels (RM_DB id → human phrase) ── */
  var PLAIN_DISRUPTION = {
    'weather': 'Weather',
    'atfm': 'ATC restriction (ATFM regulation)',
    'atc': 'ATC restriction',
    'third-party-ia': 'Third-party industrial action',
    'own-ia': 'Own staff industrial action',
    'birdstrike': 'Bird strike',
    'medical': 'Medical emergency',
    'security': 'Security event',
    'disruptive-pax': 'Disruptive passenger',
    'ground-damage': 'Ground damage',
    'airport-closure': 'Airport closure',
    'natural-disaster': 'Natural disaster',
    'political-unrest': 'Political unrest',
    'crew-fdp': 'Crew duty limit reached',
    'crew-sick': 'Crew illness',
    'technical': 'Technical fault'
  };
  function plainDisruption(id) {
    return PLAIN_DISRUPTION[id] || (id ? id.replace(/[-_]/g,' ').replace(/\b\w/g,function(c){return c.toUpperCase();}) : 'Disruption');
  }

  /* ── Verdict styling ── */
  var VERDICT = {
    DEFEND:                { cls: 'lrv-v-defend',    word: 'Defendable',                    tone: 'strong' },
    DEFEND_WITH_CONDITIONS:{ cls: 'lrv-v-defend-c',  word: 'Defendable subject to evidence',tone: 'strong' },
    DEFEND_HOLD:           { cls: 'lrv-v-defend-h',  word: 'Defendable — evidence pending', tone: 'medium' },
    SETTLE:                { cls: 'lrv-v-settle',    word: 'Consider settling',             tone: 'weak' },
    JUDGMENT_REQUIRED:     { cls: 'lrv-v-judgment',  word: 'Judgment call needed',          tone: 'neutral' }
  };

  /* ── Plain-English delay/status line (no STD/ATD) ── */
  function plainChain(state) {
    var f = state.facts || {};
    var rotation = f.rotation || [];
    var claimed = f;
    var claimedIdx = rotation.findIndex(function(s){ return s.fno === claimed.flightNum; });
    var priors = claimedIdx > 0 ? rotation.slice(0, claimedIdx) : [];
    var lines = [];
    priors.forEach(function(s){
      var phrase =
        s.status === 'ON TIME'   ? 'operated on time' :
        s.status === 'CANCELLED' ? 'cancelled' :
        s.status === 'DIVERTED'  ? ('diverted to ' + (s.divTo || 'alternate')) :
        s.status === 'DELAYED'   ? ('delayed by ' + (s.arrDelay || 0) + ' minutes') :
        'operated';
      lines.push({ label: s.fno + ' (' + s.frm + '–' + s.to + ')', phrase: phrase, state: s.status });
    });
    var claimedPhrase =
      claimed.isCancelled ? 'cancelled' :
      claimed.isDiverted  ? ('diverted to ' + (claimed.divertedTo || 'alternate')) :
      (claimed.delayMins != null && claimed.delayMins > 0) ? ('arrived ' + claimed.delayMins + ' minutes late') :
      'operated';
    lines.push({
      label: claimed.flightNum + ' (' + (claimed.depIata||'') + '–' + (claimed.arrIata||'') + ') — the claim',
      phrase: claimedPhrase,
      state: claimed.isCancelled ? 'CANCELLED' : claimed.isDiverted ? 'DIVERTED' : (claimed.delayMins ? 'DELAYED' : 'ON TIME'),
      isClaim: true
    });
    return lines;
  }

  /* ── Verdict key from tree exit ── */
  function verdictKey(pos) {
    var v = String((pos && (pos.verdict || pos.frameworkLabel)) || '').toUpperCase();
    if (v.indexOf('DEFEND_WITH_CONDITIONS') >= 0 || v.indexOf('CONDITIONS') >= 0) return 'DEFEND_WITH_CONDITIONS';
    if (v.indexOf('DEFEND_HOLD') >= 0 || v.indexOf('HOLD') >= 0) return 'DEFEND_HOLD';
    if (v.indexOf('DEFEND') >= 0) return 'DEFEND';
    if (v.indexOf('SETTLE') >= 0 || v.indexOf('CONCEDE') >= 0) return 'SETTLE';
    return 'JUDGMENT_REQUIRED';
  }

  /* ── Plain rationale (no internal tokens) ── */
  function plainRationale(state) {
    var f = state.facts || {};
    var mass = f.mass ? (' (mass event ' + f.mass.code + ' — ' + (f.mass.note || '') + ')') : '';
    var root = (f.rootCause && f.rootCause.reason) || (f.disruption && f.disruption.dtype) || '';
    var juris = state.jurisdiction || 'UK261';
    var art = 'Article 5(3) ' + juris;
    var v = state.verdictKey;
    if (v === 'SETTLE') return 'On the confirmed facts, defence is unlikely to succeed. Early settlement is the more efficient outcome.';
    if (v === 'JUDGMENT_REQUIRED') return 'The facts and the law give conflicting signals for this case. Escalate for a senior view.';
    if (v === 'DEFEND') {
      return (root ? root + mass + '. ' : '') + 'This is an extraordinary circumstance under ' + art + ' and all reasonable measures appear on file.';
    }
    // DEFEND_WITH_CONDITIONS / DEFEND_HOLD
    return (root ? root + mass + '. ' : '') + 'This is capable of being an extraordinary circumstance under ' + art + ', subject to the evidence listed on the next page.';
  }

  /* ── Quantum, plain ── */
  function plainQuantum(state) {
    var f = state.facts || {};
    var band = f.__seedBand || null;
    var pax = f.paxCount || null;
    var isUK = /UK/i.test(state.jurisdiction || 'UK261');
    var sym = isUK ? '£' : '€';
    if (f.delayMins != null && f.delayMins < 180 && !f.isCancelled && !f.isDiverted) {
      return { line: 'Not compensable — arrival delay of ' + f.delayMins + ' minutes is below the 3-hour threshold.', total: null };
    }
    if (!band || !pax) return { line: 'Exposure not calculable — confirm passenger count.', total: null };
    var perPax = isUK ? (band === 250 ? 220 : band === 400 ? 350 : 520) : band;
    var total = perPax * pax;
    return {
      line: sym + perPax + ' per passenger × ' + pax + ' passengers',
      total: sym + total.toLocaleString('en-GB')
    };
  }

  /* ── Evidence — single traffic-light list ── */
  function plainEvidence(state) {
    var f = state.facts || {};
    var narrative = (state.narrative || '').toLowerCase();
    var seen = {}; var out = [];
    function add(item, level) {
      var key = String(item).toLowerCase().trim();
      if (!key || seen[key]) return;
      seen[key] = true;
      out.push({ text: String(item).trim(), level: level });
    }
    // From data-bank
    var evStr = (f.disruption && f.disruption.evidence) || '';
    evStr.split(/;|·/).forEach(function (raw) {
      var it = raw.replace(/^\s*Evidence held:\s*/i, '').trim().replace(/\.$/, '');
      if (it && it.length > 2) add(it, 'green');
    });
    if (state.rotationConfirmed) add('Line of flying — ' + (state.rotationCount||0) + ' sectors on record', 'green');
    // From tree gate gaps — but strip internal tokens
    (state.gapItems || []).forEach(function (g) {
      var clean = String(g || '').replace(/^(EVIDENCE_HOLD|DEFEND_HOLD|SETTLE|DEFEND)\s*[:\-—]\s*/i,'')
                                 .replace(/^Collect key evidence:\s*/i,'')
                                 .replace(/\s+—\s+proof pending$/i,'')
                                 .replace(/\s+—\s+Flight Details.*$/i,'')
                                 .trim();
      if (clean && clean.length > 3) add(clean, 'red');
    });
    if (!out.length) add('Operational evidence pack', 'amber');
    return out.slice(0, 10);
  }

  /* ── Authorities (kept — this is useful) ── */
  function plainAuthorities(state) {
    var list = state.authorities || [];
    return list.map(function (a) {
      var name = a.citation || a.ref || a.name || String(a);
      var weight = String(a.weight || '').toLowerCase();
      var binding = weight === 'binding' || /binding/i.test(name);
      return { name: name.replace(/\s+—.*$/, ''), binding: binding, ratio: a.note || a.ratio || '' };
    }).sort(function(a,b){ return (b.binding?1:0) - (a.binding?1:0); }).slice(0, 5);
  }

  /* ── Was this the airline's own choice? (plain T-656 line) ── */
  function plainCausalLine(state) {
    var cc = state.causalCheck;
    if (cc && cc.brokenBy) return { txt: 'A voluntary decision by the airline appears to have prolonged the delay — this can weaken the defence.', good: false };
    return { txt: 'No autonomous decision by the airline that would break the defence chain.', good: true };
  }

  /* ── Story headline ── */
  function storyHeadline(state) {
    var f = state.facts || {};
    if (!f.flightNum) return '';
    var route = (f.depIata && f.arrIata) ? (f.depIata + '–' + f.arrIata) : '';
    var date = f.date || '';
    var body =
      f.isCancelled ? 'cancelled' :
      f.isDiverted  ? ('diverted to ' + (f.divertedTo || 'alternate')) :
      (f.delayMins != null && f.delayMins > 0) ? ('arrived ' + f.delayMins + ' min late') :
      'operated';
    var rootSuffix = (f.rootCause && f.rootCause.fno && f.rootCause.fno !== f.flightNum)
      ? ' — cascade from ' + f.rootCause.fno : '';
    return f.flightNum + (route ? ' ' + route : '') + (date ? ' ' + date : '') + ' — ' + body + rootSuffix;
  }

  /* ── Primary/secondary disruption identification (from tree exit) ── */
  function plainPrimarySecondary(state) {
    var priority = state.typePriority || {};
    var primary = plainDisruption(priority.primaryDtId || (state.facts && state.facts.disruption && state.facts.disruption.dtypeId) || null);
    var secondaries = (priority.secondaryDtIds || []).map(plainDisruption);
    return { primary: primary || plainDisruption((state.facts && state.facts.rootCause && state.facts.rootCause.dtypeId)), secondaries: secondaries };
  }

  /* ── STYLES ── */
  function injectStyles() {
    if (document.getElementById('lrv-style')) return;
    var st = document.createElement('style');
    st.id = 'lrv-style';
    st.textContent = [
      /* trigger + backdrop */
      '.lrv-open-btn{margin-top:14px;background:var(--navy,#1A2F45);color:#fff;font-family:var(--mono,monospace);font-size:11px;letter-spacing:.08em;text-transform:uppercase;padding:12px 22px;border:0;border-radius:5px;cursor:pointer;box-shadow:0 2px 6px rgba(26,47,69,.18)}',
      '.lrv-open-btn:hover{background:var(--navy-mid,#2A4A6B)}',
      '.lrv-backdrop{position:fixed;inset:0;background:rgba(20,25,35,.72);backdrop-filter:blur(8px);z-index:2000;display:flex;flex-direction:column;animation:lrv-fade .18s ease}',
      '@keyframes lrv-fade{from{opacity:0}to{opacity:1}}',
      /* frame */
      '.lrv-frame{flex:1;display:flex;flex-direction:column;overflow:hidden}',
      '.lrv-top{padding:22px 40px 14px;color:#fff;display:flex;align-items:center;gap:24px;flex-wrap:wrap}',
      '.lrv-top .kicker{font-family:var(--mono,monospace);font-size:9.5px;letter-spacing:.16em;text-transform:uppercase;color:rgba(255,255,255,.5)}',
      '.lrv-top .story{font-family:var(--serif,Georgia,serif);font-size:17px;color:#fff;line-height:1.3;flex:1;min-width:280px}',
      '.lrv-close{background:transparent;border:0;color:rgba(255,255,255,.75);font-family:var(--mono,monospace);font-size:10px;letter-spacing:.08em;text-transform:uppercase;cursor:pointer}',
      '.lrv-close:hover{color:#fff}',
      /* chips */
      '.lrv-chips{display:flex;gap:12px;padding:6px 40px 22px;align-items:center}',
      '.lrv-chip{display:flex;align-items:center;gap:9px;padding:8px 16px;border-radius:24px;background:rgba(255,255,255,.06);color:rgba(255,255,255,.55);font-family:var(--mono,monospace);font-size:10px;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;transition:background .18s,color .18s;border:1px solid rgba(255,255,255,.08)}',
      '.lrv-chip .num{width:20px;height:20px;border-radius:50%;background:rgba(255,255,255,.14);color:rgba(255,255,255,.7);font-family:var(--serif,Georgia,serif);font-size:11px;display:inline-flex;align-items:center;justify-content:center;font-weight:400}',
      '.lrv-chip.active{background:#fff;color:var(--navy,#1A2F45);border-color:#fff}',
      '.lrv-chip.active .num{background:var(--navy,#1A2F45);color:#fff}',
      '.lrv-chip.done{color:rgba(255,255,255,.85)}',
      '.lrv-chip.done .num::before{content:"✓";font-size:11px}',
      '.lrv-chip.done .num{font-size:0}',
      '.lrv-chip-sep{color:rgba(255,255,255,.2)}',
      /* stage — viewport window */
      '.lrv-stage{flex:1;overflow:hidden;position:relative;margin:0 40px;background:var(--surface,#F8F5EF);border-radius:10px 10px 0 0;box-shadow:0 -12px 40px rgba(0,0,0,.24)}',
      '.lrv-track{display:flex;height:100%;width:300%;transition:transform 320ms cubic-bezier(.4,0,.2,1);will-change:transform}',
      '.lrv-page{width:calc(100% / 3);height:100%;overflow-y:auto;padding:34px 48px 40px}',
      /* page shared */
      '.lrv-page-title{font-family:var(--serif,Georgia,serif);font-size:24px;color:var(--ink,#16181D);margin:0 0 4px}',
      '.lrv-page-sub{font-family:var(--sans,sans-serif);font-size:13px;color:var(--ink-3,#6B7280);margin-bottom:26px}',
      '.lrv-sec-kicker{font-family:var(--mono,monospace);font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-3,#6B7280);margin:24px 0 10px;padding-top:20px;border-top:1px solid var(--rule-soft,#DDD6CA)}',
      '.lrv-sec-kicker:first-of-type{border-top:0;padding-top:0;margin-top:0}',
      /* REVIEW page */
      '.lrv-class{background:var(--surface-2,#FFFCF7);border:1px solid var(--rule,#C9C2B6);border-radius:8px;padding:18px 22px}',
      '.lrv-class .lbl{font-family:var(--mono,monospace);font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-3,#6B7280)}',
      '.lrv-class .val{font-family:var(--serif,Georgia,serif);font-size:18px;color:var(--ink,#16181D);margin-top:4px}',
      '.lrv-class .sec{margin-top:12px;font-size:12.5px;color:var(--ink-2,#3A3F4A)}',
      '.lrv-class .note{margin-top:14px;padding:12px 14px;background:var(--claim-bg,#E8F0FA);border-radius:5px;font-size:12.5px;color:var(--ink-2,#3A3F4A);border-left:3px solid var(--claim,#1E4D8C)}',
      /* delay chain — plain time */
      '.lrv-chain{background:var(--surface-2,#FFFCF7);border:1px solid var(--rule,#C9C2B6);border-radius:8px;overflow:hidden}',
      '.lrv-chain-row{display:flex;align-items:center;gap:16px;padding:14px 22px;border-top:1px dashed var(--rule-soft,#DDD6CA)}',
      '.lrv-chain-row:first-child{border-top:0}',
      '.lrv-chain-row.claim{background:var(--claim-bg,#E8F0FA)}',
      '.lrv-chain-dot{width:10px;height:10px;border-radius:50%;flex:none}',
      '.lrv-chain-dot.ON{background:var(--ec,#1B5C3A)}',
      '.lrv-chain-dot.DELAYED{background:var(--judgment,#8A6B00)}',
      '.lrv-chain-dot.CANCELLED{background:var(--settle,#7A1A1A)}',
      '.lrv-chain-dot.DIVERTED{background:var(--claim,#1E4D8C)}',
      '.lrv-chain-row .lbl{font-family:var(--mono,monospace);font-size:11px;color:var(--ink-2,#3A3F4A);min-width:220px}',
      '.lrv-chain-row .lbl b{color:var(--ink,#16181D);font-weight:600}',
      '.lrv-chain-row .phrase{font-family:var(--sans,sans-serif);font-size:13px;color:var(--ink-2,#3A3F4A);flex:1}',
      '.lrv-chain-row.claim .phrase{color:var(--ink,#16181D);font-weight:500}',
      /* VERIFY page */
      '.lrv-evlist{border:1px solid var(--rule,#C9C2B6);border-radius:8px;background:var(--surface-2,#FFFCF7);overflow:hidden}',
      '.lrv-evitem{display:flex;align-items:center;gap:14px;padding:12px 18px;border-top:1px dashed var(--rule-soft,#DDD6CA)}',
      '.lrv-evitem:first-child{border-top:0}',
      '.lrv-evlight{width:12px;height:12px;border-radius:50%;flex:none;box-shadow:inset 0 0 0 2px rgba(0,0,0,.05)}',
      '.lrv-evlight.green{background:var(--ec,#1B5C3A)}',
      '.lrv-evlight.amber{background:var(--judgment,#8A6B00)}',
      '.lrv-evlight.red{background:var(--settle,#7A1A1A)}',
      '.lrv-evitem .text{font-size:13px;color:var(--ink-2,#3A3F4A);flex:1}',
      '.lrv-evitem .state{font-family:var(--mono,monospace);font-size:9.5px;letter-spacing:.08em;text-transform:uppercase}',
      '.lrv-evitem.green .state{color:var(--ec,#1B5C3A)}',
      '.lrv-evitem.amber .state{color:var(--judgment,#8A6B00)}',
      '.lrv-evitem.red .state{color:var(--settle,#7A1A1A)}',
      '.lrv-evfoot{font-family:var(--mono,monospace);font-size:10px;color:var(--ink-3,#6B7280);margin-top:10px;letter-spacing:.03em}',
      '.lrv-auths{display:flex;flex-wrap:wrap;gap:8px}',
      '.lrv-auth{font-family:var(--mono,monospace);font-size:10.5px;padding:6px 12px;border-radius:3px;letter-spacing:.02em;background:var(--surface-2,#FFFCF7);border:1px solid var(--rule,#C9C2B6);color:var(--ink-2,#3A3F4A);cursor:default;position:relative}',
      '.lrv-auth.binding{background:var(--claim-bg,#E8F0FA);border-color:var(--claim-border,#8BB0D9);color:var(--claim,#1E4D8C)}',
      '.lrv-auth .weight{font-size:8.5px;opacity:.7;margin-right:6px;letter-spacing:.1em}',
      '.lrv-auth[data-ratio]:hover::after{content:attr(data-ratio);position:absolute;bottom:calc(100% + 8px);left:0;background:var(--ink,#16181D);color:#fff;padding:8px 10px;border-radius:4px;font-size:10.5px;line-height:1.45;width:280px;z-index:5;box-shadow:0 6px 14px rgba(0,0,0,.25);font-family:var(--sans,sans-serif)}',
      '.lrv-causal{margin-top:8px;padding:12px 16px;border-radius:6px;font-size:12.5px;line-height:1.5;background:var(--ec-bg,#E6F3EB);color:var(--ec,#1B5C3A);border:1px solid var(--ec-border,#8FC9A8)}',
      '.lrv-causal.bad{background:#FBECEC;color:var(--settle,#7A1A1A);border-color:#EDBFBF}',
      /* CONFIRM page */
      '.lrv-verdict{padding:28px 30px;border-radius:10px;background:var(--surface-2,#FFFCF7);border:1px solid var(--rule,#C9C2B6);text-align:left}',
      '.lrv-verdict .word{font-family:var(--serif,Georgia,serif);font-size:38px;line-height:1;letter-spacing:-.005em}',
      '.lrv-verdict.lrv-v-defend .word{color:var(--ec,#1B5C3A)}',
      '.lrv-verdict.lrv-v-defend-c .word{color:#2F6B4F}',
      '.lrv-verdict.lrv-v-defend-h .word{color:var(--judgment,#8A6B00)}',
      '.lrv-verdict.lrv-v-settle .word{color:var(--settle,#7A1A1A)}',
      '.lrv-verdict.lrv-v-judgment .word{color:var(--ink-3,#6B7280)}',
      '.lrv-verdict .rat{font-family:var(--sans,sans-serif);font-size:14px;margin-top:14px;color:var(--ink-2,#3A3F4A);line-height:1.55;max-width:720px}',
      '.lrv-verdict .quant{margin-top:20px;padding-top:16px;border-top:1px solid var(--rule-soft,#DDD6CA);display:flex;gap:14px;align-items:baseline;flex-wrap:wrap}',
      '.lrv-verdict .quant .qkick{font-family:var(--mono,monospace);font-size:9.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-3,#6B7280)}',
      '.lrv-verdict .quant b{font-family:var(--serif,Georgia,serif);font-size:26px;font-weight:400;color:var(--ink,#16181D)}',
      '.lrv-verdict .quant .qline{font-family:var(--mono,monospace);font-size:11.5px;color:var(--ink-2,#3A3F4A)}',
      '.lrv-checks{margin-top:24px}',
      '.lrv-check{display:flex;align-items:center;gap:12px;padding:10px 0;font-size:13px;color:var(--ink-2,#3A3F4A);cursor:pointer;user-select:none}',
      '.lrv-check input{width:16px;height:16px;accent-color:var(--ec,#1B5C3A);cursor:pointer}',
      '.lrv-check b{font-weight:600;color:var(--ink,#16181D)}',
      '.lrv-signoff-name{margin-top:18px}',
      '.lrv-signoff-name label{display:block;font-family:var(--mono,monospace);font-size:9.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-3,#6B7280);margin-bottom:6px}',
      '.lrv-signoff-name input{width:220px;padding:8px 12px;border:1px solid var(--rule,#C9C2B6);border-radius:4px;font-family:var(--sans,sans-serif);font-size:13px;background:var(--surface-2,#FFFCF7)}',
      '.lrv-signoff-name input:focus{outline:0;border-color:var(--navy,#1A2F45)}',
      /* action bar (fixed) */
      '.lrv-bar{padding:16px 40px 22px;display:flex;gap:12px;align-items:center;background:transparent}',
      '.lrv-bar .filler{flex:1}',
      '.lrv-btn{font-family:var(--mono,monospace);font-size:11px;letter-spacing:.08em;text-transform:uppercase;padding:12px 22px;border-radius:5px;cursor:pointer;border:1px solid transparent;transition:background .15s,border-color .15s}',
      '.lrv-btn.back{background:transparent;color:rgba(255,255,255,.7);border-color:rgba(255,255,255,.25)}',
      '.lrv-btn.back:hover{color:#fff;border-color:rgba(255,255,255,.5)}',
      '.lrv-btn.next{background:#fff;color:var(--navy,#1A2F45);border-color:#fff}',
      '.lrv-btn.next:hover{background:rgba(255,255,255,.9)}',
      '.lrv-btn.approve{background:var(--ec,#1B5C3A);color:#fff;border-color:var(--ec,#1B5C3A)}',
      '.lrv-btn.approve:hover{background:#154829}',
      '.lrv-btn.approve:disabled{background:rgba(255,255,255,.1);color:rgba(255,255,255,.4);border-color:rgba(255,255,255,.1);cursor:not-allowed}',
      '.lrv-btn.sendback{background:transparent;color:#fff;border-color:rgba(255,255,255,.4)}',
      '.lrv-btn.sendback:hover{background:rgba(255,255,255,.06)}',
      /* status overlay */
      '.lrv-toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:var(--ink,#16181D);color:#fff;padding:14px 22px;border-radius:6px;font-family:var(--mono,monospace);font-size:11px;letter-spacing:.06em;box-shadow:0 8px 20px rgba(0,0,0,.4);z-index:2100;opacity:0;transition:opacity .2s}',
      '.lrv-toast.show{opacity:1}'
    ].join('\n');
    document.head.appendChild(st);
  }

  /* ── State builder (seed-authoritative) ── */
  function stateFromContext(ctx) {
    ctx = ctx || {};
    var facts = ctx.facts || {};
    var run = ctx.run || {};
    var record = ctx.record || {};
    var pos = run.position || run.preRating || {};
    var seedBand = null;
    try { var s = window.__DEFENDABLE_SEED__; if (s && s.claimed) seedBand = s.claimed.band || null; } catch(e){}
    var gapItems = [];
    (run.treeResults || []).forEach(function (t) {
      (t.gates || []).forEach(function (g) {
        (g.gaps || []).forEach(function (gap) {
          var lbl = gap.label || gap.name || gap;
          if (lbl && gapItems.indexOf(lbl) < 0) gapItems.push(String(lbl));
        });
      });
    });
    var factsWithBand = Object.assign({}, facts, { __seedBand: seedBand });
    return {
      verdictKey: verdictKey(pos),
      facts: factsWithBand,
      narrative: ctx.narrative || (document.getElementById('iccText') ? document.getElementById('iccText').value : ''),
      jurisdiction: record.jurisdiction || facts.jurisdiction || 'UK261',
      conditions: (pos.conditions || []).map(function (c) { return c.text || c.label || String(c); }),
      authorities: run.authorities || [],
      typePriority: run.typePriority || record.typePriority || {},
      causalCheck: run.causalCheck || null,
      gapItems: gapItems,
      rotationConfirmed: !!(record && record.lofRows && record.lofRows.length),
      rotationCount: (record && record.lofRows && record.lofRows.length) || 0,
      caseRef: ctx.caseRef || ''
    };
  }

  /* ── OPEN — three-page slideshow ── */
  function open(state) {
    injectStyles();

    var vk = state.verdictKey || 'JUDGMENT_REQUIRED';
    var vstyle = VERDICT[vk] || VERDICT.JUDGMENT_REQUIRED;
    var story = storyHeadline(state);
    var chain = plainChain(state);
    var ps = plainPrimarySecondary(state);
    var rationale = plainRationale(state);
    var quantum = plainQuantum(state);
    var evidence = plainEvidence(state);
    var authorities = plainAuthorities(state);
    var causal = plainCausalLine(state);

    /* ── PAGE 1: REVIEW ── */
    var page1 =
      '<div class="lrv-page" data-page="0">' +
        '<h1 class="lrv-page-title">Review the claim</h1>' +
        '<div class="lrv-page-sub">A quick classification and the delay story, so you know what you\'re dealing with.</div>' +
        '<div class="lrv-sec-kicker">Classification</div>' +
        '<div class="lrv-class">' +
          '<div class="lbl">Primary disruption</div>' +
          '<div class="val">' + esc(ps.primary) + '</div>' +
          (ps.secondaries.length ? '<div class="sec"><span class="lbl" style="text-transform:none;letter-spacing:0;font-size:11.5px">Also contributing: </span>' + esc(ps.secondaries.join(', ')) + '</div>' : '') +
          (state.facts && state.facts.mass ? '<div class="note">Part of mass event <b>' + esc(state.facts.mass.code) + '</b> — ' + esc(state.facts.mass.note || '') + '.</div>' : '') +
        '</div>' +
        '<div class="lrv-sec-kicker">Delay chain</div>' +
        '<div class="lrv-chain">' +
          chain.map(function (r) {
            var dotClass = r.state === 'ON TIME' ? 'ON' : r.state;
            return '<div class="lrv-chain-row' + (r.isClaim ? ' claim' : '') + '">' +
                     '<span class="lrv-chain-dot ' + dotClass + '"></span>' +
                     '<span class="lbl"><b>' + esc(r.label) + '</b></span>' +
                     '<span class="phrase">' + esc(r.phrase) + '</span>' +
                   '</div>';
          }).join('') +
        '</div>' +
      '</div>';

    /* ── PAGE 2: VERIFY ── */
    var authsHtml = authorities.length ? authorities.map(function (a) {
      return '<span class="lrv-auth' + (a.binding ? ' binding' : '') + '"' +
        (a.ratio ? ' data-ratio="' + esc(a.ratio) + '"' : '') + '>' +
        '<span class="weight">' + (a.binding ? 'BINDING' : 'PERSUASIVE') + '</span>' + esc(a.name) + '</span>';
    }).join('') : '<div style="color:var(--ink-3,#6B7280);font-family:var(--mono,monospace);font-size:11px;font-style:italic">No specific authorities engaged for this exit.</div>';

    var page2 =
      '<div class="lrv-page" data-page="1">' +
        '<h1 class="lrv-page-title">Verify the evidence and reasoning</h1>' +
        '<div class="lrv-page-sub">One list, traffic lights. Missing items are requested via the case management platform after you confirm.</div>' +
        '<div class="lrv-sec-kicker">Evidence pack</div>' +
        '<div class="lrv-evlist">' +
          evidence.map(function (e) {
            var label = e.level === 'green' ? 'On file' : e.level === 'amber' ? 'Referenced — verify' : 'Missing — request';
            return '<div class="lrv-evitem ' + e.level + '">' +
                     '<span class="lrv-evlight ' + e.level + '"></span>' +
                     '<span class="text">' + esc(e.text) + '</span>' +
                     '<span class="state">' + label + '</span>' +
                   '</div>';
          }).join('') +
        '</div>' +
        '<div class="lrv-evfoot">Missing items will be requested through the CM platform after you confirm this position.</div>' +
        '<div class="lrv-sec-kicker">Authorities engaged</div>' +
        '<div class="lrv-auths">' + authsHtml + '</div>' +
        '<div class="lrv-sec-kicker">Was this the airline\'s own choice?</div>' +
        '<div class="lrv-causal' + (causal.good ? '' : ' bad') + '">' + esc(causal.txt) + '</div>' +
      '</div>';

    /* ── PAGE 3: CONFIRM ── */
    var qHtml = quantum.total
      ? '<div class="quant"><span class="qkick">Total exposure</span><b>' + esc(quantum.total) + '</b><span class="qline">' + esc(quantum.line) + '</span></div>'
      : '<div class="quant"><span class="qkick">Exposure</span><span class="qline">' + esc(quantum.line) + '</span></div>';

    var page3 =
      '<div class="lrv-page" data-page="2">' +
        '<h1 class="lrv-page-title">Confirm and send to case management</h1>' +
        '<div class="lrv-page-sub">Tick the three boxes if you\'re satisfied, then approve — the case files itself into the platform with the evidence pack attached.</div>' +
        '<div class="lrv-verdict ' + vstyle.cls + '">' +
          '<div class="word">' + esc(vstyle.word) + '</div>' +
          '<div class="rat">' + esc(rationale) + '</div>' +
          qHtml +
        '</div>' +
        '<div class="lrv-checks">' +
          '<label class="lrv-check"><input type="checkbox" data-check="facts"> <span><b>Facts look right</b> — the classification and delay chain match my understanding.</span></label>' +
          '<label class="lrv-check"><input type="checkbox" data-check="law"> <span><b>Law applied correctly</b> — the authorities engaged are the right ones for this disruption.</span></label>' +
          '<label class="lrv-check"><input type="checkbox" data-check="evidence"> <span><b>Evidence list is correct</b> — the outstanding items are ones the CM platform can pursue.</span></label>' +
        '</div>' +
        '<div class="lrv-signoff-name">' +
          '<label>Lawyer initials</label>' +
          '<input type="text" id="lrv-by" placeholder="e.g. HE" maxlength="8">' +
        '</div>' +
      '</div>';

    /* ── FRAME ── */
    var bd = document.createElement('div');
    bd.className = 'lrv-backdrop';
    bd.innerHTML =
      '<div class="lrv-frame">' +
        '<div class="lrv-top">' +
          '<div><div class="kicker">Legal Review</div>' +
          '<div class="story">' + esc(story) + '</div></div>' +
          '<button class="lrv-close" id="lrv-close">Close ×</button>' +
        '</div>' +
        '<div class="lrv-chips">' +
          '<span class="lrv-chip active" data-goto="0"><span class="num">1</span>Review</span>' +
          '<span class="lrv-chip-sep">—</span>' +
          '<span class="lrv-chip" data-goto="1"><span class="num">2</span>Verify</span>' +
          '<span class="lrv-chip-sep">—</span>' +
          '<span class="lrv-chip" data-goto="2"><span class="num">3</span>Confirm</span>' +
        '</div>' +
        '<div class="lrv-stage">' +
          '<div class="lrv-track" id="lrv-track">' + page1 + page2 + page3 + '</div>' +
        '</div>' +
        '<div class="lrv-bar" id="lrv-bar">' +
          '<button class="lrv-btn back" id="lrv-back" style="visibility:hidden">← Back</button>' +
          '<div class="filler"></div>' +
          '<button class="lrv-btn sendback" id="lrv-sendback" style="display:none">Send back for evidence</button>' +
          '<button class="lrv-btn next" id="lrv-next">Next: Verify →</button>' +
          '<button class="lrv-btn approve" id="lrv-approve" style="display:none" disabled>Approve &amp; send to case management →</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(bd);

    var pageIdx = 0;
    var chips = bd.querySelectorAll('.lrv-chip');
    var backBtn = bd.querySelector('#lrv-back');
    var nextBtn = bd.querySelector('#lrv-next');
    var approveBtn = bd.querySelector('#lrv-approve');
    var sendbackBtn = bd.querySelector('#lrv-sendback');
    var track = bd.querySelector('#lrv-track');
    var checks = bd.querySelectorAll('.lrv-check input');
    var byInput = null;

    function go(idx) {
      idx = Math.max(0, Math.min(2, idx));
      pageIdx = idx;
      track.style.transform = 'translateX(-' + (idx * 33.3333) + '%)';
      chips.forEach(function (c, i) {
        c.classList.toggle('active', i === idx);
        c.classList.toggle('done', i < idx);
      });
      backBtn.style.visibility = idx === 0 ? 'hidden' : 'visible';
      nextBtn.style.display = idx < 2 ? 'inline-flex' : 'none';
      approveBtn.style.display = idx === 2 ? 'inline-flex' : 'none';
      sendbackBtn.style.display = idx === 2 ? 'inline-flex' : 'none';
      nextBtn.textContent = idx === 0 ? 'Next: Verify →' : 'Next: Confirm →';
      if (idx === 2) {
        byInput = bd.querySelector('#lrv-by');
        setTimeout(function(){ byInput && byInput.focus(); }, 320);
      }
    }
    function updateApproveState() {
      var allChecked = Array.prototype.every.call(checks, function (c) { return c.checked; });
      var hasName = byInput && byInput.value.trim().length > 0;
      approveBtn.disabled = !(allChecked && hasName);
    }

    chips.forEach(function (c) { c.onclick = function () { go(parseInt(c.getAttribute('data-goto'), 10)); }; });
    backBtn.onclick = function () { go(pageIdx - 1); };
    nextBtn.onclick = function () { go(pageIdx + 1); };
    checks.forEach(function (c) { c.onchange = updateApproveState; });
    bd.addEventListener('input', function (e) { if (e.target && e.target.id === 'lrv-by') updateApproveState(); });

    function close() { bd.remove(); document.removeEventListener('keydown', keyH); }
    function keyH(e) {
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight' && pageIdx < 2) go(pageIdx + 1);
      else if (e.key === 'ArrowLeft' && pageIdx > 0) go(pageIdx - 1);
    }
    bd.querySelector('#lrv-close').onclick = close;
    document.addEventListener('keydown', keyH);

    function toast(msg) {
      var t = document.createElement('div');
      t.className = 'lrv-toast'; t.textContent = msg;
      document.body.appendChild(t);
      setTimeout(function(){ t.classList.add('show'); }, 20);
      setTimeout(function(){ t.classList.remove('show'); setTimeout(function(){t.remove();}, 300); }, 2500);
    }

    approveBtn.onclick = function () {
      var by = (byInput && byInput.value.trim()) || '';
      if (!by) return;
      try {
        if (typeof DefendAbleDecideWorkspace !== 'undefined' && DefendAbleDecideWorkspace.signOff) {
          DefendAbleDecideWorkspace.signOff('approve', { by: by, note: '' });
        }
      } catch (e) {}
      toast('Approved by ' + by + ' — sending to case management…');
      setTimeout(function () {
        try {
          if (typeof DefendAbleDecideWorkspace !== 'undefined' && DefendAbleDecideWorkspace.sendToManage) {
            DefendAbleDecideWorkspace.sendToManage();
          } else if (typeof openCaseHandoffPack === 'function') {
            openCaseHandoffPack();
          }
        } catch (e) {}
        close();
      }, 900);
    };
    sendbackBtn.onclick = function () {
      var by = (byInput && byInput.value.trim()) || (window.prompt('Your initials for the send-back record:') || '').trim();
      if (!by) return;
      try {
        if (typeof DefendAbleDecideWorkspace !== 'undefined' && DefendAbleDecideWorkspace.signOff) {
          DefendAbleDecideWorkspace.signOff('send_back_evidence', { by: by, note: 'Sent back from Confirm page — outstanding evidence to be pursued.' });
        }
      } catch (e) {}
      toast('Sent back for evidence — no case created.');
      setTimeout(close, 900);
    };

    go(0);
  }

  return { open: open, stateFromContext: stateFromContext };
})();
if (typeof module !== 'undefined' && module.exports) { module.exports = DefendAbleLegalReview; }
