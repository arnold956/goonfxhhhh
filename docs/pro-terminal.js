(() => {
  'use strict';
  const boot = () => {
    if (!document.body || document.body.dataset.gxProTerminal) return;
    document.body.dataset.gxProTerminal = '1';
    const css = document.createElement('style');
    css.id = 'gx-pro-terminal-style';
    css.textContent = `
      :root{--gx-bg:#05080b;--gx-panel:#0a1015;--gx-panel2:#0d151b;--gx-line:#1d2830;--gx-text:#e8eef2;--gx-muted:#71808a;--gx-green:#19d39a;--gx-red:#ff4d61;--gx-blue:#5aa7ff}
      body{background:var(--gx-bg)!important;color:var(--gx-text)!important;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important}
      body:before{content:"";position:fixed;inset:0;pointer-events:none;background:radial-gradient(circle at 45% -20%,#15372c26,transparent 38%),linear-gradient(#fff001 0 0) 0 0/0 0 no-repeat;z-index:-1}
      .top{height:58px!important;background:#070b0feF!important;border-bottom:1px solid #1c2730!important;box-shadow:0 8px 28px #0006!important}
      .brand{font-size:19px!important;letter-spacing:-.5px}.brand small{font-size:6px!important;letter-spacing:2.4px!important}
      .page{max-width:1680px!important;padding:10px!important}
      .hero{margin:0 0 9px!important;height:42px}.hero h1{font-size:18px!important;letter-spacing:-.3px}.hero p{display:none!important}
      .layout{grid-template-columns:190px minmax(0,1fr) 292px!important;gap:8px!important}
      .panel{border-radius:7px!important;background:linear-gradient(180deg,#0b1218,#080d12)!important;border-color:#1d2830!important;box-shadow:0 10px 30px #0003}
      .head{padding:9px 11px!important;font-size:10px!important;text-transform:uppercase;letter-spacing:.4px}.body{padding:9px!important}
      .side-title{padding:9px 10px 6px!important;font-size:7px!important;letter-spacing:1.4px!important;color:#50606a!important}
      .sidebar button{padding:9px 10px!important;font-size:10px!important;border-bottom:1px solid #121c23!important}.sidebar button.active{border-left:2px solid var(--gx-green);background:#10211c!important;color:#fff!important}
      .markets{gap:5px!important;margin-bottom:8px!important}.market{min-width:118px!important;padding:8px!important;border-radius:6px!important}.market strong{font-size:9px!important}.market small{font-size:7px!important}.market .mprice{font-size:10px!important}
      .chart{height:405px!important;border-radius:6px!important;background:repeating-linear-gradient(0deg,transparent 0 50px,#111a20 51px),repeating-linear-gradient(90deg,transparent 0 99px,#111a20 100px)!important}
      .types{gap:4px!important;margin:7px 0!important}.type{padding:8px 4px!important;border-radius:6px!important;font-size:8px!important}.subtypes{margin-bottom:7px!important}.subtypes button{padding:6px 9px!important;font-size:8px!important;border-radius:5px!important}
      .digits{gap:3px!important;margin-bottom:7px!important}.digit{padding:6px 1px!important;border-radius:5px!important}.digit b{font-size:13px!important}.digit small{font-size:7px!important}
      .fields{gap:5px!important}.field label{font-size:7px!important}.input,.field select,.field input{height:34px!important;font-size:10px!important;border-radius:5px!important}
      .ticket-actions{gap:5px!important;margin-top:6px!important}.btn{padding:8px 11px!important;border-radius:6px!important;font-size:9px!important}.quote{gap:5px!important;margin-top:6px!important}.quote div,.stat{padding:7px!important;border-radius:5px!important}.status{margin-top:6px!important;padding:7px!important;border-radius:5px!important;font-size:8px!important}
      .right{display:flex;flex-direction:column}.right>.panel:first-child{order:0}.right>.panel:nth-child(2){order:1}.right>.panel:nth-child(3){order:2}
      .tools{grid-template-columns:repeat(2,1fr);display:grid!important}.tool{padding:9px!important;border-radius:6px!important}.tool strong{font-size:9px!important}.tool span{font-size:7px!important}
      .risk{font-size:7px!important;padding:5px 7px!important;opacity:.8}
      .gx-terminal-strip{display:flex;align-items:center;gap:7px;overflow:auto;padding:6px 8px;margin-bottom:8px;background:#080d12;border:1px solid #1d2830;border-radius:6px}.gx-terminal-strip span{white-space:nowrap;font-size:8px;color:#74838d}.gx-terminal-strip b{color:#dfe7eb}.gx-terminal-strip .ok{color:var(--gx-green)}
      .gx-execution-hot{box-shadow:0 0 0 1px #19d39a33,0 0 24px #19d39a0d!important}
      @media(max-width:1100px){.layout{grid-template-columns:175px minmax(0,1fr)!important}.right{grid-column:1/-1;display:grid!important;grid-template-columns:repeat(3,1fr);gap:8px}.right>.panel{margin-top:0!important}.chart{height:340px!important}}
      @media(max-width:720px){.top{height:52px!important}.hero{height:auto}.layout{display:block!important}.sidebar{margin-bottom:7px}.sidebar button{display:inline-block!important;width:auto!important;margin:2px!important;border:1px solid #1d2830!important;border-radius:5px!important}.right{display:block!important}.right>.panel{margin-top:7px!important}.chart{height:280px!important}.types{grid-template-columns:repeat(3,1fr)!important}.fields{grid-template-columns:1fr 1fr!important}.tools{grid-template-columns:1fr!important}.risk{display:none}}
    `;
    document.head.appendChild(css);
    const main = document.querySelector('.page');
    if (main && !document.querySelector('.gx-terminal-strip')) {
      const strip = document.createElement('div');
      strip.className = 'gx-terminal-strip';
      strip.innerHTML = '<span>MARKET <b id="gxStripMarket">R_100</b></span><span>PRICE <b id="gxStripPrice">—</b></span><span>DIGIT <b id="gxStripDigit">—</b></span><span>TICKS <b id="gxStripTicks">0</b></span><span class="ok">● DERIV LIVE</span><span class="ok">● AUTHENTICATED</span>';
      const hero = main.querySelector('.hero');
      if (hero) hero.after(strip); else main.prepend(strip);
    }
    const sync = () => {
      const market = document.querySelector('#marketName')?.textContent || window.__gxSymbol || 'R_100';
      const price = document.querySelector('#marketPrice')?.textContent || '—';
      const digit = document.querySelector('#last')?.textContent || '—';
      const ticks = document.querySelector('#tickCount')?.textContent || '0';
      const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v};
      set('gxStripMarket',market);set('gxStripPrice',price);set('gxStripDigit',digit);set('gxStripTicks',ticks);
    };
    setInterval(sync,500);sync();
    document.querySelectorAll('[data-section]').forEach(btn=>btn.addEventListener('click',()=>{
      document.querySelectorAll('[data-section]').forEach(x=>x.classList.remove('active'));btn.classList.add('active');
      const s=btn.dataset.section;
      if (typeof window.gxWorkspace === 'function') window.gxWorkspace(s);
      else if (typeof window.workspace === 'function') window.workspace(s);
    }));
    const buy1=document.getElementById('primaryBuy'),buy2=document.getElementById('secondaryBuy');
    [buy1,buy2].forEach(b=>{if(b)b.classList.add('gx-execution-hot')});
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
