/* ════════════════════════════════════════════════════════════════
   261Claims — Global Navigation Component v3.0
   Include this AFTER shared_data.js on every page.
   Call: renderGlobalNav('active-module-id')
   Modules: dashboard, intake, cases, cpr, evidence, drafting, mi
════════════════════════════════════════════════════════════════ */
function renderGlobalNav(activeModule){
  var u = USERS[STATE.getActiveUser()] || USERS.SB;
  var navLinks = [
    {id:'dashboard', href:'index.html',                     icon:'ti-layout-dashboard', label:'Dashboard'},
    {id:'intake',    href:'module1-intake.html',            icon:'ti-file-upload',      label:'Intake'},
    {id:'cases',     href:'module2-case-management.html',   icon:'ti-layout-kanban',    label:'Cases'},
    {id:'cpr',       href:'module3-cpr.html',               icon:'ti-calendar-due',     label:'CPR'},
    {id:'evidence',  href:'module4-evidence.html',          icon:'ti-folder-open',      label:'Evidence'},
    {id:'drafting',  href:'module5-drafting.html',          icon:'ti-file-pencil',      label:'Drafting'},
    {id:'mi',        href:'module6-mi.html',                icon:'ti-chart-bar',        label:'MI'},
    {id:'repository',href:'repository.html',                icon:'ti-database',         label:'Repository'},
  ];
  var linksHtml = navLinks.map(function(l){
    var active = l.id === activeModule ? ' active' : '';
    return '<a href="'+l.href+'" class="gn-link'+active+'"><i class="ti '+l.icon+'"></i> '+l.label+'</a>';
  }).join('');

  var html = '<nav class="global-nav" id="global-nav">'
    +'<a href="index.html" class="gn-logo">'
    +'<div class="gn-mark"><i class="ti ti-plane"></i></div>'
    +'<span class="gn-name">261Claims</span>'
    +'</a>'
    +'<div class="gn-links">'+linksHtml+'</div>'
    +'<div class="gn-right">'
    +'<div class="gn-user-btn" id="gn-user-btn" onclick="toggleGlobalUserMenu()">'
    +'<div class="gn-av" id="gn-av" style="background:'+u.colour+'">'+u.initials+'</div>'
    +'<span class="gn-user" id="gn-user">'+u.name+'</span>'
    +'<i class="ti ti-chevron-down" style="font-size:10px;color:rgba(255,255,255,0.4);margin-left:2px"></i>'
    +'</div>'
    +'</div>'
    +'</nav>'
    +'<div class="gn-user-dropdown" id="gn-dropdown">'
    +'<div class="gn-ud-head">Switch user — demo</div>'
    +Object.values(USERS).map(function(usr){
      var active = usr.id === STATE.getActiveUser() ? ' gn-ud-active' : '';
      return '<div class="gn-ud-item'+active+'" onclick="switchGlobalUser(\''+usr.id+'\')">'
        +'<div class="gn-ud-av" style="background:'+usr.colour+'">'+usr.initials+'</div>'
        +'<div><div class="gn-ud-name">'+usr.full+'</div><div class="gn-ud-role">'+usr.role+'</div></div>'
        +(usr.id===STATE.getActiveUser()?'<i class="ti ti-check" style="margin-left:auto;color:var(--blue)"></i>':'')
        +'</div>';
    }).join('')
    +'<div class="gn-ud-item gn-ud-reset" onclick="if(confirm(\'Reset all case data to defaults?\'))STATE.reset()">'
    +'<i class="ti ti-refresh" style="font-size:13px;color:var(--text3)"></i>'
    +'<div style="font-size:11px;color:var(--text3)">Reset demo data</div>'
    +'</div>'
    +'</div>';

  /* Inject nav CSS if not already present */
  if(!document.getElementById('gn-styles')){
    var style = document.createElement('style');
    style.id = 'gn-styles';
    style.textContent = `
.global-nav{background:#0B1628;height:48px;display:flex;align-items:center;padding:0 20px;gap:0;position:sticky;top:0;z-index:200;border-bottom:1px solid rgba(255,255,255,0.06);flex-shrink:0}
.gn-logo{display:flex;align-items:center;gap:8px;text-decoration:none;margin-right:20px;flex-shrink:0}
.gn-mark{width:28px;height:28px;background:#2A6FDB;border-radius:6px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:13px}
.gn-name{font-size:14px;font-weight:500;color:#fff;letter-spacing:-0.02em}
.gn-links{display:flex;align-items:center;gap:2px;flex:1;overflow:hidden}
.gn-link{display:flex;align-items:center;gap:5px;padding:5px 10px;border-radius:6px;font-size:12px;font-weight:450;color:rgba(255,255,255,0.5);text-decoration:none;white-space:nowrap;transition:all 0.15s;flex-shrink:0}
.gn-link:hover{background:rgba(255,255,255,0.08);color:#fff}
.gn-link.active{background:rgba(42,111,219,0.3);color:#fff}
.gn-link i{font-size:12px}
.gn-right{display:flex;align-items:center;gap:8px;margin-left:8px;flex-shrink:0}
.gn-user-btn{display:flex;align-items:center;gap:6px;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.12);border-radius:20px;padding:3px 10px 3px 4px;cursor:pointer;transition:all 0.15s}
.gn-user-btn:hover{background:rgba(255,255,255,0.12)}
.gn-av{width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:500;color:#fff}
.gn-user{font-size:11px;font-weight:500;color:rgba(255,255,255,0.8)}
.gn-user-dropdown{display:none;position:fixed;top:52px;right:14px;background:#fff;border:1px solid #E2E8F0;border-radius:14px;box-shadow:0 8px 32px rgba(0,0,0,0.14);width:240px;overflow:hidden;z-index:500}
.gn-user-dropdown.open{display:block}
.gn-ud-head{font-size:9px;font-weight:500;text-transform:uppercase;letter-spacing:0.03em;color:#94A3B8;padding:10px 14px 6px;border-bottom:1px solid #F1F5F9}
.gn-ud-item{display:flex;align-items:center;gap:10px;padding:10px 14px;cursor:pointer;transition:background 0.1s}
.gn-ud-item:hover{background:#F8FAFC}
.gn-ud-active{background:#EFF6FF}
.gn-ud-av{width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:500;color:#fff;flex-shrink:0}
.gn-ud-name{font-size:12px;font-weight:500;color:#0F172A}
.gn-ud-role{font-size:10px;color:#94A3B8}
.gn-ud-reset{border-top:1px solid #F1F5F9;gap:8px}
    `;
    document.head.appendChild(style);
  }

  /* Find or create nav container */
  var existing = document.getElementById('global-nav-wrap');
  if(!existing){
    existing = document.createElement('div');
    existing.id = 'global-nav-wrap';
    document.body.insertBefore(existing, document.body.firstChild);
  }
  existing.innerHTML = html;
}

function toggleGlobalUserMenu(){
  var dd = document.getElementById('gn-dropdown');
  if(dd) dd.classList.toggle('open');
}

function switchGlobalUser(id){
  STATE.setActiveUser(id);
  document.getElementById('gn-dropdown').classList.remove('open');
  /* Update avatar + name in nav */
  var u = USERS[id];
  var av = document.getElementById('gn-av');
  var nm = document.getElementById('gn-user');
  if(av){ av.textContent=u.initials; av.style.background=u.colour; }
  if(nm) nm.textContent = u.name;
  /* Trigger page re-render if available */
  if(typeof render === 'function') render();
  if(typeof renderPage === 'function') renderPage();
  if(typeof init === 'function') init();
}

/* Close dropdown on outside click */
document.addEventListener('click', function(e){
  var dd = document.getElementById('gn-dropdown');
  var btn = document.getElementById('gn-user-btn');
  if(dd && btn && !btn.contains(e.target) && !dd.contains(e.target)){
    dd.classList.remove('open');
  }
});
