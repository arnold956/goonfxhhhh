(function(){
  const PUB='wss://api.derivws.com/trading/v1/options/ws/public';
  window.GoonFXMarkets={
    async load(select,contractTypes){
      if(!select)return;
      const ws=new WebSocket(PUB); let done=false;
      ws.onopen=()=>ws.send(JSON.stringify({active_symbols:'brief',contract_type:contractTypes}));
      ws.onmessage=e=>{let d;try{d=JSON.parse(e.data)}catch{return}if(d.msg_type!=='active_symbols'||done)return;done=true;const rows=(d.active_symbols||[]).filter(x=>x.exchange_is_open!==0&&!x.is_trading_suspended);select.innerHTML=rows.map(x=>`<option value="${x.underlying_symbol}">${x.underlying_symbol_name||x.underlying_symbol}</option>`).join('');if(!select.options.length)select.innerHTML='<option value="">No compatible markets</option>';select.dispatchEvent(new Event('change'));try{ws.close()}catch{}};
      ws.onerror=()=>{if(!done)select.innerHTML='<option value="">Market list unavailable</option>'};
    }
  };
})();
