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
    /* ONE ROW, ALWAYS. Wrapping dropped the controls onto a second line on
     * the narrower panels, which is the clunkiness this was meant to remove.
     * So the row does not wrap: the meta shrinks, and because the reading
     * comes first in it, the limit is what gets clipped on a narrow screen -
     * the number somebody came for survives, the context does not. */
    ".qhead{display:flex;align-items:center;gap:8px 14px;flex-wrap:nowrap;",
      "padding:9px 16px;border-bottom:1px solid var(--grid)}",
    ".qhead .qtitle{font-size:11px;font-weight:750;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.1em}",
    ".qmeta{display:flex;gap:14px;font-size:12px;color:var(--muted);font-variant-numeric:tabular-nums;",
      "flex:1 1 auto;min-width:0;overflow:hidden;white-space:nowrap}",
    ".qhead .qtitle{flex:0 0 auto}",
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
    ".qerr{color:var(--bad);font-size:13px;padding:12px 0}",
    /* The mode switch and the window picker. Same vocabulary as the rest of
     * the page: hard edges, uppercase micro-labels, the accent only on what
     * is currently true. */
    ".qseg{display:flex;border:1px solid var(--border)}",
    ".qseg button{appearance:none;background:transparent;border:0;border-left:1px solid var(--border);",
      "color:var(--muted);font:inherit;font-size:10px;font-weight:750;text-transform:uppercase;",
      "letter-spacing:0.1em;padding:3px 9px;cursor:pointer;",
      // Nothing on this page has a radius, so smoothness has to come from
      // the transitions rather than from the corners.
      "transition:background-color 140ms ease,color 140ms ease}",
    ".qseg button:first-child{border-left:0}",
    ".qseg button.on{background:var(--accent);color:var(--surface-1)}",
    ".qseg button:hover:not(.on){color:var(--text-secondary)}",
    /* Pinned right, whatever else the header is carrying. */
    ".qhead .qtools{display:flex;gap:8px;align-items:center;margin-left:auto}",
    ".qseg{transition:opacity 140ms ease}",
    ".qseg.hidden{opacity:0;pointer-events:none}",
    /* The chart fades in rather than snapping, so switching modes reads as
     * one view changing instead of two views swapping. */
    ".qbody{transition:opacity 160ms ease}",
    ".qbody.swapping{opacity:0}",
    ".qmeta .proj{font-weight:700}",
    ".qmeta .proj.watch{color:var(--text-secondary)}",
    ".qmeta .proj.near{color:var(--warn)}",
    ".qmeta .proj.over{color:var(--bad)}",
    /* The burn line, and the ground it stands on. A line rather than bars:
     * an hourly series is a rate over time, and sixty bars read as texture
     * while a line reads as a slope. */
    ".qbody svg .cf-line{fill:none;stroke:var(--accent);stroke-width:1.5;stroke-linejoin:round;",
      "stroke-linecap:round;vector-effect:non-scaling-stroke}",
    ".qbody svg .cf-area{fill:var(--accent);fill-opacity:0.12}",
    ".qbody svg .cf-now{fill:var(--accent)}",
    ".qbody svg .cf-guide{stroke:var(--text-secondary);stroke-width:1;stroke-dasharray:2 2;vector-effect:non-scaling-stroke}",
    ".qbody svg .cf-dot{fill:var(--accent);stroke:var(--surface-1);stroke-width:1.5}",
    ".qbody svg .cf-grid{stroke:var(--grid);stroke-width:1;vector-effect:non-scaling-stroke}",
    ".qbody svg .cf-ytick{fill:var(--muted);font-size:9px;letter-spacing:0.06em}",
    /* The trailing average, drawn across the hours it is the average of. */
    ".qbody svg .cf-rate{stroke:var(--text-secondary);stroke-width:1;stroke-dasharray:2 3;vector-effect:non-scaling-stroke}",
    /* Where today lands if it carries on: today's bar, continued. */
    ".qbody svg .cf-ghost{fill:var(--accent);fill-opacity:0.28}",
    ".qbody svg .cf-ghost.over{fill:var(--bad);fill-opacity:0.32}",
    ".qbody svg .cf-ghost.hot{fill-opacity:0.55}",
    ".qhint{font-size:11.5px;color:var(--muted);padding-top:6px}"
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

  /* Which categories a burn view means anything for: the ones capped per
   * day. Storage is a level, not a flow, and the monthly R2 budgets are
   * nowhere near their walls - an hourly chart of either is noise. */
  var BURNABLE = { d1RowsRead: 1, d1RowsWritten: 1, workerRequests: 1 };
  var WINDOWS = [
    { hours: 24, label: "24h" },
    { hours: 48, label: "48h" },
    { hours: 168, label: "7d" }
  ];

  /* Per-category view state, module-scoped so it SURVIVES THE POLL. The
   * panels are rebuilt from scratch every minute; state held on the node
   * would silently flip a burn view back to daily under the reader. */
  var view = {};
  function viewOf(key) {
    if (!view[key]) view[key] = { mode: "daily", hours: 24 };
    return view[key];
  }

  /* Hourly payloads, one per window, shared by every panel on the page: all
   * three categories come back in the same response, so a panel switching to
   * burn usually costs no request at all. */
  var burn = {};
  function burnState(hours) {
    if (!burn[hours]) burn[hours] = { status: "idle", data: null, error: "", at: 0, waiters: [] };
    return burn[hours];
  }

  function fmtBytes(n) {
    if (n >= 1073741824) return (n / 1073741824).toFixed(2) + " GB";
    if (n >= 1048576) return (n / 1048576).toFixed(1) + " MB";
    if (n >= 1024) return (n / 1024).toFixed(0) + " KB";
    return Math.round(n) + " B";
  }
  /* Axis labels have about forty pixels. "1,664,093" does not fit and
   * "1.66M" carries the same decision. Exact figures stay in the tooltip,
   * where there is room to be exact. */
  function fmtCompact(n, unit) {
    if (unit === "bytes") return fmtBytes(n);
    var a = Math.abs(n);
    if (a >= 1e9) return (n / 1e9).toFixed(a < 1e10 ? 2 : 1) + "B";
    if (a >= 1e6) return (n / 1e6).toFixed(a < 1e7 ? 2 : 1) + "M";
    if (a >= 1e4) return Math.round(n / 1e3) + "K";
    if (a >= 1e3) return (n / 1e3).toFixed(1) + "K";
    return String(Math.round(n));
  }

  /** A round number at or above v, so an axis reads 1.8M rather than 1.79M. */
  function niceCeil(v) {
    if (!(v > 0)) return 1;
    var e = Math.pow(10, Math.floor(Math.log(v) / Math.LN10));
    var m = v / e;
    var step = m <= 1 ? 1 : m <= 1.5 ? 1.5 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 3 ? 3 : m <= 4 ? 4 : m <= 5 ? 5 : m <= 7.5 ? 7.5 : 10;
    return step * e;
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
    placeTip(t, ev);
  }

  /* Placement has one job beyond staying on screen: not covering the chart
   * it is reading from. Above the cursor by default, clear of the row being
   * pointed at, dropping below only when there is no room up there, and
   * flipping horizontally near the right edge. */
  function placeTip(t, ev) {
    var w = t.offsetWidth || 200;
    var h = t.offsetHeight || 64;
    var x = ev.clientX + 16;
    if (x + w > window.innerWidth - 8) x = ev.clientX - w - 16;
    var y = ev.clientY - h - 16;
    if (y < 8) y = ev.clientY + 20;
    t.style.left = Math.max(8, x) + "px";
    t.style.top = Math.min(y, window.innerHeight - h - 8) + "px";
  }

  /** What the pale block says when you point at it. Same three lines as a
   *  day's tooltip, in the same order, so the two read as one family. */
  function showProjTip(ev, cat, proj) {
    var t = tipEl();
    var pct = (100 * proj.value) / cat.budget;
    t.style.display = "block";
    t.textContent = "";
    t.appendChild(el("div", { class: "t-day", text: "Projected by 00:00 UTC" }));
    t.appendChild(el("div", { class: "t-row", text: fmtExact(proj.value, cat.unit) + " of " + fmtExact(cat.budget, cat.unit) }));
    t.appendChild(el("div", { class: "t-row", text: pct.toFixed(pct >= 10 ? 0 : 2) + "% of the daily limit" }));
    t.appendChild(el("div", { class: "t-row", text: proj.basis }));
    placeTip(t, ev);
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
  /* How much of the current UTC day has already happened. The limits reset
   * at 00:00 UTC, so this is the only clock that matters here - a projection
   * against local midnight would be wrong by the offset every day. */
  function utcDayElapsed() {
    var now = new Date();
    var ms = now.getTime() - Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    return Math.min(1, Math.max(1 / 1440, ms / 86400000));
  }

  /**
   * Where today lands if it carries on as it has been going.
   *
   * TWO BASES, and the difference matters. With hourly data the rate is the
   * average of the COMPLETE hours in the chosen window, and the projection is
   * today's actual total plus that rate for the hours left in the UTC day -
   * so a quiet night followed by a busy morning is not flattened. Without it,
   * all that can honestly be said is today-so-far divided by the fraction of
   * the day elapsed, which assumes a flat day and says so.
   *
   * Early in a UTC day the flat estimate is violent: at 00:20 it multiplies
   * twenty minutes by seventy-two. Below a floor of elapsed time it returns
   * nothing rather than a number that would only mislead.
   */
  /** The window the projection is made from, whatever the chart is showing.
   *  The picker changes the x-range of the burn line; it should not silently
   *  change what "projected" means from one glance to the next. */
  var PROJECT_HOURS = 24;

  function project(cat) {
    if (cat.period !== "day") return null;
    var today = cat.latest || 0;
    var elapsed = utcDayElapsed();
    var st = burnState(PROJECT_HOURS);
    var series = st.data && st.data.categories ? st.data.categories[cat.key] : null;

    if (series && series.length) {
      var done = series.filter(function (b) { return !b.partial; });
      if (done.length) {
        var sum = 0;
        done.forEach(function (b) { sum += b.value; });
        var rate = sum / done.length;
        return {
          value: today + rate * (24 - elapsed * 24),
          basis: "today so far plus the last 24h average for the hours left before 00:00 UTC",
          rate: rate
        };
      }
    }
    if (elapsed < 0.08) return null;
    return {
      value: today / elapsed,
      basis: "flat-day estimate: today so far over the fraction of the UTC day elapsed",
      rate: null
    };
  }

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

    /* WHERE TODAY LANDS, drawn on top of today's own bar: the projection
     * belongs on the daily chart, because the daily chart is the one whose
     * bars are days and whose dashed line is the daily cap. Reading it off an
     * hourly chart meant comparing a number against a scale it was not on. */
    var proj = project(cat);
    var ghost = null;
    if (proj && n) {
      var todayVal = cat.series[n - 1].value || 0;
      if (proj.value > todayVal) {
        var hNow = Math.max(0, Math.min(todayVal / cat.budget, 1.06) * (H - TOP));
        var hProj = Math.max(1.5, Math.min(proj.value / cat.budget, 1.06) * (H - TOP));
        var gRect = svgEl("rect", {
          class: "cf-ghost" + (proj.value > cat.budget ? " over" : ""),
          x: (slot * (n - 1) + (slot - bw) / 2).toFixed(1),
          y: Math.max(1, H - hProj).toFixed(1),
          width: bw.toFixed(1),
          height: Math.max(1, hProj - hNow).toFixed(1)
        });
        svg.appendChild(gRect);
        // Kept so the hit test below can tell "over the projection" from
        // "over today so far": one column, two readings.
        ghost = { rect: gRect, barTop: H - hNow, proj: proj };
      }
    }

    // The cap sits above the bars that cross it, and below the hit columns.
    svg.appendChild(svgEl("line", { class: "cf-limit", x1: 0, y1: TOP, x2: W, y2: TOP }));

    /* Hovering has to work on the whole column, not the bar. A quiet day is a
     * 1.5px sliver 18px wide and chasing that with a mouse is not a feature,
     * so each day gets a transparent full-height target and the bar inside it
     * lights up. Added last so nothing is drawn over them. */
    cat.series.forEach(function (p, i) {
      var point = { date: p.date, value: p.value, partial: i === n - 1 };
      var isToday = i === n - 1;

      /* TODAY'S COLUMN HAS TWO THINGS IN IT and used to answer for one. The
       * blue is what has been spent; the pale block above it is where the
       * day lands. A single full-height target reported the spent figure
       * even with the cursor inside the projection, which is the one place
       * the two numbers are side by side and easiest to confuse. Split at
       * the top of the bar: below is today so far, above is the projection. */
      var zones = [];
      if (isToday && ghost) {
        zones.push({ y: 0, h: Math.max(1, ghost.barTop), proj: true });
        zones.push({ y: ghost.barTop, h: Math.max(1, H - ghost.barTop), proj: false });
      } else {
        zones.push({ y: 0, h: H, proj: false });
      }

      zones.forEach(function (z) {
        var hit = svgEl("rect", {
          class: "cf-hit",
          x: (slot * i).toFixed(1),
          y: z.y.toFixed(1),
          width: slot.toFixed(1),
          height: z.h.toFixed(1)
        });
        hit.addEventListener("mousemove", function (ev) {
          if (z.proj) {
            showProjTip(ev, cat, ghost.proj);
            ghost.rect.classList.add("hot");
            return;
          }
          showTip(ev, cat, point);
          setReading(pctNode, cat, point);
          if (bars[i]) bars[i].classList.add("hot");
        });
        hit.addEventListener("mouseleave", function () {
          hideTip();
          setReading(pctNode, cat, todayPoint(cat));
          if (z.proj) ghost.rect.classList.remove("hot");
          else if (bars[i]) bars[i].classList.remove("hot");
        });
        svg.appendChild(hit);
      });
    });

    return svg;
  }

  /**
   * A smooth path through points, WITHOUT INVENTING VALUES.
   *
   * Monotone cubic (Fritsch-Carlson), not a plain spline: a spline through
   * spiky hourly data overshoots between points, and an overshoot here would
   * draw a peak higher than any hour actually reached. This one cannot go
   * above the points it joins - where the data turns, the tangent is flat.
   */
  function smoothPath(xs, ys) {
    var n = xs.length;
    if (n === 0) return "";
    if (n < 3) {
      return "M" + xs.map(function (x, i) { return x.toFixed(1) + "," + ys[i].toFixed(1); }).join("L");
    }
    var d = [], m = [], i;
    for (i = 0; i < n - 1; i += 1) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
    m.push(d[0]);
    for (i = 1; i < n - 1; i += 1) {
      if (d[i - 1] * d[i] <= 0) m.push(0);
      else {
        var t = (d[i - 1] + d[i]) / 2;
        var lim = 3 * Math.min(Math.abs(d[i - 1]), Math.abs(d[i]));
        m.push(Math.sign(t) * Math.min(Math.abs(t), lim));
      }
    }
    m.push(d[n - 2]);

    var out = "M" + xs[0].toFixed(1) + "," + ys[0].toFixed(1);
    for (i = 0; i < n - 1; i += 1) {
      var h = (xs[i + 1] - xs[i]) / 3;
      out += "C" + (xs[i] + h).toFixed(1) + "," + (ys[i] + m[i] * h).toFixed(1) +
        " " + (xs[i + 1] - h).toFixed(1) + "," + (ys[i + 1] - m[i + 1] * h).toFixed(1) +
        " " + xs[i + 1].toFixed(1) + "," + ys[i + 1].toFixed(1);
    }
    return out;
  }

  /* The hourly chart: a line, on a scale that is DRAWN rather than implied.
   *
   * Two wrong answers preceded this one. Clipping at the hourly share made
   * an hour at 393% of the share identical to one at 106%. Clipping at the
   * ninetieth percentile then made 622,283 and 1,664,093 the same height,
   * which is worse - a chart where unequal things look equal is not a chart.
   *
   * The fix was never a cleverer clip. It was a y-axis. The scale now runs
   * from zero to a round number at or above the window's true peak, three
   * gridlines carry their values, and nothing is clipped or hidden. Quiet
   * hours are small because they ARE small, and the axis says by how much.
   * The hourly share keeps its dashed line wherever it falls, and the axis
   * always includes it, so "a day landing exactly on the cap" stays legible
   * even in a window where nothing came close.
   */
  function burnChart(cat, series, hours, pctNode) {
    var W = 880, H = 112, TOP = 8, PAD_L = 54;
    var share = cat.budget / 24;
    var n = series.length || 1;
    var slot = (W - PAD_L) / n;

    var peak = 0, sum = 0, done = 0;
    series.forEach(function (b) {
      if (b.value > peak) peak = b.value;
      if (!b.partial) { sum += b.value; done += 1; }
    });

    // The axis covers the peak AND the share: the share line is a reference
    // and a reference off the top of the frame is no reference at all.
    var yMax = niceCeil(Math.max(peak, share) || 1);
    var y = function (v) { return H - (Math.max(0, v) / yMax) * (H - TOP); };
    var x = function (i) { return PAD_L + slot * i + slot / 2; };

    var svg = svgEl("svg", { viewBox: "0 0 " + W + " " + (H + 14) });
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label",
      cat.label + ": hourly rate over the last " + hours + " hours, from zero to " +
      fmtExact(yMax, cat.unit) + " an hour. Peak " + fmtExact(peak, cat.unit) +
      ", hourly share " + fmtExact(share, cat.unit) + ".");

    // Three gridlines with their values: top, middle, zero.
    [1, 0.5, 0].forEach(function (f) {
      var v = yMax * f;
      var gy = y(v);
      svg.appendChild(svgEl("line", { class: f === 0 ? "cf-base" : "cf-grid", x1: PAD_L, y1: gy.toFixed(1), x2: W, y2: gy.toFixed(1) }));
      var label = svgEl("text", { class: "cf-ytick", x: PAD_L - 8, y: (gy + (f === 1 ? 4 : f === 0 ? 0 : 3)).toFixed(1) });
      label.setAttribute("text-anchor", "end");
      label.textContent = f === 0 ? "0" : fmtCompact(v, cat.unit);
      svg.appendChild(label);
    });

    var xs = series.map(function (b, i) { return x(i); });
    var ys = series.map(function (b) { return y(b.value); });
    var line = smoothPath(xs, ys);
    if (line) {
      // The area is the same curve, closed down to the baseline, so the fill
      // never disagrees with the stroke by a pixel.
      svg.appendChild(svgEl("path", {
        class: "cf-area",
        d: line + "L" + xs[n - 1].toFixed(1) + "," + H + "L" + xs[0].toFixed(1) + "," + H + "Z"
      }));
      svg.appendChild(svgEl("path", { class: "cf-line", d: line }));
    }

    // The hourly share, and the trailing average the projection is made from.
    svg.appendChild(svgEl("line", { class: "cf-limit", x1: PAD_L, y1: y(share).toFixed(1), x2: W, y2: y(share).toFixed(1) }));
    if (done) {
      var avg = sum / done;
      svg.appendChild(svgEl("line", { class: "cf-rate", x1: PAD_L, y1: y(avg).toFixed(1), x2: W, y2: y(avg).toFixed(1) }));
    }

    // The hour still filling, marked rather than left to look like a dip.
    var last = series[n - 1];
    if (last) {
      svg.appendChild(svgEl("circle", { class: "cf-now", cx: x(n - 1).toFixed(1), cy: y(last.value).toFixed(1), r: 2.5 }));
    }

    var guide = svgEl("line", { class: "cf-guide", x1: 0, y1: 0, x2: 0, y2: H, style: "display:none" });
    var dot = svgEl("circle", { class: "cf-dot", cx: 0, cy: 0, r: 3.5, style: "display:none" });
    series.forEach(function (b, i) {
      var hit = svgEl("rect", { class: "cf-hit", x: (PAD_L + slot * i).toFixed(1), y: 0, width: slot.toFixed(1), height: H });
      hit.addEventListener("mousemove", function (ev) {
        showHourTip(ev, cat, b, share);
        guide.setAttribute("x1", x(i).toFixed(1));
        guide.setAttribute("x2", x(i).toFixed(1));
        guide.removeAttribute("style");
        dot.setAttribute("cx", x(i).toFixed(1));
        dot.setAttribute("cy", y(b.value).toFixed(1));
        dot.removeAttribute("style");
      });
      hit.addEventListener("mouseleave", function () {
        hideTip();
        guide.setAttribute("style", "display:none");
        dot.setAttribute("style", "display:none");
      });
      svg.appendChild(hit);
    });
    svg.appendChild(guide);
    svg.appendChild(dot);

    setReading(pctNode, cat, todayPoint(cat));
    return { svg: svg, peak: peak, share: share, top: yMax };
  }

  function hourLabel(t) {
    var d = new Date(t);
    if (isNaN(d)) return String(t);
    return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC", hour12: false }) + " UTC";
  }

  function showHourTip(ev, cat, b, share) {
    var t = tipEl();
    t.style.display = "block";
    t.textContent = "";
    t.appendChild(el("div", { class: "t-day", text: hourLabel(b.t) }));
    t.appendChild(el("div", { class: "t-row", text: fmtExact(b.value, cat.unit) + " in that hour" }));
    t.appendChild(el("div", { class: "t-row", text: Math.round((100 * b.value) / share) + "% of the hourly share" }));
    if (b.partial) t.appendChild(el("div", { class: "t-row", text: "this hour, still filling" }));
    placeTip(t, ev);
  }

  /* One request per window for the whole page, and never more than one in
   * flight: three panels asking for 24h at the same moment is one fetch. */
  function loadBurn(hours, onDone) {
    var st = burnState(hours);
    if (st.status === "loading") { st.waiters.push(onDone); return; }
    if (st.status === "ready" && Date.now() - st.at < POLL_MS) { onDone(); return; }
    st.status = "loading";
    st.waiters = st.waiters || [];
    st.waiters.push(onDone);
    var key = getKey();
    fetch(API + "/api/cloudflare/burn?hours=" + hours, { headers: { "x-dash-key": key } })
      .then(function (res) {
        return res.text().then(function (raw) {
          var body = null;
          try { body = JSON.parse(raw); } catch (e) {}
          if (!res.ok) throw new Error((body && body.error) || ("Request failed: " + res.status));
          if (!body) throw new Error("Hourly data came back unreadable.");
          return body;
        });
      })
      .then(function (data) {
        st.data = data;
        st.error = data.source === "hourly" ? "" : (data.reason || "hourly data unavailable");
      })
      .catch(function (err) { st.data = null; st.error = err.message; })
      .finally(function () {
        st.status = "ready";
        st.at = Date.now();
        var ws = st.waiters || [];
        st.waiters = [];
        ws.forEach(function (f) { f(); });
      });
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

    var st = viewOf(cat.key);
    var burnable = !!BURNABLE[cat.key];
    var body = el("div", { class: "qbody" });

    /* DAILY answers "how did the last month go"; BURN answers "is today on
     * course", which the daily chart cannot: a bar 40% full at 10am is either
     * fine or a disaster and the shape of the day is the difference. */
    /* One view changing, not two swapping: the body fades, is rebuilt, and
     * fades back on the next frame. Cheap, and it stops a mode switch from
     * reading as a flash of some other panel. */
    var painted = false;
    function render() {
      if (painted) body.classList.add("swapping");
      body.textContent = "";
      if (!burnable || st.mode === "daily") {
        body.appendChild(chart(cat, pctNode));
        unfade();
        body.appendChild(el("div", { class: "qaxis" }, [
          el("span", { text: cat.series.length ? shortDate(cat.series[0].date) : "" }),
          el("span", {
            text: cat.period === "month"
              ? "bars are the daily share of the monthly limit"
              : (project(cat) ? "the pale block on today is where it lands by 00:00 UTC" : "")
          }),
          el("span", { text: cat.series.length ? shortDate(cat.series[cat.series.length - 1].date) : "" })
        ]));
        return;
      }

      var bs = burnState(st.hours);
      var series = bs.data && bs.data.categories ? bs.data.categories[cat.key] : null;
      // A dataset can fail on its own now, so the reason is per category.
      var why = (bs.data && bs.data.reasons && bs.data.reasons[cat.key]) || bs.error;
      if (bs.status === "loading" && !series) {
        body.appendChild(el("div", { class: "qhint", text: "Reading hourly usage…" }));
        return;
      }
      if (!series || !series.length) {
        // The honest failure: say what is missing and keep the projection,
        // which the daily figure alone can still support.
        body.appendChild(el("div", { class: "qhint", text: why || "No hourly data for this window." }));
        body.appendChild(el("div", { class: "qhint", text: "The daily view still projects today from a flat-day estimate." }));
        return;
      }
      var drawn = burnChart(cat, series, st.hours, pctNode);
      body.appendChild(drawn.svg);
      // An axis that rescales itself has to say what it rescaled to, or the
      // height of the line means nothing.
      unfade();
      body.appendChild(el("div", { class: "qaxis" }, [
        el("span", { text: hourAxis(series[0].t) }),
        el("span", {
          // Short enough to stay on one line at the widths this page is
          // read at: a caption that wraps under the chart it explains reads
          // as a second axis label.
          text: "peak " + fmtExact(drawn.peak, cat.unit) + "/h · dashed = hourly share " +
            fmtExact(drawn.share, cat.unit) + "/h"
        }),
        el("span", { text: "now" })
      ]));
    }

    /** Let the freshly built chart lay out, then bring it back. */
    function unfade() {
      if (!painted) { painted = true; return; }
      requestAnimationFrame(function () { body.classList.remove("swapping"); });
    }

    function seg(buttons, isOn, onPick) {
      var wrap = el("div", { class: "qseg" });
      buttons.forEach(function (b) {
        var btn = el("button", { type: "button", text: b.label, class: isOn(b) ? "on" : "" });
        btn.addEventListener("click", function () {
          onPick(b);
          // Re-mark this row in place rather than repainting the page: a
          // rebuild would lose the reader's place in every other panel.
          Array.prototype.forEach.call(wrap.children, function (node, i) {
            node.className = isOn(buttons[i]) ? "on" : "";
          });
        });
        wrap.appendChild(btn);
      });
      return wrap;
    }

    var tools = el("div", { class: "qtools" });
    var windowSeg = null;
    if (burnable) {
      windowSeg = seg(WINDOWS, function (w) { return st.hours === w.hours; }, function (w) {
        st.hours = w.hours;
        if (st.mode === "burn") loadBurn(st.hours, render);
        render();
      });
      windowSeg.className = "qseg" + (st.mode === "burn" ? "" : " hidden");

      var modes = [{ label: "daily", mode: "daily" }, { label: "burn", mode: "burn" }];
      tools.appendChild(seg(modes, function (m) { return st.mode === m.mode; }, function (m) {
        st.mode = m.mode;
        windowSeg.className = "qseg" + (st.mode === "burn" ? "" : " hidden");
        if (st.mode === "burn") loadBurn(st.hours, render);
        render();
      }));
      tools.appendChild(windowSeg);
    }

    render();
    /* The 24h window is fetched even in daily mode, because the projection
     * lives there and a flat-day estimate is the worse answer. One request
     * per page serves all three panels, and the endpoint caches it. */
    if (burnable) loadBurn(st.mode === "burn" ? st.hours : PROJECT_HOURS, render);
    if (burnable && st.mode === "burn" && st.hours !== PROJECT_HOURS) loadBurn(PROJECT_HOURS, render);

    // The card's edge still answers the peak: a category that broke its cap
    // this month should look broken even while today happens to be quiet.
    /* WHAT THE HEADER IS FOR: the name of the thing, its wall, and where it
     * stands right now. Peak moved out because "have we ever breached" is
     * answered by the red edge of the card and by the tallest bar in the
     * chart, and the projection moved out because the pale block on today's
     * bar says it in the place it applies to - both were competing with the
     * one number somebody came to the page for. Controls sit right, away
     * from the reading, so the eye lands on the number first. */
    return el("div", { class: "qcard " + cat.state }, [
      el("div", { class: "qhead" }, [
        el("div", { class: "qtitle", text: cat.label }),
        el("div", { class: "qmeta" }, [
          pctNode,
          el("span", { text: "limit " + limitText })
        ]),
        tools
      ]),
      body
    ]);
  }

  /** The left-hand axis label in burn mode: where the window starts. */
  function hourAxis(t) {
    var d = new Date(t);
    if (isNaN(d)) return "";
    return String(d.getUTCMonth() + 1).padStart(2, "0") + "-" + String(d.getUTCDate()).padStart(2, "0") +
      " " + String(d.getUTCHours()).padStart(2, "0") + "h UTC";
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
