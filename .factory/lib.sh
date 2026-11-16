#!/usr/bin/env bash
# Shared helpers for the Harmony dev factory. Sourced by plan.sh and build.sh.
# Needs: git, gh, jq, bun, claude (Claude Code CLI). Works in GitHub Actions and on a laptop.
set -euo pipefail

FACTORY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(git -C "$FACTORY_DIR" rev-parse --show-toplevel)"
OUT="$ROOT/.factory-out"
mkdir -p "$OUT"
cd "$ROOT"

REPO="${GITHUB_REPOSITORY:-$(gh repo view --json nameWithOwner -q .nameWithOwner)}"
BASE_BRANCH="${FACTORY_BASE_BRANCH:-$(gh repo view "$REPO" --json defaultBranchRef -q .defaultBranchRef.name)}"
PLAN_MARKER='<!-- factory:plan -->'
RUN_URL="${GITHUB_SERVER_URL:-https://github.com}/${REPO}/actions/runs/${GITHUB_RUN_ID:-local}"

log() { printf '\n\033[1;36m[factory]\033[0m %s\n' "$*" >&2; }

# Paths the dev agent may never change. Reverted after every dev pass.
PROTECTED_PATHS=(.github .factory CLAUDE.md .githooks)

# run_agent <role> <tools> <max_turns> <input_file> <output_json> [json_schema_file]
# role = planner | dev | reviewer (prompt in .factory/prompts/<role>.md)
# The agent never sees GitHub credentials: it can read and edit the checkout, nothing more.
run_agent() {
  local role=$1 tools=$2 turns=$3 input=$4 out=$5 schema=${6:-}
  local model_var="FACTORY_MODEL_$(echo "$role" | tr '[:lower:]' '[:upper:]')"
  local model="${!model_var:-${FACTORY_MODEL:-}}"
  local args=(
    -p
    --output-format json
    --max-turns "$turns"
    --permission-mode dontAsk
    --allowedTools "$tools"
    --append-system-prompt-file "$FACTORY_DIR/prompts/$role.md"
  )
  [[ -n "$model" ]] && args+=(--model "$model")
  [[ -n "$schema" ]] && args+=(--json-schema "$(jq -c . "$schema")")

  log "agent $role (max $turns tours${model:+, modèle $model})"
  local status=0
  env -u GH_TOKEN -u GITHUB_TOKEN -u FACTORY_GH_TOKEN \
    claude "${args[@]}" <"$input" >"$out" 2>"$out.stderr" || status=$?

  if ! jq -e . "$out" >/dev/null 2>&1; then
    log "agent $role: sortie illisible (code $status)"
    cat "$out.stderr" >&2 || true
    return 1
  fi
  jq -r '"tours: \(.num_turns // "?") · durée: \((.duration_ms // 0) / 1000 | floor)s · coût API: $\(.total_cost_usd // 0)"' "$out" >&2
  if [[ "$(jq -r '.is_error // false' "$out")" == "true" ]]; then
    log "agent $role en erreur: $(jq -r '.result // ""' "$out" | head -c 500)"
    return 1
  fi
}

# Text answer of an agent run.
agent_text() { jq -r '.result // ""' "$1"; }

# Structured answer (with --json-schema). Falls back to a JSON block inside .result.
agent_json() {
  local f=$1
  if jq -e '.structured_output | type == "object"' "$f" >/dev/null 2>&1; then
    jq '.structured_output' "$f"
    return
  fi
  jq -r '.result // ""' "$f" | node -e '
    let s = require("fs").readFileSync(0, "utf8");
    const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence) s = fence[1];
    const a = s.indexOf("{"), b = s.lastIndexOf("}");
    process.stdout.write(JSON.stringify(JSON.parse(s.slice(a, b + 1))));
  '
}

# Runs the same checks as CI. Writes the log to $OUT/gates.log. Returns non-zero on failure.
gates() {
  [[ -f .env.local || -f .env ]] || cp .env.example .env.local
  local ok=0
  : >"$OUT/gates.log"
  for step in check test build; do
    log "gate: bun run $step"
    if ! bun run "$step" >>"$OUT/gates.log" 2>&1; then
      echo "=== bun run $step : ÉCHEC ===" >>"$OUT/gates.log"
      ok=1
      break
    fi
    echo "=== bun run $step : OK ===" >>"$OUT/gates.log"
  done
  return $ok
}

# Undo any change the dev agent made to protected paths.
restore_protected() {
  local touched
  touched="$(git status --porcelain -- "${PROTECTED_PATHS[@]}" | awk '{print $2}')"
  if [[ -n "$touched" ]]; then
    log "fichiers protégés modifiés par l'agent, annulé: $touched"
    git checkout HEAD -- "${PROTECTED_PATHS[@]}" 2>/dev/null || true
    git clean -fdq -- "${PROTECTED_PATHS[@]}"
    echo "$touched"
  fi
}

ensure_labels() {
  gh label create factory --color 5319e7 --description "Tâche pour l'usine de dev" --force -R "$REPO" >/dev/null
  gh label create factory:plan-ready --color fbca04 --description "Plan prêt, en attente de /go" --force -R "$REPO" >/dev/null
  gh label create factory:building --color 1d76db --description "Les agents codent" --force -R "$REPO" >/dev/null
  gh label create factory:in-review --color 0e8a16 --description "PR prête pour Kevin" --force -R "$REPO" >/dev/null
  gh label create factory:blocked --color d93f0b --description "L'usine a besoin de Kevin" --force -R "$REPO" >/dev/null
}

# set_stage <issue> <label>: keeps exactly one factory:* stage label on the issue.
set_stage() {
  local issue=$1 label=$2 l
  for l in factory:plan-ready factory:building factory:in-review factory:blocked; do
    [[ "$l" == "$label" ]] && continue
    gh issue edit "$issue" -R "$REPO" --remove-label "$l" >/dev/null 2>&1 || true
  done
  gh issue edit "$issue" -R "$REPO" --add-label "$label" >/dev/null
}

comment() { gh issue comment "$1" -R "$REPO" --body-file "$2" >/dev/null; }
