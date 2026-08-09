// Oden demo gate.
//
// This worker owns the `joseppy.ca/demo*` route. It serves a terminal-style
// password prompt, validates the password SERVER-SIDE, sets a signed session
// cookie, and only then serves the bundled OdenProStudios demo.
//
// The demo HTML is bundled into the worker at deploy time (see the [[rules]]
// Text rule in wrangler.toml) and is intentionally NOT published to GitHub
// Pages, so the only way to reach the content is through this worker, after
// authentication. There is no public copy to stumble onto.
import demoHtml from "../demo.html";

const COOKIE_NAME = "oden_demo_session";
const COOKIE_PATH = "/demo";

// Default password is "oden" per request. Override at deploy time without
// touching code via:  npx wrangler secret put DEMO_PASSWORD
function getPassword(env) {
  return env.DEMO_PASSWORD || "oden";
}

// ---- session token (HMAC so the cookie can't be forged) --------------------

async function sessionToken(password) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(password + "::oden-demo-v1"),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode("authenticated"));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

function readCookie(request, name) {
  const header = request.headers.get("Cookie") || "";
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return v.join("=");
  }
  return null;
}

async function isAuthed(request, env) {
  const cookie = readCookie(request, COOKIE_NAME);
  if (!cookie) return false;
  const expected = await sessionToken(getPassword(env));
  return safeEqual(cookie, expected);
}

// ---- responses --------------------------------------------------------------

const NO_INDEX = "noindex, nofollow, noarchive";

function loginPage(status = 200, failed = false) {
  return new Response(LOGIN_HTML.replace("__FAILED__", failed ? "true" : "false"), {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store, max-age=0",
      "X-Robots-Tag": NO_INDEX,
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    },
  });
}

function demoResponse() {
  return new Response(demoHtml, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store, max-age=0",
      "X-Robots-Tag": NO_INDEX,
      "X-Frame-Options": "DENY",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      // Burn-after-read: delete the session cookie the moment the demo is
      // served, so any refresh has no credential left and is bounced back to
      // the terminal prompt, forcing the password to be retyped every time.
      "Set-Cookie": `${COOKIE_NAME}=; Path=${COOKIE_PATH}; Max-Age=0; HttpOnly; Secure; SameSite=Lax`,
    },
  });
}

function redirect(to) {
  return new Response(null, {
    status: 302,
    headers: { Location: to, "Cache-Control": "no-store" },
  });
}

// ---- router -----------------------------------------------------------------

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/demo"; // strip trailing slash

    // The gated demo.
    if (path === "/demo/OdenProStudios") {
      if (await isAuthed(request, env)) return demoResponse();
      return redirect("/demo");
    }

    // Password submission.
    if (request.method === "POST" && path === "/demo") {
      let submitted = "";
      const ct = request.headers.get("Content-Type") || "";
      try {
        if (ct.includes("application/json")) {
          submitted = (await request.json()).password || "";
        } else {
          submitted = (await request.formData()).get("password") || "";
        }
      } catch {
        submitted = "";
      }

      if (!safeEqual(String(submitted), getPassword(env))) {
        return loginPage(401, true);
      }

      const token = await sessionToken(getPassword(env));
      // Short-lived single-use credential: this cookie only needs to survive the
      // immediate navigation to the demo, where it is consumed and deleted (see
      // demoResponse). It is a session cookie with no persistence.
      const cookie =
        `${COOKIE_NAME}=${token}; Path=${COOKIE_PATH}; HttpOnly; Secure; SameSite=Lax`;
      // 204 + cookie; the login page's JS then navigates to the demo.
      return new Response(null, {
        status: 204,
        headers: { "Set-Cookie": cookie, "Cache-Control": "no-store" },
      });
    }

    // Anything else under /demo -> the terminal login screen.
    // (If already authed, send straight to the demo.)
    if (await isAuthed(request, env)) return redirect("/demo/OdenProStudios");
    return loginPage();
  },
};

// ---- terminal login page ----------------------------------------------------

const LOGIN_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>oden://access</title>
<style>
  :root { --green: #33ff66; --dim: #1f8a3c; }
  * { box-sizing: border-box; }
  html, body { height: 100%; margin: 0; }
  body {
    background: #000;
    color: var(--green);
    font: 16px/1.5 "SFMono-Regular", "Consolas", "Liberation Mono", Menlo, monospace;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    overflow: hidden;
  }
  /* subtle CRT flicker + scanlines */
  body::after {
    content: "";
    position: fixed; inset: 0; pointer-events: none;
    background: repeating-linear-gradient(0deg, rgba(0,0,0,0) 0, rgba(0,0,0,0) 2px, rgba(0,0,0,.25) 3px);
    mix-blend-mode: multiply;
    animation: flicker 4s infinite;
  }
  @keyframes flicker { 0%,100%{opacity:.6} 50%{opacity:.8} }
  .screen { width: min(680px, 100%); text-shadow: 0 0 6px rgba(51,255,102,.5); }
  .line { white-space: pre-wrap; }
  .dim { color: var(--dim); }
  form { margin-top: 10px; display: flex; align-items: baseline; }
  .prompt { white-space: pre; }
  /* hidden real input; we render the value ourselves so we can show a block cursor */
  #pw {
    position: absolute; opacity: 0; left: -9999px;
  }
  #typed { white-space: pre; }
  .cursor {
    display: inline-block; width: 0.6ch; height: 1.1em;
    background: var(--green); margin-left: 1px;
    transform: translateY(0.18em);
    animation: blink 1s steps(1) infinite;
  }
  @keyframes blink { 50% { opacity: 0; } }
  .err { color: #ff5b5b; text-shadow: 0 0 6px rgba(255,91,91,.5); min-height: 1.5em; }
</style>
</head>
<body>
  <main class="screen" id="screen" onclick="document.getElementById('pw').focus()">
    <div class="line dim">(c) Oden Technologies — authorized access only</div>
    <div class="line">&nbsp;</div>
    <form id="form" autocomplete="off">
      <span class="prompt">pw: </span><span id="typed"></span><span class="cursor"></span>
      <input id="pw" type="password" autocomplete="off" autocapitalize="off"
             autocorrect="off" spellcheck="false" aria-label="password" autofocus>
    </form>
    <div class="err" id="err"></div>
  </main>
<script>
  var failed = __FAILED__;
  var pw = document.getElementById('pw');
  var typed = document.getElementById('typed');
  var err = document.getElementById('err');
  var form = document.getElementById('form');

  function render() { typed.textContent = "*".repeat(pw.value.length); }
  pw.addEventListener('input', render);
  pw.focus();

  if (failed) { err.textContent = "access denied — incorrect password"; }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    err.textContent = "";
    var value = pw.value;
    typed.textContent = "verifying...";
    fetch('/demo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: value })
    }).then(function (r) {
      if (r.status === 204) {
        window.location.assign('/demo/OdenProStudios');
      } else {
        render();
        err.textContent = "access denied — incorrect password";
        pw.value = ""; render(); pw.focus();
      }
    }).catch(function () {
      render();
      err.textContent = "link error — retry";
    });
  });
</script>
</body>
</html>`;
