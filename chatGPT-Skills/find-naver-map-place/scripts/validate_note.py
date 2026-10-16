#!/usr/bin/env python3
"""Validate a single-line place note against a visible-character limit."""

from __future__ import annotations

import argparse
import json
import sys
import unicodedata


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("text", nargs="?", help="Place note; reads stdin when omitted")
    parser.add_argument("--max", type=int, default=45, dest="maximum")
    args = parser.parse_args()

    raw = args.text if args.text is not None else sys.stdin.read()
    note = unicodedata.normalize("NFC", raw).strip()
    problems: list[str] = []

    if not note:
        problems.append("note is empty")
    if any(character in note for character in "\r\n"):
        problems.append("note must be one line")
    if any(unicodedata.category(character).startswith("C") for character in note):
        problems.append("note contains a control or invisible character")

    count = len(note)
    if count > args.maximum:
        problems.append(f"note has {count} characters; maximum is {args.maximum}")

    result = {
        "valid": not problems,
        "count": count,
        "maximum": args.maximum,
        "text": note,
        "problems": problems,
    }
    print(json.dumps(result, ensure_ascii=False))
    return 0 if not problems else 1


if __name__ == "__main__":
    raise SystemExit(main())
