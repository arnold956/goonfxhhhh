import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import crypto from 'node:crypto';

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
app.use(express.json({ limit: '50kb' }));

app.get('/health', (_req, res) => res.json({ ok: true, service: 'goonfx-api' }));

function cookieSid(req) {
  return (req.headers.cookie || '').match(/(?:^|; )gx_sid=([^;]+)/)?.[1] || null;
}

async function derivToken(body) {
  const r = await fetch('https://auth.deriv.com/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body)
  });
  const text = await r.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { error: text }; }
  if (!r.ok) throw new Error(data.error_description || data.error || 'Deriv token exchange failed');
  return data;
}

app.post('/api/oauth/exchange', async (req, res) => {
  try {
    if (!DERIV_CLIENT_ID || !DERIV_CLIENT_SECRET || !DERIV_REDIRECT_URI) {
      throw new Error('Missing DERIV_CLIENT_ID, DERIV_CLIENT_SECRET or DERIV_REDIRECT_URI on the backend');
    }
    const { code, code_verifier, redirect_uri, client_id } = req.body || {};
    if (!code || !code_verifier || !redirect_uri || client_id !== DERIV_CLIENT_ID || redirect_uri !== DERIV_REDIRECT_URI) {
      throw new Error('Invalid OAuth exchange parameters');
    }

    const token = await derivToken({
      grant_type: 'authorization_code',
      client_id: DERIV_CLIENT_ID,
      client_secret: DERIV_CLIENT_SECRET,
      code,
      code_verifier,
      redirect_uri: DERIV_REDIRECT_URI
    });

    const id = crypto.randomUUID();
    const maxAge = Number(token.expires_in || 3600);
    sessions.set(id, { access_token: token.access_token, expires_at: Date.now() + maxAge * 1000 });

    res.setHeader('Set-Cookie', `gx_sid=${id}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=${maxAge}`);
    res.json({ ok: true, expires_in: maxAge });
  } catch (e) {
    console.error('OAuth exchange:', e.message);
    res.status(400).json({ error: e.message });
  }
});

async function accountToken(req) {
  const id = cookieSid(req);
  const session = id ? sessions.get(id) : null;
  if (!session || session.expires_at <= Date.now()) {
    if (id) sessions.delete(id);
    return null;
  }
  return session.access_token;
}

app.get('/api/account', async (req, res) => {
  try {
    const token = await accountToken(req);
    if (!token) return res.status(401).json({ error: 'Not connected' });
    if (!DERIV_APP_ID) return res.status(500).json({ error: 'DERIV_APP_ID is not configured on Render' });

    const r = await fetch('https://api.derivws.com/trading/v1/options/accounts', {
      headers: {
        Authorization: `Bearer ${token}`,
        'Deriv-App-ID': DERIV_APP_ID
      }
    });
    const text = await r.text();
    let upstream;
    try { upstream = JSON.parse(text); } catch { upstream = { raw: text }; }
    if (!r.ok) return res.status(r.status).json(upstream);

    const accounts = Array.isArray(upstream.data) ? upstream.data : (upstream.data ? [upstream.data] : []);
    const first = accounts[0] || {};
    res.json({
      ...upstream,
      accounts,
      balance: first.balance ?? null,
      currency: first.currency ?? null,
      account_id: first.account_id ?? null,
      status: first.status ?? null,
      account_type: first.account_type ?? null
    });
  } catch (e) {
    console.error('Account request:', e.message);
    res.status(502).json({ error: e.message });
  }
});

app.listen(port, '0.0.0.0', () => console.log(`GOON FX API listening on ${port}`));
