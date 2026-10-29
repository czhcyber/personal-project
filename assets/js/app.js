/* ============================================================================
   Refreshments — app.js
   ----------------------------------------------------------------------------
   Drives the light, Apple-style interactions:
     1. Mobile navigation toggle
     2. Scroll fade-in (IntersectionObserver, respects reduced motion)
     3. Product detail dialog (native <dialog>)
   Plain JavaScript, no libraries.
   ============================================================================ */

(function () {
  "use strict";

  /* --------------------------------------------------------------------------
     Product details (text + photo path; the artwork is in assets/img/products)
     -------------------------------------------------------------------------- */
  var PRODUCTS = {
    "coke": {
      name: "Coca-Cola", zh: "可口可乐",
      img: "assets/img/products/coke.jpg",
      tagline: "The original spark.",
      desc: "The classic cola that started it all — a crisp, refreshing taste with just the right amount of fizz.",
      category: "Cola · Carbonated",
      meter: [ { label: "Sweetness", value: 5 }, { label: "Caffeine", value: 3 }, { label: "Fizz", value: 5 } ],
      facts: ["Since 1886", "Classic cola", "Best served chilled"]
    },
    "sprite": {
      name: "Sprite", zh: "雪碧",
      img: "assets/img/products/sprite.jpg",
      tagline: "Crisp lemon-lime clarity.",
      desc: "A clean, caffeine-free lemon-lime soda with a sharp, refreshing finish.",
      category: "Lemon-lime · Carbonated",
      meter: [ { label: "Sweetness", value: 4 }, { label: "Caffeine", value: 0 }, { label: "Fizz", value: 5 } ],
      facts: ["Caffeine-free", "Since 1961", "Sharp, clean finish"]
    },
    "fanta": {
      name: "Fanta Orange", zh: "芬达橙味",
      img: "assets/img/products/fanta.jpg",
      tagline: "Bright, juicy orange.",
      desc: "A fruity, bubbly orange soda packed with bright citrus flavour.",
      category: "Orange · Fruity",
      meter: [ { label: "Sweetness", value: 5 }, { label: "Caffeine", value: 0 }, { label: "Fizz", value: 4 } ],
      facts: ["Since 1940", "Fruity & bubbly", "Citrus flavour"]
    },
    "minute-maid": {
      name: "Minute Maid Orange Juice", zh: "美汁源果粒橙",
      img: "assets/img/products/minute-maid.jpg",
      tagline: "Real orange, real pulp.",
      desc: "A rich orange juice made with real fruit and juicy pulp for a fuller, more natural taste.",
      category: "Orange juice · With pulp",
      meter: [ { label: "Sweetness", value: 4 }, { label: "Caffeine", value: 0 }, { label: "Fizz", value: 0 } ],
      facts: ["Contains pulp", "Real fruit", "Not carbonated"]
    },
    "cherry": {
      name: "Coca-Cola Cherry", zh: "樱桃味可口可乐",
      img: "assets/img/products/cherry.jpg",
      tagline: "Cola with a cherry twist.",
      desc: "The familiar Coca-Cola taste lifted by a smooth, sweet cherry finish.",
      category: "Cola · Cherry",
      meter: [ { label: "Sweetness", value: 5 }, { label: "Caffeine", value: 3 }, { label: "Fizz", value: 5 } ],
      facts: ["Cherry flavour", "Since 1985", "Smooth finish"]
    }
  };

  // Render the flavour meters into any container (dialog + quiz result).
  function fillMeters(container, product) {
    if (!container) return;
    container.innerHTML = "";
    (product.meter || []).forEach(function (m) {
      var row = document.createElement("div");
      row.className = "meter";
      var label = document.createElement("span");
      label.className = "meter-label";
      label.textContent = m.label;
      var track = document.createElement("span");
      track.className = "meter-track";
      var fill = document.createElement("span");
      fill.className = "meter-fill";
      track.appendChild(fill);
      row.appendChild(label);
      row.appendChild(track);
      container.appendChild(row);
      requestAnimationFrame(function () {
        fill.style.width = (m.value / 5 * 100) + "%";
      });
    });
  }

  /* --------------------------------------------------------------------------
     1. Mobile navigation
     -------------------------------------------------------------------------- */
  function initNav() {
    var toggle = document.getElementById("menu-toggle");
    var overlay = document.getElementById("menu-overlay");
    var closeBtn = document.getElementById("menu-close");
    if (!toggle || !overlay) return;

    function setOpen(open) {
      overlay.classList.toggle("is-open", open);
      overlay.setAttribute("aria-hidden", open ? "false" : "true");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      document.body.style.overflow = open ? "hidden" : "";
    }

    toggle.addEventListener("click", function () {
      setOpen(!overlay.classList.contains("is-open"));
    });
    if (closeBtn) closeBtn.addEventListener("click", function () { setOpen(false); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && overlay.classList.contains("is-open")) setOpen(false);
    });
  }

  /* --------------------------------------------------------------------------
     2. Scroll fade-in
     -------------------------------------------------------------------------- */
  function initFade() {
    var els = document.querySelectorAll(".fade");
    if (!els.length) return;

    var reduced = window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced || !("IntersectionObserver" in window)) {
      els.forEach(function (el) { el.classList.add("in-view"); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });

    els.forEach(function (el) { io.observe(el); });
  }

  /* --------------------------------------------------------------------------
     3. Product detail dialog
     -------------------------------------------------------------------------- */
  function initDialog() {
    var dialog = document.getElementById("product-dialog");
    if (!dialog) return;

    var dlgVisual = document.getElementById("dlg-visual");
    var dlgName = document.getElementById("dlg-name");
    var dlgTagline = document.getElementById("dlg-tagline");
    var dlgDesc = document.getElementById("dlg-desc");
    var dlgMeters = document.getElementById("dlg-meters");
    var dlgFacts = document.getElementById("dlg-facts");
    var closeBtn = document.getElementById("dlg-close");

    function open(card) {
      var id = card.getAttribute("data-product");
      var p = PRODUCTS[id];
      if (!p) return;

      // Artwork: use the product photo.
      dlgVisual.innerHTML = p.img
        ? "<img class='p-img' src='" + p.img + "' alt='" + p.name + "'>"
        : "";

      dlgName.textContent = p.name;
      if (p.zh) {
        var zh = document.createElement("span");
        zh.className = "dlg-zh";
        zh.textContent = " " + p.zh;
        dlgName.appendChild(zh);
      }
      dlgTagline.textContent = p.tagline;
      dlgDesc.textContent = p.desc;

      // Flavour meters (animated from 0 to their value).
      fillMeters(dlgMeters, p);

      dlgFacts.innerHTML = "";
      [p.category].concat(p.facts).forEach(function (f) {
        var li = document.createElement("li");
        li.textContent = f;
        dlgFacts.appendChild(li);
      });

      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
    }

    function close() {
      if (typeof dialog.close === "function") dialog.close();
      else dialog.removeAttribute("open");
    }

    document.querySelectorAll(".card[data-product]").forEach(function (card) {
      card.addEventListener("click", function () { open(card); });
      card.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open(card);
        }
      });
    });

    if (closeBtn) closeBtn.addEventListener("click", close);

    // Close when clicking the backdrop (the <dialog> element itself).
    dialog.addEventListener("click", function (e) {
      if (e.target === dialog) close();
    });
  }

  /* --------------------------------------------------------------------------
     4. "Find your drink" quiz
     -------------------------------------------------------------------------- */
  var FLOW = {
    start: {
      text: "Fizzy or still?",
      options: [
        { label: "Fizzy", next: "fizzy" },
        { label: "Still", result: "minute-maid" }
      ]
    },
    fizzy: {
      text: "Which flavour family?",
      options: [
        { label: "Cola", next: "cola" },
        { label: "Citrus", result: "sprite" },
        { label: "Fruity", result: "fanta" }
      ]
    },
    cola: {
      text: "How do you like it?",
      options: [
        { label: "The classic", result: "coke" },
        { label: "A cherry twist", result: "cherry" }
      ]
    }
  };

  function initQuiz() {
    var quiz = document.getElementById("quiz");
    if (!quiz) return;
    var progressEl = document.getElementById("quiz-progress");
    var questionEl = document.getElementById("quiz-question");
    var optionsEl = document.getElementById("quiz-options");
    var resultEl = document.getElementById("quiz-result");
    var barFill = document.getElementById("quiz-bar-fill");
    var backBtn = document.getElementById("quiz-back");
    var hintEl = document.getElementById("quiz-hint");

    var TOTAL = 3;
    var history = ["start"];

    function setProgress() {
      if (barFill) {
        barFill.style.width = Math.min(100, Math.round((history.length / TOTAL) * 100)) + "%";
      }
      progressEl.textContent = "Question " + history.length;
      if (backBtn) backBtn.hidden = history.length <= 1;
    }

    function renderStep(key) {
      var node = FLOW[key];
      if (!node) return;
      resultEl.hidden = true;
      optionsEl.hidden = false;
      questionEl.hidden = false;
      if (hintEl) hintEl.hidden = false;
      questionEl.textContent = node.text;
      optionsEl.innerHTML = "";
      setProgress();

      node.options.forEach(function (opt) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "quiz-option";
        b.textContent = opt.label;
        b.addEventListener("click", function () {
          if (opt.result) {
            renderResult(opt.result);
          } else {
            history.push(opt.next);
            renderStep(opt.next);
          }
        });
        optionsEl.appendChild(b);
      });
    }

    function goBack() {
      if (history.length <= 1) return;
      history.pop();
      renderStep(history[history.length - 1]);
    }

    function renderResult(id) {
      var p = PRODUCTS[id];
      if (!p) return;
      questionEl.hidden = true;
      optionsEl.hidden = true;
      if (hintEl) hintEl.hidden = true;
      if (backBtn) backBtn.hidden = true;
      if (barFill) barFill.style.width = "100%";
      progressEl.textContent = "Your match";
      resultEl.hidden = false;
      resultEl.innerHTML =
        "<div class='quiz-result-visual'>" +
          "<img class='p-img' src='" + p.img + "' alt='" + p.name + "'>" +
        "</div>" +
        "<p class='quiz-result-name'>" + p.name + (p.zh ? " <span class='card-zh'>" + p.zh + "</span>" : "") + "</p>" +
        "<p class='quiz-result-tag'>" + p.tagline + "</p>" +
        "<div class='dlg-meters' data-quiz-meters></div>" +
        "<div class='quiz-actions'>" +
          "<button class='btn btn-ghost' type='button' data-restart>Start over</button>" +
          "<a class='btn btn-primary' href='products.html'>Browse all drinks</a>" +
        "</div>";

      fillMeters(resultEl.querySelector("[data-quiz-meters]"), p);

      // Replay the entrance animation each time a result is shown.
      resultEl.classList.remove("is-in");
      void resultEl.offsetWidth;
      resultEl.classList.add("is-in");

      resultEl.querySelector("[data-restart]").addEventListener("click", function () {
        history = ["start"];
        renderStep("start");
      });
    }

    if (backBtn) backBtn.addEventListener("click", goBack);

    renderStep("start");
  }

  /* --------------------------------------------------------------------------
     5. Brand reveal + card flavour quick-look
     -------------------------------------------------------------------------- */
  function initReveal() {
    var el = document.querySelector(".manifesto");
    if (!el) return;
    var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || !("IntersectionObserver" in window)) {
      el.classList.add("is-in");
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { el.classList.add("is-in"); io.disconnect(); }
      });
    }, { threshold: 0.35 });
    io.observe(el);
  }

  function initCardMeters() {
    document.querySelectorAll(".card[data-product]").forEach(function (card) {
      var p = PRODUCTS[card.getAttribute("data-product")];
      var visual = card.querySelector(".card-visual");
      if (!p || !visual) return;
      var box = document.createElement("div");
      box.className = "card-meters";
      visual.appendChild(box);
      fillMeters(box, p);
    });
  }

  /* --------------------------------------------------------------------------
     6. Cinematic hero — scroll push-in
     -------------------------------------------------------------------------- */
  function initHeroScroll() {
    var hero = document.querySelector(".hero-dark");
    if (!hero) return;
    var big = hero.querySelector(".hero-big");
    var tile = hero.querySelector(".hero-tile");
    if (!big || !tile) return;
    var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    var ticking = false;
    function update() {
      var y = window.scrollY || window.pageYOffset || 0;
      var h = window.innerHeight || 1;
      var p = Math.min(1, y / h);
      big.style.transform = "translate3d(0," + (-y * 0.1) + "px,0)";
      big.style.opacity = String(Math.max(0, 1 - p));
      tile.style.transform = "translate3d(0," + (-y * 0.02) + "px,0) scale(" + (1 + p * 0.1) + ")";
      ticking = false;
    }
    window.addEventListener("scroll", function () {
      if (!ticking) { window.requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
  }

  /* --------------------------------------------------------------------------
     7. Scroll-driven lineup
     -------------------------------------------------------------------------- */
  function initLineup() {
    var section = document.getElementById("lineup");
    if (!section) return;
    var imgs = section.querySelectorAll(".lineup-img");
    var nameEl = document.getElementById("lineup-name");
    var yearEl = document.getElementById("lineup-year");
    var tagEl = document.getElementById("lineup-tag");
    var countEl = document.getElementById("lineup-count");
    if (!imgs.length || !nameEl) return;

    var DATA = [
      { name: "Coca-Cola", year: "Since 1886", tag: "The original spark." },
      { name: "Sprite", year: "Since 1961", tag: "Crisp lemon-lime clarity." },
      { name: "Fanta", year: "Since 1940", tag: "Bright, juicy orange." },
      { name: "Minute Maid", year: "Since 1945", tag: "Real orange, real pulp." },
      { name: "Coca-Cola Cherry", year: "Since 1985", tag: "Cola with a cherry twist." }
    ];

    var current = -1;
    var ticking = false;

    function setActive(i) {
      if (i === current) return;
      current = i;
      imgs.forEach(function (img, idx) {
        img.classList.toggle("is-active", idx === i);
      });
      var d = DATA[i];
      nameEl.textContent = d.name;
      yearEl.textContent = d.year;
      tagEl.textContent = d.tag;
      if (countEl) {
        countEl.textContent = String(i + 1).padStart(2, "0") + " / " + String(DATA.length).padStart(2, "0");
      }
    }

    function update() {
      var rect = section.getBoundingClientRect();
      var h = section.offsetHeight - window.innerHeight;
      var progress = h > 0 ? (-rect.top) / h : 0;
      progress = Math.max(0, Math.min(1, progress));
      var idx = Math.min(DATA.length - 1, Math.floor(progress * DATA.length));
      setActive(idx);
      ticking = false;
    }

    window.addEventListener("scroll", function () {
      if (!ticking) { window.requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
    update();
  }

  /* --------------------------------------------------------------------------
     8. Nav theme over dark sections + product close-up
     -------------------------------------------------------------------------- */
  function initNavTheme() {
    var nav = document.querySelector(".nav");
    if (!nav) return;
    var darks = document.querySelectorAll(".hero-dark, .lineup");
    if (!darks.length) return;

    var ticking = false;
    function update() {
      var band = nav.offsetHeight;
      var dark = false;
      darks.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.top <= band && r.bottom > 0) dark = true;
      });
      nav.classList.toggle("nav--dark", dark);
      ticking = false;
    }
    window.addEventListener("scroll", function () {
      if (!ticking) { window.requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
    window.addEventListener("resize", update);
    update();
  }

  function initCloseup() {
    var el = document.getElementById("closeup-meters");
    if (!el) return;
    fillMeters(el, PRODUCTS["coke"]);
  }

  /* --------------------------------------------------------------------------
     Boot
     -------------------------------------------------------------------------- */
  document.addEventListener("DOMContentLoaded", function () {
    initNav();
    initFade();
    initDialog();
    initQuiz();
    initReveal();
    initCardMeters();
    initHeroScroll();
    initLineup();
    initNavTheme();
    initCloseup();
  });
})();
