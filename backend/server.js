import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import crypto from 'node:crypto';

const app=express();
const port=process.env.PORT||3000;
const FRONTEND_ORIGIN=process.env.FRONTEND_ORIGIN||'https://goonfx.com';
const DERIV_CLIENT_ID=process.env.DERIV_CLIENT_ID;
const DERIV_CLIENT_SECRET=process.env.DERIV_CLIENT_SECRET;
const DERIV_REDIRECT_URI=process.env.DERIV_REDIRECT_URI||'https://goonfx.com/callback.html';
const DERIV_APP_ID=process.env.DERIV_APP_ID;
const sessions=new Map();
app.use(cors({origin:FRONTEND_ORIGIN,credentials:true}));
app.use(express.json({limit:'50kb'}));
app.get('/health',(_,res)=>res.json({ok:true}));
function cookieSid(req){return (req.headers.cookie||'').match(/(?:^|; )gx_sid=([^;]+)/)?.[1]||null}
async function derivToken(body){const r=await fetch('https://auth.deriv.com/oauth2/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(body)});const text=await r.text();let data;try{data=JSON.parse(text)}catch{data={error:text}}if(!r.ok)throw new Error(data.error_description||data.error||'Deriv token exchange failed');return data}
app.post('/api/oauth/exchange',async(req,res)=>{try{if(!DERIV_CLIENT_ID||!DERIV_CLIENT_SECRET)throw new Error('Backend Deriv OAuth environment variables are not configured');const {code,code_verifier,redirect_uri,client_id}=req.body||{};if(!code||!code_verifier||!redirect_uri||client_id!==DERIV_CLIENT_ID||redirect_uri!==DERIV_REDIRECT_URI)throw new Error('Invalid OAuth exchange parameters');const token=await derivToken({grant_type:'authorization_code',code,client_id:DERIV_CLIENT_ID,client_secret:DERIV_CLIENT_SECRET,redirect_uri:DERIV_REDIRECT_URI,code_verifier});const id=crypto.randomUUID();sessions.set(id,{access_token:token.access_token,expires_at:Date.now()+((token.expires_in||3600)*1000)});res.setHeader('Set-Cookie',`gx_sid=${id}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=${token.expires_in||3600}`);res.json({ok:true,expires_in:token.expires_in||3600})}catch(e){res.status(400).json({error:e.message})}});
async function accountToken(req){const id=cookieSid(req);const s=id?sessions.get(id):null;if(!s||s.expires_at<Date.now())return null;return s.access_token}
app.get('/api/account',async(req,res)=>{try{const token=await accountToken(req);if(!token)return res.status(401).json({error:'Not connected'});const headers={'Authorization':`Bearer ${token}`,'Deriv-App-ID':DERIV_APP_ID};const r=await fetch('https://api.derivws.com/trading/v1/options/accounts',{headers});const text=await r.text();res.status(r.status).type('application/json').send(text)}catch(e){res.status(502).json({error:e.message})}});
app.listen(port,()=>console.log(`GOON FX API listening on ${port}`));