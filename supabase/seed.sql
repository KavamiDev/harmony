-- Local development only: where the DB triggers send notifications.
-- The secret must match NOTIFY_SECRET in supabase/functions/.env (set it after `supabase db reset`).
insert into private.config (key, value) values
  ('notify_url', 'http://supabase_kong_harmony:8000/functions/v1/notify')
on conflict (key) do nothing;
