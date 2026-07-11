#!/bin/sh
# The reference files are the companion's grounding: an unresolved "[[" marker
# means an unfilled citation slot and must never ship. This gate FAILS when no
# reference file exists at all — the old inline grep read a missing/moved file
# (grep exit 2) as "no markers" and passed silently (verified empirically).
# grep -r --include is used instead of a $files variable so filenames with
# spaces cannot word-split their way past the check, and grep's own read
# errors (exit >= 2) fail the gate instead of passing it.
set -u
count=$(find functions/lib -maxdepth 1 -name '*Reference.ts' | wc -l | tr -d ' ')
if [ "$count" -eq 0 ]; then
  echo "check:ref FAILED — no functions/lib/*Reference.ts found; the grounding reference is missing or was moved." >&2
  exit 1
fi
grep -rn --include='*Reference.ts' '\[\[' functions/lib
case $? in
  0)
    echo "check:ref FAILED — unresolved [[ markers above; resolve them before shipping." >&2
    exit 1
    ;;
  1)
    exit 0
    ;;
  *)
    echo "check:ref FAILED — grep could not read the reference files." >&2
    exit 1
    ;;
esac
