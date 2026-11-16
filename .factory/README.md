# 🏭 Usine de dev Harmony

Une équipe d'agents Claude qui bosse sur ce repo 24 h/24 dans GitHub Actions.
Kevin décide, l'équipe exécute.

```
Kevin            Chef de projet          Dev                 Reviewer            Kevin
issue + label ─▶ lit le code, écrit ─▶  /go ─▶ code, tests ─▶ relit le diff ─▶   merge
  `factory`      un plan sur l'issue          gates vertes     contre le plan     ou /fix
                        ▲                         ▲                  │
                   /plan + remarques              └── corrige ◀──────┘ (2 tours max)
```

## Au quotidien

| Tu fais | Où | L'usine fait |
|---|---|---|
| Nouvelle issue avec le modèle **🏭 Tâche pour l'usine** (ou label `factory`) | Issue | Le chef de projet poste un plan |
| `/plan` + tes remarques | Issue | Il revoit le plan |
| `/go` | Issue | Le dev code, les gates tournent, le reviewer relit, une PR s'ouvre |
| `/fix` + tes remarques | PR de l'usine | Le dev corrige, le reviewer relit à nouveau |
| Merge | PR | Rien : c'est toi qui livres |

Tout marche depuis l'app GitHub sur téléphone. Les labels de l'issue disent où on en est :
`factory:plan-ready` → `factory:building` → `factory:in-review` (ou `factory:blocked` si
l'équipe a besoin de toi).

## Les garde-fous

- **Gates** : `bun run check`, `bun run test`, `bun run build` doivent passer, vérifiés par le
  script, pas par la parole de l'agent. 3 essais max, sinon PR en brouillon avec le log.
- **Reviewer indépendant** : contexte neuf, sortie structurée (`approve` / `changes`), ne bloque
  que sur de vrais problèmes. 2 tours de correction max, sinon PR en brouillon.
- **Fichiers protégés** : `.github/`, `.factory/`, `CLAUDE.md`, `.githooks/`. Toute modif de
  l'agent y est annulée et signalée dans la PR.
- **Pas d'accès GitHub pour les agents** : ils lisent et modifient le code, c'est tout. Commits,
  push et PR sont faits par le script.
- **Jamais sur `main`** : une branche `factory/issue-N` par tâche, tu merges.
- **Seul le propriétaire du repo déclenche l'usine** (le repo est public).
- CI (`ci.yml`) sur chaque PR, y compris les tests RLS pgTAP.

## Installation (une fois)

1. Sur ton Mac : `claude setup-token`, copie le jeton.
2. Repo → Settings → Secrets and variables → Actions → **New secret** :
   `CLAUDE_CODE_OAUTH_TOKEN` = le jeton. (Utilise ton abonnement Claude. Alternative :
   `ANTHROPIC_API_KEY`, facturé à l'usage.)
3. Repo → Settings → Actions → General → Workflow permissions : **Read and write** et coche
   **Allow GitHub Actions to create and approve pull requests**.
4. Optionnel, dans **Variables** : `FACTORY_MODEL` (ex. `opus` ou `sonnet`), ou par rôle
   `FACTORY_MODEL_PLANNER`, `FACTORY_MODEL_DEV`, `FACTORY_MODEL_REVIEWER`.

## Régler l'équipe

- Rôles : `.factory/prompts/*.md`. Règles du projet pour tous : `CLAUDE.md`.
- Nombre d'essais : variables d'env `FACTORY_MAX_DEV_TRIES` (3) et `FACTORY_MAX_REVIEW_ROUNDS` (2).
- Traces de chaque run (entrées, sorties, logs des gates) : artefact `factory-<n>` du run.

## En local

Les mêmes scripts tournent sur ton Mac (avec `gh` connecté) :

```bash
.factory/plan.sh 12
.factory/build.sh issue 12
```
