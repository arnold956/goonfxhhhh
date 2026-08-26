/** GOON FX Cloudflare Worker - Deriv OAuth exchange gateway
 * Deploy this Worker and route https://goonfx.com/api/* to it.
 * Store DERIV_CLIENT_ID as a Worker secret/variable.
 */
const TOKEN_URL = 'https://auth.deriv.com/oauth2/token';

function cors(origin) {
  const allowed = 'https://goonfx.com';
  return {
    'Access-Control-Allow-Origin': origin === allowed ? allowed : allowed,
    'Access-Control-Allow-Methods': 'POST,GET,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin'
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors(origin) });
    }

    if (url.pathname === '/api/health' && request.method === 'GET') {
      return new Response(JSON.stringify({ ok: true, service: 'GOON FX Deriv OAuth gateway' }), {
        headers: { 'Content-Type': 'application/json', ...cors(origin) }
      });
    }

    if (url.pathname !== '/api/oauth/exchange' || request.method !== 'POST') {
      return new Response('Not found', { status: 404, headers: cors(origin) });
    }

    try {
      const body = await request.json();
      const code = String(body.code || '');
      const verifier = String(body.code_verifier || '');
      const clientId = String(body.client_id || env.DERIV_CLIENT_ID || '');
      const redirectUri = String(body.redirect_uri || '');

      if (!code || !verifier || !clientId || !redirectUri) {
        return new Response(JSON.stringify({ error: 'Missing OAuth exchange fields.' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...cors(origin) }
        });
      }

      if (env.DERIV_CLIENT_ID && clientId !== env.DERIV_CLIENT_ID) {
        return new Response(JSON.stringify({ error: 'Invalid Deriv client ID.' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json', ...cors(origin) }
        });
      }

      if (redirectUri !== 'https://goonfx.com') {
        return new Response(JSON.stringify({ error: 'Invalid redirect URI.' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...cors(origin) }
        });
      }

      const form = new URLSearchParams();
      form.set('grant_type', 'authorization_code');
      form.set('client_id', clientId);
      form.set('code', code);
      form.set('code_verifier', verifier);
      form.set('redirect_uri', redirectUri);

      const upstream = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form.toString()
      });

      const text = await upstream.text();
      return new Response(text, {
        status: upstream.status,
        headers: { 'Content-Type': 'application/json', ...cors(origin), 'Cache-Control': 'no-store' }
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err?.message || 'OAuth exchange failed.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...cors(origin) }
      });
    }
  }
};
