# GOON FX

Multi-page frontend for a Deriv OAuth trading workspace.

## Pages

- index.html — entry/login
- callback.html — Deriv OAuth callback
- dashboard.html — account overview
- markets.html — markets
- trade.html — trading workspace
- portfolio.html — portfolio/history
- account.html — account connection
- settings.html — configuration
- about.html — about

## Deployment

The frontend can be served from GitHub Pages. The OAuth token exchange cannot run on GitHub Pages; deploy `backend/` to an HTTPS Node service such as Render, Railway, Fly.io or another server and set `BACKEND_URL` in `config.js` to that service.

Set these backend environment variables:

- `DERIV_CLIENT_ID`
- `DERIV_CLIENT_SECRET`
- `DERIV_APP_ID` (the Deriv-App-ID required by the REST API)
- `DERIV_REDIRECT_URI=https://goonfx.com/callback.html`
- `FRONTEND_ORIGIN=https://goonfx.com`

Register the exact callback URL in the Deriv OAuth application. Do not commit `.env` or access tokens.

## Current Deriv architecture

OAuth 2.0 uses Authorization Code + PKCE. The backend exchanges the authorization code at `https://auth.deriv.com/oauth2/token`. Authenticated Options REST calls use `https://api.derivws.com` with `Authorization: Bearer ...` and `Deriv-App-ID`. Real-time trading/account data is obtained through the authenticated WebSocket flow after requesting an OTP.
