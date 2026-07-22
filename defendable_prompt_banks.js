/**
 * DefendAble — Prompt keyword → knowledge bank map
 * Spec: specs/defendable_prompt_spec.md · Prototype: specs/defendable_prompt_v1.html
 * Content maintained separately from RM_DB / EVIDENCE_DB; tree ids align with type map.
 */
var DefendAblePromptBanks = (function () {
  'use strict';

  var BANKS = [
    {
      id: 'weather',
      label: 'Weather',
      tree: 'DT-02',
      triggers: [
        'thunderstorm', 'tsra', 'cb ', 'cb activity', 'convective', 'lightning storm',
        'snow', 'snowstorm', 'blizzard', 'ice', 'freezing', 'de-ice', 'de-icing', 'deice',
        'fog', 'lvp', 'rvr', 'visibility', 'below minima',
        'crosswind', 'windshear', 'gale', 'storm', 'hail', 'wind',
        'diversion', 'diverted', 'alternate'
      ],
      detail: 'Meteorological conditions incompatible with the flight — Recital 14. Foreseeability decisive.',
      auth: 'Recital 14 · BGH X ZR 136/23',
      evidence: ['METAR / TAF', 'SIGMET', 'Eurocontrol regulation notice', 'Commanders report'],
      suggestions: [
        'weather at departure', 'weather at arrival', 'weather en-route',
        'ATFM weather regulation', 'LVP operations', 'mandatory ATC diversion'
      ],
      flags: [
        {
          on: ['de-ice', 'de-icing', 'deice'],
          text: 'De-icing itself is NOT extraordinary (BGH X ZR 146/23). Was there an underlying severe weather event?'
        }
      ]
    },
    {
      id: 'atc',
      label: 'ATC / ATFM',
      tree: 'DT-01',
      triggers: [
        'atc', 'atfm', 'ctot', 'slot', 'flow control', 'ground stop', 'ground hold',
        'regulation', 'eurocontrol', 'nmoc', 'airspace', 'network manager', 'gdp'
      ],
      detail: 'ATM management decision beyond carrier control — EC candidate if evidenced.',
      auth: 'Moens C-159/18 · T-134/25',
      evidence: ['Eurocontrol NMOC log', 'CTOT assignment', 'Delay codes 81–89', 'OCC log'],
      suggestions: ['slot restriction', 'cascading delay', 'capacity regulation', 'staffing regulation']
    },
    {
      id: 'tech',
      label: 'Technical',
      tree: 'DT-03',
      triggers: [
        'technical', 'tech fault', 'defect', 'engineering', 'aog', 'unserviceable', 'mel', 'fault',
        'service bulletin', 'airworthiness directive', 'fleet-wide', 'design defect'
      ],
      detail: 'Default: NOT extraordinary — inherent to operations.',
      auth: 'Wallentin-Hermann · Huzar · Van der Lans',
      evidence: ['Tech log', 'Engineering report', 'OEM confirmation (if design defect)'],
      suggestions: ['hidden design defect (OEM confirmed)', 'birdstrike damage', 'routine defect'],
      flags: [
        {
          on: ['technical', 'defect', 'fault', 'engineering'],
          text: 'Routine technical ≠ extraordinary. Is there OEM / authority confirmation of a hidden design defect? (C-385/23, C-411/23)'
        }
      ]
    },
    {
      id: 'bird',
      label: 'Bird strike',
      tree: 'DT-04',
      triggers: ['bird', 'birdstrike', 'bird strike', 'wildlife'],
      detail: 'Extraordinary — but every post-strike delay node must itself be justified.',
      auth: 'Pešková C-315/15',
      evidence: ['Commanders report', 'Inspection record', 'MOR'],
      suggestions: ['precautionary inspection', 'strike with damage']
    },
    {
      id: 'strike',
      label: 'Industrial action',
      tree: 'DT-05',
      triggers: ['strike', 'industrial action', 'walkout', 'sick-out', 'union', 'work to rule'],
      detail: 'OWN staff = never EC. Third-party (ATC / handler / airport) = EC candidate.',
      auth: 'SAS C-28/20 · Krüsemann · Reform 2026',
      evidence: ['Strike notice', 'Handler / airport notification'],
      suggestions: ['third-party ATC strike', 'ground handler strike', 'own staff action (not EC)'],
      flags: [
        {
          on: ['our crew', 'own staff', 'pilots strike', 'cabin crew strike'],
          text: 'Own-staff industrial action is NEVER extraordinary — SAS C-28/20. Assess as compensation case.'
        }
      ]
    },
    {
      id: 'crew',
      label: 'Crew',
      tree: 'DT-06',
      triggers: [
        'crew sick', 'crew illness', 'captain sick', 'fo sick', 'crew unavailable',
        'fdp', 'flight time limit', 'out of hours', 'discretion'
      ],
      detail: 'Crew illness NEVER extraordinary in UK — Lipton binding.',
      auth: 'Lipton [2024] UKSC 24',
      evidence: ['Crew roster', 'FDP calculation', 'Sickness report'],
      suggestions: ['FDP expiry downstream of other cause', 're-crew attempted'],
      flags: [
        {
          on: ['crew sick', 'crew illness', 'captain sick', 'fo sick'],
          text: 'Crew illness is never extraordinary (Lipton UKSC 2024, binding). Focus shifts to quantum and Art 9 care.'
        }
      ]
    },
    {
      id: 'pax',
      label: 'Passenger event',
      tree: 'DT-07',
      triggers: [
        'disruptive', 'unruly', 'medical emergency', 'medical diversion',
        'offload', 'police', 'deportee', 'pax removed'
      ],
      detail: 'Unruly pax = EC (LE v TAP) but re-routing duty is stringent.',
      auth: 'LE v TAP C-74/19',
      evidence: ['Commanders report', 'Police report', 'Diversion record'],
      suggestions: ['unruly pax diversion', 'medical diversion', 'offload + bag identification']
    },
    {
      id: 'security',
      label: 'Security',
      tree: 'DT-08',
      triggers: [
        'security alert', 'bomb', 'evacuation', 'screening', 'security breach', 'suspicious'
      ],
      detail: 'Genuine threat = EC. Discretionary post-event choices can break the chain.',
      auth: 'Recital 14 · T-656/24',
      evidence: ['Authority incident report', 'MOR', 'Airport notification'],
      suggestions: ['threat to specific aircraft', 'airport-wide event', 'screening system failure']
    },
    {
      id: 'infra',
      label: 'Airport / third party',
      tree: 'DT-09',
      triggers: [
        'runway closed', 'runway closure', 'fuelling', 'fuel system', 'baggage system',
        'ground handler', 'handler', 'airbridge', 'power failure', 'it outage'
      ],
      detail: 'Third-party infrastructure failure = EC candidate; must seek alternatives.',
      auth: 'Moens · SATA C-308/21 · C-405/23',
      evidence: ['Airport operator notice', 'Handler communication', 'NOTAM'],
      suggestions: ['runway closure', 'fuelling system failure', 'handler staff shortage']
    },
    {
      id: 'cascade',
      label: 'Rotation / cascade',
      tree: 'LOF',
      triggers: [
        'inbound', 'rotation', 'knock-on', 'previous sector', 'earlier delay',
        'aircraft swap', 'positioning', 'late arrival of aircraft', 'standby aircraft', 'sub'
      ],
      detail: 'Cascade from earlier EC permitted with direct causal link. Voluntary waits BREAK it.',
      auth: 'Austrian C-826/19 · T-656/24',
      evidence: ['LOF record', 'OCC log', 'Prior sector delay attribution'],
      suggestions: [
        'cascade from earlier EC sector', 'aircraft swap attempted', 'voluntary hold (chain risk)'
      ],
      flags: [
        {
          on: ['waited for', 'held for passengers', 'hold for pax', 'waited for pax'],
          text: 'Voluntary decision to wait can BREAK the causal chain — T-656/24. Was the wait operationally required?'
        }
      ]
    },
    {
      id: 'rm',
      label: 'Reasonable measures',
      tree: 'RM',
      triggers: [
        'standby', 'sub ', 'substitute', 'wet lease', 'charter', 're-crew', 'reserve crew',
        're-route', 'rebook', 'interline', 'other carriers', 'curfew', 'no options', 'all deployed'
      ],
      detail: "Art 5(3) — all resources at the carrier's disposal must be shown deployed.",
      auth: 'Eglītis C-294/10 · LE v TAP C-74/19',
      evidence: ['OCC log', 'Standby roster', 'Re-routing search record'],
      suggestions: [
        'standby unavailable — reason', 're-routing searched incl. third party', 'curfew constraint'
      ]
    }
  ];

  var SECTION_DEFS = [
    {
      id: 'flight',
      marker: 'FLIGHT',
      title: 'Flight & Line of Flying',
      sub: 'what flight, what aircraft, what happened to it',
      placeholder:
        'Flight number(s), date, tail, route. What happened to this aircraft across the day — inbound sectors, inherited delay, swaps, diversions.\n' +
        'e.g. EZY4470 LGW–AMS 21/07, G-EZBX. Aircraft inbound from PMI 45 late. Ground hold LGW, ATD 0941 vs STD 0620. Return EZY4471 ATD AMS 1317.',
      needs: [
        /\b[A-Z]{2,3}\s?\d{2,4}\b/i,
        /\d{1,2}\/\d{1,2}|\d{4}Z|\b(std|atd|sta|ata)\b/i,
        /\b[A-Z]{3}\b\s*[–\-—>]+\s*\b[A-Z]{3}\b|\b(lgw|ams|ltn|pmi|bhx|man|lhr)\b/i
      ]
    },
    {
      id: 'cause',
      marker: 'CAUSE',
      title: 'Causation',
      sub: 'why it was disrupted, and the consequence chain',
      placeholder:
        'Root cause and what it did to the operation.\n' +
        'e.g. CB activity Amsterdam FIR from 0800. Eurocontrol ATFM weather regulation, CTOT 0920 imposed. No diversion. Arrival delay 194 mins.',
      needs: [
        /./,
        /(due|caused|because|following|result|weather|atfm|atc|technical|strike)/i,
        /(delay|cancel|divert|return|hold|slot|ctot)/i
      ]
    },
    {
      id: 'measures',
      marker: 'MEASURES',
      title: 'Reasonable Measures',
      sub: 'why the airline could not save the flight on the day',
      placeholder:
        'Standby aircraft/crew, subs considered, network state, re-routing checked, curfew or FDP limits.\n' +
        'e.g. No standby LGW — subs deployed to weather backlog. Re-crew not possible within FDP. Re-routing checked: no earlier arrival own metal or interline.',
      needs: [
        /./,
        /(standby|sub|crew|re-?rout|rebook|interline|curfew|option|fdp)/i,
        /(no |not |unable|could not|unavailable|checked|deployed)/i
      ]
    }
  ];

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function scanText(text) {
    var low = ' ' + String(text || '').toLowerCase() + ' ';
    var engaged = {};
    BANKS.forEach(function (b) {
      var hits = b.triggers.filter(function (t) {
        return low.indexOf(t) >= 0;
      });
      if (!hits.length) return;
      engaged[b.id] = {
        bank: b,
        terms: hits.map(function (h) { return h.trim(); }),
        flags: []
      };
      (b.flags || []).forEach(function (f) {
        if ((f.on || []).some(function (t) { return low.indexOf(t) >= 0; })) {
          engaged[b.id].flags.push(f.text);
        }
      });
    });
    return engaged;
  }

  function meterScore(text, needs) {
    var n = 0;
    (needs || []).forEach(function (re) {
      if (re.test(text || '')) n++;
    });
    return n;
  }

  function composeSections(sections, opts) {
    opts = opts || {};
    var flight = (sections.flight || '').trim();
    var cause = (sections.cause || '').trim();
    var measures = (sections.measures || '').trim();
    if (!flight && !cause && !measures) return '';
    // Legacy: only flight filled → emit unmarked whole text (existing paste path)
    if (flight && !cause && !measures && !opts.forceMarkers) return flight;
    return (
      '[FLIGHT] ' + (flight || '—') +
      '\n\n[CAUSE] ' + (cause || '—') +
      '\n\n[MEASURES] ' + (measures || '—')
    );
  }

  function parseSections(text) {
    text = String(text || '');
    var out = { flight: '', cause: '', measures: '', marked: false };
    var re = /\[(FLIGHT|CAUSE|MEASURES)\]\s*([\s\S]*?)(?=\[(?:FLIGHT|CAUSE|MEASURES)\]|$)/gi;
    var m;
    var found = false;
    while ((m = re.exec(text))) {
      found = true;
      var key = m[1].toUpperCase();
      var body = (m[2] || '').trim();
      if (key === 'FLIGHT') out.flight = body === '—' ? '' : body;
      if (key === 'CAUSE') out.cause = body === '—' ? '' : body;
      if (key === 'MEASURES') out.measures = body === '—' ? '' : body;
    }
    if (found) {
      out.marked = true;
      return out;
    }
    out.flight = text.trim();
    return out;
  }

  function stripMarkers(text) {
    return String(text || '')
      .replace(/\[(FLIGHT|CAUSE|MEASURES)\]\s*/gi, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  function sectionBody(text, marker) {
    var parts = parseSections(text);
    if (!parts.marked) return text;
    if (marker === 'FLIGHT') return parts.flight;
    if (marker === 'CAUSE') return parts.cause;
    if (marker === 'MEASURES') return parts.measures;
    return text;
  }

  return {
    BANKS: BANKS,
    SECTION_DEFS: SECTION_DEFS,
    scanText: scanText,
    meterScore: meterScore,
    composeSections: composeSections,
    parseSections: parseSections,
    stripMarkers: stripMarkers,
    sectionBody: sectionBody,
    esc: esc
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DefendAblePromptBanks;
}
