/* ── 261Claims — shared_data.js ── */
/* Single source of truth. Loaded by every page. */

/* ════════════════════════════════════════
   USERS
   ════════════════════════════════════════ */
const USERS = {
  /* English team */
  SB: { id:'SB', name:'S. Booth',   full:'Sarah Booth',     role:'Head of Legal Ops',     initials:'SB', lang:'en', team:'UK Litigation' },
  JP: { id:'JP', name:'J. Patel',   full:'James Patel',     role:'Senior Solicitor',      initials:'JP', lang:'en', team:'UK Litigation' },
  KR: { id:'KR', name:'K. Rahman',  full:'Kiran Rahman',    role:'Solicitor',             initials:'KR', lang:'en', team:'UK Litigation' },
  /* French team */
  MD: { id:'MD', name:'M. Dupont',  full:'Marie Dupont',    role:'Juriste senior',        initials:'MD', lang:'fr', team:'Équipe France' },
  PL: { id:'PL', name:'P. Laurent', full:'Pierre Laurent',  role:'Juriste',               initials:'PL', lang:'fr', team:'Équipe France' },
  /* Spanish team */
  CG: { id:'CG', name:'C. García',  full:'Carlos García',   role:'Abogado senior',        initials:'CG', lang:'es', team:'Equipo España' },
  IM: { id:'IM', name:'I. Martín',  full:'Isabel Martín',   role:'Abogada',               initials:'IM', lang:'es', team:'Equipo España' },
};

/* ════════════════════════════════════════
   JURISDICTIONS
   ════════════════════════════════════════ */
const JURISDICTIONS = {

  'england-wales': {
    name:'England & Wales', flag:'🇬🇧', lang:'en',
    limitationYears:6,
    limitationNote:'6 years from date of flight — Limitation Act 1980 s.9',
    court:'County Court', courtFull:'County Court (Small Claims Track)',
    enforcementBody:'Civil Aviation Authority (CAA)',
    procedureNote:'CPR Pre-Action Protocol applies. 21-day acknowledgement window. Small claims track for most EC261 claims.',
    responseWindow:21, responseWindowNote:'21 days to acknowledge LOC — CPR Pre-Action Protocol',
    mediation:'optional', mediationNote:'ADR available — CEDR, PACT. Not mandatory before proceedings.',
    keyDates:[
      { label:'Acknowledge LOC',       days:21,  urgency:'critical', note:'CPR Pre-Action Protocol — 21 days from receipt' },
      { label:'Letter of Response',    days:91,  urgency:'important',note:'3 months from acknowledgement' },
      { label:'Limitation review',     days:120, urgency:'watch',    note:'Internal flag — 6-year limitation period' },
    ],
    documents:{
      acknowledgement:'Letter of Acknowledgement',
      response:'Letter of Response',
      defence:'Defence (CPR Part 16)',
      witness:'Witness Statement (CPR Part 32)',
    },
    important: null,
  },

  'france': {
    name:'France', flag:'🇫🇷', lang:'fr',
    limitationYears:5,
    limitationNote:'5 ans à compter de la date du vol — prescription quinquennale (art. 2224 Code civil)',
    court:'Tribunal Judiciaire', courtFull:'Tribunal Judiciaire',
    enforcementBody:'Direction Générale de l\'Aviation Civile (DGAC)',
    procedureNote:'Médiation préalable OBLIGATOIRE depuis le 6 février 2026 (décret n°2025-765 du 5 août 2025). Sans médiation préalable, la demande judiciaire est irrecevable. La saisine du tribunal se fait par assignation délivrée par huissier.',
    responseWindow:60, responseWindowNote:'60 jours pour répondre avant saisine du médiateur',
    mediation:'mandatory',
    mediationBody:'Médiateur du Tourisme et du Voyage (MTV)',
    mediationNote:'Médiation obligatoire depuis le 6 février 2026. Sans cette étape préalable, la demande est irrecevable devant le Tribunal Judiciaire.',
    keyDates:[
      { label:'Répondre à la réclamation',   days:60,  urgency:'critical',  note:'60 jours — avant saisine du médiateur MTV' },
      { label:'Médiation préalable (MTV)',    days:90,  urgency:'critical',  note:'OBLIGATOIRE depuis le 6 février 2026' },
      { label:'Assignation si échec',         days:150, urgency:'important', note:'Saisine Tribunal Judiciaire par assignation' },
      { label:'Surveillance prescription',    days:180, urgency:'watch',     note:'Contrôle interne — prescription 5 ans' },
    ],
    documents:{
      acknowledgement:'Accusé de réception',
      response:'Lettre de réponse',
      defence:'Conclusions en défense',
      witness:'Attestation de témoin',
    },
    important:'ATTENTION : Depuis le 6 février 2026, la médiation préalable est obligatoire avant toute saisine du tribunal. Une action judiciaire sans médiation préalable sera déclarée irrecevable.',
  },

  'spain': {
    name:'Espagne', flag:'🇪🇸', lang:'es',
    limitationYears:5,
    limitationNote:'5 años desde la fecha del vuelo — artículo 1964 del Código Civil',
    court:'Juzgado de lo Mercantil', courtFull:'Juzgado de lo Mercantil',
    enforcementBody:'Agencia Estatal de Seguridad Aérea (AESA)',
    procedureNote:'Las reclamaciones EC261 se presentan ante el Juzgado de lo Mercantil. AESA actúa como organismo de supervisión y puede incoar un expediente sancionador paralelo, independiente del litigio civil. El procedimiento se rige por la Ley de Enjuiciamiento Civil.',
    responseWindow:30, responseWindowNote:'30 días para responder — práctica estándar AESA',
    mediation:'available', mediationNote:'Mediación disponible pero no obligatoria. AESA ofrece procedimiento extrajudicial.',
    keyDates:[
      { label:'Responder a la reclamación',  days:30, urgency:'critical',  note:'30 días — reclamación previa AESA' },
      { label:'Contestación a la demanda',   days:20, urgency:'critical',  note:'20 días hábiles desde notificación judicial' },
      { label:'Vigilancia prescripción',     days:90, urgency:'watch',     note:'Control interno — prescripción 5 años' },
    ],
    documents:{
      acknowledgement:'Acuse de recibo',
      response:'Escrito de respuesta',
      defence:'Contestación a la demanda',
      witness:'Declaración testifical',
    },
    important:'AESA puede iniciar un expediente sancionador paralelo al litigio civil. Las sanciones administrativas son independientes de la compensación civil reclamada.',
  },

};

/* ════════════════════════════════════════
   INTERFACE TRANSLATIONS (i18n)
   ════════════════════════════════════════ */
const I18N = {
  en: {
    dashboard:'Dashboard', intake:'Intake', cases:'Cases', cpr:'CPR',
    evidence:'Evidence', drafting:'Drafting', mi:'MI', knowledge:'Knowledge',
    myCases:'My cases', openCases:'Open cases', intakeQueue:'Intake queue',
    cprWatch:'CPR watch', myPipeline:'My pipeline',
    legalNews:'Legal & regulatory', networkOps:'Network & operations', liveSources:'Live sources',
    goodMorning:'Good morning', goodAfternoon:'Good afternoon', goodEvening:'Good evening',
    switchUser:'Switch user', noUrgentDeadlines:'No urgent CPR deadlines this week',
    evidenceProgress:'Evidence progress', cprDeadlines:'CPR deadlines',
    viewAll:'View all', approved:'Approved', draft:'Draft', notStarted:'Not started',
    generate:'Generate draft', edit:'Edit', approve:'Approve & sign off', download:'Download',
    uploadLOC:'Upload new letter of claim',
    noQueue:'No cases in your intake queue.',
    proceedTriage:'Proceed to triage', proceedCPR:'Set CPR deadlines',
    proceedEvidence:'Proceed to evidence', proceedDrafting:'Proceed to drafting',
    stage_intake:'Intake', stage_triage:'Triage', stage_cpr:'CPR',
    stage_evidence:'Evidence', stage_drafting:'Drafting',
    stage_defence:'Defence', stage_resolve:'Resolve',
    jurisdiction:'Jurisdiction', limitation:'Limitation period',
    nextDeadline:'Next deadline', daysLeft:'days',
  },
  fr: {
    dashboard:'Tableau de bord', intake:'Réception', cases:'Dossiers', cpr:'Délais',
    evidence:'Preuves', drafting:'Rédaction', mi:'Reporting', knowledge:'Ressources',
    myCases:'Mes dossiers', openCases:'Dossiers ouverts', intakeQueue:'File de réception',
    cprWatch:'Surveillance délais', myPipeline:'Mon pipeline',
    legalNews:'Actualités juridiques', networkOps:'Réseau & opérations', liveSources:'Sources en direct',
    goodMorning:'Bonjour', goodAfternoon:'Bon après-midi', goodEvening:'Bonsoir',
    switchUser:'Changer d\'utilisateur', noUrgentDeadlines:'Aucun délai urgent cette semaine',
    evidenceProgress:'Avancement des preuves', cprDeadlines:'Délais de procédure',
    viewAll:'Voir tout', approved:'Approuvé', draft:'Brouillon', notStarted:'Non commencé',
    generate:'Générer le brouillon', edit:'Modifier', approve:'Approuver', download:'Télécharger',
    uploadLOC:'Déposer une lettre de réclamation',
    noQueue:'Aucun dossier dans votre file de réception.',
    proceedTriage:'Procéder au triage', proceedCPR:'Définir les délais',
    proceedEvidence:'Procéder aux preuves', proceedDrafting:'Procéder à la rédaction',
    stage_intake:'Réception', stage_triage:'Triage', stage_cpr:'Délais',
    stage_evidence:'Preuves', stage_drafting:'Rédaction',
    stage_defence:'Défense', stage_resolve:'Résolu',
    jurisdiction:'Juridiction', limitation:'Délai de prescription',
    nextDeadline:'Prochain délai', daysLeft:'jours',
  },
  es: {
    dashboard:'Panel', intake:'Recepción', cases:'Casos', cpr:'Plazos',
    evidence:'Pruebas', drafting:'Redacción', mi:'Informes', knowledge:'Recursos',
    myCases:'Mis casos', openCases:'Casos abiertos', intakeQueue:'Cola de recepción',
    cprWatch:'Vigilancia de plazos', myPipeline:'Mi flujo de trabajo',
    legalNews:'Noticias jurídicas', networkOps:'Red & operaciones', liveSources:'Fuentes en vivo',
    goodMorning:'Buenos días', goodAfternoon:'Buenas tardes', goodEvening:'Buenas noches',
    switchUser:'Cambiar usuario', noUrgentDeadlines:'Sin plazos urgentes esta semana',
    evidenceProgress:'Progreso de pruebas', cprDeadlines:'Plazos procesales',
    viewAll:'Ver todo', approved:'Aprobado', draft:'Borrador', notStarted:'No iniciado',
    generate:'Generar borrador', edit:'Editar', approve:'Aprobar', download:'Descargar',
    uploadLOC:'Cargar carta de reclamación',
    noQueue:'No hay casos en su cola de recepción.',
    proceedTriage:'Proceder al triaje', proceedCPR:'Establecer plazos',
    proceedEvidence:'Proceder a pruebas', proceedDrafting:'Proceder a redacción',
    stage_intake:'Recepción', stage_triage:'Triaje', stage_cpr:'Plazos',
    stage_evidence:'Pruebas', stage_drafting:'Redacción',
    stage_defence:'Defensa', stage_resolve:'Resuelto',
    jurisdiction:'Jurisdicción', limitation:'Plazo de prescripción',
    nextDeadline:'Próximo plazo', daysLeft:'días',
  },
};

/* ════════════════════════════════════════
   ALL CASES
   ════════════════════════════════════════ */
const ALL_CASES = [

  /* ── S. Booth (SB) — UK Litigation ── */
  {
    ref:'AC-2026-0089', assignedTo:'SB',
    claimant:'Daniel Hartley', solicitor:'Pemberton & Associates Solicitors LLP',
    flight:'HC 1184 — LTN → BCN (diverted VLC)', flightNum:'HC 1184',
    dep:'LTN', arr:'BCN', flightDate:'14 March 2026',
    value:'£39,000+', type:'EC 261/2004 — Diversion / consequential loss',
    locDate:'22 May 2026', stage:'evidence', cat:'C',
    jurisdiction:'england-wales', lang:'en',
    disruptionType:'Weather', classification:'ESCALATE',
    evidencePct:35, cprDaysLeft:3,
    points:[
      {n:1,claim:'Delay — Art 7(1)(a)',evidenceStatus:'green',evidenceDoc:'TOPS flight data'},
      {n:2,claim:'Extraordinary circumstances — weather',evidenceStatus:'amber',evidenceDoc:'METAR/SIGMET pending'},
      {n:3,claim:'Article 9 — duty of care',evidenceStatus:'red',evidenceDoc:'Valencia ground records outstanding'},
      {n:4,claim:'Consequential loss — £38,250',evidenceStatus:'red',evidenceDoc:'No counter-evidence yet'},
      {n:5,claim:'Travel & subsistence — £141.80',evidenceStatus:'amber',evidenceDoc:'Receipts pending'},
    ],
    loaStatus:'approved', triageNote:'Complex. Escalate on consequential loss point.',
    activity:[
      {text:'Evidence module opened',time:'Today 09:14',type:'create'},
      {text:'AI triage complete — ESCALATE flag raised',time:'Yesterday 16:30',type:'ai'},
    ]
  },
  {
    ref:'AC-2026-0101', assignedTo:'SB',
    claimant:'Angela Foster', solicitor:'Clarke & Partners Solicitors',
    flight:'HC 203 — LGW → ALC', flightNum:'HC 203',
    dep:'LGW', arr:'ALC', flightDate:'20 May 2026',
    value:'€250', type:'EC 261/2004 — Weather delay',
    locDate:'30 May 2026', stage:'intake', cat:'A',
    jurisdiction:'england-wales', lang:'en',
    disruptionType:'Weather', classification:'DEFEND',
    evidencePct:0, cprDaysLeft:21,
    points:[], loaStatus:'', triageNote:'',
    activity:[{text:'LOC received — assigned to S. Booth',time:'Today 07:55',type:'create'}]
  },

  /* ── J. Patel (JP) — UK Litigation ── */
  {
    ref:'AC-2026-0091', assignedTo:'JP',
    claimant:'Rebecca Walsh', solicitor:'Clarke & Partners Solicitors',
    flight:'HC 307 — MAN → AMS', flightNum:'HC 307',
    dep:'MAN', arr:'AMS', flightDate:'9 April 2026',
    value:'€250', type:'EC 261/2004 — ATC delay',
    locDate:'4 June 2026', stage:'triage', cat:'A',
    jurisdiction:'england-wales', lang:'en',
    disruptionType:'ATC Restrictions', classification:'DEFEND',
    evidencePct:0, cprDaysLeft:21,
    points:[
      {n:1,claim:'Delay 3hrs 36mins — Art 7(1)(a)',evidenceStatus:'green',evidenceDoc:'Confirmed via TOPS'},
      {n:2,claim:'Extraordinary circumstances — ATC ATFM restriction AMS',evidenceStatus:'amber',evidenceDoc:'Eurocontrol data requested'},
      {n:3,claim:'Art 9 — refreshments not provided',evidenceStatus:'red',evidenceDoc:'Ground records required'},
      {n:4,claim:'Expenses during delay — £18.40',evidenceStatus:'amber',evidenceDoc:'Receipts enclosed with LOC'},
    ],
    loaStatus:'', triageNote:'',
    activity:[{text:'LOC uploaded — triage pending',time:'Today 10:30',type:'create'}]
  },
  {
    ref:'AC-2026-0076', assignedTo:'JP',
    claimant:'Sarah Taylor', solicitor:'Thompsons Solicitors',
    flight:'HC 330 — LGW → ALC', flightNum:'HC 330',
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
    loaStatus:'sent', triageNote:'Clean weather case. Evidence complete. Draft LOR.',
    activity:[{text:'Evidence complete — LOR ready to draft',time:'28 May 16:00',type:'stage'}]
  },

  /* ── K. Rahman (KR) — UK Litigation ── */
  {
    ref:'AC-2026-0094', assignedTo:'KR',
    claimant:'Thomas Morrison', solicitor:'Irwin Mitchell LLP',
    flight:'HC 442 — LGW → BCN', flightNum:'HC 442',
    dep:'LGW', arr:'BCN', flightDate:'15 May 2026',
    value:'€250', type:'EC 261/2004 — ATC delay',
    locDate:'28 May 2026', stage:'intake', cat:'A',
    jurisdiction:'england-wales', lang:'en',
    disruptionType:'ATC Restrictions', classification:'DEFEND',
    evidencePct:0, cprDaysLeft:15,
    points:[], loaStatus:'', triageNote:'',
    activity:[{text:'LOC received — assigned to K. Rahman',time:'28 May 08:00',type:'create'}]
  },
  {
    ref:'AC-2026-0079', assignedTo:'KR',
    claimant:'James Singh', solicitor:'Slater & Gordon',
    flight:'HC 556 — LHR → DUB', flightNum:'HC 556',
    dep:'LHR', arr:'DUB', flightDate:'10 May 2026',
    value:'€250', type:'EC 261/2004 — ATC delay',
    locDate:'20 May 2026', stage:'evidence', cat:'A',
    jurisdiction:'england-wales', lang:'en',
    disruptionType:'ATC Restrictions', classification:'DEFEND',
    evidencePct:45, cprDaysLeft:18,
    points:[
      {n:1,claim:'Delay 3hrs 15mins — Art 7(1)(a)',evidenceStatus:'green',evidenceDoc:'TOPS confirmed'},
      {n:2,claim:'Extraordinary circumstances — ATC',evidenceStatus:'amber',evidenceDoc:'Eurocontrol data pending'},
    ],
    loaStatus:'sent', triageNote:'Straightforward ATC. Fast track.',
    activity:[{text:'Evidence pack opened',time:'22 May 11:00',type:'action'}]
  },

  /* ── M. Dupont (MD) — Équipe France ── */
  {
    ref:'FR-2026-0012', assignedTo:'MD',
    claimant:'Jean-Pierre Moreau', solicitor:'Cabinet Lefèvre & Associés',
    flight:'HC 742 — CDG → LTN', flightNum:'HC 742',
    dep:'CDG', arr:'LTN', flightDate:'3 March 2026',
    value:'250 €', type:'Règlement CE 261/2004 — Retard',
    locDate:'12 Mai 2026', stage:'triage', cat:'A',
    jurisdiction:'france', lang:'fr',
    disruptionType:'ATC Restrictions', classification:'DEFEND',
    evidencePct:0, cprDaysLeft:48,
    points:[
      {n:1,claim:'Retard de 3h42 à l\'arrivée — Art 7(1)(a)',evidenceStatus:'green',evidenceDoc:'Données de vol TOPS confirmées'},
      {n:2,claim:'Circonstances extraordinaires — restriction ATC',evidenceStatus:'amber',evidenceDoc:'Données Eurocontrol demandées'},
      {n:3,claim:'Art 9 — absence de rafraîchissements pendant l\'attente',evidenceStatus:'red',evidenceDoc:'Registres de prise en charge requis'},
    ],
    loaStatus:'', triageNote:'',
    activity:[{text:'Lettre de réclamation reçue — assignée à M. Dupont',time:'12 mai 09:00',type:'create'}]
  },
  {
    ref:'FR-2026-0018', assignedTo:'MD',
    claimant:'Sophie Blanchard', solicitor:'Maître Rousseau',
    flight:'HC 519 — LYS → LGW', flightNum:'HC 519',
    dep:'LYS', arr:'LGW', flightDate:'14 Avril 2026',
    value:'400 €', type:'Règlement CE 261/2004 — Annulation',
    locDate:'28 Mai 2026', stage:'evidence', cat:'B',
    jurisdiction:'france', lang:'fr',
    disruptionType:'Weather', classification:'DEFEND',
    evidencePct:40, cprDaysLeft:32,
    points:[
      {n:1,claim:'Annulation le jour même — Art 5(1)(c)',evidenceStatus:'green',evidenceDoc:'Données TOPS confirmées'},
      {n:2,claim:'Circonstances extraordinaires — conditions météorologiques',evidenceStatus:'amber',evidenceDoc:'METAR LYS obtenu, SIGMET en attente'},
      {n:3,claim:'Art 8 — absence de réacheminement proposé',evidenceStatus:'red',evidenceDoc:'Dossier de réacheminement requis'},
    ],
    loaStatus:'sent', triageNote:'Défense météorologique. Obtenir SIGMET et NOTAM pour Lyon.',
    activity:[
      {text:'Dossier de preuves ouvert',time:'1 juin 10:00',type:'stage'},
      {text:'METAR LYS obtenu',time:'2 juin 09:30',type:'upload'},
    ]
  },

  /* ── P. Laurent (PL) — Équipe France ── */
  {
    ref:'FR-2026-0021', assignedTo:'PL',
    claimant:'Antoine Renard', solicitor:'Cabinet Girard',
    flight:'HC 334 — NCE → LTN', flightNum:'HC 334',
    dep:'NCE', arr:'LTN', flightDate:'22 Avril 2026',
    value:'250 €', type:'Règlement CE 261/2004 — Retard',
    locDate:'2 Juin 2026', stage:'intake', cat:'A',
    jurisdiction:'france', lang:'fr',
    disruptionType:'ATC Restrictions', classification:'DEFEND',
    evidencePct:0, cprDaysLeft:58,
    points:[], loaStatus:'', triageNote:'',
    activity:[{text:'Lettre de réclamation reçue — assignée à P. Laurent',time:'2 juin 14:00',type:'create'}]
  },
  {
    ref:'FR-2026-0009', assignedTo:'PL',
    claimant:'Isabelle Fontaine', solicitor:'Maître Dumas',
    flight:'HC 881 — MRS → LGW', flightNum:'HC 881',
    dep:'MRS', arr:'LGW', flightDate:'18 Février 2026',
    value:'250 €', type:'Règlement CE 261/2004 — Retard',
    locDate:'15 Avril 2026', stage:'drafting', cat:'A',
    jurisdiction:'france', lang:'fr',
    disruptionType:'ATC Restrictions', classification:'DEFEND',
    evidencePct:100, cprDaysLeft:14,
    points:[
      {n:1,claim:'Retard de 3h28 à l\'arrivée — Art 7(1)(a)',evidenceStatus:'green',evidenceDoc:'Confirmé'},
      {n:2,claim:'Circonstances extraordinaires — restriction ATFM',evidenceStatus:'green',evidenceDoc:'Données Eurocontrol confirmées'},
    ],
    loaStatus:'sent', triageNote:'Dossier ATC propre. Toutes les preuves réunies. Rédiger la lettre de réponse.',
    activity:[
      {text:'Dossier de preuves complet',time:'28 mai 15:00',type:'stage'},
      {text:'Lettre de réponse à rédiger',time:'28 mai 15:01',type:'action'},
    ]
  },

  /* ── C. García (CG) — Equipo España ── */
  {
    ref:'ES-2026-0031', assignedTo:'CG',
    claimant:'Miguel Ángel Torres', solicitor:'Bufete Sánchez & López',
    flight:'HC 612 — BCN → LGW', flightNum:'HC 612',
    dep:'BCN', arr:'LGW', flightDate:'5 Marzo 2026',
    value:'250 €', type:'Reglamento CE 261/2004 — Retraso',
    locDate:'20 Mayo 2026', stage:'evidence', cat:'A',
    jurisdiction:'spain', lang:'es',
    disruptionType:'ATC Restrictions', classification:'DEFEND',
    evidencePct:60, cprDaysLeft:10,
    points:[
      {n:1,claim:'Retraso de 3h52 a la llegada — Art 7(1)(a)',evidenceStatus:'green',evidenceDoc:'Datos TOPS confirmados'},
      {n:2,claim:'Circunstancias extraordinarias — restricción ATC ATFM',evidenceStatus:'amber',evidenceDoc:'Datos Eurocontrol solicitados'},
      {n:3,claim:'Art 9 — ausencia de atención durante la espera',evidenceStatus:'red',evidenceDoc:'Registros de tierra pendientes'},
    ],
    loaStatus:'sent', triageNote:'Caso ATC limpio. Obtener datos Eurocontrol y registros de tierra BCN.',
    activity:[
      {text:'Expediente de pruebas abierto',time:'25 mayo 10:00',type:'stage'},
      {text:'METAR BCN obtenido',time:'27 mayo 09:00',type:'upload'},
    ]
  },
  {
    ref:'ES-2026-0038', assignedTo:'CG',
    claimant:'Laura Gómez Herrera', solicitor:'Despacho Fernández',
    flight:'HC 228 — MAD → LTN', flightNum:'HC 228',
    dep:'MAD', arr:'LTN', flightDate:'17 Abril 2026',
    value:'400 €', type:'Reglamento CE 261/2004 — Retraso',
    locDate:'28 Mayo 2026', stage:'triage', cat:'B',
    jurisdiction:'spain', lang:'es',
    disruptionType:'Weather', classification:'DEFEND',
    evidencePct:0, cprDaysLeft:22,
    points:[
      {n:1,claim:'Retraso de 4h15 a la llegada — Art 7(1)(b)',evidenceStatus:'green',evidenceDoc:'Confirmado por TOPS'},
      {n:2,claim:'Circunstancias extraordinarias — condiciones meteorológicas',evidenceStatus:'amber',evidenceDoc:'METAR/SIGMET pendiente'},
    ],
    loaStatus:'', triageNote:'',
    activity:[{text:'Carta de reclamación recibida — asignada a C. García',time:'28 mayo 11:00',type:'create'}]
  },

  /* ── I. Martín (IM) — Equipo España ── */
  {
    ref:'ES-2026-0044', assignedTo:'IM',
    claimant:'Roberto Jiménez Vega', solicitor:'Abogados Castellano',
    flight:'HC 471 — VLC → LGW', flightNum:'HC 471',
    dep:'VLC', arr:'LGW', flightDate:'2 Mayo 2026',
    value:'250 €', type:'Reglamento CE 261/2004 — Retraso',
    locDate:'1 Junio 2026', stage:'intake', cat:'A',
    jurisdiction:'spain', lang:'es',
    disruptionType:'ATC Restrictions', classification:'DEFEND',
    evidencePct:0, cprDaysLeft:29,
    points:[], loaStatus:'', triageNote:'',
    activity:[{text:'Carta de reclamación recibida — asignada a I. Martín',time:'1 junio 09:30',type:'create'}]
  },
  {
    ref:'ES-2026-0027', assignedTo:'IM',
    claimant:'Carmen Ruiz Delgado', solicitor:'Bufete Morales',
    flight:'HC 339 — AGP → LTN', flightNum:'HC 339',
    dep:'AGP', arr:'LTN', flightDate:'8 Marzo 2026',
    value:'250 €', type:'Reglamento CE 261/2004 — Retraso',
    locDate:'10 Abril 2026', stage:'drafting', cat:'A',
    jurisdiction:'spain', lang:'es',
    disruptionType:'Weather', classification:'DEFEND',
    evidencePct:100, cprDaysLeft:9,
    points:[
      {n:1,claim:'Retraso de 3h18 a la llegada — Art 7(1)(a)',evidenceStatus:'green',evidenceDoc:'Confirmado'},
      {n:2,claim:'Circunstancias extraordinarias — condiciones meteorológicas',evidenceStatus:'green',evidenceDoc:'METAR/SIGMET confirmados'},
    ],
    loaStatus:'sent', triageNote:'Caso meteorológico limpio. Todas las pruebas reunidas. Redactar escrito de respuesta.',
    activity:[
      {text:'Expediente de pruebas completo',time:'20 mayo 14:00',type:'stage'},
      {text:'Borrador de escrito de respuesta pendiente',time:'20 mayo 14:01',type:'action'},
    ]
  },

];

/* ════════════════════════════════════════
   HELPERS
   ════════════════════════════════════════ */
function getCasesForUser(userId, stage){
  return ALL_CASES.filter(function(c){
    return c.assignedTo===userId && (!stage || c.stage===stage);
  });
}
function getCase(ref){
  return ALL_CASES.find(function(c){ return c.ref===ref; }) || null;
}
function getJurisdiction(key){
  return JURISDICTIONS[key] || JURISDICTIONS['england-wales'];
}
function daysUrgency(d){ return d<=3?'urgent':d<=7?'warn':'ok'; }
function urgencyLabel(d){ return d<=3?d+'d — URGENT':d<=7?d+'d':d+'d'; }

function stageLabel(s, lang){
  lang = lang || getUILang();
  var key = 'stage_' + s;
  return t(key) || s;
}
function stageIcon(s){
  var m={intake:'ti-inbox',triage:'ti-search',cpr:'ti-calendar-due',
         evidence:'ti-folder-open',drafting:'ti-file-pencil',
         defence:'ti-shield',resolve:'ti-circle-check'};
  return m[s]||'ti-file';
}
function stageColor(s){
  var m={intake:'#1D4ED8',triage:'#92400E',cpr:'#B45309',evidence:'#4338CA',
         drafting:'#065F46',defence:'#1A7A4A',resolve:'#374151'};
  return m[s]||'#374151';
}
function stageBg(s){
  var m={intake:'#EFF6FF',triage:'#FEF3C7',cpr:'#FEF9C3',evidence:'#EEEDFE',
         drafting:'#E6F5EE',defence:'#DCFCE7',resolve:'#F1F5F9'};
  return m[s]||'#F1F5F9';
}
function evPctColor(pct){ return pct>=70?'#22A863':pct>=40?'#F59E0B':'#C0392B'; }

/* Active user */
function getActiveUser(){ return sessionStorage.getItem('261c_user')||'SB'; }
function setActiveUser(id){ sessionStorage.setItem('261c_user',id); }

/* UI language — follows active user's lang by default */
function getUILang(){
  var override = sessionStorage.getItem('261c_lang');
  if(override) return override;
  var uid = getActiveUser();
  return (USERS[uid] && USERS[uid].lang) || 'en';
}
function setUILang(lang){ sessionStorage.setItem('261c_lang', lang); }

/* Translation helper */
function t(key){
  var lang = getUILang();
  var dict = I18N[lang] || I18N['en'];
  return dict[key] || I18N['en'][key] || key;
}

/* Jurisdiction badge */
function getJurisdictionBadge(jKey){
  var j = JURISDICTIONS[jKey];
  if(!j || jKey==='england-wales') return '';
  return '<span style="font-size:10px;font-weight:500;padding:2px 7px;border-radius:20px;background:var(--surface3);color:var(--text2);display:inline-flex;align-items:center;gap:3px">'+j.flag+' '+j.name+'</span>';
}
