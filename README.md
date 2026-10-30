# Refreshments

A concept showcase of The Coca-Cola Company's classic drinks — Coca-Cola, Sprite, Fanta,
Minute Maid and Coca-Cola Cherry — reimagined in a cinematic, high-contrast design language.
Built with plain HTML, CSS and vanilla JavaScript, plus one small animation library (GSAP) for the scroll effects; no frameworks, no build step, no backend.

> Student project · Not affiliated with The Coca-Cola Company. Product names belong to their
> respective owners. Product imagery is a set of AI-generated concept renders made for this study.

**Features:**

- 🥤 Five classic drinks, each with a detail panel, flavour meters and a "find your drink" quiz
- 🎬 Cinematic black hero with enormous type and a scroll push-in
- 📜 Scroll-driven product lineup (sticky stage, five products crossfade on scroll)
- 🌗 Adaptive navigation that turns dark over dark sections and light over light ones
- 🖱️ Hover quick-look — flavour meters fade in over each product card
- 🔴 A single accent (Coca-Cola red `#E60012`) on a monochrome base
- 📱 Fully responsive, from a 375 px phone to a wide desktop
- ♿ Semantic HTML, keyboard focus rings, `prefers-reduced-motion` and themed browser surfaces

---

## Live site

| | |
|---|---|
| **Address** | https://czhcyber.github.io/personal-project/ |
| **Host** | GitHub Pages, served from the `main` branch (root folder) |
| **Cost** | Free |

---

## The main pages

| File | Purpose |
|---|---|
| `index.html` | Home — cinematic hero, manifesto band, scroll lineup, product close-up, featured cards |
| `products.html` | The collection — five product cards with a detail dialog and flavour meters |
| `about.html` | The story — the idea, the collection strip, a short timeline, how it was built |
| `quiz.html` | Find your drink — a three-question interactive selector |

Every page shares the same header, the full-screen menu and the footer, so all four pages
link to each other in both directions.

---

## The drinks

| Drink | Page | Since |
|---|---|---|
| Coca-Cola | `products.html` | 1886 |
| Sprite | `products.html` | 1961 |
| Fanta | `products.html` | 1940 |
| Minute Maid | `products.html` | 1945 |
| Coca-Cola Cherry | `products.html` | 1985 |

---

## Files

```
.
├── Main pages
│   ├── index.html              Home (hero, manifesto, lineup, close-up, featured)
│   ├── products.html           The collection + detail dialog
│   ├── about.html              Story, timeline, how it was built
│   └── quiz.html               Find your drink
│
├── Configuration
│   ├── .nojekyll               Tells GitHub Pages to serve files as-is
│   ├── .gitignore
│   └── README.md               This file
│
└── assets
    ├── css
    │   └── style.css           Tokens, type scale, components, responsive layer
    ├── js
    │   └── app.js              Menu, dialog, quiz, scroll effects, meters
    └── img
        ├── favicon.svg                     Browser tab icon (vector)
        ├── favicon-32.png                  Browser tab icon (32×32 raster fallback)
        ├── apple-touch-icon.png            iOS icon (180×180)
        ├── og-image.png                    Open Graph share preview (1200×630)
        └── products
            ├── coke.jpg                    Coca-Cola concept render (900×900)
            ├── sprite.jpg                  Sprite concept render (384×384)
            ├── fanta.jpg                   Fanta concept render (900×900)
            ├── minute-maid.jpg             Minute Maid concept render (384×384)
            └── cherry.jpg                  Coca-Cola Cherry concept render (900×900)
```

---

## Running it locally

There is nothing to install and nothing to compile. Because the pages use no absolute
paths, you can simply open `index.html` in a browser.

To serve it over HTTP instead (closer to how it behaves when deployed):

```bash
python -m http.server 8899
```

Then open <http://127.0.0.1:8899/>.

---

## How the project requirements are met

### Pages — four pages with working navigation

`index.html`, `products.html`, `about.html` and `quiz.html` are all reachable from the
full-screen menu on every page, and each page links back to the others through the footer.
The current page is marked with `aria-current="page"`.

### Content — own words, own imagery, properly sourced

All body copy was written for this project. The product imagery is a set of concept renders
generated for this study. The five drinks and their names belong to The Coca-Cola Company;
this site is an unaffiliated student project, declared in the footer of every page.

### Structure — semantic HTML

The pages are built from `<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<aside>`,
`<footer>`, `<dialog>`, `<ul>`, `<ol>`, and a native `<dialog>` for the product panel.
Heading levels are strictly `h1` → `h2` → `h3`, with exactly one `h1` per page. Every
`<section>` has an accessible name via `aria-labelledby`, every `<img>` has an `alt`, and
the interactive cards are focusable buttons with `aria-haspopup="dialog"`.

### Layout — responsive, works on a phone

- `<meta name="viewport" content="width=device-width, initial-scale=1">` on every page.
- Fluid type with `clamp()` and a six-step type scale (12 / 14 / 17 / 20 / 34 / 56).
- Breakpoints at **900 px**, **719 px** and **480 px**; the grids collapse to one column.
- `overflow-x: hidden` and `object-fit: contain` so no product image can force a sideways scroll.
- The scroll lineup switches to a single column under 719 px.

### Behaviour — one thing that responds to the user

| Interaction | Where |
|---|---|
| Full-screen menu overlay (open, `Esc`, close) | Every page |
| Product detail dialog with animated flavour meters | `products.html`, `index.html` |
| "Find your drink" quiz with a progress bar, back button and result | `quiz.html` |
| Hover quick-look — flavour meters fade in over each card | `products.html`, `index.html` |
| Scroll-driven lineup (five products crossfade) | `index.html` |
| Cinematic hero push-in on scroll | `index.html` |
| Adaptive navigation (dark over dark sections) | Every page |

Everything degrades gracefully: with JavaScript switched off the pages are still readable
and navigable; only the animated and interactive enhancements are disabled. All motion
respects `prefers-reduced-motion`.

### Live — deployed online

Hosted with GitHub Pages. See *Deployed* below.

### History — Git history showing growth

The project was committed in stages, from a single-page sketch to the current four-page site:

1. Initial setup: `.gitignore`, `.nojekyll`, README
2. First pages and the dark Apple-style layout
3. Situation pages, then the pivot to the beverage concept
4. Product photography: watermarks removed, images compressed and imported
5. Design pass: type scale, colour, spacing, anti-slop cleanup
6. Menu: full-screen overlay, adaptive dark navigation
7. Interactions: quiz progress, back button, flavour meters, page transitions
8. Cinematic direction: black hero, scroll lineup, red manifesto, product close-up
9. Documentation: this README

### Identity — favicon, app icon, Open Graph image

- **Favicon** — `favicon.svg` (vector), with `favicon-32.png` as a raster fallback.
- **App icon** — `apple-touch-icon.png` (180 × 180) for iOS.
- **Open Graph image** — `og-image.png`, exactly **1200 × 630 px**, declared on every page
  alongside `twitter:card`.

---

## Image credits

Every image in this project is original or generated specifically for it.

| Image | How it was made |
|---|---|
| `products/*.jpg` | AI-generated concept renders of the five drinks, background cleaned and resized |
| `favicon.svg`, `apple-touch-icon.png`, `favicon-32.png` | Drawn for this project |
| `og-image.png` | Composed for this project |

No stock photography or third-party assets are used. Typefaces are the operating system's
own (SF Pro / Segoe UI / PingFang SC), so no web fonts are downloaded either.

---

## Tech stack & design decisions

**No frameworks, no build tools — pure HTML, CSS and JavaScript, plus one small library (GSAP + ScrollTrigger) for the home page's scroll effects.**

| Technology | Usage |
|---|---|
| **HTML5** | Semantic markup, `<dialog>`, accessibility, native form controls |
| **CSS3** | Custom properties, Grid, Flexbox, `clip-path`, `backdrop-filter`, scroll styling |
| **JavaScript (ES6+)** | DOM manipulation, `IntersectionObserver`, scroll-driven effects, event handling |
| **GSAP + ScrollTrigger** | Self-hosted (v3.12.5); scrubbed hero push-in, scroll-driven lineup and section reveals |

**Design direction:** a cinematic black hero and a scroll-driven lineup at the top, then a
light Apple-style body for the collection and the story. One accent (Coca-Cola red
`#E60012`) on a monochrome base, enormous display type, and motion that is used once per
moment rather than everywhere.

**Performance:** no external network calls (GSAP is self-hosted), no web fonts, lazy-loaded product images, and
`prefers-reduced-motion` support. The page paints immediately even on a slow connection.

**Accessibility:** semantic structure, visible focus rings, a skip-friendly reading order,
labelled sections, `alt` text on every image, and a quiz that is fully keyboard-operable.

---

## Deployed

The site is live at:

```
https://czhcyber.github.io/personal-project/
```

It is hosted on GitHub Pages from the `main` branch (root folder). To redeploy, push to
`main` — GitHub Pages rebuilds automatically within a couple of minutes.

To check that the Open Graph card is correct, paste the live URL into any Open Graph
preview tool (or a chat app) — it should show the 1200 × 630 card.

---

## Project checklist

### Before deploying

- [ ] Confirm GitHub Pages is enabled: **Settings → Pages → Deploy from a branch → `main` → `/`**
- [ ] Verify the live address opens (it should not 404)
- [ ] Check the Open Graph card in a preview tool
- [ ] Test every page at 375 px and ~1440 px

### Quality checks

- [x] Four pages with working navigation between them
- [x] Semantic HTML, one `h1` per page, labelled sections
- [x] Responsive layout, no horizontal scroll
- [x] At least one interaction (a menu, a dialog, a quiz, a scroll demo)
- [x] Favicon, app icon and Open Graph image
- [ ] Git history shows week-by-week growth (keep committing)
- [ ] Review the copy and imagery, and be ready to defend the brand choices

---

## License

This project is a student concept study. The code is free to read and learn from; the
product names and brand identity belong to The Coca-Cola Company. Not affiliated with,
endorsed by, or sponsored by The Coca-Cola Company.
