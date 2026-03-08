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

  if (url.pathname === "/api/northern-eh/geocode" && request.method === "GET") {
    assertOriginAllowed(request, env);
    return geocode(request, env, url);
  }

  if (url.pathname === "/api/northern-eh/reverse" && request.method === "GET") {
    assertOriginAllowed(request, env);
    return reverseGeocode(request, env, url);
  }

  return json({ error: "not found" }, 404, request, env);
}

function getMapboxToken(env) {
  const token = String(env.MAPBOX_PUBLIC_TOKEN_NORTHERN_EH || "").trim();
  if (!token) {
    const err = new Error("northern-eh token not configured");
    err.status = 503;
    throw err;
  }
  return token;
}

async function geocode(request, env, url) {
  const token = getMapboxToken(env);
  const query = (url.searchParams.get("q") || "").trim();
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") || "5"), 1), 10);
  if (!query) return json({ results: [] }, 200, request, env);

  const mapboxUrl = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`);
  mapboxUrl.searchParams.set("limit", String(limit));
  mapboxUrl.searchParams.set("access_token", token);

  const upstream = await fetch(mapboxUrl.toString(), { method: "GET" });
  if (!upstream.ok) return json({ error: `upstream geocode failed (${upstream.status})` }, 502, request, env);
  const payload = await upstream.json();
  const features = Array.isArray(payload?.features) ? payload.features : [];
  const results = features.map((f) => ({
    display_name: f?.place_name || "",
    lat: Array.isArray(f?.center) ? f.center[1] : null,
    lon: Array.isArray(f?.center) ? f.center[0] : null,
  })).filter((r) => Number.isFinite(r.lat) && Number.isFinite(r.lon));

  return json({ results }, 200, request, env);
}

async function reverseGeocode(request, env, url) {
  const token = getMapboxToken(env);
  const lat = Number(url.searchParams.get("lat"));
  const lon = Number(url.searchParams.get("lon"));
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return json({ error: "lat/lon required" }, 400, request, env);
  }

  const mapboxUrl = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${lon},${lat}.json`);
  mapboxUrl.searchParams.set("limit", "1");
  mapboxUrl.searchParams.set("access_token", token);

  const upstream = await fetch(mapboxUrl.toString(), { method: "GET" });
  if (!upstream.ok) return json({ error: `upstream reverse failed (${upstream.status})` }, 502, request, env);
  const payload = await upstream.json();
  const first = Array.isArray(payload?.features) ? payload.features[0] : null;
  const placeName = first?.place_name || `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
  return json({ place_name: placeName }, 200, request, env);
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
