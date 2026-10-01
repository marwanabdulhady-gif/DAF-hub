/* ===========================================================================
   Dar Al Fikr Schools — Grade 4 Mathematics Learning Hub
   Vanilla JS single-page app. Hash routing, offline-friendly local ledgers.
   Storage keys are shared with the slide decks in /slides (same origin).
   ======================================================================== */

(function () {
  "use strict";

  /* ------------------------------------------------------------ storage -- */
  var HUB_KEY = "daf.hub.v1";
  var SIJILL_KEY = "daf.sijill.v1";
  var THEME_KEY = "daf.hub.theme";
  var SOUND_KEY = "daf.sfx";

  function readJSON(key, fallback) {
    try { var v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; }
    catch (e) { return fallback; }
  }
  function writeJSON(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
  }

  var hub = normaliseHub(readJSON(HUB_KEY, null));
  function normaliseHub(h) {
    h = h && typeof h === "object" ? h : {};
    if (!Array.isArray(h.students)) h.students = [];
    if (!h.records || typeof h.records !== "object") h.records = {};
    if (!h.portfolios || typeof h.portfolios !== "object") h.portfolios = {};
    if (!h.seq) h.seq = h.students.length + 1;
    if (typeof h.pebbles !== "number") h.pebbles = 0;
    return h;
  }
  function saveHub() { writeJSON(HUB_KEY, hub); }
  function sijill() { return readJSON(SIJILL_KEY, {}) || {}; }
  function isSealed(seals, code) { return !!(seals[code] && seals[code].done); }
  function today() { return new Date().toISOString().slice(0, 10); }

  /* --------------------------------------------------------------- audio -- */
  var Sound = (function () {
    var ctx = null;
    var on = (function () { try { return localStorage.getItem(SOUND_KEY) !== "0"; } catch (e) { return true; } })();
    function actx() {
      if (!on) return null;
      if (!ctx) { var AC = window.AudioContext || window.webkitAudioContext; if (AC) ctx = new AC(); }
      if (ctx && ctx.state === "suspended") ctx.resume();
      return ctx;
    }
    function tone(type, f0, f1, dur, gain) {
      var c = actx(); if (!c) return;
      var o = c.createOscillator(), g = c.createGain(), t = c.currentTime;
      o.type = type;
      o.frequency.setValueAtTime(f0, t);
      if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
      g.gain.setValueAtTime(gain, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g); g.connect(c.destination);
      o.start(t); o.stop(t + dur);
    }
    return {
      chime: function (f) { tone("sine", f || 660, 0, 0.5, 0.14); },
      stone: function () { tone("triangle", 150, 45, 0.25, 0.25); },
      step: function () { tone("square", 90, 0, 0.08, 0.05); },
      get enabled() { return on; },
      toggle: function () { on = !on; try { localStorage.setItem(SOUND_KEY, on ? "1" : "0"); } catch (e) {} return on; }
    };
  })();

  /* ---------------------------------------------------------------- util -- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function pct(done, total) { return total ? Math.round((done / total) * 100) : 0; }
  function plural(n, word) { return n + " " + word + (n === 1 ? "" : "s"); }
  function download(name, text, mime) {
    var blob = new Blob([text], { type: mime || "text/plain;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }
  function csvCell(v) { v = String(v == null ? "" : v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
  function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

  var ICONS = {
    dashboard: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
    map: '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2z"/><path d="M9 4v14M15 6v14"/>',
    lessons: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5z"/><path d="M4 19a2 2 0 0 1 2-2h13"/>',
    pacing: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/>',
    experiences: '<path d="m12 3 2.6 5.6 6 .7-4.5 4.1 1.3 6L12 16.4 6.6 19.4l1.3-6L3.4 9.3l6-.7L12 3z"/>',
    games: '<rect x="2" y="7" width="20" height="11" rx="4"/><path d="M7 11v3M5.5 12.5h3M16 12h.01M18 14h.01"/>',
    gates: '<path d="M4 21V9a8 8 0 0 1 16 0v12"/><path d="M9 21v-6a3 3 0 0 1 6 0v6M2 21h20"/>',
    students: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18.5 20a6.5 6.5 0 0 0-3-5.5"/>',
    portfolios: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',
    tracking: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    library: '<path d="M3 4h6v16H3zM9 4h6v16H9z"/><path d="m15 5 4-1 3 15-4 1z"/>',
    studio: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    arrowL: '<path d="M19 12H5M12 19l-7-7 7-7"/>',
    arrowR: '<path d="M5 12h14M12 5l7 7-7 7"/>',
    external: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    print: '<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 14h12v7H6z"/>',
    download: '<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>',
    upload: '<path d="M12 21V9M7 14l5-5 5 5M4 3h16"/>',
    close: '<path d="M18 6 6 18M6 6l12 12"/>',
    play: '<path d="m7 4 13 8-13 8z"/>',
    sound: '<path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>',
    mute: '<path d="M11 5 6 9H3v6h3l5 4z"/><path d="m22 9-6 6M16 9l6 6"/>',
    doc: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/>'
  };
  function icon(name, cls) {
    return '<svg class="ico' + (cls ? " " + cls : "") + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || "") + "</svg>";
  }

  /* --------------------------------------------------------------- toasts -- */
  function toast(msg, action) {
    var box = $("#toasts");
    var el = document.createElement("div");
    el.className = "toast";
    el.innerHTML = "<span>" + esc(msg) + "</span>" + (action ? '<button type="button">' + esc(action.label) + "</button>" : "");
    if (action) el.querySelector("button").addEventListener("click", function () { action.run(); el.remove(); });
    box.appendChild(el);
    while (box.children.length > 2) box.firstChild.remove();
    setTimeout(function () { el.remove(); }, action ? 5000 : 2800);
  }

  /* ------------------------------------------------------------ markdown -- */
  var SLIDE_FILES = { "wadi-map.html": 1, "EXPERIENCES.html": 1, "PRODUCTION.html": 1, "period-hive.html": 1, "night-zero.html": 1, "door-6-2.html": 1 };

  function resolveLink(href, text) {
    var file = href.split("/").pop().split("#")[0];
    if (/^https?:\/\//.test(href)) return '<a href="' + esc(href) + '" target="_blank" rel="noopener">' + text + "</a>";
    if (SLIDE_FILES[file]) return '<a href="/slides/' + esc(file) + '" target="_blank" rel="noopener">' + text + "</a>";
    var l = DATA && DATA.lessons.find(function (x) { return x.spec && x.path.split("/").pop() === file; });
    if (l) return '<a href="#/lesson/' + esc(l.code) + '">' + text + "</a>";
    if (file === "PACING.md" || file === "WADI_ACTIVITY_ATLAS.md") return '<a href="#/doc/' + esc(file.replace(".md", "")) + '">' + text + "</a>";
    return text; // Unpublished target: keep the words, drop the dead link.
  }

  function inline(s) {
    return esc(s)
      .replace(/\$\\times\s*([^$]*)\$/g, "×$1")
      .replace(/\$([^$]{1,40})\$/g, function (m, c) { return c.replace(/\\times/g, "×").replace(/\\div/g, "÷").replace(/\\approx/g, "≈").replace(/\\text\{([^}]*)\}/g, "$1").replace(/\\/g, ""); })
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\[([^\]]*)\]\(([^)\s]+)\)/g, function (m, text, href) { return resolveLink(href.replace(/&amp;/g, "&"), text); })
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  }
  function splitRow(line) {
    return line.replace(/^\s*\|/, "").replace(/\|\s*$/, "").split("|").map(function (c) { return c.trim(); });
  }
  function md(src) {
    var lines = String(src).replace(/\r/g, "").split("\n");
    var out = [], i = 0;
    while (i < lines.length) {
      var line = lines[i];
      if (/^\s*$/.test(line)) { i++; continue; }
      if (/^```/.test(line)) {
        var buf = []; i++;
        while (i < lines.length && !/^```/.test(lines[i])) { buf.push(lines[i]); i++; }
        i++;
        out.push("<pre><code>" + esc(buf.join("\n")) + "</code></pre>");
        continue;
      }
      if (/^\s*\|/.test(line) && i + 1 < lines.length && /^\s*\|[\s:|-]+\|?\s*$/.test(lines[i + 1])) {
        var head = splitRow(line); i += 2;
        var rows = [];
        while (i < lines.length && /^\s*\|/.test(lines[i])) { rows.push(splitRow(lines[i])); i++; }
        out.push('<div class="table-wrap"><table><thead><tr>' +
          head.map(function (h) { return "<th>" + inline(h) + "</th>"; }).join("") + "</tr></thead><tbody>" +
          rows.map(function (r) { return "<tr>" + r.map(function (c) { return "<td>" + inline(c) + "</td>"; }).join("") + "</tr>"; }).join("") +
          "</tbody></table></div>");
        continue;
      }
      var h = line.match(/^(#{1,6})\s*(.+)$/);
      if (h) { var lvl = Math.min(h[1].length + 1, 5); out.push("<h" + lvl + ">" + inline(h[2]) + "</h" + lvl + ">"); i++; continue; }
      if (/^\s*([*+-]|\d+\.)\s+/.test(line)) {
        var ordered = /^\s*\d+\./.test(line), items = [];
        while (i < lines.length && /^\s*([*+-]|\d+\.)\s+/.test(lines[i])) { items.push(lines[i].replace(/^\s*([*+-]|\d+\.)\s+/, "")); i++; }
        var tag = ordered ? "ol" : "ul";
        out.push("<" + tag + ">" + items.map(function (t) { return "<li>" + inline(t) + "</li>"; }).join("") + "</" + tag + ">");
        continue;
      }
      if (/^>/.test(line)) {
        var q = [];
        while (i < lines.length && /^>/.test(lines[i])) { q.push(lines[i].replace(/^>\s?/, "")); i++; }
        out.push("<blockquote>" + q.map(inline).join("<br />") + "</blockquote>");
        continue;
      }
      if (/^(\*{3,}|-{3,}|_{3,})$/.test(line.trim())) { out.push("<hr />"); i++; continue; }
      var p = [line]; i++;
      while (i < lines.length && !/^\s*$/.test(lines[i]) && !/^(#|>|```|\s*\||\s*([*+-]|\d+\.)\s)/.test(lines[i])) { p.push(lines[i]); i++; }
      out.push("<p>" + p.map(inline).join(" ") + "</p>");
    }
    return out.join("\n");
  }

  /* ---------------------------------------------------------------- data -- */
  var DATA = null;
  var filters = { semester: "all", topic: "all", status: "all", q: "" };

  function lessonByCode(code) { return DATA.lessons.find(function (l) { return l.code === code; }) || null; }
  function gateFor(topic) { return DATA.gates.find(function (g) { return g.topic === topic; }) || {}; }
  function gateColour(topic) { return gateFor(topic).color || "var(--teal)"; }
  function uniqueCodes() {
    var seen = {};
    DATA.lessons.forEach(function (l) { seen[l.code] = 1; });
    return Object.keys(seen);
  }
  function gateCodes(topic) {
    var seen = {};
    DATA.lessons.forEach(function (l) { if (l.topic === topic) seen[l.code] = 1; });
    return Object.keys(seen);
  }
  function specCount() {
    var seen = {};
    DATA.lessons.forEach(function (l) { if (l.spec) seen[l.code] = 1; });
    return Object.keys(seen).length;
  }
  function progress(seals) {
    var codes = uniqueCodes();
    var done = codes.filter(function (c) { return isSealed(seals, c); }).length;
    return { done: done, total: codes.length };
  }
  function nextOpenLessons(seals, n) {
    var seen = {}, out = [];
    for (var i = 0; i < DATA.lessons.length && out.length < n; i++) {
      var l = DATA.lessons[i];
      if (seen[l.code] || l.optional) continue;
      seen[l.code] = 1;
      if (!isSealed(seals, l.code)) out.push(l);
    }
    return out;
  }

  function toggleSeal(code, opts) {
    opts = opts || {};
    var s = sijill();
    var wasSealed = isSealed(s, code);
    if (wasSealed) {
      delete s[code];
      if (opts.undo) { hub.pebbles = Math.max(0, hub.pebbles - 1); saveHub(); }
    } else {
      s[code] = { done: true, date: today() };
      if (!opts.undo) { hub.pebbles += 1; saveHub(); }
      Sound.stone();
    }
    writeJSON(SIJILL_KEY, s);
    if (!opts.undo) {
      toast(wasSealed ? "Door " + code + " reopened" : "Door " + code + " sealed · +1 pebble", {
        label: "Undo", run: function () { toggleSeal(code, { undo: true }); }
      });
    }
    render({ keepScroll: true });
  }

  /* ------------------------------------------------------------------ nav -- */
  var NAV = [
    { group: "Curriculum" },
    { id: "dashboard", icon: "dashboard", label: "Dashboard" },
    { id: "map", icon: "map", label: "Wadi Map" },
    { id: "lessons", icon: "lessons", label: "Lessons", count: function () { return uniqueCodes().length; } },
    { id: "pacing", icon: "pacing", label: "Pacing Calendar" },
    { id: "experiences", icon: "experiences", label: "Experiences & Twins" },
    { group: "Play & Progress" },
    { id: "games", icon: "games", label: "Games" },
    { id: "gates", icon: "gates", label: "The 16 Gates", count: function () { var s = sijill(); return progress(s).done; } },
    { id: "tracking", icon: "tracking", label: "Caravan Tracking" },
    { group: "Classroom" },
    { id: "students", icon: "students", label: "Student Roster", count: function () { return hub.students.length; } },
    { id: "portfolios", icon: "portfolios", label: "Portfolios" },
    { group: "Reference" },
    { id: "library", icon: "library", label: "Library & Decks" }
  ];
  var TITLES = {
    dashboard: "Dashboard", map: "Wadi Map", lessons: "Lessons", lesson: "Lesson", pacing: "Pacing Calendar",
    experiences: "Experiences & Twins", games: "Games", gates: "The 16 Gates", students: "Student Roster",
    portfolios: "Portfolios", tracking: "Caravan Tracking", library: "Library & Decks", doc: "Document"
  };
  var PARENT = { lesson: "lessons", doc: "library" };

  function renderNav(active) {
    active = PARENT[active] || active;
    $("#nav").innerHTML = NAV.map(function (n) {
      if (n.group) return '<div class="nav-group">' + esc(n.group) + "</div>";
      var count = n.count ? '<span class="nav-count">' + n.count() + "</span>" : "";
      var on = n.id === active;
      return '<a class="nav-item' + (on ? " on" : "") + '" href="#/' + n.id + '"' + (on ? ' aria-current="page"' : "") + ">" +
        icon(n.icon) + "<span>" + esc(n.label) + "</span>" + count + "</a>";
    }).join("");
  }

  /* -------------------------------------------------------------- pieces -- */
  function stat(label, value, note, accent) {
    return '<div class="stat" style="--accent:' + accent + '"><div class="stat-label">' + esc(label) + '</div>' +
      '<div class="stat-value">' + value + "</div>" + (note ? '<div class="stat-note">' + esc(note) + "</div>" : "") + "</div>";
  }
  function meta(label, value, note) {
    return '<div class="meta"><div class="meta-label">' + esc(label) + '</div><div class="meta-value">' + esc(value || "—") + "</div>" +
      (note ? '<div class="meta-note">' + esc(note) + "</div>" : "") + "</div>";
  }
  function ring(value, total, label) {
    var r = 52, c = 2 * Math.PI * r, p = total ? value / total : 0;
    return '<div class="ring" role="img" aria-label="' + value + " of " + total + " " + esc(label) + '">' +
      '<svg viewBox="0 0 120 120"><circle class="track" cx="60" cy="60" r="' + r + '"/>' +
      '<circle class="value" cx="60" cy="60" r="' + r + '" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + (c * (1 - p)).toFixed(1) + '"/></svg>' +
      '<div class="ring-label"><strong>' + value + "</strong><span>" + esc(label) + "</span></div></div>";
  }
  function bar(p, colour) { return '<div class="bar" style="--c:' + (colour || "var(--teal)") + '"><span style="width:' + p + '%"></span></div>'; }
  function sealButton(code, sealed, small) {
    return '<button type="button" class="btn btn-seal' + (small ? " btn-sm" : "") + (sealed ? " is-sealed" : "") + '" data-seal="' + esc(code) + '" aria-pressed="' + sealed + '">' +
      (sealed ? icon("check") + "Sealed" : "Mark sealed") + "</button>";
  }
  function pageHead(eyebrow, title, sub, actions) {
    return '<div class="page-head"><div>' + (eyebrow ? '<div class="eyebrow">' + eyebrow + "</div>" : "") +
      '<h1 class="page-title">' + title + "</h1>" + (sub ? '<p class="page-sub">' + sub + "</p>" : "") + "</div>" +
      (actions ? '<div class="row">' + actions + "</div>" : "") + "</div>";
  }
  function empty(title, body, action) {
    return '<div class="empty"><strong>' + esc(title) + "</strong>" + esc(body) + (action || "") + "</div>";
  }

  /* --------------------------------------------------------------- views -- */
  var views = {};

  views.dashboard = function () {
    var seals = sijill();
    var prog = progress(seals);
    var upNext = nextOpenLessons(seals, 4);
    var recent = Object.keys(seals).filter(function (c) { return isSealed(seals, c) && lessonByCode(c); })
      .map(function (c) { return { code: c, date: seals[c].date || "" }; })
      .sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); }).slice(0, 5);

    return '' +
      '<section class="hero">' +
        "<div>" +
          '<div class="eyebrow">' + esc(DATA.course) + " · " + esc(DATA.year) + "</div>" +
          "<h1>The Valley of Trust · <em>Wadi al-Amanah</em></h1>" +
          "<p>" + prog.total + " lesson doors across 16 gates. Concrete twins first, a story that knows when to stop, and a class caravan that grows together.</p>" +
          '<div class="row">' +
            (upNext[0] ? '<a href="#/lesson/' + esc(upNext[0].code) + '" class="btn btn-primary">Continue with ' + esc(upNext[0].code) + icon("arrowR") + "</a>" : "") +
            '<a href="#/map" class="btn">' + icon("map") + "Open the map</a>" +
          "</div>" +
        "</div>" +
        '<div class="hero-side">' + ring(prog.done, prog.total, "doors sealed") + '<span class="small muted">' + pct(prog.done, prog.total) + "% of the valley watered</span></div>" +
      "</section>" +

      '<div class="grid g-4">' +
        stat("Lesson doors", prog.total, specCount() + " with full specs", "var(--teal)") +
        stat("Doors sealed", prog.done + " <small>/ " + prog.total + "</small>", pct(prog.done, prog.total) + "% complete", "var(--pass)") +
        stat("Caravan pebbles", hub.pebbles, "Shared by the whole class", "var(--gold)") +
        stat("Students", hub.students.length, hub.students.length ? "On the roster" : "Add your class", "var(--s5)") +
      "</div>" +

      '<div class="grid g-2" style="margin-top:16px">' +
        '<div class="card">' +
          '<div class="card-head"><h2 class="card-title">Up next</h2><a class="btn btn-sm btn-ghost" href="#/lessons">All lessons' + icon("arrowR") + "</a></div>" +
          (upNext.length ? upNext.map(function (l) {
            return '<a class="list-item" href="#/lesson/' + esc(l.code) + '"><span class="row" style="min-width:0;flex-wrap:nowrap"><span class="code">' + esc(l.code) + '</span><span class="title">' + esc(l.title) + "</span></span>" +
              '<span class="tag">Week ' + esc(l.week || "—") + "</span></a>";
          }).join("") : empty("Every door is sealed", "The caravan has crossed the whole valley.")) +
        "</div>" +
        '<div class="card">' +
          '<div class="card-head"><h2 class="card-title">Recently sealed</h2><a class="btn btn-sm btn-ghost" href="#/gates">Gates' + icon("arrowR") + "</a></div>" +
          (recent.length ? recent.map(function (r) {
            var l = lessonByCode(r.code);
            return '<a class="list-item" href="#/lesson/' + esc(r.code) + '"><span class="row" style="min-width:0;flex-wrap:nowrap"><span class="code sealed">' + esc(r.code) + '</span><span class="title">' + esc(l.title) + "</span></span>" +
              '<span class="small muted">' + esc(r.date) + "</span></a>";
          }).join("") : '<p class="muted small">Nothing sealed yet. Open a lesson and mark it sealed when the class finishes it.</p>') +
        "</div>" +
      "</div>" +

      '<div class="section-title"><span>Gates of the valley</span><a class="btn btn-sm btn-ghost" href="#/gates">Details' + icon("arrowR") + "</a></div>" +
      '<div class="card" style="padding:8px 14px">' +
        '<div class="grid g-2" style="gap:0 28px">' +
          DATA.gates.map(function (g) {
            var codes = gateCodes(g.topic);
            var done = codes.filter(function (c) { return isSealed(seals, c); }).length;
            return '<a class="gate-row" href="#/lessons?topic=' + g.topic + '" style="--c:' + esc(g.color) + '">' +
              '<span class="gate-badge" aria-hidden="true">' + esc(g.badge) + "</span>" +
              '<span style="min-width:0"><span class="gate-name">' + g.topic + " · " + esc(g.name) + '</span><br /><span class="gate-sub">' + esc(g.title) + "</span></span>" +
              bar(pct(done, codes.length), g.color) +
              '<span class="gate-count">' + done + "/" + codes.length + "</span></a>";
          }).join("") +
        "</div>" +
      "</div>";
  };

  var MAP_POINTS = [
    [60, 180], [130, 150], [195, 160], [245, 225], [300, 280], [360, 268], [415, 232], [480, 196],
    [545, 222], [592, 305], [652, 345], [712, 318], [772, 282], [835, 318], [878, 440], [850, 560]
  ];
  var RIVER = "M 60 180 C 200 120, 250 320, 400 240 C 550 160, 600 380, 750 300 C 850 240, 900 480, 850 560";

  views.map = function () {
    var seals = sijill();
    var prog = progress(seals);
    return pageHead("Wadi al-Amanah", "The valley map",
        "Every sealed door waters the valley. Choose a gate to see its guild, concrete twin and doors.",
        '<button id="btn-march" class="btn btn-primary" type="button">' + icon("play") + "March the caravan</button>" +
        '<a href="/slides/wadi-map.html" target="_blank" rel="noopener" class="btn">' + icon("external") + "Full-screen map</a>") +
      '<div class="map-shell">' +
        '<div class="map-canvas">' +
          '<svg id="wadi-svg" viewBox="0 0 1000 650" role="group" aria-label="Map of the 16 gates">' +
            "<defs>" +
              '<linearGradient id="riverGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#00bed6"/><stop offset="1" stop-color="#38effa"/></linearGradient>' +
              '<filter id="glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
            "</defs>" +
            '<path d="M 50 120 Q 250 80 450 140 T 850 110 T 950 200" fill="none" stroke="#123c46" stroke-width="60" opacity="0.35"/>' +
            '<path d="M 80 500 Q 300 580 550 490 T 920 540" fill="none" stroke="#123c46" stroke-width="80" opacity="0.35"/>' +
            '<path d="' + RIVER + '" fill="none" stroke="#0a2a33" stroke-width="18" stroke-linecap="round"/>' +
            '<path id="wadi-water" d="' + RIVER + '" fill="none" stroke="url(#riverGrad)" stroke-width="10" stroke-linecap="round" filter="url(#glow)" data-p="' + (prog.total ? prog.done / prog.total : 0) + '"/>' +
            DATA.gates.map(function (g, i) {
              var p = MAP_POINTS[i] || [100 + i * 50, 200];
              var codes = gateCodes(g.topic);
              var done = codes.filter(function (c) { return isSealed(seals, c); }).length;
              var full = done >= codes.length && codes.length > 0;
              var col = full ? "#34c88f" : (g.color || "#00bed6");
              return '<g class="gate-marker" tabindex="0" role="button" data-gate="' + g.topic + '" aria-label="Gate ' + g.topic + ", " + esc(g.name) + ", " + done + " of " + codes.length + ' doors sealed" transform="translate(' + p[0] + "," + p[1] + ')">' +
                '<circle class="halo" r="22" fill="' + col + '" opacity="0.25"/>' +
                '<circle class="core" r="14" fill="#091a20" stroke="' + col + '" stroke-width="2.5"/>' +
                '<text text-anchor="middle" dy="4" fill="#fff" font-size="11" font-weight="700" font-family="Inter, sans-serif">' + g.topic + "</text>" +
                '<text text-anchor="middle" dy="36" fill="#b5dde3" font-size="11.5" font-weight="600" font-family="Inter, sans-serif" style="paint-order:stroke;stroke:#051216;stroke-width:4px">' + esc(g.name) + "</text>" +
              "</g>";
            }).join("") +
            '<g id="caravan" aria-hidden="true" style="pointer-events:none;transform:translate(' + MAP_POINTS[0][0] + "px," + (MAP_POINTS[0][1] - 36) + 'px);transition:transform .4s cubic-bezier(.2,.7,.2,1)">' +
              '<circle r="17" fill="#e2b84a" opacity="0.35"/><circle r="10" fill="#e2b84a"/>' +
              '<text text-anchor="middle" dy="4" font-size="12">🐪</text></g>' +
          "</svg>" +
        "</div>" +
        '<aside class="dossier" id="dossier" aria-live="polite">' +
          '<div class="eyebrow">Gate dossier</div>' +
          '<h2 class="card-title" style="font-size:18px">Choose a gate</h2>' +
          '<p class="dossier-empty">Select a numbered waypoint to see its guild, concrete twin and doors. The river fills as doors are sealed: <strong>' + prog.done + " of " + prog.total + "</strong> so far.</p>" +
        "</aside>" +
      "</div>" +
      '<div class="legend"><span><i class="dot" style="--c:#00bed6"></i>In progress</span><span><i class="dot" style="--c:#34c88f"></i>Gate complete</span><span><i class="dot" style="--c:#e2b84a"></i>Caravan</span></div>';
  };

  var activeGate = null;
  function renderDossier(topic, quiet) {
    activeGate = topic;
    var g = gateFor(topic);
    var seals = sijill();
    var codes = gateCodes(topic);
    var done = codes.filter(function (c) { return isSealed(seals, c); }).length;
    $$(".gate-marker").forEach(function (m) { m.classList.toggle("is-active", +m.getAttribute("data-gate") === topic); });
    $("#dossier").innerHTML =
      '<div class="eyebrow">Gate ' + g.topic + " · " + done + "/" + codes.length + " sealed</div>" +
      '<h2 class="card-title" style="font-size:18px">' + esc(g.badge) + " " + esc(g.name) + ' <span class="muted" lang="ar" style="font-weight:500">' + esc(g.nameAr || "") + "</span></h2>" +
      '<p class="small muted">' + esc(g.title) + " · " + esc(g.lead) + ", " + esc(g.guild) + "</p>" +
      bar(pct(done, codes.length), g.color) +
      '<div class="callout"><span class="callout-label">Commission</span>' + esc(g.commission) + "</div>" +
      '<div class="callout gold"><span class="callout-label">Concrete twin</span>' + esc(g.twin) + "</div>" +
      '<div class="stack" style="gap:0">' +
        codes.map(function (c) {
          var l = lessonByCode(c);
          var s = isSealed(seals, c);
          return '<div class="list-item" style="padding:8px 4px"><a href="#/lesson/' + esc(c) + '" class="row" style="min-width:0;flex-wrap:nowrap"><span class="code' + (s ? " sealed" : "") + '">' + esc(c) + '</span><span class="title small">' + esc(l.title) + "</span></a>" +
            sealButton(c, s, true) + "</div>";
        }).join("") +
      "</div>";
    if (!quiet) Sound.chime(440 + topic * 25);
  }

  views.lessons = function (arg, params) {
    if (params && params.topic) { filters.topic = params.topic; }
    var seals = sijill();
    var q = filters.q.trim().toLowerCase();
    var list = DATA.lessons.filter(function (l) {
      if (filters.semester !== "all" && String(l.semester) !== filters.semester) return false;
      if (filters.topic !== "all" && String(l.topic) !== filters.topic) return false;
      if (filters.status === "sealed" && !isSealed(seals, l.code)) return false;
      if (filters.status === "open" && isSealed(seals, l.code)) return false;
      if (q) {
        return (l.code + " " + l.title + " " + (l.objective || "") + " " + (l.topicTitle || "") + " " + (l.place || "")).toLowerCase().indexOf(q) !== -1;
      }
      return true;
    });
    function seg(key, opts) {
      return '<div class="seg" role="group" aria-label="' + key + '">' + opts.map(function (o) {
        return '<button type="button" data-f="' + key + '" data-v="' + o[0] + '" aria-pressed="' + (filters[key] === o[0]) + '">' + o[1] + "</button>";
      }).join("") + "</div>";
    }
    var anyFilter = filters.semester !== "all" || filters.topic !== "all" || filters.status !== "all" || q;

    return pageHead("enVision Grade 4", "Lessons", "Every door is mapped to a vocational setting, a concrete twin and two production pathways.") +
      '<div class="toolbar">' +
        '<input class="input" id="lesson-filter" type="search" placeholder="Filter by code, title or objective" value="' + esc(filters.q) + '" aria-label="Filter lessons" />' +
        '<select class="select" data-f="topic" aria-label="Topic">' +
          '<option value="all">All topics</option>' +
          DATA.gates.map(function (g) { return '<option value="' + g.topic + '"' + (filters.topic === String(g.topic) ? " selected" : "") + ">Topic " + g.topic + " · " + esc(g.title) + "</option>"; }).join("") +
        "</select>" +
        seg("semester", [["all", "Both"], ["1", "Sem 1"], ["2", "Sem 2"]]) +
        seg("status", [["all", "All"], ["open", "Open"], ["sealed", "Sealed"]]) +
      "</div>" +
      '<p class="result-count">' + plural(list.length, "lesson") + (anyFilter ? ' · <button type="button" class="btn-ghost" id="clear-filters" style="color:var(--teal-strong);font-weight:600">Clear filters</button>' : "") + "</p>" +
      (list.length ? '<div class="grid g-3">' + list.map(function (l) {
        var s = isSealed(seals, l.code);
        return '<article class="card lesson-card" style="--c:' + esc(gateColour(l.topic)) + '">' +
          '<div class="row-between"><span class="code' + (s ? " sealed" : "") + '">' + esc(l.code) + "</span>" +
            '<span class="row" style="gap:6px">' + (l.optional ? '<span class="tag">Optional</span>' : "") + '<span class="tag">Sem ' + l.semester + " · Wk " + esc(l.week || "—") + "</span></span></div>" +
          '<h3 class="lesson-title"><a href="#/lesson/' + esc(l.code) + '">' + esc(l.title) + "</a></h3>" +
          '<p class="objective">' + esc(l.objective) + "</p>" +
          '<p class="place">' + esc(l.place || "") + "</p>" +
          '<div class="card-foot"><a href="#/lesson/' + esc(l.code) + '" class="btn btn-sm">Open lesson</a>' + sealButton(l.code, s, true) + "</div>" +
        "</article>";
      }).join("") + "</div>"
      : empty("No lessons match", "Try a different filter or search term.", '<br /><button type="button" class="btn" id="clear-filters-2">Clear filters</button>'));
  };

  views.lesson = function (code) {
    var l = lessonByCode(code);
    if (!l) return empty("Lesson not found", "There is no lesson with the code " + code + ".", '<br /><a class="btn" href="#/lessons">Back to lessons</a>');
    var seals = sijill();
    var s = isSealed(seals, l.code);
    var idx = DATA.lessons.indexOf(l);
    var prev = null, next = null;
    for (var i = idx - 1; i >= 0; i--) { if (DATA.lessons[i].code !== l.code) { prev = DATA.lessons[i]; break; } }
    for (var j = idx + 1; j < DATA.lessons.length; j++) { if (DATA.lessons[j].code !== l.code) { next = DATA.lessons[j]; break; } }
    var g = gateFor(l.topic);

    return pageHead('<span class="code' + (s ? " sealed" : "") + '">' + esc(l.code) + "</span> Topic " + l.topic + " · " + esc(l.topicTitle),
        esc(l.title), "I can " + esc(l.objective),
        sealButton(l.code, s) + (l.deck ? '<a href="/' + esc(l.deck) + '" target="_blank" rel="noopener" class="btn btn-primary">' + icon("play") + "Launch slides</a>" : "")) +
      '<div class="grid g-4">' +
        meta("Pacing", "Semester " + l.semester + " · Week " + (l.week || "—"), l.optional ? "Optional, as time allows" : "Core lesson") +
        meta("Setting", l.place, l.setting) +
        meta("Rifqah (guide)", l.rifqah, g.guild) +
        meta("Gate", g.badge + " " + g.name, g.lead) +
      "</div>" +
      '<div class="grid g-2" style="margin-top:16px">' +
        '<div class="card stack">' +
          '<h2 class="card-title">Opening hook</h2>' +
          '<p class="quote">' + inline(l.hook || "") + "</p>" +
          '<div class="callout"><span class="callout-label">Concrete twin · first in CRA</span>' + esc(l.twin) + "</div>" +
          (l.task ? '<div class="callout"><span class="callout-label">The job</span>' + esc(l.task) + "</div>" : "") +
        "</div>" +
        '<div class="card stack">' +
          '<h2 class="card-title">Stage 6 · Production pathways</h2>' +
          '<div class="callout"><span class="callout-label">Pathway A · Job artifact</span>' + esc(l.production ? l.production.A : "—") + "</div>" +
          '<div class="callout gold"><span class="callout-label">Pathway B · Creative transfer</span>' + esc(l.production ? l.production.B : "—") + "</div>" +
          '<div class="callout"><span class="callout-label">Gate commission</span>' + esc(l.commission || g.commission) + "</div>" +
        "</div>" +
      "</div>" +
      '<div class="section-title"><span>Full lesson specification</span></div>' +
      '<div class="card">' +
        (l.spec ? '<div id="lesson-body" class="prose"><div class="skeleton"><span></span><span></span><span></span></div></div>'
          : empty("Specification not published yet", "The summary above comes from the curriculum index. The full lesson file for " + l.code + " has not been added to the hub.")) +
      "</div>" +
      '<nav class="lesson-nav" aria-label="Lesson navigation">' +
        (prev ? '<a class="card is-link" href="#/lesson/' + esc(prev.code) + '"><span class="dir">← Previous · ' + esc(prev.code) + '</span><span class="t">' + esc(prev.title) + "</span></a>" : "<span></span>") +
        (next ? '<a class="card is-link next" href="#/lesson/' + esc(next.code) + '"><span class="dir">Next · ' + esc(next.code) + ' →</span><span class="t">' + esc(next.title) + "</span></a>" : "") +
      "</nav>";
  };

  function currentWeekIndex() {
    // A light heuristic: the first week that still has an open door.
    var seals = sijill();
    for (var i = 0; i < DATA.weeks.length; i++) {
      var w = DATA.weeks[i];
      if (w.codes.length && w.codes.some(function (c) { return !isSealed(seals, c); })) return i;
    }
    return -1;
  }

  views.pacing = function () {
    var seals = sijill();
    var cur = currentWeekIndex();
    function table(sem) {
      return '<div class="table-wrap"><table><thead><tr><th>Week</th><th>Focus</th><th>Doors</th><th>Status</th></tr></thead><tbody>' +
        DATA.weeks.map(function (w, i) {
          if (w.semester !== sem) return "";
          var done = w.codes.filter(function (c) { return isSealed(seals, c); }).length;
          var total = w.codes.length;
          var status = !total ? '<span class="tag">—</span>' : done === total ? '<span class="tag pass">' + icon("check") + "Done</span>" : i === cur ? '<span class="tag gold">This week</span>' : '<span class="tag">' + done + "/" + total + "</span>";
          return '<tr class="' + (i === cur ? "is-current" : "") + '"><td><strong>' + w.week + "</strong></td><td>" + esc(w.focus) + '</td><td><div class="codes">' +
            (w.codes.map(function (c) { return '<a href="#/lesson/' + esc(c) + '" class="code' + (isSealed(seals, c) ? " sealed" : "") + '">' + esc(c) + "</a>"; }).join("") || '<span class="muted">—</span>') +
            "</div></td><td>" + status + "</td></tr>";
        }).join("") + "</tbody></table></div>";
    }
    return pageHead(esc(DATA.year), "Pacing calendar", DATA.weeks.length + " weeks across two semesters. The highlighted row is the first week with an open door.",
        '<a class="btn" href="#/doc/PACING">' + icon("doc") + "Pacing notes</a>") +
      '<div class="section-title" style="margin-top:0"><span>Semester 1</span></div>' + table(1) +
      '<div class="section-title"><span>Semester 2</span></div>' + table(2);
  };

  views.experiences = function () {
    var seen = {};
    var list = DATA.lessons.filter(function (l) { if (seen[l.code]) return false; seen[l.code] = 1; return true; });
    return pageHead("Boarding-pass law", "Experiences & concrete twins",
        "Each door has its own job, a hands-on twin that runs first, and a signed artifact.",
        '<a class="btn" href="/slides/EXPERIENCES.html" target="_blank" rel="noopener">' + icon("external") + "Experiences atlas deck</a>") +
      DATA.gates.map(function (g) {
        var items = list.filter(function (l) { return l.topic === g.topic; });
        return '<div class="section-title"><span>' + esc(g.badge) + " Gate " + g.topic + " · " + esc(g.name) + '</span><span class="tag">' + esc(g.guild) + "</span></div>" +
          '<div class="grid g-3">' + items.map(function (l) {
            return '<a class="card lesson-card stack" href="#/lesson/' + esc(l.code) + '" style="--c:' + esc(g.color) + '">' +
              '<div class="row-between"><span class="code">' + esc(l.code) + '</span><span class="small muted">' + esc(l.rifqah || "") + "</span></div>" +
              '<h3 class="lesson-title">' + esc(l.place || l.title) + "</h3>" +
              '<div class="callout"><span class="callout-label">Concrete twin</span>' + esc(l.twin) + "</div>" +
              '<p class="small muted"><strong>Signed artifact:</strong> ' + esc(l.production ? l.production.A : "—") + "</p>" +
            "</a>";
          }).join("") + "</div>";
      }).join("");
  };

  views.games = function () {
    function tile(id, emoji, title, body, cta, href) {
      return '<div class="card game-tile">' +
        '<div class="game-icon" aria-hidden="true">' + emoji + "</div>" +
        "<h3>" + title + "</h3><p>" + body + "</p>" +
        '<div class="card-foot">' + (href
          ? '<a class="btn" href="' + href + '" target="_blank" rel="noopener">' + icon("external") + cta + "</a>"
          : '<button class="btn btn-primary" type="button" data-game="' + id + '">' + icon("play") + cta + "</button>") + "</div></div>";
    }
    return pageHead("Sitr, not a race", "Games",
        "Short, private practice. Correct answers add a pebble to the class caravan. Mistakes stay private.",
        '<button class="btn btn-ghost" type="button" id="sound-toggle" aria-pressed="' + Sound.enabled + '">' + icon(Sound.enabled ? "sound" : "mute") + (Sound.enabled ? "Sound on" : "Sound off") + "</button>") +
      '<div class="grid g-3">' +
        tile("lantern", "🏮", "Lantern Drill ×2–×12", "Rapid multiplication facts. Pick a table or mix them all.", "Play") +
        tile("souq", "🪙", "Dakkan al-Halalah", "Run the market stall. Work out the change in riyals and halalas.", "Open the stall") +
        tile("critic", "⚖️", "Misbah’s Critic Arena", "Spot the reasoning error before the caravan leaves.", "Enter the arena") +
        tile("", "🐝", "Period Hive", "Place-value slips: group millions, thousands and ones.", "Open deck", "/slides/period-hive.html") +
        tile("", "🌙", "Night Zero", "The four-minute opening tale of the valley.", "Open deck", "/slides/night-zero.html") +
        tile("", "✏️", "Activity Studio", "Build matching, sorting, quiz and word games, then export a standalone file.", "Open studio", "/studio/") +
      "</div>" +
      '<dialog class="dialog" id="game-dialog" aria-labelledby="game-title">' +
        '<div class="dialog-head"><h2 id="game-title">Game</h2><button class="icon-btn" type="button" data-close aria-label="Close">' + icon("close") + "</button></div>" +
        '<div class="dialog-body" id="game-body"></div>' +
      "</dialog>";
  };

  views.gates = function () {
    var seals = sijill();
    var prog = progress(seals);
    return pageHead("The Sijill", "The 16 gates", prog.done + " of " + prog.total + " doors sealed this year. Seal doors from any lesson page or the map.") +
      '<div class="grid g-2">' +
        DATA.gates.map(function (g) {
          var codes = gateCodes(g.topic);
          var done = codes.filter(function (c) { return isSealed(seals, c); }).length;
          var full = done >= codes.length && codes.length > 0;
          return '<div class="card stack" style="' + (full ? "border-color:var(--pass)" : "") + '">' +
            '<div class="row-between"><div class="row" style="flex-wrap:nowrap"><span class="gate-badge" style="--c:' + esc(g.color) + '">' + esc(g.badge) + "</span>" +
              '<div><div class="card-title">Gate ' + g.topic + " · " + esc(g.name) + '</div><div class="small muted">' + esc(g.lead) + " · " + esc(g.guild) + "</div></div></div>" +
              '<span class="tag' + (full ? " pass" : "") + '">' + done + "/" + codes.length + "</span></div>" +
            bar(pct(done, codes.length), full ? "var(--pass)" : g.color) +
            '<p class="small" style="color:var(--ink-2)"><strong>Commission:</strong> ' + esc(g.commission) + "</p>" +
            '<div class="codes">' + codes.map(function (c) {
              var s = isSealed(seals, c);
              return '<a href="#/lesson/' + esc(c) + '" class="code' + (s ? " sealed" : "") + '" title="' + esc(lessonByCode(c).title) + '">' + (s ? "✓ " : "") + esc(c) + "</a>";
            }).join("") + "</div>" +
          "</div>";
        }).join("") +
      "</div>";
  };

  views.students = function () {
    var rows = hub.students.slice().sort(function (a, b) { return (a.klass || "").localeCompare(b.klass || "") || a.name.localeCompare(b.name); });
    return pageHead("Classroom", "Student roster", "Stored only in this browser. Export a backup before clearing browser data.",
        '<button id="s-export" class="btn" type="button"' + (hub.students.length ? "" : " disabled") + ">" + icon("download") + "Export CSV</button>" +
        '<button id="backup-export" class="btn" type="button">' + icon("download") + "Backup</button>" +
        '<label class="btn" style="cursor:pointer">' + icon("upload") + 'Restore<input type="file" id="backup-import" accept="application/json,.json" hidden /></label>') +
      '<div class="grid g-2">' +
        '<form class="card stack" id="form-add">' +
          '<h2 class="card-title">Add a student</h2>' +
          '<div class="row" style="flex-wrap:nowrap;align-items:flex-end">' +
            '<div class="field" style="flex:2"><label for="s-name">Name</label><input id="s-name" class="input" required placeholder="e.g. Zayd Khalid" autocomplete="off" /></div>' +
            '<div class="field" style="flex:1"><label for="s-class">Section</label><input id="s-class" class="input" placeholder="4A" autocomplete="off" /></div>' +
          "</div>" +
          '<div><button class="btn btn-primary" type="submit">Add student</button></div>' +
        "</form>" +
        '<form class="card stack" id="form-bulk">' +
          '<h2 class="card-title">Paste a class list</h2>' +
          '<div class="field"><label for="s-bulk">One name per line</label><textarea id="s-bulk" class="textarea" rows="3" placeholder="Omar Tariq&#10;Zayd Khalid"></textarea></div>' +
          '<div class="row" style="flex-wrap:nowrap;align-items:flex-end"><div class="field" style="flex:1"><label for="s-bulk-class">Section for all</label><input id="s-bulk-class" class="input" placeholder="4A" /></div><button class="btn" type="submit">Import list</button></div>' +
        "</form>" +
      "</div>" +
      '<div class="section-title"><span>' + plural(hub.students.length, "student") + "</span></div>" +
      (rows.length ? '<div class="table-wrap"><table><thead><tr><th>Name</th><th>Section</th><th>Portfolio</th><th><span class="sr-only">Actions</span></th></tr></thead><tbody>' +
        rows.map(function (s) {
          return "<tr><td><strong>" + esc(s.name) + "</strong></td><td>" + esc(s.klass || "—") + "</td>" +
            '<td><a href="#/portfolios/' + esc(s.id) + '" class="btn btn-sm">Open portfolio</a></td>' +
            '<td style="text-align:right"><button type="button" class="btn btn-sm btn-danger" data-del="' + esc(s.id) + '">Remove</button></td></tr>';
        }).join("") + "</tbody></table></div>"
        : empty("No students yet", "Add students one at a time or paste a whole class list above."));
  };

  views.portfolios = function (studentId) {
    if (!hub.students.length) {
      return pageHead("Stage 6", "Portfolios", "Printable A5 production sheets for each student.") +
        empty("Add students first", "Portfolios are created per student from the roster.", '<br /><a class="btn btn-primary" href="#/students">Go to the roster</a>');
    }
    var student = hub.students.find(function (s) { return s.id === studentId; }) || hub.students[0];
    var p = hub.portfolios[student.id] || {};
    var lesson = lessonByCode(p.code) || DATA.lessons[0];
    var path = p.path || "A";
    var seen = {};
    var lessonOpts = DATA.lessons.filter(function (l) { if (seen[l.code]) return false; seen[l.code] = 1; return true; });

    return pageHead("Stage 6", "Portfolios", "Pick a student, a door and a pathway. Notes save automatically; print to A5.",
        '<select id="pf-student" class="select" aria-label="Student" style="width:auto">' +
          hub.students.map(function (s) { return '<option value="' + esc(s.id) + '"' + (s.id === student.id ? " selected" : "") + ">" + esc(s.name) + " · " + esc(s.klass || "4A") + "</option>"; }).join("") +
        "</select>" +
        '<button type="button" class="btn btn-primary" id="pf-print">' + icon("print") + "Print A5</button>") +
      '<article class="parchment">' +
        '<header class="parchment-head">' +
          '<div class="row" style="flex-wrap:nowrap;gap:14px"><img src="/assets/img/daf-logo.png" alt="Dar Al Fikr Schools" width="132" height="44" />' +
            '<div><h2>Sijill · Production Record</h2><span class="sub">Valley of Trust · Wadi al-Amanah</span></div></div>' +
          '<div style="text-align:right"><strong style="font-size:13px;color:#0b2e35">' + esc(DATA.year) + '</strong><br /><span class="sub">' + esc(DATA.course) + "</span></div>" +
        "</header>" +
        '<div class="parchment-fields">' +
          '<div class="parchment-field"><span>Student</span><strong>' + esc(student.name) + "</strong></div>" +
          '<div class="parchment-field"><span>Section</span><strong>' + esc(student.klass || "4A") + "</strong></div>" +
          '<div class="parchment-field"><span>Door</span><select id="pf-code" aria-label="Door">' +
            lessonOpts.map(function (l) { return '<option value="' + esc(l.code) + '"' + (l.code === lesson.code ? " selected" : "") + ">" + esc(l.code) + " · " + esc(l.title) + "</option>"; }).join("") +
          "</select></div>" +
          '<div class="parchment-field"><span>Pathway</span><select id="pf-path" aria-label="Pathway"><option value="A"' + (path === "A" ? " selected" : "") + '>A · Job artifact</option><option value="B"' + (path === "B" ? " selected" : "") + ">B · Creative transfer</option></select></div>" +
        "</div>" +
        '<div class="parchment-proof" style="background:#f8fbfb;border-style:solid;border-color:#d7eaec"><label>The task</label><p style="font-size:14px;color:#1e2d30">' + esc(lesson.production ? lesson.production[path] : "") + "</p></div>" +
        '<div class="parchment-proof"><label for="pf-notes">Reasoning & evidence</label><textarea id="pf-notes" placeholder="What did he make, measure or prove? Write it in his words.">' + esc(p.notes || "") + "</textarea></div>" +
        '<div class="table-wrap" style="border:0;background:none"><table><thead><tr><th>Criterion</th><th>Mastery (3)</th><th>Proficient (2)</th><th>Developing (1)</th></tr></thead><tbody>' +
          "<tr><td><strong>Concrete evidence</strong></td><td>Twin used with precision</td><td>Model is clear</td><td>Concrete step incomplete</td></tr>" +
          "<tr><td><strong>Accuracy</strong></td><td>All calculations sound</td><td>Small slip, method sound</td><td>Misconception present</td></tr>" +
          "<tr><td><strong>Amanah</strong></td><td>Signed and checked alone</td><td>Checked with help</td><td>Not yet checked</td></tr>" +
        "</tbody></table></div>" +
        '<div class="parchment-sign"><div>Student signature</div><div>Teacher signature</div><div>Date</div></div>' +
        '<div class="stamp" aria-hidden="true"><span>Dar Al Fikr</span><strong>Sealed</strong></div>' +
      "</article>";
  };

  views.tracking = function () {
    var seals = sijill();
    var prog = progress(seals);
    var milestone = Math.max(15, Math.ceil((hub.pebbles + 1) / 15) * 15);
    var DOMAINS = [
      { name: "Place value & whole numbers", topics: [1, 2] },
      { name: "Multiplication", topics: [3, 4] },
      { name: "Division & problem solving", topics: [5, 6, 7] },
      { name: "Fractions", topics: [8, 9, 10] },
      { name: "Data, decimals & money", topics: [11, 12] },
      { name: "Measurement & patterns", topics: [13, 14] },
      { name: "Geometry", topics: [15, 16] }
    ];
    return pageHead("No rankings", "Caravan tracking", "Progress is shared. Pebbles fill one bowl for the whole class; domains fill as their doors are sealed.") +
      '<div class="grid g-2">' +
        '<div class="card" style="align-items:center;text-align:center;gap:14px">' +
          '<h2 class="card-title" style="align-self:flex-start">Class pebble bowl</h2>' +
          ring(hub.pebbles, milestone, "pebbles") +
          '<p class="small muted" style="max-width:40ch">Each sealed door and each correct game answer adds a pebble. Next oasis rest at <strong>' + milestone + "</strong>.</p>" +
        "</div>" +
        '<div class="card stack">' +
          '<h2 class="card-title">Mastery by domain</h2>' +
          DOMAINS.map(function (d) {
            var codes = [];
            d.topics.forEach(function (t) { codes = codes.concat(gateCodes(t)); });
            var done = codes.filter(function (c) { return isSealed(seals, c); }).length;
            var p = pct(done, codes.length);
            return '<div><div class="row-between small" style="margin-bottom:6px"><span style="font-weight:500">' + esc(d.name) + '</span><span class="muted">' + done + "/" + codes.length + "</span></div>" + bar(p) + "</div>";
          }).join("") +
          '<p class="small muted" style="margin-top:4px">' + prog.done + " of " + prog.total + " doors sealed overall.</p>" +
        "</div>" +
      "</div>";
  };

  views.library = function () {
    var docs = [
      { id: "PACING", name: "Pacing notes", note: "Weeks mapped to lessons, with the daily Lantern Drill." },
      { id: "WADI_ACTIVITY_ATLAS", name: "Wadi Activity Atlas", note: "Concrete twins, 2D game verbs and STEM commissions." }
    ];
    var decks = DATA.extras.concat([{ name: "Door 6-2 lesson deck", file: "slides/door-6-2.html", note: "Flagship projector deck with interactive activities." }]);
    return pageHead("Reference", "Library & decks", "Planning documents read inside the hub; slide decks open in a new tab for the projector.") +
      '<div class="section-title" style="margin-top:0"><span>Documents</span></div>' +
      '<div class="grid g-3">' + docs.map(function (d) {
        return '<a class="card stack" href="#/doc/' + d.id + '"><div class="game-icon">' + icon("doc") + '</div><h3 class="card-title">' + esc(d.name) + '</h3><p class="small muted">' + esc(d.note) + "</p></a>";
      }).join("") + "</div>" +
      '<div class="section-title"><span>Slide decks</span></div>' +
      '<div class="grid g-3">' + decks.map(function (e) {
        return '<a class="card stack" href="/' + esc(e.file) + '" target="_blank" rel="noopener"><div class="row-between"><h3 class="card-title">' + esc(e.name) + "</h3>" + icon("external") + '</div><p class="small muted">' + esc(e.note) + "</p></a>";
      }).join("") + "</div>";
  };

  views.doc = function (id) {
    var names = { PACING: "Pacing notes", WADI_ACTIVITY_ATLAS: "Wadi Activity Atlas" };
    if (!names[id]) return empty("Document not found", "That document isn't in the library.", '<br /><a class="btn" href="#/library">Back to library</a>');
    return pageHead('<a href="#/library">Library</a>', esc(names[id]), "") +
      '<div class="card"><div id="doc-body" class="prose" data-src="/docs/' + id + '.md"><div class="skeleton"><span></span><span></span><span></span></div></div></div>';
  };

  /* -------------------------------------------------------------- router -- */
  function parseHash() {
    var h = (location.hash || "#/dashboard").replace(/^#\/?/, "");
    var qs = "", qi = h.indexOf("?");
    if (qi !== -1) { qs = h.slice(qi + 1); h = h.slice(0, qi); }
    var parts = h.split("/");
    var params = {};
    qs.split("&").forEach(function (kv) { if (!kv) return; var p = kv.split("="); params[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || ""); });
    return { name: parts[0] || "dashboard", arg: parts[1] ? decodeURIComponent(parts[1]) : null, params: params };
  }

  var lastRoute = "";
  function render(opts) {
    if (!DATA) return;
    var route = parseHash();
    if (!views[route.name]) route = { name: "dashboard", arg: null, params: {} };
    var key = route.name + "/" + (route.arg || "");
    var view = $("#view");
    var scroll = window.scrollY;

    renderNav(route.name);
    var crumbTitle = TITLES[route.name] || route.name;
    if (route.name === "lesson" && route.arg) crumbTitle = "Lesson " + route.arg;
    $("#crumb").innerHTML = (PARENT[route.name] ? '<a href="#/' + PARENT[route.name] + '">' + esc(TITLES[PARENT[route.name]]) + "</a> / " : "") + "<strong>" + esc(crumbTitle) + "</strong>";
    document.title = crumbTitle + " · Dar Al Fikr Grade 4 Math";

    view.innerHTML = views[route.name](route.arg, route.params);
    closeNav();

    if (opts && opts.keepScroll && key === lastRoute) {
      window.scrollTo(0, scroll);
    } else {
      window.scrollTo(0, 0);
      view.classList.remove("view-enter"); void view.offsetWidth; view.classList.add("view-enter");
      if (lastRoute) view.focus({ preventScroll: true });
    }
    lastRoute = key;
    wire(route);
  }

  var mdCache = {};
  function loadMarkdown(url, target) {
    function put(text) { var box = $(target); if (box) box.innerHTML = md(text); }
    if (mdCache[url]) return put(mdCache[url]);
    fetch(url).then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
      .then(function (t) { mdCache[url] = t; put(t); })
      .catch(function () { var box = $(target); if (box) box.innerHTML = empty("Couldn't load this file", "Check your connection and try again."); });
  }

  /* -------------------------------------------------------------- wiring -- */
  function wire(route) {
    var view = $("#view");

    $$("[data-seal]", view).forEach(function (b) {
      b.addEventListener("click", function () { toggleSeal(b.getAttribute("data-seal")); });
    });

    if (route.name === "lesson") {
      var l = lessonByCode(route.arg);
      if (l && l.spec) loadMarkdown("/" + l.path, "#lesson-body");
    }
    if (route.name === "doc") {
      var box = $("#doc-body");
      if (box) loadMarkdown(box.getAttribute("data-src"), "#doc-body");
    }

    if (route.name === "lessons") {
      if (route.params.topic) { history.replaceState(null, "", "#/lessons"); }
      $$("[data-f]", view).forEach(function (el) {
        var k = el.getAttribute("data-f");
        if (el.tagName === "SELECT") el.addEventListener("change", function () { filters[k] = el.value; render({ keepScroll: true }); });
        else el.addEventListener("click", function () { filters[k] = el.getAttribute("data-v"); render({ keepScroll: true }); });
      });
      var input = $("#lesson-filter");
      var t;
      input.addEventListener("input", function () {
        clearTimeout(t);
        t = setTimeout(function () {
          filters.q = input.value; render({ keepScroll: true });
          var again = $("#lesson-filter"); again.focus(); again.setSelectionRange(again.value.length, again.value.length);
        }, 150);
      });
      $$("#clear-filters, #clear-filters-2", view).forEach(function (b) {
        b.addEventListener("click", function () { filters = { semester: "all", topic: "all", status: "all", q: "" }; render({ keepScroll: true }); });
      });
    }

    if (route.name === "map") wireMap(view);
    if (route.name === "games") wireGames(view);
    if (route.name === "students") wireStudents(view);
    if (route.name === "portfolios") wirePortfolio(view);
  }

  function wireMap(view) {
    var water = $("#wadi-water", view);
    if (water && water.getTotalLength) {
      var len = water.getTotalLength();
      var p = parseFloat(water.getAttribute("data-p")) || 0;
      water.style.strokeDasharray = len;
      water.style.strokeDashoffset = len;
      water.getBoundingClientRect();
      water.style.transition = "stroke-dashoffset 1.4s cubic-bezier(.2,.7,.2,1)";
      requestAnimationFrame(function () { water.style.strokeDashoffset = len * (1 - Math.max(p, 0.015)); });
    }
    $$(".gate-marker", view).forEach(function (m) {
      function open() { renderDossier(parseInt(m.getAttribute("data-gate"), 10)); }
      m.addEventListener("click", open);
      m.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } });
    });
    $("#dossier").addEventListener("click", function (e) {
      var b = e.target.closest("[data-seal]");
      if (b) toggleSeal(b.getAttribute("data-seal"));
    });
    if (activeGate) renderDossier(activeGate, true);
    var caravan = $("#caravan", view);
    $("#btn-march", view).addEventListener("click", function () {
      var seals = sijill();
      var target = 0;
      DATA.gates.forEach(function (g, i) {
        if (gateCodes(g.topic).some(function (c) { return isSealed(seals, c); })) target = i;
      });
      var step = 0;
      var btn = this; btn.disabled = true;
      (function go() {
        var pt = MAP_POINTS[step];
        caravan.style.transform = "translate(" + pt[0] + "px," + (pt[1] - 36) + "px)";
        Sound.step();
        if (step < target) { step++; setTimeout(go, 420); }
        else { btn.disabled = false; Sound.chime(880); renderDossier(DATA.gates[target].topic); }
      })();
    });
  }

  /* --------------------------------------------------------------- games -- */
  function addPebble() { hub.pebbles += 1; saveHub(); }
  // Each opened game gets a session id; pending timers from a closed game check it and stop.
  var gameSession = 0;
  function later(fn, ms) { var id = gameSession; setTimeout(function () { if (id === gameSession) fn(); }, ms); }

  function wireGames(view) {
    var dlg = $("#game-dialog", view);
    var body = $("#game-body", view);
    $("[data-close]", dlg).addEventListener("click", function () { dlg.close(); });
    dlg.addEventListener("close", function () { gameSession++; body.innerHTML = ""; });
    dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
    $("#sound-toggle", view).addEventListener("click", function () { Sound.toggle(); render({ keepScroll: true }); });

    $$("[data-game]", view).forEach(function (b) {
      b.addEventListener("click", function () {
        var g = b.getAttribute("data-game");
        var titles = { lantern: "🏮 Lantern Drill", souq: "🪙 Dakkan al-Halalah", critic: "⚖️ Misbah’s Critic Arena" };
        gameSession++;
        $("#game-title").textContent = titles[g];
        if (typeof dlg.showModal === "function") dlg.showModal(); else dlg.setAttribute("open", "");
        ({ lantern: lanternGame, souq: souqGame, critic: criticGame })[g](body);
      });
    });
  }

  function scoreRow(state) {
    return '<div class="score-row"><span>Correct <strong>' + state.right + "</strong></span><span>Streak <strong>" + state.streak + "</strong></span><span>Pebbles <strong>" + hub.pebbles + "</strong></span></div>";
  }

  function lanternGame(body) {
    var state = { right: 0, streak: 0, table: "mix", a: 0, b: 0 };
    function ask() {
      state.a = state.table === "mix" ? randInt(2, 12) : +state.table;
      state.b = randInt(2, 12);
      if (Math.random() < 0.5 && state.table === "mix") { var t = state.a; state.a = state.b; state.b = t; }
      draw("");
    }
    function draw(msg, cls) {
      body.innerHTML =
        '<div class="field" style="margin-bottom:12px"><label for="lt-table">Table</label><select id="lt-table" class="select"><option value="mix">Mixed ×2–×12</option>' +
          [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(function (n) { return '<option value="' + n + '"' + (String(n) === state.table ? " selected" : "") + ">×" + n + "</option>"; }).join("") +
        "</select></div>" +
        '<div class="drill-q" aria-live="polite">' + state.a + " × " + state.b + "</div>" +
        '<form class="answer-row" id="lt-form"><input id="lt-ans" class="input" type="number" inputmode="numeric" placeholder="?" aria-label="Your answer" autocomplete="off" /><button class="btn btn-primary" type="submit">Check</button></form>' +
        '<div class="feedback ' + (cls || "") + '">' + (msg || "Errors stay private. Correct answers add a pebble.") + "</div>" + scoreRow(state);
      var input = $("#lt-ans", body);
      input.focus();
      $("#lt-table", body).addEventListener("change", function () { state.table = this.value; ask(); });
      $("#lt-form", body).addEventListener("submit", function (e) {
        e.preventDefault();
        if (input.value === "") return;
        if (parseInt(input.value, 10) === state.a * state.b) {
          state.right++; state.streak++; addPebble(); Sound.chime(660 + Math.min(state.streak, 8) * 40);
          var msg = "Correct: " + state.a + " × " + state.b + " = " + state.a * state.b;
          later(ask, 650);
          draw(msg, "ok");
          $("#lt-ans", body).disabled = true;
        } else {
          state.streak = 0; Sound.stone();
          draw("Not yet. Try again quietly.", "no");
        }
      });
    }
    ask();
  }

  function souqGame(body) {
    var state = { right: 0, streak: 0 };
    var cost, paid;
    function ask() {
      cost = randInt(5, 95) + [0, 0.25, 0.5, 0.75][randInt(0, 3)];
      paid = cost > 50 ? 100 : 50;
      draw("");
    }
    function draw(msg, cls) {
      body.innerHTML =
        '<div class="callout" style="text-align:center;padding:18px"><span class="callout-label">Customer’s total</span>' +
          '<div style="font-family:var(--font-mono);font-size:30px;font-weight:700;color:var(--ink)">' + cost.toFixed(2) + ' <span style="font-size:16px">SAR</span></div>' +
          '<div class="small muted">Paid with a ' + paid + " riyal note. 1 riyal = 100 halalas.</div></div>" +
        '<form class="answer-row" id="sq-form" style="margin-top:14px"><input id="sq-ans" class="input" type="number" step="0.01" inputmode="decimal" placeholder="Change in SAR" aria-label="Change in riyals" autocomplete="off" /><button class="btn btn-primary" type="submit">Give change</button></form>' +
        '<div class="feedback ' + (cls || "") + '">' + (msg || "Work it out, then type the change.") + "</div>" + scoreRow(state);
      var input = $("#sq-ans", body);
      input.focus();
      $("#sq-form", body).addEventListener("submit", function (e) {
        e.preventDefault();
        if (input.value === "") return;
        var expected = Math.round((paid - cost) * 100) / 100;
        if (Math.abs(parseFloat(input.value) - expected) < 0.005) {
          state.right++; state.streak++; addPebble(); Sound.chime(720);
          draw("Trade settled: " + expected.toFixed(2) + " SAR change.", "ok");
          $("#sq-ans", body).disabled = true;
          later(ask, 900);
        } else {
          state.streak = 0; Sound.stone();
          draw("Check again: " + paid + ".00 − " + cost.toFixed(2) + ".", "no");
        }
      });
    }
    ask();
  }

  var CRITIC = [
    {
      door: "5-4", text: "The water master shares 125 litres equally among 4 camels. Misbah says each camel gets 31 litres and the last litre is poured into the sand.",
      options: ["The remainder was ignored. In context, the extra litre should be shared (31¼ L each) or stored.", "125 ÷ 4 was calculated as 30 R5.", "The quotient should be 41."], answer: 0,
      why: "125 ÷ 4 = 31 R1 is right, but in the desert no water is wasted: share it as a fraction or keep it."
    },
    {
      door: "1-4", text: "Rounding 356,039 to the nearest thousand, Misbah writes 357,000 because “the 9 at the end pushes it up.”",
      options: ["He should round to 360,000.", "Only the hundreds digit decides. It is 0, so the answer is 356,000.", "He forgot to add the 9."], answer: 1,
      why: "When rounding to thousands, look only at the hundreds digit. 0 < 5, so keep 356,000."
    },
    {
      door: "3-3", text: "To find 6 × 47, Misbah splits it as 6 × 40 = 240 and 6 × 7 = 42, then writes 240 + 42 = 272.",
      options: ["The partial products are wrong.", "The split should be 6 × 50 − 6 × 3.", "The addition is wrong: 240 + 42 = 282."], answer: 2,
      why: "The partial products are right; the slip is in the final addition. 240 + 42 = 282."
    },
    {
      door: "8-6", text: "Comparing 3/8 and 3/5 of a date cake, Misbah says 3/8 is bigger “because 8 is bigger than 5.”",
      options: ["With equal numerators, more parts means smaller parts, so 3/5 > 3/8.", "They are equal because both have 3.", "You must add the denominators first."], answer: 0,
      why: "Same number of pieces, but eighths are smaller than fifths, so 3/5 is greater."
    }
  ];
  function criticGame(body) {
    var state = { i: 0, right: 0, streak: 0 };
    function draw() {
      var c = CRITIC[state.i % CRITIC.length];
      body.innerHTML =
        '<div class="callout" style="margin-bottom:14px"><span class="callout-label">Dilemma · door ' + c.door + "</span>" + esc(c.text) + "</div>" +
        '<p class="small" style="font-weight:600;margin-bottom:8px">What went wrong?</p>' +
        '<div class="stack" id="cr-opts">' + c.options.map(function (o, i) {
          return '<button type="button" class="choice" data-i="' + i + '"><span class="key">' + "ABC"[i] + "</span><span>" + esc(o) + "</span></button>";
        }).join("") + "</div>" +
        '<div class="feedback" id="cr-fb"></div>' + scoreRow(state);
      $$(".choice", body).forEach(function (b) {
        b.addEventListener("click", function () {
          var i = +b.getAttribute("data-i");
          if (i === c.answer) {
            b.classList.add("right"); state.right++; state.streak++; addPebble(); Sound.chime(760);
            $$(".choice", body).forEach(function (x) { x.disabled = true; });
            var fb = $("#cr-fb", body); fb.className = "feedback ok"; fb.textContent = c.why;
            var next = document.createElement("div");
            next.style.cssText = "text-align:center;margin-top:12px";
            next.innerHTML = '<button type="button" class="btn btn-primary">Next dilemma' + icon("arrowR") + "</button>";
            next.querySelector("button").addEventListener("click", function () { state.i++; draw(); });
            fb.after(next);
          } else {
            b.classList.add("wrong"); b.disabled = true; state.streak = 0; Sound.stone();
            var fb2 = $("#cr-fb", body); fb2.className = "feedback no"; fb2.textContent = "Look again at the context. What does the situation need?";
          }
        });
      });
    }
    draw();
  }

  /* ------------------------------------------------------------ students -- */
  function wireStudents(view) {
    function addStudent(name, klass) {
      hub.students.push({ id: "s" + hub.seq++, name: name, klass: klass || "4A" });
    }
    $("#form-add", view).addEventListener("submit", function (e) {
      e.preventDefault();
      var n = $("#s-name").value.trim();
      if (!n) return;
      addStudent(n, $("#s-class").value.trim());
      saveHub(); render({ keepScroll: true });
      toast(n + " added");
      $("#s-name").focus();
    });
    $("#form-bulk", view).addEventListener("submit", function (e) {
      e.preventDefault();
      var names = $("#s-bulk").value.split(/\r?\n/).map(function (s) { return s.trim(); }).filter(Boolean);
      if (!names.length) return;
      var k = $("#s-bulk-class").value.trim();
      names.forEach(function (n) { addStudent(n, k); });
      saveHub(); render({ keepScroll: true });
      toast(plural(names.length, "student") + " imported");
    });
    $$("[data-del]", view).forEach(function (b) {
      b.addEventListener("click", function () {
        var id = b.getAttribute("data-del");
        var idx = hub.students.findIndex(function (s) { return s.id === id; });
        if (idx === -1) return;
        var removed = hub.students.splice(idx, 1)[0];
        saveHub(); render({ keepScroll: true });
        toast(removed.name + " removed", { label: "Undo", run: function () { hub.students.splice(idx, 0, removed); saveHub(); render({ keepScroll: true }); } });
      });
    });
    var exp = $("#s-export", view);
    exp.addEventListener("click", function () {
      var csv = "Name,Section\n" + hub.students.map(function (s) { return csvCell(s.name) + "," + csvCell(s.klass); }).join("\n");
      download("daf-grade4-roster.csv", csv, "text/csv;charset=utf-8");
    });
    $("#backup-export", view).addEventListener("click", function () {
      download("daf-hub-backup-" + today() + ".json", JSON.stringify({ app: "daf-hub", version: 1, hub: hub, sijill: sijill() }, null, 1), "application/json");
    });
    $("#backup-import", view).addEventListener("change", function () {
      var file = this.files && this.files[0];
      if (!file) return;
      file.text().then(function (text) {
        var data = JSON.parse(text);
        if (!data || data.app !== "daf-hub") throw new Error("bad");
        if (!confirm("Replace the roster, portfolios and sealed doors in this browser with the backup?")) return;
        hub = normaliseHub(data.hub); saveHub();
        writeJSON(SIJILL_KEY, data.sijill || {});
        render(); toast("Backup restored");
      }).catch(function () { toast("That file isn't a hub backup"); });
    });
  }

  function wirePortfolio(view) {
    var sel = $("#pf-student", view);
    if (!sel) return;
    var id = sel.value;
    function save(patch) {
      var p = hub.portfolios[id] || {};
      for (var k in patch) p[k] = patch[k];
      hub.portfolios[id] = p; saveHub();
    }
    sel.addEventListener("change", function () { location.hash = "#/portfolios/" + sel.value; });
    $("#pf-code", view).addEventListener("change", function () { save({ code: this.value }); render({ keepScroll: true }); });
    $("#pf-path", view).addEventListener("change", function () { save({ path: this.value }); render({ keepScroll: true }); });
    var t;
    $("#pf-notes", view).addEventListener("input", function () {
      var v = this.value; clearTimeout(t); t = setTimeout(function () { save({ notes: v }); }, 300);
    });
    $("#pf-print", view).addEventListener("click", function () { window.print(); });
  }

  /* ------------------------------------------------------- command palette -- */
  var palette = null;
  function buildPalette() {
    var dlg = document.createElement("dialog");
    dlg.className = "dialog palette";
    dlg.setAttribute("aria-label", "Search");
    dlg.innerHTML =
      '<div class="palette-input-wrap">' + icon("search") +
        '<input class="palette-input" type="text" placeholder="Search lessons, codes, gates or pages" aria-label="Search" role="combobox" aria-expanded="true" aria-controls="palette-list" aria-autocomplete="list" />' +
        "<kbd>Esc</kbd></div>" +
      '<ul class="palette-list" id="palette-list" role="listbox"></ul>' +
      '<div class="palette-foot"><span><kbd>↑</kbd> <kbd>↓</kbd> to move</span><span><kbd>Enter</kbd> to open</span></div>';
    document.body.appendChild(dlg);
    var input = $(".palette-input", dlg), list = $(".palette-list", dlg);
    var items = [], sel = 0;

    function results(q) {
      q = q.trim().toLowerCase();
      var pages = NAV.filter(function (n) { return n.id; }).map(function (n) { return { group: "Pages", label: n.label, sub: "", href: "#/" + n.id, icon: n.icon }; });
      var seen = {};
      var lessons = DATA.lessons.filter(function (l) { if (seen[l.code]) return false; seen[l.code] = 1; return true; })
        .map(function (l) { return { group: "Lessons", label: l.code + " · " + l.title, sub: l.topicTitle, href: "#/lesson/" + l.code, icon: "lessons", hay: (l.code + " " + l.title + " " + l.objective + " " + l.topicTitle + " " + l.place).toLowerCase() }; });
      if (!q) return pages.slice(0, 6).concat(lessons.slice(0, 6));
      var terms = q.split(/\s+/);
      function match(hay) { return terms.every(function (t) { return hay.indexOf(t) !== -1; }); }
      var p = pages.filter(function (x) { return match(x.label.toLowerCase()); });
      var l = lessons.filter(function (x) { return match(x.hay); });
      l.sort(function (a, b) { return (b.label.toLowerCase().indexOf(q) === 0) - (a.label.toLowerCase().indexOf(q) === 0); });
      return p.concat(l).slice(0, 40);
    }
    function draw() {
      items = results(input.value);
      sel = Math.min(sel, Math.max(items.length - 1, 0));
      if (!items.length) { list.innerHTML = '<li class="palette-empty">No matches for “' + esc(input.value) + "”</li>"; return; }
      var html = "", group = "";
      items.forEach(function (it, i) {
        if (it.group !== group) { group = it.group; html += '<li class="palette-group" role="presentation">' + group + "</li>"; }
        html += '<li class="palette-item" role="option" id="pi-' + i + '" data-i="' + i + '" aria-selected="' + (i === sel) + '">' + icon(it.icon) + "<span>" + esc(it.label) + '</span><span class="sub">' + esc(it.sub) + "</span></li>";
      });
      list.innerHTML = html;
      input.setAttribute("aria-activedescendant", "pi-" + sel);
      var cur = $("#pi-" + sel, list); if (cur) cur.scrollIntoView({ block: "nearest" });
    }
    function go(i) { var it = items[i]; if (!it) return; dlg.close(); location.hash = it.href; }
    input.addEventListener("input", function () { sel = 0; draw(); });
    input.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown") { e.preventDefault(); sel = Math.min(sel + 1, items.length - 1); draw(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); sel = Math.max(sel - 1, 0); draw(); }
      else if (e.key === "Enter") { e.preventDefault(); go(sel); }
    });
    list.addEventListener("click", function (e) { var li = e.target.closest("[data-i]"); if (li) go(+li.getAttribute("data-i")); });
    list.addEventListener("mousemove", function (e) {
      var li = e.target.closest("[data-i]"); if (!li) return;
      var i = +li.getAttribute("data-i"); if (i === sel) return;
      sel = i; $$(".palette-item", list).forEach(function (x) { x.setAttribute("aria-selected", x === li); });
    });
    dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
    return { open: function () { if (dlg.open) return; input.value = ""; sel = 0; draw(); dlg.showModal(); input.focus(); } };
  }
  function openPalette() {
    if (!DATA) return;
    if (!palette) palette = buildPalette();
    palette.open();
  }

  /* -------------------------------------------------------------- chrome -- */
  function closeNav() {
    $("#app").classList.remove("nav-open");
    $("#burger").setAttribute("aria-expanded", "false");
  }
  function chrome() {
    $("#theme").addEventListener("click", function () {
      var root = document.documentElement;
      var cur = root.getAttribute("data-theme") || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
      var next = cur === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
    });
    $("#burger").addEventListener("click", function () {
      var open = $("#app").classList.toggle("nav-open");
      this.setAttribute("aria-expanded", String(open));
      if (open) { var a = $(".nav-item.on") || $(".nav-item"); if (a) a.focus(); }
    });
    $("#scrim").addEventListener("click", closeNav);
    $("#search").addEventListener("click", openPalette);
    document.addEventListener("keydown", function (e) {
      var typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) { e.preventDefault(); openPalette(); }
      else if (e.key === "/" && !typing) { e.preventDefault(); openPalette(); }
      else if (e.key === "Escape") closeNav();
    });
    if (/Mac|iPhone|iPad/.test(navigator.platform)) { var k = $("#search kbd"); if (k) k.textContent = "⌘K"; }
    window.addEventListener("hashchange", function () { render(); });
    // Seals made in a slide deck in another tab show up here too.
    window.addEventListener("storage", function (e) { if (e.key === SIJILL_KEY || e.key === HUB_KEY) { if (e.key === HUB_KEY) hub = normaliseHub(readJSON(HUB_KEY, null)); render({ keepScroll: true }); } });
  }

  /* ------------------------------------------------------------- startup -- */
  chrome();
  fetch("/data/curriculum.json")
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (d) { DATA = d; render(); })
    .catch(function () {
      $("#view").innerHTML = empty("The curriculum couldn't load", "Check your connection and reload the page.", '<br /><button class="btn btn-primary" type="button" onclick="location.reload()">Reload</button>');
    });
})();
