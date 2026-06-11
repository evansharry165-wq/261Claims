/* Legal updates metadata — shared by Education Hub and Insights — Stage 3 */
var LEGAL_UPDATES = [
  {
    id: 'upd-flightright-iberia-2026',
    title: 'Flightright v Iberia: Hidden defects clarification',
    date: '2026-05-22',
    source: 'CJEU',
    summary:
      'The Court confirmed that a technical defect caused by component failure unknown to the manufacturer does not automatically qualify as extraordinary. The carrier must still prove the defect could not have been discovered through reasonable maintenance inspection.',
    tags: ['technical-defect', 'van-der-lans', 'extraordinary-circumstances'],
    affectsDisruptions: ['Technical Issues'],
    affectsJurisdictions: ['spain', 'england-wales', 'france'],
    caseLawCites: ['van der Lans', 'LE v TAP Air Portugal'],
    educationSection: 'updates',
    educationAnchor: 'flightright-iberia'
  },
  {
    id: 'upd-caa-evidence-2026',
    title: 'UK261 evidence standards — updated guidance',
    date: '2026-05-18',
    source: 'CAA',
    summary:
      'Updated enforcement guidance requiring specific evidence of extraordinary circumstances. ATFM data, METAR records, and crew statements are referenced as expected evidence.',
    tags: ['evidence-standards', 'atc-ec', 'weather-ec', 'cpr'],
    affectsDisruptions: ['ATC Restrictions', 'Weather', 'Birdstrike'],
    affectsJurisdictions: ['england-wales'],
    caseLawCites: ['Wallentin-Hermann'],
    educationSection: 'updates',
    educationAnchor: 'caa-evidence'
  },
  {
    id: 'upd-lipton-pilot-illness-2026',
    title: 'Lipton v BA Cityflyer — pilot illness judgment',
    date: '2026-05-12',
    source: 'UK Supreme Court',
    summary:
      'Pilot illness is not an extraordinary circumstance. Crew replacement shortage was within the carrier\'s control through adequate rostering.',
    tags: ['crew-hours', 'extraordinary-circumstances'],
    affectsDisruptions: ['Crew Hours', 'Technical Issues'],
    affectsJurisdictions: ['england-wales'],
    caseLawCites: ['Wallentin-Hermann'],
    educationSection: 'updates',
    educationAnchor: 'lipton-pilot'
  },
  {
    id: 'upd-spain-birdstrike-measures-2026',
    title: 'AESA circular — birdstrike reasonable measures in Spain',
    date: '2026-05-30',
    source: 'AESA',
    summary:
      'Spanish mercantile courts increasingly expect airport bird logs and engineering inspection records when defending birdstrike claims under Pešková.',
    tags: ['birdstrike-ec', 'reasonable-measures', 'peskova'],
    affectsDisruptions: ['Birdstrike'],
    affectsJurisdictions: ['spain'],
    caseLawCites: ['Peskova'],
    educationSection: 'updates',
    educationAnchor: 'aesa-birdstrike'
  }
];

var LEGAL_CASELAW_INDEX = [
  { id: 'cl-wallentin', cite: 'C-549/07', name: 'Wallentin-Hermann', tags: ['extraordinary-circumstances', 'atc-ec'] },
  { id: 'cl-sturgeon', cite: 'C-402/07', name: 'Sturgeon', tags: ['delay-threshold'] },
  { id: 'cl-vdl', cite: 'C-257/14', name: 'van der Lans', tags: ['technical-defect', 'van-der-lans'] },
  { id: 'cl-peskova', cite: 'C-315/15', name: 'Peskova', tags: ['birdstrike-ec', 'peskova', 'reasonable-measures'] }
];

var EducationIndex = {
  getUpdates: function () {
    return LEGAL_UPDATES.slice();
  },
  getCaseLaw: function () {
    return LEGAL_CASELAW_INDEX.slice();
  },
  getUpdate: function (id) {
    return LEGAL_UPDATES.find(function (u) {
      return u.id === id;
    });
  }
};
