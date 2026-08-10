-- Patch 5 — Upload, public-form and production rate-limit hardening
-- Adds a distributed database-backed limiter, tightens Storage policies, and
-- keeps public/admin input protection consistent across serverless instances.

-- ---------------------------------------------------------------------------
-- 1. Distributed rate limiting (service-role only)
-- ---------------------------------------------------------------------------

create table if not exists public.security_rate_limits (
  key_hash text primary key,
  request_count integer not null default 0 check (request_count >= 0),
  window_started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  updated_at timestamptz not null default now(),
  constraint security_rate_limits_key_hash_check
    check (key_hash ~ '^[a-f0-9]{64}$')
);

create index if not exists security_rate_limits_expires_at_idx
  on public.security_rate_limits(expires_at);

alter table public.security_rate_limits enable row level security;
revoke all on table public.security_rate_limits from public, anon, authenticated;

create or replace function public.consume_rate_limit(
  p_key_hash text,
  p_limit integer,
  p_window_seconds integer
)
returns table (
  allowed boolean,
  remaining integer,
  reset_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_count integer;
  v_reset timestamptz;
begin
  if p_key_hash is null or p_key_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid rate-limit key';
  end if;

  if p_limit < 1 or p_limit > 10000 then
    raise exception 'invalid rate-limit limit';
  end if;

  if p_window_seconds < 1 or p_window_seconds > 86400 then
    raise exception 'invalid rate-limit window';
  end if;

  insert into public.security_rate_limits as current_limit (
    key_hash,
    request_count,
    window_started_at,
    expires_at,
    updated_at
  )
  values (
    p_key_hash,
    1,
    v_now,
    v_now + make_interval(secs => p_window_seconds),
    v_now
  )
  on conflict (key_hash) do update
  set
    request_count = case
      when current_limit.expires_at <= v_now then 1
      else current_limit.request_count + 1
    end,
    window_started_at = case
      when current_limit.expires_at <= v_now then v_now
      else current_limit.window_started_at
    end,
    expires_at = case
      when current_limit.expires_at <= v_now
        then v_now + make_interval(secs => p_window_seconds)
      else current_limit.expires_at
    end,
    updated_at = v_now
  returning request_count, expires_at
  into v_count, v_reset;

  return query
  select
    v_count <= p_limit,
    greatest(p_limit - v_count, 0),
    v_reset;
end;
$$;

revoke all on function public.consume_rate_limit(text, integer, integer) from public;
revoke all on function public.consume_rate_limit(text, integer, integer) from anon;
revoke all on function public.consume_rate_limit(text, integer, integer) from authenticated;
grant execute on function public.consume_rate_limit(text, integer, integer) to service_role;

comment on table public.security_rate_limits is
  'Hashed, non-content rate-limit counters used by trusted server routes.';
comment on function public.consume_rate_limit(text, integer, integer) is
  'Atomic fixed-window rate limiter. Callable only with the service role.';

-- ---------------------------------------------------------------------------
-- 2. Storage bucket restrictions
-- ---------------------------------------------------------------------------

update storage.buckets
set
  file_size_limit = 10485760,
  allowed_mime_types = array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf'
  ]::text[]
where id = 'public-media';

update storage.buckets
set
  file_size_limit = 10485760,
  allowed_mime_types = array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf'
  ]::text[]
where id = 'private-documents';

-- Remove broad legacy write policies. All Storage writes now go through the
-- authenticated Next.js server routes, which verify role/permission, rate
-- limits, MIME type, extension, and file signature before using the server-only
-- service role. Browser sessions retain read access only.
drop policy if exists "authenticated upload public media" on storage.objects;
drop policy if exists "authorized manage public media" on storage.objects;
drop policy if exists "authorized delete public media" on storage.objects;
drop policy if exists "authorized private documents" on storage.objects;
drop policy if exists "post contributors upload own images" on storage.objects;
drop policy if exists "post contributors delete own images" on storage.objects;
drop policy if exists "secure public media insert" on storage.objects;
drop policy if exists "secure public media update" on storage.objects;
drop policy if exists "secure public media delete" on storage.objects;
drop policy if exists "secure private documents select" on storage.objects;
drop policy if exists "secure private documents insert" on storage.objects;
drop policy if exists "secure private documents update" on storage.objects;
drop policy if exists "secure private documents delete" on storage.objects;

create policy "secure private documents select"
on storage.objects for select to authenticated
using (
  bucket_id = 'private-documents'
  and public.has_permission('files.manage')
);

-- Media metadata writes are also server-only after Patch 5. Authenticated
-- users retain the SELECT policies created by Patch 4, but cannot forge or
-- retarget storage_path/bucket metadata through the Data API.
drop policy if exists "module contributors insert own media" on public.media_files;
drop policy if exists "module contributors update own media" on public.media_files;
drop policy if exists "media managers own insert" on public.media_files;
drop policy if exists "media managers update all" on public.media_files;
drop policy if exists "media metadata superadmin delete" on public.media_files;
drop policy if exists "post contributors insert own media" on public.media_files;
drop policy if exists "post contributors update own media" on public.media_files;
drop policy if exists "post contributors delete own media" on public.media_files;

-- ---------------------------------------------------------------------------
-- 3. Database-side length limits for fields that were historically unbounded
-- ---------------------------------------------------------------------------

alter table public.visitor_forms
  drop constraint if exists visitor_forms_notes_length_check;
alter table public.visitor_forms
  add constraint visitor_forms_notes_length_check
  check (notes is null or char_length(notes) <= 500) not valid;

alter table public.event_registrations
  drop constraint if exists event_registrations_notes_length_check;
alter table public.event_registrations
  add constraint event_registrations_notes_length_check
  check (notes is null or char_length(notes) <= 1000) not valid;

alter table public.contact_messages
  drop constraint if exists contact_messages_subject_length_check;
alter table public.contact_messages
  add constraint contact_messages_subject_length_check
  check (char_length(subject) between 3 and 120) not valid;

alter table public.prayer_requests
  drop constraint if exists prayer_requests_name_length_check;
alter table public.prayer_requests
  add constraint prayer_requests_name_length_check
  check (name is null or char_length(name) <= 80) not valid;

notify pgrst, 'reload schema';
