#!/usr/bin/env bash
# One-time bootstrap: sync existing GitHub issues into Beads with external-ref
# back to the GH issue number. Each bd issue gets title "[GH#N] <gh title>"
# and --external-ref gh-N for linking.
#
# Re-running this WILL create duplicates. Refuses to run if bd already has
# issues — delete those first if you want to re-bootstrap.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ "$(bd list --json 2>/dev/null | tr -d '[:space:]')" != "[]" ] && \
   [ -n "$(bd list 2>/dev/null | grep -v 'No issues found' | head -1)" ]; then
  echo "bd already contains issues. Refusing to bootstrap to avoid duplicates."
  echo "Delete existing issues first if you want to re-run."
  exit 1
fi

create() {
  local num="$1" type="$2" prio="$3" title="$4" desc="$5"
  bd create "[GH#${num}] ${title}" \
    --type "$type" \
    --priority "$prio" \
    --external-ref "gh-${num}" \
    --description "$desc"
}

create 51 feature 2 "feat(cleaner): semantic HTML extraction for email newsletters" \
"Tracks https://github.com/mofro/mnews/issues/51

Semantic HTML extraction pass. Phase 1 + Phase 2 shipped (Gmail unwrap, table scaffolding, sponsor blocks, tracking pixels, footer noise, constrained anchor unwrapping). Open: confirm if Phase 3 scope remains or close GH#51 as done."

create 32 feature 1 "Newsletter Deletion (confirm + undo)" \
"Tracks https://github.com/mofro/mnews/issues/32

Delete endpoint + frontend wiring exist. Missing: confirmation dialog (Radix Dialog), timer-based undo toast (5s window). Was blocked on GH#66 (webhook dedup) which has shipped — unblocked."

create 31 feature 2 "Hero Images" \
"Tracks https://github.com/mofro/mnews/issues/31"

create 30 feature 3 "Unsubscribe Functionality (EXPERIMENTAL)" \
"Tracks https://github.com/mofro/mnews/issues/30 — open question marked on GH."

create 29 feature 2 "Clickable Links in FullView" \
"Tracks https://github.com/mofro/mnews/issues/29"

create 28 feature 2 "Enhanced Share Control" \
"Tracks https://github.com/mofro/mnews/issues/28"

create 27 feature 3 "Debug Items Visibility Toggle" \
"Tracks https://github.com/mofro/mnews/issues/27"

create 26 feature 2 "Mobile-Responsive Hamburger Menu" \
"Tracks https://github.com/mofro/mnews/issues/26"

create 21 bug 2 "Article Content Not Appearing in Pop-Up Modal" \
"Tracks https://github.com/mofro/mnews/issues/21

Likely already fixed by 9495ed1 (FullViewArticle now fetches real content by ID). Needs verification before closing GH#21."

create 20 feature 3 "Enhance Mobile UX with Swipe Gestures in Article Modal" \
"Tracks https://github.com/mofro/mnews/issues/20"

create 19 feature 3 "Add Keyboard Shortcuts for Article Navigation" \
"Tracks https://github.com/mofro/mnews/issues/19"

create 18 bug 2 "Improve UX with Article Loading State" \
"Tracks https://github.com/mofro/mnews/issues/18"

create 17 feature 3 "Add Search Functionality to Article Modal" \
"Tracks https://github.com/mofro/mnews/issues/17"

create 13 bug 2 "Developer Debug Console Not Populating in Dev Mode" \
"Tracks https://github.com/mofro/mnews/issues/13"

create 12 task 3 "Document Redis Data Structure and API Patterns" \
"Tracks https://github.com/mofro/mnews/issues/12"

create 11 task 3 "Add Request ID Correlation for Better Tracing" \
"Tracks https://github.com/mofro/mnews/issues/11"

create 9 task 3 "Implement Redis Connection Pooling" \
"Tracks https://github.com/mofro/mnews/issues/9"

create 7 bug 2 "Sender dropdown only shows senders from current page" \
"Tracks https://github.com/mofro/mnews/issues/7"

echo
echo "=== Synced. Current bd state: ==="
bd list
