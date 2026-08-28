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
      const state=crypto.randomUUID();
      const bytes=new Uint8Array(64); crypto.getRandomValues(bytes);
      const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
      const verifier=Array.from(bytes,v=>alphabet[v%alphabet.length]).join('');
      const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier));
      const challenge=base64url(new Uint8Array(hash));
      sessionStorage.setItem('deriv_state',state);
      sessionStorage.setItem('deriv_verifier',verifier);
      const u=new URL('https://auth.deriv.com/oauth2/auth');
      u.search=new URLSearchParams({response_type:'code',client_id:cfg.DERIV_CLIENT_ID,redirect_uri:cfg.DERIV_REDIRECT_URI,scope:cfg.DERIV_SCOPE||'trade',state,code_challenge:challenge,code_challenge_method:'S256'}).toString();
      window.location.assign(u.toString());
    }catch(e){console.error(e);sessionStorage.removeItem('deriv_state');sessionStorage.removeItem('deriv_verifier');alert('Unable to start Deriv login. Please try again.');}
  }

  async function handleCallback(){
    const p=new URLSearchParams(location.search),code=p.get('code'),state=p.get('state'),error=p.get('error');
    if(!code&&!error)return;
    const expected=sessionStorage.getItem('deriv_state'),verifier=sessionStorage.getItem('deriv_verifier');
    if(error){sessionStorage.removeItem('deriv_state');sessionStorage.removeItem('deriv_verifier');history.replaceState({},'',location.pathname);return;}
    if(!code||!state||state!==expected||!verifier){history.replaceState({},'',location.pathname);alert('Your Deriv login session expired. Please click Connect Deriv again.');return;}
    try{
      const r=await fetch(cfg.BACKEND_URL+'/api/oauth/exchange',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({code,state,code_verifier:verifier,redirect_uri:cfg.DERIV_REDIRECT_URI,client_id:cfg.DERIV_CLIENT_ID})});
      const d=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(d.error||'OAuth exchange failed');
      sessionStorage.removeItem('deriv_state');sessionStorage.removeItem('deriv_verifier');
      history.replaceState({},'',location.pathname);
      location.reload();
    }catch(e){console.error(e);history.replaceState({},'',location.pathname);alert('Deriv connection failed: '+e.message);}
  }

  function addClarity(){
    const style=document.createElement('style');
    style.textContent=`
      .gx-guide{margin:0 0 10px;padding:13px 15px;border:1px solid #2b3440;border-radius:9px;background:linear-gradient(135deg,#101720,#0a0e14);display:flex;align-items:center;gap:16px;box-shadow:0 10px 28px #0004}.gx-guide strong{font-size:13px}.gx-guide p{margin:3px 0 0;color:#8c98a7;font-size:9px;line-height:1.5}.gx-step{display:flex;align-items:center;gap:7px;white-space:nowrap;font-size:9px;font-weight:800;color:#aeb8c4}.gx-step i{width:22px;height:22px;border-radius:50%;display:grid;place-items:center;background:#21185f;color:#fff;font-style:normal}.gx-connect{background:linear-gradient(135deg,#806aff,#5439dc)!important;color:#fff!important;font-weight:900!important}.gx-logout{background:#35100e!important;color:#ffaaa0!important}.gx-help{font-size:8px!important;color:#7d8998!important;margin-top:5px!important}
      @media(max-width:850px){.gx-guide{display:block}.gx-step{display:inline-flex;margin:7px 9px 0 0}.gx-guide .gx-help{margin-top:8px!important}}
    `;document.head.appendChild(style);
    const main=document.querySelector('main');
    if(main&&!document.querySelector('.gx-guide')){
      const guide=document.createElement('div');guide.className='gx-guide';
      guide.innerHTML='<div><strong>Start here</strong><p>Connect your Deriv account first. Then choose a market, set your stake and place a trade.</p><div class="gx-help">Your balance appears automatically after connection.</div></div><div class="gx-step"><i>1</i> Connect Deriv</div><div class="gx-step"><i>2</i> Choose market</div><div class="gx-step"><i>3</i> Set trade</div><div class="gx-step"><i>4</i> Review & trade</div>';
      main.prepend(guide);
    }
    const connect=document.getElementById('connect');
    if(connect){connect.classList.add('gx-connect');connect.textContent='Connect Deriv';}
    const select=document.getElementById('accountSelect');
    if(select&&select.options.length===1)select.options[0].textContent='Connect Deriv first';
  }

  document.addEventListener('DOMContentLoaded',()=>{
    addClarity();
    ['connect','connect2'].forEach(id=>{const el=document.getElementById(id);if(el)el.onclick=startDerivLogin;});
    handleCallback();
  });
})();