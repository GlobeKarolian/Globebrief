# Globe Brief (static web)

Fully static version of Globe Brief. Upload this folder to GitHub and enable **GitHub Pages**.

## Quick Start (GitHub Pages)
1. Create a new repo, e.g. `globe-brief`.
2. Upload these files (keep the folders as-is).
3. In the repo: **Settings → Pages → Build and deployment**:
   - Source: **Deploy from a branch**
   - Branch: **main** (or whatever you push to), **/ (root)**
4. Visit the Pages URL when it appears (usually `https://<your-username>.github.io/<repo-name>/`).

## Local preview (optional)
Just open `index.html` in a static server (file URL may block `fetch(...)`).
- Python 3: `python3 -m http.server 9000` then open http://localhost:9000

## Customize
- Edit `SampleFeed/feed.json` to change the stories.
- All logic is in `app.js`, styles in `styles.css`.
