"""Generate daily puzzles from content/words.csv.

Usage:
  python3 tools/generate.py --days 7                       # the 7 days after the last puzzle
  python3 tools/generate.py --from 2026-12-01 --days 30    # a month
  python3 tools/generate.py --from 2026-11-20 --days 1 --force   # redo one day

Options:
  --gap N     a word isn't reused within N days of another puzzle using it (default 7;
              relaxed automatically if the word list is too small)
  --seed N    make the output repeatable
  --words P   word list (default content/words.csv)

Schedule (SPEC §4): Monday–Saturday small puzzles (15–30 words) with a rotating theme,
Sunday a large puzzle (60–100 words).
"""
from __future__ import annotations

import argparse
import csv
import datetime as dt
import random
import sys
import time
import unicodedata
from collections import defaultdict

from akshara import split_aksharas
from puzzlelib import (
    MAX_AKSHARAS, PUZZLES, ROOT, INDEX,
    decode_puzzle, encode_cells, load_index, read_json, validate_puzzle, write_json,
)

WORDS_CSV = ROOT / "content" / "words.csv"

# (key, title shown in the app, tags that count as on-theme)
THEMES = [
    ("निसर्ग", "निसर्ग", {"निसर्ग", "झाडे"}),
    ("प्राणी", "प्राणी आणि पक्षी", {"प्राणी", "पक्षी"}),
    ("घर", "घर आणि कुटुंब", {"घर", "कुटुंब"}),
    ("खाद्य", "खाऊ आणि स्वयंपाकघर", {"खाद्य"}),
    ("महाराष्ट्र", "माझा महाराष्ट्र", {"महाराष्ट्र", "संत"}),
    ("सण", "सण, कला आणि परंपरा", {"सण", "कला", "देव"}),
    ("शाळा", "शाळा आणि खेळ", {"शाळा", "खेळ"}),
    ("माणूस", "माणूस आणि भावना", {"शरीर", "भावना", "व्यवसाय"}),
]
LARGE_TITLE = "रविवारचे मोठे कोडे"
UNTHEMED_TITLE = "दैनिक कोडे"
DIFFICULTY = {1: "सोपे", 2: "मध्यम", 3: "कठीण"}

SIZES = {
    # growth: penalty per square the bounding box grows. Too high packs words into a corner and
    # dead-ends early (measured: 0.5 → ~10 words); 0.05 lets large grids reach 60–100 words.
    "small": dict(min=15, max=30, target=(18, 24), max_rows=14, max_cols=12, tries=150, sample=250, growth=0.05),
    "large": dict(min=60, max=100, target=(64, 76), max_rows=21, max_cols=21, tries=250, sample=250, growth=0.05),
}


class Word:
    __slots__ = ("word", "cells", "clue", "difficulty", "tags", "reviewed")

    def __init__(self, word, cells, clue, difficulty, tags, reviewed):
        self.word, self.cells, self.clue = word, cells, clue
        self.difficulty, self.tags, self.reviewed = difficulty, tags, reviewed


def load_words(path) -> tuple[list[Word], list[str]]:
    words, problems, seen = [], [], set()
    with open(path, encoding="utf-8", newline="") as f:
        for n, row in enumerate(csv.DictReader(f), start=2):
            w = unicodedata.normalize("NFC", (row.get("word") or "").strip())
            clue = unicodedata.normalize("NFC", (row.get("clue") or "").strip())
            if not w:
                continue
            cells = split_aksharas(w)
            if "".join(cells) != w:
                problems.append(f'line {n}: "{w}" has spaces or punctuation')
            elif not 2 <= len(cells) <= MAX_AKSHARAS:
                problems.append(f'line {n}: "{w}" is {len(cells)} aksharas (allowed 2–{MAX_AKSHARAS})')
            elif not clue:
                problems.append(f'line {n}: "{w}" has no clue')
            elif w in clue:
                problems.append(f'line {n}: clue for "{w}" contains the answer')
            elif w in seen:
                problems.append(f'line {n}: "{w}" is listed twice')
            else:
                seen.add(w)
                try:
                    diff = min(3, max(1, int(row.get("difficulty") or 1)))
                except ValueError:
                    diff = 1
                tags = {t.strip() for t in (row.get("tags") or "").split(";") if t.strip()}
                reviewed = (row.get("reviewed") or "").strip().lower() in ("yes", "y", "1", "true", "हो")
                words.append(Word(w, cells, clue, diff, tags, reviewed))
    return words, problems


# ── layout ────────────────────────────────────────────────────────────────────

class Layout:
    """Freeform crossword under construction. Squares that aren't part of a word are empty."""

    def __init__(self, max_rows: int, max_cols: int):
        self.grid: dict[tuple[int, int], list] = {}  # (r, c) -> [akshara, used_across, used_down]
        self.by_ch: dict[str, list[tuple[int, int]]] = defaultdict(list)
        self.placed: list[tuple[Word, int, int, str]] = []
        self.box = (0, 0, 0, 0)  # min_r, max_r, min_c, max_c
        self.max_rows, self.max_cols = max_rows, max_cols
        self.crossings = 0

    def area(self) -> int:
        b = self.box
        return (b[1] - b[0] + 1) * (b[3] - b[2] + 1)

    def fits(self, cells, r0, c0, d):
        dr, dc = (0, 1) if d == "across" else (1, 0)
        slot = 1 if d == "across" else 2
        n, g = len(cells), self.grid
        if (r0 - dr, c0 - dc) in g or (r0 + dr * n, c0 + dc * n) in g:
            return None
        cross = 0
        for k, ch in enumerate(cells):
            p = (r0 + dr * k, c0 + dc * k)
            cell = g.get(p)
            if cell:
                if cell[0] != ch or cell[slot]:
                    return None
                cross += 1
            elif (p[0] + dc, p[1] + dr) in g or (p[0] - dc, p[1] - dr) in g:
                return None  # would touch a parallel word and form an unclued run
        if cross == 0 and self.placed:
            return None
        b = self.box if self.placed else (r0, r0, c0, c0)
        nb = (min(b[0], r0), max(b[1], r0 + dr * (n - 1)), min(b[2], c0), max(b[3], c0 + dc * (n - 1)))
        if nb[1] - nb[0] + 1 > self.max_rows or nb[3] - nb[2] + 1 > self.max_cols:
            return None
        return cross, nb

    def place(self, w: Word, r0, c0, d, nb):
        dr, dc = (0, 1) if d == "across" else (1, 0)
        slot = 1 if d == "across" else 2
        for k, ch in enumerate(w.cells):
            p = (r0 + dr * k, c0 + dc * k)
            cell = self.grid.get(p)
            if cell:
                self.crossings += 1
            else:
                cell = self.grid[p] = [ch, False, False]
                self.by_ch[ch].append(p)
            cell[slot] = True
        self.box = nb
        self.placed.append((w, r0, c0, d))

    def candidates(self, w: Word):
        seen = set()
        for k, ch in enumerate(w.cells):
            for (r, c) in self.by_ch.get(ch, ()):
                cell = self.grid[(r, c)]
                for d, slot in (("across", 1), ("down", 2)):
                    if cell[slot]:
                        continue
                    r0, c0 = (r, c - k) if d == "across" else (r - k, c)
                    if (r0, c0, d) in seen:
                        continue
                    seen.add((r0, c0, d))
                    res = self.fits(w.cells, r0, c0, d)
                    if res:
                        yield r0, c0, d, res[0], res[1]


def build_layout(pool: list[Word], size: dict, theme: set[str], fresh: dict[str, float], rng: random.Random) -> Layout:
    L = Layout(size["max_rows"], size["max_cols"])
    target = rng.randint(*size["target"])
    starters = [w for w in pool if len(w.cells) >= 4 and (not theme or w.word in theme)] or pool
    first = rng.choice(starters)
    d = rng.choice(("across", "down"))
    n = len(first.cells) - 1
    L.place(first, 0, 0, d, (0, n if d == "down" else 0, 0, n if d == "across" else 0))
    remaining = [w for w in pool if w is not first]

    def best_move(words):
        area = L.area()
        best = None
        for w in words:
            bonus = (6.0 if w.word in theme else 0.0) + fresh.get(w.word, 3.0)
            for r0, c0, d, cross, nb in L.candidates(w):
                growth = (nb[1] - nb[0] + 1) * (nb[3] - nb[2] + 1) - area
                s = cross * 12 + len(w.cells) - growth * size["growth"] + bonus + rng.random() * 4
                if best is None or s > best[0]:
                    best = (s, w, r0, c0, d, nb)
        return best

    while len(L.placed) < target and remaining:
        sample = remaining if len(remaining) <= size["sample"] else rng.sample(remaining, size["sample"])
        best = best_move(sample)
        if best is None and len(sample) < len(remaining):
            best = best_move(remaining)  # nothing in the sample fits; try every word before giving up
        if best is None:
            break
        _, w, r0, c0, d, nb = best
        L.place(w, r0, c0, d, nb)
        remaining.remove(w)
    return L


def layout_score(L: Layout, size: dict, theme: set[str]) -> float:
    n = len(L.placed)
    themed = sum(1 for w, *_ in L.placed if w.word in theme)
    density = len(L.grid) / L.area()
    return min(n, size["target"][1]) * 100 + L.crossings * 8 + themed * 25 + density * 150


def best_layout(pool, size, theme, fresh, rng) -> Layout:
    best, best_s = None, None
    for _ in range(size["tries"]):
        L = build_layout(pool, size, theme, fresh, rng)
        s = layout_score(L, size, theme)
        if best is None or s > best_s:
            best, best_s = L, s
    return best


# ── puzzles ───────────────────────────────────────────────────────────────────

def to_puzzle(L: Layout, pid: str, title: str) -> dict:
    min_r, max_r, min_c, max_c = L.box
    entries = []
    for w, r, c, d in L.placed:
        entries.append({"dir": d, "row": r - min_r, "col": c - min_c, "cells": w.cells, "clue": w.clue})
    entries.sort(key=lambda e: (e["row"], e["col"], e["dir"]))
    avg = sum(w.difficulty for w, *_ in L.placed) / len(L.placed)
    level = 1 if avg < 1.5 else 2 if avg < 2.2 else 3
    return {
        "id": pid,
        "title": title,
        "difficulty": DIFFICULTY[level],
        "rows": max_r - min_r + 1,
        "cols": max_c - min_c + 1,
        "entries": entries,
    }


def encode(puzzle: dict) -> dict:
    out = dict(puzzle)
    out["entries"] = [
        {"dir": e["dir"], "row": e["row"], "col": e["col"], "x": encode_cells(e["cells"], puzzle["id"]), "clue": e["clue"]}
        for e in puzzle["entries"]
    ]
    return out


def word_usage(index: dict, skip_ids: set[str]) -> dict[str, list[dt.date]]:
    """word -> dates of existing puzzles that use it."""
    usage: dict[str, list[dt.date]] = defaultdict(list)
    for p in index.get("puzzles", []):
        if p["id"] in skip_ids:
            continue
        path = PUZZLES / f"{p['id']}.json"
        if not path.exists():
            continue
        day = dt.date.fromisoformat(p["date"])
        for e in decode_puzzle(read_json(path))["entries"]:
            usage["".join(e["cells"])].append(day)
    return usage


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--from", dest="start", help="first date, YYYY-MM-DD (default: day after the last puzzle)")
    ap.add_argument("--days", type=int, default=7)
    ap.add_argument("--gap", type=int, default=7)
    ap.add_argument("--seed", type=int)
    ap.add_argument("--words", default=str(WORDS_CSV))
    ap.add_argument("--force", action="store_true", help="overwrite puzzles that already exist")
    args = ap.parse_args()

    words, problems = load_words(args.words)
    for p in problems:
        print(f"  skipped {p}")
    print(f"{len(words)} usable words ({sum(w.reviewed for w in words)} reviewed)")
    if len(words) < 60:
        print("Not enough words to build puzzles.")
        return 1

    index = load_index()
    by_id = {p["id"]: p for p in index.get("puzzles", [])}
    if args.start:
        start = dt.date.fromisoformat(args.start)
    elif by_id:
        start = max(dt.date.fromisoformat(p["date"]) for p in by_id.values()) + dt.timedelta(days=1)
    else:
        start = dt.date.today()
    dates = [start + dt.timedelta(days=i) for i in range(args.days)]
    todo = [d for d in dates if args.force or d.isoformat() not in by_id]
    if not todo:
        print("Nothing to do: those dates already have puzzles (use --force to redo them).")
        return 0

    rng = random.Random(args.seed)
    usage = word_usage(index, {d.isoformat() for d in todo})
    theme_last: dict[str, dt.date] = {}
    for p in index.get("puzzles", []):
        if p.get("theme") and p["id"] not in {d.isoformat() for d in todo}:
            day = dt.date.fromisoformat(p["date"])
            theme_last[p["theme"]] = max(theme_last.get(p["theme"], day), day)

    failures = 0
    for day in todo:
        t0 = time.time()
        pid = day.isoformat()
        size_name = "large" if day.weekday() == 6 else "small"
        size = SIZES[size_name]

        def distance(w: Word) -> int:
            return min((abs((day - u).days) for u in usage.get(w.word, ())), default=10_000)

        gap = args.gap
        pool = [w for w in words if distance(w) >= gap]
        while len(pool) < size["max"] * 4 and gap > 0:
            gap //= 2
            pool = [w for w in words if distance(w) >= gap]
        fresh = {w.word: 3.0 * min(distance(w), 60) / 60 for w in pool}

        theme_key, theme_title, theme = None, None, set()
        if size_name == "small":
            options = [t for t in THEMES if sum(1 for w in pool if w.tags & t[2]) >= 25]
            if options:
                rng.shuffle(options)
                options.sort(key=lambda t: theme_last.get(t[0], dt.date.min))
                theme_key, theme_title, tags = options[0]
                theme = {w.word for w in pool if w.tags & tags}

        L = best_layout(pool, size, theme, fresh, rng)
        n = len(L.placed)
        themed = sum(1 for w, *_ in L.placed if w.word in theme)
        if size_name == "large":
            title = LARGE_TITLE
        elif theme and themed / n >= 0.5:
            title = theme_title
        else:
            title = UNTHEMED_TITLE
        puzzle = to_puzzle(L, pid, title)
        errors = validate_puzzle(puzzle)
        if errors:
            print(f"✗ {pid}: generator produced an invalid puzzle (bug): {errors[:3]}")
            failures += 1
            continue

        write_json(PUZZLES / f"{pid}.json", encode(puzzle))
        by_id[pid] = {"id": pid, "date": pid, "title": title, "size": size_name, "words": n}
        if theme_key and title == theme_title:
            by_id[pid]["theme"] = theme_key
            theme_last[theme_key] = day
        for w, *_ in L.placed:
            usage[w.word].append(day)

        checked = sum(1 for c in L.grid.values() if c[1] and c[2])
        warn = f"  ⚠ only {n} words (wanted ≥{size['min']}); add more words to content/words.csv" if n < size["min"] else ""
        unreviewed = sum(1 for w, *_ in L.placed if not w.reviewed)
        print(
            f"✓ {pid} {day.strftime('%a')} {size_name:5} {n:3} words  {puzzle['rows']}×{puzzle['cols']}  "
            f"crossings {L.crossings}  checked {checked}/{len(L.grid)}  "
            f"{'theme ' + str(themed) + '/' + str(n) + '  ' if theme else ''}"
            f"unreviewed {unreviewed}  gap {gap}d  {time.time() - t0:.1f}s  “{title}”{warn}"
        )

    index["puzzles"] = sorted(by_id.values(), key=lambda p: p["date"])
    write_json(INDEX, index)
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
