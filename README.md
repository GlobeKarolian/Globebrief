# Globe Brief — Static Web

A no-build, fully static web version of Globe Brief. Upload to GitHub and publish with GitHub Pages.

## Features
- 🔥 **Streaks** — increments once per day on open (with confetti celebration)
- ⭕ **Progress ring** — shows minutes toward daily goal (default 10)
- ▶️ **Autoplay** — when a story completes, it advances to the next
- 🧠 **Topic mastery (scaffold)** — counts completions per topic and shows levels (Lv = 1 + floor(count/5))
- ✨ **Micro‑feedback** — subtle pulses and celebrations on completion

All state is kept in `localStorage`:
- `gb.lastOpen`, `gb.streak`
- `gb.minutesByDate` (map of ISO date => minutes)
- `gb.mastery` (map of topic => count)

## File layout
```
index.html
styles.css
app.js
SampleFeed/
  feed.json
```

## Hosting on GitHub Pages
1. Create a repo (e.g. `globe-brief`).
2. Upload these files to the repo root.
3. In **Settings → Pages → Build and deployment**, choose:
   - Source: **Deploy from a branch**
   - Branch: **main** (root `/`)
4. Visit `https://<your-username>.github.io/<repo-name>/` when ready.

## Local preview
Browsers block `fetch` on `file://`. Start a tiny server:
```bash
python3 -m http.server 9000
# open http://localhost:9000
```

## Customizing
- Change the daily goal via `dailyGoalMinutes` in `SampleFeed/feed.json`.
- Add real stories to `SampleFeed/feed.json` (or replace `FEED_PATH` in `app.js` with your API endpoint).
- Tweak brand look in `styles.css` (color variables at the top).

