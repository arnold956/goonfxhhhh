(() => {
  const WS_URL = 'wss://api.derivws.com/trading/v1/options/ws/public';
  let socket = null, reconnectTimer = null, attempts = 0;
  const listeners = new Set();
  const state = { connected:false, symbols:[], symbol:null, ticks:[], quote:null, digit:null };
  function emit(){ listeners.forEach(fn=>{try{fn({...state,ticks:[...state.ticks]})}catch{}}); }
  function connect(){
    clearTimeout(reconnectTimer);
    if(socket && (socket.readyState===WebSocket.OPEN || socket.readyState===WebSocket.CONNECTING)) return;
    socket = new WebSocket(WS_URL);
    socket.onopen=()=>{ attempts=0; state.connected=true; socket.send(JSON.stringify({active_symbols:'full',req_id:1})); if(state.symbol) subscribe(state.symbol); emit(); };
    socket.onmessage=e=>{ let d; try{d=JSON.parse(e.data)}catch{return};
      if(d.error){state.connected=false;emit();schedule();return;}
      if(d.msg_type==='active_symbols'){
        state.symbols=(d.active_symbols||[]).filter(x=>x.underlying_symbol||x.symbol);
        if(!state.symbol && state.symbols.length) state.symbol=state.symbols.find(x=>(x.underlying_symbol||x.symbol)==='1HZ100V')?.underlying_symbol||state.symbols[0].underlying_symbol||state.symbols[0].symbol;
        emit(); if(state.symbol) subscribe(state.symbol);
      }
      if(d.msg_type==='history' && d.history?.prices){ state.ticks=d.history.prices.map(Number).slice(-300); update(); }
      if(d.msg_type==='tick' && d.tick){ state.quote=Number(d.tick.quote); state.ticks.push(state.quote); if(state.ticks.length>300)state.ticks.shift(); update(); }
    };
    socket.onerror=()=>{state.connected=false;emit();};
    socket.onclose=()=>{state.connected=false;emit();schedule();};
  }
  function schedule(){ if(reconnectTimer)return; const delay=Math.min(15000,1000*Math.pow(2,attempts++)); reconnectTimer=setTimeout(()=>{reconnectTimer=null;connect()},delay); }
  function subscribe(sym){
    state.symbol=sym; if(!socket||socket.readyState!==WebSocket.OPEN)return;
    socket.send(JSON.stringify({ticks_history:sym,count:300,end:'latest',style:'ticks',req_id:2}));
    socket.send(JSON.stringify({ticks:sym,subscribe:1,req_id:3}));
  }
  function update(){ if(state.quote!=null){ const s=String(state.quote).replace(/\D/g,'');state.digit=s?s.slice(-1):null; } emit(); }
  window.GOONFXLiveDeriv={connect,subscribe,on(fn){listeners.add(fn);fn({...state,ticks:[...state.ticks]});return()=>listeners.delete(fn)},state};
  connect();
})();
