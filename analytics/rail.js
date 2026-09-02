/* =========================================================================
 * The project rail, shared by Pulse and the wroom dashboard.
 *
 * wroom is a project, not a sibling site. It used to be a "wroom| →" link
 * parked under an "Elsewhere" heading, which framed it as somewhere else you
 * go - and it is the thing looked at most. So it sits at the top of Projects
 * on both pages, and both pages draw this same list, so crossing between
 * them does not feel like leaving.
 *
 * It still costs a page load: the wroom dashboard talks to a different API
 * with a different key and its own four tabs, and folding that into Pulse
 * would mean one page holding two auth systems. The rail is what makes them
 * one product; the URL is an implementation detail.
 *
 * Ownership of a click therefore depends on where you are. A host passes
 * `local` for the routes it can render itself; everything else becomes an
 * <a> to the page that can.
 * ========================================================================= */
(function (global) {
  "use strict";

  var STYLE_ID = "rail-style";

  /* wroom first, then roughly by how often they get opened. */
  var PROJECTS = [
    { id: "wroom", label: "wroom|", href: "wroom/", colour: "var(--series-1)" },
    { id: "portfolio", label: "Portfolio" },
    { id: "northern_eh", label: "Northern Eh" },
    { id: "the_great_puppy_detective", label: "Puppy Detective" },
    { id: "timmies_passport", label: "Timmies" },
    { id: "spotify_venn", label: "Spotify Venn" },
    { id: "q1_wrapped", label: "Q1 Wrapped" }
  ];

  var CSS = [
    ".shell{display:grid;grid-template-columns:196px minmax(0,1fr);gap:26px;align-items:start}",
    "@media (max-width:900px){.shell{grid-template-columns:minmax(0,1fr);gap:16px}}",
    ".rail{position:sticky;top:74px;display:flex;flex-direction:column;gap:2px}",
    "@media (max-width:900px){.rail{position:static;flex-direction:row;flex-wrap:wrap}}",
    ".rail .rail-group{font-size:10px;font-weight:750;color:var(--muted);text-transform:uppercase;",
      "letter-spacing:0.11em;padding:14px 10px 6px}",
    "@media (max-width:900px){.rail .rail-group{width:100%;padding:8px 0 2px}}",
    ".rail a,.rail button{display:flex;align-items:center;gap:9px;width:100%;font:inherit;font-size:13px;",
      "font-weight:600;text-align:left;text-decoration:none;color:var(--text-secondary);background:none;",
      "cursor:pointer;border:1px solid transparent;border-left:2px solid transparent;padding:7px 10px}",
    ".rail a:hover,.rail button:hover{color:var(--text-primary);background:var(--surface-1)}",
    ".rail [aria-current=\"true\"]{color:var(--text-primary);background:var(--surface-1);",
      "border-color:var(--border);border-left-color:var(--accent)}",
    ".rail .dot{width:8px;height:8px;flex:none}",
    ".rail .tally{margin-left:auto;font-weight:400;color:var(--muted);font-variant-numeric:tabular-nums}"
  ].join("");

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var s = document.createElement("style");
    s.id = STYLE_ID;
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  /* opts:
   *   mount     element to fill
   *   current   id of the active row
   *   base      path prefix back to Pulse ("" from Pulse, "../" from wroom)
   *   local     ids this host renders itself; the rest become links
   *   tallies   { id: number } shown right-aligned
   *   colours   { id: cssColour } for the leading dot
   *   onSelect  fn(id) for a local row
   *   extra     [{ id, label }] appended to Projects (apps we have no label for)
   */
  function render(opts) {
    ensureStyle();
    var mount = opts.mount;
    var base = opts.base || "";
    var local = opts.local || [];
    var tallies = opts.tallies || {};
    var colours = opts.colours || {};
    mount.textContent = "";

    function row(id, label, href, colour) {
      var isLocal = local.indexOf(id) !== -1;
      var node = isLocal ? document.createElement("button") : document.createElement("a");
      if (!isLocal) node.setAttribute("href", href);
      node.setAttribute("aria-current", String(opts.current === id));
      if (colour) {
        var dot = document.createElement("i");
        dot.className = "dot";
        dot.style.background = colour;
        node.appendChild(dot);
      }
      node.appendChild(document.createTextNode(label));
      if (tallies[id] != null) {
        var t = document.createElement("span");
        t.className = "tally";
        t.textContent = String(tallies[id]);
        node.appendChild(t);
      }
      if (isLocal && opts.onSelect) {
        node.addEventListener("click", function () { opts.onSelect(id); });
      }
      mount.appendChild(node);
    }

    function group(label) {
      var h = document.createElement("div");
      h.className = "rail-group";
      h.textContent = label;
      mount.appendChild(h);
    }

    row("all", "All apps", base + "#/all", null);

    group("Projects");
    PROJECTS.forEach(function (p) {
      var href = p.href ? base + p.href : base + "#/" + p.id;
      row(p.id, p.label, href, colours[p.id] || p.colour || "var(--muted)");
    });
    (opts.extra || []).forEach(function (p) {
      row(p.id, p.label, base + "#/" + p.id, colours[p.id] || "var(--muted)");
    });

    group("Account");
    row("cloudflare", "Cloudflare", base + "#/cloudflare", null);
  }

  global.Rail = { render: render, PROJECTS: PROJECTS };
})(window);
