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
// Deriv application ID is public client configuration; keep environment overrides for deployments.
const APP_ID = process.env.DERIV_APP_ID || process.env.DERIV_CLIENT_ID || '34b2ctEChXoL5t579q8pB';
const CLIENT_ID = process.env.DERIV_CLIENT_ID || APP_ID;
const REDIRECT_URI = process.env.DERIV_REDIRECT_URI || 'https://goonfx.com/callback.html';
// SESSION_SECRET is optional. When present we encrypt the session cookie; otherwise the bearer token
// remains HttpOnly/Secure/SameSite and is never exposed to browser JavaScript.
const SESSION_SECRET = process.env.SESSION_SECRET || '';
const DERIV_WS = `wss://ws.derivws.com/websockets/v3?app_id=${encodeURIComponent(APP_ID)}`;

app.set('trust proxy', 1);
app.use(cors({ origin: ORIGIN, credentials: true, methods: ['GET', 'POST', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization'] }));
app.use(express.json({ limit: '300kb' }));
app.use(express.static(FRONTEND_DIR, { index: 'index.html' }));

const required = [];
function missing() { return required.filter(k => !process.env[k]); }
function ready() { return Boolean(APP_ID && CLIENT_ID && REDIRECT_URI); }

function key() { return crypto.createHash('sha256').update(SESSION_SECRET).digest(); }
function seal(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64url');
}
function unseal(value) {
  const b = Buffer.from(value, 'base64url');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key(), b.subarray(0, 12));
  decipher.setAuthTag(b.subarray(12, 28));
  return Buffer.concat([decipher.update(b.subarray(28)), decipher.final()]).toString('utf8');
}
function tokenFromRequest(req) {
  const raw = (req.headers.cookie || '').match(/(?:^|; )gx_token=([^;]+)/)?.[1];
  if (!raw) return null;
  try {
    const encoded = decodeURIComponent(raw);
    const data = SESSION_SECRET
      ? JSON.parse(unseal(encoded))
      : JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    return data.exp > Date.now() ? data.token : null;
  } catch { return null; }
}
function setSession(res, token, expiresIn = 3600) {
  const maxAge = Math.min(Math.max(Number(expiresIn) || 3600, 300), 86400);
  const payload = JSON.stringify({ token, exp: Date.now() + maxAge * 1000 });
  const value = SESSION_SECRET ? seal(payload) : Buffer.from(payload, 'utf8').toString('base64url');
  res.setHeader('Set-Cookie', `gx_token=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`);
}
function clearSession(res) { res.setHeader('Set-Cookie', 'gx_token=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0'); }
function error(res, e, status = 400) { res.status(e.status || status).json({ error: e.message || 'Request failed', details: e.data || null }); }

function derivSocket(token, request, timeout = 15000) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(DERIV_WS);
    let finished = false;
    let timer;
    const finish = (fn, value) => { if (finished) return; finished = true; clearTimeout(timer); try { ws.close(); } catch {} fn(value); };
    timer = setTimeout(() => finish(reject, new Error('Deriv connection timed out')), timeout);
    ws.on('open', () => ws.send(JSON.stringify({ authorize: token, req_id: 1 })));
    ws.on('message', raw => {
      let auth;
      try { auth = JSON.parse(raw); } catch { return; }
      if (auth.error) return finish(reject, Object.assign(new Error(auth.error.message || 'Deriv authorization failed'), { data: auth }));
      if (auth.msg_type !== 'authorize') return;
      ws.send(JSON.stringify({ ...request, req_id: 2 }));
      ws.once('message', raw2 => {
        let result;
        try { result = JSON.parse(raw2); } catch { return finish(reject, new Error('Invalid Deriv response')); }
        if (result.error) return finish(reject, Object.assign(new Error(result.error.message || 'Deriv request failed'), { data: result }));
        finish(resolve, { auth, result });
      });
    });
    ws.on('error', e => finish(reject, e));
    ws.on('close', () => { if (!finished) finish(reject, new Error('Deriv connection closed')); });
  });
}

function tradeSocket(token, proposalPayload, timeout = 20000) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(DERIV_WS);
    let phase = 'authorize';
    let finished = false;
    let timer;
    let proposal;
    let req = 1;
    const finish = (fn, value) => { if (finished) return; finished = true; clearTimeout(timer); try { ws.close(); } catch {} fn(value); };
    timer = setTimeout(() => finish(reject, new Error('Deriv trade connection timed out')), timeout);
    ws.on('open', () => ws.send(JSON.stringify({ authorize: token, req_id: req++ })));
    ws.on('message', raw => {
      let d; try { d = JSON.parse(raw); } catch { return; }
      if (d.error) return finish(reject, Object.assign(new Error(d.error.message || 'Deriv trading error'), { data: d }));
      if (phase === 'authorize' && d.msg_type === 'authorize') {
        phase = 'proposal';
        ws.send(JSON.stringify({ ...proposalPayload, subscribe: 0, req_id: req++ }));
        return;
      }
      if (phase === 'proposal' && d.msg_type === 'proposal') {
        proposal = d.proposal;
        const id = proposal?.id;
        const price = Number(proposal?.ask_price);
        if (!id || !Number.isFinite(price) || price <= 0) return finish(reject, new Error('Deriv returned an invalid proposal'));
        phase = 'buy';
        ws.send(JSON.stringify({ buy: String(id), price, req_id: req++ }));
        return;
      }
      if (phase === 'buy' && d.msg_type === 'buy') {
        if (!d.buy?.contract_id) return finish(reject, new Error('Deriv did not confirm the trade'));
        finish(resolve, { proposal, buy: d.buy });
      }
    });
    ws.on('error', e => finish(reject, e));
    ws.on('close', () => { if (!finished) finish(reject, new Error('Deriv trading connection closed before completion')); });
  });
}

const TYPES = new Set(['DIGITEVEN', 'DIGITODD', 'DIGITOVER', 'DIGITUNDER', 'DIGITMATCH', 'DIGITDIFF']);
function contractParams(body, account) {
  const type = String(body.contract_type || '').toUpperCase();
  if (!TYPES.has(type)) throw new Error('Only Over, Under, Even, and Odd are enabled on the Manual Trader.');
  const amount = Number(body.amount ?? body.stake);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Enter a valid stake.');
  const symbol = String(body.underlying_symbol || body.symbol || '').trim();
  if (!symbol) throw new Error('Select a Deriv market.');
  const duration = Math.max(1, Math.floor(Number(body.duration || 1)));
  const unit = String(body.duration_unit || 't');
  const p = { proposal: 1, amount, basis: 'stake', contract_type: type, currency: account.currency || 'USD', underlying_symbol: symbol, duration, duration_unit: unit };
  if (['DIGITOVER', 'DIGITUNDER'].includes(type)) {
    const barrier = String(body.barrier ?? body.digit ?? '');
    if (!/^\d$/.test(barrier)) throw new Error('Over and Under require a digit from 0 to 9.');
    p.barrier = barrier;
  }
  return p;
}

app.get('/health', (_, res) => res.json({ ok: true, service: 'goonfx-api', oauth: ready(), trading: ready(), missing: missing(), session_mode: SESSION_SECRET ? 'encrypted-cookie' : 'http-only-bearer-cookie' }));
app.get('/api/oauth/config', (_, res) => res.json({ ok: true, client_id: CLIENT_ID, app_id: APP_ID, redirect_uri: REDIRECT_URI, scope: 'trade', backend_ready: ready(), missing: missing() }));

app.post('/api/oauth/exchange', async (req, res) => {
  try {
    if (!ready()) throw new Error(`OAuth backend is incomplete: ${missing().join(', ')}`);
    const { code, code_verifier, redirect_uri, client_id } = req.body || {};
    if (!code || !code_verifier) throw new Error('Authorization code or PKCE verifier is missing.');
    if (redirect_uri !== REDIRECT_URI || client_id !== CLIENT_ID) throw new Error('OAuth configuration mismatch.');
    const body = new URLSearchParams({ grant_type: 'authorization_code', client_id: CLIENT_ID, code, code_verifier, redirect_uri });
    const response = await fetch('https://auth.deriv.com/oauth2/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
    const text = await response.text(); let data; try { data = JSON.parse(text); } catch { data = { error: text }; }
    if (!response.ok || !data.access_token) { const e = new Error(data.error_description || data.error || `OAuth exchange failed (${response.status})`); e.status = response.status; e.data = data; throw e; }
    setSession(res, data.access_token, data.expires_in);
    res.json({ ok: true, expires_in: data.expires_in || 3600 });
  } catch (e) { error(res, e); }
});
app.post('/api/logout', (_, res) => { clearSession(res); res.json({ ok: true }); });

app.get('/api/account', async (req, res) => {
  try {
    const token = tokenFromRequest(req); if (!token) return res.status(401).json({ error: 'Not connected to Deriv.' });
    const { auth } = await derivSocket(token, { balance: 1, subscribe: 0 });
    const a = auth?.authorize;
    res.json({ ok: true, account: a, balance: a?.balance ?? null, currency: a?.currency ?? null, loginid: a?.loginid ?? null });
  } catch (e) { error(res, e, 502); }
});
app.get('/api/balance', async (req, res) => {
  try {
    const token = tokenFromRequest(req); if (!token) return res.status(401).json({ error: 'Not connected to Deriv.' });
    const { result } = await derivSocket(token, { balance: 1, subscribe: 0 });
    res.json({ ok: true, balance: result.balance || null });
  } catch (e) { error(res, e, 502); }
});

app.get('/api/markets', async (_, res) => {
  try {
    const ws = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=${encodeURIComponent(APP_ID)}`);
    const result = await new Promise((resolve, reject) => { const t = setTimeout(() => reject(new Error('Market feed timeout')), 12000); ws.on('open', () => ws.send(JSON.stringify({ active_symbols: 'brief', product_type: 'basic', req_id: 1 }))); ws.on('message', r => { clearTimeout(t); try { resolve(JSON.parse(r)); } catch (e) { reject(e); } try { ws.close(); } catch {} }); ws.on('error', reject); });
    if (result.error) throw new Error(result.error.message); res.json({ ok: true, markets: result.active_symbols || [] });
  } catch (e) { error(res, e, 502); }
});
app.get('/api/markets/:symbol/ticks', async (req, res) => {
  try {
    const ws = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=${encodeURIComponent(APP_ID)}`);
    const count = Math.min(Math.max(Number(req.query.count || 150), 10), 1000);
    const result = await new Promise((resolve, reject) => { const t = setTimeout(() => reject(new Error('Tick feed timeout')), 12000); ws.on('open', () => ws.send(JSON.stringify({ ticks_history: req.params.symbol, count, end: 'latest', style: 'ticks', req_id: 1 }))); ws.on('message', r => { clearTimeout(t); try { resolve(JSON.parse(r)); } catch (e) { reject(e); } try { ws.close(); } catch {} }); ws.on('error', reject); });
    if (result.error) throw new Error(result.error.message); res.json({ ok: true, symbol: req.params.symbol, history: result.history || null, times: result.times || null });
  } catch (e) { error(res, e, 502); }
});

app.post('/api/proposal', async (req, res) => {
  try {
    const token = tokenFromRequest(req); if (!token) return res.status(401).json({ error: 'Not connected to Deriv.' });
    const { auth, result } = await derivSocket(token, contractParams(req.body || {}, authAccountPlaceholder()));
    res.json({ ok: true, proposal: result.proposal, account: auth.authorize });
  } catch (e) { error(res, e); }
});

function authAccountPlaceholder() { return { currency: 'USD' }; }
async function authenticatedTradeRequest(token, body, execute = true) {
  const initial = await new Promise((resolve, reject) => {
    const ws = new WebSocket(DERIV_WS); const t = setTimeout(() => { try { ws.close(); } catch {} reject(new Error('Deriv authorization timeout')); }, 15000);
    ws.on('open', () => ws.send(JSON.stringify({ authorize: token, req_id: 1 })));
    ws.on('message', r => { clearTimeout(t); try { const d = JSON.parse(r); if (d.error) return reject(Object.assign(new Error(d.error.message), { data: d })); if (d.msg_type === 'authorize') { try { ws.close(); } catch {} resolve(d.authorize); } } catch (e) { reject(e); } }); ws.on('error', reject);
  });
  const params = contractParams(body, initial);
  if (!execute) return { account: initial, proposal: await new Promise((resolve, reject) => { const ws = new WebSocket(DERIV_WS); const t = setTimeout(() => { try { ws.close(); } catch {} reject(new Error('Proposal timeout')); }, 15000); ws.on('open', () => { ws.send(JSON.stringify({ authorize: token, req_id: 1 })); }); ws.on('message', r => { try { const d = JSON.parse(r); if (d.error) { clearTimeout(t); try { ws.close(); } catch {} return reject(Object.assign(new Error(d.error.message), { data: d })); } if (d.msg_type === 'authorize') ws.send(JSON.stringify({ ...params, req_id: 2 })); else if (d.msg_type === 'proposal') { clearTimeout(t); try { ws.close(); } catch {} resolve(d.proposal); } } catch (e) { reject(e); } }); ws.on('error', reject); }) };
  const result = await tradeSocket(token, params); return { account: initial, ...result };
}

app.post('/api/proposal-real', async (req, res) => { try { const token = tokenFromRequest(req); if (!token) return res.status(401).json({ error: 'Not connected to Deriv.' }); res.json({ ok: true, ...(await authenticatedTradeRequest(token, req.body || {}, false)) }); } catch (e) { error(res, e); } });
app.post('/api/trade', async (req, res) => { try { const token = tokenFromRequest(req); if (!token) return res.status(401).json({ error: 'Not connected to Deriv.' }); const result = await authenticatedTradeRequest(token, req.body || {}, true); res.json({ ok: true, executed: true, contract_id: result.buy.contract_id, buy: result.buy, proposal: result.proposal, account: result.account }); } catch (e) { error(res, e); } });
app.post('/api/buy', async (req, res) => { try { const token = tokenFromRequest(req); if (!token) return res.status(401).json({ error: 'Not connected to Deriv.' }); if (!req.body?.proposal_id || !Number(req.body?.price)) throw new Error('A valid proposal ID and price are required.'); const { result } = await derivSocket(token, { buy: String(req.body.proposal_id), price: Number(req.body.price) }); res.json({ ok: true, executed: Boolean(result.buy?.contract_id), ...result }); } catch (e) { error(res, e); } });

app.get('*', (req, res, next) => { if (req.path.startsWith('/api/')) return next(); res.sendFile(path.join(FRONTEND_DIR, req.path === '/' ? 'index.html' : req.path.replace(/^\//, '')), err => { if (err) res.sendFile(path.join(FRONTEND_DIR, 'index.html')); }); });

export default app;
