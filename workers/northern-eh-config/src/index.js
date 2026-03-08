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

  if (url.pathname === "/api/config/northern-eh" && request.method === "GET") {
    assertOriginAllowed(request, env);
    return getNorthernEhConfig(request, env);
  }

  return json({ error: "not found" }, 404, request, env);
}

function getNorthernEhConfig(request, env) {
  const token = String(env.MAPBOX_PUBLIC_TOKEN_NORTHERN_EH || "").trim();
  if (!token) {
    return json({ error: "northern-eh token not configured" }, 503, request, env);
  }
  return json({ token }, 200, request, env);
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
    "Access-Control-Allow-Methods": "GET,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
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
