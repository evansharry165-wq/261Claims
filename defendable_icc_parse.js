/**
 * DefendAble ICC / ops-narrative parser
 * Normalises airline shorthand into LOF rows, facts, and story events.
 */
(function (root) {
  'use strict';

  var CARRIER_PREFIXES = [
    'EZY', 'EJU', 'EZS', 'EZT', 'U2', 'E2', 'H2', 'BAW', 'RYR', 'IBE', 'AEA', 'VLG',
    'TOM', 'TCX', 'BE', 'FR', 'W6', 'LS', 'BY', 'DY', 'VY', 'LH', 'BA',
    'AF', 'KL', 'IB', 'AZ', 'SK', 'TP', 'SN', 'HV', 'TO', 'QS', 'OK',
    'BT', 'LO', 'LX', 'OS'
  ];

  // Ambiguous 2-letter codes that collide with English words ("to 4470")
  var AMBIGUOUS_CARRIERS = { TO: 1, BY: 1, BE: 1, OR: 1, SO: 1, NO: 1, AN: 1, AT: 1 };

  function carrierAlt() {
    return CARRIER_PREFIXES.slice().sort(function (a, b) { return b.length - a.length; }).join('|');
  }

  /**
   * Accept 0820z, 08:20Z, 0820 utc, 1545z local → 08:20Z
   */
  function normalizeOpsTime(raw) {
    if (raw == null) return '';
    var s = String(raw).trim();
    if (!s) return '';
    var m = s.match(/^(\d{1,2}):(\d{2})\s*[Zz]?(?:\s*(?:utc|local))?$/i);
    if (m) {
      return pad2(m[1]) + ':' + m[2] + 'Z';
    }
    m = s.match(/^(\d{3,4})\s*[Zz]?(?:\s*(?:utc|local))?$/i);
    if (m) {
      var d = m[1];
      if (d.length === 3) d = '0' + d;
      var hh = d.slice(0, 2);
      var mm = d.slice(2, 4);
      var hi = parseInt(hh, 10);
      var mi = parseInt(mm, 10);
      if (hi > 23 || mi > 59) return '';
      return hh + ':' + mm + 'Z';
    }
    return '';
  }

  function pad2(n) {
    n = String(n);
    return n.length < 2 ? '0' + n : n;
  }

  /** Match HH:MM[z] or HHMMz / HHMM utc anywhere in a string; return first normalised. */
  function firstOpsTime(str) {
    if (!str) return '';
    var m = str.match(/\b(\d{1,2}:\d{2})\s*[Zz]?\b|\b(\d{3,4})\s*[Zz]\b|\b(\d{3,4})\s*(?:utc|zulu)\b/i);
    if (!m) return '';
    return normalizeOpsTime(m[1] || m[2] || m[3]);
  }

  function labeledTime(ctx, patterns) {
    for (var i = 0; i < patterns.length; i++) {
      var m = ctx.match(patterns[i]);
      if (m) {
        var t = normalizeOpsTime(m[1] || m[2] || m[3] || '');
        if (t) return t;
      }
    }
    return '';
  }

  var TIME_TOKEN =
    '(\\d{1,2}:\\d{2}|\\d{3,4})\\s*[Zz]?(?:\\s*(?:utc|local|zulu))?';

  // 3-letter tokens that look like IATA but are ops abbreviations
  var NOT_AIRPORTS = {
    ETA: 1, ETD: 1, ATA: 1, ATD: 1, STD: 1, STA: 1, UTC: 1, GDP: 1, FDP: 1,
    OCC: 1, ATC: 1, TMA: 1, FIR: 1, MET: 1, SMS: 1, PAX: 1, AOG: 1, MEL: 1,
    NOT: 1, YET: 1, AND: 1, THE: 1, FOR: 1, WAS: 1, NOW: 1, ALL: 1, END: 1,
    ART: 1, DUE: 1, DEP: 1, ARR: 1, OUT: 1, OFF: 1, ONB: 1
  };

  function isAirportCode(code) {
    if (!code || code.length !== 3) return false;
    return !NOT_AIRPORTS[code.toUpperCase()];
  }

  function flightMatchIsValid(prefix, fullMatch, text, index) {
    var p = prefix.toUpperCase();
    // Reject lowercase English "to 4470" / "by 1030" style collisions
    if (AMBIGUOUS_CARRIERS[p]) {
      var rawPrefix = fullMatch.slice(0, prefix.length);
      if (rawPrefix !== rawPrefix.toUpperCase()) return false;
      // Also reject if preceded by a letter (part of a word)
      if (index > 0 && /[A-Za-z]/.test(text.charAt(index - 1))) return false;
    }
    return true;
  }

  function looksLikePaxCount(text, index) {
    var before = text.slice(Math.max(0, index - 40), index).toLowerCase();
    var after = text.slice(index, index + 30).toLowerCase();
    // "pax count 187" / "187 passengers" / "(185 revenue"
    if (/\b(pax count|passengers?|revenue|staff\s*tix|souls?\s+on\s+board)\s*$/.test(before)) return true;
    if (/^\d{1,3}\s*(pax|passengers?|revenue|staff)/.test(after.replace(/^\d+\s*/, '')) &&
        /\(\s*\d{1,3}\s+revenue/.test(text.slice(Math.max(0, index - 15), index + 40).toLowerCase())) return true;
    if (/\bpax count\s*$/.test(before)) return true;
    if (/^\d{1,3}\s*\(\s*\d{1,3}\s+revenue/.test(after)) return true;
    if (/\(\s*$/.test(before) && /^\d{1,3}\s+revenue/.test(after)) return true;
    return false;
  }

  /**
   * Extract ordered unique flight references, carrying carrier onto bare numbers.
   */
  function extractFlightRefs(text) {
    if (!text) return [];
    var refs = [];
    var seen = {};
    var lastCarrier = null;
    var re = new RegExp('\\b(' + carrierAlt() + ')\\s*(\\d{2,4})\\b|\\b(\\d{3,4})\\b', 'gi');
    var m;
    while ((m = re.exec(text)) !== null) {
      var code;
      var carrier;
      var num;
      if (m[1]) {
        carrier = m[1].toUpperCase();
        num = m[2];
        if (!flightMatchIsValid(carrier, m[0], text, m.index)) continue;
        lastCarrier = carrier;
        code = carrier + num;
      } else {
        num = m[3];
        if (!lastCarrier) continue;
        if (looksLikePaxCount(text, m.index)) continue;
        // Never adopt a number that directly follows a time label (STD 0615, ATA 1129...)
        var timeLbl = text.slice(Math.max(0, m.index - 7), m.index);
        if (/(?:STD|ATD|STA|ATA|ETA|ETD|CTOT|dep|arr)\s*$/i.test(timeLbl)) continue;
        // Never adopt date components (15/07/2026) or counts (Pax 157, 186 seats)
        if (text.charAt(m.index - 1) === '/') continue;
        if (/(?:pax|seats?)\s*$/i.test(timeLbl)) continue;
        if (/^\s*(?:pax|seats?|mins?|minutes)\b/i.test(text.slice(m.index + num.length, m.index + num.length + 9))) continue;
        // Bare number — only adopt if nearby ops language suggests a flight
        var window = text.slice(Math.max(0, m.index - 40), m.index + 80).toLowerCase();
        var looksLikeFlight = /\b(flight|flt|sched|scheduled|dep|depart|arr|inbound|outbound|pirep|rotation|sector|doors?|boarded|held|claim|ezy|eju)\b/.test(window)
          || /\bfor\s+\d{3,4}\b/.test(window)
          || /^\s*\d{3,4}\s+sched\b/.test(window.slice(Math.max(0, m.index - Math.max(0, m.index - 40))));
        // Leading bare number at paragraph start after known carrier (e.g. "4471 sched dep")
        if (/^\d{3,4}\s+sched\b/i.test(text.slice(m.index, m.index + 20))) looksLikeFlight = true;
        if (!looksLikeFlight) continue;
        // Avoid treating clock times as flight numbers when tagged z/utc
        var after = text.slice(m.index + m[0].length, m.index + m[0].length + 4);
        if (/^\s*[Zz]/.test(after) || /^\s*utc/i.test(after)) continue;
        // Avoid 0600-1100 ranges being treated as flights
        if (/^\s*[-–—]/.test(after)) continue;
        // Bare 3-digit / regulation numbers (261) unless clearly a flight callsign
        if (num.length <= 3) {
          var explicitSched = /^\d{3,4}\s+sched\b/i.test(text.slice(m.index, m.index + 20));
          var explicitFlt = /\b(flight|flt|pirep)\s+\d{3,4}\b/i.test(window);
          if (!explicitSched && !explicitFlt) continue;
        }
        // EC261 exposure etc.
        if (/^\d{3}\s+exposure\b/i.test(text.slice(m.index, m.index + 20))) continue;
        code = lastCarrier + num;
      }
      if (seen[code]) continue;
      seen[code] = 1;
      refs.push({ code: code, carrier: lastCarrier, num: num, index: m.index });
    }
    return refs;
  }

  function inferRoute(ctx, text, flightIndex) {
    var routeM = ctx.match(/\b([A-Z]{3})\s*[-–—→]\s*([A-Z]{3})\b/);
    if (routeM && isAirportCode(routeM[1]) && isAirportCode(routeM[2])) {
      return routeM[1] + ' → ' + routeM[2];
    }

    // "sched dep LGW" + "PMI ETA now"
    var depM = ctx.match(/\b(?:sched(?:uled)?\s+dep(?:arture)?|std|held\s+at)\s+([A-Z]{3})\b/i);
    var ahead = text.slice(flightIndex, flightIndex + 550);
    var arrM = ahead.match(/\b([A-Z]{3})\s+ETA\b/i);
    if (depM && isAirportCode(depM[1])) {
      var dep = depM[1].toUpperCase();
      if (arrM && isAirportCode(arrM[1]) && arrM[1].toUpperCase() !== dep) {
        return dep + ' → ' + arrM[1].toUpperCase();
      }
      // Opposite of first explicit route in full text (inbound PMI-LGW → outbound LGW-PMI)
      var firstRoute = text.match(/\b([A-Z]{3})\s*[-–—→]\s*([A-Z]{3})\b/);
      if (firstRoute && isAirportCode(firstRoute[1]) && isAirportCode(firstRoute[2])) {
        if (dep === firstRoute[2]) return firstRoute[2] + ' → ' + firstRoute[1];
        if (dep === firstRoute[1]) return firstRoute[1] + ' → ' + firstRoute[2];
      }
      return dep + ' → ?';
    }
    return '';
  }

  /** Slice text belonging to one flight until the next flight ref. */
  function sectorContext(text, refs, idx) {
    var start = Math.max(0, refs[idx].index - 20);
    var end = refs[idx + 1] ? refs[idx + 1].index : Math.min(text.length, refs[idx].index + 700);
    // Also stop before a clear new paragraph about a different topic if very long
    return text.slice(start, end);
  }

  function parseSectorTimes(ctx) {
    var std = labeledTime(ctx, [
      new RegExp('\\bstd\\s+' + TIME_TOKEN, 'i'),
      new RegExp('\\bsched(?:uled)?\\s+dep(?:arture)?(?:\\s+[A-Z]{3})?\\s+' + TIME_TOKEN, 'i'),
      new RegExp('\\bscheduled\\s+departure\\s+' + TIME_TOKEN, 'i')
    ]);
    var atd = labeledTime(ctx, [
      new RegExp('\\batd\\s+' + TIME_TOKEN, 'i'),
      new RegExp('\\b(?:airborne|airbourne|off\\s*blocks?|block\\s*off|departed(?:\\s+at)?)\\s+' + TIME_TOKEN, 'i'),
      new RegExp('\\bdep(?:arture)?\\s+clearance\\s+(?:received\\s+)?' + TIME_TOKEN, 'i'),
      new RegExp('\\bslot\\s+issued[^\\n.]{0,40}?was\\s+' + TIME_TOKEN, 'i'),
      new RegExp('\\bslot\\s+(?:of\\s+|time\\s+)?' + TIME_TOKEN + '[^\\n.]{0,30}?dep', 'i')
    ]);
    var sta = labeledTime(ctx, [
      new RegExp('\\bsta\\s+' + TIME_TOKEN, 'i'),
      new RegExp('\\bsched(?:uled)?\\s+arr(?:ival)?(?:\\s+was)?\\s+' + TIME_TOKEN, 'i')
    ]);
    var ata = labeledTime(ctx, [
      new RegExp('\\bata\\s+' + TIME_TOKEN, 'i'),
      new RegExp('\\b(?:blocked?\\s+in|on\\s+blocks?|blocks?\\s+(?:in|lgw|at)|back\\s+to\\s+blocks?)[^\\n.]{0,20}?' + TIME_TOKEN, 'i'),
      new RegExp('\\beta\\s+(?:now\\s+)?(?:\\d{3,4}\\w*\\s+local\\s+\\()?' + TIME_TOKEN, 'i'),
      new RegExp('\\barriv(?:al|ed)\\s+(?:delay\\s+)?(?:approx\\s+)?' + TIME_TOKEN, 'i')
    ]);

    // Held-from time often is the ATFM hold start on inbound, not STD
    var heldFrom = labeledTime(ctx, [
      new RegExp('\\bheld\\s+at\\s+[A-Z]{3}\\s+from\\s+' + TIME_TOKEN, 'i'),
      new RegExp('\\bfrom\\s+' + TIME_TOKEN + '[^\\n.]{0,40}?atfm', 'i')
    ]);

    return { std: std, atd: atd, sta: sta, ata: ata, heldFrom: heldFrom };
  }

  function inferStatus(ctx, times) {
    var l = ctx.toLowerCase();
    if (/\bcancelled\b|\bond\b/.test(l)) return 'Cancelled';
    if (/\bdiverted?\b/.test(l)) return 'Diverted';
    if (/\baog\b/.test(l)) return 'AOG';
    if (/\bdelayed\b|arrival delay|held on stand|held at|atfm|slot/.test(l)) return 'Delayed';
    if (times && times.atd && times.std) {
      // crude: if ATD after STD mark delayed
      if (times.atd > times.std) return 'Delayed';
    }
    return '';
  }

  function scoreClaimWeight(ctx) {
    var l = (ctx || '').toLowerCase();
    var score = 0;
    if (/\bboarded\b|\bdoors?\s+closed\b|\bheld on stand\b/.test(l)) score += 6;
    if (/\bpax\b|\bpassenger/.test(l) && !/\binbound rotation\b/.test(l)) score += 3;
    if (/\barrival delay\b|\b261\b|\bexposure\b|\bclaim\b|\bcompensation\b/.test(l)) score += 5;
    if (/\bscheduled?\s+dep\b|\bsched\s+dep\b/.test(l)) score += 4;
    if (/\bpirep\b|\bno pirep\b/.test(l)) score += 3;
    if (/\binbound rotation\b|\bprior sector\b|\bheld at\b.{0,20}\batfm\b/.test(l)) score -= 5;
    return score;
  }

  /**
   * Build editable LOF rows from free-text ICC / ops summary.
   */
  function textForLof(text) {
    if (typeof DefendAblePromptBanks !== 'undefined' && DefendAblePromptBanks.sectionBody) {
      var parts = DefendAblePromptBanks.parseSections(text);
      if (parts.marked && parts.flight) return parts.flight;
    }
    return text;
  }

  function textForCause(text) {
    if (typeof DefendAblePromptBanks !== 'undefined' && DefendAblePromptBanks.parseSections) {
      var parts = DefendAblePromptBanks.parseSections(text);
      if (parts.marked) {
        return [parts.cause, parts.measures, parts.flight].filter(Boolean).join('\n');
      }
    }
    return text;
  }

  function parseLOFFromText(text) {
    text = textForLof(text);
    if (!text) return [];
    var refs = extractFlightRefs(text);
    if (!refs.length) return [];
    var claimed = pickClaimedFlight(text, refs);

    return refs.map(function (ref, idx) {
      var ctxWide = sectorContext(text, refs, idx);
      var isClaimed = claimed && claimed.code === ref.code;
      var route = inferRoute(ctxWide, text, ref.index);
      var times = parseSectorTimes(ctxWide);
      var noteParts = [];
      if (times.heldFrom) noteParts.push('Held from ' + times.heldFrom);
      var slot = labeledTime(ctxWide, [
        new RegExp('\\bslot\\s+issued[^\\n.]{0,50}?(?:was\\s+)?' + TIME_TOKEN, 'i'),
        new RegExp('\\bslot\\s+(?:of\\s+|time\\s+)?' + TIME_TOKEN, 'i')
      ]);
      if (slot) noteParts.push('Slot ' + slot);

      // Prefer airborne as ATD when both clearance and airborne present
      var airborne = labeledTime(ctxWide, [
        new RegExp('\\b(?:airborne|airbourne)\\s+' + TIME_TOKEN, 'i')
      ]);
      var clearance = labeledTime(ctxWide, [
        new RegExp('\\bdep(?:arture)?\\s+clearance\\s+(?:received\\s+)?' + TIME_TOKEN, 'i')
      ]);
      // Airborne / clearance after inbound blocks belong to the claimed outbound,
      // even when they appear in a shared later paragraph.
      if (isClaimed && !airborne) {
        airborne = labeledTime(text, [
          new RegExp('\\b(?:airborne|airbourne)\\s+' + TIME_TOKEN, 'i')
        ]);
      }
      if (isClaimed && !clearance) {
        clearance = labeledTime(text, [
          new RegExp('\\bdep(?:arture)?\\s+clearance\\s+(?:received\\s+)?' + TIME_TOKEN, 'i')
        ]);
      }
      // Do not assign airborne from a later shared paragraph to the inbound sector
      if (!isClaimed && /inbound rotation|held at|atfm/.test(ctxWide.toLowerCase())) {
        airborne = '';
        clearance = '';
      }
      var atd = airborne || times.atd || clearance || '';
      if (airborne && clearance) noteParts.push('Clearance ' + clearance);

      // For inbound ATFM: slot dep may be ATD; blocks time is ATA
      if (!atd && slot && /atfm|slot|held/.test(ctxWide.toLowerCase())) {
        atd = slot;
      } else if (slot && atd === slot) {
        // already noted via Slot push above
      }

      var ata = times.ata;
      // "inbound finally blocked in" belongs to the inbound sector, even if it appears
      // after the outbound flight number in the narrative.
      var inboundBlocks = labeledTime(text, [
        new RegExp('\\binbound\\s+finally\\s+blocked?\\s+in\\s+' + TIME_TOKEN, 'i')
      ]);
      if (!isClaimed && /inbound rotation|held at|atfm|prior/.test(ctxWide.toLowerCase())) {
        if (inboundBlocks) ata = inboundBlocks;
        else if (!ata) {
          ata = labeledTime(ctxWide, [
            new RegExp('(?:pushed her back to )?blocks?\\s+[A-Z]{3}\\s+approx\\s+' + TIME_TOKEN, 'i'),
            new RegExp('back to blocks?\\s+[A-Z]{3}\\s+approx\\s+' + TIME_TOKEN, 'i')
          ]) || ata;
        }
      }
      if (isClaimed && ata && inboundBlocks && ata === inboundBlocks) {
        ata = '';
      }
      // Claimed outbound: ignore "blocked in" (inbound language)
      if (isClaimed && /blocked?\s+in/.test((times.ata && ctxWide) || '') && /inbound/.test(ctxWide.toLowerCase())) {
        // times.ata may have been set from inbound blocks in shared context — clear if inbound
      }
      if (isClaimed) {
        ata = '';
      }
      if (!ata && !isClaimed) {
        var blocks = labeledTime(ctxWide, [
          new RegExp('\\b(?:blocks?|blocked?\\s+in|back\\s+to\\s+blocks?)[^\\n.]{0,25}?' + TIME_TOKEN, 'i')
        ]);
        if (blocks && !inboundBlocks) ata = blocks;
      }

      var std = times.std;
      var sta = times.sta;
      // Arrival facts for the claimed sector often sit in a later paragraph
      if (isClaimed) {
        if (!sta) {
          sta = labeledTime(text, [
            new RegExp('\\bscheduled?\\s+arr(?:ival)?\\s+was\\s+' + TIME_TOKEN, 'i'),
            new RegExp('\\bsched\\s+arr\\s+was\\s+' + TIME_TOKEN, 'i')
          ]);
        }
        if (!ata) {
          var etaUtc = labeledTime(text, [
            new RegExp('\\beta\\s+now\\s+\\d{3,4}\\w*\\s+local\\s*\\(\\s*' + TIME_TOKEN, 'i'),
            new RegExp('\\(\\s*' + TIME_TOKEN + '\\s*utc\\s*\\)', 'i')
          ]);
          if (etaUtc) {
            ata = etaUtc;
            noteParts.push('ETA (UTC)');
          }
        }
        if (!atd) {
          atd = labeledTime(text, [
            new RegExp('\\b(?:airborne|airbourne)\\s+' + TIME_TOKEN, 'i')
          ]) || atd;
        }
      }

      return {
        flight: ref.code,
        route: route,
        std: std || '',
        atd: atd || '',
        sta: sta || '',
        ata: ata || '',
        status: isClaimed ? 'Claimed' : inferStatus(ctxWide, { std: std, atd: atd }),
        note: noteParts.join(' · ')
      };
    });
  }

  function pickClaimedFlight(text, refs) {
    if (!refs || !refs.length) return null;
    var best = refs[0];
    var bestScore = -999;
    refs.forEach(function (ref, idx) {
      var ctx = sectorContext(text, refs, idx);
      // Also give credit for later whole-text claim signals tied to this flight number
      var num = ref.num;
      var globalHit = 0;
      if (new RegExp('no pirep yet for\\s+' + num, 'i').test(text)) globalHit += 4;
      if (new RegExp('\\b' + num + '\\b[^\\n.]{0,80}compensat', 'i').test(text)) globalHit += 3;
      var s = scoreClaimWeight(ctx) + globalHit;
      if (s > bestScore) {
        bestScore = s;
        best = ref;
      }
    });
    return best;
  }

  function parseDelayText(text) {
    if (!text) return null;
    var m = text.match(/(\d+)\s*h(?:ours?)?\s*0?(\d+)\s*m(?:in(?:utes?)?)?/i)
      || text.match(/arrival delay\s+approx\s+(\d+)\s*h(?:ours?)?\s*0?(\d+)\s*m/i)
      || text.match(/(\d+)\s*hours?\s*(?:and\s*)?(\d+)\s*min/i)
      || text.match(/(\d+)\s*hours?\s+delay/i)
      || text.match(/(\d+)\s*h(?:ours?)?\s+delay/i);
    if (!m) return null;
    if (m[2] != null && m[0].indexOf('hour') < 0 && /h/.test(m[0])) {
      return (m[1] + 'h' + m[2] + 'm').replace(/\s+/g, '');
    }
    return m[0].replace(/\s+/g, ' ').trim();
  }

  function parseDelayMins(text) {
    if (!text) return 0;
    var m = text.match(/(\d+)\s*h(?:ours?)?\s*0?(\d+)\s*m(?:in(?:utes?)?)?/i);
    if (m) return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
    m = text.match(/(\d+)\s*h(?:ours?)?(?:\s+delay|\s+late)?/i);
    if (m) return parseInt(m[1], 10) * 60;
    m = text.match(/(\d+)\s*min(?:ute)?s?\s+delay/i);
    if (m) return parseInt(m[1], 10);
    return 0;
  }

  /**
   * Enrich a facts object using improved flight/time extraction.
   * Mutates and returns facts.
   */
  function enrichFacts(facts, text) {
    facts = facts || {};
    var refs = extractFlightRefs(text);
    var claimed = pickClaimedFlight(text, refs);
    var rows = parseLOFFromText(text);
    var claimedRow = claimed && rows.find(function (r) { return r.flight === claimed.code; });
    if (claimed) {
      facts.flightNum = claimed.code;
      if (claimedRow && claimedRow.route && claimedRow.route.indexOf('?') < 0) {
        var parts = claimedRow.route.split(/\s*→\s*/);
        facts.depIata = parts[0];
        facts.arrIata = parts[1];
      } else {
        var ctx = sectorContext(text, refs, refs.indexOf(claimed) >= 0 ? refs.indexOf(claimed) : 0);
        // Prefer index lookup
        var cidx = 0;
        for (var i = 0; i < refs.length; i++) if (refs[i].code === claimed.code) cidx = i;
        ctx = sectorContext(text, refs, cidx);
        var route = inferRoute(ctx, text, claimed.index);
        if (route && route.indexOf('?') < 0) {
          var p2 = route.split(/\s*→\s*/);
          facts.depIata = p2[0];
          facts.arrIata = p2[1];
        }
      }
      if (claimedRow) {
        if (claimedRow.std) facts.depTime = claimedRow.std;
        if (claimedRow.atd) facts.atdTime = claimedRow.atd;
        if (claimedRow.sta) facts.staTime = claimedRow.sta;
        if (claimedRow.ata) facts.ataTime = claimedRow.ata;
      }
      if (!facts.staTime) {
        facts.staTime = labeledTime(text, [
          new RegExp('\\bscheduled?\\s+arr(?:ival)?\\s+was\\s+' + TIME_TOKEN, 'i')
        ]) || facts.staTime;
      }
      if (!facts.ataTime) {
        facts.ataTime = labeledTime(text, [
          new RegExp('\\beta\\s+now\\s+\\d{3,4}\\w*\\s+local\\s*\\(\\s*' + TIME_TOKEN, 'i')
        ]) || facts.ataTime;
      }
      if (!facts.atdTime) {
        facts.atdTime = labeledTime(text, [
          new RegExp('\\b(?:airborne|airbourne)\\s+' + TIME_TOKEN, 'i')
        ]) || facts.atdTime;
      }
    }

    var delayText = parseDelayText(text);
    if (delayText) facts.delayText = delayText;

    var paxM = text.match(/(\d{1,3})\s*(?:pax|passenger)/i)
      || text.match(/pax count\s+(\d{1,3})/i);
    if (paxM) facts.paxCount = paxM[1];

    facts.mentions = facts.mentions || {};
    facts.mentions.metar = /\bmetar\b/i.test(text);
    facts.mentions.cb = /\bcb\b|cumulonimbus/i.test(text);
    facts.mentions.atfm = /\batfm\b|\bgdp\b|ground delay/i.test(text);
    facts.mentions.fuelling = /fuel(?:ler|ling| uplift)|bowser|fuel truck/i.test(text);
    facts.mentions.art9Gap = /no meal|despite delay|remained on board|hold pax on board/i.test(text);

    return facts;
  }

  /**
   * Extra weather / multi-factor scoring hints for detectDisruptionType.
   * Returns { weatherBonus, factors[] }.
   */
  function disruptionFactorHints(text) {
    text = textForCause(text);
    var lower = (text || '').toLowerCase();
    var factors = [];
    var weatherBonus = 0;

    if (/\bmetar\b|\btaf\b|\bsigmet\b/.test(lower)) {
      weatherBonus += 6;
      factors.push({ id: 'weather', label: 'Weather evidence (METAR/TAF/SIGMET)', weight: 6 });
    }
    if (/\bcb\b|cumulonimbus|\bts\+?ra\b|\btsra\b|thunderstorm/.test(lower)) {
      weatherBonus += 8;
      factors.push({ id: 'weather', label: 'Convective weather (CB / TSRA)', weight: 8 });
    }
    if (/\bgdp\b|ground delay programme|ground delay program/.test(lower)) {
      weatherBonus += 3;
      factors.push({ id: 'weather', label: 'Ground Delay Programme', weight: 3 });
    }
    if (/\batfm\b|\bctot\b|\batc\b|slot restriction|flow management/.test(lower)) {
      factors.push({ id: 'atfm', label: 'ATFM / ATC slot restriction', weight: 5 });
    }
    if (/fuel uplift delayed|fueller|fuel truck|bowser|fuel(?:ling)?\s+delayed|assigned to another aircraft/.test(lower)) {
      factors.push({ id: 'fuelling', label: 'Fuelling / turnaround delay', weight: 4 });
    }
    if (/held on stand|remain(?:ed)? on board|disembark|no meal service|refreshments? offered/.test(lower)) {
      factors.push({ id: 'art9', label: 'Onboard hold / Art 9 care', weight: 3 });
    }
    return { weatherBonus: weatherBonus, factors: factors };
  }

  /**
   * Story events with times for timeline enrichment.
   */
  function extractStoryEvents(text) {
    if (!text) return [];
    var events = [];
    var lower = text.toLowerCase();

    function add(label, sub, timeRe, type) {
      var t = '';
      if (timeRe) {
        var m = text.match(timeRe) || lower.match(timeRe);
        if (m) t = normalizeOpsTime(m[1] || m[2] || m[3] || '') || firstOpsTime(m[0]);
      }
      events.push({ type: type || 'cascade', label: label, sub: sub, time: t, icon: '⏱' });
    }

    if (/\bcb\b|cumulonimbus|\bts\+?ra\b|metar/.test(lower)) {
      var wxTime = labeledTime(text, [
        new RegExp('(?:cbs?|cumulonimbus|thunderstorm)[^\\n.]{0,40}?from\\s+' + TIME_TOKEN, 'i'),
        new RegExp('moving through from\\s+' + TIME_TOKEN, 'i')
      ]);
      events.push({
        type: 'root',
        label: 'Adverse Weather at LGW',
        sub: 'Significant CBs / convective weather' + (/\bmetar\b/.test(lower) ? ' — METAR available' : '') + (/\bgdp\b|ground delay/.test(lower) ? '; GDP in force' : ''),
        time: wxTime,
        icon: '🌩'
      });
    }

    if (/\batfm\b|slot restriction|slot issued/.test(lower)) {
      var slotT = labeledTime(text, [
        new RegExp('slot\\s+issued[^\\n.]{0,50}?(?:was\\s+)?' + TIME_TOKEN, 'i'),
        new RegExp('held[^\\n.]{0,40}?from\\s+' + TIME_TOKEN, 'i')
      ]);
      events.push({
        type: 'cascade',
        label: 'ATFM Slot Restriction',
        sub: 'ATFM / ATC flow restriction' + (/\bgdp\b/.test(lower) ? ' under GDP' : ''),
        time: slotT,
        icon: '🗼'
      });
    }

    if (/boarded/.test(lower)) {
      add('Passengers Boarded', 'Boarding completed; doors later closed — held on stand for inbound.', new RegExp('pax\\s+boarded\\s+' + TIME_TOKEN, 'i'), 'operational');
    }
    if (/doors?\s+closed/.test(lower)) {
      add('Doors Closed', 'Aircraft ready; awaiting inbound / clearance.', new RegExp('doors?\\s+closed\\s+' + TIME_TOKEN, 'i'), 'operational');
    }
    if (/held on stand|inbound not yet/.test(lower)) {
      events.push({
        type: 'cascade',
        label: 'Held On Stand — Awaiting Inbound',
        sub: 'Outbound held on stand as inbound rotation not yet on blocks.',
        time: '',
        icon: '⏸'
      });
    }
    if (/captain made pa|made pa\b/.test(lower)) {
      add('Captain PA — ATC Delay', 'PA advised ATC delay; limited detail to passengers.', new RegExp('(?:pa|p\\.a\\.)\\s+at\\s+' + TIME_TOKEN, 'i'), 'operational');
    }
    if (/blocked?\s+in|inbound finally/.test(lower)) {
      add('Inbound On Blocks', 'Inbound blocked in; turnaround commenced.', new RegExp('(?:blocked?\\s+in|inbound finally blocked?\\s+in)\\s+' + TIME_TOKEN, 'i'), 'cascade');
    }
    if (/fuel uplift delayed|fueller|fuel truck|bowser/.test(lower)) {
      events.push({
        type: 'operational',
        label: 'Fuelling Delay',
        sub: 'Fuel uplift delayed — fueller assigned to another aircraft and recalled. Contributes to overall delay.',
        time: '',
        icon: '⛽'
      });
    }
    if (/dep(?:arture)? clearance|airborne|airbourne/.test(lower)) {
      var depT = labeledTime(text, [
        new RegExp('(?:airborne|airbourne)\\s+' + TIME_TOKEN, 'i'),
        new RegExp('dep(?:arture)?\\s+clearance\\s+(?:received\\s+)?' + TIME_TOKEN, 'i')
      ]);
      events.push({
        type: 'operational',
        label: 'Departure Clearance / Airborne',
        sub: 'Departure clearance received; airborne thereafter.',
        time: depT,
        icon: '✈'
      });
    }
    if (/hold pax on board|rather than disembark|remained on board|occ decision/.test(lower)) {
      var holdT = labeledTime(text, [
        new RegExp('occ decision at\\s+' + TIME_TOKEN, 'i')
      ]);
      events.push({
        type: 'operational',
        label: 'OCC Hold-On-Board Decision',
        sub: 'OCC authorised holding passengers on board rather than disembark' + (/3h20|3\s*h\s*20/.test(lower) ? ' — ~3h20m on board' : '') + '.',
        time: holdT,
        icon: '🛂'
      });
    }
    if (/art\s*9|refreshments?|meal service|snack pack/.test(lower)) {
      var gap = /no meal service|despite delay/.test(lower);
      events.push({
        type: 'operational',
        label: gap ? 'Art 9 — Care Gap Flagged' : 'Art 9 — Passenger Care',
        sub: gap
          ? 'Refreshments only (water / snack pack). No meal service despite delay exceeding 3 hours on stand — Limb 2 / Art 9 risk.'
          : 'Art 9 care measures referenced in summary.',
        time: labeledTime(text, [new RegExp('refreshments? offered[^\\n.]{0,20}?' + TIME_TOKEN, 'i')]),
        icon: '🏨'
      });
    }
    if (/connecting pax|connections?.{0,20}missed|hotel being arranged/.test(lower)) {
      events.push({
        type: 'outcome',
        label: 'Missed Connections',
        sub: 'Connecting passengers missed onward flights; hotel arrangements referenced.',
        time: '',
        icon: '🔗'
      });
    }

    return events;
  }

  var api = {
    normalizeOpsTime: normalizeOpsTime,
    firstOpsTime: firstOpsTime,
    extractFlightRefs: extractFlightRefs,
    parseLOFFromText: parseLOFFromText,
    pickClaimedFlight: pickClaimedFlight,
    enrichFacts: enrichFacts,
    parseDelayText: parseDelayText,
    parseDelayMins: parseDelayMins,
    disruptionFactorHints: disruptionFactorHints,
    extractStoryEvents: extractStoryEvents,
    TIME_TOKEN: TIME_TOKEN
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.DefendableIccParse = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
