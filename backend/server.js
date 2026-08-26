import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import crypto from 'node:crypto';
import WebSocket from 'ws';

const app = express();
const port = Number(process.env.PORT || 3000);
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'https://goonfx.com';
const DERIV_CLIENT_ID = process.env.DERIV_CLIENT_ID;
const DERIV_CLIENT_SECRET = process.env.DERIV_CLIENT_SECRET;
const DERIV_REDIRECT_URI = process.env.DERIV_REDIRECT_URI || 'https://goonfx.com/callback.html';
const DERIV_APP_ID = process.env.DERIV_APP_ID;
const sessions = new Map();

app.set('trust proxy', 1);
app.use(cors({ origin: FRONTEND_ORIGIN, credentials: true }));
app.use(express.json({ limit: '100kb' }));
app.get('/health', (_req, res) => res.json({ ok: true, service: 'goonfx-api' }));

function cookieSid(req) { return (req.headers.cookie || '').match(/(?:^|; )gx_sid=([^;]+)/)?.[1] || null; }
async function accountToken(req) {
  const id = cookieSid(req), s = id ? sessions.get(id) : null;
  if (!s || s.expires_at <= Date.now()) { if (id) sessions.delete(id); return null; }
  return s.access_token;
}
async function derivToken(body) {
  const r = await fetch('https://auth.deriv.com/oauth2/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(body)});
  const text=await r.text(); let data; try{data=JSON.parse(text)}catch{data={error:text}}; if(!r.ok)throw new Error(data.error_description||data.error||'Deriv token exchange failed'); return data;
}
app.post('/api/oauth/exchange',async(req,res)=>{try{if(!DERIV_CLIENT_ID||!DERIV_CLIENT_SECRET||!DERIV_REDIRECT_URI)throw new Error('OAuth backend environment is incomplete');const{code,code_verifier,redirect_uri,client_id}=req.body||{};if(!code||!code_verifier||redirect_uri!==DERIV_REDIRECT_URI||client_id!==DERIV_CLIENT_ID)throw new Error('Invalid OAuth exchange parameters');const token=await derivToken({grant_type:'authorization_code',client_id:DERIV_CLIENT_ID,client_secret:DERIV_CLIENT_SECRET,code,code_verifier,redirect_uri:DERIV_REDIRECT_URI});const id=crypto.randomUUID(),maxAge=Number(token.expires_in||3600);sessions.set(id,{access_token:token.access_token,expires_at:Date.now()+maxAge*1000});res.setHeader('Set-Cookie',`gx_sid=${id}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=${maxAge}`);res.json({ok:true,expires_in:maxAge});}catch(e){console.error('OAuth exchange:',e.message);res.status(400).json({error:e.message});}});

async function derivApi(path, token, options={}) {
  const r=await fetch(`https://api.derivws.com${path}`,{...options,headers:{Authorization:`Bearer ${token}`,'Deriv-App-ID':DERIV_APP_ID,...(options.headers||{})}});
  const text=await r.text();let data;try{data=JSON.parse(text)}catch{data={raw:text}};if(!r.ok)throw Object.assign(new Error(data.message||data.error||'Deriv API error'),{status:r.status,data});return data;
}
app.get('/api/account',async(req,res)=>{try{const token=await accountToken(req);if(!token)return res.status(401).json({error:'Not connected'});if(!DERIV_APP_ID)return res.status(500).json({error:'DERIV_APP_ID is not configured'});const upstream=await derivApi('/trading/v1/options/accounts',token);const accounts=Array.isArray(upstream.data)?upstream.data:(upstream.data?[upstream.data]:[]);const first=accounts[0]||{};res.json({...upstream,accounts,balance:first.balance??null,currency:first.currency??null,account_id:first.account_id??null,status:first.status??null,account_type:first.account_type??null});}catch(e){res.status(e.status||502).json(e.data||{error:e.message});}});

function wsRequest(token, payload){return new Promise((resolve,reject)=>{const ws=new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=${encodeURIComponent(DERIV_APP_ID)}`);const timer=setTimeout(()=>{try{ws.close()}catch{}reject(new Error('Deriv WebSocket timeout'))},15000);ws.on('open',()=>ws.send(JSON.stringify({...payload,authorize:payload.authorize||undefined,token:undefined})));ws.on('message',raw=>{let d;try{d=JSON.parse(raw)}catch{return}if(d.error){clearTimeout(timer);ws.close();reject(Object.assign(new Error(d.error.message||'Deriv WebSocket error'),{data:d}));return}if(d.msg_type==='authorize' || payload.proposal || payload.buy || payload.sell || payload.portfolio || payload.proposal_open_contract){clearTimeout(timer);ws.close();resolve(d)}});ws.on('error',e=>{clearTimeout(timer);reject(e)});ws.on('close',()=>{});});}

async function authorizedWs(token,payload){return new Promise((resolve,reject)=>{const ws=new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=${encodeURIComponent(DERIV_APP_ID)}`);let stage='auth';const timer=setTimeout(()=>{try{ws.close()}catch{}reject(new Error('Deriv WebSocket timeout'))},15000);ws.on('open',()=>ws.send(JSON.stringify({authorize:token})));ws.on('message',raw=>{let d;try{d=JSON.parse(raw)}catch{return}if(d.error){clearTimeout(timer);ws.close();return reject(Object.assign(new Error(d.error.message||'Deriv WebSocket error'),{data:d}))}if(stage==='auth'){stage='request';ws.send(JSON.stringify(payload));return}clearTimeout(timer);ws.close();resolve(d)});ws.on('error',e=>{clearTimeout(timer);reject(e)});});}

app.post('/api/proposal',async(req,res)=>{try{const token=await accountToken(req);if(!token)return res.status(401).json({error:'Not connected'});const{symbol='R_100',contract_type,stake='1',barrier,duration=1,duration_unit='t',currency='USD'}=req.body||{};if(!['DIGITOVER','DIGITUNDER','DIGITEVEN','DIGITODD'].includes(contract_type))return res.status(400).json({error:'Unsupported digit contract type'});const p={proposal:1,amount:Number(stake),basis:'stake',contract_type,currency,duration:Number(duration),duration_unit,symbol};if(barrier!==undefined&&barrier!=='')p.barrier=String(barrier);const result=await authorizedWs(token,p);res.json(result);}catch(e){res.status(400).json({error:e.message,details:e.data||null});}});

app.post('/api/buy',async(req,res)=>{try{const token=await accountToken(req);if(!token)return res.status(401).json({error:'Not connected'});const{proposal_id,price}=req.body||{};if(!proposal_id)return res.status(400).json({error:'proposal_id is required'});const result=await authorizedWs(token,{buy:String(proposal_id),price:Number(price)});res.json(result);}catch(e){res.status(400).json({error:e.message,details:e.data||null});}});

app.post('/api/bulk/preview',async(req,res)=>{const orders=Array.isArray(req.body?.orders)?req.body.orders:[];if(!orders.length)return res.status(400).json({error:'orders must be a non-empty array'});if(orders.length>100)return res.status(400).json({error:'Maximum 100 orders'});res.json({ok:true,count:orders.length,orders});});

app.listen(port,'0.0.0.0',()=>console.log(`GOON FX API listening on ${port}`));
