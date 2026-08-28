window.GOONFX_CONFIG = {
  // New Deriv OAuth 2.0 client ID.
  DERIV_CLIENT_ID: '348AuAfk8ZpsbSW8Whqc3',
  // Legacy Deriv V1 app ID, used only as the optional OAuth routing hint.
  DERIV_APP_ID: '34b2ctEChXoL5t579q8pB',
  DERIV_REDIRECT_URI: 'https://goonfx.com/',
  DERIV_SCOPE: 'trade',
  BACKEND_URL: 'https://api.goonfx.com',
  GOOGLE_CLIENT_ID: 'YOUR_GOOGLE_CLIENT_ID'
};

// Keep the callback in one place. The main page has its own trading UI, so this
// small file owns the OAuth callback/session handoff and the login buttons.
(function(){
  const cfg=window.GOONFX_CONFIG;
  const base64url=b=>btoa(String.fromCharCode(...b)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');

  async function startDerivLogin(){
    if(!cfg.DERIV_CLIENT_ID||!cfg.DERIV_REDIRECT_URI){
      alert('Deriv OAuth is not configured.');
      return;
    }
    try{
      const state=crypto.randomUUID();
      const bytes=new Uint8Array(64);
      crypto.getRandomValues(bytes);
      const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
      const verifier=Array.from(bytes,v=>alphabet[v%alphabet.length]).join('');
      const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier));
      const challenge=base64url(new Uint8Array(hash));
      sessionStorage.setItem('deriv_state',state);
      sessionStorage.setItem('deriv_verifier',verifier);
      const u=new URL('https://auth.deriv.com/oauth2/auth');
      u.searchParams.set('response_type','code');
      u.searchParams.set('client_id',cfg.DERIV_CLIENT_ID);
      u.searchParams.set('redirect_uri',cfg.DERIV_REDIRECT_URI);
      u.searchParams.set('scope',cfg.DERIV_SCOPE||'trade');
      u.searchParams.set('state',state);
      u.searchParams.set('code_challenge',challenge);
      u.searchParams.set('code_challenge_method','S256');
      if(cfg.DERIV_APP_ID) u.searchParams.set('app_id',cfg.DERIV_APP_ID);
      window.location.assign(u.toString());
    }catch(e){
      console.error('Deriv OAuth start failed',e);
      sessionStorage.removeItem('deriv_state');
      sessionStorage.removeItem('deriv_verifier');
      alert('Unable to start Deriv login. Please try again.');
    }
  }

  async function handleCallback(){
    const p=new URLSearchParams(window.location.search);
    const code=p.get('code'),state=p.get('state'),error=p.get('error');
    if(!code&&!error)return;
    const expected=sessionStorage.getItem('deriv_state');
    const verifier=sessionStorage.getItem('deriv_verifier');
    if(error){
      sessionStorage.removeItem('deriv_state');
      sessionStorage.removeItem('deriv_verifier');
      history.replaceState({},'',location.pathname);
      return;
    }
    if(!code||!state||state!==expected||!verifier){
      alert('Deriv login expired or could not be verified. Please connect again.');
      history.replaceState({},'',location.pathname);
      return;
    }
    try{
      const r=await fetch(cfg.BACKEND_URL+'/api/oauth/exchange',{
        method:'POST',
        credentials:'include',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          code,
          state,
          code_verifier:verifier,
          redirect_uri:cfg.DERIV_REDIRECT_URI,
          client_id:cfg.DERIV_CLIENT_ID
        })
      });
      const d=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(d.error||'OAuth exchange failed');
      sessionStorage.removeItem('deriv_state');
      sessionStorage.removeItem('deriv_verifier');
      history.replaceState({},'',location.pathname);
      // Reload once so the dashboard's existing account loader sees the new cookie.
      window.location.reload();
    }catch(e){
      console.error('Deriv OAuth callback failed',e);
      alert('Deriv connection failed: '+e.message);
      history.replaceState({},'',location.pathname);
    }
  }

  document.addEventListener('DOMContentLoaded',()=>{
    // Override the inline handlers in index.html with the canonical OAuth flow.
    ['connect','connect2'].forEach(id=>{
      const el=document.getElementById(id);
      if(el)el.onclick=startDerivLogin;
    });
    handleCallback();
  });
})();