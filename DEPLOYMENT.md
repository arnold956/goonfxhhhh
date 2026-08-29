# GoonFX Production Login Flow

- Frontend: https://goonfx.com
- API: https://api.goonfx.com
- Authentication: Deriv OAuth 2.0 + PKCE
- Redirect URI: https://goonfx.com/

Production acceptance flow:
1. Open GoonFX.
2. Unauthenticated users are redirected to Deriv authorization.
3. Deriv redirects back to `https://goonfx.com/?code=...&state=...`.
4. Frontend validates state and sends the authorization code + PKCE verifier to `/api/oauth/exchange`.
5. Vercel backend exchanges the code server-side and establishes the authenticated session cookie.
6. Frontend calls `/api/account` and unlocks the dashboard only after the backend confirms authentication.
