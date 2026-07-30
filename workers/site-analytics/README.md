# site-analytics

Self-hosted, first-party analytics for joseppy.ca.
Tracks plays/visits per app, where visitors are from, and how long each session lasts, then rolls it all up into a dashboard.

## How it works

- Every page includes `/assets/track.js` with a `data-app` attribute naming the app (for example `northern_eh`).
- The tracker generates a per-tab session id, sends a `start` beacon on load, and sends `ping` beacons (every 30s, on tab hide, and on page unload) carrying the accumulated visible-time in seconds.
- The worker stores one row per session in D1, enriching it with country/region/city (from `request.cf`), device type, and referrer host.
- Localhost visits are not tracked.

## Endpoints

- `POST /collect` - beacon ingest (public, origin-checked, 2 KB payload cap).
- `GET /api/stats?days=N` - rolled-up JSON, requires the `x-dash-key` header.
- `GET /dash` (or `/`) - redirects to the dashboard.

## Dashboard

https://joseppy.ca/analytics/

The dashboard is a static page at `/analytics/index.html` in the repo, served by GitHub Pages, and it calls this worker's `/api/stats` cross-origin.
It asks for the key once and stores it in localStorage.
Stat tiles (plays, time played, average session, countries), a stacked plays-per-day chart, per-game and per-country rollups, and a recent-sessions feed.
Range filters: 7d / 30d / 90d / 1y.

## Historical data

Every session ever collected stays in the `sessions` table in D1; nothing is aged out.
Query it ad hoc:

```bash
npx wrangler d1 execute site_analytics --remote --command "SELECT app, COUNT(*) FROM sessions GROUP BY app"
```

Or take a full backup / export:

```bash
npx wrangler d1 export site_analytics --remote --output backup.sql
```

## Deploy

```bash
npx wrangler d1 create site_analytics          # once; put the id in wrangler.toml
npx wrangler d1 execute site_analytics --remote --file=schema.sql
npx wrangler secret put DASH_KEY               # the dashboard password
npx wrangler deploy
```
