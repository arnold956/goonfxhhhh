GOON FX — THIRD-PARTY DERIV TRADING PACKAGE

USER FLOW
1. User opens GOON FX.
2. GOON FX sends the user to Deriv OAuth.
3. User logs into their own Deriv account and authorizes GOON FX.
4. Deriv redirects to https://goonfx.com.
5. GOON FX sends the OAuth code + PKCE verifier to /api/oauth/exchange.
6. The Cloudflare Worker exchanges the code server-side.
7. GOON FX uses the returned token to obtain the user's Options account and authenticated WebSocket URL.
8. GOON FX displays the user's live Deriv balance and enables trading for that authorized account.

PERMISSIONS
- OAuth scope requested: trade
- GOON FX does not request payment/withdrawal permissions.
- Users never enter their Deriv password into GOON FX.

DEPLOYMENT
- Deploy index.html to https://goonfx.com.
- Deploy goonfx-worker.js as a Cloudflare Worker.
- Route https://goonfx.com/api/* to that Worker.
- Configure the Worker variable/secret DERIV_CLIENT_ID with the Deriv OAuth client ID.
- Register https://goonfx.com exactly as the Deriv OAuth redirect URI.

IMPORTANT
The frontend and Worker are prepared for the OAuth/API architecture, but live authentication depends on the Deriv OAuth application being configured with the exact redirect URI and the Cloudflare Worker being deployed at the /api route.
