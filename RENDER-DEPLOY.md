# GOON FX API — Render deployment

## 1. Create the Render service

Use **New → Blueprint** and select this repository, or create a Web Service manually.

For a manual Web Service use:

- Repository: `arnold956/goonfx`
- Branch: `main`
- Runtime: `Node`
- Root Directory: `backend`
- Build Command: `npm ci`
- Start Command: `npm start`
- Health Check Path: `/health`

The repository also contains `render.yaml` for the same configuration.

## 2. Environment variables

Add these in Render → your service → Environment. Do not commit secrets.

```text
NODE_ENV=production
FRONTEND_ORIGIN=https://goonfx.com
DERIV_CLIENT_ID=34b2ctEChXoL5t579q8pB
DERIV_CLIENT_SECRET=<YOUR_DERIV_OAUTH_CLIENT_SECRET>
DERIV_APP_ID=<YOUR_DERIV_APP_ID_IF_YOUR_API_APP_REQUIRES_ONE>
DERIV_REDIRECT_URI=https://goonfx.com/callback.html
```

`DERIV_CLIENT_SECRET` must come from the Deriv OAuth application. Never put it in `config.js` or GitHub.

`DERIV_APP_ID` must be the Deriv App ID expected by the current API. If your OAuth application dashboard gives you a distinct App ID, use that value; do not guess it.

## 3. Deploy

Save the environment variables and choose **Save, rebuild, and deploy**.

First test the Render hostname:

```text
https://<your-render-service>.onrender.com/health
```

It should return JSON containing `ok: true`.

## 4. Attach api.goonfx.com

In Render → service → Settings → Custom Domains, add:

```text
api.goonfx.com
```

Render will show the DNS record/value required for your domain. Add that record at the DNS provider managing `goonfx.com`, then verify the domain in Render. Render provisions TLS for the custom domain.

After verification, test:

```text
https://api.goonfx.com/health
```

## 5. Deriv OAuth redirect URI

In the Deriv OAuth application, register this exact URL:

```text
https://goonfx.com/callback.html
```

The URL must match exactly, including path, protocol, and trailing slash behavior.

## 6. Frontend configuration

`config.js` should contain:

```js
window.GOONFX_CONFIG = {
  DERIV_CLIENT_ID: '34b2ctEChXoL5t579q8pB',
  DERIV_REDIRECT_URI: 'https://goonfx.com/callback.html',
  DERIV_SCOPE: 'trade',
  BACKEND_URL: 'https://api.goonfx.com'
};
```

## 7. Smoke test

1. Open `https://goonfx.com`.
2. Click **Connect Deriv**.
3. Complete Deriv login/consent.
4. Deriv returns to `https://goonfx.com/callback.html`.
5. The callback sends the authorization code and PKCE verifier to `/api/oauth/exchange`.
6. Render exchanges the code with Deriv and creates the HTTP-only session cookie.
7. `dashboard.html` calls `/api/account`.
8. The backend calls `GET https://api.derivws.com/trading/v1/options/accounts` using the Bearer token and `Deriv-App-ID`.

If step 6 fails, check Render logs and verify the client ID, client secret, redirect URI, and PKCE flow. If step 8 fails, verify the `DERIV_APP_ID` value and that the OAuth token has the `trade` scope.
