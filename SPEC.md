# मराठी शब्दकोडे — Marathi Crossword (Spec, draft v0.1)

Status: **All four milestones are done.** Live at https://ajinkya-vaze.github.io/marathi-crossword/ and tested on a real Android phone (Chrome): both keyboards, back button, install, offline play and share. Puzzles are generated through 2026-12-23. Added since: a Submit button, lenient checking for small spelling slips (§5, game features), a More puzzles screen with 216 extra puzzles by theme (§5, screens), and 3 hints per puzzle (§5, game features). Still open: the word list (1,888 words in 12 themes, grown from 573 on 2026-11-17) is an unreviewed Claude draft. The tools are written in Python rather than Node, because Node isn't installed on this machine.

Decided so far: one square = one akshara · Claude drafts words and clues, you review · custom keyboard plus an optional system keyboard · daily puzzle with an archive.

## 1. Goal

A crossword game in Marathi, played in the browser on Android phones, hosted for free on GitHub Pages. No server, no login. It can be installed to the home screen and played offline.

## 2. Hard constraints (from you)

| Constraint | Value |
|---|---|
| Language | Marathi (Devanagari script) for all answers and clues |
| Max word length | 7 "letters" (see §3 for what one letter means) |
| Max words per crossword | 100 |
| Platform | Android phone browser (Chrome first) |
| Hosting | GitHub Pages (static files only) |

## 3. The key design decision: what goes in one square?

Marathi is written in aksharas (syllable units), not single letters. The word **महाराष्ट्र** has 10 Unicode characters but 4 aksharas: म · हा · रा · ष्ट्र.

**Proposed: one square = one akshara.** This is how printed Marathi crosswords (for example in newspapers) usually work.

- A square holds a full akshara: a consonant with its vowel sign (कि, मो), a conjunct (क्ष, ज्ञ, ष्ट्र, त्र), and anusvara or chandrabindu (कं, माँ).
- "7 letters max" means **7 aksharas max** per word.
- Crossing squares must match exactly. If an across word has **कि** in a square, the down word must also have **कि** there. **क** does not count as a match.

Other options (not recommended):
- *One square = one Unicode character.* This splits कि into क + ि, which looks broken and no Marathi player would expect it.
- *Match only the base consonant at crossings.* This is easier to build puzzles for but makes solving confusing.

## 4. Puzzle format and size

- **Freeform (British-style) layout**: words cross where they share an akshara, and there are many black squares. An American-style dense grid (every square crossed both ways) is close to impossible to build in Marathi with akshara squares.
- The grid size comes from the words. Expect about 9×9 for 20 words and up to about 21×21 for 100 words.
- Words per puzzle can be anything from 1 to 100 (100 is the upper limit, not a target). Proposed daily schedule: **Monday–Saturday "small" (15–30 words)**, **Sunday "large" (60–100 words)**.
- Clue numbering follows standard rules (left to right, top to bottom). Numbers use Devanagari digits (१, २, ३…) by default.

## 5. Player experience (mobile-first)

### Screens
1. **Home / आजचे कोडे**: today's puzzle front and centre, picked by the phone's local date. Below it is the **archive (जुनी कोडी)**: past dates with their status (not started, in progress, or solved) and a solving streak counter. Future puzzles are not listed. If no puzzle exists for today, the most recent one is shown.
2. **Play screen**:
   - The grid fills the top of the screen. Large grids (more than about 13 columns) support pinch-zoom and drag, and the view auto-scrolls to keep the active word visible.
   - A **clue bar** above the keyboard shows the current clue, for example "५ आडवे: महाराष्ट्राची राजधानी (४)". Tap it to see all clues.
   - A **custom in-app Marathi keyboard** (see below).
   - Tap a square to select it. Tap the same square again to switch between across (आडवे) and down (उभे).
3. **More puzzles (आणखी कोडी)**: opened from a card on the home screen. Filter by theme (12 themes) and size (small or large), tap **Play any puzzle** for a random unplayed one, or pick from the list with its status. These puzzles are undated (ids `x-<theme>-NN`, files in `puzzles/extra/`), always available, don't count toward the daily streak, and share a direct link instead of a date. They are generated with `generate.py --extra`.
4. **All clues**: a bottom sheet with two tabs, आडवे and उभे. Tapping a clue jumps to that word.
5. **Help (कसे खेळावे)**: short how-to-play page.

### Input: custom keyboard by default, system keyboard optional
A ⌨️ toggle on the play screen switches between the two. The choice is remembered.

**System keyboard mode** (Gboard etc. with a Marathi layout): a hidden text field captures what is typed. Text is split into aksharas, and each akshara fills the next square. Backspace clears the current square. This mode is best-effort, because Android keyboards send input in inconsistent ways.

**Custom on-screen keyboard (default):** this works without installing anything.
- Rows of **स्वर** (अ आ इ ई उ ऊ ए ऐ ओ औ अं अः ऋ) and **व्यंजन** (क ख ग … क्ष ज्ञ ळ).
- A row of **मात्रा** (ा ि ी ु ू े ै ो ौ ं ँ ः ृ) and **्** (halant) for building conjuncts.
- Typing rules:
  - A consonant or vowel **starts a new square**, unless the current square ends with a halant (्). In that case it joins to form a conjunct, so क + ् + ष gives क्ष in one square.
  - A matra changes the current square: क + ि gives कि.
  - ⌫ removes the last part of the current square (कि → क → empty), then moves back to the previous square.
  - A **"पुढे →"** key moves to the next square without typing.
- Optional "frequent conjuncts" key: क्ष, त्र, ज्ञ, श्र, द्ध, स्त, न्त, etc.

### Game features
- **Submit (सबमिट)**: a button in the top bar. While squares are empty it is greyed out and shows how many are filled (for example १८/२४). Once every square is filled it lights up. Filling the grid does not judge it; only Submit does. If everything is right, the completion screen opens. If not, the wrong squares turn red and a message says how many; changing a square clears its red, and the player can submit again. Revealing the whole puzzle finishes it straight away.
- **Small slips count (किरकोळ चूक)**: a square that differs from the answer only by a common spelling slip counts as right but gets a yellow bar along its bottom. The slips are: short or long इ/उ, anusvara, chandrabindu, visarga or nukta, ॅ/ॉ vs े/ो, श/ष/स and न/ण. Other differences (ल/ळ, ा/े, a missing half-letter) stay wrong. On a successful Submit those squares switch to the correct spelling, keep the yellow bar, and the completion screen says how many there were. Check marks them yellow too. The rule is `isCloseEnough` in `js/akshara.js`.
- **Hints (इशारा 💡)**: a 💡 button at the right of the clue bar shows how many hints are left (3 per puzzle, daily or extra). A hint fills the selected square with the right akshara, locks it, marks it with a violet corner and moves to the next open square in the word. It costs nothing on a square that is already right or locked; at 0 the button greys out and a message points to Reveal. Hints don't count as "with help"; the completion screen says how many were used and the share text adds 💡N. Restart gives them back.
- **Check (तपासा)**: check a square, a word, or the whole puzzle. Wrong squares turn red.
- **Reveal (उत्तर दाखवा)**: reveal a square, a word, or the whole puzzle. Revealed squares are marked.
- **Timer**: can be paused.
- **Auto-save**: progress is saved in the browser (localStorage) after every input.
- **Completion screen** with the time taken and a "शेअर करा" button that shares text only, no answers.
- **Offline / installable** as a PWA ("Add to Home screen" on Android).
- **Light and dark themes** that follow the phone setting.

### UI language
The app's menus and buttons are in Marathi, with an optional English toggle.

## 6. Content: where puzzles come from

This is the second big decision (see the open questions). Proposed pipeline:

1. **Word list** (`content/words.csv`): `word, clue, difficulty, tags`, written or reviewed by a fluent Marathi speaker.
2. **Generator script** (`tools/generate.py`, run on your laptop with Python 3):
   - Splits each word into aksharas and drops words longer than 7 aksharas.
   - Places words on a freeform grid automatically, aiming for a compact grid with many crossings.
   - Writes `puzzles/<YYYY-MM-DD>.json` and updates `puzzles/index.json`.
   - **Batch mode**: `generate --from 2026-12-01 --days 30` makes a month of daily puzzles at once. It follows the small and large schedule and does not reuse a word within a set window (for example 60 days).
3. **Validator** (`tools/validate.py`, with a JS twin used by the browser test page): checks that there are ≤100 words, every word is ≤7 aksharas, crossings agree, every entry has a clue, and the numbering is correct. It runs before every commit or deploy.
4. You can also **hand-edit or hand-build** a puzzle JSON for curated puzzles.

Claude can draft a starter word and clue list, but **a native speaker must review it** before it is published. Clue quality is what makes a crossword good.

### Puzzle file format (draft)
```json
{
  "id": "2026-11-17",
  "title": "दैनिक कोडे — १७ नोव्हेंबर",
  "difficulty": "सोपे",
  "rows": 11, "cols": 11,
  "entries": [
    { "num": 1, "dir": "across", "row": 0, "col": 2,
      "cells": ["म","हा","रा","ष्ट्र"], "clue": "आपले राज्य" },
    { "num": 2, "dir": "down", "row": 0, "col": 2,
      "cells": ["म","रा","ठी"], "clue": "आपली भाषा" }
  ]
}
```
Answers are stored pre-split into aksharas (`cells`), so the app never has to split text at runtime. Answers will be lightly obfuscated so they are not readable at a glance. Anyone who looks closely can still decode them. That is acceptable for a casual game with no server.

## 7. Technical design

- **Stack**: plain HTML, CSS and JavaScript (ES modules), with **no build step**. GitHub Pages serves the repository directly, which keeps maintenance minimal.
- **Rendering**: an HTML/CSS grid of square elements. This handles zoom, accessibility and Devanagari text shaping better than canvas.
- **Font**: the phone's built-in Devanagari font. Android ships Noto Sans Devanagari, so nothing is bundled and it works offline. This changed from the original plan to self-host the font, saving about 150KB. Squares auto-shrink the text for tall conjuncts like ष्ट्र.
- **Text handling**: all text is normalized to Unicode NFC. Comparison is exact string equality per square.
- **Storage**: localStorage, with a key per puzzle storing the filled squares, revealed squares, time and solved state.
- **PWA**: `manifest.webmanifest` and a service worker (`sw.js`). The worker is network-first, falling back to the cache when offline or when the network takes longer than 4s. It precaches the app shell, caches every puzzle that has been opened, and prefetches today's puzzle plus the next 3 days. Android's back button closes open sheets before it leaves the puzzle.
- **Tests**: Python `unittest` for the tools, and a browser test page (`/test/`) for the app's JS. Both akshara splitters run the same shared cases.
- **Deploy**: push to `main` and GitHub Pages publishes it. An optional GitHub Action runs the validator and tests on each push.

### Proposed repo layout
```
index.html            app shell
css/app.css
js/
  app.js              routing between screens
  grid.js             grid model, numbering, selection
  keyboard.js         Marathi on-screen keyboard and typing rules
  akshara.js          akshara splitting (shared with tools)
  storage.js          save/load progress
  sw.js               service worker
puzzles/
  index.json          list of puzzles
  <id>.json
content/words.csv     source word and clue list
tools/
  generate.py
  validate.py
  puzzlelib.py
  akshara.py
test/
manifest.webmanifest
fonts/
```

## 8. Non-goals (for v1)
- User accounts, leaderboards, multiplayer, or any backend.
- A native Android app (APK). It can be wrapped later as a TWA for the Play Store if wanted.
- Generating puzzles in the browser while playing. Puzzles are generated ahead of time.
- Cryptic-style clues.

## 9. Milestones
1. **M1 — Playable core**: grid rendering, selection, custom keyboard, check and reveal, auto-save, with 2–3 hand-made sample puzzles.
2. **M2 — Content pipeline**: akshara splitter, generator, validator, starter word list, 5–10 generated puzzles.
3. **M3 — Polish**: PWA and offline play, dark mode, completion screen and share, help page, English toggle.
4. **M4 — Publish**: GitHub repo, Pages setup, testing on a real Android phone.

## 10. Decisions

| # | Question | Decision |
|---|---|---|
| 1 | What one square holds | One akshara (max 7 per word) |
| 2 | Source of words and clues | Claude drafts, you review before publishing |
| 3 | Input method | Custom keyboard by default, system keyboard optional |
| 4 | Puzzle flow | Daily puzzle plus archive |
| 5 | Grid layout | *Proposed:* freeform, grid size based on word count |
| 6 | UI language | Marathi with an English toggle (clues and titles stay Marathi) |
| 7 | Daily size schedule | *Proposed:* small Monday–Saturday, large Sunday |
