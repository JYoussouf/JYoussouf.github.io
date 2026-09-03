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
    ".qerr{color:var(--bad);font-size:13px;padding:12px 0}",
    /* The mode switch and the window picker. Same vocabulary as the rest of
     * the page: hard edges, uppercase micro-labels, the accent only on what
     * is currently true. */
    ".qseg{display:flex;border:1px solid var(--border)}",
    ".qseg button{appearance:none;background:transparent;border:0;border-left:1px solid var(--border);",
      "color:var(--muted);font:inherit;font-size:10px;font-weight:750;text-transform:uppercase;",
      "letter-spacing:0.1em;padding:3px 8px;cursor:pointer}",
    ".qseg button:first-child{border-left:0}",
    ".qseg button.on{background:var(--accent);color:var(--surface-1)}",
    ".qseg button:hover:not(.on){color:var(--text-secondary)}",
    ".qhead .qtools{display:flex;gap:8px;align-items:center}",
    ".qmeta .proj{font-weight:700}",
    ".qmeta .proj.watch{color:var(--text-secondary)}",
    ".qmeta .proj.near{color:var(--warn)}",
    ".qmeta .proj.over{color:var(--bad)}",
    ".qbody svg .cf-bar.hour{fill:var(--accent)}",
    ".qbody svg .cf-bar.hour.partial{opacity:0.45}",
    /* The trailing average, drawn across the hours it is the average of. */
    ".qbody svg .cf-rate{stroke:var(--text-secondary);stroke-width:1;stroke-dasharray:2 3;vector-effect:non-scaling-stroke}",
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
  function project(cat, hours) {
    if (cat.period !== "day") return null;
    var today = cat.latest || 0;
    var elapsed = utcDayElapsed();
    var st = burnState(hours);
    var series = st.data && st.data.source === "hourly" && st.data.categories
      ? st.data.categories[cat.key]
      : null;

    if (series && series.length) {
      var done = series.filter(function (b) { return !b.partial; });
      if (done.length) {
        var sum = 0;
        done.forEach(function (b) { sum += b.value; });
        var rate = sum / done.length;
        return {
          value: today + rate * (24 - elapsed * 24),
          basis: "from the last " + (hours >= 24 ? Math.round(hours / 24) + "d" : hours + "h") + " average",
          rate: rate
        };
      }
    }
    if (elapsed < 0.08) return null;
    return { value: today / elapsed, basis: "flat-day estimate", rate: null };
  }

  function setProjection(node, cat, hours) {
    if (!node) return;
    var p = project(cat, hours);
    if (!p) {
      node.textContent = "";
      node.className = "proj";
      return;
    }
    var pct = (100 * p.value) / cat.budget;
    node.textContent = "projected " + fmtExact(p.value, cat.unit) + " · " + Math.round(pct) + "%";
    node.className = "proj " + stateFor(pct);
    node.setAttribute("title", p.basis + ", against a limit of " + fmtExact(cat.limit, cat.unit));
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

  /* The hourly chart.
   *
   * Same y-axis idea as the daily one, one scale down: a bar is a fraction of
   * the HOURLY SHARE of the daily limit (limit/24), and the dashed line is
   * that share. So a chart whose bars sit at the line is a day that lands
   * exactly on the cap, and anything above the line is a rate that cannot be
   * sustained for a whole day - which is the question a burn chart is for.
   */
  function burnChart(cat, series, hours, pctNode) {
    var W = 880, H = 112, TOP = 6;
    var share = cat.budget / 24;
    var n = series.length || 1;
    var slot = W / n;
    var bw = Math.max(1.5, Math.min(18, slot * 0.62));
    var svg = svgEl("svg", { viewBox: "0 0 " + W + " " + (H + 3) });
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label",
      cat.label + ": hourly usage over the last " + hours + " hours, against an hourly share of " +
      fmtExact(share, cat.unit) + ".");

    svg.appendChild(svgEl("line", { class: "cf-base", x1: 0, y1: H, x2: W, y2: H }));

    // Bars are clipped a hair above the share, like the daily chart, so an
    // hour that broke the line reads as having broken it.
    var bars = [];
    var sum = 0, done = 0;
    series.forEach(function (b, i) {
      if (!b.partial) { sum += b.value; done += 1; }
      if (!b.value) { bars.push(null); return; }
      var h = Math.max(1.5, Math.min(b.value / share, 1.06) * (H - TOP));
      var cls = "cf-bar hour";
      if (b.value > share) cls += " over";
      if (b.partial) cls += " partial";
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

    svg.appendChild(svgEl("line", { class: "cf-limit", x1: 0, y1: TOP, x2: W, y2: TOP }));

    // The average the projection is actually made from, drawn where it can be
    // compared with the hours it came from.
    if (done) {
      var avg = sum / done;
      var ay = Math.max(1, H - Math.min(avg / share, 1.06) * (H - TOP));
      svg.appendChild(svgEl("line", { class: "cf-rate", x1: 0, y1: ay.toFixed(1), x2: W, y2: ay.toFixed(1) }));
    }

    series.forEach(function (b, i) {
      var hit = svgEl("rect", { class: "cf-hit", x: (slot * i).toFixed(1), y: 0, width: slot.toFixed(1), height: H });
      hit.addEventListener("mousemove", function (ev) {
        showHourTip(ev, cat, b, share);
        if (bars[i]) bars[i].classList.add("hot");
      });
      hit.addEventListener("mouseleave", function () {
        hideTip();
        if (bars[i]) bars[i].classList.remove("hot");
      });
      svg.appendChild(hit);
    });

    // The header reading follows the day in daily mode; in burn mode it has
    // nothing to follow, so it states today and stays put.
    setReading(pctNode, cat, todayPoint(cat));
    return svg;
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
    var w = t.offsetWidth || 200, h = t.offsetHeight || 64;
    var x = ev.clientX + 16;
    if (x + w > window.innerWidth - 8) x = ev.clientX - w - 16;
    var y = ev.clientY - h - 16;
    if (y < 8) y = ev.clientY + 20;
    t.style.left = Math.max(8, x) + "px";
    t.style.top = Math.min(y, window.innerHeight - h - 8) + "px";
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
    var projNode = el("span", { class: "proj" });

    var st = viewOf(cat.key);
    var burnable = !!BURNABLE[cat.key];
    var body = el("div", { class: "qbody" });

    /* DAILY answers "how did the last month go"; BURN answers "is today on
     * course", which the daily chart cannot: a bar 40% full at 10am is either
     * fine or a disaster and the shape of the day is the difference. */
    function render() {
      body.textContent = "";
      if (!burnable || st.mode === "daily") {
        body.appendChild(chart(cat, pctNode));
        body.appendChild(el("div", { class: "qaxis" }, [
          el("span", { text: cat.series.length ? shortDate(cat.series[0].date) : "" }),
          el("span", { text: cat.period === "month" ? "bars are the daily share of the monthly limit" : "" }),
          el("span", { text: cat.series.length ? shortDate(cat.series[cat.series.length - 1].date) : "" })
        ]));
        setProjection(projNode, cat, st.hours);
        return;
      }

      var bs = burnState(st.hours);
      var series = bs.data && bs.data.categories ? bs.data.categories[cat.key] : null;
      if (bs.status === "loading" && !series) {
        body.appendChild(el("div", { class: "qhint", text: "Reading hourly usage…" }));
        return;
      }
      if (!series || !series.length) {
        // The honest failure: say what is missing and keep the projection,
        // which the daily figure alone can still support.
        body.appendChild(el("div", { class: "qhint", text: bs.error || "No hourly data for this window." }));
        body.appendChild(el("div", { class: "qhint", text: "Projection below falls back to a flat-day estimate." }));
        setProjection(projNode, cat, st.hours);
        return;
      }
      body.appendChild(burnChart(cat, series, st.hours, pctNode));
      body.appendChild(el("div", { class: "qaxis" }, [
        el("span", { text: hourAxis(series[0].t) }),
        el("span", { text: "bars are one hour against the hourly share of the daily limit" }),
        el("span", { text: "now" })
      ]));
      setProjection(projNode, cat, st.hours);
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
      windowSeg.style.display = st.mode === "burn" ? "" : "none";

      var modes = [{ label: "daily", mode: "daily" }, { label: "burn", mode: "burn" }];
      tools.appendChild(seg(modes, function (m) { return st.mode === m.mode; }, function (m) {
        st.mode = m.mode;
        windowSeg.style.display = st.mode === "burn" ? "" : "none";
        if (st.mode === "burn") loadBurn(st.hours, render);
        render();
      }));
      tools.appendChild(windowSeg);
    }

    render();
    if (burnable && st.mode === "burn") loadBurn(st.hours, render);

    // The card's edge still answers the peak: a category that broke its cap
    // this month should look broken even while today happens to be quiet.
    return el("div", { class: "qcard " + cat.state }, [
      el("div", { class: "qhead" }, [
        el("div", { class: "qtitle", text: cat.label }),
        tools,
        el("div", { class: "qmeta" }, [
          el("span", { text: "limit " + limitText }),
          el("span", { text: "peak " + fmtExact(cat.peak, cat.unit) + (cat.peakDate ? " · " + shortDate(cat.peakDate) : "") }),
          projNode,
          pctNode
        ])
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
