#!/usr/bin/env bash
# Housekeeping · run this from your local 261Claims clone root.
# Deletes stray artefacts + isolates test files into tests/.
# After running: git add -A && git commit -m "..." && git push
set -e
echo "→ Deleting 3 stray .patch files..."
rm -f 0001-Evidence-layer-Bucket-1-demo-hardening.patch \
      0001-Evidence-layer-B2A-loop-closing-signal-polish-cross-.patch \
      0001-Evidence-layer-fixes-crosslink-CSS-audit-trail-race-.patch

echo "→ Deleting 11 chunk_*.txt session leftovers..."
rm -f chunk_0.txt chunk_1.txt chunk_2.txt chunk_3.txt chunk_4.txt \
      chunk_5.txt chunk_6.txt chunk_7.txt chunk_8.txt chunk_9.txt chunk_10.txt

echo "→ Creating tests/ folder + moving 6 test suites..."
mkdir -p tests
mv defendable_doc_templates_tests.js tests/ 2>/dev/null || true
mv defendable_handoff_tests.js       tests/ 2>/dev/null || true
mv defendable_icc_parse_tests.js     tests/ 2>/dev/null || true
mv defendable_lof_legal_tests.js     tests/ 2>/dev/null || true
mv defendable_prompt_tests.js        tests/ 2>/dev/null || true
mv defendable_v2_tests.js            tests/ 2>/dev/null || true

# demo_reset.js is a session-reset utility, not a test. Leave at top-level.

echo ""
echo "✓ Housekeeping complete."
echo ""
echo "Next: run"
echo "  git add -A"
echo "  git commit -m 'Housekeeping · delete stray patches + chunks + isolate test suites + normalise cache-bust'"
echo "  git push origin main"
