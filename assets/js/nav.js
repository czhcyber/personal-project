/* ============================================================================
   Football Tactics Board — nav.js
   ----------------------------------------------------------------------------
   Shared across every page:
     1. Builds the header/navigation and footer (DRY: written once here).
     2. Adds a subtle scroll-reveal effect.
   No frameworks — plain DOM APIs only.
   ============================================================================ */

(function () {
  "use strict";

  // Flag that JS is running — enables scroll-reveal only when JS is available.
  document.documentElement.classList.add("js");

  /* --------------------------------------------------------------------------
     1. Navigation & footer
     -------------------------------------------------------------------------- */
  var NAV = [
    { href: "index.html",      label: "Home"           },
    { href: "board.html",      label: "Tactics Board"  },
    { href: "formations.html", label: "Formations"     },
    { href: "glossary.html",   label: "Glossary"       }
  ];

  var currentPage = (location.pathname.split("/").pop() || "index.html").toLowerCase();

  function buildHeader() {
    var header = document.getElementById("site-header");
    if (!header) return;

    var brand = document.createElement("a");
    brand.className = "brand";
    brand.href = "index.html";
    brand.innerHTML =
      '<span class="brand-mark" aria-hidden="true">⚽</span>' +
      "<span>Tactics Board</span>";

    var toggle = document.createElement("button");
    toggle.className = "nav-toggle";
    toggle.type = "button";
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-controls", "site-nav");
    toggle.setAttribute("aria-label", "Toggle menu");
    toggle.innerHTML = '<span aria-hidden="true">☰</span>';

    var nav = document.createElement("nav");
    nav.className = "site-nav";
    nav.id = "site-nav";
    nav.setAttribute("aria-label", "Main navigation");

    var ul = document.createElement("ul");
    NAV.forEach(function (item) {
      var li = document.createElement("li");
      var a = document.createElement("a");
      a.href = item.href;
      a.textContent = item.label;
      if (item.href.toLowerCase() === currentPage) a.setAttribute("aria-current", "page");
      li.appendChild(a);
      ul.appendChild(li);
    });
    nav.appendChild(ul);

    var inner = document.createElement("div");
    inner.className = "container header-inner";
    inner.appendChild(brand);
    inner.appendChild(toggle);
    inner.appendChild(nav);
    header.appendChild(inner);

    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  function buildFooter() {
    var footer = document.getElementById("site-footer");
    if (!footer) return;

    var inner = document.createElement("div");
    inner.className = "container footer-inner";

    var about = document.createElement("div");
    about.innerHTML =
      "<h2>Football Tactics Board</h2>" +
      "<p>Drag players onto the pitch, arrange a formation and draw the moves — " +
      "a simple tactics board built with HTML, CSS and vanilla JavaScript.</p>";
    inner.appendChild(about);

    var pages = document.createElement("div");
    var h2 = document.createElement("h2");
    h2.textContent = "Pages";
    var ul = document.createElement("ul");
    NAV.forEach(function (item) {
      var li = document.createElement("li");
      var a = document.createElement("a");
      a.href = item.href;
      a.textContent = item.label;
      li.appendChild(a);
      ul.appendChild(li);
    });
    pages.appendChild(h2);
    pages.appendChild(ul);
    inner.appendChild(pages);

    footer.appendChild(inner);

    var bottom = document.createElement("div");
    bottom.className = "container footer-bottom";
    bottom.textContent = "Built by hand with semantic HTML, CSS and vanilla JavaScript · ";
    var year = document.createElement("span");
    year.textContent = new Date().getFullYear();
    bottom.appendChild(year);
    footer.appendChild(bottom);
  }

  /* --------------------------------------------------------------------------
     2. Scroll reveal
     -------------------------------------------------------------------------- */
  function initScrollReveal() {
    var els = document.querySelectorAll(".reveal");
    if (!els.length) return;
    if (!("IntersectionObserver" in window)) {
      els.forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    els.forEach(function (el) { io.observe(el); });
  }

  /* --------------------------------------------------------------------------
     3. Boot
     -------------------------------------------------------------------------- */
  document.addEventListener("DOMContentLoaded", function () {
    buildHeader();
    buildFooter();
    initScrollReveal();
  });
})();
