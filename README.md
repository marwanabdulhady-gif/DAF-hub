# DAF Hub · Dar Al Fikr Grade 4 Mathematics

The Learning Hub for the Dar Al Fikr Grade 4 mathematics year (enVision 2024, 2026–2027): every lesson, the Wadi al-Amanah story map, pacing, classroom games, the 16 gates, and printable Stage 6 portfolios. It is all in one static site with no build step.

## What's inside

| Path | What it is |
|---|---|
| `index.html` | The hub app shell (hash routes such as `#/lessons` and `#/lesson/1-1`) |
| `assets/css/hub.css` | Design system: brand cyan and teal, gold accent, light and dark themes, A5 print styles |
| `assets/js/hub.js` | The app: router, views, games, the <kbd>Ctrl</kbd>/<kbd>⌘</kbd>+<kbd>K</kbd> search palette |
| `data/curriculum.json` | The curriculum index: lessons, gates, weeks and decks |
| `lessons/*.md` | Full lesson specifications, rendered inside the hub |
| `docs/*.md` | Pacing notes and the Wadi Activity Atlas |
| `slides/*.html` | Projector decks: the Wadi map, Experiences, Production, Period Hive, Night Zero and Door 6-2 |
| `studio/` | Activity Studio, which builds matching, sorting and quiz games and exports them as standalone HTML |

Progress (sealed doors, pebbles, the roster and portfolio notes) is saved in the browser's `localStorage`. The hub and the slide decks share the `daf.sijill.v1` ledger, so a door sealed on the full-screen map also shows as sealed in the hub. Use **Student Roster → Backup / Restore** to move data between devices.

## Run locally

```bash
python3 -m http.server 4173
# open http://localhost:4173
```

You need any static file server, because the hub fetches `data/curriculum.json` and the lesson files over HTTP.

## Deploy to Vercel

1. Import this repository in Vercel.
2. Keep the defaults. The framework preset is **Other**, with no build command and no output directory, because the site is served from the repository root.
3. Deploy.

`vercel.json` only adds security headers, caching for images, and a Markdown content type for the lesson files. A custom `404.html` handles unknown URLs.

## Updating the curriculum

To add a lesson specification, drop the Markdown file into `lessons/` and point that lesson's `path` in `data/curriculum.json` at it (`"path": "lessons/<file>.md"`). Then set `"spec": true` for that lesson. Lessons without a spec still show their summary card.
