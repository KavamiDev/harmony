#!/usr/bin/env bash
# Chef de projet: turns issue #N into a spec and posts it on the issue.
# Usage: .factory/plan.sh <issue-number> [feedback-file]
source "$(dirname "$0")/lib.sh"

ISSUE=${1:?usage: plan.sh <issue> [feedback-file]}
FEEDBACK_FILE=${2:-}

ensure_labels
gh issue view "$ISSUE" -R "$REPO" --json title,body,comments >"$OUT/issue.json"

# Previous plan (if any), so a /plan with remarks revises it instead of starting over.
PREV_PLAN="$(jq -r --arg m "$PLAN_MARKER" '[.comments[] | select(.body | contains($m))] | last | .body // ""' "$OUT/issue.json")"

{
  echo "# Demande de Kevin (issue #$ISSUE)"
  echo
  echo "## $(jq -r .title "$OUT/issue.json")"
  echo
  jq -r '.body // ""' "$OUT/issue.json"
  echo
  echo "## Discussion sur l'issue"
  jq -r --arg m "$PLAN_MARKER" '.comments[] | select(.body | contains($m) | not) | "- \(.author.login): \(.body)"' "$OUT/issue.json"
  if [[ -n "$PREV_PLAN" ]]; then
    echo
    echo "## Plan précédent (à réviser)"
    echo "$PREV_PLAN"
  fi
  if [[ -n "$FEEDBACK_FILE" && -s "$FEEDBACK_FILE" ]]; then
    echo
    echo "## Remarques de Kevin sur le plan (prioritaires)"
    cat "$FEEDBACK_FILE"
  fi
  echo
  echo "Écris la spec selon ton format de sortie."
} >"$OUT/plan-input.md"

if ! run_agent planner "Read,Glob,Grep,Bash(git log:*),Bash(git show:*),Bash(ls:*)" 40 "$OUT/plan-input.md" "$OUT/plan.json"; then
  printf '%s\n\n⚠️ Le chef de projet n'"'"'a pas pu écrire le plan. [Logs](%s)\n' "$PLAN_MARKER" "$RUN_URL" >"$OUT/plan-comment.md"
  comment "$ISSUE" "$OUT/plan-comment.md"
  set_stage "$ISSUE" factory:blocked
  exit 1
fi

PLAN="$(agent_text "$OUT/plan.json")"
{
  echo "$PLAN_MARKER"
  echo "## 📋 Plan du chef de projet"
  echo
  echo "$PLAN"
  echo
  echo "---"
  echo "**Kevin, à toi :** réponds \`/go\` pour lancer le dev, ou \`/plan\` suivi de tes remarques pour revoir le plan."
  echo
  echo "<sub>[Run]($RUN_URL)</sub>"
} >"$OUT/plan-comment.md"
comment "$ISSUE" "$OUT/plan-comment.md"

if grep -q 'BLOQUANT' <<<"$PLAN"; then
  set_stage "$ISSUE" factory:blocked
else
  set_stage "$ISSUE" factory:plan-ready
fi
log "plan posté sur #$ISSUE"
