import './api/runtime-env.js';
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
const FRONTEND_ORIGIN = (process.env.FRONTEND_ORIGIN || 'https://goonfx.com').replace(/\/$/, '');
const DERIV_CLIENT_ID = process.env.DERIV_CLIENT_ID || '';
const DERIV_CLIENT_SECRET = process.env.DERIV_CLIENT_SECRET || '';
const DERIV_REDIRECT_URI = process.env.DERIV_REDIRECT_URI || 'https://goonfx.com/callback.html';
const DERIV_APP_ID = process.env.DERIV_APP_ID || DERIV_CLIENT_ID;
const SESSION_SECRET = process.env.SESSION_SECRET || '';
const PUBLIC_WS = 'wss://api.derivws.com/trading/v1/options/ws/public';
const DERIV_API = 'https://api.derivws.com';
const FRONTEND_DIR = path.resolve(__dirname, '../docs');

app.set('trust proxy', 1);
app.use(cors({
  origin: FRONTEND_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '300kb' }));
app.use(express.static(FRONTEND_DIR, { index: 'index.html', fallthrough: true }));

app.get('/', (req, res) => {
  if (req.hostname === 'api.goonfx.com') return res.json({ ok: true, service: 'GOON FX API', status: 'online' });
  return res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
});
app.get('/health', (_, res) => res.json({ ok: true, service: 'goonfx-api', trading: true }));

const key = () => crypto.createHash('sha256').update(SESSION_SECRET).digest();
function seal(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64url');
}
function open(value) {
  const b = Buffer.from(value, 'base64url');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key(), b.subarray(0, 12));
  decipher.setAuthTag(b.subarray(12, 28));
  return Buffer.concat([decipher.update(b.subarray(28)), decipher.final()]).toString('utf8');
}
function cookieToken(req) {
  const raw = (req.headers.cookie || '').match(/(?:^|; )gx_token=([^;]+)/)?.[1];
  if (!raw || !SESSION_SECRET) return null;
  try {
    const session = JSON.parse(open(raw));
    return session.exp > Date.now() ? session.token : null;
  } catch {
    return null;
  }
}
function setSession(res, token, expiresIn) {
  const maxAge = Math.min(Math.max(Number(expiresIn || 3600), 300), 86400);
  res.setHeader('Set-Cookie', `gx_token=${seal(JSON.stringify({ token, exp: Date.now() + maxAge * 1000 }))}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`);
  return maxAge;
}
function clearSession(res) {
  res.setHeader('Set-Cookie', 'gx_token=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
}
function fail(res, error, code = 400) {
  res.status(error.status || code).json({ error: error.message || 'Request failed', details: error.data || null });
}

async function derivToken({ code, code_verifier }) {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: DERIV_CLIENT_ID,
    code,
    code_verifier,
    redirect_uri: DERIV_REDIRECT_URI,
  });
  if (DERIV_CLIENT_SECRET) body.set('client_secret', DERIV_CLIENT_SECRET);
  const response = await fetch('https://auth.deriv.com/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const text = await response.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { error: text }; }
  if (!response.ok) {
    const error = new Error(data.error_description || data.error || `Deriv token exchange HTTP ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  if (!data.access_token) throw new Error('Deriv did not return an access token');
  return data;
}

app.get('/api/oauth/config', (_, res) => res.json({
  ok: true,
  client_id: DERIV_CLIENT_ID,
  redirect_uri: DERIV_REDIRECT_URI,
  scope: 'trade',
  backend_ready: Boolean(DERIV_CLIENT_ID && DERIV_REDIRECT_URI && SESSION_SECRET && DERIV_APP_ID),
}));

app.post('/api/oauth/exchange', async (req, res) => {
  try {
    if (!DERIV_CLIENT_ID || !DERIV_REDIRECT_URI || !SESSION_SECRET || !DERIV_APP_ID) throw new Error('OAuth backend is not configured');
    const { code, code_verifier, redirect_uri, client_id } = req.body || {};
    if (!code || !code_verifier) throw new Error('Authorization code or PKCE verifier is missing');
    if (redirect_uri !== DERIV_REDIRECT_URI || client_id !== DERIV_CLIENT_ID) throw new Error('OAuth client configuration mismatch');
    const token = await derivToken({ code, code_verifier });
    res.json({ ok: true, expires_in: setSession(res, token.access_token, token.expires_in) });
  } catch (error) {
    fail(res, error);
  }
});

app.post('/api/logout', (_, res) => {
  clearSession(res);
  res.json({ ok: true });
});

async function rest(endpoint, token, options = {}) {
  const response = await fetch(`${DERIV_API}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Deriv-App-ID': DERIV_APP_ID,
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  if (!response.ok) {
    const error = new Error(data?.errors?.[0]?.message || data?.message || `Deriv API HTTP ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

function ws(url, payload) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url);
    const timer = setTimeout(() => {
      try { socket.close(); } catch {}
      reject(new Error('Deriv WebSocket timeout'));
    }, 15000);
    let done = false;
    const finish = (fn, value) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      try { socket.close(); } catch {}
      fn(value);
    };
    socket.on('open', () => socket.send(JSON.stringify(payload)));
    socket.on('message', raw => {
      let data;
      try { data = JSON.parse(raw); } catch { return; }
      if (data.error) {
        const error = new Error(data.error.message || 'Deriv WebSocket error');
        error.data = data;
        return finish(reject, error);
      }
      finish(resolve, data);
    });
    socket.on('error', error => finish(reject, error));
  });
}

async function accounts(token) {
  const data = await rest('/trading/v1/options/accounts', token);
  const list = data?.data;
  return Array.isArray(list) ? list : list ? [list] : [];
}
async function resolveAccount(token, accountId) {
  const list = await accounts(token);
  if (!list.length) throw new Error('No Deriv Options account is available');
  if (accountId) {
    const selected = list.find(account => String(account.account_id) === String(accountId));
    if (!selected) throw new Error('Selected Deriv account is unavailable');
    return selected;
  }
  return list[0];
}
async function authWs(token, accountId, payload) {
  const account = await resolveAccount(token, accountId);
  const otp = await rest(`/trading/v1/options/accounts/${encodeURIComponent(account.account_id)}/otp`, token, { method: 'POST' });
  if (!otp?.data?.url) throw new Error('Deriv did not return an authenticated WebSocket URL');
  return { ...(await ws(otp.data.url, payload)), account };
}

app.get('/api/account', async (req, res) => {
  try {
    const token = cookieToken(req);
    if (!token) return res.status(401).json({ error: 'Not connected' });
    const list = await accounts(token);
    res.json({ ok: true, accounts: list, selected: list[0]?.account_id || null });
  } catch (error) {
    fail(res, error, 502);
  }
});

app.get('/api/markets', async (_, res) => {
  try {
    const data = await ws(PUBLIC_WS, { active_symbols: 'full' });
    res.json({ ok: true, markets: data.active_symbols || [] });
  } catch (error) {
    fail(res, error, 502);
  }
});
app.get('/api/markets/:symbol/contracts', async (req, res) => {
  try {
    const data = await ws(PUBLIC_WS, { contracts_for: req.params.symbol });
    res.json({ ok: true, symbol: req.params.symbol, contracts: data.contracts_for || {} });
  } catch (error) {
    fail(res, error, 502);
  }
});
app.get('/api/markets/:symbol/ticks', async (req, res) => {
  try {
    const count = Math.min(Math.max(Number(req.query.count || 100), 10), 1000);
    const data = await ws(PUBLIC_WS, { ticks_history: req.params.symbol, count, end: 'latest', style: 'ticks' });
    res.json({ ok: true, symbol: req.params.symbol, history: data.history || null, times: data.times || null });
  } catch (error) {
    fail(res, error, 502);
  }
});
app.get('/api/markets/:symbol/tick', async (req, res) => {
  try {
    const data = await ws(PUBLIC_WS, { ticks: req.params.symbol });
    res.json({ ok: true, symbol: req.params.symbol, tick: data.tick || null });
  } catch (error) {
    fail(res, error, 502);
  }
});

const CONTRACT_TYPES = new Set([
  'DIGITMATCH', 'DIGITDIFF', 'DIGITEVEN', 'DIGITODD', 'DIGITOVER', 'DIGITUNDER',
  'HIGHER', 'LOWER', 'ONETOUCH', 'NOTOUCH', 'MULTUP', 'MULTDOWN', 'UPORDOWN', 'ACCU',
  'TURBOSLONG', 'TURBOSSHORT', 'VANILLALONGCALL', 'VANILLALONGPUT', 'CALL', 'PUT',
]);
const DIGIT_TYPES = new Set(['DIGITMATCH', 'DIGITDIFF', 'DIGITOVER', 'DIGITUNDER']);
const DIRECTION_TYPES = new Set(['CALL', 'PUT']);

function number(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}
function tradeParameters(body, account) {
  const contractType = String(body.contract_type || body.contractType || '').toUpperCase();
  if (!CONTRACT_TYPES.has(contractType)) throw new Error(`Unsupported contract type: ${contractType || 'missing'}`);
  const amount = number(body.amount ?? body.stake, NaN);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('A valid stake is required');
  const symbol = String(body.underlying_symbol || body.symbol || '').trim();
  if (!symbol) throw new Error('A Deriv market symbol is required');
  const currency = String(account.currency || body.currency || '').trim();
  if (!currency) throw new Error('The selected Deriv account has no currency');

  const parameters = {
    amount,
    basis: body.basis === 'payout' ? 'payout' : 'stake',
    contract_type: contractType,
    currency,
    underlying_symbol: symbol,
  };

  if (contractType === 'ACCU') {
    const growth = number(body.growth_rate ?? body.growthRate, NaN);
    if (!Number.isFinite(growth) || growth <= 0) throw new Error('Accumulator growth rate is required');
    parameters.growth_rate = growth;
  } else if (DIGIT_TYPES.has(contractType)) {
    const barrier = String(body.barrier ?? body.digit ?? '').trim();
    if (!/^\d$/.test(barrier)) throw new Error('Digit contracts require a prediction digit from 0 to 9');
    parameters.barrier = barrier;
  }

  if (body.duration !== undefined) parameters.duration = Math.max(1, Math.floor(number(body.duration, 1)));
  if (body.duration_unit) parameters.duration_unit = String(body.duration_unit);
  if (body.multiplier !== undefined) parameters.multiplier = number(body.multiplier);
  if (body.barrier2 !== undefined && body.barrier2 !== '') parameters.barrier2 = String(body.barrier2);
  if (body.selected_tick !== undefined) parameters.selected_tick = Math.floor(number(body.selected_tick));
  if (body.payout_per_point !== undefined) parameters.payout_per_point = number(body.payout_per_point);
  if (DIRECTION_TYPES.has(contractType) && body.duration === undefined) {
    parameters.duration = 1;
    parameters.duration_unit = 't';
  }
  if (contractType === 'ACCU') {
    parameters.duration = undefined;
    parameters.duration_unit = undefined;
  }
  Object.keys(parameters).forEach(k => parameters[k] === undefined && delete parameters[k]);
  return parameters;
}

async function getFreshProposal(token, accountId, body) {
  const account = await resolveAccount(token, accountId);
  const parameters = tradeParameters(body, account);
  const proposal = await authWs(token, account.account_id, { proposal: 1, subscribe: 0, ...parameters });
  const id = proposal?.proposal?.id;
  const askPrice = number(proposal?.proposal?.ask_price, NaN);
  if (!id || !Number.isFinite(askPrice) || askPrice <= 0) throw new Error('Deriv did not return a valid trade price');
  return { account, parameters, proposalId: id, askPrice };
}

// Publicly used by the existing UI when it wants to preview pricing.
app.post('/api/proposal', async (req, res) => {
  try {
    const token = cookieToken(req);
    if (!token) return res.status(401).json({ error: 'Not connected to Deriv. Sign in first.' });
    const fresh = await getFreshProposal(token, req.body?.account_id, req.body || {});
    res.json({ ok: true, proposal: { id: fresh.proposalId, ask_price: fresh.askPrice }, account: fresh.account });
  } catch (error) {
    fail(res, error);
  }
});

// The site-facing trade endpoint hides proposal handling completely. It obtains
// a fresh Deriv price and immediately submits the authenticated BUY request.
app.post('/api/trade', async (req, res) => {
  try {
    const token = cookieToken(req);
    if (!token) return res.status(401).json({ error: 'Not connected to Deriv. Sign in first.' });
    const fresh = await getFreshProposal(token, req.body?.account_id, req.body || {});
    const result = await authWs(token, fresh.account.account_id, { buy: fresh.proposalId, price: fresh.askPrice, subscribe: 1 });
    if (!result?.buy?.contract_id) throw new Error('Deriv did not confirm the purchase');
    res.json({ ok: true, executed: true, buy: result.buy, account: fresh.account });
  } catch (error) {
    fail(res, error);
  }
});

// Backwards compatible endpoint: accepts either a proposal ID or complete trade
// parameters. Complete parameters are routed through the same hidden flow.
app.post('/api/buy', async (req, res) => {
  try {
    const token = cookieToken(req);
    if (!token) return res.status(401).json({ error: 'Not connected to Deriv. Sign in first.' });
    const body = req.body || {};
    if (body.proposal_id) {
      const price = number(body.price, NaN);
      if (!Number.isFinite(price) || price <= 0) throw new Error('A valid purchase price is required');
      const result = await authWs(token, body.account_id, { buy: String(body.proposal_id), price, subscribe: 1 });
      return res.json({ ok: true, executed: Boolean(result?.buy?.contract_id), ...result });
    }
    const fresh = await getFreshProposal(token, body.account_id, body);
    const result = await authWs(token, fresh.account.account_id, { buy: fresh.proposalId, price: fresh.askPrice, subscribe: 1 });
    if (!result?.buy?.contract_id) throw new Error('Deriv did not confirm the purchase');
    return res.json({ ok: true, executed: true, buy: result.buy, account: fresh.account });
  } catch (error) {
    fail(res, error);
  }
});

app.post('/api/sell', async (req, res) => {
  try {
    const token = cookieToken(req);
    if (!token) return res.status(401).json({ error: 'Not connected to Deriv. Sign in first.' });
    const body = req.body || {};
    if (!body.contract_id) throw new Error('Contract ID is required');
    const price = number(body.price, 0);
    const payload = price > 0 ? { sell: String(body.contract_id), price } : { sell: String(body.contract_id), price: 0 };
    const result = await authWs(token, body.account_id, payload);
    res.json({ ok: true, ...result });
  } catch (error) {
    fail(res, error);
  }
});

app.post('/api/contract', async (req, res) => {
  try {
    const token = cookieToken(req);
    if (!token) return res.status(401).json({ error: 'Not connected to Deriv. Sign in first.' });
    if (!req.body?.contract_id) throw new Error('Contract ID is required');
    const result = await authWs(token, req.body.account_id, {
      proposal_open_contract: 1,
      contract_id: Number(req.body.contract_id),
      subscribe: req.body.subscribe === false ? 0 : 1,
    });
    res.json({ ok: true, ...result });
  } catch (error) {
    fail(res, error);
  }
});

app.post('/api/portfolio', async (req, res) => {
  try {
    const token = cookieToken(req);
    if (!token) return res.status(401).json({ error: 'Not connected to Deriv. Sign in first.' });
    const result = await authWs(token, req.body?.account_id, { portfolio: 1, subscribe: 1 });
    res.json({ ok: true, ...result });
  } catch (error) {
    fail(res, error);
  }
});

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  const file = path.join(FRONTEND_DIR, req.path);
  if (file.startsWith(FRONTEND_DIR) && path.extname(file)) return res.sendFile(file, err => err ? next() : undefined);
  return res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

export default app;
