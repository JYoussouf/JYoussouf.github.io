const MAX_LIMIT = 20;
const MAX_SCORE = 100000;
const SESSION_TTL_MS = 15 * 60 * 1000;
const TOKEN_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

export default {
  async fetch(request, env) {
    try {
      return await routeRequest(request, env);
    } catch (err) {
      const status = Number(err?.status) || 500;
      return json({ error: err?.message || "internal error" }, status, request, env);
    }
  },
};

async function routeRequest(request, env) {
  const url = new URL(request.url);

  if (request.method === "OPTIONS") {
    return preflight(request, env);
  }

  if (url.pathname === "/api/health" && request.method === "GET") {
    assertOriginAllowed(request, env, { allowMissingOrigin: true });
    return json({ ok: true, now: new Date().toISOString() }, 200, request, env);
  }

  if (url.pathname === "/api/leaderboard" && request.method === "GET") {
    assertOriginAllowed(request, env, { allowMissingOrigin: true });
    return getLeaderboard(request, env, url);
  }

  if (url.pathname === "/api/session" && request.method === "POST") {
    assertOriginAllowed(request, env);
    return createSession(request, env);
  }

  if (url.pathname === "/api/score" && request.method === "POST") {
    assertOriginAllowed(request, env);
    return submitScore(request, env);
  }

  return json({ error: "not found" }, 404, request, env);
}

async function getLeaderboard(request, env, url) {
  const limit = clampInt(url.searchParams.get("limit"), 10, 1, MAX_LIMIT);
  const query = "SELECT name, score FROM scores ORDER BY score DESC, created_at ASC LIMIT ?1";
  const result = await env.LEADERBOARD_DB.prepare(query).bind(limit).all();
  const entries = (result?.results || []).map((row) => [row.name, row.score]);
  return json({ entries }, 200, request, env);
}

async function submitScore(request, env) {
  ensureJsonRequest(request);
  const body = await parseJsonBody(request);
  const name = normalizeName(body?.n ?? body?.name);
  const score = toInt(body?.s ?? body?.score);
  const token = String(body?.t ?? body?.token ?? "").trim();

  if (!name) return json({ error: "invalid name" }, 400, request, env);
  if (!Number.isFinite(score) || score < 0 || score > MAX_SCORE) {
    return json({ error: "invalid score" }, 400, request, env);
  }
  if (!token) return json({ error: "invalid session" }, 403, request, env);

  const session = await env.LEADERBOARD_DB
    .prepare("SELECT name, expires_at FROM sessions WHERE token = ?1")
    .bind(token)
    .first();
  const now = Date.now();
  if (!session || session.expires_at < now || String(session.name) !== name) {
    return json({ error: "invalid session" }, 403, request, env);
  }

  await env.LEADERBOARD_DB
    .prepare("DELETE FROM sessions WHERE token = ?1")
    .bind(token)
    .run();

  await env.LEADERBOARD_DB
    .prepare("INSERT INTO scores (name, score, created_at) VALUES (?1, ?2, ?3)")
    .bind(name, score, now)
    .run();

  return json({ ok: true }, 201, request, env);
}

async function createSession(request, env) {
  ensureJsonRequest(request);
  const body = await parseJsonBody(request);
  const name = normalizeName(body?.n ?? body?.name);
  if (!name) return json({ error: "invalid name" }, 400, request, env);

  const token = randomToken(24);
  const expiresAt = Date.now() + SESSION_TTL_MS;

  await env.LEADERBOARD_DB
    .prepare("INSERT INTO sessions (token, name, expires_at) VALUES (?1, ?2, ?3)")
    .bind(token, name, expiresAt)
    .run();

  return json({ t: token, exp: expiresAt }, 201, request, env);
}

function normalizeName(raw) {
  const cleaned = String(raw || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 3);
  return cleaned.length === 3 ? cleaned : "";
}

function ensureJsonRequest(request) {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    const err = new Error("content-type must be application/json");
    err.status = 415;
    throw err;
  }
}

function clampInt(raw, fallback, min, max) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

function toInt(raw) {
  const n = Number(raw);
  return Number.isFinite(n) ? Math.floor(n) : NaN;
}

function randomToken(length) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) {
    out += TOKEN_ALPHABET[b % TOKEN_ALPHABET.length];
  }
  return out;
}

function assertOriginAllowed(request, env, { allowMissingOrigin = false } = {}) {
  const origin = (request.headers.get("Origin") || "").trim();
  const allowed = getAllowedOrigins(env);

  if (!origin) {
    if (allowMissingOrigin) return;
    const err = new Error("missing origin");
    err.status = 403;
    throw err;
  }

  if (!allowed.has(origin)) {
    const err = new Error("origin not allowed");
    err.status = 403;
    throw err;
  }
}

function getAllowedOrigins(env) {
  const configured = String(env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return new Set(configured);
}

function getCorsHeaders(request, env) {
  const origin = (request.headers.get("Origin") || "").trim();
  const allowed = getAllowedOrigins(env);
  if (!origin || !allowed.has(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

async function parseJsonBody(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function preflight(request, env) {
  try {
    assertOriginAllowed(request, env, { allowMissingOrigin: false });
  } catch {
    return new Response(null, {
      status: 403,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  }

  return new Response(null, {
    status: 204,
    headers: {
      ...getCorsHeaders(request, env),
      ...securityHeaders(),
      "Cache-Control": "no-store",
    },
  });
}

function json(payload, status, request, env) {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...securityHeaders(),
    ...getCorsHeaders(request, env),
  };
  return new Response(JSON.stringify(payload), { status, headers });
}

function securityHeaders() {
  return {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  };
}
