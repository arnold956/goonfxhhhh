# GoonFX Complete Third-Party Deriv Trading Dashboard

## Non-negotiable
Preserve the existing GoonFX login, OAuth, Deriv authorization, callback, redirect URLs, and session flow. Do not replace or duplicate authentication. Build missing functionality after authentication.

## Target
One unified professional trading workspace inspired by observable professional Deriv/TraderKit-style layouts, using original GoonFX UI and branding.

## Required workspace
- Market navigator with Derived/Volatility, Boom, Crash, Step, Jump, Range Break, Forex, Stock Indices, Crypto, Commodities; search, favorites, recent markets, live price and fast switching.
- Live Deriv tick/candle chart with market switching, timeframes, zoom/pan/crosshair/fullscreen, OHLC and supported indicators: MA, RSI, MACD, Bollinger Bands, support/resistance and trend lines.
- Right-side Manual Trader supporting Accumulators, Digits, Ups & Downs, Touch/No Touch, Multipliers, Turbos and Vanillas where supported.
- Digits UI with live 0-9 cards, frequency, percentage, recent occurrences and current tick; Matches/Differs/Even/Odd/Over/Under.
- Over/Under and Even/Odd dedicated live interfaces.
- Internal Deriv proposal/pricing handling when required; user should only see simple prepare/execute/opened states. Never fake execution.
- Demo/Real account selector, live balance/account/currency, safe account switching and explicit Real-trade confirmation.
- Visual Bot Studio with drag/drop blocks for trade, market, conditions, logic, math, analysis, risk and utility; variables, IF/ELSE, comparisons, math, digit frequency/last digit/ticks and indicators.
- Bot CRUD, import/export, start/stop/pause/resume, persistence, runtime/trade/win/loss/P&L/drawdown/error monitoring.
- Quick strategies: Fixed Stake, Martingale, Reverse Martingale, D'Alembert, Oscar's Grind, Trend Following, Digit Frequency, Even/Odd, Over/Under, Rise/Fall; show risk warnings.
- Bulk Trader with multi-market queue, limits, interval, progress, per-trade contract ID/result/P&L, stop-all, rate-limit protection and duplicate prevention.
- Analysis with ticks, digit/even-odd/over-under/rise-fall statistics, streaks, MA/RSI/MACD/Bollinger/volatility and export. Label analysis as non-guaranteed.
- Copy Trader with explicitly authorized master/follower accounts, fixed or percentage sizing, maximum stake/daily loss/trades, market/contract filters, stop copying and copy history.
- Live Positions, History and Journal.
- Connection manager with connected/connecting/reconnecting/disconnected, latency, last tick/API response and safe reconnect without duplicate subscriptions.

## Backend/security
Preserve working backend/auth. Use official Deriv APIs/WebSocket. Keep secrets/tokens server-side, use environment variables, secure sessions, authorization, validation, rate limiting, audit logs and user isolation. Never expose credentials or another user's data.

## Testing/definition of done
Test login -> OAuth -> callback -> session -> dashboard without changing the existing login. Test market subscriptions and cleanup, live chart, every supported manual contract flow, Demo/Real switching, bot save/load/execute/stop, bulk execution controls, analysis, copy trading, positions/history/journal and production build. A trade is successful only after Deriv confirms it. If live execution cannot be verified with an authenticated account, mark it UNVERIFIED rather than simulating it.

## Deployment
Production must use correct Vercel environment variables, production OAuth/Deriv callback URLs, secure WSS/API endpoints, no unintended localhost/mock data, and browser verification after deployment.
