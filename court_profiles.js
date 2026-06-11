/* Mock court and judge outcome profiles — Stage 2/5 adapter-ready */
var COURT_PROFILES = [
  {
    id: 'jlm-barcelona-3',
    name: 'Juzgado de lo Mercantil nº 3 Barcelona',
    jurisdiction: 'spain',
    region: 'catalonia',
    city: 'Barcelona',
    source: 'Demo · public register simulation',
    lastUpdated: '2026-06-01',
    caseload: 142,
    rates: {
      defended: 68,
      settled: 22,
      paid: 7,
      withdrawn: 3
    },
    byDisruption: {
      Birdstrike: { defended: 72, settled: 18, sample: 14 },
      Weather: { defended: 61, settled: 28, sample: 22 },
      'ATC Restrictions': { defended: 74, settled: 20, sample: 31 },
      'Technical Issues': { defended: 28, settled: 35, sample: 19 }
    },
    notes:
      'Mercantile court tends to scrutinise reasonable-measures evidence after birdstrike events. Airport bird logs materially improve defend rates.'
  },
  {
    id: 'jlm-madrid-7',
    name: 'Juzgado de lo Mercantil nº 7 Madrid',
    jurisdiction: 'spain',
    region: 'madrid',
    city: 'Madrid',
    source: 'Demo · public register simulation',
    lastUpdated: '2026-06-01',
    caseload: 118,
    rates: { defended: 64, settled: 26, paid: 8, withdrawn: 2 },
    byDisruption: {
      Birdstrike: { defended: 65, settled: 25, sample: 11 },
      Weather: { defended: 58, settled: 30, sample: 18 },
      'ATC Restrictions': { defended: 70, settled: 22, sample: 24 }
    },
    notes: 'Higher settlement rate on care-record gaps even when liability defence is strong.'
  },
  {
    id: 'jlm-valencia-2',
    name: 'Juzgado de lo Mercantil nº 2 Valencia',
    jurisdiction: 'spain',
    region: 'valencia',
    city: 'Valencia',
    source: 'Demo · public register simulation',
    lastUpdated: '2026-06-01',
    caseload: 89,
    rates: { defended: 71, settled: 19, paid: 6, withdrawn: 4 },
    byDisruption: {
      Birdstrike: { defended: 78, settled: 15, sample: 9 },
      Weather: { defended: 69, settled: 21, sample: 15 }
    },
    notes: 'Weather defences succeed when METAR/SIGMET align to diversion decision time.'
  },
  {
    id: 'cc-london-central',
    name: 'Central London County Court',
    jurisdiction: 'england-wales',
    region: 'london',
    city: 'London',
    source: 'Demo · public register simulation',
    lastUpdated: '2026-06-01',
    caseload: 204,
    rates: { defended: 74, settled: 18, paid: 5, withdrawn: 3 },
    byDisruption: {
      Birdstrike: { defended: 81, settled: 12, sample: 16 },
      Weather: { defended: 76, settled: 16, sample: 28 },
      'ATC Restrictions': { defended: 83, settled: 11, sample: 35 }
    },
    notes: 'CPR pre-action compliance strongly influences costs outcomes.'
  },
  {
    id: 'tj-paris',
    name: 'Tribunal Judiciaire de Paris',
    jurisdiction: 'france',
    region: 'ile-de-france',
    city: 'Paris',
    source: 'Demo · public register simulation',
    lastUpdated: '2026-06-01',
    caseload: 96,
    rates: { defended: 58, settled: 34, paid: 6, withdrawn: 2 },
    byDisruption: {
      'ATC Restrictions': { defended: 62, settled: 30, sample: 18 },
      Weather: { defended: 55, settled: 36, sample: 14 }
    },
    notes: 'MTV mediation timetable risk drives commercial settlements even with strong ATC evidence.'
  }
];

var JUDGE_PROFILES = [
  {
    id: 'judge-ruiz-barcelona',
    name: 'Magistrada Elena Ruiz',
    courtId: 'jlm-barcelona-3',
    jurisdiction: 'spain',
    source: 'Demo · public register simulation',
    lastUpdated: '2026-06-01',
    tendencies: [
      'Strict on reasonable-measures evidence after birdstrike',
      'Expects airport bird log where strike confirmed at hub airport',
      'Favours structured escrito de respuesta with numbered exhibits'
    ],
    rates: { defended: 70, settled: 23, paid: 7 },
    byDisruption: {
      Birdstrike: { defended: 74, settled: 20, sample: 8 }
    }
  },
  {
    id: 'judge-mendez-madrid',
    name: 'Magistrado Antonio Méndez',
    courtId: 'jlm-madrid-7',
    jurisdiction: 'spain',
    source: 'Demo · public register simulation',
    lastUpdated: '2026-06-01',
    tendencies: [
      'Commercial settlement preference when passenger care gaps exist',
      'Accepts Eurocontrol data without secondary expert evidence'
    ],
    rates: { defended: 62, settled: 30, paid: 8 },
    byDisruption: { 'ATC Restrictions': { defended: 68, settled: 26, sample: 12 } }
  },
  {
    id: 'judge-torres-valencia',
    name: 'Magistrada Laura Torres',
    courtId: 'jlm-valencia-2',
    jurisdiction: 'spain',
    source: 'Demo · public register simulation',
    lastUpdated: '2026-06-01',
    tendencies: ['Weather defences succeed with METAR/SIGMET bundle', 'Low tolerance for generic extraordinary circumstances assertions'],
    rates: { defended: 73, settled: 19, paid: 8 },
    byDisruption: { Weather: { defended: 77, settled: 17, sample: 10 } }
  },
  {
    id: 'judge-hart-ew',
    name: 'HHJ Catherine Hart',
    courtId: 'cc-london-central',
    jurisdiction: 'england-wales',
    source: 'Demo · public register simulation',
    lastUpdated: '2026-06-01',
    tendencies: ['Expects CPR-compliant letter of response', 'Pešková birdstrike defences require engineering inspection on file'],
    rates: { defended: 78, settled: 16, paid: 6 },
    byDisruption: { Birdstrike: { defended: 84, settled: 10, sample: 9 } }
  },
  {
    id: 'judge-fontaine-paris',
    name: 'Juge Marie Fontaine',
    courtId: 'tj-paris',
    jurisdiction: 'france',
    source: 'Demo · public register simulation',
    lastUpdated: '2026-06-01',
    tendencies: ['Strict MTV mediation timetable', 'Settlement pressure when care records incomplete'],
    rates: { defended: 55, settled: 38, paid: 7 },
    byDisruption: { 'ATC Restrictions': { defended: 58, settled: 35, sample: 7 } }
  }
];

var CourtDataAdapter = {
  fetchProfiles: function () {
    return Promise.resolve({ courts: COURT_PROFILES, judges: JUDGE_PROFILES });
  },
  lastSync: function () {
    return '2026-06-01';
  },
  sourceLabel: function () {
    return 'Demo · public register simulation';
  }
};

function getCourtById(id) {
  return COURT_PROFILES.find(function (c) {
    return c.id === id;
  });
}

function getJudgeById(id) {
  return JUDGE_PROFILES.find(function (j) {
    return j.id === id;
  });
}

function getCourtForCase(closedCase) {
  if (!closedCase || !closedCase.courtId) return null;
  return getCourtById(closedCase.courtId);
}

function getJudgeForCase(closedCase) {
  if (!closedCase || !closedCase.judgeId) return null;
  return getJudgeById(closedCase.judgeId);
}
