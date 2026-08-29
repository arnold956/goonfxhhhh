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
  css.textContent='html.goonfx-auth-pending body{visibility:hidden!important}#gx-auth-loading{position:fixed;inset:0;z-index:100000;display:grid;place-items:center;background:#05070b;color:#fff;font:600 14px system-ui}#gx-auth-loading .box{padding:28px 32px;border:1px solid #28313d;border-radius:14px;background:#0b1017;text-align:center;box-shadow:0 20px 70px #0009}#gx-auth-loading b{display:block;font-size:20px;margin-bottom:8px}#gx-auth-loading span{color:#8a96a4;font-size:12px}';
  document.head.appendChild(css);
  if(!isCallback){
    document.documentElement.classList.add('goonfx-auth-pending');
    var gate=document.createElement('div');gate.id='gx-auth-loading';gate.innerHTML='<div class="box"><b>GOON FX</b><span>Checking your Deriv login…</span></div>';
    if(document.body)document.body.appendChild(gate);else document.addEventListener('DOMContentLoaded',function(){document.body.appendChild(gate)});
    fetch((window.GOONFX_CONFIG.BACKEND_URL||'')+'/api/account',{credentials:'include'})
      .then(function(r){
        if(r.ok)return r.json();
        throw new Error('unauthorized');
      })
      .then(function(){
        if(isEntry){location.replace('dashboard.html');return;}
        document.documentElement.classList.remove('goonfx-auth-pending');gate.remove();
      })
      .catch(function(){
        if(isEntry){
          document.documentElement.classList.remove('goonfx-auth-pending');gate.remove();
        }else{
          location.replace('index.html');
        }
      });
  }
  function enhance(){
    if(!document.body)return;
    document.documentElement.classList.add('goonfx-premium');
    document.querySelectorAll('.panel,.market,.ct,.trade-btn').forEach(function(el){el.style.transition='transform .16s ease,box-shadow .16s ease,border-color .16s ease';});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',enhance);else enhance();
})();
