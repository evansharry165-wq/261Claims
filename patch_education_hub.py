#!/usr/bin/env python3
"""
261Claims — Education Hub Integration Patch
============================================
Run this from the root of your 261Claims repo:

    python3 patch_education_hub.py

It will:
  1. Add "Education Hub" to the nav bar in every HTML file
  2. Add an Education Hub card to the dashboard module grid (index.html)
  3. Print a summary of every change made

Safe to re-run — checks for existing Education Hub links first.
"""

import os
import re

# ── Files to patch ──────────────────────────────────────────────────────────
# All HTML files in the repo. The script discovers them automatically,
# but we also list the known ones so we can warn if any are missing.
KNOWN_FILES = [
    'index.html',
    'module1-intake.html',
    'module2-case-management.html',
    'module2-case-workspace.html',
    'module3-cpr.html',
    'module3-cpr-workspace.html',
    'module4-evidence.html',
    'module4-evidence-workspace.html',
    'module5-drafting.html',
    'module5-drafting-workspace.html',
    'module6-mi.html',
]

EDUCATION_HUB_LINK = 'module7-education.html'
EDUCATION_HUB_LABEL = 'Education Hub'

# ── The nav link HTML to insert ─────────────────────────────────────────────
# We insert this immediately after the MI link in every nav bar.
# The script matches several nav bar patterns used across the codebase.

EDU_LINK_VARIANTS = [
    # Variant A — full icon + text (most modules)
    '<a href="module7-education.html" class="nav-link"><i class="ti ti-school"></i>Education Hub</a>',
    # Variant B — gn-link style (older modules)
    '<a href="module7-education.html" class="gn-link"><i class="ti ti-school"></i>Education Hub</a>',
]

# Patterns that indicate the MI link — we insert Education Hub after these
MI_LINK_PATTERNS = [
    # nav-link style
    (r'(<a\s+href="module6-mi\.html"[^>]*class="nav-link"[^>]*>.*?</a>)',
     r'\1\n    <a href="module7-education.html" class="nav-link"><i class="ti ti-school"></i>Education Hub</a>'),
    # nav-link with active
    (r'(<a\s+href="module6-mi\.html"[^>]*>.*?</a>)',
     r'\1\n    <a href="module7-education.html" class="nav-link"><i class="ti ti-school"></i>Education Hub</a>'),
    # gn-link style
    (r'(<a\s+href="module6-mi\.html"\s+class="gn-link[^"]*"[^>]*>.*?</a>)',
     r'\1\n    <a href="module7-education.html" class="gn-link"><i class="ti ti-school"></i>Education Hub</a>'),
]

# ── Dashboard card to inject ─────────────────────────────────────────────────
# Inserted into index.html module grid, after the MI card.
# Matches several patterns used across dashboard versions.

EDU_DASHBOARD_CARD = '''
    <div class="mod-row" onclick="window.location='module7-education.html'" style="cursor:pointer">
      <div class="mod-row-icon" style="background:var(--blue-faint);color:var(--blue-text)"><i class="ti ti-school"></i></div>
      <div>
        <div class="mod-row-num">07</div>
        <div class="mod-row-title">Education Hub</div>
        <div class="mod-row-desc">Case law · Regulation · Training library · AI assistant · Platform guidance</div>
      </div>
      <span class="mod-row-status badge-live" style="background:var(--green-faint);color:var(--green);border:1px solid #BBF7D0">Live</span>
    </div>'''

# Also add a quick-access card in dashboard grid if it exists
EDU_QUICK_CARD = '''
        <a href="module7-education.html" class="quick-card">
          <div class="qc-icon" style="background:var(--blue-faint);color:var(--blue-text)"><i class="ti ti-school"></i></div>
          <div class="qc-label">Education Hub</div>
          <div class="qc-sub">Case law & training</div>
        </a>'''

# ── Helpers ─────────────────────────────────────────────────────────────────

def already_patched(content):
    return 'module7-education.html' in content

def patch_nav(content, filename):
    """Insert Education Hub after MI link in nav bar."""
    if already_patched(content):
        return content, False

    EDU_NAV = '\n    <a href="module7-education.html" class="nav-link"><i class="ti ti-school"></i>Education Hub</a>'
    EDU_GN  = '\n    <a href="module7-education.html" class="gn-link"><i class="ti ti-school"></i>Education Hub</a>'

    patterns = [
        (r'(<a\s+href="module6-mi\.html"[^>]*class="nav-link[^"]*"[^>]*>.*?</a>)', EDU_NAV),
        (r'(<a\s+href="module6-mi\.html"[^>]*>.*?</a>)', EDU_NAV),
        (r'(<a\s+href="module6-mi\.html"\s+class="gn-link[^"]*"[^>]*>.*?</a>)', EDU_GN),
    ]

    for pattern, edu_link in patterns:
        def replacer(m, edu=edu_link):
            return m.group(1) + edu
        new_content = re.sub(pattern, replacer, content, count=1, flags=re.DOTALL)
        if new_content != content:
            return new_content, True

    return content, False

def patch_dashboard(content):
    """Add Education Hub to the module list in index.html."""
    if already_patched(content):
        return content, False

    patched = False

    # Pattern 1: mod-row list — insert after MI (module6) row
    mi_modrow = re.search(
        r'(<div class="mod-row[^"]*"[^>]*>.*?module6-mi.*?</div>\s*</div>)',
        content, re.DOTALL
    )
    if mi_modrow:
        content = content[:mi_modrow.end()] + EDU_DASHBOARD_CARD + content[mi_modrow.end():]
        patched = True

    # Pattern 2: quick-access grid — insert after MI card
    mi_quick = re.search(
        r'(<a\s+href="module6-mi\.html"[^>]*>.*?</a>)',
        content, re.DOTALL
    )
    if mi_quick and not patched:
        content = content[:mi_quick.end()] + EDU_QUICK_CARD + content[mi_quick.end():]
        patched = True

    # Pattern 3: module grid with chart-bar icon (MI) — insert Education Hub card after
    mi_card_pattern = re.search(
        r'((?:ti-chart-bar|module6).*?</(?:div|a)>)',
        content, re.DOTALL
    )
    if mi_card_pattern and not patched:
        end = mi_card_pattern.end()
        # Find the closing tag of the parent container
        closing = content.find('</div>', end)
        if closing != -1:
            content = content[:closing] + EDU_DASHBOARD_CARD + '\n' + content[closing:]
            patched = True

    return content, patched


# ── Main ─────────────────────────────────────────────────────────────────────

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    html_files = [f for f in os.listdir(script_dir) if f.endswith('.html')]

    print("=" * 60)
    print("261Claims — Education Hub Integration Patch")
    print("=" * 60)
    print(f"Directory : {script_dir}")
    print(f"HTML files found: {len(html_files)}")
    print()

    # Warn about expected files not found
    for kf in KNOWN_FILES:
        if kf not in html_files:
            print(f"  ⚠  Expected file not found: {kf}")

    print()
    results = []

    for filename in sorted(html_files):
        if filename == 'module7-education.html':
            results.append((filename, 'SKIP', 'This is the Education Hub itself'))
            continue

        filepath = os.path.join(script_dir, filename)
        with open(filepath, 'r', encoding='utf-8') as f:
            original = f.read()

        if already_patched(original):
            results.append((filename, 'ALREADY DONE', 'module7-education.html already present'))
            continue

        content = original
        nav_changed = False
        dash_changed = False

        # Patch nav
        content, nav_changed = patch_nav(content, filename)

        # Extra: patch dashboard
        if filename == 'index.html':
            content, dash_changed = patch_dashboard(content)

        if nav_changed or dash_changed:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            details = []
            if nav_changed: details.append('nav bar updated')
            if dash_changed: details.append('dashboard card added')
            results.append((filename, '✅ PATCHED', ', '.join(details)))
        else:
            results.append((filename, '⚠  NO NAV FOUND', 'Nav bar pattern not matched — patch manually'))

    # Summary
    print(f"{'File':<42} {'Status':<18} {'Detail'}")
    print("-" * 80)
    for filename, status, detail in results:
        print(f"{filename:<42} {status:<18} {detail}")

    patched = sum(1 for _, s, _ in results if 'PATCHED' in s)
    skipped = sum(1 for _, s, _ in results if 'ALREADY' in s or 'SKIP' in s)
    failed  = sum(1 for _, s, _ in results if 'NO NAV' in s)

    print()
    print(f"Done. {patched} file(s) patched · {skipped} already up to date · {failed} could not patch.")
    if failed:
        print()
        print("For any file marked 'NO NAV FOUND', add this manually to its nav bar,")
        print("after the MI link:")
        print()
        print('  <a href="module7-education.html" class="nav-link">')
        print('    <i class="ti ti-school"></i>Education Hub</a>')

    print()
    print("Next step: commit all changed files + module7-education.html to GitHub.")
    print("=" * 60)

if __name__ == '__main__':
    main()
