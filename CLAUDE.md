# Harmony · règles pour les agents

Harmony est une web app pour parents séparés : une adresse mail par enfant, un calendrier
de garde, une messagerie, des documents. La spec fait foi : `docs/SPEC.md`. Ce qui est
repoussé : `docs/LATER.md`. Lis la section de la spec qui concerne ta tâche avant de coder.

## Stack

- Vite + React 19 + TypeScript strict (`noUncheckedIndexedAccess`), React Router, Tailwind CSS v4.
- Supabase : Postgres + RLS, Auth par code mail, Storage, Edge Functions (Deno) dans `supabase/functions/`.
- Worker Cloudflare `workers/mail-in/` (mail entrant).
- Gestionnaire de paquets : **bun**. Jamais npm, yarn ou pnpm.

## Commandes

```bash
bun install
bun run check      # TypeScript, doit passer
bun run test       # Vitest, doit passer
bun run build      # tsc + vite build, doit passer
```

Les tests pgTAP (`bun run test:db`) demandent Docker et Supabase local : ils tournent en CI.

## Où va quoi

- Règles métier : fonctions **pures** dans `src/lib/`, avec un fichier `*.test.ts` à côté.
  Toute nouvelle règle métier a ses tests. Toute correction de bug a un test qui échouait avant.
- Pages : `src/pages/`. Composants partagés : `src/components/` (`ui.tsx` pour les briques de base).
- Accès base : via `src/lib/supabase.ts`. Types générés : `src/lib/database.types.ts`.
- Edge Functions : la logique testable va dans `logic.ts` à côté de `index.ts`.
- Schéma : une **nouvelle** migration datée dans `supabase/migrations/` (format
  `AAAAMMJJHHMMSS_nom.sql`). Ne modifie jamais une migration existante.
  Toute table a sa RLS, testée dans `supabase/tests/database/`.

## Règles non négociables

- Un parent ne voit jamais les données d'une autre famille. Toute requête passe par la RLS.
- Les messages ne se modifient ni ne se suppriment, même par leur auteur.
- Pas de données médicales (pas de catégorie santé, pas de champ santé).
- La clé `service_role` / `SUPABASE_SECRET_KEY` n'apparaît jamais côté navigateur.
- Les mails s'affichent en texte seul, jamais en HTML distant.
- Dates de garde : jours calendaires `YYYY-MM-DD`, sans fuseau.

## Style

- Interface en français, mobile d'abord, ton calme et neutre : on nomme les parents par leur
  prénom, jamais « vous / l'autre ».
- Code et noms de variables en anglais, comme l'existant.
- Petits changements ciblés. Pas de refacto hors sujet, pas de nouvelle dépendance sans raison
  écrite dans la PR.
- Pas de `any`, pas de `@ts-ignore`, pas de test désactivé (`.skip`, `.only`) pour faire passer la CI.

## Commits

Le hook `.githooks/commit-msg` réserve les sujets `init|progress|cut|ship|verdict` aux jalons
de 12.log. **Les agents ne les utilisent jamais.** Utilise `feat:`, `fix:`, `test:`, `chore:`, `docs:`.

## Usine de dev

Ce repo est travaillé par des agents (`.factory/`). Si tu es l'un d'eux, ton rôle et tes
limites sont dans ton prompt. Tu ne pousses rien, tu ne merges rien : Kevin a le dernier mot.
