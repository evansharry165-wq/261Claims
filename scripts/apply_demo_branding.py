#!/usr/bin/env python3
"""Apply easyJet demo branding across 261Claims HTML/JS files."""

import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

REPLACEMENTS = [
    ("TestAirways'", "easyJet's"),
    ("TestAirways", "easyJet"),
    ("TESTAIRWAYS", "EASYJET"),
    ("Aviation House, Luton Airport, Luton LU2 9LY", "Hangar 89, London Luton Airport, Luton LU2 9PF"),
    ("Aviation House", "Hangar 89"),
    ("eJ Policies & Ts&Cs", "easyJet Conditions of Carriage"),
    ("15. eJ Policies & Ts&Cs", "15. easyJet Conditions of Carriage"),
]

HC_PATTERNS = [
    (re.compile(r"\bHC (\d+)"), r"EZY \1"),
    (re.compile(r"'HC (\d+)'"), r"'EZY \1'"),
    (re.compile(r'"HC (\d+)"'), r'"EZY \1"'),
]

TITLE_SUB = "261Claims — "
TITLE_REPL = "261Claims · easyJet Legal — "

GN_NAME_OLD = '<span class="gn-name">261Claims</span>'
GN_NAME_NEW = (
    '<span class="gn-name">261Claims</span>'
    '<span class="gn-sub" style="font-size:10px;font-weight:400;color:rgba(255,255,255,0.45);margin-left:6px">easyJet Legal</span>'
)

LOGO_NAME_OLD = '<span class="logo-name">261Claims</span>'
LOGO_NAME_NEW = (
    '<span class="logo-name">261Claims</span>'
    '<span class="logo-tag" style="color:var(--text3)">· easyJet Legal</span>'
)


def patch_file(path: str) -> bool:
    with open(path, encoding="utf-8") as f:
        content = f.read()
    original = content

    for old, new in REPLACEMENTS:
        content = content.replace(old, new)

    for pattern, repl in HC_PATTERNS:
        content = pattern.sub(repl, content)

    if path.endswith(".html"):
        content = content.replace(TITLE_SUB, TITLE_REPL)
        if GN_NAME_OLD in content and "easyJet Legal</span>" not in content.split("gn-name")[1][:120] if "gn-name" in content else True:
            content = content.replace(GN_NAME_OLD, GN_NAME_NEW)
        content = content.replace(LOGO_NAME_OLD, LOGO_NAME_NEW)

    if content != original:
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        return True
    return False


def main():
    changed = []
    for name in sorted(os.listdir(ROOT)):
        if name.endswith((".html", ".js")) and not name.startswith("_"):
            path = os.path.join(ROOT, name)
            if patch_file(path):
                changed.append(name)
    print(f"Branding applied to {len(changed)} file(s):")
    for name in changed:
        print(f"  - {name}")


if __name__ == "__main__":
    main()
