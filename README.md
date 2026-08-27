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

The frontend can be served from GitHub Pages. The OAuth token exchange cannot run on GitHub Pages; deploy `backend/` to an HTTPS Node service and set `BACKEND_URL` in `config.js` to that service.

Deployment trigger refreshed after OAuth/session and trading execution updates.
