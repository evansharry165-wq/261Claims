/* ── 261Claims shared case data ── */
/* Single source of truth — injected into all modules */

/* ════════════════════════════════════════
   USERS
   ════════════════════════════════════════ */
const USERS = {
  SB: { id:'SB', name:'S. Booth',  full:'Sarah Booth',  role:'Head of Legal Ops', initials:'SB', lang:'en' },
  JP: { id:'JP', name:'J. Patel',  full:'James Patel',  role:'Senior Solicitor',  initials:'JP', lang:'en' },
  KR: { id:'KR', name:'K. Rahman', full:'Kiran Rahman', role:'Solicitor',          initials:'KR', lang:'en' },
};

/* ════════════════════════════════════════
   JURISDICTION PROFILES
   Each jurisdiction defines:
   - limitationYears: statute of limitations
   - limitationNote: how it's calculated
   - court: the relevant court
   - courtFull: full court name in local language
   - procedureNote: key procedural differences
   - responseWindow: days to respond to LOC equivalent
   - mediation: whether mediation is required/available
   - lang: default language
   - flag: emoji flag for UI
   ════════════════════════════════════════ */
const JURISDICTIONS = {
  'england-wales': {
    name: 'England & Wales',
    flag: '🇬🇧',
    lang: 'en',
    limitationYears: 6,
    limitationNote: '6 years from date of flight — Limitation Act 1980 s.9',
    court: 'County Court',
    courtFull: 'County Court (Small Claims Track)',
    enforcementBody: 'Civil Aviation Authority (CAA)',
    procedureNote: 'CPR Pre-Action Protocol applies. 21-day response window. Small claims track for most EC261 claims.',
    responseWindow: 21,
    responseWindowNote: '21 days to acknowledge LOC — CPR Pre-Action Protocol',
    mediation: 'optional',
    mediationNote: 'ADR available — CEDR, PACT. Not mandatory before proceedings.',
    keyDates: [
      { label: 'Acknowledge LOC', days: 21, urgency: 'critical', note: 'CPR Pre-Action Protocol' },
      { label: 'Letter of response', days: 91, urgency: 'important', note: '3 months from acknowledgement' },
      { label: 'Limitation watch', days: 120, urgency: 'watch', note: '4-month internal review flag' },
    ],
    documents: {
      acknowledgement: 'Letter of Acknowledgement',
      response: 'Letter of Response',
      defence: 'Defence (CPR Part 16)',
      witness: 'Witness Statement (CPR Part 32)',
    },
  },

  'france': {
    name: 'France',
    flag: '🇫🇷',
    lang: 'fr',
    limitationYears: 5,
    limitationNote: '5 ans à compter de la date du vol — prescription quinquennale',
    court: 'Tribunal Judiciaire',
    courtFull: 'Tribunal Judiciaire',
    enforcementBody: 'Direction Générale de l\'Aviation Civile (DGAC)',
    procedureNote: 'Médiation préalable obligatoire depuis le 6 février 2026 (décret du 5 août 2025). Sans médiation préalable, la demande judiciaire sera irrecevable. La saisine du tribunal se fait par assignation uniquement.',
    responseWindow: 60,
    responseWindowNote: '2 mois pour répondre à la réclamation avant ouverture de la médiation',
    mediation: 'mandatory',
    mediationBody: 'Médiateur du Tourisme et du Voyage (MTV)',
    mediationNote: 'Médiation obligatoire depuis le 6 février 2026. Si la compagnie a signé la Charte de Médiation Tourisme et Voyage, le médiateur MTV est compétent. Sans médiation préalable, la demande judiciaire sera irrecevable.',
    keyDates: [
      { label: 'Répondre à la réclamation', days: 60, urgency: 'critical', note: '2 mois — avant saisine du médiateur' },
      { label: 'Médiation préalable', days: 90, urgency: 'important', note: 'Obligatoire depuis le 6 février 2026' },
      { label: 'Assignation (si médiation échoue)', days: 120, urgency: 'watch', note: 'Saisine du Tribunal Judiciaire par assignation' },
      { label: 'Surveillance prescription', days: 180, urgency: 'watch', note: 'Contrôle interne — prescription 5 ans' },
    ],
    documents: {
      acknowledgement: 'Accusé de réception',
      response: 'Lettre de réponse',
      defence: 'Conclusions en défense',
      witness: 'Attestation de témoin',
    },
    important: 'ATTENTION: Depuis le 6 février 2026, la médiation préalable est obligatoire avant toute saisine du tribunal. Une action judiciaire sans médiation préalable sera déclarée irrecevable.',
  },

  'spain': {
    name: 'Spain',
    flag: '🇪🇸',
    lang: 'es',
    limitationYears: 5,
    limitationNote: '5 años desde la fecha del vuelo — artículo 1964 Código Civil',
    court: 'Juzgado de lo Mercantil',
    courtFull: 'Juzgado de lo Mercantil',
    enforcementBody: 'Agencia Estatal de Seguridad Aérea (AESA)',
    procedureNote: 'Las reclamaciones EC261 se presentan ante el Juzgado de lo Mercantil (tribunal mercantil). AESA actúa como organismo de supervisión. No existe protocolo precontencioso equivalente al inglés. El procedimiento sigue la Ley de Enjuiciamiento Civil. AESA puede sancionar a la aerolínea independientemente del litigio civil.',
    responseWindow: 30,
    responseWindowNote: '30 días para responder a la reclamación — práctica estándar AESA',
    mediation: 'available',
    mediationNote: 'Mediación disponible pero no obligatoria. AESA ofrece proceso de reclamación extrajudicial.',
    keyDates: [
      { label: 'Responder a la reclamación', days: 30, urgency: 'critical', note: '30 días — reclamación AESA' },
      { label: 'Contestación a la demanda', days: 20, urgency: 'critical', note: '20 días hábiles desde notificación judicial' },
      { label: 'Vigilancia prescripción', days: 90, urgency: 'watch', note: 'Control interno — prescripción 5 años' },
    ],
    documents: {
      acknowledgement: 'Acuse de recibo',
      response: 'Escrito de respuesta',
      defence: 'Contestación a la demanda',
      witness: 'Declaración testifical',
    },
    important: 'AESA puede iniciar un expediente sancionador paralelo al litigio civil. Las sanciones administrativas son independientes de la compensación civil.',
  },

  'germany': {
    name: 'Germany',
    flag: '🇩🇪',
    lang: 'de',
    limitationYears: 3,
    limitationNote: '3 Jahre — Verjährung endet am 31. Dezember des dritten Jahres (§ 195 BGB)',
    court: 'Amtsgericht / Landgericht',
    courtFull: 'Amtsgericht (bei Streitwert bis €5.000) / Landgericht',
    enforcementBody: 'Luftfahrt-Bundesamt (LBA)',
    procedureNote: 'Verjährungsfrist endet am 31. Dezember des dritten Jahres ab Flugtag — nicht nach 3 Jahren ab Flugtag. Dies ist eine deutsche Besonderheit. Mahnbescheid als schnelles Verfahren möglich.',
    responseWindow: 30,
    responseWindowNote: '30 Tage — Standardpraxis für außergerichtliche Reaktion',
    mediation: 'available',
    mediationNote: 'söp (Schlichtungsstelle für den öffentlichen Personenverkehr) — Schlichtung verfügbar aber nicht obligatorisch.',
    keyDates: [
      { label: 'Außergerichtliche Antwort', days: 30, urgency: 'critical', note: '30 Tage Standardfrist' },
      { label: 'Verjährungsüberwachung', days: 90, urgency: 'watch', note: 'Interne Kontrolle — Verjährung 31.12. des 3. Jahres' },
    ],
    documents: {
      acknowledgement: 'Empfangsbestätigung',
      response: 'Antwortschreiben',
      defence: 'Klageerwiderung',
      witness: 'Zeugenaussage / Eidesstattliche Erklärung',
    },
    important: 'ACHTUNG: Die Verjährungsfrist endet immer am 31. Dezember des dritten Jahres — nicht genau 3 Jahre nach dem Flugtag.',
  },

  'italy': {
    name: 'Italy',
    flag: '🇮🇹',
    lang: 'it',
    limitationYears: 2,
    limitationNote: '2 anni dalla data del volo — termine più breve in Europa',
    court: 'Giudice di Pace / Tribunale',
    courtFull: 'Giudice di Pace (fino a €5.000) / Tribunale',
    enforcementBody: 'Ente Nazionale per l\'Aviazione Civile (ENAC)',
    procedureNote: 'Il termine di prescrizione di 2 anni è il più breve in Europa. Richiede monitoraggio urgente. Il Giudice di Pace è competente per richieste fino a €5.000. Mediazione disponibile tramite organismi accreditati.',
    responseWindow: 30,
    responseWindowNote: '30 giorni — prassi standard per risposta stragiudiziale',
    mediation: 'available',
    mediationNote: 'Mediazione disponibile ma non obbligatoria per questo tipo di controversia.',
    keyDates: [
      { label: 'Risposta stragiudiziale', days: 30, urgency: 'critical', note: '30 giorni — prassi standard' },
      { label: 'ATTENZIONE prescrizione', days: 60, urgency: 'critical', note: 'Solo 2 anni — monitoraggio urgente' },
    ],
    documents: {
      acknowledgement: 'Ricevuta di ricevimento',
      response: 'Lettera di risposta',
      defence: 'Comparsa di risposta',
      witness: 'Dichiarazione testimoniale',
    },
    important: 'ATTENZIONE: La prescrizione italiana è di soli 2 anni — la più breve in Europa. Monitoraggio urgente richiesto per tutti i casi italiani.',
  },

  'poland': {
    name: 'Poland',
    flag: '🇵🇱',
    lang: 'pl',
    limitationYears: 1,
    limitationNote: '1 rok od daty lotu — Prawo lotnicze art. 205b',
    court: 'Sąd Rejonowy / Sąd Okręgowy',
    courtFull: 'Sąd Rejonowy (do 75.000 PLN) / Sąd Okręgowy',
    enforcementBody: 'Urząd Lotnictwa Cywilnego (ULC)',
    procedureNote: 'Roczny termin przedawnienia — najkrótszy spośród rozważanych jurysdykcji. Wymaga natychmiastowego monitorowania.',
    responseWindow: 30,
    responseWindowNote: '30 dni — standardowa praktyka odpowiedzi pozasądowej',
    mediation: 'available',
    mediationNote: 'Mediacja dostępna. ULC prowadzi postępowanie pozasądowe.',
    keyDates: [
      { label: 'Odpowiedź pozasądowa', days: 14, urgency: 'critical', note: '14 dni — pilna odpowiedź wymagana' },
      { label: 'PILNE: przedawnienie', days: 30, urgency: 'critical', note: 'Tylko 1 rok — natychmiastowe działanie' },
    ],
    documents: {
      acknowledgement: 'Potwierdzenie odbioru',
      response: 'Pismo odpowiedzi',
      defence: 'Odpowiedź na pozew',
      witness: 'Zeznanie świadka',
    },
    important: 'UWAGA: Polskie prawo lotnicze przewiduje tylko 1 rok przedawnienia. Wszystkie sprawy polskie wymagają natychmiastowej uwagi.',
  },

  'netherlands': {
    name: 'Netherlands',
    flag: '🇳🇱',
    lang: 'nl',
    limitationYears: 2,
    limitationNote: '2 jaar vanaf de vluchtdatum',
    court: 'Kantonrechter / Rechtbank',
    courtFull: 'Kantonrechter (tot €25.000) / Rechtbank',
    enforcementBody: 'Inspectie Leefomgeving en Transport (ILT)',
    procedureNote: 'Verjaringstermijn van 2 jaar. De Stichting Geschillencommissie Luchtvaart behandelt klachten buitengerechtelijk.',
    responseWindow: 30,
    responseWindowNote: '30 dagen — standaardpraktijk voor buitengerechtelijke reactie',
    mediation: 'available',
    mediationNote: 'Geschillencommissie Luchtvaart — buitengerechtelijke geschillenbeslechting beschikbaar.',
    keyDates: [
      { label: 'Buitengerechtelijk antwoord', days: 30, urgency: 'critical', note: '30 dagen standaard' },
      { label: 'Verjaringscontrole', days: 60, urgency: 'critical', note: 'Slechts 2 jaar — urgente controle' },
    ],
    documents: {
      acknowledgement: 'Ontvangstbevestiging',
      response: 'Antwoordbrief',
      defence: 'Conclusie van antwoord',
      witness: 'Getuigenverklaring',
    },
    important: 'LET OP: Verjaringstermijn is slechts 2 jaar — nauwlettend toezicht vereist.',
  },
};

/* ════════════════════════════════════════
   INTERFACE TRANSLATIONS
   ════════════════════════════════════════ */
const I18N = {
  en: {
    dashboard: 'Dashboard', intake: 'Intake', cases: 'Cases', cpr: 'CPR',
    evidence: 'Evidence', drafting: 'Drafting', mi: 'MI', knowledge: 'Knowledge',
    myCases: 'My cases', openCases: 'Open cases', intakeQueue: 'Intake queue',
    cpuWatch: 'CPR watch', myPipeline: 'My pipeline', legalNews: 'Legal & regulatory',
    networkOps: 'Network & operations', liveSources: 'Live sources',
    goodMorning: 'Good morning', goodAfternoon: 'Good afternoon', goodEvening: 'Good evening',
    switchUser: 'Switch user', jurisdiction: 'Jurisdiction', language: 'Language',
    proceedTriage: 'Proceed to triage', proceedCPR: 'Set CPR deadlines',
    proceedEvidence: 'Proceed to evidence', proceedDrafting: 'Proceed to drafting',
    noUrgentDeadlines: 'No urgent CPR deadlines this week',
    evidenceProgress: 'Evidence progress', cprDeadlines: 'CPR deadlines',
    viewAll: 'View all', required: 'Required', optional: 'Optional',
    approved: 'Approved', draft: 'Draft', notStarted: 'Not started',
    generate: 'Generate draft', edit: 'Edit', approve: 'Approve & sign off',
    download: 'Download', backTo: 'Back to',
    uploadLOC: 'Upload new letter of claim',
    noClaimsQueue: 'No cases in your intake queue.',
  },
  fr: {
    dashboard: 'Tableau de bord', intake: 'Réception', cases: 'Dossiers', cpr: 'Délais',
    evidence: 'Preuves', drafting: 'Rédaction', mi: 'Reporting', knowledge: 'Ressources',
    myCases: 'Mes dossiers', openCases: 'Dossiers ouverts', intakeQueue: 'File de réception',
    cpuWatch: 'Surveillance délais', myPipeline: 'Mon pipeline', legalNews: 'Actualités juridiques',
    networkOps: 'Réseau & opérations', liveSources: 'Sources en direct',
    goodMorning: 'Bonjour', goodAfternoon: 'Bon après-midi', goodEvening: 'Bonsoir',
    switchUser: 'Changer d\'utilisateur', jurisdiction: 'Juridiction', language: 'Langue',
    proceedTriage: 'Procéder au triage', proceedCPR: 'Définir les délais',
    proceedEvidence: 'Procéder aux preuves', proceedDrafting: 'Procéder à la rédaction',
    noUrgentDeadlines: 'Aucun délai urgent cette semaine',
    evidenceProgress: 'Avancement des preuves', cprDeadlines: 'Délais de procédure',
    viewAll: 'Voir tout', required: 'Obligatoire', optional: 'Facultatif',
    approved: 'Approuvé', draft: 'Brouillon', notStarted: 'Non commencé',
    generate: 'Générer le brouillon', edit: 'Modifier', approve: 'Approuver',
    download: 'Télécharger', backTo: 'Retour à',
    uploadLOC: 'Déposer une nouvelle lettre de réclamation',
    noClaimsQueue: 'Aucun dossier dans votre file de réception.',
  },
  es: {
    dashboard: 'Panel', intake: 'Recepción', cases: 'Casos', cpr: 'Plazos',
    evidence: 'Pruebas', drafting: 'Redacción', mi: 'Informes', knowledge: 'Recursos',
    myCases: 'Mis casos', openCases: 'Casos abiertos', intakeQueue: 'Cola de recepción',
    cpuWatch: 'Vigilancia de plazos', myPipeline: 'Mi flujo de trabajo',
    legalNews: 'Noticias jurídicas', networkOps: 'Red & operaciones', liveSources: 'Fuentes en vivo',
    goodMorning: 'Buenos días', goodAfternoon: 'Buenas tardes', goodEvening: 'Buenas noches',
    switchUser: 'Cambiar usuario', jurisdiction: 'Jurisdicción', language: 'Idioma',
    proceedTriage: 'Proceder al triaje', proceedCPR: 'Establecer plazos',
    proceedEvidence: 'Proceder a pruebas', proceedDrafting: 'Proceder a redacción',
    noUrgentDeadlines: 'Sin plazos urgentes esta semana',
    evidenceProgress: 'Progreso de pruebas', cprDeadlines: 'Plazos procesales',
    viewAll: 'Ver todo', required: 'Requerido', optional: 'Opcional',
    approved: 'Aprobado', draft: 'Borrador', notStarted: 'No iniciado',
    generate: 'Generar borrador', edit: 'Editar', approve: 'Aprobar',
    download: 'Descargar', backTo: 'Volver a',
    uploadLOC: 'Cargar nueva carta de reclamación',
    noClaimsQueue: 'No hay casos en su cola de recepción.',
  },
};

/* ════════════════════════════════════════
   CASE DATA
   ════════════════════════════════════════ */
const ALL_CASES = [
  /* ── S. Booth cases ── */
  {
    ref:'AC-2026-0089', assignedTo:'SB',
    claimant:'Daniel Hartley', solicitor:'Pemberton & Associates Solicitors LLP',
    flight:'HC 1184 — LTN to BCN (diverted VLC)', flightNum:'HC 1184',
    dep:'LTN', arr:'BCN', flightDate:'14 March 2026',
    value:'£39,000+', type:'EC 261/2004 — Diversion / consequential loss',
    locDate:'22 May 2026', stage:'evidence', cat:'C',
    jurisdiction:'england-wales', lang:'en',
    disruptionType:'Weather', classification:'ESCALATE',
    evidencePct:35, cprDaysLeft:3,
    points:[
      {n:1,claim:'Delay — Art 7(1)(a)',evidenceStatus:'green',evidenceDoc:'TOPS flight data'},
      {n:2,claim:'Extraordinary circumstances — weather',evidenceStatus:'amber',evidenceDoc:'METAR/SIGMET pending'},
      {n:3,claim:'Article 9 duty of care',evidenceStatus:'red',evidenceDoc:'Valencia ground records outstanding'},
      {n:4,claim:'Consequential loss — £38,250',evidenceStatus:'red',evidenceDoc:'No counter-evidence yet'},
      {n:5,claim:'Travel & subsistence — £141.80',evidenceStatus:'amber',evidenceDoc:'Receipts pending'},
    ],
    loaStatus:'approved', triageNote:'Complex. Escalate to senior counsel on consequential loss point.',
    docs:[], activity:[
      {text:'Evidence module opened',time:'Today 09:14',type:'create'},
      {text:'AI triage complete — ESCALATE flag raised',time:'Yesterday 16:30',type:'ai'},
    ]
  },
  {
    ref:'AC-2026-0087', assignedTo:'SB',
    claimant:'Marcus Chen', solicitor:'Fletchers Solicitors',
    flight:'HC 891 — MAN to CDG', flightNum:'HC 891',
    dep:'MAN', arr:'CDG', flightDate:'18 May 2026',
    value:'€400', type:'EC 261/2004 — Cancellation',
    locDate:'26 May 2026', stage:'defence', cat:'B',
    jurisdiction:'france', lang:'fr',
    disruptionType:'Industrial Action', classification:'DEFEND',
    evidencePct:90, cprDaysLeft:5,
    points:[
      {n:1,claim:'Annulation — Art 5(1)(c)',evidenceStatus:'green',evidenceDoc:'Données TOPS confirmées'},
      {n:2,claim:'Circonstances extraordinaires — grève',evidenceStatus:'green',evidenceDoc:'NOTAM Eurocontrol confirmé'},
      {n:3,claim:'Art 8 — obligation de réacheminement',evidenceStatus:'amber',evidenceDoc:'Dossier de réacheminement requis'},
    ],
    loaStatus:'sent', triageNote:'Grève ATC. Défense solide sur les circonstances extraordinaires.',
    docs:[], activity:[
      {text:'Projet de lettre de réponse — en attente de validation',time:'Today 08:45',type:'draft'},
      {text:'Dossier de preuves complet à 90%',time:'Yesterday 14:20',type:'action'},
    ]
  },
  {
    ref:'AC-2026-0071', assignedTo:'SB',
    claimant:'Priya Singh', solicitor:'Irwin Mitchell LLP',
    flight:'HC 118 — LTN to AGP', flightNum:'HC 118',
    dep:'LTN', arr:'AGP', flightDate:'2 April 2026',
    value:'€250', type:'EC 261/2004 — ATC delay',
    locDate:'18 May 2026', stage:'resolve', cat:'A',
    jurisdiction:'england-wales', lang:'en',
    disruptionType:'ATC Restrictions', classification:'DEFEND',
    evidencePct:100, cprDaysLeft:22,
    points:[
      {n:1,claim:'Delay 3hrs 22mins — Art 7(1)(a)',evidenceStatus:'green',evidenceDoc:'TOPS confirmed'},
      {n:2,claim:'Extraordinary circumstances — ATC',evidenceStatus:'green',evidenceDoc:'Eurocontrol regulation confirmed'},
    ],
    loaStatus:'sent', triageNote:'Clean ATC case. Defendable. Fast track.',
    docs:[], activity:[
      {text:'Defence filed to Irwin Mitchell LLP',time:'28 May 11:00',type:'stage'},
    ]
  },
  {
    ref:'AC-2026-0101', assignedTo:'SB',
    claimant:'Angela Foster', solicitor:'Clarke & Partners Solicitors',
    flight:'HC 203 — LGW to ALC', flightNum:'HC 203',
    dep:'LGW', arr:'ALC', flightDate:'20 May 2026',
    value:'€250', type:'EC 261/2004 — Weather delay',
    locDate:'30 May 2026', stage:'intake', cat:'A',
    jurisdiction:'england-wales', lang:'en',
    disruptionType:'Weather', classification:'DEFEND',
    evidencePct:0, cprDaysLeft:21,
    points:[], loaStatus:'', triageNote:'',
    docs:[], activity:[
      {text:'LOC received — assigned to S. Booth',time:'Today 07:55',type:'create'},
    ]
  },

  /* ── J. Patel cases ── */
  {
    ref:'AC-2026-0091', assignedTo:'JP',
    claimant:'Rebecca Walsh', solicitor:'Clarke & Partners Solicitors',
    flight:'HC 307 — MAN to AMS', flightNum:'HC 307',
    dep:'MAN', arr:'AMS', flightDate:'9 April 2026',
    value:'€250', type:'EC 261/2004 — ATC delay',
    locDate:'27 May 2026', stage:'triage', cat:'A',
    jurisdiction:'england-wales', lang:'en',
    disruptionType:'ATC Restrictions', classification:'DEFEND',
    evidencePct:0, cprDaysLeft:8,
    points:[
      {n:1,claim:'Delay 3hrs 36mins — Art 7(1)(a)',evidenceStatus:'green',evidenceDoc:'Confirmed via TOPS'},
      {n:2,claim:'Extraordinary circumstances — ATC ATFM restriction AMS',evidenceStatus:'amber',evidenceDoc:'Eurocontrol data requested'},
    ],
    loaStatus:'sent', triageNote:'',
    docs:[], activity:[
      {text:'LOC processed — triage stage',time:'Yesterday 15:20',type:'stage'},
    ]
  },
  {
    ref:'AC-2026-0083', assignedTo:'JP',
    claimant:'David Okafor', solicitor:'Slater & Gordon',
    flight:'HC 204 — LTN to PMI', flightNum:'HC 204',
    dep:'LTN', arr:'PMI', flightDate:'5 May 2026',
    value:'£12,000', type:'EC 261/2004 — Diversion / overnight',
    locDate:'24 May 2026', stage:'evidence', cat:'C',
    jurisdiction:'spain', lang:'es',
    disruptionType:'Weather', classification:'INVESTIGATE',
    evidencePct:55, cprDaysLeft:12,
    points:[
      {n:1,claim:'Retraso — Art 7(1)(a)',evidenceStatus:'green',evidenceDoc:'Confirmado'},
      {n:2,claim:'Circunstancias extraordinarias — desvío meteorológico',evidenceStatus:'amber',evidenceDoc:'METAR obtenido, SIGMET pendiente'},
      {n:3,claim:'Alojamiento nocturno — Art 9',evidenceStatus:'red',evidenceDoc:'Registros de hotel pendientes'},
      {n:4,claim:'Pérdida de ingresos — £11,500',evidenceStatus:'red',evidenceDoc:'Pendiente de investigación'},
    ],
    loaStatus:'sent', triageNote:'Investigar la provisión de alojamiento nocturno y la reclamación de pérdida de ingresos.',
    docs:[], activity:[
      {text:'METAR obtenido para PMI 05/05',time:'29 May 14:10',type:'upload'},
    ]
  },
  {
    ref:'AC-2026-0076', assignedTo:'JP',
    claimant:'Sarah Taylor', solicitor:'Thompsons Solicitors',
    flight:'HC 330 — LGW to ALC', flightNum:'HC 330',
    dep:'LGW', arr:'ALC', flightDate:'28 April 2026',
    value:'€400', type:'EC 261/2004 — Weather delay',
    locDate:'22 May 2026', stage:'drafting', cat:'B',
    jurisdiction:'england-wales', lang:'en',
    disruptionType:'Weather', classification:'DEFEND',
    evidencePct:100, cprDaysLeft:7,
    points:[
      {n:1,claim:'Delay 4hrs 10mins — Art 7(1)(b)',evidenceStatus:'green',evidenceDoc:'TOPS confirmed'},
      {n:2,claim:'Extraordinary circumstances — weather',evidenceStatus:'green',evidenceDoc:'METAR/SIGMET confirmed'},
    ],
    loaStatus:'sent', triageNote:'Clean weather case. All evidence on file. Draft LOR.',
    docs:[], activity:[
      {text:'Evidence complete — LOR ready to draft',time:'28 May 16:00',type:'stage'},
    ]
  },

  /* ── K. Rahman cases ── */
  {
    ref:'AC-2026-0094', assignedTo:'KR',
    claimant:'Thomas Morrison', solicitor:'Irwin Mitchell LLP',
    flight:'HC 442 — LGW to BCN', flightNum:'HC 442',
    dep:'LGW', arr:'BCN', flightDate:'15 May 2026',
    value:'€250', type:'EC 261/2004 — ATC delay',
    locDate:'28 May 2026', stage:'intake', cat:'A',
    jurisdiction:'england-wales', lang:'en',
    disruptionType:'ATC Restrictions', classification:'DEFEND',
    evidencePct:0, cprDaysLeft:15,
    points:[], loaStatus:'', triageNote:'',
    docs:[], activity:[
      {text:'LOC received — assigned to K. Rahman',time:'28 May 08:00',type:'create'},
    ]
  },
  {
    ref:'AC-2026-0079', assignedTo:'KR',
    claimant:'James Singh', solicitor:'Slater & Gordon',
    flight:'HC 556 — LHR to DUB', flightNum:'HC 556',
    dep:'LHR', arr:'DUB', flightDate:'10 May 2026',
    value:'€250', type:'EC 261/2004 — ATC delay',
    locDate:'20 May 2026', stage:'cpr', cat:'A',
    jurisdiction:'england-wales', lang:'en',
    disruptionType:'ATC Restrictions', classification:'DEFEND',
    evidencePct:0, cprDaysLeft:18,
    points:[
      {n:1,claim:'Delay 3hrs 15mins — Art 7(1)(a)',evidenceStatus:'green',evidenceDoc:'TOPS confirmed'},
      {n:2,claim:'Extraordinary circumstances — ATC',evidenceStatus:'amber',evidenceDoc:'Eurocontrol data pending'},
    ],
    loaStatus:'sent', triageNote:'Straightforward ATC. Fast track.',
    docs:[], activity:[
      {text:'LOA sent — CPR deadline set',time:'22 May 11:00',type:'action'},
    ]
  },
  {
    ref:'AC-2026-0098', assignedTo:'KR',
    claimant:'Emma Williams', solicitor:'Fletchers Solicitors',
    flight:'HC 612 — MAN to PMI', flightNum:'HC 612',
    dep:'MAN', arr:'PMI', flightDate:'22 May 2026',
    value:'€250', type:'EC 261/2004 — Weather delay',
    locDate:'29 May 2026', stage:'evidence', cat:'A',
    jurisdiction:'england-wales', lang:'en',
    disruptionType:'Weather', classification:'DEFEND',
    evidencePct:45, cprDaysLeft:19,
    points:[
      {n:1,claim:'Delay 3hrs 45mins — Art 7(1)(a)',evidenceStatus:'green',evidenceDoc:'TOPS confirmed'},
      {n:2,claim:'Extraordinary circumstances — weather',evidenceStatus:'amber',evidenceDoc:'METAR obtained, SIGMET pending'},
    ],
    loaStatus:'sent', triageNote:'Weather delay. Obtain SIGMET and NOTAM.',
    docs:[], activity:[
      {text:'METAR obtained for PMI',time:'30 May 09:00',type:'upload'},
    ]
  },
];

/* ════════════════════════════════════════
   HELPERS
   ════════════════════════════════════════ */
function getCasesForUser(userId, stage){
  return ALL_CASES.filter(c => c.assignedTo===userId && (!stage || c.stage===stage));
}
function getCase(ref){ return ALL_CASES.find(c=>c.ref===ref)||null; }
function getJurisdiction(key){ return JURISDICTIONS[key]||JURISDICTIONS['england-wales']; }
function daysUrgency(d){ return d<=3?'urgent':d<=7?'warn':'ok'; }
function urgencyLabel(d){ return d<=3?d+'d — URGENT':d<=7?d+'d — this week':d+'d'; }
function stageLabel(s){
  const m={intake:'Intake',triage:'Triage',cpr:'CPR',evidence:'Evidence',drafting:'Drafting',defence:'Defence',resolve:'Resolve'};
  return m[s]||s;
}
function stageIcon(s){
  const m={intake:'ti-inbox',triage:'ti-search',cpr:'ti-calendar-due',evidence:'ti-folder-open',drafting:'ti-file-pencil',defence:'ti-shield',resolve:'ti-circle-check'};
  return m[s]||'ti-file';
}
function stageColor(s){
  const m={intake:'#1D4ED8',triage:'#92400E',cpr:'#B45309',evidence:'#4338CA',drafting:'#065F46',defence:'#1A7A4A',resolve:'#374151'};
  return m[s]||'#374151';
}
function stageBg(s){
  const m={intake:'#EFF6FF',triage:'#FEF3C7',cpr:'#FEF9C3',evidence:'#EEEDFE',drafting:'#E6F5EE',defence:'#DCFCE7',resolve:'#F1F5F9'};
  return m[s]||'#F1F5F9';
}
function evPctColor(pct){ return pct>=70?'var(--green-l)':pct>=40?'#F59E0B':'var(--red)'; }

/* Active user */
function getActiveUser(){ return sessionStorage.getItem('261c_user')||'SB'; }
function setActiveUser(id){ sessionStorage.setItem('261c_user',id); }

/* Interface language */
function getUILang(){
  return sessionStorage.getItem('261c_lang') || USERS[getActiveUser()]?.lang || 'en';
}
function setUILang(lang){ sessionStorage.setItem('261c_lang', lang); }
function t(key){
  const lang = getUILang();
  return (I18N[lang]&&I18N[lang][key]) || I18N['en'][key] || key;
}

/* Jurisdiction helpers */
function getJurisdictionBadge(jKey){
  const j = JURISDICTIONS[jKey];
  if(!j) return '';
  return `<span style="font-size:10px;font-weight:500;padding:2px 7px;border-radius:20px;background:var(--surface3);color:var(--text2);display:inline-flex;align-items:center;gap:4px">${j.flag} ${j.name}</span>`;
}
function getLimitationUrgency(jKey, locDateStr){
  const j = JURISDICTIONS[jKey];
  if(!j||!locDateStr) return null;
  try{
    const parts = locDateStr.match(/(\d+)\s+(\w+)\s+(\d{4})/);
    if(!parts) return null;
    const MONTHS={January:0,February:1,March:2,April:3,May:4,June:5,July:6,August:7,September:8,October:9,November:10,December:11,Jan:0,Feb:1,Mar:2,Apr:3,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11};
    const flightDate = new Date(parseInt(parts[3]),MONTHS[parts[2]]||0,parseInt(parts[1]));
    let limitDate;
    if(jKey==='germany'){
      limitDate = new Date(flightDate.getFullYear()+j.limitationYears,11,31);
    } else {
      limitDate = new Date(flightDate);
      limitDate.setFullYear(limitDate.getFullYear()+j.limitationYears);
    }
    const daysLeft = Math.round((limitDate-new Date())/(1000*60*60*24));
    return { limitDate, daysLeft, years: j.limitationYears };
  }catch(e){ return null; }
}
