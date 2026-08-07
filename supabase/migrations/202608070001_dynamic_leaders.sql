-- Dynamic church leadership module.
-- Adds public profile fields used by the admin form and the About page.

alter table public.leaders
  add column if not exists period text,
  add column if not exists phone text,
  add column if not exists email text,
  add column if not exists photo_url text;

create index if not exists idx_leaders_public_display
  on public.leaders(display_order asc, name asc)
  where deleted_at is null and is_public = true and status = 'published';

comment on column public.leaders.period is
  'Optional service period displayed publicly, for example 2026–2028.';
comment on column public.leaders.phone is
  'Optional public contact number. Leave blank when it should not be published.';
comment on column public.leaders.email is
  'Optional public email address. Leave blank when it should not be published.';
comment on column public.leaders.photo_url is
  'Public URL of the leader photo stored in Supabase Storage.';
