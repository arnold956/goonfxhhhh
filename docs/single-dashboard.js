/* GOON FX single-dashboard layer: preserves the existing OAuth/session code in app.js. */
(function(){
  function ready(){
    if(!location.pathname.endsWith('/dashboard.html')&&!location.pathname.endsWith('/manual-trader.html')) return;
    document.querySelectorAll('a[href="markets.html"],a[href="manual-trader.html"],a[href="over-under.html"],a[href="even-odd.html"],a[href="digits.html"],a[href="bulk-trader.html"],a[href="bots.html"],a[href="analysis.html"],a[href="portfolio.html"],a[href="reports.html"]').forEach(function(a){
      var href=a.getAttribute('href')||'';
      if(!href.startsWith('#')) a.setAttribute('href','dashboard.html'+(href.includes('?')?'?'+href.split('?')[1]:'#trader'));
    });
    document.querySelectorAll('[data-balance]').forEach(function(el){
      if(el.textContent.trim()==='') el.textContent='—';
    });
  }
  document.addEventListener('DOMContentLoaded',ready);
})();
