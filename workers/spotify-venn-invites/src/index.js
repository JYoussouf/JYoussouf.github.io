const DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 7;
const MAX_TTL_SECONDS = 60 * 60 * 24 * 30;
const DEFAULT_MAX_PAYLOAD_CHARS = 22000;
const DEFAULT_CREATE_RATE_LIMIT_PER_MINUTE = 20;
const DEFAULT_RESOLVE_RATE_LIMIT_PER_MINUTE = 120;
const CODE_LENGTH = 8;
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

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

  if (url.pathname === "/api/invites" && request.method === "POST") {
    assertOriginAllowed(request, env);
    return createInvite(request, env);
  }

  if (url.pathname.startsWith("/api/invites/") && request.method === "GET") {
    assertOriginAllowed(request, env);
    const code = decodeURIComponent(url.pathname.split("/").pop() || "").trim();
    return resolveInvite(request, env, code);
  }

  return json({ error: "not found" }, 404, request, env);
}

async function createInvite(request, env) {
  await enforceRateLimit(request, env, "create");
  ensureJsonRequest(request);

  const body = await parseJsonBody(request);
  const payload = String(body?.payload || "").trim();
  const maxChars = toInt(env.MAX_PAYLOAD_CHARS, DEFAULT_MAX_PAYLOAD_CHARS);

  if (!payload) return json({ error: "payload required" }, 400, request, env);
  if (payload.length > maxChars) {
    return json({ error: `payload too large (max ${maxChars} chars)` }, 413, request, env);
  }

  const ttlRaw = toInt(env.INVITE_TTL_SECONDS, DEFAULT_TTL_SECONDS);
  const ttlSeconds = Math.min(ttlRaw, MAX_TTL_SECONDS);
  const now = Date.now();
  const expiresAt = new Date(now + ttlSeconds * 1000).toISOString();

  let code = "";
  for (let attempts = 0; attempts < 7; attempts += 1) {
    code = randomCode(CODE_LENGTH);
    const key = inviteKey(code);
    const exists = await env.INVITES.get(key);
    if (exists) continue;

    const record = {
      payload,
      createdAt: new Date(now).toISOString(),
      expiresAt,
    };

    await env.INVITES.put(key, JSON.stringify(record), { expirationTtl: ttlSeconds });
    return json({ code, expiresAt }, 201, request, env);
  }

  return json({ error: "could not allocate code" }, 503, request, env);
}

async function resolveInvite(request, env, code) {
  await enforceRateLimit(request, env, "resolve");

  if (!isCode(code)) {
    return json({ error: "invalid code" }, 400, request, env);
  }

  const key = inviteKey(code);
  const raw = await env.INVITES.get(key);
  if (!raw) {
    return json({ error: "code not found or expired" }, 404, request, env);
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return json({ error: "stored payload corrupt" }, 500, request, env);
  }

  if (toBool(env.BURN_AFTER_READ, false)) {
    await env.INVITES.delete(key);
  }

  return json({ payload: String(parsed?.payload || ""), expiresAt: parsed?.expiresAt || null }, 200, request, env);
}

function ensureJsonRequest(request) {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    const err = new Error("content-type must be application/json");
    err.status = 415;
    throw err;
  }
}

async function enforceRateLimit(request, env, scope) {
  const limit = scope === "create"
    ? toInt(env.CREATE_RATE_LIMIT_PER_MINUTE, DEFAULT_CREATE_RATE_LIMIT_PER_MINUTE)
    : toInt(env.RESOLVE_RATE_LIMIT_PER_MINUTE, DEFAULT_RESOLVE_RATE_LIMIT_PER_MINUTE);
  if (limit <= 0) return;

  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const minuteBucket = Math.floor(Date.now() / 60000);
  const key = `ratelimit:${scope}:${ip}:${minuteBucket}`;

  const current = Number(await env.INVITES.get(key) || "0");
  if (current >= limit) {
    const err = new Error("rate limit exceeded");
    err.status = 429;
    throw err;
  }

  await env.INVITES.put(key, String(current + 1), { expirationTtl: 70 });
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

function inviteKey(code) {
  return `invite:${code}`;
}

function isCode(code) {
  return /^[A-Za-z0-9_-]{6,16}$/.test(code);
}

function randomCode(length) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) {
    out += CODE_ALPHABET[b % CODE_ALPHABET.length];
  }
  return out;
}

function toInt(raw, fallback) {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function toBool(raw, fallback) {
  const val = String(raw ?? "").trim().toLowerCase();
  if (!val) return fallback;
  return val === "1" || val === "true" || val === "yes";
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
