# Spotify Venn Invite Worker

Cloudflare Worker API that maps a short friend code to the full Spotify Venn payload code.
This is designed for public frontend hosting (GitHub Pages), so security relies on strict server controls.

## Endpoints

- `GET /api/health`
- `POST /api/invites` with JSON body `{ "payload": "<long payload code>" }`
  - returns `{ "code": "Ab3xYz9Q", "expiresAt": "..." }`
- `GET /api/invites/:code`
  - returns `{ "payload": "<long payload code>", "expiresAt": "..." }`

## Security defaults in this repo

- Strict allowlist CORS: only origins in `ALLOWED_ORIGINS` are accepted.
- Missing/disallowed `Origin` on API calls is rejected (`403`).
- Separate per-IP rate limits for create vs resolve endpoints.
- Invite TTL is capped and defaults to 7 days.
- Optional burn-after-read mode via `BURN_AFTER_READ=true`.
- Response hardening headers (`nosniff`, `DENY` frame, strict referrer policy).

## One-time setup

1. Install Wrangler:
   - `npm i -g wrangler`
2. Authenticate:
   - `wrangler login`
3. Create KV namespace:
   - `wrangler kv namespace create INVITES`
4. Copy the resulting namespace id into `wrangler.toml` for `INVITES`.

## Deploy

From this folder:

- `wrangler deploy`

After deploy, note your worker URL (for example `https://spotify-venn-invites.<subdomain>.workers.dev`).

## Connect frontend

In `apps/spotify_venn/index.html`, set:

```html
<meta name="spotify-invite-api" content="https://spotify-venn-invites.<subdomain>.workers.dev">
```

If this meta is blank, the app falls back to local long codes.

## Recommended production hardening

1. Put Worker behind a custom domain and route.
2. Disable `*.workers.dev` access after custom domain is confirmed.
3. Keep `ALLOWED_ORIGINS` exact (no wildcard, no trailing slash mismatches).
4. Keep `INVITE_TTL_SECONDS` short (7 days default; 1 day for stricter privacy).
5. Keep `CREATE_RATE_LIMIT_PER_MINUTE` low.
6. If you want one-time invites, set `BURN_AFTER_READ = "true"`.
7. Add Cloudflare WAF/rate-limit rules at the zone level for `/api/invites*`.
8. Keep Cloudflare account 2FA enabled and avoid account-wide API tokens.
