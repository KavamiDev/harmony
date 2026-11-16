#!/usr/bin/env bash
# Dev + Reviewer loop. Implements the approved plan of an issue, reviews it, opens a PR.
# Usage:
#   .factory/build.sh issue <issue-number>              after Kevin's /go on the issue
#   .factory/build.sh fix <pr-number> <feedback-file>   after Kevin's /fix on a factory PR
source "$(dirname "$0")/lib.sh"

MODE=${1:?usage: build.sh issue <n> | fix <pr> <feedback-file>}
NUM=${2:?missing number}
KEVIN_FEEDBACK=${3:-}
MAX_DEV_TRIES=${FACTORY_MAX_DEV_TRIES:-3}         # dev attempts to get the gates green
MAX_REVIEW_ROUNDS=${FACTORY_MAX_REVIEW_ROUNDS:-2} # reviewer -> dev fix rounds
DEV_TOOLS="Read,Edit,Write,Glob,Grep,Bash(bun:*),Bash(bunx:*),Bash(git status:*),Bash(git diff:*),Bash(git log:*),Bash(git show:*),Bash(ls:*),Bash(mkdir:*),Bash(cat:*),Bash(grep:*),Bash(find:*)"
REVIEW_TOOLS="Read,Glob,Grep,Bash(git diff:*),Bash(git log:*),Bash(git show:*),Bash(ls:*)"

ensure_labels
git config user.name "harmony-factory[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
git fetch -q origin "$BASE_BRANCH"

# ---------------------------------------------------------------- where we work
if [[ "$MODE" == issue ]]; then
  ISSUE=$NUM
  BRANCH="factory/issue-$ISSUE"
elif [[ "$MODE" == fix ]]; then
  PR=$NUM
  BRANCH="$(gh pr view "$PR" -R "$REPO" --json headRefName -q .headRefName)"
  if [[ "$BRANCH" != factory/issue-* ]]; then
    echo "L'usine ne retouche que ses propres PR (branches \`factory/issue-*\`)." >"$OUT/msg.md"
    comment "$PR" "$OUT/msg.md"
    exit 1
  fi
  ISSUE="${BRANCH#factory/issue-}"
else
  echo "mode inconnu: $MODE" >&2; exit 2
fi

if git ls-remote --exit-code --heads origin "$BRANCH" >/dev/null; then
  git fetch -q origin "$BRANCH"
  git checkout -q -B "$BRANCH" "origin/$BRANCH"
else
  git checkout -q -B "$BRANCH" "origin/$BASE_BRANCH"
fi
PR="${PR:-$(gh pr list -R "$REPO" --head "$BRANCH" --state open --json number -q '.[0].number // empty')}"

# ---------------------------------------------------------------- the plan
gh issue view "$ISSUE" -R "$REPO" --json title,body,comments >"$OUT/issue.json"
TITLE="$(jq -r .title "$OUT/issue.json")"
jq -r --arg m "$PLAN_MARKER" '[.comments[] | select(.body | contains($m))] | last | .body // ""' "$OUT/issue.json" \
  | sed "/$PLAN_MARKER/d; /^\*\*Kevin, à toi/,\$d" >"$OUT/spec.md"
if [[ ! -s "$OUT/spec.md" ]]; then
  echo "⚠️ Pas de plan sur cette issue. Ajoute le label \`factory\` ou commente \`/plan\` d'abord." >"$OUT/msg.md"
  comment "$ISSUE" "$OUT/msg.md"
  exit 1
fi

set_stage "$ISSUE" factory:building
printf '🏗️ Le dev attaque%s. [Suivre le run](%s)\n' "$([[ $MODE == fix ]] && echo " tes retours sur #$PR")" "$RUN_URL" >"$OUT/msg.md"
comment "$ISSUE" "$OUT/msg.md"

: >"$OUT/protected.txt"

# ---------------------------------------------------------------- dev pass
# dev_pass <feedback-file|"">: dev agent until gates pass or MAX_DEV_TRIES is reached.
dev_pass() {
  local fb=$1 try
  for ((try = 1; try <= MAX_DEV_TRIES; try++)); do
    {
      echo "# Tâche : $TITLE (issue #$ISSUE)"
      echo
      echo "## Spec validée par Kevin"
      cat "$OUT/spec.md"
      echo
      echo "## Demande d'origine"
      jq -r '.body // ""' "$OUT/issue.json"
      if ! git diff --quiet "origin/$BASE_BRANCH" HEAD || ! git diff --quiet; then
        echo
        echo "## Travail déjà fait"
        echo "Le travail précédent est déjà dans l'arbre de travail (\`git diff origin/$BASE_BRANCH\`). Pars de là, ne recommence pas de zéro."
      fi
      if [[ -n "$fb" && -s "$fb" ]]; then
        echo
        echo "## Retours à traiter (prioritaires)"
        cat "$fb"
      fi
    } >"$OUT/dev-input.md"

    run_agent dev "$DEV_TOOLS" 120 "$OUT/dev-input.md" "$OUT/dev.json" || true
    agent_text "$OUT/dev.json" >"$OUT/dev-summary.md" 2>/dev/null || true
    restore_protected >>"$OUT/protected.txt" || true

    if gates; then
      log "gates OK (essai $try)"
      return 0
    fi
    log "gates en échec (essai $try/$MAX_DEV_TRIES)"
    {
      echo "La CI locale échoue. Corrige la cause, sans désactiver ni affaiblir de test. Fin du log :"
      echo '```'
      tail -n 150 "$OUT/gates.log"
      echo '```'
    } >"$OUT/gates-feedback.md"
    fb="$OUT/gates-feedback.md"
  done
  return 1
}

commit_all() {
  git add -A
  git diff --cached --quiet && return 1
  git commit -q -m "$1" -m "Issue #$ISSUE · usine de dev"
}

review() {
  {
    echo "# Revue : $TITLE (issue #$ISSUE)"
    echo
    echo "Base : \`origin/$BASE_BRANCH\`. Diff à relire : \`git diff origin/$BASE_BRANCH...HEAD\`."
    echo
    echo "## Spec validée par Kevin"
    cat "$OUT/spec.md"
    echo
    echo "## Résumé du développeur (à vérifier, pas à croire)"
    cat "$OUT/dev-summary.md" 2>/dev/null || true
  } >"$OUT/review-input.md"
  if run_agent reviewer "$REVIEW_TOOLS" 60 "$OUT/review-input.md" "$OUT/review-run.json" "$FACTORY_DIR/review-schema.json" \
    && agent_json "$OUT/review-run.json" >"$OUT/review.json" 2>/dev/null \
    && jq -e '.verdict' "$OUT/review.json" >/dev/null; then
    jq -r .verdict "$OUT/review.json"
  else
    echo '{"verdict":"error","summary":"Le reviewer n'"'"'a pas rendu de verdict exploitable.","blocking":[],"suggestions":[]}' >"$OUT/review.json"
    echo error
  fi
}

# ---------------------------------------------------------------- the loop
GATES_OK=false
dev_pass "$KEVIN_FEEDBACK" && GATES_OK=true
if [[ $MODE == fix ]]; then
  commit_all "fix: retours de Kevin" || true
else
  commit_all "feat: $TITLE (#$ISSUE)" || true
fi

if git diff --quiet "origin/$BASE_BRANCH" HEAD; then
  { echo "⚠️ Le dev n'a produit aucun changement."; echo; cat "$OUT/dev-summary.md" 2>/dev/null; echo; echo "[Logs]($RUN_URL)"; } >"$OUT/msg.md"
  comment "$ISSUE" "$OUT/msg.md"
  set_stage "$ISSUE" factory:blocked
  exit 1
fi

VERDICT=skipped
ROUND=0
if $GATES_OK; then
  while :; do
    VERDICT="$(review)"
    log "verdict du reviewer: $VERDICT (tour $ROUND)"
    [[ "$VERDICT" == approve || "$VERDICT" == error ]] && break
    ((ROUND >= MAX_REVIEW_ROUNDS)) && break
    ROUND=$((ROUND + 1))
    {
      echo "Le reviewer demande des changements :"
      jq -r '.blocking[] | "- **\(.where)** : \(.problem)\n  Correction attendue : \(.fix)"' "$OUT/review.json"
    } >"$OUT/review-feedback.md"
    GATES_OK=false
    dev_pass "$OUT/review-feedback.md" && GATES_OK=true
    commit_all "fix: retours du reviewer (tour $ROUND)" || true
    $GATES_OK || break
  done
fi

# ---------------------------------------------------------------- deliver
git push -q -u origin "$BRANCH"

READY=false
[[ $GATES_OK == true && $VERDICT == approve ]] && READY=true

{
  echo "Closes #$ISSUE"
  echo
  echo "## 🤖 Usine de dev"
  echo
  echo "| Étape | Résultat |"
  echo "|---|---|"
  echo "| Gates (check, test, build) | $($GATES_OK && echo "✅ vert" || echo "❌ rouge") |"
  case $VERDICT in
    approve) echo "| Reviewer | ✅ approuvé |" ;;
    changes) echo "| Reviewer | ⚠️ changements encore demandés |" ;;
    skipped) echo "| Reviewer | ⏭️ pas lancé (gates rouges) |" ;;
    *) echo "| Reviewer | ❓ pas de verdict |" ;;
  esac
  echo "| Tours de correction | $ROUND / $MAX_REVIEW_ROUNDS |"
  echo
  echo "### Ce que le dev a fait"
  cat "$OUT/dev-summary.md" 2>/dev/null || echo "_pas de résumé_"
  echo
  if [[ -s "$OUT/review.json" ]]; then
    echo "### Avis du reviewer"
    jq -r '.summary' "$OUT/review.json"
    if jq -e '.blocking | length > 0' "$OUT/review.json" >/dev/null; then
      echo
      echo "**Points bloquants restants**"
      jq -r '.blocking[] | "- **\(.where)** : \(.problem) → \(.fix)"' "$OUT/review.json"
    fi
    if jq -e '.suggestions | length > 0' "$OUT/review.json" >/dev/null; then
      echo
      echo "<details><summary>Suggestions non bloquantes</summary>"
      echo
      jq -r '.suggestions[] | "- \(.)"' "$OUT/review.json"
      echo
      echo "</details>"
    fi
    echo
  fi
  if ! $GATES_OK; then
    echo "<details><summary>Fin du log des gates</summary>"
    echo
    echo '```'
    tail -n 80 "$OUT/gates.log"
    echo '```'
    echo "</details>"
    echo
  fi
  if [[ -s "$OUT/protected.txt" ]]; then
    echo "> ⚠️ L'agent a tenté de modifier des fichiers protégés, changements annulés : $(sort -u "$OUT/protected.txt" | tr '\n' ' ')"
    echo
  fi
  echo "<details><summary>Plan suivi</summary>"
  echo
  cat "$OUT/spec.md"
  echo
  echo "</details>"
  echo
  echo "---"
  echo "**Kevin, à toi :** merge si c'est bon. Sinon commente \`/fix\` suivi de ce qui ne va pas."
  echo
  echo "<sub>[Run]($RUN_URL)</sub>"
} >"$OUT/pr-body.md"

if [[ -z "$PR" ]]; then
  draft=()
  $READY || draft=(--draft)
  gh pr create -R "$REPO" --base "$BASE_BRANCH" --head "$BRANCH" --title "$TITLE" \
    --body-file "$OUT/pr-body.md" --label factory "${draft[@]}" >"$OUT/pr-url.txt"
  PR="$(gh pr view "$BRANCH" -R "$REPO" --json number -q .number)"
else
  gh pr edit "$PR" -R "$REPO" --body-file "$OUT/pr-body.md" >/dev/null
  if $READY; then gh pr ready "$PR" -R "$REPO" >/dev/null 2>&1 || true
  else gh pr ready "$PR" -R "$REPO" --undo >/dev/null 2>&1 || true; fi
  cp "$OUT/pr-body.md" "$OUT/pr-comment.md"
  comment "$PR" "$OUT/pr-comment.md"
fi

if $READY; then
  set_stage "$ISSUE" factory:in-review
  printf '✅ PR #%s prête pour toi : gates vertes, reviewer d'"'"'accord.\n' "$PR" >"$OUT/msg.md"
else
  set_stage "$ISSUE" factory:blocked
  printf '⚠️ PR #%s ouverte en brouillon : l'"'"'équipe n'"'"'a pas réussi à tout boucler seule. Détails dans la PR.\n' "$PR" >"$OUT/msg.md"
fi
comment "$ISSUE" "$OUT/msg.md"

# Pushes made with the workflow token do not trigger other workflows, workflow_dispatch does.
gh workflow run factory-ci.yml -R "$REPO" --ref "$BRANCH" >/dev/null 2>&1 || log "CI non déclenchée (factory-ci.yml absent ?)"
log "terminé: PR #$PR (prête: $READY)"
