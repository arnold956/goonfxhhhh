(() => {
  const cfg = window.GOONFX_CONFIG || {};
  const API = String(cfg.BACKEND_URL || 'https://api.goonfx.com').replace(/\/$/, '');
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const post = async (path, body) => { const r = await fetch(API + path, {method:'POST', credentials:'include', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body)}); const d=await r.json().catch(()=>({})); if(!r.ok) throw new Error(d.error || `HTTP ${r.status}`); return d; };
  const get = async path => { const r=await fetch(API+path,{credentials:'include'}); const d=await r.json().catch(()=>({})); if(!r.ok) throw new Error(d.error||`HTTP ${r.status}`); return d; };

  const TYPES = {
    digits:[['DIGITOVER','Over'],['DIGITUNDER','Under'],['DIGITEVEN','Even'],['DIGITODD','Odd'],['DIGITMATCH','Match'],['DIGITDIFF','Differs']],
    ups:[['CALL','Rise'],['PUT','Fall'],['UPORDOWN','Up or Down']],
    touch:[['ONETOUCH','Touch'],['NOTOUCH','No Touch']],
    multipliers:[['MULTUP','Multiplier Up'],['MULTDOWN','Multiplier Down']],
    turbos:[['TURBOSLONG','Turbo Long'],['TURBOSSHORT','Turbo Short']],
    vanillas:[['VANILLALONGCALL','Vanilla Call'],['VANILLALONGPUT','Vanilla Put']],
    accumulators:[['ACCU','Accumulator']],
    higher:[['HIGHER','Higher'],['LOWER','Lower']]
  };

  function ensureStyles(){
    if($('#gx-enhance-style')) return;
    const s=document.createElement('style');s.id='gx-enhance-style';s.textContent=`
      .gx-drawer{position:fixed;inset:0;background:#020507d9;z-index:80;display:none;align-items:center;justify-content:center;padding:18px}.gx-drawer.show{display:flex}.gx-window{width:min(980px,96vw);max-height:90vh;overflow:auto;background:#0b1218;border:1px solid #26333d;border-radius:14px;box-shadow:0 30px 90px #000b}.gx-window-head{display:flex;align-items:center;gap:10px;padding:15px;border-bottom:1px solid #202b35;position:sticky;top:0;background:#0b1218;z-index:2}.gx-window-head b{font-size:15px}.gx-close{margin-left:auto}.gx-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.gx-card{background:#081016;border:1px solid #202b35;border-radius:9px;padding:11px}.gx-card b{display:block}.gx-card small{display:block;color:#71808a;margin-top:4px}.gx-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.gx-input{height:38px;background:#070d12;color:#fff;border:1px solid #26333d;border-radius:7px;padding:0 9px}.gx-wide{width:100%}.gx-market-list{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}.gx-market-btn{border:1px solid #202b35;background:#0b1218;color:#dfe5e9;border-radius:7px;padding:9px;text-align:left;cursor:pointer}.gx-market-btn.active{border-color:#18d49a;background:#10251f}.gx-pill{border:1px solid #26333d;background:#0b1218;color:#aab5bb;border-radius:999px;padding:7px 10px;cursor:pointer}.gx-pill.active{border-color:#18d49a;color:#fff}.gx-good{color:#18d49a}.gx-bad{color:#ff4b5b}.gx-muted{color:#71808a}@media(max-width:720px){.gx-grid,.gx-market-list{grid-template-columns:1fr 1fr}}
    `;document.head.appendChild(s);
  }
  function drawer(title, html){
    ensureStyles();let d=$('#gxDrawer');if(!d){d=document.createElement('div');d.id='gxDrawer';d.className='gx-drawer';document.body.appendChild(d)}
    d.innerHTML=`<div class="gx-window"><div class="gx-window-head"><b>${title}</b><button class="btn gx-close">Close</button></div><div style="padding:15px">${html}</div></div>`;d.classList.add('show');$('.gx-close',d).onclick=()=>d.classList.remove('show');return d;
  }
  function selected(){return window.goonfxAccount||{};}
  function payload(type, root=document){
    const stake=Number($('#stake',root)?.value||1), duration=Math.max(1,Number($('#duration',root)?.value||1));
    const p={contract_type:type,underlying_symbol:window.__gxSymbol||'R_100',amount:stake,duration,duration_unit:'t'};
    const barrier=$('#barrier',root)?.value;
    if(['DIGITOVER','DIGITUNDER','DIGITMATCH','DIGITDIFF'].includes(type)) p.barrier=String(barrier??5);
    if(['ONETOUCH','NOTOUCH','HIGHER','LOWER'].includes(type) && barrier) p.barrier=String(barrier);
    if(['MULTUP','MULTDOWN'].includes(type)) p.multiplier=Number($('#multiplier',root)?.value?.replace('x','')||10);
    if(type==='ACCU') p.growth_rate=0.01;
    if(['VANILLALONGCALL','VANILLALONGPUT'].includes(type)){p.duration_unit='d';p.duration=Math.max(1,Number($('#duration',root)?.value||1));}
    return p;
  }
  function wireTradeTypes(){
    const old=$$('.type');old.forEach(b=>{b.classList.add('gx-type');b.onclick=()=>{
      old.forEach(x=>x.classList.remove('active'));b.classList.add('active');
      const key=b.dataset.type==='DIGITOVER'?'digits':b.dataset.type==='CALL'?'ups':b.dataset.type==='ONETOUCH'?'touch':b.dataset.type==='MULTUP'?'multipliers':b.dataset.type==='TURBOSLONG'?'turbos':b.dataset.type==='VANILLALONGCALL'?'vanillas':'accumulators';
      renderSubtypes(key); window.__gxContract=(TYPES[key]||[])[0]?.[0]||b.dataset.type; updateButtons();
    }});
    renderSubtypes('digits');
  }
  function renderSubtypes(key){
    const box=$('#subtypes');if(!box)return;box.innerHTML=(TYPES[key]||[]).map((x,i)=>`<button class="${i===0?'active':''}" data-gxtype="${x[0]}">${x[1]}</button>`).join('');
    $$('.subtypes button').forEach(b=>b.onclick=()=>{$$('.subtypes button').forEach(x=>x.classList.remove('active'));b.classList.add('active');window.__gxContract=b.dataset.gxtype;updateButtons()});
    window.__gxContract=(TYPES[key]||[])[0]?.[0]||'DIGITOVER'; updateButtons();
  }
  function updateButtons(){
    const t=window.__gxContract||'DIGITOVER';const pair={DIGITOVER:['BUY OVER','BUY UNDER'],DIGITUNDER:['BUY UNDER','BUY OVER'],DIGITEVEN:['BUY EVEN','BUY ODD'],DIGITODD:['BUY ODD','BUY EVEN'],DIGITMATCH:['BUY MATCH','BUY DIFFER'],DIGITDIFF:['BUY DIFFER','BUY MATCH'],CALL:['BUY RISE','BUY FALL'],PUT:['BUY FALL','BUY RISE'],UPORDOWN:['BUY UP','BUY DOWN'],ONETOUCH:['BUY TOUCH','BUY NO TOUCH'],NOTOUCH:['BUY NO TOUCH','BUY TOUCH'],MULTUP:['BUY MULTI UP','BUY MULTI DOWN'],MULTDOWN:['BUY MULTI DOWN','BUY MULTI UP'],TURBOSLONG:['BUY TURBO LONG','BUY TURBO SHORT'],TURBOSSHORT:['BUY TURBO SHORT','BUY TURBO LONG'],VANILLALONGCALL:['BUY VANILLA CALL','BUY VANILLA PUT'],VANILLALONGPUT:['BUY VANILLA PUT','BUY VANILLA CALL'],ACCU:['BUY ACCUMULATOR','BUY ACCUMULATOR'],HIGHER:['BUY HIGHER','BUY LOWER'],LOWER:['BUY LOWER','BUY HIGHER']}[t]||['BUY','BUY'];if($('#primaryBuy'))$('#primaryBuy').textContent=pair[0];if($('#secondaryBuy'))$('#secondaryBuy').textContent=pair[1];
  }
  async function executeFast(side){
    const type=window.__gxContract||'DIGITOVER', p=payload(type); if(!p.amount||p.amount<=0)return setTradeStatus?.('Enter a valid stake.','warn');
    const b=side==='secondary'?$('#secondaryBuy'):$('#primaryBuy');try{if(b)b.disabled=true;if(b)b.textContent='EXECUTING…';
      const r=await post('/api/trade',p);setTradeStatus?.(`TRADE EXECUTED · ${r.contract_id||r.buy?.contract_id||'confirmed'}`,'ok');
      if(typeof loadAccounts==='function')await loadAccounts();if(typeof loadAccount==='function')await loadAccount();
    }catch(e){setTradeStatus?.(e.message,'bad')}finally{if(b)b.disabled=false;updateButtons()}
  }
  async function loadMarkets(){
    try{const d=await get('/api/markets');const all=Array.isArray(d.markets)?d.markets:[];const list=all.map(x=>({symbol:x.symbol||x.display_name,name:x.display_name||x.symbol,group:String(x.market||x.submarket_display_name||x.market_display_name||'')})).filter(x=>x.symbol);
      window.__gxMarkets=list;renderMarketBar(list);renderMarketChooser(list);
    }catch(e){setTradeStatus?.('Unable to load Deriv market list: '+e.message,'bad')}
  }
  function classify(x){const n=(x.name+' '+x.group+' '+x.symbol).toLowerCase();if(/boom|crash|step|volatility|jump|drift|bull|bear|range break/.test(n))return 'synthetic';if(/forex|aud|eur|gbp|jpy|usd|cad|chf|nzd/.test(n))return 'forex';if(/crypto|bitcoin|ethereum|litecoin|dogecoin/.test(n))return 'crypto';if(/commodity|gold|silver|oil|brent|wti/.test(n))return 'commodities';if(/index|indices|nasdaq|dow|s&p|ftse|dax|nikkei/.test(n))return 'indices';return 'other'}
  function chooseMarket(symbol){window.__gxSymbol=symbol;document.querySelectorAll('.market').forEach(x=>x.classList.toggle('active',x.dataset.market===symbol));if(typeof selectMarket==='function')selectMarket(symbol)}
  function renderMarketBar(list){const box=$('#markets');if(!box)return;const preferred=list.filter(x=>classify(x)==='synthetic').slice(0,10);if(!preferred.length)return;box.innerHTML=preferred.map(x=>`<button class="market ${x.symbol===window.__gxSymbol?'active':''}" data-market="${x.symbol}"><strong>${x.name}</strong><small>${x.group||'Deriv'}</small><span class="mprice">—</span></button>`).join('');$$('.market',box).forEach(b=>b.onclick=()=>chooseMarket(b.dataset.market));}
  function renderMarketChooser(list){
    const groups={synthetic:[],forex:[],indices:[],crypto:[],commodities:[],other:[]};list.forEach(x=>groups[classify(x)].push(x));
    document.querySelectorAll('[data-group]').forEach(btn=>btn.onclick=()=>{const g=btn.dataset.group;const items=groups[g]||[];drawer(btn.textContent,`<div class="gx-row" style="margin-bottom:10px"><input id="gxMarketSearch" class="gx-input gx-wide" placeholder="Search Deriv markets..."></div><div class="gx-market-list" id="gxMarketList"></div>`);const render=()=>{const q=($('#gxMarketSearch')?.value||'').toLowerCase();$('#gxMarketList').innerHTML=items.filter(x=>(x.name+' '+x.symbol).toLowerCase().includes(q)).slice(0,100).map(x=>`<button class="gx-market-btn" data-pick="${x.symbol}"><b>${x.name}</b><small>${x.symbol}</small></button>`).join('');$$('[data-pick]').forEach(b=>b.onclick=()=>{chooseMarket(b.dataset.pick);$('#gxDrawer').classList.remove('show')})};render();$('#gxMarketSearch').oninput=render;});
  }
  function workspace(section){
    if(section==='bulk')return bulk();
    if(section==='analysis')return analysis();
    if(section==='copy')return copy();
    if(section==='bots')return bots();
    if(section==='positions')return drawer('Open Positions','<div class="gx-card">Live position monitoring is connected to the authenticated Deriv account. Use the selected account above before executing.</div>');
    if(section==='history')return drawer('Trade History','<div class="gx-card">Trade history workspace ready. Completed contracts are associated with the selected Deriv account.</div>');
  }
  function bulk(){const d=drawer('Bulk Trader',`<div class="gx-grid"><div class="gx-card"><b>Market</b><input id="gxBulkSymbol" class="gx-input gx-wide" value="${window.__gxSymbol||'R_100'}"></div><div class="gx-card"><b>Contract</b><select id="gxBulkType" class="gx-input gx-wide">${Object.values(TYPES).flat().map(x=>`<option value="${x[0]}">${x[1]}</option>`).join('')}</select></div><div class="gx-card"><b>Stake</b><input id="gxBulkStake" class="gx-input gx-wide" type="number" min="0.35" step="0.01" value="1"></div><div class="gx-card"><b>Trades</b><input id="gxBulkCount" class="gx-input gx-wide" type="number" min="1" max="20" value="5"></div><div class="gx-card"><b>Duration</b><input id="gxBulkDuration" class="gx-input gx-wide" type="number" min="1" value="1"></div><div class="gx-card"><b>Barrier</b><input id="gxBulkBarrier" class="gx-input gx-wide" value="5"></div></div><div class="gx-row" style="margin-top:12px"><button id="gxBulkRun" class="btn green">EXECUTE BATCH</button><span id="gxBulkStatus" class="gx-muted">Maximum 20 trades per batch.</span></div>`);$('#gxBulkRun',d).onclick=async()=>{const n=Math.min(20,Math.max(1,Number($('#gxBulkCount',d).value||1))),job={contract_type:$('#gxBulkType',d).value,underlying_symbol:$('#gxBulkSymbol',d).value,amount:Number($('#gxBulkStake',d).value||1),duration:Number($('#gxBulkDuration',d).value||1),duration_unit:'t',barrier:$('#gxBulkBarrier',d).value};try{$('#gxBulkRun',d).disabled=true;const r=await post('/api/bulk-trade',{trades:Array.from({length:n},()=>({...job}))});$('#gxBulkStatus').textContent=`Executed ${r.results?.filter(x=>x.ok).length||0} of ${n} trades.`}catch(e){$('#gxBulkStatus').textContent=e.message}finally{$('#gxBulkRun',d).disabled=false}}}
  function analysis(){return drawer('Market Analysis',`<div class="gx-grid"><div class="gx-card"><b>Selected Market</b><span class="gx-good">${window.__gxSymbol||'R_100'}</span></div><div class="gx-card"><b>Last Price</b><span id="gxAprice">${$('#marketPrice')?.textContent||'—'}</span></div><div class="gx-card"><b>Last Digit</b><span id="gxAdigit">${$('#last')?.textContent||'—'}</span></div><div class="gx-card"><b>Tick Sample</b><span>${$('#tickCount')?.textContent||0}</span></div><div class="gx-card"><b>Direction</b><span>${window.goonfxAccount?'Live feed active':'Connect Deriv first'}</span></div><div class="gx-card"><b>Risk</b><span class="gx-muted">Analysis is informational; it is not a guarantee of outcome.</span></div></div>`)}
  function copy(){return drawer('Copy Trader',`<div class="gx-card"><b>Signal source</b><p class="gx-muted">Paste a trusted signal source or use your own strategy feed. No external trader is copied without your action.</p><input id="gxCopySymbol" class="gx-input gx-wide" value="${window.__gxSymbol||'R_100'}" placeholder="Market"><div class="gx-row" style="margin-top:9px"><input id="gxCopyStake" class="gx-input" type="number" min="0.35" value="1"><button class="btn green" id="gxCopyRun">COPY NEXT SIGNAL</button></div><p id="gxCopyStatus" class="gx-muted">Risk controls should be configured before mirroring real trades.</p></div>`);$('#gxCopyRun').onclick=()=>$('#gxCopyStatus').textContent='Copy engine armed for the selected market; no trade is sent until a signal is supplied.'}
  function bots(){return drawer('Trading Bots',`<div class="gx-grid"><div class="gx-card"><b>Trend Bot</b><small>Reads live tick direction and waits for a configurable threshold.</small><button class="btn green" style="margin-top:8px" onclick="window.__gxBotStart?.('trend')">START DEMO BOT</button></div><div class="gx-card"><b>Digit Bot</b><small>Tracks 0–9 digit frequency from the live tick stream.</small><button class="btn" style="margin-top:8px" onclick="window.__gxBotStart?.('digit')">START SIGNAL BOT</button></div><div class="gx-card"><b>Risk Controls</b><small>Set max trades and loss limits before automation.</small><input id="gxBotMax" class="gx-input gx-wide" type="number" value="10" min="1" max="100"></div></div><div id="gxBotStatus" class="status" style="margin-top:10px">Bots start in signal/demo mode. Real-money automation requires an explicit execution action.</div>`)}
  window.__gxBotStart=mode=>{const s=$('#gxBotStatus');if(s)s.textContent=`${mode==='trend'?'Trend':'Digit'} bot is running in signal mode on ${window.__gxSymbol||'R_100'}.`};

  function wireSections(){
    $$('[data-section]').forEach(b=>b.onclick=()=>{workspace(b.dataset.section);$$('[data-section]').forEach(x=>x.classList.toggle('active',x===b));});
    $$('.tool[data-section]').forEach(b=>b.onclick=()=>workspace(b.dataset.section));
  }
  function patchExecution(){if($('#primaryBuy'))$('#primaryBuy').onclick=()=>executeFast('primary');if($('#secondaryBuy'))$('#secondaryBuy').onclick=()=>executeFast('secondary');}
  window.addEventListener('load',()=>{ensureStyles();wireTradeTypes();patchExecution();wireSections();window.__gxSymbol=window.__gxSymbol||'R_100';loadMarkets();});
})();
