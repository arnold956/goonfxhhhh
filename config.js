window.GOONFX_CONFIG = {
  DERIV_CLIENT_ID: '348AuAfk8ZpsbSW8Whqc3',
  DERIV_REDIRECT_URI: 'https://goonfx.com/',
  DERIV_SCOPE: 'trade',
  BACKEND_URL: 'https://api.goonfx.com',
  GOOGLE_CLIENT_ID: 'YOUR_GOOGLE_CLIENT_ID'
};

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