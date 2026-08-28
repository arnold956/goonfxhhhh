// Single source of truth for the frontend. OAuth is implemented only in app.js.
// Keeping config.js side-effect free prevents duplicate OAuth requests/callbacks.
window.GOONFX_CONFIG = Object.freeze({
  DERIV_CLIENT_ID: '348AuAfk8ZpsbSW8Whqc3',
  DERIV_APP_ID: '34b2ctEChXoL5t579q8pB',
  DERIV_SCOPE: 'trade',
  DERIV_REST_BASE: 'https://api.derivws.com',
  DERIV_REDIRECT_URI: 'https://goonfx.com/',
  BACKEND_URL: 'https://api.goonfx.com',
  GOOGLE_CLIENT_ID: 'YOUR_GOOGLE_CLIENT_ID'
});