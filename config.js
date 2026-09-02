window.GOONFX_CONFIG={
  BACKEND_URL:'https://api.goonfx.com',
  DERIV_CLIENT_ID:'348AuAfk8ZpsbSW8Whqc3',
  DERIV_APP_ID:'34b2ctEChXoL5t579q8pB',
  DERIV_REDIRECT_URI:'https://goonfx.com/',
  DERIV_SCOPE:'trade'
};

// Start Deriv OAuth immediately when the public site is opened.
// The existing app.js callback handler completes the OAuth exchange and
// reveals the dashboard after the user authorizes the account at Deriv.
(async()=>{
  const cfg=window.GOONFX_CONFIG;
  const p=new URLSearchParams(location.search);
  if(p.get('code')||p.get('error')) return;
  if(sessionStorage.getItem('gx_auto_login_started')) return;
  sessionStorage.setItem('gx_auto_login_started','1');
  try{
    const bytes=new Uint8Array(64);
    crypto.getRandomValues(bytes);
    const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    const verifier=Array.from(bytes,v=>alphabet[v%alphabet.length]).join('');
    const state=crypto.randomUUID();
    const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier));
    const challenge=btoa(String.fromCharCode(...new Uint8Array(hash)))
      .replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
    sessionStorage.setItem('gx_verifier',verifier);
    sessionStorage.setItem('gx_state',state);
    const u=new URL('https://auth.deriv.com/oauth2/auth');
    u.search=new URLSearchParams({
      response_type:'code',
      client_id:cfg.DERIV_CLIENT_ID,
      redirect_uri:cfg.DERIV_REDIRECT_URI,
      scope:cfg.DERIV_SCOPE,
      state,
      code_challenge:challenge,
      code_challenge_method:'S256'
    });
    location.replace(u.toString());
  }catch(e){
    sessionStorage.removeItem('gx_auto_login_started');
    console.error('Unable to start Deriv OAuth',e);
  }
})();