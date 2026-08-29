window.GOONFX_CONFIG = Object.freeze({
  DERIV_CLIENT_ID: '34b2ctEChXoL5t579q8pB',
  DERIV_SCOPE: 'trade',
  DERIV_REDIRECT_URI: 'https://goonfx.com/callback.html',
  BACKEND_URL: 'https://api.goonfx.com'
});

/* Premium GOON FX presentation layer. Authentication configuration above is unchanged. */
(function(){
  function enhance(){
    if(!document.body) return;
    document.documentElement.classList.add('goonfx-premium');
    var path=location.pathname.split('/').pop()||'index.html';
    if(path==='dashboard.html'||path==='manual-trader.html'){
      var nav=document.querySelector('.mainnav,.navlinks');
      if(nav){
        nav.setAttribute('aria-label','Trading navigation');
        document.querySelectorAll('a[href="markets.html"],a[href="manual-trader.html"],a[href="over-under.html"],a[href="even-odd.html"],a[href="digits.html"],a[href="bulk-trader.html"],a[href="bots.html"],a[href="analysis.html"],a[href="portfolio.html"],a[href="reports.html"]').forEach(function(a){
          if(!a.getAttribute('href').startsWith('#')) a.setAttribute('href','dashboard.html#trader');
        });
      }
      var title=document.querySelector('.heading h1');
      if(title) title.innerHTML='Trade <span style="color:#ff3040">smarter</span>.<br>Stay in control.';
      var sub=document.querySelector('.heading p');
      if(sub) sub.textContent='Live Deriv markets, real account balance and direct contract execution — all from one professional workspace.';
      var contracts=document.querySelector('.contracts');
      if(contracts){
        contracts.setAttribute('aria-label','Contract types');
        contracts.querySelectorAll('.contract').forEach(function(b){b.title='Select '+b.textContent.replace(/DIGIT CONTRACT/gi,'').trim()+' contract';});
      }
      var status=document.getElementById('status');
      if(status && !status.dataset.goonfxPremium){
        status.dataset.goonfxPremium='1';
        status.setAttribute('role','status');
      }
    }
  }
  var css=document.createElement('style');
  css.textContent='html.goonfx-premium{scroll-behavior:smooth}html.goonfx-premium body{letter-spacing:-.01em}html.goonfx-premium .panel,html.goonfx-premium .card{box-shadow:0 12px 34px rgba(0,0,0,.16)}html.goonfx-premium .contract{transition:transform .16s ease,box-shadow .16s ease,border-color .16s ease}html.goonfx-premium .contract:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(255,48,64,.12)}html.goonfx-premium .buy{transition:transform .16s ease,filter .16s ease,box-shadow .16s ease}html.goonfx-premium .buy:hover:not(:disabled){transform:translateY(-1px);filter:brightness(1.06);box-shadow:0 9px 25px rgba(22,211,154,.18)}html.goonfx-premium [data-balance]{font-variant-numeric:tabular-nums;letter-spacing:.01em}html.goonfx-premium .accountbar{box-shadow:0 4px 18px rgba(0,0,0,.12)}@media(max-width:650px){html.goonfx-premium .heading{align-items:flex-start;flex-direction:column}html.goonfx-premium .heading h1{line-height:1.02}html.goonfx-premium .accountbar{position:sticky;top:64px}html.goonfx-premium .contract{min-height:62px;font-size:13px}}';
  document.head.appendChild(css);
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',enhance); else enhance();
})();
