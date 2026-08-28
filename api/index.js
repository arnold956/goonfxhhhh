// GOON FX production Vercel adapter.
// Deriv OAuth 2.0 Authorization Code + PKCE is a public-client flow:
// the browser performs the PKCE authorization step and this backend performs
// the code-for-token exchange. Never put an OAuth access token in GitHub.
//
// These values intentionally match the OAuth app registered for GOON FX.
// They override stale Vercel environment values that previously pointed at
// the old callback (/callback.html) and old application ID.
process.env.DERIV_APP_ID = '348AuAfk8ZpsbSW8Whqc3';
process.env.DERIV_CLIENT_ID = '348AuAfk8ZpsbSW8Whqc3';
process.env.DERIV_REDIRECT_URI = 'https://goonfx.com/';
process.env.FRONTEND_ORIGIN = 'https://goonfx.com';

const { default: app } = await import('../backend/server.js');
export default app;
