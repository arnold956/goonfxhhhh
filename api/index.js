import express from 'express';
import WebSocket from 'ws';

process.env.DERIV_APP_ID = '348AuAfk8ZpsbSW8Whqc3';
process.env.DERIV_CLIENT_ID = '348AuAfk8ZpsbSW8Whqc3';
process.env.DERIV_REDIRECT_URI = 'https://goonfx.com/';
process.env.FRONTEND_ORIGIN = 'https://goonfx.com';

const { default: backend } = await import('../backend/server.js');
const app = express();

// Market data compatibility proxy. Deriv's current market-data docs still
// document active_symbols/ticks on the public WebSocket; normalize the
// response here so the existing GOON FX frontend always receives symbol and
// display fields.
const MARKET_WS = 'wss://ws.binaryws.com/websockets/v3';
function marketRequest(payload, timeout = 12000) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(MARKET_WS);
    let done = false;
    const timer = setTimeout(() => finish(reject, new Error('Deriv market feed timed out')), timeout);
    const finish = (fn, value) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      try { ws.close(); } catch {}
      fn(value);
    };
    ws.on('open', () => ws.send(JSON.stringify(payload)));
    ws.on('message', raw => {
      try {
        const data = JSON.parse(raw);
        if (data.error) return finish(reject, new Error(data.error.message || 'Deriv market error'));
        finish(resolve, data);
      } catch (e) { finish(reject, e); }
    });
    ws.on('error', e => finish(reject, e));
    ws.on('close', () => { if (!done) finish(reject, new Error('Deriv market connection closed')); });
  });
}

app.get('/api/markets', async (_req, res, next) => {
  try {
    const d = await marketRequest({ active_symbols: 'brief', product_type: 'basic' });
    const markets = (d.active_symbols || []).map(x => ({
      symbol: x.symbol || x.underlying_symbol,
      underlying_symbol: x.symbol || x.underlying_symbol,
      display: x.display_name || x.underlying_symbol_name || x.symbol || x.underlying_symbol,
      display_name: x.display_name || x.underlying_symbol_name || x.symbol || x.underlying_symbol,
      market: x.market,
      submarket: x.submarket,
      subgroup: x.subgroup,
      exchange_is_open: x.exchange_is_open,
      is_trading_suspended: x.is_trading_suspended
    })).filter(x => x.symbol);
    res.json({ ok: true, markets });
  } catch (e) { next(e); }
});

app.get('/api/markets/:symbol/ticks', async (req, res, next) => {
  try {
    const count = Math.min(Math.max(Number(req.query.count || 160), 10), 1000);
    const d = await marketRequest({ ticks_history: req.params.symbol, count, end: 'latest', style: 'ticks' });
    res.json({ ok: true, symbol: req.params.symbol, history: d.history || null, times: d.times || null, prices: d.prices || null });
  } catch (e) { next(e); }
});

// All account/OAuth/trading routes continue to use the existing backend.
app.use(backend);

export default app;
