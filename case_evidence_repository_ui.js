/**
 * DefendAble — case Evidence Repository panel UI.
 *
 * Renders the "Evidence repository" tab content inside case_shell.
 * Depends on window.CaseEvidenceRepository (data) + window.EvidenceCollection (source list).
 *
 * Public API — window.CaseEvidenceRepoUI:
 *   .render(caseRef, targetEl)   — build the full panel into targetEl
 */
(function (global) {
  'use strict';

  /* B1.4 · Full evidence catalogue (40 sources) with status per source.
     LIVE     — we have this feed running today
     PLANNED  — public source exists; not yet built
     NOT_COV  — public source exists but we've chosen not to build (paid gate / fragmentation)
     BLOCKED  — airline-internal only; needs customer-side integration
  */
  var EVIDENCE_CATALOGUE = [
    /* --- LIVE (7) --- */
    { id:'aviationweather-metar-taf', label:'AviationWeather METAR / TAF', category:'Weather', status:'LIVE' },
    { id:'met-office-datahub', label:'Met Office DataHub', category:'Weather', status:'LIVE' },
    { id:'faa-notams', label:'FAA NOTAMs', category:'NOTAM', status:'LIVE' },
    { id:'autorouter-notams', label:'AutoRouter European NOTAMs', category:'NOTAM', status:'LIVE' },
    { id:'eurocontrol-nm-public', label:'Eurocontrol NM public NOP', category:'ATFM', status:'LIVE' },
    { id:'ops-group', label:'OPSGROUP', category:'Aviation news', status:'LIVE' },
    { id:'aviation-herald', label:'Aviation Herald + Simple Flying', category:'Aviation news', status:'LIVE' },
    /* --- LIVE bonus (4) — sources we built that aren't in the paper catalogue yet --- */
    { id:'nasa-firms', label:'NASA FIRMS wildfires', category:'Natural disaster', status:'LIVE' },
    { id:'gdacs', label:'GDACS global disasters', category:'Natural disaster', status:'LIVE' },
    { id:'copernicus-effis', label:'Copernicus EMS / EFFIS', category:'Natural disaster', status:'LIVE' },
    { id:'smithsonian-volcanoes', label:'Smithsonian weekly volcano report', category:'Volcanic', status:'LIVE' },
    /* --- PLANNED (7) --- */
    { id:'opensky-flight-tracks', label:'OpenSky flight tracks', category:'Flight tracks', status:'PLANNED', reason:'non-commercial free tier live; commercial licence quote required' },
    { id:'enac-italy', label:'ENAC Italy strike notices', category:'Industrial action', status:'PLANNED', reason:'public website scrape target' },
    { id:'mit-italy', label:'Italy MIT strike calendar', category:'Industrial action', status:'PLANNED', reason:'public website scrape target' },
    { id:'italy-strike-guarantee', label:'Italy Strike Guarantee Commission', category:'Industrial action', status:'PLANNED', reason:'public website scrape target' },
    { id:'dgac-france', label:'DGAC France disruption calendar', category:'Industrial action', status:'PLANNED', reason:'public website scrape target' },
    { id:'lightning-maps', label:'Lightning maps (blitzortung)', category:'Weather', status:'PLANNED', reason:'freely accessible' },
    { id:'iceland-roads', label:'Iceland road conditions', category:'Weather', status:'PLANNED', reason:'freely accessible; niche' },
    { id:'eurocontrol-nm-b2b', label:'Eurocontrol NM B2B (full tier)', category:'ATFM', status:'PLANNED', reason:'first 2 certs per org free; cert onboarding pending' },
    { id:'vaac-london-qva', label:'VAAC London volcanic ash', category:'Volcanic', status:'PLANNED', reason:'onboarding pending' },
    /* --- NOT COVERED (2) --- */
    { id:'flightradar24', label:'FlightRadar24 commercial API', category:'Flight tracks', status:'NOT_COV', reason:'paid — defer to 10K-case tier ($900/mo Business)' },
    { id:'flight-stats', label:'Flight Stats / Cirium', category:'Flight tracks', status:'NOT_COV', reason:'enterprise pricing ~$70K/yr — defer' },
    /* --- BLOCKED (24 — airline-internal only) --- */
    { id:'aims-crew', label:'AIMS · Crew Route & FDP Tables', category:'Crew', status:'BLOCKED', reason:'internal — needs airline integration' },
    { id:'tops', label:'TOPS · Flight/Airport Details', category:'Operational', status:'BLOCKED', reason:'internal — OpenSky covers public overlap' },
    { id:'disco', label:'DISCO summary', category:'Operational', status:'BLOCKED', reason:'internal summarisation tool' },
    { id:'docunet-oma-commander', label:'DocuNet OMA Commander Responsibility', category:'Policy', status:'BLOCKED', reason:'internal policy doc' },
    { id:'docunet-ghm-oma', label:'DocuNet GHM / OMA general', category:'Policy', status:'BLOCKED', reason:'internal policy suite' },
    { id:'docunet-crew-suite', label:'DocuNet Crew (Rest / Absence / Sickness / FRMS / Cabin)', category:'Policy', status:'BLOCKED', reason:'internal policy suite (7 docs)' },
    { id:'docunet-approach', label:'DocuNet Discontinued Approach', category:'Policy', status:'BLOCKED', reason:'internal procedure doc' },
    { id:'max-ops', label:'MAX OPS · customer comms SMS/Email', category:'Passenger care', status:'BLOCKED', reason:'internal + passenger PII heavy' },
    { id:'connected-portal', label:'Connected Portal · flight plans', category:'Operational', status:'BLOCKED', reason:'internal ops system' },
    { id:'lido-cci', label:'LIDO CCI&AOI/AGC RWY', category:'Airport data', status:'BLOCKED', reason:'Lufthansa Systems commercial product' },
    { id:'lido-minima', label:'LIDO Minima', category:'Airport data', status:'BLOCKED', reason:'Lufthansa Systems commercial product' },
    { id:'hermes-acars', label:'HERMES ACARS', category:'Operational', status:'BLOCKED', reason:'internal comms platform' },
    { id:'internal-emails', label:'Internal emails (NC/easyOps/Crewing)', category:'Operational', status:'BLOCKED', reason:'internal comms' },
    { id:'live-evidence-folders', label:'Live Evidence Folders', category:'Operational', status:'BLOCKED', reason:'internal ops' },
    { id:'ezy-playbooks', label:'EZY Playbooks', category:'Policy', status:'BLOCKED', reason:'internal policy suite' },
    { id:'daily-ops-review', label:'Daily Ops Review', category:'Operational', status:'BLOCKED', reason:'internal ops summary' },
    { id:'network-outlook-brief', label:'Network Outlook Brief', category:'Operational', status:'BLOCKED', reason:'internal — Eurocontrol NOP touches this' },
    { id:'sby-crew-report', label:'SBY A/C & Crew Report', category:'Operational', status:'BLOCKED', reason:'internal roster' },
    { id:'ond-statements', label:'OND Statements by SCDO & DIO', category:'Narrative', status:'BLOCKED', reason:'internal narrative document' },
    { id:'amos-event-printout', label:'AMOS Event Printout', category:'Technical', status:'BLOCKED', reason:'Swiss AviationSoftware MRO — internal' },
    { id:'dpm-notes', label:'DPM Notes', category:'Operational', status:'BLOCKED', reason:'internal daily performance metrics' },
    { id:'safetynet-reports', label:'SafetyNet Reports', category:'Operational', status:'BLOCKED', reason:'internal safety-net reporting' },
    { id:'moc-austrian', label:'MOC Statement for Austrian Flights', category:'Operational', status:'BLOCKED', reason:'airline-internal MOC statements' },
    { id:'teams-chat', label:'Teams chat', category:'Comms', status:'BLOCKED', reason:'internal comms platform' },
  ];

  var STATUS_STYLES = {
    LIVE:    { bg:'#EEF7F2', fg:'#1A5C3A', label:'LIVE' },
    PLANNED: { bg:'#EEF2F8', fg:'#1B3A6B', label:'PLANNED' },
    NOT_COV: { bg:'#FDF4E3', fg:'#7A4E00', label:'NOT COVERED' },
    BLOCKED: { bg:'#FBF0F0', fg:'#8B1A1A', label:'BLOCKED' },
  };


  function css(){
    if (document.getElementById('cer-ui-css')) return;
    var s = document.createElement('style');
    s.id = 'cer-ui-css';
    s.textContent = [
      '.cer-wrap{padding:16px 22px;font-family:var(--font,Helvetica Neue,Arial,sans-serif);color:var(--text,#1A1A2E);font-size:14px}',
      '.cer-hero{background:var(--surface,#fff);border:1px solid var(--border,#D8D8E0);border-radius:3px;padding:14px 18px;margin-bottom:16px;display:grid;grid-template-columns:1fr auto;gap:14px;align-items:center}',
      '.cer-hero-stats{align-items:center}',
      '.cer-hero-info h3{font-family:var(--font-serif,Georgia,serif);font-size:16px;font-weight:400;margin:0 0 4px}',
      '.cer-hero-info p{margin:0;font-size:12px;color:var(--text3,#6B6B80);line-height:1.5}',
      '.cer-hero-stats{display:flex;gap:20px;text-align:right}',
      '.cer-hero-stat .n{font-family:var(--font-serif,Georgia,serif);font-size:24px;font-weight:400;color:var(--text,#1A1A2E);line-height:1}',
      '.cer-hero-stat .l{font-size:9.5px;color:var(--text3,#6B6B80);text-transform:uppercase;letter-spacing:.06em;margin-top:4px}',
      '.cer-facts{padding:10px 18px 12px;background:var(--surface2,#F7F7F9);border:1px solid var(--rule2,#EBEBF0);border-radius:3px;margin-bottom:16px;font-size:11.5px;display:flex;flex-wrap:wrap;gap:10px 22px}',
      '.cer-facts .k{font-family:var(--mono,Courier New,monospace);color:var(--text3,#6B6B80);font-size:10px;text-transform:uppercase;letter-spacing:.06em;margin-right:6px}',
      '.cer-facts .v{font-family:var(--mono,Courier New,monospace);color:var(--text,#1A1A2E);font-weight:600}',
      '.cer-sec-hdr{display:flex;justify-content:space-between;align-items:baseline;margin:24px 0 10px}',
      '.cer-sec-hdr h4{font-family:var(--font-serif,Georgia,serif);font-size:15px;font-weight:400;margin:0}',
      '.cer-sec-hdr .hint{font-size:11px;color:var(--text3,#6B6B80)}',
      '.cer-attached{display:flex;flex-direction:column;gap:8px}',
      '.cer-att{background:var(--surface,#fff);border:1px solid var(--border,#D8D8E0);border-left:3px solid var(--confirm,#1A5C3A);border-radius:3px;padding:11px 14px;display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center}',
      '.cer-att-icon{width:32px;height:32px;border-radius:3px;display:flex;align-items:center;justify-content:center;font-size:15px}',
      '.cer-att-body{min-width:0}',
      '.cer-att-summary{font-size:12.5px;color:var(--text,#1A1A2E);font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.cer-att-meta{font-size:10.5px;color:var(--text3,#6B6B80);margin-top:2px;font-family:var(--mono,Courier New,monospace)}',
      '.cer-att-actions{display:flex;gap:6px}',
      '.cer-att-btn{font-size:11px;padding:4px 9px;border:1px solid var(--border,#D8D8E0);background:var(--surface,#fff);color:var(--text2,#2D2D44);border-radius:3px;cursor:pointer;font-family:var(--font,Helvetica Neue,Arial,sans-serif)}',
      '.cer-att-btn:hover{background:var(--surface2,#F7F7F9)}',
      '.cer-att-btn.danger:hover{background:var(--red-faint,#FBF0F0);color:var(--red,#8B1A1A);border-color:var(--red,#8B1A1A)}',
      '.cer-empty{padding:26px 18px;background:var(--surface2,#F7F7F9);border:1px dashed var(--rule,#D8D8E0);border-radius:3px;text-align:center;color:var(--text3,#6B6B80);font-size:12px}',
      '.cer-sources{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:12px}',
      '.cer-src{background:var(--surface,#fff);border:1px solid var(--border,#D8D8E0);border-radius:3px;overflow:hidden;display:flex;flex-direction:column}',
      '.cer-src-hdr{padding:11px 14px 10px;border-bottom:1px solid var(--rule2,#EBEBF0);display:flex;justify-content:space-between;align-items:flex-start;gap:8px}',
      '.cer-src-name{font-family:var(--mono,Courier New,monospace);font-size:11px;font-weight:600;color:var(--text,#1A1A2E)}',
      '.cer-src-provider{font-size:11px;color:var(--text3,#6B6B80);margin-top:2px}',
      '.cer-src-chip{padding:2px 8px;border-radius:8px;font-family:var(--mono,Courier New,monospace);font-size:9.5px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;flex-shrink:0}',
      '.chip-hit{background:var(--confirm-faint,#EEF7F2);color:var(--confirm,#1A5C3A)}',
      '.chip-nohit{background:var(--surface3,#EFEFF2);color:var(--text3,#6B6B80)}',
      '.chip-loading{background:var(--accent-faint,#EEF2F8);color:var(--accent,#1B3A6B)}',
      '.cer-src-body{padding:8px 14px 12px;flex:1;font-size:11.5px;max-height:280px;overflow-y:auto}',
      '.cer-item-row{display:grid;grid-template-columns:1fr auto;gap:8px;padding:7px 0;border-bottom:1px dashed var(--rule2,#EBEBF0);align-items:center}',
      '.cer-item-row:last-child{border-bottom:none}',
      '.cer-item-summary{font-size:11.5px;color:var(--text2,#2D2D44);line-height:1.4;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}',
      '.cer-item-btn{font-size:10.5px;padding:3px 9px;border:1px solid var(--accent,#1B3A6B);background:var(--surface,#fff);color:var(--accent,#1B3A6B);border-radius:3px;cursor:pointer;font-family:var(--font,Helvetica Neue,Arial,sans-serif);white-space:nowrap;font-weight:500}',
      '.cer-item-btn:hover{background:var(--accent,#1B3A6B);color:#fff}',
      '.cer-item-btn.done{background:var(--confirm,#1A5C3A);color:#fff;border-color:var(--confirm,#1A5C3A);cursor:default}',
      '.cer-item-none{padding:14px 0;color:var(--text3,#6B6B80);font-size:11px;font-style:italic;text-align:center}',
      '.cer-spinner{display:inline-block;width:12px;height:12px;border:2px solid var(--rule,#D8D8E0);border-top-color:var(--accent2,#254E91);border-radius:50%;animation:cerspin 0.7s linear infinite;vertical-align:middle;margin-right:6px}',
      '.cer-spinner-lg{display:inline-block;width:20px;height:20px;border:2.5px solid var(--rule,#D8D8E0);border-top-color:var(--accent2,#254E91);border-radius:50%;animation:cerspin 0.7s linear infinite;vertical-align:middle;margin-right:8px}',
      '@keyframes cerspin{to{transform:rotate(360deg)}}',
      '.cer-loading{padding:20px 18px;color:var(--text3,#6B6B80);font-size:11.5px;text-align:center;display:flex;align-items:center;justify-content:center;gap:8px}',
      '.cer-loading-attached{padding:36px 18px;background:var(--surface2,#F7F7F9);border:1px dashed var(--rule,#D8D8E0);border-radius:3px;color:var(--text3,#6B6B80);font-size:12px;text-align:center;display:flex;align-items:center;justify-content:center;gap:10px}',
      '.cer-src-chip.chip-loading{background:var(--accent-faint,#EEF2F8);color:var(--accent,#1B3A6B);position:relative;padding-left:20px}',
      '.cer-src-chip.chip-loading::before{content:"";position:absolute;left:6px;top:50%;transform:translateY(-50%);width:9px;height:9px;border:1.5px solid rgba(27,58,107,0.25);border-top-color:var(--accent,#1B3A6B);border-radius:50%;animation:cerspin 0.7s linear infinite}',
      '.cer-actions-strip{background:var(--surface,#fff);border:1px solid var(--border,#D8D8E0);border-radius:3px;padding:12px 16px;margin-top:20px;display:flex;justify-content:space-between;align-items:center;gap:12px}',
      '.cer-btn-primary{font-size:12px;padding:8px 16px;background:var(--ink,#1A1A2E);color:#fff;border:none;border-radius:3px;cursor:pointer;font-weight:500;font-family:var(--font,Helvetica Neue,Arial,sans-serif);display:inline-flex;align-items:center;gap:6px}',
      '.cer-btn-primary:hover{background:var(--ink2,#2D2D44)}',
      '.cer-btn-primary i{font-size:14px}',
      /* B1 · Provenance chips + suppressed toggle */
      '.cer-prov-strip{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}',
      '.cer-prov-chip{display:inline-flex;align-items:center;gap:5px;padding:3px 8px 3px 6px;background:var(--surface2,#F7F7F9);border:1px solid var(--rule,#D8D8E0);border-radius:12px;font-size:10.5px;color:var(--text2,#2D2D44);font-family:var(--mono,Courier New,monospace);text-decoration:none;line-height:1.4}',
      '.cer-prov-chip:hover{background:var(--accent-faint,#EEF2F8);border-color:var(--accent,#1B3A6B);color:var(--accent,#1B3A6B)}',
      '.cer-prov-chip i{font-size:11px;color:var(--accent,#1B3A6B)}',
      '.cer-prov-chip .k{color:var(--text3,#6B6B80);font-size:9px;text-transform:uppercase;letter-spacing:.05em;margin-right:2px}',
      '.cer-prov-chip .v{color:var(--text,#1A1A2E)}',
      '.cer-prov-chip.chip-link{background:#fff;border-color:var(--accent-faint,#EEF2F8)}',
      '.cer-prov-chip.chip-live{background:var(--confirm-faint,#EEF7F2);border-color:#BBF7D0}',
      '.cer-prov-chip.chip-seed{background:var(--caution-faint,#FDF4E3);border-color:#F0E1B1;color:var(--caution,#7A4E00)}',
      '.cer-supp-bar{display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:var(--surface2,#F7F7F9);border:1px dashed var(--rule,#D8D8E0);border-radius:3px;margin-top:6px;font-size:11px;color:var(--text3,#6B6B80)}',
      '.cer-supp-toggle{background:none;border:1px solid var(--rule,#D8D8E0);color:var(--accent,#1B3A6B);font-size:11px;padding:3px 10px;border-radius:12px;cursor:pointer;font-family:var(--font,Helvetica Neue,Arial,sans-serif)}',
      '.cer-supp-toggle:hover{background:var(--accent,#1B3A6B);color:#fff;border-color:var(--accent,#1B3A6B)}',
      '.cer-supp-row{display:grid;grid-template-columns:1fr auto;gap:8px;padding:7px 0;border-bottom:1px dashed var(--rule2,#EBEBF0);align-items:center;opacity:0.7}',
      '.cer-supp-row .cer-item-summary{color:var(--text3,#6B6B80)}',
      '.cer-supp-reason{font-family:var(--mono,Courier New,monospace);font-size:9.5px;color:var(--caution,#7A4E00);background:var(--caution-faint,#FDF4E3);padding:2px 7px;border-radius:8px;text-transform:uppercase;letter-spacing:.04em;white-space:nowrap}',
      /* B1.4 · Catalogue coverage grid */
      '.cer-cat-hdr{display:flex;justify-content:space-between;align-items:baseline;margin:24px 0 8px}',
      '.cer-cat-hdr h4{font-family:var(--font-serif,Georgia,serif);font-size:15px;font-weight:400;margin:0}',
      '.cer-cat-hdr .cer-cat-legend{display:flex;gap:12px;font-size:10.5px;color:var(--text3,#6B6B80)}',
      '.cer-cat-legend span{display:inline-flex;align-items:center;gap:5px}',
      '.cer-cat-swatch{width:10px;height:10px;border-radius:2px;display:inline-block}',
      '.cer-cat-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:6px;margin-bottom:12px}',
      '.cer-cat-row{padding:8px 10px;border-radius:3px;border:1px solid var(--rule2,#EBEBF0);background:var(--surface,#fff);display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;font-size:11px}',
      '.cer-cat-row.st-blocked{background:#FBF0F0;border-color:#F5B7B1;opacity:0.7}',
      '.cer-cat-row.st-planned{background:#EEF2F8;border-color:#C7D8EC}',
      '.cer-cat-row.st-not_cov{background:#FDF4E3;border-color:#F0E1B1;opacity:0.85}',
      '.cer-cat-row.st-live{background:#EEF7F2;border-color:#BBF7D0}',
      '.cer-cat-name{font-weight:500;color:var(--text,#1A1A2E);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.cer-cat-cat{color:var(--text3,#6B6B80);font-size:9.5px;text-transform:uppercase;letter-spacing:.04em;margin-top:1px}',
      '.cer-cat-chip{font-family:var(--mono,Courier New,monospace);font-size:9px;padding:2px 6px;border-radius:8px;font-weight:600;letter-spacing:.05em}',
      '.cer-cat-row .cer-cat-reason{grid-column:1 / -1;font-size:10px;color:var(--text3,#6B6B80);margin-top:2px;line-height:1.35}',
      '.cer-cat-summary{background:var(--surface2,#F7F7F9);border:1px dashed var(--rule,#D8D8E0);padding:10px 14px;border-radius:3px;margin-bottom:12px;font-size:11.5px;color:var(--text2,#2D2D44);line-height:1.5}',
      /* B2A.11 · Audit-trail panel */
      '.cer-audit-hdr{display:flex;justify-content:space-between;align-items:baseline;margin:24px 0 8px}',
      '.cer-audit-hdr h4{font-family:var(--font-serif,Georgia,serif);font-size:15px;font-weight:400;margin:0}',
      '.cer-audit-hdr .cer-audit-status{font-size:10.5px;color:var(--text3,#6B6B80);font-family:var(--mono,Courier New,monospace)}',
      '.cer-audit-status .verified{color:var(--confirm,#1A5C3A);font-weight:600}',
      '.cer-audit-status .broken{color:var(--alert,#8B1A1A);font-weight:600}',
      '.cer-audit-status .checking{color:var(--accent,#1B3A6B)}',
      '.cer-audit-verify{background:var(--surface,#fff);border:1px solid var(--rule,#D8D8E0);color:var(--text2,#2D2D44);font-size:10.5px;padding:4px 12px;border-radius:12px;cursor:pointer;font-family:var(--font,Helvetica Neue,Arial,sans-serif);margin-left:8px}',
      '.cer-audit-verify:hover{background:var(--accent,#1B3A6B);color:#fff;border-color:var(--accent,#1B3A6B)}',
      '.cer-audit-empty{padding:12px 14px;background:var(--surface2,#F7F7F9);border:1px dashed var(--rule,#D8D8E0);border-radius:3px;font-size:11px;color:var(--text3,#6B6B80);font-style:italic}',
      '.cer-audit-list{background:var(--surface,#fff);border:1px solid var(--rule,#D8D8E0);border-radius:3px;overflow:hidden;font-family:var(--mono,Courier New,monospace);font-size:10.5px}',
      '.cer-audit-row{display:grid;grid-template-columns:32px 100px 60px 1fr 90px;gap:10px;padding:7px 12px;border-bottom:1px solid var(--rule2,#EBEBF0);align-items:center}',
      '.cer-audit-row:last-child{border-bottom:none}',
      '.cer-audit-row.attach{background:#F5FBF7}',
      '.cer-audit-row.detach{background:#FDF7F7}',
      '.cer-audit-seq{color:var(--text3,#6B6B80);font-weight:600}',
      '.cer-audit-ts{color:var(--text2,#2D2D44)}',
      '.cer-audit-act{font-weight:600;text-transform:uppercase;font-size:9.5px;letter-spacing:.05em}',
      '.cer-audit-act.attach{color:var(--confirm,#1A5C3A)}',
      '.cer-audit-act.detach{color:var(--alert,#8B1A1A)}',
      '.cer-audit-summary-cell{color:var(--text,#1A1A2E);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-family:var(--font,Helvetica Neue,Arial,sans-serif);font-size:11px}',
      '.cer-audit-hash{color:var(--text3,#6B6B80);font-size:9px}',
      '.cer-audit-hash-verified{color:var(--confirm,#1A5C3A)}',
      '.cer-audit-hash-broken{color:var(--alert,#8B1A1A)}',
      '.cer-audit-genesis{color:var(--text4,#9B9BAA);font-size:9px;padding:4px 12px 0}',
      '.cer-audit-info{padding:8px 14px;background:var(--surface2,#F7F7F9);border-top:1px solid var(--rule2,#EBEBF0);font-family:var(--font,Helvetica Neue,Arial,sans-serif);font-size:10.5px;color:var(--text3,#6B6B80);line-height:1.5}',
    ].join('');
    document.head.appendChild(s);
  }

  function iconFor(kind){
    switch(kind){
      case 'metar': case 'taf': return {icon:'ti ti-cloud-storm', bg:'#EEF2F8', fg:'#254E91'};
      case 'notam':              return {icon:'ti ti-file-text',  bg:'#FDF4E3', fg:'#7A4E00'};
      case 'news':               return {icon:'ti ti-news',       bg:'#EEF7F2', fg:'#1A5C3A'};
      case 'wildfire': case 'gdacs': case 'copernicus': case 'volcano': return {icon:'ti ti-flame', bg:'#FBF0F0', fg:'#8B1A1A'};
      case 'strike':             return {icon:'ti ti-hand-stop',  bg:'#F0EEFC', fg:'#5B4A9F'};
      case 'atfm':               return {icon:'ti ti-traffic-cone',bg:'#E4EEF2', fg:'#1F5C68'};
      case 'track':              return {icon:'ti ti-plane',      bg:'#F3F0FA', fg:'#4338CA'};
      case 'chart':              return {icon:'ti ti-photo',      bg:'#EEF2F8', fg:'#254E91'};
    }
    return {icon:'ti ti-file', bg:'#EFEFF2', fg:'#6B6B80'};
  }

  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }


  /* B1.1 · Endpoint URL for click-through. Points at the latest snapshot on
     the evidence-collection repo so any DIO can inspect the raw feed a chip
     was drawn from. Returns null if we can't resolve. */
  function endpointUrlFor(sourceId, snapshot){
    if (snapshot && snapshot._provenance && snapshot._provenance.url) return snapshot._provenance.url;
    if (!sourceId) return null;
    return 'https://raw.githubusercontent.com/evansharry165-wq/evidence-collection/main/data/latest/' +
           encodeURIComponent(sourceId) + '.json';
  }

  /* B1.1 · Format ISO timestamp for compact display. */
  function fmtTs(iso){
    if (!iso) return '—';
    try {
      var d = new Date(iso);
      return d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'2-digit'}) +
             ' ' + d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',hour12:false}) + 'Z';
    } catch(e){ return String(iso).slice(0,16); }
  }

  /* B1.1 · Is this attachment sourced from a real live feed, or from a seed?
     Snapshot _isSeed marks seeded items so the UI can flag them clearly. */
  function isSeed(a){
    return !!(a && a.snapshot && a.snapshot._isSeed);
  }

  function renderAttached(items, caseRef){
    if (!items.length) return '<div class="cer-empty">No evidence attached to this case yet. Below, each source with a green "hit" chip has case-relevant material you can attach.</div>';
    return '<div class="cer-attached">' + items.map(function(a){
      var ic = iconFor(a.kind);
      var seed = isSeed(a);
      var endpoint = endpointUrlFor(a.sourceId, a.snapshot);
      // Provenance chips — the B1.1 change. Source, timestamp, endpoint click-through.
      var chips = [];
      chips.push('<span class="cer-prov-chip ' + (seed ? 'chip-seed' : 'chip-live') + '" title="Data provenance status">' +
                 '<i class="ti ti-' + (seed ? 'test-pipe' : 'circle-check') + '"></i>' +
                 '<span class="v">' + (seed ? 'SEED DATA' : 'LIVE FEED') + '</span></span>');
      chips.push('<span class="cer-prov-chip" title="Original source">' +
                 '<i class="ti ti-database"></i>' +
                 '<span class="k">src</span><span class="v">' + esc(a.sourceProvider || a.sourceId || '—') + '</span></span>');
      chips.push('<span class="cer-prov-chip" title="Timestamp of retrieval / snapshot">' +
                 '<i class="ti ti-clock"></i>' +
                 '<span class="k">retrieved</span><span class="v">' + esc(fmtTs(a.attachedAt)) + '</span></span>');
      chips.push('<span class="cer-prov-chip" title="Attached by">' +
                 '<i class="ti ti-user"></i>' +
                 '<span class="k">by</span><span class="v">' + esc(a.attachedBy || '—') + '</span></span>');
      if (endpoint){
        chips.push('<a class="cer-prov-chip chip-link" href="' + esc(endpoint) + '" target="_blank" rel="noopener" title="Open the raw endpoint the item was drawn from">' +
                   '<i class="ti ti-external-link"></i>' +
                   '<span class="k">endpoint</span><span class="v">open →</span></a>');
      }
      return '<div class="cer-att">'+
        '<div class="cer-att-icon" style="background:'+ic.bg+';color:'+ic.fg+'"><i class="'+ic.icon+'"></i></div>'+
        '<div class="cer-att-body"><div class="cer-att-summary">'+esc(a.summary)+'</div>'+
        '<div class="cer-prov-strip">' + chips.join('') + '</div>' +
        (a.note ? '<div class="cer-att-meta" style="margin-top:4px"><em>Note: '+esc(a.note)+'</em></div>' : '') +
        '</div>'+
        '<div class="cer-att-actions">'+
          '<button class="cer-att-btn" data-view="'+a.id+'">View</button>'+
          '<button class="cer-att-btn danger" data-remove="'+a.id+'">Remove</button>'+
        '</div>'+
      '</div>';
    }).join('') + '</div>';
  }

  function renderSourcePanel(source, itemsPromise, alreadyAttachedKeys, caseRef){
    var panelId = 'cer-src-' + source.id;
    var html = '<div class="cer-src" id="'+panelId+'">'+
      '<div class="cer-src-hdr"><div><div class="cer-src-name">'+esc(source.id)+'</div><div class="cer-src-provider">'+esc(source.provider)+' · '+esc(source.category)+'</div></div>'+
      '<span class="cer-src-chip chip-loading" data-chip="'+source.id+'">checking</span></div>'+
      '<div class="cer-src-body" data-body="'+source.id+'"><div class="cer-loading"><span class="cer-spinner"></span>Checking source for case-relevant items…</div></div>'+
    '</div>';
    itemsPromise.then(function(items){
      var chip = document.querySelector('[data-chip="'+source.id+'"]');
      var body = document.querySelector('[data-body="'+source.id+'"]');
      if (!chip || !body) return;
      /* B1.5 · Inspect the raw snapshot to show what was filtered out */
      var rawCount = 0;
      try {
        var snap = global.CaseEvidenceRepository._lastSnapshotFor
          ? global.CaseEvidenceRepository._lastSnapshotFor(source.id)
          : null;
        if (snap && global.CaseEvidenceRepository.rawItemCount) {
          rawCount = global.CaseEvidenceRepository.rawItemCount(source.id, snap);
        }
      } catch(e){}
      var suppressed = Math.max(0, rawCount - (items ? items.length : 0));
      if (!items || !items.length){
        chip.className = 'cer-src-chip chip-nohit'; chip.textContent = rawCount ? '0 of ' + rawCount : 'no case-relevant items';
        body.innerHTML = '<div class="cer-item-none">Nothing in the latest snapshot matches this case\'s date / airports / flight.' +
          (suppressed > 0 ? '<br><span style="font-size:10.5px;color:#7A4E00">' + suppressed + ' items in snapshot filtered out by date/airport/flight-number rules.</span>' : '') +
          '</div>';
        return;
      }
      chip.className = 'cer-src-chip chip-hit';
      chip.textContent = items.length + (rawCount ? ' of ' + rawCount : ' hits');
      body.innerHTML = items.slice(0,10).map(function(it){
        var isAttached = alreadyAttachedKeys.indexOf(it._key) >= 0;
        var summary = global.CaseEvidenceRepository.summarise(it);
        return '<div class="cer-item-row">'+
          '<div class="cer-item-summary">'+esc(summary)+'</div>'+
          (isAttached
            ? '<button class="cer-item-btn done" disabled>Attached</button>'
            : '<button class="cer-item-btn" data-attach="'+source.id+'" data-key="'+it._key+'">Attach</button>')+
        '</div>';
      }).join('') + (items.length > 10 ? '<div class="cer-item-none">+' + (items.length - 10) + ' more not shown</div>' : '') + (suppressed > 0 ? '<div class="cer-supp-bar"><span><i class="ti ti-filter"></i> ' + suppressed + ' items filtered out by date/airport rules</span><span style="font-size:10px;color:#9B9BAA">(filter is inspectable in code — refinement pending)</span></div>' : '');
      // Wire attach buttons
      Array.prototype.forEach.call(body.querySelectorAll('[data-attach]'), function(btn){
        btn.onclick = function(){
          var srcId = btn.getAttribute('data-attach');
          var key = btn.getAttribute('data-key');
          var item = items.find(function(x){ return x._key === key; });
          if (!item) return;
          global.CaseEvidenceRepository.attachItem(caseRef, srcId, item, '');
          // Re-render the whole panel to refresh state
          var host = document.getElementById('cer-root');
          if (host) render(caseRef, host);
        };
      });
    });
    return html;
  }

  function render(caseRef, target){
    css();
    var el = typeof target === 'string' ? document.querySelector(target) : target;
    if (!el) return;
    el.id = 'cer-root';
    // Show an initial loading state immediately so user knows the panel is working
    el.innerHTML = '<div class="cer-wrap"><div class="cer-loading-attached"><span class="cer-spinner-lg"></span>Loading Evidence Repository — reading case facts and querying '+ ((global.EvidenceCollection && global.EvidenceCollection.SOURCES) || []).length +' evidence sources…</div></div>';
    // Yield to browser so the loading state paints before we do the heavier synchronous work
    setTimeout(function(){ actualRender(caseRef, el); }, 0);
  }

  function actualRender(caseRef, el){
    var facts = global.CaseEvidenceRepository.getCaseFacts(caseRef);
    if (!facts){ el.innerHTML = '<div class="cer-wrap"><div class="cer-empty">Could not load case facts. Open the case again after case_packet is generated.</div></div>'; return; }
    var attached = global.CaseEvidenceRepository.listAttached(caseRef);
    var attachedKeys = attached.map(function(a){ return a.itemKey; });

    var factsRow = ''+
      '<div class="cer-facts">'+
        (facts.flightNum ? '<div><span class="k">Flight</span><span class="v">'+esc(facts.flightNum)+'</span></div>' : '') +
        (facts.date ? '<div><span class="k">Date</span><span class="v">'+esc(facts.date)+'</span></div>' : '') +
        (facts.originIcao ? '<div><span class="k">Origin</span><span class="v">'+esc(facts.originIcao)+' / '+esc(facts.originIata||'')+'</span></div>' : '') +
        (facts.destIcao ? '<div><span class="k">Dest</span><span class="v">'+esc(facts.destIcao)+' / '+esc(facts.destIata||'')+'</span></div>' : '') +
        (facts.reg ? '<div><span class="k">Reg</span><span class="v">'+esc(facts.reg)+'</span></div>' : '') +
        (facts.carrier ? '<div><span class="k">Carrier</span><span class="v">'+esc(facts.carrier)+'</span></div>' : '') +
      '</div>';

    var sources = (global.EvidenceCollection && global.EvidenceCollection.SOURCES) || [];
    var sourceCards = sources.map(function(s){
      return renderSourcePanel(s, global.CaseEvidenceRepository.fetchRelevantSlice(caseRef, s.id), attachedKeys, caseRef);
    }).join('');

    el.innerHTML =
      '<div class="cer-wrap">'+
        '<div class="cer-hero">'+
          '<div class="cer-hero-info"><h3>Evidence repository</h3><p>Case-specific slice of the DefendAble evidence-collection pipeline. Attach any item to lock it into this case permanently — it survives the 90-day retention window on the raw source.</p></div>'+
          '<div class="cer-hero-stats" style="align-items:center"><a href="evidence-workspace.html?case='+encodeURIComponent(caseRef)+'" class="cer-btn-primary" style="text-decoration:none;margin-right:12px" title="Open full-screen evidence workspace for this case"><i class="ti ti-arrows-maximize"></i>Open workspace</a>'+
            '<div class="cer-hero-stat"><div class="n">'+attached.length+'</div><div class="l">Attached</div></div>'+
            '<div class="cer-hero-stat"><div class="n">'+sources.length+'</div><div class="l">Sources</div></div>'+
            '<div class="cer-hero-stat"><div id="cer-fetch-slot"></div></div>'+
          '</div>'+
        '</div>'+
        factsRow +
        '<div class="cer-sec-hdr"><h4>Attached to this case</h4><span class="hint">Permanent — stored in case_packet, survives raw-snapshot rotation.</span></div>'+
        renderAttached(attached, caseRef) +
        (_isDIOActor()
          ? ('<div class="cer-sec-hdr"><h4>Available from evidence-collection</h4><span class="hint">Auto-filtered to this case. Green chip = hits.</span></div>' +
             '<div class="cer-sources">' + sourceCards + '</div>' +
             renderCatalogueSection() +
             renderAuditTrailSection(caseRef))
          : _renderStoredVsNeeded(caseRef)) +
        '<div class="cer-actions-strip">'+
          '<div style="font-size:11.5px;color:var(--text3,#6B6B80)">Bundle contents export for LOR pack / disclosure.</div>'+
          '<button class="cer-btn-primary" id="cer-export"><i class="ti ti-download"></i>Export bundle JSON</button>'+
        '</div>'+
      '</div>';

    // Wire attached-item action buttons
    Array.prototype.forEach.call(el.querySelectorAll('[data-remove]'), function(btn){
      btn.onclick = function(){
        var id = btn.getAttribute('data-remove');
        if (!confirm('Remove this evidence from the case?')) return;
        global.CaseEvidenceRepository.removeAttached(caseRef, id);
        render(caseRef, el);
      };
    });
    // Mount the Fetch fresh evidence button
    var fetchSlot = document.getElementById('cer-fetch-slot');
    if (fetchSlot && global.CaseEvidenceFetchUI){
      global.CaseEvidenceFetchUI.mountButton(fetchSlot, caseRef, function(){
        // On fetch complete, re-render the whole panel to pick up new targeted data
        render(caseRef, el);
      });
    }
    var exportBtn = document.getElementById('cer-export');
    if (exportBtn){
      exportBtn.onclick = function(){
        var bundle = global.CaseEvidenceRepository.exportBundle(caseRef);
        var blob = new Blob([JSON.stringify(bundle, null, 2)], {type:'application/json'});
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a'); a.href = url; a.download = caseRef + '-evidence-bundle.json'; a.click();
        setTimeout(function(){ URL.revokeObjectURL(url); }, 500);
      };
    }
  }



  /* R2.A · Actor role helper — lawyers see a simpler case-repo view. */
  function _isDIOActor(){
    try {
      var uid = (global.getActiveUser && global.getActiveUser()) || 'SB';
      var u = (typeof global.USERS !== 'undefined') ? global.USERS[uid] : null;
      return !!(u && u.team === 'dio');
    } catch(e){ return false; }
  }

  /* R2.A · Compute a stored-vs-needed summary from the case's evidence points. */
  function _renderStoredVsNeeded(caseRef){
    if (!global.CaseFiling || !global.CaseFiling.getCase) return '';
    var c = global.CaseFiling.getCase(caseRef);
    if (!c || !Array.isArray(c.points) || !c.points.length) return '';
    var green = c.points.filter(function(p){ return (p.evidenceStatus||'red') === 'green'; }).length;
    var amber = c.points.filter(function(p){ return p.evidenceStatus === 'amber'; }).length;
    var red   = c.points.filter(function(p){ return (p.evidenceStatus||'red') === 'red'; }).length;
    var total = c.points.length;
    return '<div class="cer-sec-hdr"><h4>Case evidence · stored vs needed</h4>' +
           '<span class="hint">' + green + ' of ' + total + ' evidence points fully held</span></div>' +
           '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:16px">' +
           '<div style="background:var(--confirm-faint,#EEF7F2);border:1px solid #BBF7D0;padding:12px 14px;border-radius:3px">' +
             '<div style="font-family:var(--font-serif);font-size:22px;color:var(--confirm,#1A5C3A);font-weight:500">' + green + '</div>' +
             '<div style="font-size:10px;color:var(--confirm,#1A5C3A);text-transform:uppercase;letter-spacing:.05em;font-weight:600">Held on file</div>' +
           '</div>' +
           '<div style="background:var(--caution-faint,#FDF4E3);border:1px solid #F0E1B1;padding:12px 14px;border-radius:3px">' +
             '<div style="font-family:var(--font-serif);font-size:22px;color:var(--caution,#7A4E00);font-weight:500">' + amber + '</div>' +
             '<div style="font-size:10px;color:var(--caution,#7A4E00);text-transform:uppercase;letter-spacing:.05em;font-weight:600">Partial / in flight</div>' +
           '</div>' +
           '<div style="background:var(--alert-faint,#FBF0F0);border:1px solid #F5B7B1;padding:12px 14px;border-radius:3px">' +
             '<div style="font-family:var(--font-serif);font-size:22px;color:var(--alert,#8B1A1A);font-weight:500">' + red + '</div>' +
             '<div style="font-size:10px;color:var(--alert,#8B1A1A);text-transform:uppercase;letter-spacing:.05em;font-weight:600">Outstanding</div>' +
           '</div>' +
           '</div>';
  }

  /* B1.4 · Render the full 40-source catalogue as a coverage view.
     Every source appears with a status chip, so the reader shows the whole map
     — not just what's populated. This is the "show the gaps, don't hide them"
     principle from the DefendAble evidence-layer spec (Section 4.4). */
  function renderCatalogueSection(){
    var counts = { LIVE:0, PLANNED:0, NOT_COV:0, BLOCKED:0 };
    EVIDENCE_CATALOGUE.forEach(function(s){ counts[s.status]++; });
    var total = EVIDENCE_CATALOGUE.length;
    var summary = 'Coverage of the ' + total + '-source DIO evidence catalogue: ' +
                  '<strong style="color:#1A5C3A">' + counts.LIVE + ' LIVE</strong> · ' +
                  '<strong style="color:#1B3A6B">' + counts.PLANNED + ' PLANNED</strong> · ' +
                  '<strong style="color:#7A4E00">' + counts.NOT_COV + ' not covered</strong> · ' +
                  '<strong style="color:#8B1A1A">' + counts.BLOCKED + ' airline-internal (blocked)</strong>. ' +
                  '<em>Blocked sources need customer-side integration or DIO narrative capture. All publicly available sources are LIVE or PLANNED.</em>';
    var rows = EVIDENCE_CATALOGUE.map(function(s){
      var style = STATUS_STYLES[s.status] || {};
      var chipStyle = 'background:' + style.bg + ';color:' + style.fg + ';';
      return '<div class="cer-cat-row st-' + s.status.toLowerCase() + '">' +
             '<div>' +
               '<div class="cer-cat-name">' + esc(s.label) + '</div>' +
               '<div class="cer-cat-cat">' + esc(s.category) + '</div>' +
             '</div>' +
             '<span class="cer-cat-chip" style="' + chipStyle + '">' + esc(style.label) + '</span>' +
             (s.reason ? '<div class="cer-cat-reason">' + esc(s.reason) + '</div>' : '') +
             '</div>';
    }).join('');
    return '<div class="cer-cat-hdr"><h4>Full evidence catalogue · coverage view</h4>' +
           '<div class="cer-cat-legend">' +
             '<span><span class="cer-cat-swatch" style="background:#1A5C3A"></span>LIVE</span>' +
             '<span><span class="cer-cat-swatch" style="background:#1B3A6B"></span>PLANNED</span>' +
             '<span><span class="cer-cat-swatch" style="background:#7A4E00"></span>NOT COVERED</span>' +
             '<span><span class="cer-cat-swatch" style="background:#8B1A1A"></span>BLOCKED</span>' +
           '</div></div>' +
           '<div class="cer-cat-summary">' + summary + '</div>' +
           '<div class="cer-cat-grid">' + rows + '</div>';
  }



  /* B2A.11 · Render the hash-chained compliance audit trail for the case. */
  function renderAuditTrailSection(caseRef){
    if (!global.CaseAuditTrail) return '';
    var chain = global.CaseAuditTrail.list(caseRef) || [];
    var body;
    if (!chain.length){
      body = '<div class="cer-audit-empty">No audit-trail entries yet. Each attach or detach will be recorded here with a SHA-256 hash chained to the previous entry — tamper-evident.</div>';
    } else {
      var rows = chain.map(function(e){
        var ts = '';
        try {
          var d = new Date(e.ts);
          ts = d.toLocaleDateString('en-GB',{day:'2-digit',month:'short'}) + ' ' + d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',hour12:false});
        } catch(_){ ts = String(e.ts||'').slice(0,16); }
        return '<div class="cer-audit-row ' + esc(e.action) + '">' +
          '<span class="cer-audit-seq">#' + e.seq + '</span>' +
          '<span class="cer-audit-ts">' + esc(ts) + '</span>' +
          '<span class="cer-audit-act ' + esc(e.action) + '">' + esc(e.action) + '</span>' +
          '<span class="cer-audit-summary-cell" title="' + esc(e.summary || '') + '">' + esc(e.summary || e.itemKey || '(no summary)') + '</span>' +
          '<span class="cer-audit-hash" data-hash-cell="' + e.seq + '" title="' + esc(e.hash) + '">' + esc((e.hash||'').slice(0,8)) + '…</span>' +
          '</div>';
      }).join('');
      body = '<div class="cer-audit-list">' +
        '<div class="cer-audit-genesis">genesis: ' + esc(global.CaseAuditTrail.genesisHash().slice(0,16)) + '…</div>' +
        rows +
        '<div class="cer-audit-info">The chain is stored on the case (meta.evidenceAuditTrail[]). Every entry is a SHA-256 of its own payload + the previous entry\'s hash — mutation of any past entry breaks all subsequent hashes. Click <strong>Verify chain</strong> to recompute.</div>' +
        '</div>';
    }
    return '<div class="cer-audit-hdr"><h4>Compliance audit trail</h4>' +
             '<span class="cer-audit-status"><span data-audit-status>chain length: ' + chain.length + '</span>' +
             (chain.length ? '<button class="cer-audit-verify" onclick="CaseEvidenceRepoUI.verifyAudit(\'' + esc(caseRef) + '\')">Verify chain</button>' : '') +
             (chain.length ? '<button class="cer-audit-verify" onclick="CaseEvidenceRepoUI.downloadAudit(\'' + esc(caseRef) + '\')" title="Download the full hash-chained log as JSON — suitable for ADR / court disclosure"><i class="ti ti-download" style="margin-right:2px"></i>Download</button>' : '') +
             '</span></div>' +
             body;
  }

  /* Called from Verify button */
  function verifyAudit(caseRef){
    if (!global.CaseAuditTrail || !global.CaseAuditTrail.verify) return;
    var statusEl = document.querySelector('[data-audit-status]');
    if (statusEl) statusEl.innerHTML = '<span class="checking">verifying…</span>';
    global.CaseAuditTrail.verify(caseRef).then(function(res){
      if (!statusEl) return;
      if (res.ok){
        statusEl.innerHTML = '<span class="verified">✓ ' + res.entries + ' entries verified · chain intact</span>';
        document.querySelectorAll('[data-hash-cell]').forEach(function(el){ el.classList.add('cer-audit-hash-verified'); });
      } else {
        statusEl.innerHTML = '<span class="broken">✗ ' + res.breaks.length + ' break(s) at seq ' + res.breaks.map(function(b){return b.seq;}).join(', ') + '</span>';
        res.breaks.forEach(function(b){
          var el = document.querySelector('[data-hash-cell="' + b.seq + '"]');
          if (el) el.classList.add('cer-audit-hash-broken');
        });
      }
    });
  }



  /* P4 · Download the audit chain as a signed JSON file.  Contains the whole
     hash-chain plus a manifest header (case ref, export ts, chain length, last
     hash) so a downstream verifier can prove no post-export mutation. */
  function downloadAudit(caseRef){
    if (!global.CaseAuditTrail || !global.CaseAuditTrail.list) return;
    var chain = global.CaseAuditTrail.list(caseRef) || [];
    var last = chain.length ? chain[chain.length - 1].hash : global.CaseAuditTrail.genesisHash();
    var bundle = {
      manifest: {
        caseRef:      caseRef,
        exportedAt:   new Date().toISOString(),
        exportedBy:   (global.getActiveUser && global.getActiveUser()) || 'unknown',
        entries:      chain.length,
        lastHash:     last,
        genesisHash:  global.CaseAuditTrail.genesisHash(),
        format:       'DefendAble/audit-trail/v1',
        note:         'SHA-256 hash-chained log of evidence attach/detach events. Each entry hashes the previous entry\'s hash + its own payload. Mutation of any past entry breaks all subsequent hashes.',
      },
      chain: chain,
    };
    try {
      var blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = caseRef + '-audit-trail-' + new Date().toISOString().slice(0,10) + '.json';
      document.body.appendChild(a);
      a.click();
      setTimeout(function(){ URL.revokeObjectURL(url); document.body.removeChild(a); }, 500);
    } catch (e) { if (global.console) console.error('audit download failed:', e); }
  }

  global.CaseEvidenceRepoUI = { render: render, verifyAudit: verifyAudit, downloadAudit: downloadAudit };
})(typeof window !== 'undefined' ? window : this);
