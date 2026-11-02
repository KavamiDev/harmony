-- Hosted projects do not enable pg_net by default; the notification triggers need it.
create extension if not exists pg_net;
