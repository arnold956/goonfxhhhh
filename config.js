window.GOONFX_CONFIG = {
  DERIV_CLIENT_ID: '348AuAfk8ZpsbSW8Whqc3',
  DERIV_APP_ID: '34b2ctEChXoL5t579q8pB',
  DERIV_REDIRECT_URI: 'https://goonfx.com/',
  DERIV_SCOPE: 'trade',
  BACKEND_URL: 'https://api.goonfx.com',
  GOOGLE_CLIENT_ID: 'YOUR_GOOGLE_CLIENT_ID'
};

(function(){
  const cfg=window.GOONFX_CONFIG;
  const base64url=b=>btoa(String.fromCharCode(...b)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  async function startDerivLogin(){
    if(!cfg.DERIV_CLIENT_ID||!cfg.DERIV_REDIRECT_URI){alert('Deriv connection is not configured.');return;}
    try{
      const state=crypto.randomUUID(),bytes=new Uint8Array(64);crypto.getRandomValues(bytes);
      const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
      const verifier=Array.from(bytes,v=>alphabet[v%alphabet.length]).join('');
      const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier));
      const challenge=base64url(new Uint8Array(hash));
      sessionStorage.setItem('deriv_state',state);sessionStorage.setItem('deriv_verifier',verifier);
      const u=new URL('https://auth.deriv.com/oauth2/auth');
      u.search=new URLSearchParams({response_type:'code',client_id:cfg.DERIV_CLIENT_ID,redirect_uri:cfg.DERIV_REDIRECT_URI,scope:cfg.DERIV_SCOPE||'trade',state,code_challenge:challenge,code_challenge_method:'S256'}).toString();
      location.assign(u.toString());
    }catch(e){console.error(e);alert('Unable to start Deriv login. Please try again.');}
  }
  async function handleCallback(){
    const p=new URLSearchParams(location.search),code=p.get('code'),state=p.get('state'),error=p.get('error');
    if(!code&&!error)return;
    if(error){sessionStorage.removeItem('deriv_state');sessionStorage.removeItem('deriv_verifier');history.replaceState({},'',location.pathname);return;}
    const expected=sessionStorage.getItem('deriv_state'),verifier=sessionStorage.getItem('deriv_verifier');
    if(!code||!state||state!==expected||!verifier){history.replaceState({},'',location.pathname);alert('Deriv login session expired. Please click Connect Deriv again.');return;}
    try{
      const r=await fetch(cfg.BACKEND_URL+'/api/oauth/exchange',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({code,state,code_verifier:verifier,redirect_uri:cfg.DERIV_REDIRECT_URI,client_id:cfg.DERIV_CLIENT_ID})});
      const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'OAuth exchange failed');
      sessionStorage.removeItem('deriv_state');sessionStorage.removeItem('deriv_verifier');history.replaceState({},'',location.pathname);location.reload();
    }catch(e){console.error(e);history.replaceState({},'',location.pathname);alert('Deriv connection failed: '+e.message);}
  }
  function googleLogin(){
    if(!cfg.GOOGLE_CLIENT_ID||cfg.GOOGLE_CLIENT_ID==='YOUR_GOOGLE_CLIENT_ID'){alert('Google login is not configured yet. Add the Google OAuth client ID in the deployment settings.');return;}
    const state=crypto.randomUUID();sessionStorage.setItem('google_state',state);
    const u=new URL('https://accounts.google.com/o/oauth2/v2/auth');
    u.search=new URLSearchParams({client_id:cfg.GOOGLE_CLIENT_ID,redirect_uri:location.origin+'/',response_type:'code',scope:'openid email profile',state,access_type:'online',prompt:'select_account'}).toString();
    location.assign(u.toString());
  }
  function addLogin(){
    if(document.getElementById('gx-login-actions'))return;
    const top=document.querySelector('.account');if(!top)return;
    const wrap=document.createElement('div');wrap.id='gx-login-actions';wrap.style='display:flex;gap:6px;align-items:center';
    const deriv=document.createElement('button');deriv.className='connect';deriv.textContent='Login with Deriv';deriv.onclick=startDerivLogin;
    const google=document.createElement('button');google.className='connect';google.style='background:#11161f;border:1px solid #303846';google.textContent='Login with Google';google.onclick=googleLogin;
    wrap.append(deriv,google);top.innerHTML='';top.append(wrap);
  }
  document.addEventListener('DOMContentLoaded',()=>{addLogin();handleCallback();});
})();
