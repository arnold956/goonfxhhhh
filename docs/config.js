window.GOONFX_CONFIG = Object.freeze({
  DERIV_CLIENT_ID: '34b2ctEChXoL5t579q8pB',
  DERIV_SCOPE: 'trade',
  DERIV_REDIRECT_URI: 'https://goonfx.com/callback.html',
  BACKEND_URL: 'https://api.goonfx.com'
});

(function(){
  var path=(location.pathname.split('/').pop()||'index.html').toLowerCase();
  var isEntry=path===''||path==='index.html'||location.pathname==='/';
  var isCallback=path==='callback.html';
  var css=document.createElement('style');
  css.textContent='html.goonfx-auth-pending body{visibility:hidden!important}#gx-auth-loading{position:fixed;inset:0;z-index:100000;display:grid;place-items:center;background:#05070b;color:#fff;font:600 14px system-ui}#gx-auth-loading .box{width:min(440px,calc(100vw - 32px));padding:36px 30px;border:1px solid #28313d;border-radius:16px;background:linear-gradient(145deg,#0c1118,#080c11);text-align:center;box-shadow:0 24px 80px #000b}#gx-auth-loading .logo{font:900 30px system-ui;letter-spacing:-1px;margin-bottom:8px}#gx-auth-loading .logo span{color:#806aff}#gx-auth-loading h1{font-size:22px;margin:0 0 9px}#gx-auth-loading p{color:#8995a4;font-size:12px;line-height:1.6;margin:0 auto 22px;max-width:340px}#gx-auth-loading button{width:100%;height:46px;border:0;border-radius:8px;background:linear-gradient(135deg,#806aff,#5439dc);color:#fff;font-weight:900;cursor:pointer;font-size:13px}#gx-auth-loading .secure{margin-top:13px;color:#5f6c7a;font-size:10px}';
  document.head.appendChild(css);
  if(!isCallback){
    document.documentElement.classList.add('goonfx-auth-pending');
    var gate=document.createElement('div');gate.id='gx-auth-loading';gate.innerHTML='<div class="box"><div class="logo">GOON <span>FX</span></div><h1>Login to continue</h1><p>Connect your Deriv account first. Your trading dashboard, markets, bots and account information will be available after authentication.</p><button type="button" onclick="window.goonfxLogin&&window.goonfxLogin()">LOGIN WITH DERIV</button><div class="secure">Secure authorization through Deriv · Demo & Real accounts</div></div>';
    function mount(){if(!document.getElementById('gx-auth-loading'))document.body.appendChild(gate)}
    if(document.body)mount();else document.addEventListener('DOMContentLoaded',mount);
    fetch((window.GOONFX_CONFIG.BACKEND_URL||'')+'/api/account',{credentials:'include'})
      .then(function(r){if(r.ok)return r.json();throw new Error('unauthorized')})
      .then(function(){location.replace('dashboard.html')})
      .catch(function(){
        if(isEntry){document.documentElement.classList.remove('goonfx-auth-pending');mount()}
        else location.replace('index.html');
      });
  }
  function enhance(){
    if(!document.body)return;
    document.documentElement.classList.add('goonfx-premium');
    document.querySelectorAll('.panel,.market,.ct,.trade-btn').forEach(function(el){el.style.transition='transform .16s ease,box-shadow .16s ease,border-color .16s ease';});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',enhance);else enhance();
})();
