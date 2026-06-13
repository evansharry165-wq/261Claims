
/* ── Global nav JS ── */
(function(){
  var NAV_LINKS = [
    {key:'work',       icon:'ti-layout-dashboard', href:'index.html'},
    {key:'cases',      icon:'ti-briefcase',        href:'cases.html'},
    {key:'repository', icon:'ti-database',         href:'repository.html'},
    {key:'insights',   icon:'ti-chart-dots',       href:'insights.html'},
  ];

  var TEAMS = [
    { label:'UK Litigation',   labelFr:'Équipe Royaume-Uni', labelEs:'Equipo Reino Unido', users:['SB','JP','KR'] },
    { label:'Équipe France',   labelFr:'Équipe France',      labelEs:'Equipo Francia',     users:['MD','PL'] },
    { label:'Equipo España',   labelFr:'Équipe Espagne',     labelEs:'Equipo España',      users:['CG','IM'] },
    { label:'Evidence team',    labelFr:'Équipe preuves',      labelEs:'Equipo pruebas',     users:['EH'] },
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
    if(p.indexOf('repository')>=0) return 'repository';
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

      linksEl.innerHTML = NAV_LINKS.map(function(l){
        var label = t(l.key) || l.key;
        var isActive = ACTIVE_PAGE === l.key;
        return '<a href="'+l.href+'" class="gn-link'+(isActive?' active':'')+'">'
          +'<i class="ti '+l.icon+'"></i> '+label+'</a>';
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
        html += '<div class="ud-item'+(isActive?' active':'')+' ud-clickable" data-uid="'+tid+'">'
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
    sessionStorage.removeItem('dfa_lang'); // clear override so user lang takes effect
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
