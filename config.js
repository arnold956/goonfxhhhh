window.GOONFX_CONFIG = {
  DERIV_CLIENT_ID: '348AuAfk8ZpsbSW8Whqc3',
  DERIV_REDIRECT_URI: 'https://goonfx.com/',
  DERIV_SCOPE: 'trade',
  BACKEND_URL: 'https://api.goonfx.com',
  GOOGLE_CLIENT_ID: 'YOUR_GOOGLE_CLIENT_ID'
};

document.addEventListener('DOMContentLoaded',()=>{
  const style=document.createElement('style');
  style.textContent=`
  /* GOON FX visual system inspired by the supplied trading-terminal reference. */
  body{background:#f5f7f8!important;color:#172033!important}
  .top{background:#ecfbf6!important;color:#172033!important;border-bottom:1px solid #dbe6e3!important;box-shadow:0 1px 8px #17253612!important}
  .brand{color:#173047!important}.brand b span{color:#1475a9!important}
  .mark{background:#0b6a94!important;border-color:#0b6a94!important;color:#fff!important}
  .top a:not(.brand){background:transparent!important;color:#1c2d3c!important;border-color:transparent!important}
  .top a:not(.brand):hover{background:#dff4ee!important;color:#082b3e!important}
  .status{background:#fff!important;border-color:#d9e4e2!important;color:#53626c!important}
  .account select{background:#fff!important;color:#172033!important;border-color:#cfd9dd!important}
  .balance small{color:#73808a!important}.balance b{color:#42aeb2!important}
  .connect{background:#7138e8!important}
  .layout{background:#f5f7f8!important}
  .sidebar,.panel,.tools{background:#fff!important;border-color:#dfe5e8!important;box-shadow:0 4px 18px #1725360a!important;color:#172033!important}
  .sidebar{border-radius:0!important}.navtitle{color:#7c8892!important}.nav button{color:#4d5b66!important;border-bottom-color:#edf0f2!important}
  .nav button:hover,.nav button.active{background:#eef5fb!important;color:#174c8d!important;box-shadow:inset 3px 0 #287ce1!important}
  .ico{color:#159fd5!important}
  .heading h1{color:#172033!important}.heading p,.muted{color:#788690!important}
  .card{background:#fff!important;border-color:#dfe5e8!important;box-shadow:0 4px 18px #1725360a!important;color:#172033!important}
  .panelhead{border-bottom-color:#e3e8ea!important}.panelhead b{color:#25333e!important}
  .charttools{background:#fff!important;border-bottom-color:#e3e8ea!important}.charttools button{color:#697681!important}.charttools button.active,.charttools button:hover{background:#eaf2fb!important;color:#14599b!important}
  .marketselect{background:#fff!important;color:#172033!important;border-color:#cbd5da!important}
  .chart{background:#fff!important}.chartmsg{background:#ffffffcc!important;color:#7c8892!important}
  .chartfoot{background:#fff!important;border-top-color:#e5e9eb!important}.chartfoot b{color:#172033!important}
  .watch{background:#fff!important}.watchrow{border-bottom-color:#edf0f2!important}.watchrow:hover,.watchrow.active{background:#f0f5f8!important}
  .watchname,.watchprice{color:#263642!important}.watchbottom{color:#7b8892!important}.live{color:#16aa78!important}
  .trade{background:#fff!important}.tradehead{background:#fff!important;border-left-color:#397fe6!important;border-bottom-color:#e2e7e9!important}.tradehead b{color:#172033!important}
  .field label{color:#71808a!important}.field input,.field select{background:#fff!important;color:#172033!important;border-color:#cbd5da!important}
  .q{border-bottom-color:#edf0f2!important}.q span{color:#7b8790!important}.q b{color:#172033!important}
  .tradebtns .rise{background:#43b8b8!important}.tradebtns .fall{background:#ef4347!important}
  .notice{background:#fff9d8!important;border-color:#e8d37c!important;color:#586044!important}.notice.ok{background:#edf9f3!important;border-color:#bde8d3!important;color:#16875e!important}
  .accountbar{background:#fff!important;color:#25323b!important;border-bottom-color:#e2e7e9!important}.accountlabel{color:#7c8891!important}.accountmode{background:#eef1f3!important;color:#34424b!important}
  .accountmode.demo{background:#eafaf2!important;color:#11925f!important}.accountmode.real{background:#fff0f1!important;color:#d53a46!important}.accountselect{background:#fff!important;color:#172033!important;border-color:#cbd5da!important}
  .risk{position:fixed!important;left:22px!important;bottom:20px!important;z-index:200!important;background:#ffd400!important;color:#171717!important;border:0!important;border-radius:6px!important;padding:9px 22px!important;font-weight:900!important;box-shadow:0 5px 16px #0002!important}
  body:after{content:'AI';position:fixed;right:24px;bottom:18px;width:74px;height:74px;border-radius:50%;display:grid;place-items:center;background:#7043b7;color:#fff;font-size:30px;font-weight:950;z-index:199;box-shadow:0 0 0 4px #fff,0 0 0 7px #aaa8f4,0 0 0 11px #aaa8f455,0 8px 22px #0003;pointer-events:none}
  body:before{content:'';position:fixed;right:29px;bottom:83px;width:10px;height:10px;border-radius:50%;background:#00d18a;border:2px solid #fff;z-index:201;pointer-events:none}
  @media(max-width:850px){body:after{right:14px;bottom:12px;width:64px;height:64px;font-size:25px}.risk{left:12px;bottom:12px}}
  `;
  document.head.appendChild(style);
});

// Production OAuth callback: Deriv authorization-code + PKCE exchange is handled by the backend.
(async function handleDerivRootCallback(){
  const p=new URLSearchParams(location.search),code=p.get('code'),state=p.get('state');
  if(!code&&!p.get('error')) return;
  const msg=document.createElement('div');
  msg.style='position:fixed;inset:0;z-index:9999;display:grid;place-items:center;background:#05070b;color:#fff;font:600 14px Inter,Arial';
  msg.textContent=p.get('error')?'Deriv authorization was cancelled.':'Connecting your Deriv account…';
  document.addEventListener('DOMContentLoaded',()=>document.body.appendChild(msg));
  const expected=sessionStorage.getItem('deriv_state'),verifier=sessionStorage.getItem('deriv_verifier');
  if(p.get('error')){sessionStorage.removeItem('deriv_state');sessionStorage.removeItem('deriv_verifier');history.replaceState({},'',location.pathname);return}
  if(!code||!state||state!==expected||!verifier){msg.textContent='Invalid or expired Deriv authorization. Please connect again.';return}
  try{
    const r=await fetch(window.GOONFX_CONFIG.BACKEND_URL+'/api/oauth/exchange',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({code,state,code_verifier:verifier,redirect_uri:window.GOONFX_CONFIG.DERIV_REDIRECT_URI,client_id:window.GOONFX_CONFIG.DERIV_CLIENT_ID})});
    const d=await r.json().catch(()=>({}));
    if(!r.ok) throw new Error(d.error||'OAuth exchange failed');
    sessionStorage.removeItem('deriv_state');sessionStorage.removeItem('deriv_verifier');
    location.replace(location.pathname);
  }catch(e){msg.textContent='Deriv connection failed: '+e.message;console.error(e)}
})();