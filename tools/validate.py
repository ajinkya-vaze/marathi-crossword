"""Check puzzles/index.json and every puzzle it lists.

Usage: python3 tools/validate.py
"""
import sys

from puzzlelib import validate_all


def main() -> int:
    failed = 0
    for pid, errors in validate_all():
        if errors:
            failed += 1
            print(f"✗ {pid}")
            for e in errors:
                print(f"    {e}")
        else:
            print(f"✓ {pid}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
