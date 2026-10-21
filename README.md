# Harmony

Week 01 of [52.log](https://kavamidev.github.io/52-log/): one paid product a week.

## Milestone commits

Only these appear on 52.log (the `commit-msg` hook checks them):

```
init(#01): <idea>        trailers: Name / For / Problem / Hypothesis / Scope / Price
progress: <what works>
cut: <what leaves V1>
ship: <it is live>            trailers: Demo / Video / Price: 5 EUR / Hours: 7
verdict: <numbers>            trailers: Visitors / Signups / Paying / Revenue: 15 EUR / Lesson
```

Trailers go in the last paragraph, one `Key: value` per line.

## Deploy

Hosting is chosen per project. With Cloudflare Pages: set the repo variable
`CLOUDFLARE_ACCOUNT_ID` and the secret `CLOUDFLARE_API_TOKEN`, and every push to `main`
deploys `public/` (or `$DEPLOY_DIR`, after `bun run build` if any). Without them,
`deploy.yml` stays idle. Put the live URL in the repo Website field so 52.log links to it.

## Develop

```bash
bun install
supabase start        # local Postgres, Auth, Storage (Docker)
bun run dev           # http://127.0.0.1:5173
bun run test          # Vitest: custody cycles, child address, invites, attachments
bun run test:db       # pgTAP: RLS (family isolation, append-only messages)
bun run check         # TypeScript
```

### Child's mail (Cloudflare Email Worker)

`workers/mail-in/` receives every mail sent to `<child>.<xxxx>@<domain>`, stores it in
`mails` and files the accepted attachments in Documents. Logic in `handle.ts` (tested),
Supabase access in `index.ts` with the service key (Worker secret only).

Local test: put `SUPABASE_URL` and `SUPABASE_SECRET_KEY` (from `supabase status`) in
`workers/mail-in/.dev.vars` (gitignored), then:

```bash
bun run mail:dev
curl -X POST "http://127.0.0.1:8787/cdn-cgi/handler/email?from=school@example.org&to=lea.xxxx@harmony.fr" --data-binary @mail.eml
```

### Notifications and calendar feed (Edge Functions)

```bash
bun run functions:dev   # notify (notification mails), calendar (iCal feed), stripe-webhook
```

`supabase/functions/.env` (gitignored) holds `NOTIFY_SECRET`, `APP_URL`, `MAIL_FROM` and, locally,
`MAILPIT_URL=http://supabase_inbucket_harmony:8025`: notification mails then show up in
Mailpit. In production set `RESEND_API_KEY` instead. The database finds the function through
`private.config` (`notify_url`, `notify_secret`): after `supabase db reset`, insert the secret
again so it matches `NOTIFY_SECRET`.

Spec: `docs/SPEC.md` · Later: `docs/LATER.md`
