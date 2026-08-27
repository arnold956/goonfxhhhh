// Vercel production adapter for GOON FX.
// Deriv OAuth 2.0 Authorization Code + PKCE does not require a client secret for this flow.
// Keep the public OAuth configuration available to the backend even when Vercel env vars are not set.
process.env.DERIV_APP_ID = process.env.DERIV_APP_ID || '348AuAfk8ZpsbSW8Whqc3';
process.env.DERIV_CLIENT_ID = process.env.DERIV_CLIENT_ID || '348AuAfk8ZpsbSW8Whqc3';
process.env.DERIV_REDIRECT_URI = process.env.DERIV_REDIRECT_URI || 'https://goonfx.com/';
process.env.FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'https://goonfx.com';

if (!process.env.DERIV_CLIENT_ID || !process.env.DERIV_REDIRECT_URI) {
  throw new Error('GOON FX Deriv OAuth configuration is incomplete');
}

const { default: app } = await import('../backend/server.js');
export default app;
