/* ============================================================================
   Football Tactics Board — board.js
   ----------------------------------------------------------------------------
   Drives the interactive pitch on board.html:
     • two teams of 11 draggable players
     • three tools: move / draw arrow / erase
     • four formation presets
     • save & load to localStorage
   Plain SVG + pointer events, no libraries.
   ============================================================================ */

(function () {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";
  var pitch = document.getElementById("pitch");
  if (!pitch) return;

  var playersLayer = document.getElementById("players");
  var arrowsLayer = document.getElementById("arrows");

  // Field bounds in SVG coordinates — players stay inside these.
  var FIELD = { x0: 24, x1: 696, y0: 24, y1: 436 };

  var mode = "move";        // "move" | "arrow" | "erase"
  var selectedPlayer = null;
  var arrowStart = null;
  var players = [];          // player <g> elements
  var arrows = [];           // {x1,y1,x2,y2,el}

  /* --------------------------------------------------------------------------
     Formations — each is 11 [x, y] positions as fractions (0..1) of the field,
     attacking from left to right. Team B is the mirror (attacks left).
     -------------------------------------------------------------------------- */
  var FORMATIONS = {
    "4-3-3": [
      [0.06, 0.50],
      [0.20, 0.20], [0.20, 0.40], [0.20, 0.60], [0.20, 0.80],
      [0.44, 0.30], [0.44, 0.50], [0.44, 0.70],
      [0.64, 0.28], [0.64, 0.50], [0.64, 0.72]
    ],
    "4-4-2": [
      [0.06, 0.50],
      [0.20, 0.20], [0.20, 0.40], [0.20, 0.60], [0.20, 0.80],
      [0.44, 0.20], [0.44, 0.40], [0.44, 0.60], [0.44, 0.80],
      [0.66, 0.40], [0.66, 0.60]
    ],
    "3-5-2": [
      [0.06, 0.50],
      [0.20, 0.28], [0.20, 0.50], [0.20, 0.72],
      [0.44, 0.15], [0.44, 0.33], [0.44, 0.50], [0.44, 0.67], [0.44, 0.85],
      [0.66, 0.40], [0.66, 0.60]
    ],
    "4-2-3-1": [
      [0.06, 0.50],
      [0.20, 0.20], [0.20, 0.40], [0.20, 0.60], [0.20, 0.80],
      [0.40, 0.40], [0.40, 0.60],
      [0.56, 0.25], [0.56, 0.50], [0.56, 0.75],
      [0.70, 0.50]
    ]
  };

  function fx(f) { return FIELD.x0 + f * (FIELD.x1 - FIELD.x0); }
  function fy(f) { return FIELD.y0 + f * (FIELD.y1 - FIELD.y0); }

  /* --------------------------------------------------------------------------
     Players
     -------------------------------------------------------------------------- */
  function createPlayer(team, x, y, number) {
    var g = document.createElementNS(NS, "g");
    g.setAttribute("class", "player " + (team === "A" ? "team-a" : "team-b"));
    g.setAttribute("data-team", team);
    g.setAttribute("data-number", number);

    var c = document.createElementNS(NS, "circle");
    c.setAttribute("r", 15);
    var t = document.createElementNS(NS, "text");
    t.textContent = number;

    g.appendChild(c);
    g.appendChild(t);
    playersLayer.appendChild(g);
    setPos(g, x, y);
    return g;
  }

  function setPos(g, x, y) {
    x = Math.min(FIELD.x1, Math.max(FIELD.x0, x));
    y = Math.min(FIELD.y1, Math.max(FIELD.y0, y));
    g.setAttribute("data-x", x);
    g.setAttribute("data-y", y);
    g.setAttribute("transform", "translate(" + x + "," + y + ")");
  }

  // Map a pointer's client coordinates into the SVG's coordinate system.
  function svgPoint(clientX, clientY) {
    var pt = pitch.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    return pt.matrixTransform(pitch.getScreenCTM().inverse());
  }

  /* --------------------------------------------------------------------------
     Formations
     -------------------------------------------------------------------------- */
  function applyFormation(name) {
    var list = FORMATIONS[name] || FORMATIONS["4-3-3"];
    playersLayer.innerHTML = "";
    players = [];
    for (var i = 0; i < 11; i++) {
      var p = list[i];
      players.push(createPlayer("A", fx(p[0]), fy(p[1]), i + 1));
      players.push(createPlayer("B", fx(1 - p[0]), fy(p[1]), i + 1));
    }
    clearSelection();
    document.querySelectorAll("[data-formation]").forEach(function (b) {
      b.classList.toggle("is-active", b.getAttribute("data-formation") === name);
    });
  }

  /* --------------------------------------------------------------------------
     Dragging & selecting (move tool)
     -------------------------------------------------------------------------- */
  function beginDrag(e, g) {
    e.preventDefault();
    g.setPointerCapture(e.pointerId);
    var start = svgPoint(e.clientX, e.clientY);
    var ox = Number(g.getAttribute("data-x")) - start.x;
    var oy = Number(g.getAttribute("data-y")) - start.y;
    var moved = false;

    function move(ev) {
      var p = svgPoint(ev.clientX, ev.clientY);
      if (Math.pow(p.x - start.x, 2) + Math.pow(p.y - start.y, 2) > 16) moved = true;
      setPos(g, p.x + ox, p.y + oy);
    }
    function up(ev) {
      g.releasePointerCapture(ev.pointerId);
      g.removeEventListener("pointermove", move);
      g.removeEventListener("pointerup", up);
      if (!moved) selectPlayer(g);   // a clean tap selects
      save();
    }
    g.addEventListener("pointermove", move);
    g.addEventListener("pointerup", up);
  }

  function selectPlayer(g) {
    players.forEach(function (p) { p.classList.remove("is-selected"); });
    g.classList.add("is-selected");
    selectedPlayer = g;
    renderSelectedInfo();
  }

  function clearSelection() {
    players.forEach(function (p) { p.classList.remove("is-selected"); });
    selectedPlayer = null;
    renderSelectedInfo();
  }

  function renderSelectedInfo() {
    var box = document.querySelector("[data-selected]");
    var num = document.querySelector("[data-number-input]");
    if (!box) return;
    if (!selectedPlayer) {
      box.innerHTML = "<span class='hint'>Click a player to select them.</span>";
      if (num) num.value = "";
      return;
    }
    var team = selectedPlayer.getAttribute("data-team") === "A" ? "A" : "B";
    var n = selectedPlayer.getAttribute("data-number");
    box.innerHTML =
      "<span class='swatch " + (team === "A" ? "team-a" : "team-b") + "'></span>" +
      "Team " + team + " · <strong>#" + n + "</strong>";
    if (num) num.value = n;
  }

  /* --------------------------------------------------------------------------
     Arrows (arrow + erase tools)
     -------------------------------------------------------------------------- */
  function handleArrowTap(g) {
    if (!arrowStart) {
      arrowStart = g;
      g.classList.add("is-selected");
      setHint("Now tap the target player…");
      return;
    }
    if (arrowStart === g) {
      arrowStart.classList.remove("is-selected");
      arrowStart = null;
      setHint("Tap a player to start an arrow.");
      return;
    }
    drawArrow(
      Number(arrowStart.getAttribute("data-x")),
      Number(arrowStart.getAttribute("data-y")),
      Number(g.getAttribute("data-x")),
      Number(g.getAttribute("data-y"))
    );
    arrowStart.classList.remove("is-selected");
    arrowStart = null;
    setHint("Tap a player to start an arrow.");
    save();
  }

  function drawArrow(x1, y1, x2, y2) {
    var line = document.createElementNS(NS, "line");
    line.setAttribute("class", "arrow");
    line.setAttribute("x1", x1);
    line.setAttribute("y1", y1);
    line.setAttribute("x2", x2);
    line.setAttribute("y2", y2);
    line.setAttribute("marker-end", "url(#arrowhead)");
    line.addEventListener("pointerdown", function () {
      if (mode === "erase") {
        line.remove();
        arrows = arrows.filter(function (a) { return a.el !== line; });
        save();
      }
    });
    arrowsLayer.appendChild(line);
    arrows.push({ x1: x1, y1: y1, x2: x2, y2: y2, el: line });
  }

  /* --------------------------------------------------------------------------
     Tool switching
     -------------------------------------------------------------------------- */
  function setMode(m) {
    mode = m;
    if (m !== "arrow" && arrowStart) {
      arrowStart.classList.remove("is-selected");
      arrowStart = null;
    }
    document.querySelectorAll("[data-mode]").forEach(function (b) {
      b.classList.toggle("is-active", b.getAttribute("data-mode") === m);
    });
    setHint({
      move:  "Drag a player to move them. Click to select.",
      arrow: "Tap a player, then tap another to draw an arrow.",
      erase: "Click an arrow to remove it."
    }[m]);
  }

  function setHint(text) {
    var el = document.querySelector("[data-hint]");
    if (el) el.textContent = text;
  }

  /* --------------------------------------------------------------------------
     Save / load (localStorage)
     -------------------------------------------------------------------------- */
  function save() {
    var data = {
      players: players.map(function (g) {
        return {
          team: g.getAttribute("data-team"),
          number: g.getAttribute("data-number"),
          x: Number(g.getAttribute("data-x")),
          y: Number(g.getAttribute("data-y"))
        };
      }),
      arrows: arrows.map(function (a) { return { x1: a.x1, y1: a.y1, x2: a.x2, y2: a.y2 }; })
    };
    try { localStorage.setItem("tactics-board", JSON.stringify(data)); } catch (e) {}
  }

  function load() {
    var raw = null;
    try { raw = localStorage.getItem("tactics-board"); } catch (e) {}
    if (!raw) { applyFormation("4-3-3"); return; }
    try {
      var data = JSON.parse(raw);
      playersLayer.innerHTML = "";
      players = [];
      data.players.forEach(function (p) {
        players.push(createPlayer(p.team, p.x, p.y, p.number));
      });
      arrowsLayer.innerHTML = "";
      arrows = [];
      data.arrows.forEach(function (a) { drawArrow(a.x1, a.y1, a.x2, a.y2); });
    } catch (e) {
      applyFormation("4-3-3");
    }
  }

  function reset() {
    applyFormation("4-3-3");
    arrowsLayer.innerHTML = "";
    arrows = [];
    save();
  }

  function clearArrows() {
    arrowsLayer.innerHTML = "";
    arrows = [];
    save();
  }

  function flashSaved() {
    var el = document.querySelector("[data-saved]");
    if (!el) return;
    el.textContent = "Saved ✓";
    clearTimeout(flashSaved._t);
    flashSaved._t = setTimeout(function () { el.textContent = ""; }, 1200);
  }

  /* --------------------------------------------------------------------------
     Wire everything up
     -------------------------------------------------------------------------- */
  playersLayer.addEventListener("pointerdown", function (e) {
    var g = e.target && e.target.closest ? e.target.closest(".player") : null;
    if (!g) return;
    if (mode === "move") beginDrag(e, g);
    else if (mode === "arrow") handleArrowTap(g);
  });

  document.querySelectorAll("[data-mode]").forEach(function (b) {
    b.addEventListener("click", function () { setMode(b.getAttribute("data-mode")); });
  });

  document.querySelectorAll("[data-formation]").forEach(function (b) {
    b.addEventListener("click", function () {
      applyFormation(b.getAttribute("data-formation"));
      save();
    });
  });

  var saveBtn = document.querySelector("[data-save]");
  if (saveBtn) saveBtn.addEventListener("click", function () { save(); flashSaved(); });

  var resetBtn = document.querySelector("[data-reset]");
  if (resetBtn) resetBtn.addEventListener("click", reset);

  var clearBtn = document.querySelector("[data-clear-arrows]");
  if (clearBtn) clearBtn.addEventListener("click", clearArrows);

  var numInput = document.querySelector("[data-number-input]");
  if (numInput) {
    numInput.addEventListener("input", function () {
      if (!selectedPlayer) return;
      var n = numInput.value.trim();
      if (n === "") return;
      selectedPlayer.setAttribute("data-number", n);
      var t = selectedPlayer.querySelector("text");
      if (t) t.textContent = n;
      save();
    });
  }

  /* --------------------------------------------------------------------------
     Boot
     -------------------------------------------------------------------------- */
  load();
  // A formation can be requested via the URL (e.g. board.html?f=4-3-3).
  var q = new URLSearchParams(location.search).get("f");
  if (q && FORMATIONS[q]) { applyFormation(q); save(); }
  setMode("move");
})();
