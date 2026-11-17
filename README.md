# मराठी शब्दकोडे — Marathi Crossword

A daily Marathi crossword for Android phones, served as static files from GitHub Pages. See [SPEC.md](SPEC.md).

The app is plain HTML, CSS and JavaScript with no build step. The tools are Python 3 (standard library only).

## Run locally

```bash
python3 tools/serve.py 8000
```

Open http://localhost:8000. For the phone layout, use your browser's device mode.

## Making puzzles

1. **Edit the word list** in [content/words.csv](content/words.csv). You can open it in Excel, Numbers or Google Sheets and save it back as CSV (UTF-8).

   | column | meaning |
   |---|---|
   | `word` | the answer, 2–7 aksharas, no spaces |
   | `clue` | must not contain the answer |
   | `difficulty` | 1 easy, 2 medium, 3 hard |
   | `tags` | `;`-separated, e.g. `निसर्ग;झाडे` (themes are picked from these) |
   | `reviewed` | put `yes` once a fluent speaker has checked the word and clue |

2. **Generate puzzles:**
   ```bash
   python3 tools/generate.py --days 7
   ```
   This makes the 7 days after the last puzzle. Monday to Saturday get a small themed puzzle (15–30 words); Sunday gets a large one (60–100 words). Other examples:
   ```bash
   python3 tools/generate.py --from 2026-12-01 --days 30
   ```
   ```bash
   python3 tools/generate.py --from 2026-11-20 --days 1 --force
   ```
   The last one redoes a single day. Use `--seed N` for repeatable output. A word isn't reused within `--gap` days (default 7).

3. **Check them:**
   ```bash
   python3 tools/validate.py
   ```

Players only see puzzles dated today or earlier. Answers in the puzzle files are lightly obfuscated, so they aren't readable at a glance.

## Offline and installing

The app is a PWA. `sw.js` keeps every file it fetches so puzzles work without internet, and Chrome on Android offers **Install app**. When you add or remove an app file, list it in `SHELL` in `sw.js` and bump `VERSION`; a test checks the list. The app icons are drawn by `tools/make-icons.html`.

## Tests

```bash
python3 -m unittest discover -s tools
```

This runs the Python tests: akshara splitting, encoding, the validator, the generator and every published puzzle. For the app's JS, run the dev server and open http://localhost:8000/test/. Both splitters (JS and Python) are checked against the same cases in `test/akshara-cases.json`.

## Layout

| Path | What |
|---|---|
| `index.html`, `css/`, `js/` | the app |
| `js/akshara.js` | splits Marathi text into aksharas (one per square); its Python twin is `tools/akshara.py` |
| `js/input.js` | typing rules for the in-app keyboard |
| `js/i18n.js`, `js/help.js` | Marathi/English UI text and the how-to-play page |
| `sw.js`, `manifest.webmanifest`, `icons/` | offline support and install |
| `content/words.csv` | source word and clue list |
| `puzzles/index.json` | list of daily puzzles |
| `puzzles/<date>.json` | one puzzle |
| `tools/generate.py` | builds puzzles from the word list |
| `tools/puzzlelib.py` | answer encoding and validation rules, mirrored by `tools/validate-lib.js` for the browser |
