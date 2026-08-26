import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import crypto from 'node:crypto';
import WebSocket from 'ws';

const app = express();
const port = Number(process.env.PORT || 10000);
const FRONTEND_ORIGIN = (process.env.FRONTEND_ORIGIN || 'https://goonfx.com').replace(/\/$/, '');
const DERIV_CLIENT_ID = process.env.DERIV_CLIENT_ID;
const DERIV_CLIENT_SECRET = process.env.DERIV_CLIENT_SECRET;
const DERIV_REDIRECT_URI = process.env.DERIV_REDIRECT_URI || 'https://goonfx.com/callback.html';
const DERIV_APP_ID = process.env.DERIV_APP_ID || DERIV_CLIENT_ID;
const sessions = new Map();

app.set('trust proxy', 1);
app.use(cors({ origin: FRONTEND_ORIGIN, credentials: true, methods: ['GET','POST','OPTIONS'], allowedHeaders: ['Content-Type','Authorization'] }));
app.use(express.json({ limit: '100kb' }));
app.get('/health', (_req, res) => res.json({ ok: true, service: 'goonfx-api' }));
app.get('/api/config-status', (_req, res) => res.json({ ok: true, frontend_origin: FRONTEND_ORIGIN, oauth_client_configured: !!DERIV_CLIENT_ID, oauth_secret_configured: !!DERIV_CLIENT_SECRET, redirect_uri: DERIV_REDIRECT_URI, app_id_configured: !!DERIV_APP_ID }));

function cookieSid(req) { return (req.headers.cookie || '').match(/(?:^|; )gx_sid=([^;]+)/)?.[1] || null; }
function accountToken(req) { const id = cookieSid(req), s = id ? sessions.get(id) : null; if (!s || s.expires_at <= Date.now()) { if (id) sessions.delete(id); return null; } return s.access_token; }

async function derivToken({ code, code_verifier }) {
  const params = new URLSearchParams({ grant_type: 'authorization_code', client_id: DERIV_CLIENT_ID, code, code_verifier, redirect_uri: DERIV_REDIRECT_URI });
  // Deriv's PKCE documentation shows client_id + code + code_verifier + redirect_uri.
  // If Deriv has issued a client secret for this OAuth app, include it as well.
  if (DERIV_CLIENT_SECRET) params.set('client_secret', DERIV_CLIENT_SECRET);
  const r = await fetch('https://auth.deriv.com/oauth2/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: params });
  const text = await r.text(); let data; try { data = JSON.parse(text); } catch { data = { error: text }; }
  if (!r.ok) { const err = new Error(data.error_description || data.error || data.message || `Deriv token exchange HTTP ${r.status}`); err.status = r.status; err.data = data; throw err; }
  return data;
}

app.post('/api/oauth/exchange', async (req, res) => {
  try {
    if (!DERIV_CLIENT_ID || !DERIV_REDIRECT_URI) throw new Error('OAuth backend environment is incomplete: DERIV_CLIENT_ID or DERIV_REDIRECT_URI is missing');
    const { code, code_verifier, redirect_uri, client_id } = req.body || {};
    if (!code || !code_verifier) throw new Error('Authorization code or PKCE verifier is missing');
    if (redirect_uri !== DERIV_REDIRECT_URI) throw new Error(`Redirect URI mismatch. Backend expects ${DERIV_REDIRECT_URI}`);
    if (client_id !== DERIV_CLIENT_ID) throw new Error('OAuth client ID mismatch');
    const token = await derivToken({ code, code_verifier });
    const id = crypto.randomUUID(), maxAge = Number(token.expires_in || 3600);
    sessions.set(id, { access_token: token.access_token, expires_at: Date.now() + maxAge * 1000 });
    res.setHeader('Set-Cookie', `gx_sid=${id}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`);
    res.json({ ok: true, expires_in: maxAge });
  } catch (e) {
    console.error('OAuth exchange failed:', e.status || '', e.message, e.data || '');
    res.status(e.status || 400).json({ error: e.message, details: e.data || null });
  }
});

async function derivApi(path, token, options = {}) {
  if (!DERIV_APP_ID) throw new Error('DERIV_APP_ID is not configured');
  const r = await fetch(`https://api.derivws.com${path}`, { ...options, headers: { Authorization: `Bearer ${token}`, 'Deriv-App-ID': DERIV_APP_ID, ...(options.headers || {}) } });
  const text = await r.text(); let data; try { data = JSON.parse(text); } catch { data = { raw: text }; }
  if (!r.ok) { const err = new Error(data?.errors?.[0]?.message || data?.message || data?.error || `Deriv API HTTP ${r.status}`); err.status = r.status; err.data = data; throw err; }
  return data;
}

app.get('/api/account', async (req, res) => { try { const token = accountToken(req); if (!token) return res.status(401).json({ error: 'Not connected' }); const upstream = await derivApi('/trading/v1/options/accounts', token); const accounts = Array.isArray(upstream.data) ? upstream.data : (upstream.data ? [upstream.data] : []); const first = accounts[0] || {}; res.json({ ...upstream, accounts, balance: first.balance ?? null, currency: first.currency ?? null, account_id: first.account_id ?? null, status: first.status ?? null, account_type: first.account_type ?? null }); } catch (e) { res.status(e.status || 502).json(e.data || { error: e.message }); } });

async function getWsUrl(token, accountId) { const r = await derivApi(`/trading/v1/options/accounts/${encodeURIComponent(accountId)}/otp`, token, { method: 'POST' }); if (!r?.data?.url) throw new Error('Deriv did not return an authenticated WebSocket URL'); return r.data.url; }
async function authorizedWs(token, payload) {
  const accounts = await derivApi('/trading/v1/options/accounts', token);
  const list = Array.isArray(accounts.data) ? accounts.data : (accounts.data ? [accounts.data] : []);
  const account = list[0]; if (!account?.account_id) throw new Error('No Deriv Options account is available for this user');
  const url = await getWsUrl(token, account.account_id);
  return new Promise((resolve, reject) => { const ws = new WebSocket(url); const timer = setTimeout(() => { try { ws.close(); } catch {} reject(new Error('Deriv WebSocket timeout')); }, 15000); ws.on('open', () => ws.send(JSON.stringify(payload))); ws.on('message', raw => { let d; try { d = JSON.parse(raw); } catch { return; } if (d.error) { clearTimeout(timer); ws.close(); return reject(Object.assign(new Error(d.error.message || 'Deriv WebSocket error'), { data: d })); } clearTimeout(timer); ws.close(); resolve(d); }); ws.on('error', e => { clearTimeout(timer); reject(e); }); });
}

app.post('/api/proposal', async (req, res) => { try { const token = accountToken(req); if (!token) return res.status(401).json({ error: 'Not connected' }); const { symbol = 'R_100', contract_type, stake = '1', barrier, duration = 1, duration_unit = 't', currency = 'USD' } = req.body || {}; if (!['DIGITOVER','DIGITUNDER','DIGITEVEN','DIGITODD'].includes(contract_type)) return res.status(400).json({ error: 'Unsupported digit contract type' }); const p = { proposal: 1, amount: Number(stake), basis: 'stake', contract_type, currency, duration: Number(duration), duration_unit, underlying_symbol: symbol }; if (barrier !== undefined && barrier !== '') p.barrier = String(barrier); res.json(await authorizedWs(token, p)); } catch (e) { res.status(e.status || 400).json({ error: e.message, details: e.data || null }); } });
app.post('/api/buy', async (req, res) => { try { const token = accountToken(req); if (!token) return res.status(401).json({ error: 'Not connected' }); const { proposal_id, price } = req.body || {}; if (!proposal_id || !Number.isFinite(Number(price))) return res.status(400).json({ error: 'proposal_id and price are required' }); res.json(await authorizedWs(token, { buy: String(proposal_id), price: Number(price) })); } catch (e) { res.status(e.status || 400).json({ error: e.message, details: e.data || null }); } });
app.post('/api/bulk/preview', async (req, res) => { const orders = Array.isArray(req.body?.orders) ? req.body.orders : []; if (!orders.length) return res.status(400).json({ error: 'orders must be a non-empty array' }); if (orders.length > 100) return res.status(400).json({ error: 'Maximum 100 orders' }); res.json({ ok: true, count: orders.length, orders }); });
app.post('/api/bulk-buy', async (req, res) => { try { const token = accountToken(req); if (!token) return res.status(401).json({ error: 'Not connected' }); const orders = Array.isArray(req.body?.orders) ? req.body.orders : []; if (!orders.length || orders.length > 100) return res.status(400).json({ error: 'Provide 1 to 100 orders' }); const results = []; for (const order of orders) { if (!order.proposal_id || !Number.isFinite(Number(order.price))) { results.push({ ok: false, error: 'proposal_id and price required', order }); continue; } try { const result = await authorizedWs(token, { buy: String(order.proposal_id), price: Number(order.price) }); results.push({ ok: true, result }); } catch (e) { results.push({ ok: false, error: e.message, details: e.data || null }); } } res.json({ ok: true, count: orders.length, results }); } catch (e) { res.status(400).json({ error: e.message }); } });

app.listen(port, '0.0.0.0', () => console.log(`GOON FX API listening on ${port}`));
