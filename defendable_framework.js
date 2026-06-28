/* DefendAble Legal Framework v2 — canonical claim/defence landscape */
var DefendAbleFramework = (function () {

  var CLAIM_TYPES = [
    { id: 'CL-01', name: 'Delay 3+ hours at final destination', article: 'Art 7(1)(a)', patterns: [/\bdelay(ed|ing)?\b|\b\d+h\s*\d*m\b|\b3\s*hour|\barriv/i], alwaysScreen: true, evidence: ['TOPS', 'HERMES'], note: 'Sturgeon — measured at arrival, doors open. Folkerts for connecting bookings.' },
    { id: 'CL-02', name: 'Cancellation — less than 14 days notice', article: 'Art 5(1)(c) + Art 7', patterns: [/\bcancel(l)?ed\b|\bannul/i], noticeBand: '14+', evidence: ['TOPS', 'MAX-OPS', 'HERMES'], note: 'Full Art 7 compensation unless EC + reasonable measures.' },
    { id: 'CL-03', name: 'Cancellation — 13–7 days notice (reduced if rerouting offered)', article: 'Art 5(1)(c)(iii)', patterns: [/\bcancel(l)?ed\b.*\b(7|8|9|10|11|12|13)\s*day|\bnotice.*\b(7|8|9|10|11|12|13)\s*day/i], noticeBand: '13-7', evidence: ['HERMES', 'MAX-OPS'], note: '50% reduction if rerouting offered within windows.' },
    { id: 'CL-04', name: 'Cancellation — less than 7 days notice (strictest)', article: 'Art 5(1)(c)(iii)', patterns: [/\bcancel(l)?ed\b.*\b(less than|under|within)\s*7|\bnotice.*\b[1-6]\s*day/i], noticeBand: '7-', evidence: ['HERMES', 'MAX-OPS'], note: 'Strictest rerouting windows. Full compensation if no compliant offer.' },
    { id: 'CL-05', name: 'Denied boarding — involuntary (overbooking / operational)', article: 'Art 4 + Art 7', patterns: [/\bdenied boarding\b|\boffloaded\b|\boverbook|\bdowngrade.*voluntary|\binvoluntary\b/i], evidence: ['HERMES', 'TOPS', 'MAX-OPS'], note: 'Distinguish voluntary vs involuntary. Compensation + rerouting rights.' },
    { id: 'CL-06', name: 'Downgrading — lower class than booked', article: 'Art 10', patterns: [/\bdowngrad|\blower class\b|\brebooked.*economy|\bbusiness.*economy/i], evidence: ['HERMES', 'TOPS'], note: '30%/50%/75% refund by distance band. NOT excused by EC.' },
    { id: 'CL-07', name: 'Missed connection — through booking (Folkerts)', article: 'Art 7 + Folkerts', patterns: [/\bconnect(ing|ion)\b|\bthrough booking\b|\bfinal destination\b|\bmissed.*connect/i], evidence: ['HERMES', 'TOPS'], note: 'Delay at final destination. Distance from first departure.' },
    { id: 'CL-08', name: 'Early departure — moved >1 hour earlier within 14 days', article: 'Art 5 (2021 EU ruling)', patterns: [/\bearly depart|\bbrought forward\b|\bschedule change\b|\badvance.*depart/i], evidence: ['HERMES', 'MAX-OPS', 'TOPS'], note: 'Treated as cancellation per 2021 CJEU ruling if >1hr and within 14 days.' },
    { id: 'CL-09', name: 'Consequential loss — Montreal Convention Art 19', article: 'MC Art 19/22/29', patterns: [/\bconsequential\b|\bcommercial loss\b|\blost (revenue|business|contract)\b|\bmontreal\b|\b£\s*\d{4,}|\b\d{4,}\s*(gbp|eur|euro|pounds)/i], evidence: ['HERMES', 'DPM-Notes'], note: 'Art 22 SDR cap ~£4,600/pax. Art 29 2-year absolute bar. EC261 deducted from award.' },
    { id: 'CL-10', name: 'Art 9 duty of care — standalone head', article: 'Art 9', patterns: [/\bmeal|\brefreshment|\bhotel|\bhotac|\bcatering|\bovernight|\bduty of care|\btelephone|\bcommunication/i], alwaysScreen: true, evidence: ['Ground-handler-records', 'MAX-OPS'], note: 'Applies regardless of EC outcome. 2+ hours = meals/comms. Overnight = hotel.' },
    { id: 'CL-11', name: 'Art 8 breach — rerouting/reimbursement not offered', article: 'Art 8', patterns: [/\brerout|\breimburs|\bno (offer|alternative)\b|\bart\.?\s*8|\b5\s*hour/i], alwaysScreen: true, evidence: ['MAX-OPS', 'HERMES'], note: 'Mandatory for 5+ hour delays/cancellations. Three options required.' }
  ];

  var EC_DEFENCES = [
    { id: 'DT-01', name: 'ATC / ATFM restrictions (CTOT, curfew, OND)', patterns: [/\bctot\b|\batfm\b|\batc restriction|\beurocontrol|\bnetwork wide\b/i], triggers: ['EUROCONTROL-NM-API', 'TOPS', 'NOTAM-feed'], authority: 'Pešková (C-315/15); Wallentin-Hermann' },
    { id: 'DT-02', name: 'Weather — destination (diversion, below minima)', patterns: [/\bthunderstorm|\bdiversion|\bbelow minima|\bsigmet|\bmetar.*dest/i], triggers: ['Ogimet-API', 'TOPS', 'Flightradar24-API'], authority: 'Wallentin-Hermann; mandatory ATC diversion' },
    { id: 'DT-03', name: 'Weather — origin or en route (LVP, SNOWTAM, de-icing)', patterns: [/\blvp\b|\bsnowtam|\bde-ic|\brunway closure|\borigin weather/i], triggers: ['Ogimet-API', 'NOTAM-feed', 'TOPS'], authority: 'Systemic LVP/SNOWTAM = EC; routine de-icing = ordinary' },
    { id: 'DT-04', name: 'Birdstrike / wildlife strike', patterns: [/\bbirdstrike|\bbird strike|\bwildlife|\bingestion\b/i], triggers: ['AMOS', 'SafetyNet', 'Airport-wildlife-authority'], authority: 'Pešková — per se EC' },
    { id: 'DT-05', name: 'Technical — hidden manufacturing defect only', patterns: [/\bhidden defect|\bmanufacturing defect|\bno prior ad\b|\bno prior sb\b|\bunknown failure/i], triggers: ['AMOS', 'OEM-records', 'SafetyNet'], authority: 'Van der Lans — routine NOT EC; Matkustaja A (C-385/23) clarifies hidden defect' },
    { id: 'DT-06', name: 'Crew / FTL — root cause only (NOT crew illness)', patterns: [/\bftl\b|\bcrew.*(limit|hours|duty)|\bstandby crew|\brotation|\bcascade/i], triggers: ['AIMS', 'TOPS', 'DISCO'], authority: 'Lipton [2024] UKSC 24 — crew illness NOT EC; FTL alone NOT EC' },
    { id: 'DT-07', name: 'Industrial action — third party only', patterns: [/\bindustrial action|\bstrike\b|\bthird.party strike|\batc industrial/i], triggers: ['DISCO', 'NOTAM-feed', 'TOPS'], authority: 'Krüsemann — own staff NOT EC; Pešková — third party IS EC' },
    { id: 'DT-08', name: 'Security alert / threat', patterns: [/\bsecurity alert|\bsuspicious|\bhold search|\bre-screen|\bevacuat/i], triggers: ['SafetyNet', 'TOPS', 'Ground-handler-records'], authority: 'Authority-initiated = EC' },
    { id: 'DT-09', name: 'Medical emergency on board', patterns: [/\bmedical|\bcardiac|\bpassenger welfare|\bdiverted.*medical/i], triggers: ['SafetyNet', 'TOPS', 'Ground-handler-records'], authority: 'Mandatory carrier response — EC' },
    { id: 'DT-10', name: 'Disruptive / unruly passenger', patterns: [/\bdisruptive|\bunruly|\breturned to gate|\bthreatening behaviour/i], triggers: ['SafetyNet', 'TOPS', 'Ground-handler-records'], authority: 'External behaviour = EC' },
    { id: 'DT-11', name: 'Natural disaster (ash, earthquake, flood, hurricane)', patterns: [/\bvolcanic|\bash\b|\bearthquake|\bflood|\bhurricane|\bnatural disaster|\bsigmet.*va/i], triggers: ['NOTAM-feed', 'SIGMET-feed', 'Met-Office'], authority: 'Government/meteorological event beyond carrier control' },
    { id: 'DT-12', name: 'ATM system failure (NATS, Eurocontrol outage)', patterns: [/\bnats\b.*\boutage|\beurocontrol.*\boutage|\batm system|\bnetwork failure|\bsystem failure/i], triggers: ['NOTAM-feed', 'Eurocontrol-NM-API', 'FlightStats-API'], authority: 'Third-party infrastructure failure = EC' },
    { id: 'DT-13', name: 'Cascading rotation — root cause determines EC', patterns: [/\bcascade|\brotation|\binbound aircraft|\blate inbound|\btail line/i], triggers: ['TOPS', 'DISCO', 'Flightradar24-API'], authority: 'Cascade NOT EC — root cause at chain start' },
    { id: 'DT-14', name: 'Government / political instability (travel ban, airspace closure)', patterns: [/\btravel ban|\bairspace closure|\bgovernment|\bpolitical|\bconflict|\bwar zone|\bnotam.*closed/i], triggers: ['NOTAM-feed', 'DISCO', 'HERMES'], authority: 'Government-imposed restriction = EC' },
    { id: 'DT-15', name: 'Drone incursion — airspace closure by authority', patterns: [/\bdrone\b|\buas\b|\bairspace closure.*drone/i], triggers: ['NOTAM-feed', 'SafetyNet', 'TOPS'], authority: 'Authority-mandated closure = EC' },
    { id: 'DT-16', name: 'COVID / pandemic government restrictions', patterns: [/\bcovid|\bpandemic|\bquarantine|\btravel restriction|\bgovernment.*restrict/i], triggers: ['NOTAM-feed', 'HERMES', 'DISCO'], authority: 'Government public health restriction — EC if externally imposed' },
    { id: 'DT-17', name: 'Sabotage / terrorism threat to aircraft', patterns: [/\bsabotage|\bterror|\bbomb threat|\bsecurity threat|\bthreat to aircraft/i], triggers: ['SafetyNet', 'TOPS', 'Ground-handler-records'], authority: 'External security threat = EC' },
    { id: 'DT-18', name: 'Crew illness / sickness (NOT extraordinary — Lipton)', patterns: [/\bcrew illness|\bpilot illness|\bcrew sick|\bcaptain sick|\bcrew unavailable.*sick/i], triggers: ['AIMS', 'TOPS', 'DISCO'], authority: 'Lipton v BA Cityflyer [2024] UKSC 24 — NOT EC', isNegative: true }
  ];

  var UNIVERSAL_LEGAL = [
    { id: 'UL-01', name: 'Limitation — UK261 / EC261 / Montreal concurrent bars', patterns: [/\bclaim\b|\bletter of claim|\bloc\b|\bflight date|\b20\d{2}\b/i], alwaysScreen: true, authority: 'UK261: 6yr E&W, 5yr Scotland; EC261: national (FR 2yr, ES 1yr, DE 3yr); Montreal Art 29: 2yr absolute', evidence: ['HERMES', 'DPM-Notes'], note: 'Check court issue date not letter date. Montreal runs concurrently.' },
    { id: 'UL-02', name: 'Lipton v BA Cityflyer [2024] UKSC 24 — crew illness NOT EC', patterns: [/\bcrew illness|\bpilot illness|\bcrew sick|\bsickness|\broster/i], alwaysScreen: true, authority: 'Lipton [2024] UKSC 24', evidence: ['AIMS', 'TOPS'], note: 'Internal crew shortages from illness are within carrier control. Review all crew illness pleas.' },
    { id: 'UL-03', name: 'Matkustaja A v Finnair (C-385/23) — hidden defect definition', patterns: [/\bhidden|\bmanufacturing|\bdefect|\btechnical|\boem|\bad\b|\bsb\b/i], alwaysScreen: true, authority: 'Matkustaja A v Finnair (C-385/23, June 2024)', evidence: ['AMOS', 'OEM-records'], note: 'Defect unknown to manufacturer does not automatically qualify. Must prove undiscoverable through reasonable maintenance.' },
    { id: 'UL-04', name: 'EC261 reform proposals (Council approved June 2025)', patterns: [], alwaysScreen: true, authority: 'EU Council position June 2025', evidence: ['HERMES'], note: '14-day claim processing requirement proposed. Monitor for implementation — affects response SLAs.' },
    { id: 'UL-05', name: 'Package Travel Directive overlay', patterns: [/\bpackage|\bholiday|\btour operator|\bptd\b|\bcombined travel/i], alwaysScreen: true, authority: 'Package Travel Directive 2015/2302', evidence: ['HERMES'], note: 'Where flight is part of package, PTD may govern remedy routing alongside EC261.' },
    { id: 'UL-06', name: 'Wallentin-Hermann two-limb EC gate', patterns: [], alwaysScreen: true, authority: 'Wallentin-Hermann v Alitalia (C-549/07)', evidence: ['DISCO'], note: 'Both limbs required. Failure of either defeats EC defence entirely.' },
    { id: 'UL-07', name: 'Reasonable measures — defeats EC even when limbs met', patterns: [/\bstandby|\bspare aircraft|\brerout|\brecovery|\bslot/i], alwaysScreen: true, authority: 'Wallentin-Hermann; CJEU jurisprudence', evidence: ['AIMS', 'TOPS'], note: 'Standby aircraft/crew, slot recovery, rerouting — must demonstrate all measures taken.' },
    { id: 'UL-08', name: 'Jurisdiction & operating carrier liability', patterns: [/\bltn\b|\blgw\b|\buk\b|\bdepart|\barriv|\beu\b/i], alwaysScreen: true, authority: 'EC261 Art 2(b); UK261 Reg 4', evidence: ['HERMES', 'TOPS'], note: 'Liability attaches to operating carrier. UK261: UK departures + UK/EU inbound.' },
    { id: 'UL-09', name: 'Check-in compliance (Art 3(2)(a))', patterns: [/\bcheck.?in|\blate passenger|\bno.?show/i], alwaysScreen: true, authority: 'EC261 Art 3(2)(a)', evidence: ['HERMES'], note: 'Must present at check-in time or 45 min before departure. Late = Regulation does not apply.' },
    { id: 'UL-10', name: 'Art 7 compensation band & CMC overclaim check', patterns: [/\b€\s*\d+|\b£\s*\d+|\b250\b|\b400\b|\b600\b/i], alwaysScreen: true, authority: 'EC261 Art 7; Sturgeon; Folkerts', evidence: ['TOPS', 'HERMES'], note: '250/400/600 EUR by distance. 50% reductions. Wrong band extremely common in CMC claims.' },
    { id: 'UL-11', name: 'ADR vs litigation routing & Part 36 strategy', patterns: [/\b£\s*\d{4,}|\bcedr\b|\bcaa\b|\badr\b|\bsmall claim/i], alwaysScreen: true, authority: 'AviationADR; CPR Part 36', evidence: ['HERMES'], note: 'ADR up to £15k. Small claims under £10k — no costs recovery. Part 36 for claims over £10k.' },
    { id: 'UL-12', name: 'Art 13 recourse against third parties', patterns: [/\batc\b|\bhandler|\bmanufacturer|\bairport authority|\beurocontrol/i], alwaysScreen: true, authority: 'EC261 Art 13', evidence: ['DISCO'], note: 'Separate limitation periods — frequently lost through delay. Flag early.' }
  ];

  function screenItems(text, items) {
    var t = text.toLowerCase();
    return items.map(function (item) {
      var matched = !!item.alwaysScreen;
      if (!matched && item.patterns) {
        matched = item.patterns.some(function (p) { return p.test(t); });
      }
      var status = matched ? (item.isNegative ? 'red' : 'green') : 'info';
      var statusLabel = matched ? (item.isNegative ? 'NOT EC — RISK' : item.alwaysScreen ? 'SCREENED' : 'DETECTED') : 'NOT TRIGGERED';
      return {
        id: item.id,
        name: item.name,
        article: item.article || '',
        authority: item.authority || '',
        note: item.note || '',
        matched: matched,
        status: status,
        statusLabel: statusLabel,
        isNegative: !!item.isNegative,
        evidence: item.evidence || item.triggers || []
      };
    });
  }

  function detectClaimTypes(text) { return screenItems(text, CLAIM_TYPES); }
  function detectDefences(text) { return screenItems(text, EC_DEFENCES); }
  function detectUniversalLegal(text) { return screenItems(text, UNIVERSAL_LEGAL); }

  function buildUniversalNodes(text) {
    var legal = detectUniversalLegal(text);
    return legal.filter(function (l) { return l.matched; }).map(function (l) {
      return {
        id: l.id,
        type: 'universal',
        question: l.name,
        status: l.isNegative ? 'red' : l.status === 'green' ? 'green' : 'amber',
        statusLabel: l.statusLabel,
        conclusion: l.note || 'Screened as part of universal legal checklist on every case.',
        authority: l.authority,
        dataUsed: (l.evidence || []).join('; ')
      };
    });
  }

  function landscapeSummary(text) {
    var claims = detectClaimTypes(text);
    var defences = detectDefences(text);
    var legal = detectUniversalLegal(text);
    return {
      claims: claims,
      defences: defences,
      legal: legal,
      claimsMatched: claims.filter(function (c) { return c.matched; }).length,
      claimsTotal: claims.length,
      defencesMatched: defences.filter(function (d) { return d.matched; }).length,
      defencesTotal: defences.length,
      legalMatched: legal.filter(function (l) { return l.matched; }).length,
      legalTotal: legal.length
    };
  }

  return {
    CLAIM_TYPES: CLAIM_TYPES,
    EC_DEFENCES: EC_DEFENCES,
    UNIVERSAL_LEGAL: UNIVERSAL_LEGAL,
    detectClaimTypes: detectClaimTypes,
    detectDefences: detectDefences,
    detectUniversalLegal: detectUniversalLegal,
    buildUniversalNodes: buildUniversalNodes,
    landscapeSummary: landscapeSummary
  };
})();
