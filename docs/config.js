window.GOONFX_CONFIG = Object.freeze({
  DERIV_CLIENT_ID: '34b2ctEChXoL5t579q8pB',
  DERIV_SCOPE: 'trade',
  DERIV_REDIRECT_URI: 'https://goonfx.com/callback.html',
  BACKEND_URL: 'https://api.goonfx.com'
});

(function(){
  function enhance(){
    if(!document.body)return;
    document.documentElement.classList.add('goonfx-premium');
    document.querySelectorAll('.panel,.market,.ct,.trade-btn').forEach(function(el){el.style.transition='transform .16s ease,box-shadow .16s ease,border-color .16s ease';});
  }
  var css=document.createElement('style');
  css.textContent='html.goonfx-premium{scroll-behavior:smooth}html.goonfx-premium body{letter-spacing:-.01em}html.goonfx-premium .panel{box-shadow:0 12px 34px rgba(0,0,0,.16)}html.goonfx-premium .market:hover,html.goonfx-premium .ct:hover,html.goonfx-premium .trade-btn:hover:not(:disabled){transform:translateY(-1px)}html.goonfx-premium [data-balance]{font-variant-numeric:tabular-nums}';
  document.head.appendChild(css);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',enhance);else enhance();
})();
