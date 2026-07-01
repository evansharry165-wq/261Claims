/* Intake LOC extraction and insight generation */

var INTAKE_KNOWN_PROFILES = {
  hartley: {
    match: function (name, text) {
      var hay = (name + ' ' + (text || '')).toLowerCase();
      return hay.indexOf('hartley') >= 0 || hay.indexOf('hc1184') >= 0 || hay.indexOf('hc 1184') >= 0;
    },
    row: {
      surname: 'Hartley', firstName: 'Daniel', solicitor: 'Pemberton & Associates',
      flightNum: 'HC 1184', dep: 'LTN', arr: 'BCN', flightDate: '13 March 2026',
      currency: 'GBP', compSought: '39000', claimType: 'EC261 — Diversion',
      jurisdictionCode: 'EW', disruptionType: 'Weather', triage: 'ESCALATE', complexity: 'High Value',
      notes: 'Montreal Convention consequential loss (£38,250) flagged. Weather diversion to Valencia. Senior review required before triage.'
    },
    points: [
      { n: 1, claim: 'Delay / diversion — Art 7(1)(a) UK261', evidenceStatus: 'amber', evidenceDoc: 'Flight HC 1184 diverted LTN→BCN to Valencia (VLC). Confirm ATD/ATA and diversion reason via Operational delay records system.' },
      { n: 2, claim: 'Extraordinary circumstances — weather', evidenceStatus: 'amber', evidenceDoc: 'METAR/SIGMET for LTN and VLC required. Diversion may support EC261 defence if conditions confirmed.' },
      { n: 3, claim: 'Article 9 — duty of care at Valencia', evidenceStatus: 'red', evidenceDoc: 'Ground handling and passenger care records at VLC outstanding — claimant alleges inadequate assistance.' },
      { n: 4, claim: 'Consequential loss — £38,250 (Montreal Convention)', evidenceStatus: 'red', evidenceDoc: 'Business contract loss claimed. Challenge causation, foreseeability and mitigation. Montreal Convention does not cover speculative commercial losses.' },
      { n: 5, claim: 'EC261 compensation — £600+', evidenceStatus: 'amber', evidenceDoc: 'Cat C long-haul diversion. Secondary to Montreal exposure but must be addressed in response.' }
    ],
    gaps: ['Booking reference', 'Passenger count', 'Receipts for Art 9 expenses'],
    exposure: 'high',
    exposureNote: 'Montreal Convention consequential loss exceeds standard EC261 exposure. Escalate to senior solicitor before substantive response.'
  },
  morrison: {
    match: function (name, text) {
      var hay = (name + ' ' + (text || '')).toLowerCase();
      return hay.indexOf('morrison') >= 0 || hay.indexOf('hc442') >= 0 || hay.indexOf('hc 442') >= 0;
    },
    row: {
      surname: 'Morrison', firstName: 'Thomas', solicitor: 'Irwin Mitchell LLP',
      flightNum: 'HC 442', dep: 'LGW', arr: 'BCN', flightDate: '15 May 2026',
      currency: 'EUR', compSought: '350', claimType: 'EC261 — Cancellation',
      jurisdictionCode: 'EW', disruptionType: 'ATC Restrictions', triage: 'INVESTIGATE', complexity: 'Standard',
      notes: 'Cancellation with less than 14 days notice alleged. ATC strikes reported on date — investigate extraordinary circumstances.'
    },
    points: [
      { n: 1, claim: 'Cancellation — insufficient notice (Art 5)', evidenceStatus: 'red', evidenceDoc: 'LOC alleges cancellation with less than 14 days notice. Awaiting Operational delay records system cancellation record and notice timeline.' },
      { n: 2, claim: 'Compensation under UK261 — £350', evidenceStatus: 'red', evidenceDoc: 'Cat B route. ATC disruption probable cause — Eurocontrol CRCO reference required before classification.' },
      { n: 3, claim: 'Re-routing costs — £180', evidenceStatus: 'red', evidenceDoc: 'Claimant self-rerouted. Verify carrier offered rerouting under Art 8 — duty of care if not provided.' }
    ],
    gaps: ['Cancellation notice date', 'Re-routing offer confirmation'],
    exposure: 'standard',
    exposureNote: 'Standard Cat B EC261 claim. Investigation required before DEFEND/INVESTIGATE classification confirmed.'
  }
};

function titleCaseWords(s) {
  return String(s || '').replace(/\b\w/g, function (m) { return m.toUpperCase(); });
}

function extractFromLocText(text) {
  var out = {};
  if (!text) return out;
  var t = String(text);

  var flightMatch = t.match(/\bHC\s*(\d{3,4})\b/i);
  if (flightMatch) out.flightNum = 'HC ' + flightMatch[1];

  var routeMatch = t.match(/\b([A-Z]{3})\s*(?:→|->|to|–|-)\s*([A-Z]{3})\b/i);
  if (routeMatch) { out.dep = routeMatch[1].toUpperCase(); out.arr = routeMatch[2].toUpperCase(); }

  var dateMatch = t.match(/\b(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})\b/i);
  if (dateMatch) out.flightDate = dateMatch[1] + ' ' + titleCaseWords(dateMatch[2]) + ' ' + dateMatch[3];

  var gbpMatch = t.match(/£\s*([\d,]+(?:\.\d+)?)/);
  var eurMatch = t.match(/€\s*([\d,]+(?:\.\d+)?)/);
  if (gbpMatch) { out.currency = 'GBP'; out.compSought = gbpMatch[1].replace(/,/g, ''); }
  else if (eurMatch) { out.currency = 'EUR'; out.compSought = eurMatch[1].replace(/,/g, ''); }

  if (/diversion|diverted/i.test(t)) out.claimType = 'EC261 — Diversion';
  else if (/cancellation|cancelled|canceled/i.test(t)) out.claimType = 'EC261 — Cancellation';
  else if (/denied boarding/i.test(t)) out.claimType = 'EC261 — Denied boarding';
  else if (/delay/i.test(t)) out.claimType = 'EC261 — Delay';

  if (/weather|metar|storm|thunder/i.test(t)) out.disruptionType = 'Weather';
  else if (/atc|atfm|air traffic|slot restriction/i.test(t)) out.disruptionType = 'ATC Restrictions';
  else if (/crew|strike|industrial/i.test(t)) out.disruptionType = 'Crew / Industrial';

  if (/montreal|consequential|business contract|£\s*[\d,]{4,}/i.test(t)) {
    out.triage = 'ESCALATE';
    out.complexity = 'High Value';
  } else if (/investigate|unclear|pending/i.test(t)) {
    out.triage = 'INVESTIGATE';
  }

  var solicitorMatch = t.match(/(?:Yours faithfully|Sincerely)[,\s]*\n+([^\n]+)/i);
  if (solicitorMatch) out.solicitor = solicitorMatch[1].trim();

  var nameMatch = t.match(/(?:Mr|Mrs|Ms|Miss|Dr)\.?\s+([A-Z][a-z]+)\s+([A-Z][a-z]+)/);
  if (nameMatch) { out.firstName = nameMatch[1]; out.surname = nameMatch[2]; }

  var bookMatch = t.match(/booking ref(?:erence)?[:\s]+([A-Z0-9]{5,8})/i);
  if (bookMatch) out.bookingRef = bookMatch[1];
  var paxMatch = t.match(/passenger(?:s)?[:\s]+(\d+)/i);
  if (paxMatch) out.passengerCount = parseInt(paxMatch[1], 10);

  return out;
}

function extractFromFilename(name) {
  var out = {};
  var base = String(name || '').replace(/\.[^.]+$/, '');
  var norm = base.replace(/[_-]+/g, ' ');

  var flightMatch = norm.match(/\bHC\s*(\d{3,4})\b/i);
  if (flightMatch) out.flightNum = 'HC ' + flightMatch[1];

  var routeMatch = norm.match(/\b([A-Z]{3})\s*(?:-|–|to)\s*([A-Z]{3})\b/i);
  if (routeMatch) { out.dep = routeMatch[1].toUpperCase(); out.arr = routeMatch[2].toUpperCase(); }

  var gbpMatch = norm.match(/£\s*([\d,]+)/);
  var eurMatch = norm.match(/€\s*([\d,]+)/);
  if (gbpMatch) { out.currency = 'GBP'; out.compSought = gbpMatch[1].replace(/,/g, ''); }
  else if (eurMatch) { out.currency = 'EUR'; out.compSought = eurMatch[1].replace(/,/g, ''); }

  return out;
}

function matchKnownProfile(fileName, text) {
  var keys = Object.keys(INTAKE_KNOWN_PROFILES);
  for (var i = 0; i < keys.length; i++) {
    var p = INTAKE_KNOWN_PROFILES[keys[i]];
    if (p.match(fileName, text)) return p;
  }
  return null;
}

function computeCprDaysLeft(dateReceived, jurisdictionKey) {
  var J = typeof getJurisdiction === 'function' ? getJurisdiction(jurisdictionKey) : null;
  var windowDays = (J && J.responseWindow) ? J.responseWindow : 21;
  var parsed = typeof parseLocDateReceived === 'function'
    ? parseLocDateReceived(dateReceived)
    : new Date();
  if (!(parsed instanceof Date) || isNaN(parsed.getTime())) parsed = new Date();
  return Math.max(0, Math.round((parsed.getTime() + windowDays * 86400000 - Date.now()) / 86400000));
}

function buildIntakePointsFromRow(row, caseObj) {
  row = row || {};
  var comp = parseFloat(row.compSought);
  if (isNaN(comp)) comp = 0;
  var sym = row.currency === 'GBP' ? '£' : '€';
  var cat = (caseObj && caseObj.cat) || 'B';
  var points = [];

  var flightOk = row.flightNum && row.flightNum !== 'HC TBD';
  points.push({
    n: 1,
    claim: (row.claimType || 'EC261 claim').indexOf('Cancellation') >= 0
      ? 'Cancellation — notice period (Art 5)'
      : 'Delay / disruption — Art 7(1)(a)',
    evidenceStatus: flightOk ? 'amber' : 'red',
    evidenceDoc: flightOk
      ? 'Flight ' + row.flightNum + (row.flightDate ? ' on ' + row.flightDate : '') + ' — confirm operational record (Operational delay records system) for ATD/ATA and disruption cause.'
      : 'Flight details incomplete in LOC — obtain Operational delay records system record before triage classification.'
  });

  points.push({
    n: 2,
    claim: 'Compensation — ' + sym + comp + ' (Cat ' + cat + ')',
    evidenceStatus: comp >= 350 ? 'amber' : 'red',
    evidenceDoc: (row.disruptionType || 'Disruption type pending') + '. '
      + (row.triage || 'INVESTIGATE') + ' posture — extraordinary circumstances evidence required for DEFEND.'
  });

  if (row.disruptionType === 'Weather') {
    points.push({
      n: 3,
      claim: 'Extraordinary circumstances — weather',
      evidenceStatus: 'red',
      evidenceDoc: 'METAR/TAF/SIGMET for ' + (row.dep || 'departure') + ' required. NOTAM if airport closure alleged.'
    });
  } else if (row.disruptionType === 'ATC Restrictions') {
    points.push({
      n: 3,
      claim: 'Extraordinary circumstances — ATC / ATFM',
      evidenceStatus: 'red',
      evidenceDoc: 'Eurocontrol CRCO reference and ATFM slot data required. Check for ATC industrial action on flight date.'
    });
  } else {
    points.push({
      n: 3,
      claim: 'Article 9 — duty of care',
      evidenceStatus: 'amber',
      evidenceDoc: 'Verify refreshment, accommodation and communication offered during delay. Ground handling records may be required.'
    });
  }

  if (row.triage === 'ESCALATE' || comp >= 10000) {
    points.push({
      n: 4,
      claim: 'High-value / Montreal Convention exposure',
      evidenceStatus: 'red',
      evidenceDoc: 'Consequential or commercial loss claimed. Challenge causation and mitigation. Senior sign-off required before substantive response.'
    });
  }

  if (row.notes && row.notes.length > 20) {
    points.push({
      n: points.length + 1,
      claim: 'Solicitor note — review required',
      evidenceStatus: 'amber',
      evidenceDoc: row.notes
    });
  }

  return points;
}

function buildIntakeInsights(caseObj, row) {
  row = row || {};
  caseObj = caseObj || {};
  var J = typeof getJurisdiction === 'function' ? getJurisdiction(caseObj.jurisdiction) : null;
  var comp = parseFloat(row.compSought);
  if (isNaN(comp)) {
    var valStr = String(caseObj.value || '').replace(/[^\d.]/g, '');
    comp = parseFloat(valStr) || 0;
  }

  var profile = matchKnownProfile(caseObj.uploadedFile || caseObj.claimant || '', row.notes || caseObj.triageNote || '');
  var classification = caseObj.classification || row.triage || 'INVESTIGATE';
  var exposure = profile ? profile.exposure : (comp >= 10000 || classification === 'ESCALATE' ? 'high' : comp >= 350 ? 'elevated' : 'standard');
  var gaps = profile ? profile.gaps.slice() : [];

  if (!row.bookingRef && !caseObj.bookingRef) gaps.push('Booking reference');
  if (!row.passengerCount && !caseObj.passengerCount) gaps.push('Passenger count');
  if (row.flightNum === 'HC TBD' || !row.flightNum) gaps.push('Confirmed flight number');
  if (row.flightDate === 'Date pending' || !row.flightDate) gaps.push('Flight date');
  if (row.solicitor === 'Uploaded LOC') gaps.push('Claimant solicitor details');

  var confidence = 40;
  if (row.flightNum && row.flightNum !== 'HC TBD') confidence += 15;
  if (row.dep && row.dep !== 'TBD') confidence += 10;
  if (row.flightDate && row.flightDate !== 'Date pending') confidence += 10;
  if (comp > 0) confidence += 10;
  if (profile) confidence += 20;
  if (gaps.length <= 2) confidence += 5;
  confidence = Math.min(98, confidence);

  var triageReason = caseObj.triageNote || row.notes || '';
  if (!triageReason) {
    if (classification === 'ESCALATE') triageReason = 'High-value or Montreal Convention exposure identified. Route to senior solicitor before triage completion.';
    else if (classification === 'DEFEND') triageReason = 'Extraordinary circumstances likely on stated facts. Standard DEFEND track once Operational delay records system and disruption evidence obtained.';
    else triageReason = 'Operational data required before classification. Obtain Operational delay records system record and confirm disruption cause in triage.';
  }

  var cprDays = caseObj.cprDaysLeft != null ? caseObj.cprDaysLeft : computeCprDaysLeft(row.dateReceived || caseObj.locDate, caseObj.jurisdiction);
  var ackDays = J && J.keyDates && J.keyDates[0] ? J.keyDates[0].days : 21;

  return {
    classification: classification,
    triageReason: triageReason,
    exposure: exposure,
    exposureNote: profile ? profile.exposureNote : (exposure === 'high'
      ? 'Exposure exceeds standard EC261 — review Montreal Convention and consequential loss elements.'
      : exposure === 'elevated'
        ? 'Cat B or multi-head claim — allow additional evidence gathering time.'
        : 'Standard EC261 claim within normal handling parameters.'),
    gaps: gaps,
    confidence: confidence,
    cprAckDays: ackDays,
    cprResponseDays: J ? J.responseWindow : 21,
    cprDaysLeft: cprDays,
    procedureNote: J ? J.procedureNote : '',
    important: J ? J.important : null,
    limitationNote: J ? J.limitationNote : '',
    profilePoints: profile ? profile.points : null
  };
}

function enrichLocRowFromFile(file, ref, uid, textContent) {
  var base = file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
  var tokens = base ? base.split(/\s+/) : [];
  var firstName = tokens.length > 1 ? tokens.pop() : '';
  var surname = tokens.join(' ') || 'Claimant';
  if (!firstName) { firstName = surname; surname = ''; }

  var fromName = extractFromFilename(file.name);
  var fromText = extractFromLocText(textContent || '');
  var profile = matchKnownProfile(file.name, textContent || '');

  var row = {
    ref: ref,
    surname: titleCaseWords(surname),
    firstName: titleCaseWords(firstName),
    solicitor: 'Uploaded LOC',
    flightNum: 'HC TBD',
    dep: 'TBD',
    arr: 'TBD',
    flightDate: 'Date pending',
    currency: (USERS[uid] && USERS[uid].lang === 'fr') ? 'EUR' : (USERS[uid] && USERS[uid].lang === 'es') ? 'EUR' : 'GBP',
    compSought: '250',
    claimType: 'EC261 — New claim',
    jurisdictionCode: (USERS[uid] && USERS[uid].lang === 'fr') ? 'FR' : (USERS[uid] && USERS[uid].lang === 'es') ? 'ES' : 'EW',
    disruptionType: 'Pending review',
    triage: 'INVESTIGATE',
    complexity: 'Standard',
    dateReceived: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
    notes: 'Uploaded from ' + file.name
  };

  function merge(src) {
    if (!src) return;
    Object.keys(src).forEach(function (k) {
      if (src[k] != null && src[k] !== '') row[k] = src[k];
    });
  }

  merge(fromName);
  merge(fromText);
  if (profile) {
    merge(profile.row);
    row.notes = profile.row.notes || row.notes;
  }

  if (parseFloat(row.compSought) >= 10000 || row.triage === 'ESCALATE') row.complexity = 'High Value';
  else if (row.triage === 'INVESTIGATE') row.complexity = 'Standard';

  return { row: row, profile: profile, textExtracted: !!(textContent && textContent.length > 50) };
}

function caseToRowFromCase(caseObj) {
  caseObj = caseObj || {};
  var val = String(caseObj.value || '');
  return {
    compSought: val.replace(/[^\d.]/g, '') || '0',
    currency: val.indexOf('£') >= 0 ? 'GBP' : 'EUR',
    triage: caseObj.classification,
    disruptionType: caseObj.disruptionType,
    flightNum: caseObj.flightNum,
    dep: caseObj.dep,
    arr: caseObj.arr,
    flightDate: caseObj.flightDate,
    notes: caseObj.triageNote,
    dateReceived: caseObj.locDate,
    claimType: caseObj.type,
    solicitor: caseObj.solicitor
  };
}

function applyIntakeEnrichment(caseObj, row, enrichment) {
  enrichment = enrichment || {};
  var insights = buildIntakeInsights(caseObj, row);
  caseObj.cprDaysLeft = insights.cprDaysLeft;

  if (insights.profilePoints && insights.profilePoints.length) {
    caseObj.points = insights.profilePoints.slice();
  } else if (!caseObj.points || !caseObj.points.length) {
    caseObj.points = buildIntakePointsFromRow(row, caseObj);
  }

  if (row.notes && !caseObj.triageNote) caseObj.triageNote = row.notes;
  caseObj.intakeInsights = insights;
  caseObj.extractionMeta = {
    source: enrichment.textExtracted ? 'LOC text + filename' : (enrichment.profile ? 'Known profile match' : 'Filename inference'),
    confidence: insights.confidence,
    extractedAt: new Date().toISOString()
  };
  return caseObj;
}
