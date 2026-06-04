
/* ── Global nav JS ── */
(function(){
  var NAV_LINKS = [
    {key:'dashboard', icon:'ti-layout-dashboard', href:'index.html'},
    {key:'intake',    icon:'ti-file-upload',       href:'module1-intake.html'},
    {key:'cases',     icon:'ti-layout-kanban',     href:'module2-case-management.html'},
    {key:'cpr',       icon:'ti-calendar-due',      href:'module3-cpr.html'},
    {key:'evidence',  icon:'ti-folder-open',       href:'module4-evidence.html'},
    {key:'drafting',  icon:'ti-file-pencil',       href:'module5-drafting.html'},
    {key:'mi',        icon:'ti-chart-bar',         href:'module6-mi.html'},
    {key:'knowledge', icon:'ti-school',            href:'education.html'},
  ];

  var TEAMS = [
    { label:'UK Litigation',   labelFr:'Équipe Royaume-Uni', labelEs:'Equipo Reino Unido', users:['SB','JP','KR'] },
    { label:'Équipe France',   labelFr:'Équipe France',      labelEs:'Equipo Francia',     users:['MD','PL'] },
    { label:'Equipo España',   labelFr:'Équipe Espagne',     labelEs:'Equipo España',      users:['CG','IM'] },
  ];

  var ACTIVE_PAGE = (function(){
    var p = window.location.pathname.split('/').pop() || 'index.html';
    if(p==='index.html'||p==='') return 'dashboard';
    if(p.indexOf('module1')>=0) return 'intake';
    if(p.indexOf('module2-case-management')>=0) return 'cases';
    if(p.indexOf('module2-case-workspace')>=0) return 'cases';
    if(p.indexOf('module3-cpr.html')>=0) return 'cpr';
    if(p.indexOf('module3-cpr-workspace')>=0) return 'cpr';
    if(p.indexOf('module4-evidence.html')>=0) return 'evidence';
    if(p.indexOf('module4-evidence-workspace')>=0) return 'evidence';
    if(p.indexOf('module5-drafting.html')>=0) return 'drafting';
    if(p.indexOf('module5-drafting-workspace')>=0) return 'drafting';
    if(p.indexOf('module6')>=0) return 'mi';
    if(p.indexOf('education')>=0) return 'knowledge';
    return 'dashboard';
  })();

  function renderNav(){
    if(typeof t !== 'function') return;
    var uid = typeof getActiveUser==='function' ? getActiveUser() : 'SB';
    var u   = typeof USERS!=='undefined' ? USERS[uid] : null;
    var lang = typeof getUILang==='function' ? getUILang() : 'en';

    // Update avatar
    var avEl = document.getElementById('gn-av');
    var unEl = document.getElementById('gn-username');
    if(avEl && u) avEl.textContent = u.initials;
    if(unEl && u) unEl.textContent = u.name;

    // Render nav links
    var linksEl = document.getElementById('gn-links');
    if(linksEl){
      // Count badges
      var cases = typeof getCasesForUser==='function' ? getCasesForUser(uid) : [];
      var intakeN  = cases.filter(function(c){return c.stage==='intake';}).length;
      var urgentN  = cases.filter(function(c){return c.cprDaysLeft<=7&&c.stage!=='resolve';}).length;

      linksEl.innerHTML = NAV_LINKS.map(function(l){
        var label = t(l.key) || l.key;
        var isActive = ACTIVE_PAGE === l.key;
        var badge = l.key==='intake'&&intakeN>0
          ? '<span class="gn-badge">'+intakeN+'</span>'
          : l.key==='cpr'&&urgentN>0
          ? '<span class="gn-badge">'+urgentN+'</span>'
          : '';
        return '<a href="'+l.href+'" class="gn-link'+(isActive?' active':'')+'">'
          +'<i class="ti '+l.icon+'"></i> '+label+badge+'</a>';
      }).join('');
    }

    // Render dropdown
    var dd = document.getElementById('user-dropdown');
    if(!dd) return;
    var html = '';
    TEAMS.forEach(function(team){
      var teamLabel = lang==='fr' ? team.labelFr : lang==='es' ? team.labelEs : team.label;
      html += '<div class="ud-section">'+teamLabel+'</div>';
      team.users.forEach(function(tid){
        if(!USERS[tid]) return;
        var tu = USERS[tid];
        var isActive = tid===uid;
        var avCls = tu.lang==='fr' ? ' fr' : tu.lang==='es' ? ' es' : '';
        html += '<div class="ud-item'+(isActive?' active':'')+' ud-clickable" data-uid="'+tid+'">';
          +'<div class="gn-av'+avCls+'">'+tu.initials+'</div>'
          +'<div><div class="ud-name">'+tu.full+'</div>'
          +'<div class="ud-role">'+tu.role+'</div></div>'
          +(isActive?'<i class="ti ti-check ud-tick"></i>':'')
          +'</div>';
      });
    });
    html += '<div class="ud-lang"><div class="ud-lang-label">'+(lang==='fr'?'Langue interface':lang==='es'?'Idioma interfaz':'Interface language')+'</div>'
      +'<div class="ud-lang-btns">'
      +'<button class="ud-lang-btn'+(lang==="en"?" active":"")+' ud-lang" data-lang="en">🇬🇧 EN</button>'
      +'<button class="ud-lang-btn'+(lang==="fr"?" active":"")+' ud-lang" data-lang="fr">🇫🇷 FR</button>'
      +'<button class="ud-lang-btn'+(lang==="es"?" active":"")+' ud-lang" data-lang="es">🇪🇸 ES</button>'
      +'</div></div>';
    dd.innerHTML = html;
  }

  function toggleUserDropdown(){
    var dd = document.getElementById('user-dropdown');
    if(dd) dd.classList.toggle('open');
  }

  document.addEventListener('click', function(e){
    var langBtn = e.target.closest('.ud-lang');
    if(langBtn && langBtn.dataset.lang){
      window.setLang(langBtn.dataset.lang);
      return;
    }
    var clickable = e.target.closest('.ud-clickable');
    if(clickable && clickable.dataset.uid){
      window.switchUser(clickable.dataset.uid);
      return;
    }
    var btn = document.getElementById('gn-user-btn');
    if(btn && !btn.contains(e.target)){
      var dd = document.getElementById('user-dropdown');
      if(dd) dd.classList.remove('open');
    }
  });

  window.switchUser = function(id){
    if(typeof setActiveUser==='function') setActiveUser(id);
    // Language follows user unless manually overridden
    sessionStorage.removeItem('261c_lang'); // clear override so user lang takes effect
    renderNav();
    if(typeof renderPage==='function') renderPage();
    if(typeof render==='function') render();
  };

  window.setLang = function(lang){
    if(typeof setUILang==='function') setUILang(lang);
    renderNav();
    if(typeof renderPage==='function') renderPage();
    if(typeof render==='function') render();
  };

  window.renderNav = renderNav;

  // Init on DOMContentLoaded
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', renderNav);
  } else {
    renderNav();
  }
  // Re-render after short delay to ensure shared_data is loaded
  setTimeout(renderNav, 100);
})();
