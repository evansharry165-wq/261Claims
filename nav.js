
/* ── Global nav JS ── */
(function(){
  var NAV_LINKS = [
    {key:'work',       icon:'ti-layout-dashboard', href:'index.html'},
    {key:'cases',      icon:'ti-briefcase',        href:'cases.html'},
    {key:'evidence',   icon:'ti-file-search',      href:'evidence.html'},
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
    if(p==='evidence.html' || p.indexOf('evidence-')===0) return 'evidence';
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

  /* Session A fix 4 · this component had two gaps that combined into
     "stuck open on load": (1) no CSS anywhere defined a default-hidden /
     .open-visible state for #user-dropdown, so it rendered visible the
     moment renderNav() populated it, on every page load, class or no class;
     (2) toggleUserDropdown() above was never wired to a click on
     #gn-user-btn, so there was no functioning way to open it either. The
     outside-click close handler further down already worked correctly at
     the JS level (toggling the class off) — it just had no CSS to react to.
     dio.html doesn't have this bug because it uses a different component
     (#user-modal wrapping .user-dropdown, styled in that page's own inline
     <style>) — this fix brings the evidence-*.html family's bare
     #user-dropdown pattern up to the same working standard, in the one
     shared file responsible for it, rather than patching 8 HTML files. */
  function injectDropdownCss(){
    if (document.getElementById('nav-dropdown-css')) return;
    var s = document.createElement('style');
    s.id = 'nav-dropdown-css';
    s.textContent =
      '.gn-right{position:relative}'+
      '.user-dropdown{display:none;position:absolute;top:36px;right:0;background:var(--surface,#fff);border:1px solid var(--border,#D8D8E0);border-radius:6px;width:230px;box-shadow:0 4px 20px rgba(0,0,0,0.15);overflow:hidden;max-height:calc(100vh - 70px);overflow-y:auto;z-index:1000}'+
      '.user-dropdown.open{display:block}'+
      '.ud-section{padding:8px 14px 4px;font-size:9.5px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--text3,#6B6B80)}'+
      '.ud-item{display:flex;align-items:center;gap:10px;padding:9px 14px;cursor:pointer}'+
      '.ud-item:hover,.ud-item.active{background:var(--accent-faint,#EEF2F8)}'+
      '.ud-name{font-size:12px;font-weight:500;color:var(--text,#1A1A2E)}'+
      '.ud-role{font-size:10px;color:var(--text3,#6B6B80)}'+
      '.ud-tick{margin-left:auto;color:var(--confirm,#1A5C3A);font-size:14px}'+
      '.ud-lang{padding:10px 14px;border-top:1px solid var(--border,#D8D8E0)}'+
      '.ud-lang-label{font-size:9.5px;color:var(--text3,#6B6B80);margin-bottom:6px}'+
      '.ud-lang-btns{display:flex;gap:6px}'+
      '.ud-lang-btn{font-size:11px;padding:4px 8px;border:1px solid var(--border,#D8D8E0);border-radius:4px;background:var(--surface,#fff);cursor:pointer}'+
      '.ud-lang-btn.active{background:var(--ink,#1A1A2E);color:#fff;border-color:var(--ink,#1A1A2E)}';
    document.head.appendChild(s);
  }
  injectDropdownCss();

  document.addEventListener('click', function(e){
    var toggleBtn = e.target.closest('#gn-user-btn');
    if(toggleBtn){ toggleUserDropdown(); return; }
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
