#!/bin/sh
# The reference files are the companion's grounding: an unresolved "[[" marker
# means an unfilled citation slot and must never ship. This gate FAILS when no
# reference file exists at all — the old inline grep read a missing/moved file
# (grep exit 2) as "no markers" and passed silently (verified empirically).
set -u
files=$(ls functions/lib/*Reference.ts 2>/dev/null || true)
if [ -z "$files" ]; then
  echo "check:ref FAILED — no functions/lib/*Reference.ts found; the grounding reference is missing or was moved." >&2
  exit 1
fi
if grep -n '\[\[' $files; then
  echo "check:ref FAILED — unresolved [[ markers above; resolve them before shipping." >&2
  exit 1
fi
exit 0
