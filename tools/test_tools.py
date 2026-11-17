"""Tests for the Python tools.  Run: python3 -m unittest discover -s tools"""
import json
import random
import unittest
from pathlib import Path

from akshara import split_aksharas
from generate import SIZES, build_layout, encode, load_words, to_puzzle, WORDS_CSV
from puzzlelib import decode_cells, decode_puzzle, encode_cells, validate_puzzle, validate_all

ROOT = Path(__file__).resolve().parent.parent

SAMPLE = {
    "id": "t", "title": "test", "rows": 3, "cols": 4,
    "entries": [
        {"dir": "across", "row": 0, "col": 0, "cells": ["म", "हा", "रा", "ष्ट्र"], "clue": "राज्य"},
        {"dir": "down", "row": 0, "col": 0, "cells": ["म", "रा", "ठी"], "clue": "भाषा"},
        {"dir": "down", "row": 0, "col": 2, "cells": ["रा", "जा"], "clue": "नृप"},
    ],
}


class AksharaTests(unittest.TestCase):
    def test_shared_cases(self):
        """Same cases the JS splitter is tested against (test/akshara-cases.json)."""
        cases = json.loads((ROOT / "test" / "akshara-cases.json").read_text(encoding="utf-8"))
        for text, expected in cases:
            with self.subTest(text=text):
                self.assertEqual(split_aksharas(text), expected)


class EncodingTests(unittest.TestCase):
    def test_round_trip(self):
        cells = ["इं", "द्र", "ध", "नु", "ष्य"]
        self.assertEqual(decode_cells(encode_cells(cells, "2026-11-20"), "2026-11-20"), cells)

    def test_answers_not_readable(self):
        x = encode_cells(["म", "रा", "ठी"], "2026-11-20")
        self.assertNotIn("म", x)

    def test_fixture_matches_js_test(self):
        """test/tests.js decodes this exact string; keep them in sync."""
        self.assertEqual(encode_cells(["म", "रा", "ठी"], "fixture"), "jceUGoncxJXW2xGDnsaJ3fQ=")


class ValidatorTests(unittest.TestCase):
    def test_valid(self):
        self.assertEqual(validate_puzzle(SAMPLE), [])

    def test_too_long(self):
        bad = json.loads(json.dumps(SAMPLE))
        bad["cols"] = 8
        bad["entries"][0]["cells"] = ["म", "हा", "रा", "ष्ट्र", "रा", "ज्य", "ना", "व"]
        self.assertTrue(any("> 7" in e for e in validate_puzzle(bad)))

    def test_two_aksharas_in_one_square(self):
        bad = json.loads(json.dumps(SAMPLE))
        bad["entries"][2]["cells"] = ["रा", "जाजी"]
        self.assertTrue(any("not exactly one akshara" in e for e in validate_puzzle(bad)))

    def test_crossing_mismatch(self):
        bad = json.loads(json.dumps(SAMPLE))
        bad["entries"][1]["cells"][0] = "मा"
        self.assertTrue(any("mismatch" in e for e in validate_puzzle(bad)))

    def test_touching_words(self):
        bad = json.loads(json.dumps(SAMPLE))
        bad["entries"].append({"dir": "down", "row": 0, "col": 3, "cells": ["ष्ट्र", "प"], "clue": "x"})
        self.assertTrue(any("Unclued run" in e or "touches" in e for e in validate_puzzle(bad)))

    def test_published_puzzles_are_valid(self):
        for pid, errors in validate_all():
            with self.subTest(puzzle=pid):
                self.assertEqual(errors, [])


class GeneratorTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.words, cls.problems = load_words(WORDS_CSV)

    def test_word_list_is_clean(self):
        self.assertEqual(self.problems, [])
        self.assertGreater(len(self.words), 300)

    def test_layouts_are_valid(self):
        for name in ("small", "large"):
            for seed in range(5):
                with self.subTest(size=name, seed=seed):
                    L = build_layout(self.words, SIZES[name], set(), {}, random.Random(seed))
                    pz = encode(to_puzzle(L, f"test-{seed}", "t"))
                    self.assertEqual(validate_puzzle(pz), [])
                    self.assertLessEqual(pz["rows"], SIZES[name]["max_rows"])
                    self.assertLessEqual(pz["cols"], SIZES[name]["max_cols"])
                    self.assertLessEqual(len(pz["entries"]), SIZES[name]["max"])
                    self.assertEqual(len(decode_puzzle(pz)["entries"]), len(L.placed))


class OfflineTests(unittest.TestCase):
    def test_service_worker_precaches_every_app_file(self):
        """Every JS/CSS/icon file must be in sw.js SHELL, or the app breaks offline."""
        import re
        sw = (ROOT / "sw.js").read_text(encoding="utf-8")
        shell = set(re.findall(r"^  '([^']+)',$", re.search(r"const SHELL = \[(.*?)\];", sw, re.S).group(1), re.M))
        expected = {str(p.relative_to(ROOT)) for pattern in ("js/*.js", "css/*.css", "icons/*.png") for p in ROOT.glob(pattern)}
        expected |= {"index.html", "manifest.webmanifest", "puzzles/index.json", "puzzles/extra/index.json", "./"}
        self.assertEqual(sorted(expected - shell), [], "missing from SHELL")
        self.assertEqual(sorted(p for p in shell - expected if not (ROOT / p).exists() and p != "./"), [], "SHELL lists files that don't exist")


if __name__ == "__main__":
    unittest.main()
