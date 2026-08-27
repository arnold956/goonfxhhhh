const cfg=window.GOONFX_CONFIG||{};
const $=s=>document.querySelector(s);
function nav(){const p=location.pathname.split('/').pop()||'index.html';document.querySelectorAll('[data-nav]').forEach(a=>{if(a.getAttribute('href')===p)a.classList.add('active')})}
function getToken(){return sessionStorage.getItem('goonfx_deriv_token')}
function setToken(v){sessionStorage.setItem('goonfx_deriv_token',v)}
async function api(path,opts={}){const token=getToken();if(!token)throw new Error('Connect your Deriv account first.');const r=await fetch(`${cfg.DERIV_REST_BASE||'https://api.derivws.com'}${path}`,{...opts,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json',...(opts.headers||{})}});const text=await r.text();let d;try{d=text?JSON.parse(text):{}}catch{d={error:text}}if(!r.ok)throw new Error(d?.errors?.[0]?.message||d?.message||d?.error||`Deriv API HTTP ${r.status}`);return d}
window.goonfxApi=api;window.api=api;
async function derivLogin(){const token=prompt('Paste your Deriv Personal Access Token (PAT). It is stored only in this browser session.');if(!token)return;setToken(token.trim());await loadAccount()}
async function loadAccount(){const status=$('#connection-status');if(!status)return;try{const d=await api('/trading/v1/options/accounts');const accounts=Array.isArray(d.data)?d.data:(d.data?[d.data]:[]),a=accounts[0]||{};status.innerHTML='<span class="dot ok"></span>Connected';document.querySelectorAll('[data-balance]').forEach(e=>e.textContent=a.balance??'—');document.querySelectorAll('[data-loginid]').forEach(e=>e.textContent=a.account_id??'—')}catch(e){status.innerHTML='<span class="dot"></span>Not connected'}}
function logout(){sessionStorage.removeItem('goonfx_deriv_token');location.href='index.html'}
window.goonfxLogout=logout;
document.addEventListener('DOMContentLoaded',()=>{nav();loadAccount();$('#deriv-login')?.addEventListener('click',derivLogin);document.querySelectorAll('[data-logout]').forEach(b=>b.addEventListener('click',logout))});