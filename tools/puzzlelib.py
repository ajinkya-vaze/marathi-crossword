"""Shared helpers for the Python tools: answer encoding, validation, file I/O.

Validation rules mirror tools/validate-lib.js (used by the browser test page).
"""
from __future__ import annotations

import base64
import json
import unicodedata
from pathlib import Path

from akshara import split_aksharas

ROOT = Path(__file__).resolve().parent.parent
PUZZLES = ROOT / "puzzles"
INDEX = PUZZLES / "index.json"

MAX_WORDS = 100
MAX_AKSHARAS = 7


# ── answer obfuscation (must match decodePuzzle in js/puzzle.js) ──────────────

def _key(puzzle_id: str) -> bytes:
    return ("mc:" + puzzle_id).encode("utf-8")


def encode_cells(cells: list[str], puzzle_id: str) -> str:
    key = _key(puzzle_id)
    raw = "|".join(cells).encode("utf-8")
    return base64.b64encode(bytes(b ^ key[i % len(key)] for i, b in enumerate(raw))).decode("ascii")


def decode_cells(x: str, puzzle_id: str) -> list[str]:
    key = _key(puzzle_id)
    raw = base64.b64decode(x)
    return bytes(b ^ key[i % len(key)] for i, b in enumerate(raw)).decode("utf-8").split("|")


def decode_puzzle(data: dict) -> dict:
    """Return a copy of the puzzle with every entry's answer as plain `cells`."""
    entries = []
    for e in data.get("entries", []):
        e = dict(e)
        if "x" in e:
            e["cells"] = decode_cells(e.pop("x"), data["id"])
        entries.append(e)
    return {**data, "entries": entries}


# ── validation ────────────────────────────────────────────────────────────────

def _positions(e: dict) -> list[tuple[int, int]]:
    dr, dc = (0, 1) if e["dir"] == "across" else (1, 0)
    return [(e["row"] + dr * k, e["col"] + dc * k) for k in range(len(e["cells"]))]


def validate_puzzle(data: dict) -> list[str]:
    """Return a list of problems; empty means valid."""
    if not isinstance(data, dict):
        return ["Not a JSON object"]
    try:
        data = decode_puzzle(data)
    except Exception as ex:  # noqa: BLE001 - report any decoding failure
        return [f"Cannot decode answers: {ex}"]

    errors: list[str] = []
    if not data.get("id"):
        errors.append("Missing id")
    if not data.get("title"):
        errors.append("Missing title")
    rows, cols = data.get("rows"), data.get("cols")
    if not isinstance(rows, int) or not isinstance(cols, int) or rows < 1 or cols < 1:
        errors.append("rows/cols must be positive integers")
    entries = data.get("entries") or []
    if not entries:
        return errors + ["No entries"]
    if len(entries) > MAX_WORDS:
        errors.append(f"Too many words: {len(entries)} > {MAX_WORDS}")

    answers = set()
    for i, e in enumerate(entries):
        cells = e.get("cells") or []
        name = f"Entry {i + 1} ({''.join(cells)})"
        if e.get("dir") not in ("across", "down"):
            errors.append(f"{name}: bad dir")
        if len(cells) < 2:
            errors.append(f"{name}: needs at least 2 squares")
        if len(cells) > MAX_AKSHARAS:
            errors.append(f"{name}: {len(cells)} aksharas > {MAX_AKSHARAS}")
        for k, s in enumerate(cells):
            if split_aksharas(s) != [unicodedata.normalize("NFC", s)]:
                errors.append(f'{name}: square {k + 1} "{s}" is not exactly one akshara')
        if not str(e.get("clue", "")).strip():
            errors.append(f"{name}: missing clue")
        word = "".join(cells)
        if word in answers:
            errors.append(f"{name}: duplicate answer")
        answers.add(word)
    if errors:
        return errors

    grid: dict[tuple[int, int], str] = {}
    used: set[tuple[int, int, str]] = set()
    for e in entries:
        for (r, c), s in zip(_positions(e), e["cells"]):
            if not (0 <= r < rows and 0 <= c < cols):
                errors.append(f"{''.join(e['cells'])}: runs off the grid")
                break
            s = unicodedata.normalize("NFC", s)
            if grid.get((r, c), s) != s:
                errors.append(f'Crossing mismatch at row {r + 1}, col {c + 1}: "{grid[(r, c)]}" vs "{s}"')
            if (r, c, e["dir"]) in used:
                errors.append(f"Two {e['dir']} entries overlap at row {r + 1}, col {c + 1}")
            grid[(r, c)] = s
            used.add((r, c, e["dir"]))
    if errors:
        return errors

    # Every run of 2+ adjacent squares must be exactly one entry (no accidental words).
    runs = set()
    for (r, c) in grid:
        if (r, c - 1) not in grid and (r, c + 1) in grid:
            n = 0
            while (r, c + n) in grid:
                n += 1
            runs.add(("across", r, c, n))
        if (r - 1, c) not in grid and (r + 1, c) in grid:
            n = 0
            while (r + n, c) in grid:
                n += 1
            runs.add(("down", r, c, n))
    keys = {(e["dir"], e["row"], e["col"], len(e["cells"])) for e in entries}
    for d, r, c, n in sorted(runs - keys):
        errors.append(f"Unclued run of squares {d} at row {r + 1}, col {c + 1}, length {n}")
    for d, r, c, n in sorted(keys - runs):
        errors.append(f"Entry {d} at row {r + 1}, col {c + 1}, length {n} touches neighbouring squares")
    return errors


# ── files ─────────────────────────────────────────────────────────────────────

def read_json(path: Path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def write_json(path: Path, data) -> None:
    tmp = path.with_suffix(path.suffix + ".tmp")
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
        f.write("\n")
    tmp.replace(path)


def load_index() -> dict:
    return read_json(INDEX) if INDEX.exists() else {"puzzles": []}


def validate_all() -> list[tuple[str, list[str]]]:
    """Validate index.json and every puzzle it lists."""
    index = load_index()
    report = []
    seen = set()
    for p in index.get("puzzles", []):
        errs = []
        pid = p.get("id")
        if pid in seen:
            errs.append("Duplicate id in index.json")
        seen.add(pid)
        path = PUZZLES / f"{pid}.json"
        if not path.exists():
            report.append((pid, errs + ["File missing"]))
            continue
        data = read_json(path)
        if data.get("id") != pid:
            errs.append(f'id mismatch: index "{pid}" vs file "{data.get("id")}"')
        if p.get("words") != len(data.get("entries", [])):
            errs.append(f"index says {p.get('words')} words, file has {len(data.get('entries', []))}")
        errs += validate_puzzle(data)
        report.append((pid, errs))
    return report
