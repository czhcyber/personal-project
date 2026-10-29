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

  /* --------------------------------------------------------------------------
     1. Mobile navigation
     -------------------------------------------------------------------------- */
  function initNav() {
    var toggle = document.getElementById("nav-toggle");
    var menu = document.getElementById("nav-menu");
    if (!toggle || !menu) return;
    toggle.addEventListener("click", function () {
      var open = menu.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
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
      dlgMeters.innerHTML = "";
      (p.meter || []).forEach(function (m) {
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
        dlgMeters.appendChild(row);
        requestAnimationFrame(function () {
          fill.style.width = (m.value / 5 * 100) + "%";
        });
      });

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

    var step = 0;

    function renderStep(key) {
      var node = FLOW[key];
      if (!node) return;
      step += 1;
      resultEl.hidden = true;
      optionsEl.hidden = false;
      questionEl.hidden = false;
      progressEl.textContent = "Question " + step;
      questionEl.textContent = node.text;
      optionsEl.innerHTML = "";

      node.options.forEach(function (opt) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "quiz-option";
        b.textContent = opt.label;
        b.addEventListener("click", function () {
          if (opt.result) renderResult(opt.result);
          else renderStep(opt.next);
        });
        optionsEl.appendChild(b);
      });
    }

    function renderResult(id) {
      var p = PRODUCTS[id];
      if (!p) return;
      questionEl.hidden = true;
      optionsEl.hidden = true;
      progressEl.textContent = "Your match";
      resultEl.hidden = false;
      resultEl.innerHTML =
        "<div class='quiz-result-visual'>" +
          "<img class='p-img' src='" + p.img + "' alt='" + p.name + "'>" +
        "</div>" +
        "<p class='quiz-result-name'>" + p.name + (p.zh ? " <span class='card-zh'>" + p.zh + "</span>" : "") + "</p>" +
        "<p class='quiz-result-tag'>" + p.tagline + "</p>" +
        "<div class='quiz-actions'>" +
          "<button class='btn btn-ghost' type='button' data-restart>Start over</button>" +
          "<a class='btn btn-primary' href='products.html'>Browse all drinks</a>" +
        "</div>";
      resultEl.querySelector("[data-restart]").addEventListener("click", function () {
        step = 0;
        renderStep("start");
      });
    }

    renderStep("start");
  }

  /* --------------------------------------------------------------------------
     Boot
     -------------------------------------------------------------------------- */
  document.addEventListener("DOMContentLoaded", function () {
    initNav();
    initFade();
    initDialog();
    initQuiz();
  });
})();
