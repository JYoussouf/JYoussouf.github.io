const DASH_URL = "https://joseppy.ca/analytics/";

const MAX_BODY_BYTES = 2048;
const MAX_ACTIVE_SECONDS = 6 * 3600;
const APP_RE = /^[a-z0-9_-]{1,40}$/;
const SID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const EVENT_NAME_RE = /^[a-z0-9_.-]{1,40}$/;
const MAX_META_CHARS = 120;
const MAX_REFERRER_CHARS = 100;

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

  if (url.pathname === "/collect" && request.method === "POST") {
    assertOriginAllowed(request, env);
    return collect(request, env);
  }

  if (url.pathname === "/api/stats" && request.method === "GET") {
    await assertDashKey(request, env);
    return getStats(request, env, url);
  }

  if ((url.pathname === "/" || url.pathname === "/dash") && request.method === "GET") {
    return Response.redirect(DASH_URL, 302);
  }

  return json({ error: "not found" }, 404, request, env);
}

async function collect(request, env) {
  const body = await readJsonBody(request);
  const app = String(body?.app || "").toLowerCase();
  const sid = String(body?.sid || "").toLowerCase();
  const event = String(body?.event || "");
  const active = clampInt(body?.active, 0, 0, MAX_ACTIVE_SECONDS);

  if (!APP_RE.test(app)) return json({ error: "invalid app" }, 400, request, env);
  if (!SID_RE.test(sid)) return json({ error: "invalid session" }, 400, request, env);
  if (event !== "start" && event !== "ping" && event !== "event") {
    return json({ error: "invalid event" }, 400, request, env);
  }

  const now = Date.now();
  const db = env.ANALYTICS_DB;

  if (event === "start") {
    const cf = request.cf || {};
    const device = detectDevice(request.headers.get("User-Agent") || "");
    const referrer = normalizeReferrer(body?.ref);
    await db
      .prepare(
        `INSERT INTO sessions (id, app, country, region, city, device, referrer, started_at, last_seen_at, duration_s)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?8, ?9)
         ON CONFLICT(id) DO UPDATE SET
           last_seen_at = excluded.last_seen_at,
           duration_s = MIN(MAX(sessions.duration_s, excluded.duration_s), (excluded.last_seen_at - sessions.started_at) / 1000 + 60)`
      )
      .bind(
        sid,
        app,
        strOrNull(cf.country),
        strOrNull(cf.region),
        strOrNull(cf.city),
        device,
        referrer,
        now,
        active
      )
      .run();
  } else if (event === "event") {
    const name = String(body?.name || "");
    if (!EVENT_NAME_RE.test(name)) return json({ error: "invalid event name" }, 400, request, env);
    const meta = String(body?.meta || "").trim().slice(0, MAX_META_CHARS) || null;
    await db
      .prepare("INSERT INTO events (session_id, app, name, meta, created_at) VALUES (?1, ?2, ?3, ?4, ?5)")
      .bind(sid, app, name, meta, now)
      .run();
  } else {
    await db
      .prepare(
        `UPDATE sessions SET
           last_seen_at = ?2,
           duration_s = MIN(MAX(duration_s, ?3), (?2 - started_at) / 1000 + 60)
         WHERE id = ?1 AND app = ?4`
      )
      .bind(sid, now, active, app)
      .run();
  }

  return json({ ok: true }, 202, request, env);
}

async function getStats(request, env, url) {
  const days = clampInt(url.searchParams.get("days"), 30, 1, 3650);
  const now = Date.now();
  const since = now - days * 86400000;
  const weekAgo = now - 7 * 86400000;
  const twoWeeksAgo = now - 14 * 86400000;
  const db = env.ANALYTICS_DB;

  const [apps, countries, daily, recent, totals, events, recentEvents, week, prevWeek, newCountries, weekEvents, longest, busiest] = await db.batch([
    db
      .prepare(
        `SELECT app, COUNT(*) AS plays, SUM(duration_s) AS total_s, CAST(AVG(duration_s) AS INTEGER) AS avg_s
         FROM sessions WHERE started_at >= ?1
         GROUP BY app ORDER BY plays DESC`
      )
      .bind(since),
    db
      .prepare(
        `SELECT app, COALESCE(country, '??') AS country, COUNT(*) AS plays, SUM(duration_s) AS total_s
         FROM sessions WHERE started_at >= ?1
         GROUP BY app, country ORDER BY plays DESC LIMIT 300`
      )
      .bind(since),
    db
      .prepare(
        `SELECT date(started_at / 1000, 'unixepoch') AS day, app, COUNT(*) AS plays
         FROM sessions WHERE started_at >= ?1
         GROUP BY day, app ORDER BY day ASC`
      )
      .bind(since),
    db
      .prepare(
        `SELECT app, country, region, city, device, referrer, started_at, duration_s
         FROM sessions WHERE started_at >= ?1
         ORDER BY started_at DESC LIMIT 30`
      )
      .bind(since),
    db
      .prepare(
        `SELECT COUNT(*) AS plays, SUM(duration_s) AS total_s,
                COUNT(DISTINCT country) AS countries
         FROM sessions WHERE started_at >= ?1`
      )
      .bind(since),
    db
      .prepare(
        `SELECT app, name, COUNT(*) AS count, COUNT(DISTINCT session_id) AS sessions
         FROM events WHERE created_at >= ?1
         GROUP BY app, name ORDER BY count DESC LIMIT 200`
      )
      .bind(since),
    db
      .prepare(
        `SELECT e.name, e.app, e.meta, e.created_at, s.country, s.region, s.city
         FROM events e LEFT JOIN sessions s ON s.id = e.session_id
         WHERE e.created_at >= ?1
         ORDER BY e.created_at DESC LIMIT 30`
      )
      .bind(since),
    db
      .prepare("SELECT COUNT(*) AS plays, COALESCE(SUM(duration_s), 0) AS total_s FROM sessions WHERE started_at >= ?1")
      .bind(weekAgo),
    db
      .prepare("SELECT COUNT(*) AS plays, COALESCE(SUM(duration_s), 0) AS total_s FROM sessions WHERE started_at >= ?1 AND started_at < ?2")
      .bind(twoWeeksAgo, weekAgo),
    db
      .prepare(
        `SELECT country, MIN(started_at) AS first_seen FROM sessions
         WHERE country IS NOT NULL GROUP BY country HAVING first_seen >= ?1`
      )
      .bind(weekAgo),
    db
      .prepare("SELECT name, COUNT(*) AS count FROM events WHERE created_at >= ?1 GROUP BY name")
      .bind(weekAgo),
    db
      .prepare(
        `SELECT app, duration_s, country, city FROM sessions
         WHERE started_at >= ?1 AND duration_s > 0 ORDER BY duration_s DESC LIMIT 1`
      )
      .bind(since),
    db
      .prepare(
        `SELECT date(started_at / 1000, 'unixepoch') AS day, COUNT(*) AS plays
         FROM sessions WHERE started_at >= ?1
         GROUP BY day ORDER BY plays DESC, day DESC LIMIT 1`
      )
      .bind(since),
  ]);

  /*
   * Account creations come from the passport's own users table, not the
   * beacon: a signup is a database row however old the visitor's bundle is
   * or whatever their ad blocker eats, and the funnel should not undercount
   * the one number that matters most. Guarded so a missing binding
   * degrades to absent rather than a broken dashboard.
   */
  let timmies = null;
  if (env.TIMMIES_DB) {
    try {
      const sinceIso = new Date(since).toISOString();
      const [accountsRow, usersRes, placesRes] = await Promise.all([
        env.TIMMIES_DB
          .prepare("SELECT COUNT(*) AS n FROM users WHERE created_at >= ?1")
          .bind(sinceIso)
          .first(),
        env.TIMMIES_DB
          .prepare(
            `SELECT u.id, u.display_name, u.created_at, COUNT(v.location_id) AS stamps
             FROM users u LEFT JOIN visits v ON v.user_id = u.id
             GROUP BY u.id ORDER BY stamps DESC, u.created_at ASC LIMIT 200`
          )
          .all(),
        env.TIMMIES_DB
          .prepare(
            `SELECT v.user_id, l.city, l.region, l.country_code, COUNT(*) AS n
             FROM visits v JOIN locations l ON l.id = v.location_id
             GROUP BY v.user_id, l.city, l.region, l.country_code
             ORDER BY n DESC`
          )
          .all(),
      ]);
      // Only display_name, join date, and stamped places cross this boundary -
      // email and password_hash stay inside the worker.
      const placesByUser = new Map();
      for (const p of placesRes.results || []) {
        if (!placesByUser.has(p.user_id)) placesByUser.set(p.user_id, []);
        const list = placesByUser.get(p.user_id);
        if (list.length < 8) {
          const where = [p.city, p.region].filter(Boolean).join(", ") || p.country_code || "?";
          list.push(p.n > 1 ? `${where} ×${p.n}` : where);
        }
      }
      timmies = {
        accounts: accountsRow?.n ?? 0,
        users: (usersRes.results || []).map((u) => ({
          name: u.display_name,
          joined: u.created_at,
          stamps: u.stamps,
          places: (placesByUser.get(u.id) || []).join(" · "),
        })),
      };
    } catch (e) {
      console.error("timmies accounts lookup failed", e);
    }
  }

  return json(
    {
      days,
      timmies,
      totals: totals.results?.[0] || { plays: 0, total_s: 0, countries: 0 },
      apps: apps.results || [],
      countries: countries.results || [],
      daily: daily.results || [],
      recent: recent.results || [],
      events: events.results || [],
      recentEvents: recentEvents.results || [],
      insights: {
        week: week.results?.[0] || { plays: 0, total_s: 0 },
        prevWeek: prevWeek.results?.[0] || { plays: 0, total_s: 0 },
        newCountries: newCountries.results || [],
        weekEvents: weekEvents.results || [],
        longest: longest.results?.[0] || null,
        busiest: busiest.results?.[0] || null,
      },
    },
    200,
    request,
    env
  );
}

async function assertDashKey(request, env) {
  const configured = String(env.DASH_KEY || "");
  if (!configured) {
    const err = new Error("dashboard key not configured");
    err.status = 503;
    throw err;
  }
  const provided = String(request.headers.get("x-dash-key") || "");
  const [a, b] = await Promise.all([sha256Hex(provided), sha256Hex(configured)]);
  // Comparing fixed-length digests keeps the comparison timing-independent of the secret.
  if (a !== b) {
    const err = new Error("unauthorized");
    err.status = 401;
    throw err;
  }
}

async function sha256Hex(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function readJsonBody(request) {
  const length = Number(request.headers.get("content-length") || 0);
  if (length > MAX_BODY_BYTES) {
    const err = new Error("payload too large");
    err.status = 413;
    throw err;
  }
  // sendBeacon posts strings as text/plain, so parse the raw text rather than requiring a JSON content type.
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) {
    const err = new Error("payload too large");
    err.status = 413;
    throw err;
  }
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

function detectDevice(userAgent) {
  return /Mobi|Android|iPhone|iPad|iPod/i.test(userAgent) ? "mobile" : "desktop";
}

function normalizeReferrer(raw) {
  const value = String(raw || "").trim();
  if (!value) return null;
  try {
    const host = new URL(value).hostname;
    if (!host || host === "joseppy.ca" || host === "www.joseppy.ca" || host === "jyoussouf.github.io") {
      return null;
    }
    return host.slice(0, MAX_REFERRER_CHARS);
  } catch {
    return null;
  }
}

function strOrNull(value) {
  const s = String(value || "").trim();
  return s ? s.slice(0, 80) : null;
}

function clampInt(raw, fallback, min, max) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

function assertOriginAllowed(request, env) {
  const origin = (request.headers.get("Origin") || "").trim();
  if (!origin) return;
  const allowed = getAllowedOrigins(env);
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
    "Access-Control-Allow-Headers": "Content-Type, x-dash-key",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

function preflight(request, env) {
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
