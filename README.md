# Football Tactics Board

A simple, interactive football tactics board built with plain HTML, CSS and
vanilla JavaScript — no frameworks, no build step.

## What it does

- Drag players on a football pitch (two teams of eleven)
- Draw arrows between players to show passes and runs
- Load classic formations (4-3-3, 4-4-2, 3-5-2, 4-2-3-1)
- Change a player's number, and erase arrows
- Save the board in the browser (localStorage)

## Pages

| File             | What                            |
|------------------|---------------------------------|
| `index.html`     | Home                            |
| `board.html`     | The interactive tactics board   |
| `formations.html`| Classic formations              |
| `glossary.html`  | Positions and tactical terms    |

## Run it

There is no build step. Open `index.html` in a browser, or serve the folder:

```bash
python -m http.server
```

## Requirements

- Four pages with working navigation
- Semantic HTML and a responsive, mobile-first layout
- Interactivity: drag players, draw arrows, save/load
- Identity: favicon, app icon and an Open Graph image
