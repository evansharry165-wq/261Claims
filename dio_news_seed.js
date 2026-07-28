/* dio_news_seed.js — seed dataset mirroring what the Aviation Herald +
   Simple Flying Python pulls produce. Consumed by dio-knowledge.html
   for the general News feed panel. Real data replaces this once the
   scheduled scrape backfills knowledge_store.json. */
(function (global) {
  'use strict';

  var NEWS = [
    {
      id: 'ah-2026-07-24-lhr-atc',
      source: 'Aviation Herald',
      title: 'NATS technical outage disrupts London TMA for 90 minutes',
      date: '2026-07-24',
      severity: 'event',
      jurisdiction: ['england-wales'],
      disruptionTypes: ['ATC'],
      link: 'https://avherald.com/h?article=example-nats-outage',
      description: 'A National Air Traffic Services (NATS) systems fault caused flow-control restrictions across the London TMA between 09:12 and 10:42Z on 24 July. Multiple carriers filed ATFM regulations, with average outbound delays reported at 45 minutes. LHR, LGW, LTN, STN all affected.',
      relevance: 'Article 5(3) — NATS-attributable ATC failure is a strong extraordinary-circumstances candidate. Pull the CFMU regulation ID and Eurocontrol log for any affected case.',
    },
    {
      id: 'sf-2026-07-22-vueling-strike',
      source: 'Simple Flying',
      title: 'Vueling cabin crew announce 5-day strike from 1 August',
      date: '2026-07-22',
      severity: 'incident',
      jurisdiction: ['spain'],
      disruptionTypes: ['Cancellation'],
      link: 'https://simpleflying.com/vueling-cabin-crew-strike-august-2026',
      description: 'SEPLA and USO have jointly filed strike notice for Vueling cabin crew, 1–5 August 2026. Impacts BCN, MAD, PMI, ALC hubs. DGAC has yet to issue minimum services order but expected within 48 hours.',
      relevance: 'Third-party industrial action — strong Article 5(3) if minimum-services compliance evidenced. Watch for DGAC ordre and Vueling operational review.',
    },
    {
      id: 'ah-2026-07-20-cdg-drone',
      source: 'Aviation Herald',
      title: 'CDG runway 26L closed 40 minutes after drone sighting',
      date: '2026-07-20',
      severity: 'incident',
      jurisdiction: ['france'],
      disruptionTypes: ['Airport'],
      link: 'https://avherald.com/h?article=example-cdg-drone',
      description: 'Paris Charles de Gaulle closed runway 26L between 16:20 and 17:00 local after multiple drone sightings from the tower. DGAC opened investigation. 22 flights held; 4 diverted to LFPO.',
      relevance: 'Third-party/security event. Pull DGAC bulletin + tower log for any diverted/held HC or AF flight in your caseload.',
    },
    {
      id: 'sf-2026-07-19-uk261-caa',
      source: 'Simple Flying',
      title: 'CAA restates UK261 stance: crew sickness rarely extraordinary',
      date: '2026-07-19',
      severity: 'event',
      jurisdiction: ['england-wales'],
      disruptionTypes: ['Cancellation'],
      link: 'https://simpleflying.com/caa-uk261-crew-sickness-stance-2026',
      description: 'CAA restated in a 19 July note that crew unavailability due to sickness is a foreseeable operational risk and falls outside UK261 Article 5(3), absent extraordinary chain of causation. Follows Wizz Air £1.24m enforcement.',
      relevance: 'Positioning update — expect solicitor pushback on any crew-sickness defence. Consider drafting a knowledge note.',
      suggestPublish: true,
    },
    {
      id: 'ah-2026-07-18-lgw-metar-thunder',
      source: 'Aviation Herald',
      title: 'Severe thunderstorm activity forces LGW ground stop',
      date: '2026-07-18',
      severity: 'event',
      jurisdiction: ['england-wales'],
      disruptionTypes: ['Weather'],
      link: 'https://avherald.com/h?article=example-lgw-tsra',
      description: 'A cluster of TSRA cells over the London TMA led Gatwick to implement a ground stop 14:30–15:45 local on 18 July. METARs show sustained CB with TS+RA+GR intensity. Multiple diversions to Manston and Stansted.',
      relevance: 'Textbook weather defence — pull METAR/TAF + Met Office SIGWX for any affected flight in the window.',
    },
    {
      id: 'sf-2026-07-17-vaac-etna',
      source: 'Simple Flying',
      title: 'Etna ash cloud triggers airspace restrictions across southern Italy',
      date: '2026-07-17',
      severity: 'incident',
      jurisdiction: ['all'],
      disruptionTypes: ['Weather'],
      link: 'https://simpleflying.com/etna-ash-cloud-july-2026',
      description: 'Mount Etna ash plume reached FL280 on 17 July. Toulouse VAAC issued volcanic ash advisories; Rome and Palermo FIRs implemented restrictions. 60+ flights cancelled or rerouted.',
      relevance: 'Volcanic activity — clear-cut Article 5(3). Any UK/ES/FR carrier operating southern IT services in-window has a strong defence.',
    },
    {
      id: 'ah-2026-07-15-fao-bird-strike',
      source: 'Aviation Herald',
      title: 'TAP A320 aborts takeoff at FAO after bird strike',
      date: '2026-07-15',
      severity: 'incident',
      jurisdiction: ['spain'],
      disruptionTypes: ['Technical'],
      link: 'https://avherald.com/h?article=example-fao-bird',
      description: 'TAP flight TP1467 (A320 CS-TNP) aborted takeoff at Faro 15 July after a large bird strike at ~120kt. Runway inspection delayed six subsequent departures. No injuries.',
      relevance: 'Third-party wildlife event — Article 5(3) if operator inspection/return-to-service log clean.',
    },
    {
      id: 'sf-2026-07-14-easyjet-fy25',
      source: 'Simple Flying',
      title: 'easyJet posts £109m EC261 compensation charge for FY25',
      date: '2026-07-14',
      severity: 'event',
      jurisdiction: ['all'],
      disruptionTypes: ['All'],
      link: 'https://simpleflying.com/easyjet-ec261-fy25-charge',
      description: 'easyJet FY25 results disclose £109m of EC261 compensation as an operational cost line, up from £87m FY24. CFO cited "sustained legal-claim volume post-DoNotPay" and ATC-related delays.',
      relevance: 'Market benchmark — reinforces DefendAble commercial thesis. Publish to your solicitor team as context.',
      suggestPublish: true,
    },
  ];

  global.DIONewsSeed = {
    all: function () { return NEWS.slice(); },
    forJurisdiction: function (jur) {
      return NEWS.filter(function (n) {
        return (n.jurisdiction || []).indexOf(jur) >= 0 || (n.jurisdiction || []).indexOf('all') >= 0;
      });
    },
  };
})(typeof window !== 'undefined' ? window : this);
