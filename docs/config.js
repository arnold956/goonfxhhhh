window.GOONFX_CONFIG = Object.freeze({
  DERIV_CLIENT_ID: '34b2ctEChXoL5t579q8pB',
  DERIV_SCOPE: 'trade',
  DERIV_REDIRECT_URI: 'https://goonfx.com/callback.html',
  BACKEND_URL: 'https://api.goonfx.com'
});
(function(){
  'use strict';
  var path=(location.pathname.split('/').pop()||'index.html').toLowerCase();
  var isEntry=path===''||path==='index.html';
  var isCallback=path==='callback.html';
  var key='goonfx_authenticated';
  if(isCallback)return;
  if(!sessionStorage.getItem(key)){
    document.documentElement.classList.add('goonfx-auth-pending');
    var css=document.createElement('style');css.textContent='html.goonfx-auth-pending body{visibility:hidden!important}';document.head.appendChild(css);
    if(!isEntry){location.replace('index.html');return;}
    document.addEventListener('DOMContentLoaded',function(){
      document.documentElement.classList.remove('goonfx-auth-pending');
      var login=function(){if(typeof window.goonfxLogin==='function')window.goonfxLogin();};
      var button=document.getElementById('home-deriv-login');
      if(button)button.onclick=login;
      setTimeout(login,250);
    });
  }else if(isEntry){location.replace('dashboard.html');}
})();
