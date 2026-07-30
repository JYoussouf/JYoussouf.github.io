/* Lightweight first-party analytics beacon for joseppy.ca.
   Usage: <script defer src="/assets/track.js" data-app="northern_eh"></script> */
(function () {
  "use strict";
  var ENDPOINT = "https://site-analytics.joseppy-workers.workers.dev/collect";
  var PING_INTERVAL_MS = 30000;

  var script = document.currentScript;
  var app = (script && script.getAttribute("data-app")) || "portfolio";
  var host = location.hostname;
  if (host === "localhost" || host === "127.0.0.1" || location.protocol === "file:") return;
  if (!navigator.sendBeacon || !window.crypto || !crypto.randomUUID) return;

  var sidKey = "sa_sid_" + app;
  var timeKey = sidKey + "_t";
  var sid = null;
  try { sid = sessionStorage.getItem(sidKey); } catch (e) {}
  if (!sid) {
    sid = crypto.randomUUID();
    try { sessionStorage.setItem(sidKey, sid); } catch (e) {}
  }

  var active = 0;
  try { active = Number(sessionStorage.getItem(timeKey)) || 0; } catch (e) {}
  var lastTick = document.visibilityState === "visible" ? Date.now() : null;

  function flushActive() {
    if (lastTick !== null) {
      var now = Date.now();
      active += (now - lastTick) / 1000;
      lastTick = now;
      try { sessionStorage.setItem(timeKey, String(Math.round(active))); } catch (e) {}
    }
  }

  function send(event) {
    flushActive();
    var payload = {
      app: app,
      sid: sid,
      event: event,
      active: Math.round(active)
    };
    if (event === "start") payload.ref = document.referrer || "";
    /* A plain string posts as text/plain, which skips the CORS preflight. */
    navigator.sendBeacon(ENDPOINT, JSON.stringify(payload));
  }

  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") {
      send("ping");
      lastTick = null;
    } else {
      lastTick = Date.now();
    }
  });
  window.addEventListener("pagehide", function () {
    send("ping");
    lastTick = null;
  });
  setInterval(function () {
    if (document.visibilityState === "visible") send("ping");
  }, PING_INTERVAL_MS);

  send("start");
})();
