# Northern Eh Config Worker

Cloudflare Worker dedicated to Northern Eh geocoding proxy.

## Endpoints

- `GET /api/northern-eh/geocode?q=<query>&limit=7`
  - returns `{ "results": [{ "display_name", "lat", "lon" }, ...] }`
- `GET /api/northern-eh/reverse?lat=<lat>&lon=<lon>`
  - returns `{ "place_name": "..." }`

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
- Browser clients no longer need the token for geocoding.
- Keep `ALLOWED_ORIGINS` exact (production domain + optional localhost).
