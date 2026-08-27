// Vercel runtime defaults for the GOON FX API.
// OAuth client ID / App ID are identifiers, not user access tokens.
// Prefer Vercel environment variables when configured.
if (!process.env.DERIV_CLIENT_ID) process.env.DERIV_CLIENT_ID = '34b2ctEChXoL5t579q8pB';
if (!process.env.DERIV_APP_ID) process.env.DERIV_APP_ID = process.env.DERIV_CLIENT_ID;
if (!process.env.DERIV_REDIRECT_URI) process.env.DERIV_REDIRECT_URI = 'https://goonfx.com/callback.html';
if (!process.env.FRONTEND_ORIGIN) process.env.FRONTEND_ORIGIN = 'https://goonfx.com';
// Session encryption key fallback for hosts where SESSION_SECRET was not configured.
// Set SESSION_SECRET in Vercel for a private deployment secret when available.
if (!process.env.SESSION_SECRET) process.env.SESSION_SECRET = 'goonfx-session-2026-rotate-in-vercel-7f9c2d4e6a8b1c5e';
