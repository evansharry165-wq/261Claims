# Housekeeping — user actions required

I cannot push, delete, or move files on your GitHub repo directly. Below is
everything I've prepared and exactly what you need to do.

## What I did

- **Normalised the cache-bust versions** across all 19 HTML files. Every
  `?v=<something>` in a script/link tag is now `?v=s9a`. This is what the 44
  HTML files in this folder reflect — nothing else changed inside them.
- **Confirmed 72 console.log statements** are all inside 6 test files and
  none are in production JS. Moving those test files to `tests/` isolates the
  noise fully (production is already clean).
- **Confirmed the "TODO" hit** was a false positive (Spanish translations
  contain the word "todo" = "everything"). No real TODOs in code.

## What you need to do

### Option A · Terminal (fastest — one script)

If you have a local git clone of the repo:

    cd /path/to/your/local/261Claims
    bash /path/to/outputs/housekeeping_pack/housekeeping_apply.sh
    # Then copy all 19 .html files from this folder into the repo root
    # (they contain the cache-bust normalisation)
    git add -A
    git commit -m "Housekeeping · patches + chunks removed + tests isolated + cache-bust normalised"
    git push origin main

### Option B · Web UI only (slower but doesn't need terminal)

Do the four steps in this order on github.com/evansharry165-wq/261Claims:

**Step 1 · Delete the 3 stray `.patch` files**
Browse to each file → click the trash-can icon → commit changes.

  - `0001-Evidence-layer-Bucket-1-demo-hardening.patch`
  - `0001-Evidence-layer-B2A-loop-closing-signal-polish-cross-.patch`
  - `0001-Evidence-layer-fixes-crosslink-CSS-audit-trail-race-.patch`

**Step 2 · Delete the 11 `chunk_*.txt` files**
Same drill: browse to each, trash-can, commit.

  - `chunk_0.txt` through `chunk_10.txt` (11 files)

**Step 3 · Move 6 test suites to a `tests/` subfolder**
GitHub web UI does not have a "move" action; you have to:
  - Open each test file
  - Rename it to `tests/<filename>` (the slash creates the folder)
  - Commit

Files to move:

  - `defendable_doc_templates_tests.js` → `tests/defendable_doc_templates_tests.js`
  - `defendable_handoff_tests.js` → `tests/defendable_handoff_tests.js`
  - `defendable_icc_parse_tests.js` → `tests/defendable_icc_parse_tests.js`
  - `defendable_lof_legal_tests.js` → `tests/defendable_lof_legal_tests.js`
  - `defendable_prompt_tests.js` → `tests/defendable_prompt_tests.js`
  - `defendable_v2_tests.js` → `tests/defendable_v2_tests.js`

**Step 4 · Upload the 19 modified HTML files**
From this folder, upload all 44 `.html` files via **Add file → Upload files**.
They contain the cache-bust normalisation to `?v=s9a`.

## What I explicitly cannot do myself

- **Push to GitHub** — my sandbox has no credentials. Every code change needs
  you to apply the file drop or the shell script.
- **Delete files on GitHub** — same reason. Deletions only happen once you
  either run the shell script or click the trash-can in the web UI.
- **Move files (rename with path)** — web UI supports it via the "rename"
  trick above, but only you can do it.
- **Verify runtime behaviour in a browser** — I can syntax-check and smoke-
  test in Node, but the actual browser render (does the crosslink banner
  look right? does verify-chain fire?) I cannot see. Worth a 30-second
  eyes-on-screen check after this drop lands.

## Bigger tasks not in this pack (for later)

- **T7 · README refresh** — the current README doesn't cover B1/B2A/audit
  trail. Best done as part of Phase B2C once the solicitor-side pass shows
  the full architecture.
- **T8 · Legacy module-*.html audit** — 10 files, some still iframed by
  case_shell, some possibly dead. Needs a careful pass; risk of silently
  breaking case_shell. Suggest as a standalone item after B2C.
