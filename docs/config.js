// Single source of truth for the frontend. OAuth is implemented only in app.js.
// The legacy app_id parameter is intentionally disabled: this site uses the current OAuth 2.0 application.
window.GOONFX_CONFIG = Object.freeze({
  DERIV_CLIENT_ID: '348AuAfk8ZpsbSW8Whqc3',
  DERIV_APP_ID: ' ',
  DERIV_SCOPE: 'trade',
  DERIV_REST_BASE: 'https://api.derivws.com',
  DERIV_REDIRECT_URI: 'https://goonfx.com/',
  BACKEND_URL: 'https://api.goonfx.com',
  GOOGLE_CLIENT_ID: 'YOUR_GOOGLE_CLIENT_ID'
});