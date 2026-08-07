-- Complete livestream editorial fields for the public live page.

alter table public.livestreams
  add column if not exists speaker_name text,
  add column if not exists scripture_reference text,
  add column if not exists thumbnail_id uuid references public.media_files(id) on delete set null,
  add column if not exists thumbnail_url text,
  add column if not exists offline_message text;

comment on column public.livestreams.speaker_name is
  'Public speaker name entered by the editorial team.';
comment on column public.livestreams.scripture_reference is
  'Bible verse or scripture reference for the livestream.';
comment on column public.livestreams.thumbnail_id is
  'Optional uploaded thumbnail stored in media_files.';
comment on column public.livestreams.thumbnail_url is
  'Public thumbnail URL used by the website and social preview.';
comment on column public.livestreams.offline_message is
  'Message displayed when the stream is not currently live.';

create index if not exists idx_livestreams_public_schedule
  on public.livestreams(status, live_status, starts_at)
  where deleted_at is null;
