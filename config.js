window.GOONFX_CONFIG = {
  DERIV_CLIENT_ID: '34b2ctEChXoL5t579q8pB',
  DERIV_REDIRECT_URI: 'https://goonfx.com/',
  DERIV_SCOPE: 'trade',
  BACKEND_URL: 'https://api.goonfx.com',
  GOOGLE_CLIENT_ID: 'YOUR_GOOGLE_CLIENT_ID'
};

document.addEventListener('DOMContentLoaded',()=>{
  const style=document.createElement('style');
  style.textContent=`
  :root{--bg:#050505!important;--panel:#0b0b0d!important;--panel2:#101013!important;--panel3:#151519!important;--line:#242428!important;--line2:#36363c!important;--text:#f7f7f8!important;--muted:#929298!important;--green:#16d39a!important;--red:#ff3b30!important;--blue:#ff3b30!important;--cyan:#ff6b61!important}
  html,body{background:#050505!important;color:#f7f7f8!important}
  .top{background:rgba(8,8,9,.97)!important;color:#fff!important;border-bottom:1px solid #242428!important;box-shadow:0 8px 30px #0008!important}
  .brand{color:#fff!important}.brand b{letter-spacing:-1.2px}.brand b span{color:#ff3b30!important}
  .mark{background:linear-gradient(145deg,#ff3b30,#8f0905)!important;border:1px solid #ff5a50!important;color:#fff!important;box-shadow:0 0 22px #ff3b3026!important}
  .status{background:#0d1512!important;border-color:#21483c!important;color:#8ff0d2!important}.status.off{background:#160908!important;border-color:#57201c!important;color:#ffaaa5!important}
  .account select{background:#0e0e11!important;color:#fff!important;border-color:#36363c!important}.balance small{color:#77777e!important}.balance b{color:#fff!important}
  .connect{background:linear-gradient(135deg,#ff4b40,#c9160f)!important;color:#fff!important;box-shadow:0 7px 20px #ff3b3026!important}.layout{background:#050505!important}
  .sidebar,.panel,.tools{background:linear-gradient(180deg,#0d0d10,#080809)!important;border-color:#242428!important;box-shadow:0 14px 35px #0007!important;color:#f7f7f8!important}.sidebar{border-radius:10px!important}
  .navtitle{color:#66666d!important}.nav button{color:#a9a9b0!important;border-bottom-color:#19191d!important}.nav button:hover,.nav button.active{background:linear-gradient(90deg,#21100f,#120b0b)!important;color:#fff!important;box-shadow:inset 3px 0 #ff3b30,0 0 18px #ff3b3010!important}.ico{color:#ff5a50!important}
  .heading h1{color:#fff!important}.heading p,.muted{color:#8c8c94!important}.chip{background:#0d0d10!important;border-color:#34343a!important;color:#bcbcc2!important}.chip:hover{border-color:#ff3b30!important;color:#fff!important}
  .card{background:linear-gradient(145deg,#111114,#09090b)!important;border-color:#252529!important;box-shadow:0 8px 22px #0006!important;color:#fff!important}.card small{color:#77777f!important}.card span{color:#85858d!important}
  .panelhead{border-bottom-color:#242428!important}.panelhead b{color:#fff!important}.charttools{background:#0b0b0d!important;border-bottom-color:#242428!important}.charttools button{color:#777780!important}.charttools button.active,.charttools button:hover{background:#25100f!important;color:#fff!important;box-shadow:inset 0 -2px #ff3b30!important}.marketselect{background:#0a0a0c!important;color:#fff!important;border-color:#37373d!important}
  .chart{background:#070708!important}.chartmsg{background:#070708cc!important;color:#8c8c94!important}.chartfoot{background:#0a0a0c!important;border-top-color:#242428!important}.chartfoot b{color:#fff!important}
  .watch{background:#09090b!important}.watchrow{border-bottom-color:#19191d!important}.watchrow:hover,.watchrow.active{background:#171013!important;box-shadow:inset 2px 0 #ff3b30!important}.watchname,.watchprice{color:#f0f0f2!important}.watchbottom{color:#777780!important}.live{color:#16d39a!important}
  .trade{background:#0a0a0c!important}.tradehead{background:linear-gradient(90deg,#140b0b,#0b0b0d)!important;border-left-color:#ff3b30!important;border-bottom-color:#242428!important}.tradehead b{color:#fff!important}.field label{color:#85858d!important}.field input,.field select{background:#08080a!important;color:#fff!important;border-color:#36363c!important}.field input:focus,.field select:focus{border-color:#ff3b30!important;box-shadow:0 0 0 2px #ff3b3018!important}.q{border-bottom-color:#19191d!important}.q span{color:#7f7f87!important}.q b{color:#fff!important}.tradebtns .rise{background:linear-gradient(#16d39a,#087b5c)!important}.tradebtns .fall{background:linear-gradient(#ff5147,#b5140d)!important}
  .notice{background:#14110a!important;border-color:#6c5420!important;color:#d4c28b!important}.notice.ok{background:#0b1713!important;border-color:#1b6650!important;color:#8eead0!important}.notice.bad{background:#190b0a!important;border-color:#6b2924!important;color:#ffaaa5!important}.accountbar{background:#0b0b0d!important;color:#fff!important;border-bottom-color:#242428!important}.accountlabel{color:#7d7d85!important}.accountmode{background:#17171b!important;color:#c4c4ca!important}.accountmode.demo{background:#0b1914!important;color:#16d39a!important}.accountmode.real{background:#1b0b0a!important;color:#ff6b61!important}.accountselect{background:#09090b!important;color:#fff!important;border-color:#36363c!important}
  .risk{position:fixed!important;left:22px!important;bottom:20px!important;z-index:200!important;background:#ff3b30!important;color:#fff!important;border:0!important;border-radius:7px!important;padding:9px 20px!important;font-weight:900!important;box-shadow:0 8px 24px #ff3b3033!important}body:after{content:'AI';position:fixed;right:24px;bottom:18px;width:68px;height:68px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(145deg,#ff3b30,#9b0b06)!important;color:#fff;font-size:26px;font-weight:950;z-index:199;box-shadow:0 0 0 4px #080808,0 0 0 6px #ff3b3055,0 8px 24px #0008;pointer-events:none}body:before{content:'';position:fixed;right:27px;bottom:81px;width:10px;height:10px;border-radius:50%;background:#16d39a;border:2px solid #080808;z-index:201;pointer-events:none}@media(max-width:850px){body:after{right:14px;bottom:12px;width:60px;height:60px;font-size:23px}.risk{left:12px;bottom:12px}}
  `;document.head.appendChild(style);
});

(async function handleDerivRootCallback(){
  const p=new URLSearchParams(location.search),code=p.get('code'),state=p.get('state');
  if(!code&&!p.get('error')) return;
  const msg=document.createElement('div');msg.style='position:fixed;inset:0;z-index:9999;display:grid;place-items:center;background:#050505;color:#fff;font:600 14px Inter,Arial';msg.textContent=p.get('error')?'Deriv authorization was cancelled.':'Connecting your Deriv account…';document.addEventListener('DOMContentLoaded',()=>document.body.appendChild(msg));
  const expected=sessionStorage.getItem('deriv_state'),verifier=sessionStorage.getItem('deriv_verifier');
  if(p.get('error')){sessionStorage.removeItem('deriv_state');sessionStorage.removeItem('deriv_verifier');history.replaceState({},'',location.pathname);return}
  if(!code||!state||state!==expected||!verifier){msg.textContent='Invalid or expired Deriv authorization. Please connect again.';return}
  try{const r=await fetch(window.GOONFX_CONFIG.BACKEND_URL+'/api/oauth/exchange',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({code,state,code_verifier:verifier,redirect_uri:window.GOONFX_CONFIG.DERIV_REDIRECT_URI,client_id:window.GOONFX_CONFIG.DERIV_CLIENT_ID})});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'OAuth exchange failed');sessionStorage.removeItem('deriv_state');sessionStorage.removeItem('deriv_verifier');location.replace(location.pathname)}catch(e){msg.textContent='Deriv connection failed: '+e.message;console.error(e)}})();