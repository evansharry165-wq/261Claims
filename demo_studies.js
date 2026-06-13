// Curated demo case studies — each showcases a specific DefendAble capability
var DEMO_STUDIES = [
  {
    id: 'flagship-collaboration',
    title: 'Complex diversion — legal & evidence teams',
    subtitle: 'Daniel Hartley · HC 1184 · £39,000+ weather diversion',
    ref: 'AC-2026-0089',
    tab: 'evidence',
    user: 'SB',
    duration: '5–7 min',
    flagship: true,
    features: ['Gold evidence pack', 'Pull all & gaps', 'Evidence team handoff', 'Repository filing', 'AI drafting', 'Settlement'],
    narrative:
      'The flagship demo. Sarah Booth pulls evidence, requests gaps from Emma Hughes, switches persona to complete the request in the repository, then returns to draft and store documents.',
    steps: [
      'SB — Open case → Evidence → Pull all',
      'SB — Request evidence completion',
      'EH — Requests → Open request → Repository upload',
      'EH — Mark as complete',
      'SB — Move to drafting → Generate LOR',
    ],
    resetKeys: ['dfa_evidence_AC-2026-0089', 'dfa_active_request', 'dfa_seeded_eh_notif'],
  },
  {
    id: 'weather-drafting',
    title: 'Clean weather defence → letter of response',
    subtitle: 'Sarah Taylor · HC 330 · evidence complete',
    ref: 'AC-2026-0076',
    tab: 'documents',
    user: 'JP',
    duration: '3 min',
    features: ['100% gold pack', 'AI document generation', 'Points of claim', 'Add to repository'],
    narrative:
      'Shows the drafting payoff when evidence is already complete — recommended documents, LOR generation, and repository storage.',
    steps: ['JP — Open case → Documents', 'Generate Letter of Response', 'Review recommendations → Approve → Add to repository'],
  },
  {
    id: 'atc-triage',
    title: 'ATC delay — triage to evidence',
    subtitle: 'Rebecca Walsh · HC 307 · Eurocontrol defence',
    ref: 'AC-2026-0091',
    tab: 'triage',
    user: 'JP',
    duration: '4 min',
    features: ['AI triage', 'DEFEND classification', 'Eurocontrol evidence', 'CPR deadlines'],
    narrative:
      'Straightforward ATC extraordinary circumstances case from LOC upload through triage checklist into evidence gathering.',
    steps: ['JP — Triage checklist → Classify DEFEND', 'Deadlines → LOA', 'Evidence → Pull Eurocontrol data'],
  },
  {
    id: 'france-mediation',
    title: 'France — mandatory MTV mediation',
    subtitle: 'Jean-Pierre Moreau · HC 742 · jurisdiction alert',
    ref: 'FR-2026-0012',
    tab: 'deadlines',
    user: 'MD',
    duration: '3 min',
    features: ['Jurisdiction rules', 'MTV mediation alert', 'French procedure', 'Bilingual workflow'],
    narrative:
      'Demonstrates jurisdiction-aware deadlines and the mandatory pre-action mediation requirement for French claims.',
    steps: ['MD — Open case → Deadlines tab', 'Review MTV mediation warning', 'Triage → French evidence matrix'],
  },
  {
    id: 'intake-loc',
    title: 'New claim intake — LOC upload',
    subtitle: 'Angela Foster · HC 203 · fresh LOC',
    ref: 'AC-2026-0101',
    tab: 'triage',
    user: 'SB',
    duration: '2 min',
    features: ['LOC ingestion', 'AI extraction', 'Intake queue', 'Case creation'],
    narrative:
      'Entry point for new claims — from letter of claim upload through AI field extraction into the case pipeline.',
    steps: ['SB — Intake → Upload LOC', 'Review extracted fields → Confirm triage'],
    route: 'intake.html',
  },
  {
    id: 'evidence-ops',
    title: 'Evidence team — requests & AI filing',
    subtitle: 'Emma Hughes · repository operations',
    ref: null,
    tab: 'requests',
    user: 'EH',
    duration: '4 min',
    features: ['Request queue', 'AI upload parsing', 'SharePoint mirror', 'Mark complete'],
    narrative:
      'Evidence-handling perspective — request notifications, structured repository upload with AI field extraction, and completing legal team requests.',
    steps: [
      'EH — Work → Requests queue',
      'Open request → Repository',
      'Upload document → AI fills fields → Confirm',
      'Mark as complete → notifies legal team',
    ],
    route: 'requests.html',
  },
];

function getDemoStudy(id) {
  return DEMO_STUDIES.find(function (s) {
    return s.id === id;
  });
}

function getFlagshipStudy() {
  return DEMO_STUDIES.find(function (s) {
    return s.flagship;
  });
}

function openDemoStudy(id) {
  var study = getDemoStudy(id);
  if (!study) return;

  if (study.user && typeof setActiveUser === 'function') {
    setActiveUser(study.user);
  }

  try {
    sessionStorage.setItem('dfa_active_demo_study', study.id);
    if (study.resetKeys) {
      study.resetKeys.forEach(function (key) {
        sessionStorage.removeItem(key);
      });
    }
    if (study.ref && typeof getCase === 'function') {
      var c = getCase(study.ref);
      if (c) sessionStorage.setItem('dfa_case', JSON.stringify(c));
    }
  } catch (e) {}

  if (study.route) {
    window.location.href = study.route;
    return;
  }

  if (study.ref && typeof openCase === 'function') {
    openCase(study.ref, study.tab || 'overview');
    return;
  }

  window.location.href = study.user === 'EH' ? 'requests.html' : 'index.html';
}
