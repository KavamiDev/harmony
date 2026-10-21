# Harmony · Spec V1

## 1. Ce que c'est

Une web app pour les parents séparés qui organisent la vie de leur enfant.
Le cœur : **une adresse mail pour l'enfant** (`lea.k7m2@<domaine>`). L'école, le médecin,
le club écrivent à cette adresse, et **les deux parents reçoivent tout**, au même endroit.
Autour : un calendrier de garde, une messagerie entre parents et un espace documents.

Semaine 01 du défi 52.log (du lundi 19 au dimanche 25 octobre 2026).

Hypothèse : *des parents séparés paieront 19 €/an pour qu'une adresse partagée reçoive
tout ce qui concerne leur enfant.*

## 2. V1

| Fonction | Règle |
|---|---|
| Mail de l'enfant | Une adresse par enfant. Chaque mail reçu est visible par les deux parents. Les pièces jointes autorisées vont dans Documents. |
| Calendrier | Un cycle de garde (préréglages ou cycle libre sur 14 jours) + des rendez-vous. Vue mois et « qui a l'enfant aujourd'hui ». |
| Changements de garde | Un parent propose : des jours ponctuels (« Léa chez moi du 24 au 26 ») ou un nouveau rythme (préréglage ou personnalisé jour par jour). **L'autre parent accepte ou refuse.** Rien ne change sans son accord. Seul dans la famille, le changement s'applique tout de suite. |
| Messagerie | Fil unique entre les deux parents. Horodaté. **Aucune modification ni suppression**, même par l'auteur. |
| Documents | Catégories : école, administratif, activités, autre. **Pas de documents médicaux** en V1 (voir 7). |
| Invitation | Un lien à partager (WhatsApp, SMS, mail). L'autre parent saisit son email, reçoit un code à 6 chiffres, il est dedans. Pas de mot de passe. |
| Abonnement | 19 €/an par famille, deux parents inclus. 14 jours d'essai, sans carte. |
| Notifications | Un mail court à chaque parent quand un mail arrive pour l'enfant, quand l'autre parent écrit (au plus un par demi-heure), quand un changement de garde attend sa réponse ou a reçu une réponse. Chaque type se coupe dans les réglages. |
| Kit « donner l'adresse » | Un texte prêt à envoyer à l'école, au médecin, à une activité, à copier, partager ou ouvrir dans sa messagerie. La version médecin demande de ne pas envoyer de résultats ni d'ordonnances. |
| Agenda | Lien privé par parent (iCal) pour voir la garde et les rendez-vous dans Google Agenda ou Calendrier d'Apple. Révocable. |

Hors V1 : voir `docs/LATER.md`.

## 3. Parcours

1. **Parent A** arrive sur la landing, clique « Commencer », saisit son email, reçoit un code.
2. Il crée la famille : son prénom, le prénom de l'enfant, le cycle de garde. L'adresse de
   l'enfant est générée et affichée avec un bouton « Copier ».
3. Il partage le lien d'invitation (bouton qui ouvre le partage natif du téléphone).
4. **Parent B** ouvre le lien, voit « Camille vous invite sur Harmony pour Léa », saisit son
   email, reçoit un code, il est dans la même famille.
5. Au quotidien : l'accueil montre qui a l'enfant aujourd'hui, les prochains rendez-vous,
   les derniers mails et messages.

## 4. Règles métier (fonctions pures dans `src/lib/`, testées)

- **Changements validés** : un changement ponctuel accepté (`custody_changes`, `kind = override`) passe avant le cycle sur ses jours. S'ils se chevauchent, le plus récemment accepté gagne. Un rythme accepté (`kind = cycle`) remplace `custody_plans`. Personne ne valide sa propre demande, une décision est définitive, l'auteur peut annuler tant que c'est en attente. Au plus 3 mois par changement ponctuel.
- **Cycle de garde** : une chaîne de `A`/`B` répétée à partir d'un lundi d'ancrage.
  Préréglages :

  | id | nom | cycle (lun → dim, sur 14 jours) |
  |---|---|---|
  | `alternate` | Une semaine sur deux | `AAAAAAABBBBBBB` |
  | `2-2-3` | 2-2-3 | `AABBAAABBAABBB` |
  | `2-2-5-5` | 2-2-5-5 | `AABBAAAAABBBBB` |
  | `weekends` | Un week-end sur deux chez B | `AAAABBBAAAAAAA` |

  `custodyOn(plan, date)` → `"A" | "B"`, `custodyRange(plan, from, to)` → jours.
  Les dates sont des jours calendaires (`YYYY-MM-DD`), sans fuseau.
- **Adresse de l'enfant** : `<prénom normalisé>.<4 caractères>`. Minuscules, sans accents ni
  espaces, caractères `a-z0-9`, 2 à 20 lettres pour le prénom. Le suffixe utilise un alphabet
  sans caractères ambigus (`abcdefghjkmnpqrstuvwxyz23456789`). Unique en base.
- **Invitation** : jeton aléatoire de 128 bits encodé en base64url, stocké **haché**
  (SHA-256). Valable 7 jours, un seul usage, 2 parents maximum par famille.
- **Pièces jointes** : PDF, images (JPEG, PNG, HEIC, WebP), Word, Excel, texte.
  10 Mo maximum par fichier. Le reste est ignoré et signalé dans le mail.
- **Abonnement** : `trialing` pendant 14 jours après la création, puis `active` jusqu'à
  `paid_until`, sinon `expired`. Expiré : lecture seule et bandeau de paiement. Les mails
  continuent d'arriver (on ne perd jamais un mail de l'école).

## 5. Architecture

```
Navigateur (PWA, Vite + React)
   │  supabase-js (session, requêtes protégées par RLS, Realtime)
   ▼
Supabase, région UE (Francfort)
   ├─ Auth : connexion par code mail (OTP), sans mot de passe
   ├─ Postgres : tables + RLS (un parent ne voit que sa famille)
   ├─ Storage : bucket privé `documents`, chemins `<family_id>/…`, URLs signées
   ├─ Fonctions SQL : `create_family`, `invite_preview`, `accept_invite`, changements de garde, lien d'agenda
   └─ Edge Functions : `stripe-webhook`, `notify` (envoi des mails), `calendar` (flux iCal)

Notifications
   insertion (mail, message, demande) ──trigger──▶ table `notifications` ──pg_net──▶ `notify`
                                                      réservation atomique, puis Resend (prod) ou Mailpit (local)

Mail entrant
   école ──▶ MX Cloudflare (routage de mails) ──▶ Worker `mail-in`
                parse (postal-mime) ──▶ table `mails` + pièces jointes dans Storage

Paiement
   Stripe Checkout (19 €/an, client_reference_id = family_id)
        ──▶ webhook ──▶ Edge Function ──▶ families.paid_until
```

- Front hébergé sur Cloudflare Pages. Domaine à choisir (environ 10 €/an).
- Le Worker `mail-in` utilise la clé `service_role` de Supabase, stockée en secret du
  Worker. Elle n'apparaît **jamais** côté navigateur.
- L'app n'affiche que la **version texte** des mails (pas de HTML distant, pas de
  pixels de suivi). Les liens restent cliquables.

## 6. Données (`supabase/migrations/`)

| table | colonnes clés | RLS |
|---|---|---|
| `families` | `id`, `name`, `trial_ends_at`, `paid_until` | membres : lecture |
| `members` | `family_id`, `user_id`, `display_name`, `side` (`A`/`B`) | membres : lecture ; ajout via `create_family` / `accept_invite` uniquement |
| `invites` | `token_hash`, `family_id`, `created_by`, `expires_at`, `used_at` | créateur : lecture et ajout |
| `children` | `id`, `family_id`, `first_name`, `mail_local` (unique) | membres : lecture et ajout |
| `custody_plans` | `family_id`, `child_id`, `cycle`, `anchor`, `handover_time` | membres : lecture ; modifié seulement par un changement accepté |
| `custody_changes` | `kind` (`override`/`cycle`), dates et côté ou cycle, `note`, `status`, `proposed_by`, `decided_by` | membres : lecture ; écriture via `propose_override`, `propose_cycle`, `respond_change`, `cancel_change` |
| `events` | `family_id`, `child_id`, `title`, `starts_at`, `ends_at`, `all_day`, `place`, `notes` | membres : tout |
| `messages` | `family_id`, `author_id`, `body`, `created_at` | membres : lecture ; ajout par soi-même ; **ni modification ni suppression** |
| `mails` | `family_id`, `child_id`, `from_addr`, `subject`, `text`, `received_at`, `message_id` (unique) | membres : lecture ; écriture par le Worker uniquement |
| `documents` | `family_id`, `child_id`, `category`, `name`, `path`, `size`, `mime`, `mail_id?` | membres : tout sauf suppression des documents venus d'un mail |

Fonction `is_member(family_id)` en `security definer`, utilisée par toutes les règles.

## 7. Données personnelles

- Hébergement UE uniquement. Données de mineurs : collecte minimale (prénom, pas de nom
  de famille ni de date de naissance en V1).
- **Pas de documents médicaux en V1.** Héberger des données de santé peut exiger un
  hébergeur certifié HDS en France. L'interface le dit, et la catégorie n'existe pas.
- Page « Confidentialité » : quelles données, où, combien de temps, comment tout supprimer.
- Suppression de compte : supprime l'utilisateur. La famille est supprimée quand le
  dernier parent part.

## 8. Écrans

`/` landing · `/connexion` · `/rejoindre/:token` · `/bienvenue` (création de la famille) ·
`/app` accueil · `/app/calendrier` · `/app/mails` · `/app/messages` · `/app/documents` ·
`/app/reglages` (invitation, abonnement, adresse de l'enfant, suppression).

Interface en français, mobile d'abord. Ton calme et neutre : rien qui oppose les parents
(pas de « vous / l'autre », mais les prénoms et une couleur par parent).

## 9. Stack

- Vite + React + TypeScript strict, React Router, Tailwind CSS v4.
- `@supabase/supabase-js`. Supabase CLI + Docker pour le développement local.
- Worker : `postal-mime`, Wrangler.
- Tests : Vitest pour `src/lib/` et le parseur du Worker.
- bun.

## 10. Planning

| Jour | Objectif | Commit |
|---|---|---|
| Lun 19 | Spec, scaffold, logique pure testée, schéma + RLS | `init(#01)` ✅ |
| Mar 20 | Connexion par code, création de famille, invitation de bout en bout | `progress` |
| Mer 21 | Calendrier de garde + rendez-vous, messagerie | `progress` |
| Jeu 22 | Worker mail entrant, documents | `cut` |
| Ven 23 | Abonnement Stripe, landing, page confidentialité | |
| Sam 24 | Domaine, déploiement Cloudflare + Supabase prod, tests réels | |
| Dim 25 | Mise en ligne | `ship(#01)` |

## 11. Terminé quand

- Deux comptes réels dans la même famille via un lien d'invitation, sur téléphone.
- Un mail envoyé depuis Gmail à l'adresse de l'enfant apparaît chez les deux parents
  en moins d'une minute, pièce jointe rangée dans Documents.
- Un parent ne peut lire aucune donnée d'une autre famille (test RLS).
- Un message ne peut être ni modifié ni supprimé (test RLS).
- Paiement Stripe réel de 19 € → famille active pour un an.
