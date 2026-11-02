# Mise en ligne d'Harmony

Ordre conseillé. **Toi** = compte à créer ou action dans un dashboard. **Moi** = commandes et
configuration que je peux faire une fois les accès en place. Aucun secret ne va dans le repo :
ils vont dans les secrets Supabase, Cloudflare ou dans les `.env` ignorés par git.

## 0. Avant tout (Toi)

- [ ] **Statut légal** pour encaisser (micro-entreprise : SIRET). Stripe le demande pour le mode live.
- [ ] **Choisir le domaine**. Libres au 22/10/2026 : `harmonyfamille.fr`, `harmony-famille.fr`,
      `monharmony.fr`, `harmony-parents.fr`, `getharmony.fr`, `harmonyfamille.com`.
      `harmony.fr` est pris.

## 1. Domaine + Cloudflare (Toi, ~15 min)

- [ ] Créer le compte Cloudflare.
- [ ] Acheter le domaine. Le `.fr` ne se vend pas chez Cloudflare : l'acheter chez OVH ou Gandi
      (~8-12 €/an), puis **mettre les serveurs DNS de Cloudflare** chez le registrar
      (Cloudflare › Ajouter un site › il donne les 2 noms de serveurs). Un `.com` peut s'acheter
      directement chez Cloudflare.
- [ ] Attendre que Cloudflare affiche le domaine « Actif ».

## 2. Supabase production (Toi : le projet · Moi : le reste)

- [ ] **Toi** : créer le projet sur supabase.com, région **Europe Central (Frankfurt)**.
      Le plan gratuit suffit pour démarrer. Attention : il se met en pause après 7 jours sans
      aucune activité. Passer en Pro (25 $/mois) dès qu'il y a des clients payants.
      Je peux aussi le créer pour toi depuis ici si tu me donnes le feu vert.
- [ ] **Moi** : `supabase link`, puis `supabase db push` (toutes les migrations, RLS comprises).
- [ ] **Moi** : réglages Auth : Site URL `https://<domaine>`, URL de redirection, connexion par
      code mail, modèle du mail « Votre code Harmony » (`supabase config push`).
- [ ] **Moi** : `private.config` : `notify_url = https://<ref>.supabase.co/functions/v1/notify`
      et `notify_secret` (aléatoire, identique au secret de la fonction).
- [ ] **Moi** : déployer les fonctions `notify`, `calendar` et `stripe-webhook`
      (`supabase functions deploy`) et leurs secrets (`supabase secrets set`) :
      `NOTIFY_SECRET`, `APP_URL`, `MAIL_FROM`, `RESEND_API_KEY`, `STRIPE_WEBHOOK_SECRET`.

## 3. Resend : les mails sortants (Toi : compte + DNS · Moi : config)

- [ ] **Toi** : créer le compte resend.com, ajouter le domaine, puis copier dans Cloudflare › DNS
      les enregistrements qu'il donne (DKIM, SPF du sous-domaine d'envoi). Attendre « Verified ».
- [ ] **Toi** : créer une clé API (« Sending access »). Ne pas la coller dans le chat : on la met
      directement dans les secrets.
- [ ] **Moi** : `RESEND_API_KEY` dans les secrets des fonctions (notifications), et le SMTP de
      Resend dans Supabase Auth (codes de connexion) : hôte `smtp.resend.com`, port 465,
      utilisateur `resend`, mot de passe = la clé API. **Indispensable** : le SMTP par défaut de
      Supabase n'envoie que quelques mails par heure, aux membres de l'équipe uniquement.

## 4. Réception des mails de l'enfant (Toi : 2 clics · Moi : le Worker)

- [ ] **Moi** : `wrangler deploy` du Worker `harmony-mail-in` avec `MAIL_DOMAIN` = le domaine, et
      ses secrets `SUPABASE_URL` + `SUPABASE_SECRET_KEY` (clé secrète du projet prod).
- [ ] **Toi** : Cloudflare › Email › Email Routing › Activer (il ajoute les MX).
- [ ] **Toi** : une adresse personnalisée `contact@<domaine>` → ta boîte perso (pour le support et le RGPD).
- [ ] **Toi** : règle **catch-all** → « Envoyer au Worker » → `harmony-mail-in`.

## 5. Le site : Cloudflare Pages (Toi : connecter le repo · Moi : vérifier)

- [ ] **Toi** : Cloudflare › Workers & Pages › Créer › Pages › connecter `KavamiDev/harmony`.
      Build : `bun run build`, dossier `dist`.
- [ ] **Toi** : variables d'environnement (non secrètes) : `VITE_SUPABASE_URL`,
      `VITE_SUPABASE_KEY` (clé publishable), `VITE_MAIL_DOMAIN`, `VITE_STRIPE_PAYMENT_LINK`.
- [ ] **Toi** : domaine personnalisé → `<domaine>` (et `www`).
- [ ] **Moi** : `gh repo edit --homepage https://<domaine>` : la carte du projet sur 12.log
      pointera vers le site.

## 6. Stripe (Toi)

- [ ] **Mode test d'abord** : produit « Harmony · abonnement famille », 19 €/an récurrent,
      Payment Link (quantité fixe, redirection vers `https://<domaine>/app/reglages`),
      webhook vers `https://<ref>.supabase.co/functions/v1/stripe-webhook` avec les événements
      `checkout.session.completed` et `invoice.paid`. Payer avec la carte 4242 4242 4242 4242.
- [ ] **Puis live** : activer le compte (SIRET, IBAN), refaire produit, lien et webhook en live,
      mettre le nouveau secret du webhook et le nouveau lien (`VITE_STRIPE_PAYMENT_LINK`).

## 7. Textes légaux (Moi : brouillon · Toi : relecture)

- [ ] **Mentions légales** : éditeur, SIRET, hébergeurs. Obligatoires en France.
- [ ] **Conditions générales de vente** : prix, renouvellement annuel, résiliation, droit de
      rétractation pour un service numérique.
- [ ] Remplacer `contact@harmony.fr` par la vraie adresse (automatique via `VITE_MAIL_DOMAIN`).
- [ ] Faire relire la confidentialité, les mentions et les CGV par quelqu'un de compétent.

## 8. Recette sur vrais appareils (Toi + Moi)

- [ ] Deux vrais comptes sur deux téléphones, invitation par WhatsApp.
- [ ] Un mail envoyé depuis Gmail à l'adresse de l'enfant → visible chez les deux en moins
      d'une minute, pièce jointe dans Documents, notification reçue par les deux.
- [ ] Un message, une demande de changement acceptée : notifications reçues.
- [ ] Lien d'agenda ajouté dans Google Agenda et dans Calendrier sur iPhone.
- [ ] Paiement test, puis un vrai paiement de 19 € remboursé.
- [ ] Installer l'app sur l'écran d'accueil (iPhone et Android).
- [ ] Puis `ship(#01)` avec `Demo`, `Price: 19 EUR` et `Hours`.

## Coûts

Domaine ~10 €/an. Cloudflare, Resend (3 000 mails/mois), Supabase (plan gratuit) : 0 € au
départ. Stripe : ~1,5 % + 0,25 € par paiement européen. Supabase Pro : 25 $/mois quand il y a
des clients.
