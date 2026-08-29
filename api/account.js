import cors from 'cors';

const ORIGIN=process.env.FRONTEND_ORIGIN||'https://goonfx.com';
const APP_ID=process.env.DERIV_API_APP_ID||process.env.DERIV_APP_ID||'';
const REST='https://api.derivws.com';

function getCookie(req,name){const m=(req.headers.cookie||'').match(new RegExp(`(?:^|; )${name}=([^;]+)`));return m?decodeURIComponent(m[1]):null}
function fail(res,e,status=502){res.status(e.status||status).json({error:e.message||'Request failed'})}
function accountList(data){const list=Array.isArray(data?.data)?data.data:Array.isArray(data?.data?.accounts)?data.data.accounts:Array.isArray(data?.accounts)?data.accounts:[];return list.map(x=>{const id=x.account_id||x.id||x.loginid;const type=String(x.account_type||x.type||'').toLowerCase();const demo=type.includes('demo')||/^VR|^VRTC/i.test(String(id));return {account_id:id,loginid:id,account_type:demo?'demo':'real',mode:demo?'DEMO':'REAL',balance:x.balance??0,currency:x.currency||'USD',status:x.status||'active'}}).filter(x=>x.account_id)}

export default async function handler(req,res){cors({origin:ORIGIN,credentials:true})(req,res,async()=>{try{if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});const token=getCookie(req,'gx_token');if(!token)return res.status(401).json({error:'Not connected to Deriv.'});if(!APP_ID)return res.status(500).json({error:'Deriv API App ID is not configured on the server.'});const r=await fetch(`${REST}/trading/v1/options/accounts`,{headers:{'Deriv-App-ID':APP_ID,Authorization:`Bearer ${token}`}});const d=await r.json().catch(()=>({}));if(!r.ok){const e=new Error(d?.errors?.[0]?.message||d?.error||`Deriv HTTP ${r.status}`);e.status=r.status;throw e}const accounts=accountList(d);if(!accounts.length)return res.status(404).json({error:'No Deriv Options trading account was returned.'});const selected=getCookie(req,'gx_account');const current=accounts.find(a=>a.account_id===selected)||accounts.find(a=>a.account_type==='demo')||accounts[0];res.json({ok:true,account:current,balance:current.balance,currency:current.currency,loginid:current.loginid,mode:current.mode,account_type:current.account_type,account_id:current.account_id});}catch(e){fail(res,e)}})}
