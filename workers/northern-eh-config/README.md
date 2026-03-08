# Northern Eh Config Worker

Cloudflare Worker dedicated to serving runtime config for the Northern Eh app.

## Endpoint

- `GET /api/config/northern-eh`
  - returns `{ "token": "<mapbox public token>" }` for allowed origins only

## Setup

1. Login:
   - `npx wrangler login`
2. Set token secret:
   - `npx wrangler secret put MAPBOX_PUBLIC_TOKEN_NORTHERN_EH`
3. Deploy:
   - `npx wrangler deploy`

## Frontend wiring

In `apps/northern_eh/index.html`:

```html
<meta name="northern-eh-config-api" content="https://northern-eh-config.<subdomain>.workers.dev">
```

## Notes

- Do not commit the token itself.
- Keep `ALLOWED_ORIGINS` exact (production domain + optional localhost).
