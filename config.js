window.GOONFX_CONFIG = {
  DERIV_CLIENT_ID: '348AuAfk8ZpsbSW8Whqc3',
  DERIV_REDIRECT_URI: 'https://goonfx.com/',
  DERIV_SCOPE: 'trade',
  BACKEND_URL: 'https://api.goonfx.com',
  GOOGLE_CLIENT_ID: 'YOUR_GOOGLE_CLIENT_ID'
};

/* TraderKit-inspired terminal polish: original GOON FX branding/layout, circular live digits,
   floating market selector, compact terminal spacing, and animated prediction indicator. */
document.addEventListener('DOMContentLoaded',()=>{
  const style=document.createElement('style');
  style.textContent=`
  .charttools{position:relative;min-height:48px;padding-left:10px;padding-right:10px}
  .marketselect{position:absolute;left:10px;top:7px;margin:0;min-width:190px;height:34px;z-index:4;background:#0a0e14ee;border-color:#303947;box-shadow:0 8px 24px #0008;font-weight:800}
  .charttools button{margin-left:198px}.charttools button:nth-of-type(n+2){margin-left:0}
  .digitgrid{gap:8px;align-items:center;padding:10px 2px 4px}
  .digit{position:relative;width:58px;height:58px;justify-self:center;border-radius:50%;border:1px solid #303947;background:radial-gradient(circle at 50% 40%,#151c26 0,#0a0f15 68%);box-shadow:inset 0 0 0 1px #080b10,0 7px 18px #0008;transition:transform .25s,border-color .25s,box-shadow .25s}
  .digit b{font:800 20px 'Space Grotesk';line-height:1}.digit span{font-size:7px;text-transform:uppercase;letter-spacing:.5px}
  .digit.hot{border-color:#18c995;box-shadow:0 0 0 1px #18c99555,inset 0 0 22px #0d4b3b,0 0 22px #0e8d6c33;transform:translateY(-3px)}
  .digit.hot:after{content:'LIVE';position:absolute;top:-9px;right:-2px;font-size:6px;font-weight:900;color:#8ff5d9;background:#08251e;border:1px solid #17634f;border-radius:8px;padding:2px 4px;animation:gxPulse 1.2s infinite}
  .digit.cold{border-color:#733a35;box-shadow:inset 0 0 18px #351613}
  .tickline{height:2px;margin:13px 6px 5px;background:linear-gradient(90deg,#ff5f52 0 49%,#2b3440 50%,#19d4a0 51%);overflow:visible}
  .tickline i{width:11px;height:11px;top:-5px;border:2px solid #07100d;animation:gxSpin 1.05s linear infinite;transition:left .35s}
  .tickline:before,.tickline:after{position:absolute;top:-16px;font-size:6px;font-weight:900;letter-spacing:.6px}.tickline:before{content:'UNDER';left:0;color:#ff8b80}.tickline:after{content:'OVER';right:0;color:#76edca}
  .workspace{grid-template-columns:minmax(0,1fr) 285px;gap:8px}.panel{border-radius:7px}.cards{gap:6px}.card{padding:10px;border-radius:7px}
  .trade{border-top:2px solid #715df1}.tradehead{border-left:0;padding:11px 12px}.tradebtns button{box-shadow:0 7px 18px #0005}
  @keyframes gxSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
  @keyframes gxPulse{0%,100%{opacity:.45}50%{opacity:1}}
  @media(max-width:850px){.charttools button{margin-left:0}.marketselect{position:relative;left:auto;top:auto;width:100%;margin:3px 0}.charttools{display:flex}.digitgrid{grid-template-columns:repeat(5,1fr)}.digit{width:54px;height:54px}}
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