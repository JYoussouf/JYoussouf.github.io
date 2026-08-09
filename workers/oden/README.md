# Oden Demo Worker

Password-gated, terminal-styled gate in front of the OdenProStudios demo.

- Visitors hit a black/green terminal screen asking for `pw:`.
- Correct password (`oden`) reveals the demo once (burn-after-read credential).
- **Every refresh** drops back to the terminal and requires the password again.
- The demo HTML is **bundled into the worker** and is **never published to
  GitHub Pages**, so there is no public copy to find. The password is checked
  **server-side** — viewing source does not reveal the demo.

## Why a worker (and not plain GitHub Pages)

This repo's root is served publicly at `joseppy.ca`. A client-side password on a
static page would leave the demo downloadable and the password visible in source.
The worker keeps the content private and enforces the gate at the edge.

## URL

`joseppy.ca` is **not on Cloudflare** (DNS is at Namecheap, pointing at GitHub
Pages), so a path route on the apex can't be used. The demo is served at the
worker's own URL instead:

```
https://oden-demo.<your-subdomain>.workers.dev/apps/demo
```

`wrangler deploy` prints the exact URL. Share that link.

> Future: if you move `joseppy.ca`'s DNS to Cloudflare and proxy it, re-add the
> `routes` line in `wrangler.toml` (commented there) and the same `/apps/demo`
> paths work on the apex with no code change.

## Deploy

From this folder (`workers/oden-demo/`):

1. Log in (opens a browser — your stored token is expired):
   - `npx wrangler login`
2. Deploy:
   - `npx wrangler deploy`

Note the `oden-demo.<subdomain>.workers.dev` URL it prints, then open
`/apps/demo` on it.

## Changing the password

Default is `oden` (baked into `src/index.js`). To change it without touching
code, set a secret — it overrides the default:

- `npx wrangler secret put DEMO_PASSWORD`

Changing the password also invalidates existing session cookies (the cookie is
an HMAC derived from the password).

## Local test

- `npx wrangler dev --port 8787`
- Open `http://127.0.0.1:8787/apps/demo`

## The demo file

`demo.html` in this folder is the bundled demo. It is **git-ignored** on purpose
(see repo `.gitignore`) so it never lands on GitHub Pages. Keep a local copy; to
update the demo, replace `demo.html` here and redeploy. The username portion of
Basic-style checks is unused — only the password matters.
