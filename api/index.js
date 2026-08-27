// Vercel production adapter: keep the registered GoonFx Deriv OAuth settings explicit.
process.env.DERIV_APP_ID = process.env.DERIV_APP_ID || '348AuAfk8ZpsbSW8Whqc3';
process.env.DERIV_CLIENT_ID = process.env.DERIV_CLIENT_ID || '348AuAfk8ZpsbSW8Whqc3';
process.env.DERIV_REDIRECT_URI = process.env.DERIV_REDIRECT_URI || 'https://goonfx.com/';
process.env.FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'https://goonfx.com';

const { default: app } = await import('../backend/server.js');
export default app;
