import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import WebSocket from 'ws';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FRONTEND_DIR = path.resolve(__dirname, '../docs');
const ORIGIN = (process.env.FRONTEND_ORIGIN || 'https://goonfx.com').replace(/\/$/, '');
const APP_ID = process.env.DERIV_APP_ID || process.env.DERIV_CLIENT_ID || '';
const CLIENT_ID = process.env.DERIV_CLIENT_ID || APP_ID;
const REDIRECT_URI = process.env.DERIV_REDIRECT_URI || 'https://goonfx.com/callback.html';
const SESSION_SECRET = process.env.SESSION_SECRET || '';
const REST = 'https://api.derivws.com';
const required = ['DERIV_APP_ID','DERIV_CLIENT_ID','DERIV_REDIRECT_URI','SESSION_SECRET'];

app.set('trust proxy', 1);
app.use(cors({origin:ORIGIN,credentials:true,methods:['GET','POST','OPTIONS'],allowedHeaders:['Content-Type','Authorization']}));
app.use(express.json({limit:'300kb'}));
app.use(express.static(FRONTEND_DIR,{index:'index.html'}));

const missing=()=>required.filter(k=>!process.env[k] && !(k==='DERIV_CLIENT_ID'&&APP_ID));
const ready=()=>Boolean(APP_ID&&CLIENT_ID&&REDIRECT_URI&&SESSION_SECRET);
const key=()=>crypto.createHash('sha256').update(SESSION_SECRET).digest();
function seal(v){const iv=crypto.randomBytes(12);const c=crypto.createCipheriv('aes-256-gcm',key(),iv);const e=Buffer.concat([c.update(v,'utf8'),c.final()]);return Buffer.concat([iv,c.getAuthTag(),e]).toString('base64url')}
function unseal(v){const b=Buffer.from(v,'base64url');const d=crypto.createDecipheriv('aes-256-gcm',key(),b.subarray(0,12));d.setAuthTag(b.subarray(12,28));return Buffer.concat([d.update(b.subarray(28)),d.final()]).toString('utf8')}
function tokenFromRequest(req){const raw=(req.headers.cookie||'').match(/(?:^|; )gx_token=([^;]+)/)?.[1];if(!raw||!SESSION_SECRET)return null;try{const d=JSON.parse(unseal(raw));return d.exp>Date.now()?d.token:null}catch{return null}}
function setSession(res,token,expires=3600){const max=Math.min(Math.max(Number(expires)||3600,300),86400);res.setHeader('Set-Cookie',`gx_token=${seal(JSON.stringify({token,exp:Date.now()+max*1000}))}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${max}`)}
function clearSession(res){res.setHeader('Set-Cookie','gx_token=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0')}
function fail(res,e,status=400){res.status(e.status||status).json({error:e.message||'Request failed',details:e.data||null})}

async function derivFetch(token,path,options={}){
  const r=await fetch(REST+path,{...options,headers:{'Deriv-App-ID':APP_ID,'Authorization':`Bearer ${token}`,'Content-Type':'application/json',...(options.headers||{})}});
  const text=await r.text();let data={};try{data=text?JSON.parse(text):{}}catch{data={error:text}};
  if(!r.ok){const msg=data?.errors?.[0]?.message||data?.error_description||data?.error||`Deriv REST ${r.status}`;const e=new Error(msg);e.status=r.status;e.data=data;throw e}return data;
}
async function accounts(token){const d=await derivFetch(token,'/trading/v1/options/accounts');const a=Array.isArray(d.data)?d.data:(d.data?[d.data]:[]);return a}
async function accountFor(token,requested){const list=await accounts(token);const wanted=String(requested||'demo').toLowerCase();const byId=list.find(a=>String(a.account_id||'').toLowerCase()===wanted);if(byId)return byId;const byType=list.find(a=>String(a.account_type||'').toLowerCase()===wanted&&String(a.status||'active').toLowerCase()==='active');if(byType)return byType;throw new Error(`No active ${wanted} Deriv Options account is available.`)}
async function otpUrl(token,accountId){const d=await derivFetch(token,`/trading/v1/options/accounts/${encodeURIComponent(accountId)}/otp`,{method:'POST'});const url=d?.data?.url;if(!url)throw new Error('Deriv did not return an authenticated trading WebSocket URL.');return url}

function contractParams(body,account){const type=String(body.contract_type||'').toUpperCase();const allowed=new Set(['DIGITEVEN','DIGITODD','DIGITOVER','DIGITUNDER','DIGITMATCH','DIGITDIFF','HIGHER','LOWER','UPORDOWN','ONETOUCH','NOTOUCH','MULTUP','MULTDOWN']);if(!allowed.has(type))throw new Error(`Contract type ${type||'(empty)'} is not enabled.`);const amount=Number(body.amount??body.stake);if(!Number.isFinite(amount)||amount<=0)throw new Error('Enter a valid stake.');if(amount>Number(body.max_stake||1000))throw new Error('Stake exceeds the GOON FX safety limit.');const symbol=String(body.underlying_symbol||body.symbol||'').trim();if(!symbol)throw new Error('Select a Deriv market.');const duration=Math.max(1,Math.floor(Number(body.duration||1)));const unit=String(body.duration_unit||'t');if(!['t','s','m','h','d'].includes(unit))throw new Error('Invalid duration unit.');const p={amount,basis:'stake',contract_type:type,currency:account.currency||'USD',underlying_symbol:symbol,duration,duration_unit:unit};if(['DIGITOVER','DIGITUNDER','DIGITMATCH','DIGITDIFF'].includes(type)){const barrier=String(body.barrier??body.digit??'');if(!/^\d$/.test(barrier))throw new Error('This contract requires a digit from 0 to 9.');p.barrier=barrier}if(['HIGHER','LOWER','ONETOUCH','NOTOUCH'].includes(type)){const barrier=String(body.barrier??'');if(!barrier)throw new Error('This contract requires a barrier.');p.barrier=barrier}if(['MULTUP','MULTDOWN'].includes(type)){const multiplier=Number(body.multiplier||10);if(!Number.isFinite(multiplier)||multiplier<=0)throw new Error('Enter a valid multiplier.');p.multiplier=multiplier}return p}

async function tradeOnAccount(wsUrl,params){return await new Promise((resolve,reject)=>{const ws=new WebSocket(wsUrl);let phase='open',proposal=null,done=false,timer;let id=1;const finish=(fn,v)=>{if(done)return;done=true;clearTimeout(timer);try{ws.close()}catch{}fn(v)};timer=setTimeout(()=>finish(reject,new Error('Deriv trading connection timed out')),25000);ws.on('open',()=>{phase='proposal';ws.send(JSON.stringify({proposal:1,...params,subscribe:0,req_id:id++}))});ws.on('message',raw=>{let d;try{d=JSON.parse(raw)}catch{return}if(d.error)return finish(reject,Object.assign(new Error(d.error.message||'Deriv trade rejected'),{data:d}));if(phase==='proposal'&&d.msg_type==='proposal'){proposal=d.proposal;const pid=proposal?.id;const price=Number(proposal?.ask_price);if(!pid||!Number.isFinite(price)||price<=0)return finish(reject,new Error('Deriv returned an invalid price for this trade.'));phase='buy';ws.send(JSON.stringify({buy:String(pid),price,req_id:id++}));return}if(phase==='buy'&&d.msg_type==='buy'){if(!d.buy?.contract_id)return finish(reject,new Error('Deriv did not return a contract ID.'));finish(resolve,{proposal,buy:d.buy})}});ws.on('error',e=>finish(reject,e));ws.on('close',()=>{if(!done)finish(reject,new Error('Deriv trading connection closed before confirmation'))})})}

app.get('/health',(_,res)=>res.json({ok:true,service:'goonfx-api',oauth:ready(),trading:ready(),missing:missing(),mode:'demo-and-real'}));
app.get('/api/oauth/config',(_,res)=>res.json({ok:true,client_id:CLIENT_ID,app_id:APP_ID,redirect_uri:REDIRECT_URI,scope:'trade',backend_ready:ready(),missing:missing()}));
app.post('/api/oauth/exchange',async(req,res)=>{try{if(!ready())throw new Error(`OAuth backend is incomplete: ${missing().join(', ')}`);const {code,code_verifier,redirect_uri,client_id}=req.body||{};if(!code||!code_verifier)throw new Error('Authorization code or PKCE verifier is missing.');if(redirect_uri!==REDIRECT_URI||client_id!==CLIENT_ID)throw new Error('OAuth configuration mismatch.');const body=new URLSearchParams({grant_type:'authorization_code',client_id:CLIENT_ID,code,code_verifier,redirect_uri});const r=await fetch('https://auth.deriv.com/oauth2/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body});const text=await r.text();let d;try{d=JSON.parse(text)}catch{d={error:text}}if(!r.ok||!d.access_token){const e=new Error(d.error_description||d.error||`OAuth exchange failed (${r.status})`);e.status=r.status;e.data=d;throw e}setSession(res,d.access_token,d.expires_in);res.json({ok:true,expires_in:d.expires_in||3600})}catch(e){fail(res,e)}});
app.post('/api/logout',(_,res)=>{clearSession(res);res.json({ok:true})});

app.get('/api/accounts',async(req,res)=>{try{const token=tokenFromRequest(req);if(!token)return res.status(401).json({error:'Not connected to Deriv.'});const a=await accounts(token);res.json({ok:true,accounts:a.map(x=>({account_id:x.account_id,account_type:x.account_type,balance:x.balance,currency:x.currency,status:x.status}))})}catch(e){fail(res,e,502)}});
app.get('/api/account',async(req,res)=>{try{const token=tokenFromRequest(req);if(!token)return res.status(401).json({error:'Not connected to Deriv.'});const a=await accountFor(token,req.query.account_type||'demo');res.json({ok:true,account:a,balance:a.balance??null,currency:a.currency??null,account_type:a.account_type??null,account_id:a.account_id??null})}catch(e){fail(res,e,502)}});
app.get('/api/balance',async(req,res)=>{try{const token=tokenFromRequest(req);if(!token)return res.status(401).json({error:'Not connected to Deriv.'});const a=await accountFor(token,req.query.account_type||'demo');res.json({ok:true,balance:a.balance??null,currency:a.currency??null,account_type:a.account_type,account_id:a.account_id})}catch(e){fail(res,e,502)}});
app.post('/api/demo/reset',async(req,res)=>{try{const token=tokenFromRequest(req);if(!token)return res.status(401).json({error:'Not connected to Deriv.'});const a=await accountFor(token,'demo');await derivFetch(token,`/trading/v1/options/accounts/${encodeURIComponent(a.account_id)}/reset-demo-balance`,{method:'POST'});const updated=await accountFor(token,a.account_id);res.json({ok:true,account:updated,balance:updated.balance??null})}catch(e){fail(res,e,502)}});

app.get('/api/markets',async(_,res)=>{try{const ws=new WebSocket('wss://api.derivws.com/trading/v1/options/ws/public');const result=await new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(new Error('Market feed timeout')),12000);ws.on('open',()=>ws.send(JSON.stringify({active_symbols:'brief',req_id:1})));ws.on('message',r=>{clearTimeout(t);try{resolve(JSON.parse(r))}catch(e){reject(e)}try{ws.close()}catch{}});ws.on('error',reject)});if(result.error)throw new Error(result.error.message);res.json({ok:true,markets:result.active_symbols||result.data||[]})}catch(e){fail(res,e,502)}});

app.post('/api/trade',async(req,res)=>{try{const token=tokenFromRequest(req);if(!token)return res.status(401).json({error:'Not connected to Deriv. Connect your Deriv account first.'});const requested=String(req.body?.account_id||req.body?.account_type||'demo').toLowerCase();const account=await accountFor(token,requested);const params=contractParams(req.body||{},account);const wsUrl=await otpUrl(token,account.account_id);const result=await tradeOnAccount(wsUrl,params);res.json({ok:true,executed:true,account:{account_id:account.account_id,account_type:account.account_type,balance:account.balance,currency:account.currency},contract_id:result.buy.contract_id,transaction_id:result.buy.transaction_id||null,buy_price:result.buy.buy_price||result.proposal.ask_price,payout:result.buy.payout||result.proposal.payout,proposal:undefined,buy:result.buy})}catch(e){fail(res,e,502)}});

app.post('/api/proposal',async(req,res)=>{try{const token=tokenFromRequest(req);if(!token)return res.status(401).json({error:'Not connected to Deriv.'});const account=await accountFor(token,req.body?.account_id||req.body?.account_type||'demo');const params=contractParams(req.body||{},account);const url=await otpUrl(token,account.account_id);const p=await new Promise((resolve,reject)=>{const ws=new WebSocket(url);const t=setTimeout(()=>{try{ws.close()}catch{}reject(new Error('Proposal timeout'))},15000);ws.on('open',()=>ws.send(JSON.stringify({proposal:1,...params,subscribe:0,req_id:1})));ws.on('message',r=>{try{const d=JSON.parse(r);if(d.error){clearTimeout(t);try{ws.close()}catch{}return reject(Object.assign(new Error(d.error.message),{data:d}))}if(d.msg_type==='proposal'){clearTimeout(t);try{ws.close()}catch{}resolve(d.proposal)}}catch(e){reject(e)}});ws.on('error',reject)});res.json({ok:true,account,proposal:p})}catch(e){fail(res,e,502)}});

app.listen(process.env.PORT||3000,'0.0.0.0',()=>console.log(`GOON FX API listening on ${process.env.PORT||3000}`));
