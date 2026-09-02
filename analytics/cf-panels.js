/* =========================================================================
 * Cloudflare free-tier panels, shared by Pulse and the wroom dashboard.
 *
 * Both dashboards ask the same infrastructure question and neither owns it,
 * so the rendering lives here once rather than being kept in step by hand in
 * two files. It depends only on CSS custom properties both pages define
 * (--surface-1, --border, --muted, --accent, --ok/--warn/--bad …), so it
 * inherits whichever theme the host page is wearing.
 *
 * The one idea worth keeping in mind while reading this: every panel is
 * drawn to its OWN limit, so the dashed line across the top of a chart IS
 * that category's cap. Bar height is therefore a fraction of the limit, and
 * panels measured in rows, requests and bytes can honestly sit above one
 * another and be compared.
 * ========================================================================= */
(function (global) {
  "use strict";

  var API = "https://site-analytics.joseppy-workers.workers.dev";
  var KEY_STORAGE = "sa_dash_key";
  var POLL_MS = 60000;
  var STYLE_ID = "cf-panels-style";

  var CSS = [
    ".quota{display:grid;gap:14px}",
    ".qcard{background:var(--surface-1);background-image:var(--sheen,none);border:1px solid var(--border);overflow:hidden}",
    ".qcard.near{border-color:var(--warn)}",
    ".qcard.over{border-color:var(--bad)}",
    ".qhead{display:flex;align-items:baseline;justify-content:space-between;gap:8px 16px;flex-wrap:wrap;",
      "padding:11px 16px;border-bottom:1px solid var(--grid)}",
    ".qhead .qtitle{font-size:11px;font-weight:750;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.1em}",
    ".qmeta{display:flex;gap:16px;flex-wrap:wrap;font-size:12px;color:var(--muted);font-variant-numeric:tabular-nums}",
    ".qmeta .pct{font-weight:700;color:var(--ok)}",
    ".qmeta .pct.watch{color:var(--text-secondary)}",
    ".qmeta .pct.near{color:var(--warn)}",
    ".qmeta .pct.over{color:var(--bad)}",
    ".qbody{padding:14px 16px 10px}",
    ".qbody svg{display:block;width:100%;height:auto}",
    ".qbody svg .cf-limit{stroke:var(--bad);stroke-width:1;stroke-dasharray:4 4;vector-effect:non-scaling-stroke}",
    ".qbody svg .cf-base{stroke:var(--baseline);stroke-width:1;vector-effect:non-scaling-stroke}",
    ".qbody svg .cf-bar{fill:var(--accent)}",
    ".qbody svg .cf-bar.over{fill:var(--bad)}",
    ".qbody svg .cf-bar.today{opacity:0.45}",
    // A hovered bar brightens rather than changing colour, so the red of an
    // over-limit day still means over-limit while it is under the cursor.
    ".qbody svg .cf-bar.hot{filter:brightness(1.45)}",
    ".qbody svg .cf-hit{fill:transparent;cursor:crosshair}",
    ".qbody svg .cf-hit:hover{fill:var(--accent);fill-opacity:0.06}",
    ".qaxis{display:flex;justify-content:space-between;font-size:10.5px;color:var(--muted);",
      "text-transform:uppercase;letter-spacing:0.08em;padding-top:4px}",
    ".qnote{font-size:12px;color:var(--muted);margin-top:12px;max-width:80ch}",
    ".qerr{color:var(--bad);font-size:13px;padding:12px 0}"
  ].join("");

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var s = document.createElement("style");
    s.id = STYLE_ID;
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function getKey() {
    try { return localStorage.getItem(KEY_STORAGE) || ""; } catch (e) { return ""; }
  }

  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    for (var k in attrs || {}) {
      if (k === "text") n.textContent = attrs[k];
      else if (k === "class") n.className = attrs[k];
      else n.setAttribute(k, attrs[k]);
    }
    (kids || []).forEach(function (c) { n.appendChild(c); });
    return n;
  }
  function svgEl(tag, attrs) {
    var n = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (var k in attrs || {}) n.setAttribute(k, attrs[k]);
    return n;
  }

  function fmtBytes(n) {
    if (n >= 1073741824) return (n / 1073741824).toFixed(2) + " GB";
    if (n >= 1048576) return (n / 1048576).toFixed(1) + " MB";
    if (n >= 1024) return (n / 1024).toFixed(0) + " KB";
    return Math.round(n) + " B";
  }
  function fmtExact(n, unit) {
    return unit === "bytes" ? fmtBytes(n) : Math.round(n).toLocaleString();
  }
  function shortDate(iso) { var p = String(iso).split("-"); return p[1] + "-" + p[2]; }

  /* One tooltip for every panel on the page, borrowed from the host if it
   * has one so it inherits the dashboard's own styling. */
  function tipEl() {
    var t = document.getElementById("tooltip");
    if (t) return t;
    t = el("div", { class: "tooltip", id: "tooltip" });
    document.body.appendChild(t);
    return t;
  }

  function hideTip() {
    var t = document.getElementById("tooltip");
    if (t) t.style.display = "none";
  }

  function showTip(ev, cat, p) {
    var t = tipEl();
    var pctOfLimit = (100 * p.value) / cat.budget;
    t.style.display = "block";
    t.textContent = "";
    t.appendChild(el("div", { class: "t-day", text: longDate(p.date) }));
    t.appendChild(el("div", { class: "t-row", text: fmtExact(p.value, cat.unit) + " of " + fmtExact(cat.budget, cat.unit) }));
    t.appendChild(el("div", { class: "t-row", text: pctOfLimit.toFixed(pctOfLimit >= 10 ? 0 : 2) + "% of the " + (cat.period === "month" ? "daily share" : "daily limit") }));
    if (p.partial) t.appendChild(el("div", { class: "t-row", text: "today, still filling" }));
    /* Placement has one job beyond staying on screen: not covering the chart
     * it is reading from. Sitting below-right of the cursor put it straight
     * over the next few days' bars. So it goes ABOVE the cursor by default,
     * clear of the row being pointed at, and only drops below when there is
     * no room up there. Horizontally it flips near the right edge. */
    var w = t.offsetWidth || 200;
    var h = t.offsetHeight || 64;
    var x = ev.clientX + 16;
    if (x + w > window.innerWidth - 8) x = ev.clientX - w - 16;
    var y = ev.clientY - h - 16;
    if (y < 8) y = ev.clientY + 20;
    t.style.left = Math.max(8, x) + "px";
    t.style.top = Math.min(y, window.innerHeight - h - 8) + "px";
  }

  function longDate(iso) {
    var d = new Date(iso + "T12:00:00Z");
    if (isNaN(d)) return iso;
    return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
  }

  /* The reading the header shows. It follows the cursor so the number in the
   * corner always describes the bar being pointed at, and falls back to today
   * when nothing is - which is the figure you actually came to the page for.
   * Peak stays in its own field, because "have we ever breached" and "where
   * are we right now" are two different questions and one number cannot be
   * both. */
  function stateFor(pct) {
    return pct >= 100 ? "over" : pct >= 75 ? "near" : pct >= 40 ? "watch" : "clear";
  }

  function setReading(pctNode, cat, point) {
    if (!pctNode) return;
    var pct = (100 * point.value) / cat.budget;
    var when = point.partial ? "today" : shortDate(point.date);
    pctNode.textContent = (pct >= 10 ? pct.toFixed(0) : pct.toFixed(2)) + "% of limit · " + when;
    pctNode.className = "pct " + stateFor(pct);
  }

  function chart(cat, pctNode) {
    var W = 880, H = 112, TOP = 6;
    var n = cat.series.length || 1;
    var slot = W / n;
    var bw = Math.max(2, Math.min(18, slot * 0.62));
    var svg = svgEl("svg", { viewBox: "0 0 " + W + " " + (H + 3) });
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label",
      cat.label + ": daily usage against a limit of " + fmtExact(cat.limit, cat.unit) +
      ". Peak " + fmtExact(cat.peak, cat.unit) + ", " + cat.pct.toFixed(1) + " percent of the limit.");

    svg.appendChild(svgEl("line", { class: "cf-base", x1: 0, y1: H, x2: W, y2: H }));

    var bars = [];
    cat.series.forEach(function (p, i) {
      if (!p.value) { bars.push(null); return; }
      // Clipped a hair above the cap so an over-limit day still reads as a
      // bar that broke the line rather than one that merely touched it.
      var h = Math.max(1.5, Math.min(p.value / cat.budget, 1.06) * (H - TOP));
      var cls = "cf-bar";
      if (p.value > cat.budget) cls += " over";
      else if (i === n - 1) cls += " today";
      var r = svgEl("rect", {
        class: cls,
        x: (slot * i + (slot - bw) / 2).toFixed(1),
        y: Math.max(1, H - h).toFixed(1),
        width: bw.toFixed(1),
        height: Math.min(h, H - 1).toFixed(1)
      });
      svg.appendChild(r);
      bars.push(r);
    });

    // The cap sits above the bars that cross it, and below the hit columns.
    svg.appendChild(svgEl("line", { class: "cf-limit", x1: 0, y1: TOP, x2: W, y2: TOP }));

    /* Hovering has to work on the whole column, not the bar. A quiet day is a
     * 1.5px sliver 18px wide and chasing that with a mouse is not a feature,
     * so each day gets a transparent full-height target and the bar inside it
     * lights up. Added last so nothing is drawn over them. */
    cat.series.forEach(function (p, i) {
      var hit = svgEl("rect", {
        class: "cf-hit",
        x: (slot * i).toFixed(1),
        y: 0,
        width: slot.toFixed(1),
        height: H
      });
      var point = { date: p.date, value: p.value, partial: i === n - 1 };
      hit.addEventListener("mousemove", function (ev) {
        showTip(ev, cat, point);
        setReading(pctNode, cat, point);
        if (bars[i]) bars[i].classList.add("hot");
      });
      hit.addEventListener("mouseleave", function () {
        hideTip();
        setReading(pctNode, cat, todayPoint(cat));
        if (bars[i]) bars[i].classList.remove("hot");
      });
      svg.appendChild(hit);
    });

    return svg;
  }

  function todayPoint(cat) {
    var last = cat.series.length ? cat.series[cat.series.length - 1] : { date: "", value: 0 };
    return { date: last.date, value: last.value, partial: true };
  }

  function panel(cat) {
    var limitText = fmtExact(cat.limit, cat.unit) +
      (cat.period === "day" ? " / day" : cat.period === "month" ? " / month" : "");

    var pctNode = el("span", { class: "pct" });
    setReading(pctNode, cat, todayPoint(cat));

    // The card's edge still answers the peak: a category that broke its cap
    // this month should look broken even while today happens to be quiet.
    return el("div", { class: "qcard " + cat.state }, [
      el("div", { class: "qhead" }, [
        el("div", { class: "qtitle", text: cat.label }),
        el("div", { class: "qmeta" }, [
          el("span", { text: "limit " + limitText }),
          el("span", { text: "peak " + fmtExact(cat.peak, cat.unit) + (cat.peakDate ? " · " + shortDate(cat.peakDate) : "") }),
          pctNode
        ])
      ]),
      el("div", { class: "qbody" }, [
        chart(cat, pctNode),
        // Just the date range. A centred "LIMIT" used to sit here, which read
        // as an axis tick while the line it named was at the top of the chart,
        // and the header states the limit anyway. A monthly allowance still
        // gets a word, because plotting it per-day is not self-evident.
        el("div", { class: "qaxis" }, [
          el("span", { text: cat.series.length ? shortDate(cat.series[0].date) : "" }),
          el("span", { text: cat.period === "month" ? "bars are the daily share of the monthly limit" : "" }),
          el("span", { text: cat.series.length ? shortDate(cat.series[cat.series.length - 1].date) : "" })
        ])
      ])
    ]);
  }

  function paint(mount, data, opts) {
    mount.textContent = "";
    if (opts && opts.onMeta) opts.onMeta(data);

    var quota = el("div", { class: "quota" });
    (data.categories || []).forEach(function (cat) { quota.appendChild(panel(cat)); });
    mount.appendChild(quota);
    mount.appendChild(el("p", {
      class: "qnote",
      text: "Free-tier limits are account-wide: every D1 database shares one read budget and every Worker shares one request budget, so nothing here is filtered to a single project. Monthly allowances are drawn against the daily share a steady month would spend, so every panel reads on the same scale. The last bar is today, still filling."
    }));
  }

  /* One controller per mount point. It owns its own polling so a page can
   * have the panels on a tab that is not always showing, and stop the
   * traffic the moment that tab is not what somebody is looking at. */
  function create(mount, opts) {
    opts = opts || {};
    ensureStyle();
    var timer = null;
    var inFlight = false;
    var active = false;

    function fail(msg) {
      mount.textContent = "";
      mount.appendChild(el("div", { class: "qerr", text: msg }));
    }

    function load() {
      if (inFlight) return;
      var key = getKey();
      if (!key) {
        fail("No Pulse key on this browser. Open /analytics and enter the dashboard key once; this page reads the same one.");
        return;
      }
      inFlight = true;
      fetch(API + "/api/cloudflare?days=" + (opts.days || 30), { headers: { "x-dash-key": key } })
        .then(function (res) {
          // Text first, then parse. The worker always answers JSON, but
          // nothing between here and it promises to: an edge 502 or a
          // challenge page arrives as HTML, and parsing that up front would
          // replace every message below with "Unexpected token '<'".
          return res.text().then(function (raw) {
            var body = null;
            try { body = JSON.parse(raw); } catch (e) {}
            if (res.status === 401) throw new Error("Wrong or missing Pulse key for the Cloudflare data.");
            if (!res.ok) throw new Error((body && body.error) || ("Request failed: " + res.status));
            if (!body) throw new Error("Cloudflare data came back unreadable (HTTP " + res.status + ").");
            return body;
          });
        })
        .then(function (data) { paint(mount, data, opts); })
        .catch(function (err) { fail(err.message); })
        .finally(function () { inFlight = false; });
    }

    return {
      load: load,
      // Live, but only while somebody is looking. A background tab polling a
      // rate-limited upstream every minute earns a throttle and nothing else.
      start: function () {
        active = true;
        load();
        if (timer) return;
        timer = setInterval(function () {
          if (!active || document.hidden) return;
          load();
        }, POLL_MS);
      },
      stop: function () {
        active = false;
        if (timer) { clearInterval(timer); timer = null; }
      },
      isActive: function () { return active; }
    };
  }

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) return;
    (global.__cfPanels || []).forEach(function (c) { if (c.isActive()) c.load(); });
  });

  global.CloudflarePanels = {
    create: function (mount, opts) {
      var c = create(mount, opts);
      (global.__cfPanels = global.__cfPanels || []).push(c);
      return c;
    }
  };
})(window);
