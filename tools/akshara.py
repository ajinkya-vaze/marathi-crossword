"""Devanagari akshara splitting — Python twin of js/akshara.js.

Both implementations are checked against the same cases in test/akshara-cases.json,
so if you change one, change the other.
"""
import unicodedata

VIRAMA = "्"
_JOINERS = ("‌", "‍")


def char_type(ch: str) -> str:
    c = ord(ch)
    if c == 0x094D:
        return "virama"
    if c in (0x200D, 0x200C):
        return "joiner"
    if c == 0x093C:
        return "nukta"
    if c == 0x093D:
        return "avagraha"
    if 0x0915 <= c <= 0x0939 or 0x0958 <= c <= 0x095F or 0x0978 <= c <= 0x097F:
        return "consonant"
    if 0x0904 <= c <= 0x0914 or c in (0x0960, 0x0961) or 0x0972 <= c <= 0x0977:
        return "vowel"
    if 0x093A <= c <= 0x094C or c in (0x094E, 0x094F, 0x0962, 0x0963) or 0x0955 <= c <= 0x0957:
        return "matra"
    if 0x0900 <= c <= 0x0903:
        return "sign"
    if 0x0966 <= c <= 0x096F:
        return "digit"
    return "other"


def _ends_with_link(s: str) -> bool:
    if s.endswith(VIRAMA):
        return True
    return len(s) >= 2 and s[-1] in _JOINERS and s[-2] == VIRAMA


def split_aksharas(text: str) -> list[str]:
    """Split Marathi text into aksharas (one crossword square each). Drops spaces/punctuation."""
    out: list[str] = []
    cur = ""
    for ch in unicodedata.normalize("NFC", text):
        t = char_type(ch)
        if t == "consonant":
            if cur and _ends_with_link(cur):
                cur += ch
            else:
                if cur:
                    out.append(cur)
                cur = ch
        elif t in ("vowel", "avagraha", "digit"):
            if cur:
                out.append(cur)
            cur = ch
        elif t in ("matra", "sign", "nukta", "virama", "joiner"):
            cur += ch
        else:
            if cur:
                out.append(cur)
            cur = ""
    if cur:
        out.append(cur)
    return out
