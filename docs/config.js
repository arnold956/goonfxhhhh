window.GOONFX_CONFIG = Object.freeze({
  DERIV_CLIENT_ID: '34b2ctEChXoL5t579q8pB',
  DERIV_SCOPE: 'trade',
  DERIV_REDIRECT_URI: 'https://goonfx.com/callback.html',
  BACKEND_URL: 'https://api.goonfx.com'
});

(function(){
  'use strict';
  var cfg=window.GOONFX_CONFIG;
  var path=(location.pathname.split('/').pop()||'index.html').toLowerCase();
  var isEntry=path===''||path==='index.html'||location.pathname==='/';
  var isCallback=path==='callback.html';
  var AUTH_KEY='goonfx_authenticated';
  var originalFetch=window.fetch.bind(window), cache=new Map();
  window.fetch=function(input,init){
    var url=typeof input==='string'?input:(input&&input.url)||'';
    var method=((init&&init.method)||'GET').toUpperCase();
    var clean=url.split('?')[0];
    var isAccount=method==='GET'&&(clean===cfg.BACKEND_URL+'/api/account'||clean===cfg.BACKEND_URL+'/api/accounts');
    if(!isAccount)return originalFetch(input,init);
    var hit=cache.get(clean);
    if(hit&&Date.now()-hit.time<5000)return Promise.resolve(new Response(hit.body,{status:hit.status,statusText:hit.statusText,headers:hit.headers}));
    return originalFetch(input,init).then(function(r){
      if(!r.ok)return r;
      return r.clone().text().then(function(body){cache.set(clean,{time:Date.now(),body:body,status:r.status,statusText:r.statusText,headers:r.headers});return new Response(body,{status:r.status,statusText:r.statusText,headers:r.headers});});
    });
  };
  window.goonfxInvalidateAuthCache=function(){cache.clear()};
  var css=document.createElement('style');
  css.textContent='html.goonfx-auth-pending body{visibility:hidden!important}#gx-auth-loading{position:fixed;inset:0;z-index:100000;display:grid;place-items:center;background:#05070b;color:#fff;font:600 14px system-ui}#gx-auth-loading .box{width:min(440px,calc(100vw - 32px));padding:36px 30px;border:1px solid #28313d;border-radius:16px;background:linear-gradient(145deg,#0c1118,#080c11);text-align:center;box-shadow:0 24px 80px #000b}#gx-auth-loading .logo{font:900 30px system-ui;letter-spacing:-1px;margin-bottom:8px}#gx-auth-loading .logo span{color:#806aff}#gx-auth-loading h1{font-size:22px;margin:0 0 9px}#gx-auth-loading p{color:#8995a4;font-size:12px;line-height:1.6;margin:0 auto 22px;max-width:340px}#gx-auth-loading button{width:100%;height:46px;border:0;border-radius:8px;background:linear-gradient(135deg,#806aff,#5439dc);color:#fff;font-weight:900;cursor:pointer;font-size:13px}#gx-auth-loading .secure{margin-top:13px;color:#5f6c7a;font-size:10px}';
  document.head.appendChild(css);
  function login(){if(typeof window.goonfxLogin==='function')window.goonfxLogin();else setTimeout(login,80)}
  function mount(){if(!document.body||document.getElementById('gx-auth-loading'))return;var gate=document.createElement('div');gate.id='gx-auth-loading';gate.innerHTML='<div class="box"><div class="logo">GOON <span>FX</span></div><h1>Login to continue</h1><p>Secure Deriv authorization is required before your trading workspace is shown.</p><button type="button" id="gx-login-now">LOGIN WITH DERIV</button><div class="secure">Secure authorization through Deriv · Demo &amp; Real accounts</div></div>';document.body.appendChild(gate);gate.querySelector('#gx-login-now').onclick=login}
  if(!isCallback){
    document.documentElement.classList.add('goonfx-auth-pending');
    if(!sessionStorage.getItem(AUTH_KEY)){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){mount();setTimeout(login,120)});else{mount();setTimeout(login,120)}}else document.documentElement.classList.remove('goonfx-auth-pending');
    if(!isEntry&&!sessionStorage.getItem(AUTH_KEY)){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){location.replace('index.html')});else location.replace('index.html')}
  }
})();
