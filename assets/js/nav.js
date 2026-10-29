/* ============================================================================
   English Scenes — nav.js
   ----------------------------------------------------------------------------
   Builds the minimal top navigation on every page (written once, injected
   everywhere). Plain DOM APIs, no libraries.
   ============================================================================ */

(function () {
  "use strict";

  var NAV = [
    { href: "index.html",     label: "Home"          },
    { href: "airport.html",   label: "Airport"       },
    { href: "cafe.html",      label: "Café"          },
    { href: "campus.html",    label: "Campus"        },
    { href: "collection.html", label: "My Collection" }
  ];

  var currentPage = (location.pathname.split("/").pop() || "index.html").toLowerCase();

  function buildHeader() {
    var header = document.getElementById("site-header");
    if (!header) return;

    var brand = document.createElement("a");
    brand.className = "brand";
    brand.href = "index.html";
    brand.textContent = "English Scenes";

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
    inner.className = "container";
    inner.innerHTML =
      "<span>English Scenes · CEFR B1 situational English</span>" +
      "<span>Built with HTML, CSS and vanilla JavaScript</span>";
    footer.appendChild(inner);
  }

  document.addEventListener("DOMContentLoaded", function () {
    buildHeader();
    buildFooter();
  });
})();
