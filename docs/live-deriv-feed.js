(() => {
  const WS_URL='wss://api.derivws.com/trading/v1/options/ws/public';
  let socket=null,timer=null,attempts=0;
  const listeners=new Set();
  const aliases={R_100:'1HZ100V',R_75:'1HZ75V',R_50:'1HZ50V',R_25:'1HZ25V',R_10:'1HZ10V'};
  const state={connected:false,symbols:[],symbol:'1HZ100V',ticks:[],quote:null,digit:null};
  const emit=()=>listeners.forEach(fn=>{try{fn({...state,ticks:[...state.ticks]})}catch{}});
  const canonical=s=>aliases[s]||s||'1HZ100V';
  function schedule(){if(timer)return;timer=setTimeout(()=>{timer=null;connect()},Math.min(15000,1000*Math.pow(2,attempts++)))}
  function subscribe(sym){state.symbol=canonical(sym);if(!socket||socket.readyState!==WebSocket.OPEN)return;state.ticks=[];socket.send(JSON.stringify({ticks_history:state.symbol,count:300,end:'latest',style:'ticks',req_id:2}));socket.send(JSON.stringify({ticks:state.symbol,subscribe:1,req_id:3}));emit()}
  function connect(){if(socket&&(socket.readyState===WebSocket.OPEN||socket.readyState===WebSocket.CONNECTING))return;socket=new WebSocket(WS_URL);socket.onopen=()=>{attempts=0;state.connected=true;socket.send(JSON.stringify({active_symbols:'full',req_id:1}));subscribe(state.symbol);emit()};socket.onmessage=e=>{let d;try{d=JSON.parse(e.data)}catch{return}if(d.error){state.connected=false;emit();return}if(d.msg_type==='active_symbols'){state.symbols=(d.active_symbols||[]).filter(x=>x.underlying_symbol||x.symbol);if(state.symbol==='1HZ100V'&&!state.symbols.some(x=>(x.underlying_symbol||x.symbol)==='1HZ100V'))state.symbol=state.symbols[0]?.underlying_symbol||state.symbols[0]?.symbol||'1HZ100V';emit()}if(d.msg_type==='history'&&d.history?.prices){state.ticks=d.history.prices.map(Number).slice(-300);update()}if(d.msg_type==='tick'&&d.tick){state.quote=Number(d.tick.quote);state.ticks.push(state.quote);if(state.ticks.length>300)state.ticks.shift();update()}};socket.onerror=()=>{state.connected=false;emit()};socket.onclose=()=>{state.connected=false;emit();schedule()}}
  function update(){const s=state.quote==null?'':String(state.quote).replace(/\D/g,'');state.digit=s?s.slice(-1):null;emit()}
  window.GOONFXLiveDeriv={connect,subscribe,on(fn){listeners.add(fn);fn({...state,ticks:[...state.ticks]});return()=>listeners.delete(fn)},state,aliases};connect();
})();