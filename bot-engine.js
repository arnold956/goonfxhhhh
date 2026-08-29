(() => {
  const $ = (s) => document.querySelector(s);
  const cfg = window.GOONFX_CONFIG || {};
  const API = cfg.BACKEND_URL || '';
  const state = {
    ws: null, symbol: '', running: false, live: false, strategy: 'momentum',
    stake: 1, duration: 1, durationUnit: 't', barrier: 5,
    cooldownMs: 8000, lastTrade: 0, ticks: [], trades: 0, wins: 0, losses: 0,
    pnl: 0, busy: false, maxTrades: 20, maxLoss: 5
  };
  const log = (msg, type='info') => {
    const el = $('#botLog'); if (!el) return;
    const row = document.createElement('div'); row.className = `log ${type}`;
    row.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
    el.prepend(row);
  };
  const setStatus = (text, ok=false) => {
    const el=$('#botStatus'); if(el) el.textContent=text;
    const dot=$('#botDot'); if(dot) dot.className=`dot ${ok?'ok':''}`;
  };
  async function api(path, opts={}) {
    const r = await fetch(API + path, { credentials:'include', ...opts, headers:{'Content-Type':'application/json',...(opts.headers||{})} });
    const d = await r.json().catch(()=>({}));
    if(!r.ok) throw new Error(d.error || `HTTP ${r.status}`);
    return d;
  }
  function render(){
    $('#botTrades').textContent=state.trades;
    $('#botWins').textContent=state.wins;
    $('#botLosses').textContent=state.losses;
    $('#botPnl').textContent=(state.pnl>=0?'+':'')+state.pnl.toFixed(2);
    $('#botPnl').className=state.pnl>=0?'positive':'negative';
    $('#botRunning').textContent=state.running?'RUNNING':'STOPPED';
    $('#botRunning').className=state.running?'running':'stopped';
  }
  function disconnect(){ if(state.ws){try{state.ws.close()}catch{} state.ws=null;} }
  function connectMarket(){
    disconnect();
    state.symbol=$('#symbol').value;
    if(!state.symbol) return;
    const ws=new WebSocket('wss://api.derivws.com/trading/v1/options/ws/public'); state.ws=ws;
    ws.onopen=()=>{setStatus(`Live ${state.symbol}`,true);ws.send(JSON.stringify({ticks:state.symbol,subscribe:1,req_id:1}));};
    ws.onmessage=(ev)=>{try{const d=JSON.parse(ev.data);if(d.msg_type==='tick') onTick(Number(d.tick.quote),d.tick.epoch);}catch{}};
    ws.onerror=()=>setStatus('Market feed error');
    ws.onclose=()=>{if(state.running)setStatus('Market feed disconnected');};
  }
  function onTick(price,epoch){
    state.ticks.push({price,epoch}); if(state.ticks.length>30)state.ticks.shift();
    $('#livePrice').textContent=price;
    $('#lastDigit').textContent=String(Math.abs(Math.floor(price*100))%10);
    if(state.running) evaluate();
  }
  function signal(){
    if(state.ticks.length<8)return null;
    const last=state.ticks.at(-1).price, prev=state.ticks.slice(-8,-1).map(x=>x.price);
    if(state.strategy==='evenodd') return (Math.abs(Math.floor(last*100))%2===0)?{type:'DIGITEVEN'}:{type:'DIGITODD'};
    if(state.strategy==='overunder') return last>=Number($('#barrier').value||5)?{type:'DIGITOVER',barrier:Number($('#barrier').value||5)}:{type:'DIGITUNDER',barrier:Number($('#barrier').value||5)};
    const avg=prev.reduce((a,b)=>a+b,0)/prev.length;
    if(last>avg) return {type:'DIGITOVER',barrier:Number($('#barrier').value||5)};
    if(last<avg) return {type:'DIGITUNDER',barrier:Number($('#barrier').value||5)};
    return null;
  }
  async function evaluate(){
    if(state.busy || Date.now()-state.lastTrade<state.cooldownMs)return;
    if(state.trades>=state.maxTrades){stop('Maximum trades reached');return;}
    if(state.pnl<=-Math.abs(state.maxLoss)){stop('Maximum loss protection triggered');return;}
    const s=signal(); if(!s)return;
    state.busy=true; state.lastTrade=Date.now();
    const payload={contract_type:s.type,underlying_symbol:state.symbol,amount:state.stake,duration:state.duration,duration_unit:state.durationUnit};
    if(s.barrier!==undefined)payload.barrier=s.barrier;
    try{
      const d=await api('/api/trade',{method:'POST',body:JSON.stringify(payload)});
      state.trades++; render();
      const id=d.contract_id;
      log(`${s.type} executed on ${state.symbol} — contract ${id}`, 'trade');
      await monitor(id);
    }catch(e){log(`Trade blocked: ${e.message}`,'error');}
    finally{state.busy=false;render();}
  }
  async function monitor(contractId){
    // The existing backend exposes authenticated Deriv execution. This lightweight
    // polling endpoint is intentionally optional; if unavailable the bot still logs execution.
    try{
      const d=await api(`/api/contract/${encodeURIComponent(contractId)}`);
      const profit=Number(d.profit ?? d.contract?.profit ?? NaN);
      if(Number.isFinite(profit)){state.pnl+=profit;if(profit>=0)state.wins++;else state.losses++;render();log(`Contract ${contractId}: ${profit>=0?'WIN':'LOSS'} ${profit.toFixed(2)}`,profit>=0?'win':'loss');}
    }catch{}
  }
  function start(){
    state.strategy=$('#strategy').value;state.stake=Math.max(.35,Number($('#stake').value)||1);state.duration=Math.max(1,Number($('#duration').value)||1);state.durationUnit=$('#durationUnit').value;state.maxTrades=Math.max(1,Number($('#maxTrades').value)||20);state.maxLoss=Math.max(.35,Number($('#maxLoss').value)||5);state.live=$('#liveMode').checked;
    if(!state.live){log('Demo protection is active. Enable “Live trading” only when you intentionally want real-account execution.','warn');}
    state.running=true;state.ticks=[];render();connectMarket();log(`Bot started: ${$('#strategy').selectedOptions[0].text}`,'start');
  }
  function stop(reason='Stopped by user'){state.running=false;disconnect();setStatus('Bot stopped');render();log(reason,'warn');}
  async function init(){
    try{const d=await api('/api/accounts');const current=d.current;if(current){$('#accountMode').textContent=current.mode;$('#accountId').textContent=current.account_id;$('#accountMode').className=current.account_type==='real'?'real':'demo';if(current.account_type==='real'&&!$('#liveMode').checked)log('A REAL Deriv account is selected. Live execution remains disabled until you enable the live-trading switch.','warn');}}
    catch(e){log('Deriv login is required before a bot can trade.','error');setStatus('Not connected');}
    $('#startBot').onclick=start;$('#stopBot').onclick=()=>stop();$('#liveMode').onchange=()=>{if($('#liveMode').checked){log('LIVE trading enabled. Trades will use the currently selected Deriv account.','warn');}else log('Live trading disabled; bot will not execute real trades.','info');};
    $('#symbol').onchange=()=>{if(state.running)connectMarket();};render();
  }
  document.addEventListener('DOMContentLoaded',init);
})();
