-- Complete admin notification center with typed notifications, direct links,
-- read history, privacy-aware routing, and on-demand event/live reminders.

alter table public.notifications
  add column if not exists type text not null default 'system',
  add column if not exists source_type text,
  add column if not exists source_id uuid,
  add column if not exists dedupe_key text,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists updated_at timestamptz not null default now();

alter table public.notifications
  drop constraint if exists notifications_type_check;
alter table public.notifications
  add constraint notifications_type_check check (
    type in (
      'system',
      'prayer',
      'visitor',
      'contact',
      'registration',
      'event_reminder',
      'livestream_reminder'
    )
  );

alter table public.notifications
  drop constraint if exists notifications_status_check;
alter table public.notifications
  add constraint notifications_status_check
  check (status in ('active', 'archived'));

update public.notifications
set type = case
  when lower(title) like '%doa%' then 'prayer'
  when lower(title) like '%kunjungan%' then 'visitor'
  when lower(title) like '%pesan%' then 'contact'
  when lower(title) like '%pendaftaran%' then 'registration'
  when lower(title) like '%live%' then 'livestream_reminder'
  when lower(title) like '%kegiatan%' then 'event_reminder'
  else 'system'
end
where type = 'system';

create index if not exists idx_notifications_user_active_created
  on public.notifications(user_id, created_at desc)
  where status = 'active';

create index if not exists idx_notifications_user_type_created
  on public.notifications(user_id, type, created_at desc)
  where status = 'active';

create unique index if not exists idx_notifications_user_dedupe
  on public.notifications(user_id, dedupe_key)
  where dedupe_key is not null;

drop trigger if exists set_notifications_updated_at on public.notifications;
create trigger set_notifications_updated_at
before update on public.notifications
for each row execute function public.set_updated_at();

create or replace function public.notify_permission_members_detailed(
  permission_code text,
  notification_title text,
  notification_body text,
  notification_link text,
  notification_type text,
  notification_source_type text,
  notification_source_id uuid,
  notification_dedupe_key text,
  notification_metadata jsonb default '{}'::jsonb
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.notifications(
    user_id,
    title,
    body,
    link_url,
    type,
    source_type,
    source_id,
    dedupe_key,
    metadata
  )
  select distinct
    ur.user_id,
    notification_title,
    notification_body,
    notification_link,
    notification_type,
    notification_source_type,
    notification_source_id,
    notification_dedupe_key,
    coalesce(notification_metadata, '{}'::jsonb)
  from public.user_roles ur
  join public.roles role
    on role.id = ur.role_id
   and role.status = 'active'
  left join public.role_permissions rp
    on rp.role_id = role.id
  left join public.permissions permission
    on permission.id = rp.permission_id
  join public.profiles profile
    on profile.id = ur.user_id
   and profile.status = 'active'
  where role.code = 'super_admin'
     or permission.code = permission_code
  on conflict do nothing;
$$;

revoke all on function public.notify_permission_members_detailed(
  text,
  text,
  text,
  text,
  text,
  text,
  uuid,
  text,
  jsonb
) from public;

-- Keep compatibility with the original four-argument helper.
create or replace function public.notify_permission_members(
  permission_code text,
  notification_title text,
  notification_body text,
  notification_link text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.notify_permission_members_detailed(
    permission_code,
    notification_title,
    notification_body,
    notification_link,
    'system',
    null,
    null,
    null,
    '{}'::jsonb
  );
end;
$$;

revoke all on function public.notify_permission_members(text, text, text, text)
from public;

-- Every new public submission receives a typed notification and direct detail link.
-- Prayer privacy remains enforced by permission routing and prayer-request RLS.
create or replace function public.notify_private_submission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_table_name = 'prayer_requests' then
    if new.sharing_scope = 'pastoral_only' then
      perform public.notify_permission_members_detailed(
        'prayers.private.read',
        'Permohonan doa rahasia baru',
        'Permohonan rahasia baru menunggu perhatian pastoral.',
        '/admin/permohonan-doa?submission=' || new.id::text,
        'prayer',
        'prayer_requests',
        new.id,
        'submission:prayer_requests:' || new.id::text,
        jsonb_build_object(
          'sharing_scope', new.sharing_scope,
          'created_at', new.created_at
        )
      );
    else
      perform public.notify_permission_members_detailed(
        'prayers.read',
        'Permohonan doa baru',
        'Sebuah permohonan doa baru menunggu perhatian tim doa dan pastoral.',
        '/admin/permohonan-doa?submission=' || new.id::text,
        'prayer',
        'prayer_requests',
        new.id,
        'submission:prayer_requests:' || new.id::text,
        jsonb_build_object(
          'sharing_scope', new.sharing_scope,
          'created_at', new.created_at
        )
      );
    end if;
  elsif tg_table_name = 'visitor_forms' then
    perform public.notify_permission_members_detailed(
      'visitors.read',
      'Rencana kunjungan baru',
      'Seorang pengunjung baru merencanakan kunjungan.',
      '/admin/pengunjung?submission=' || new.id::text,
      'visitor',
      'visitor_forms',
      new.id,
      'submission:visitor_forms:' || new.id::text,
      jsonb_build_object(
        'visit_date', new.visit_date,
        'created_at', new.created_at
      )
    );
  elsif tg_table_name = 'contact_messages' then
    perform public.notify_permission_members_detailed(
      'messages.read',
      'Pesan website baru',
      'Pesan baru diterima melalui halaman kontak.',
      '/admin/pesan?submission=' || new.id::text,
      'contact',
      'contact_messages',
      new.id,
      'submission:contact_messages:' || new.id::text,
      jsonb_build_object('created_at', new.created_at)
    );
  elsif tg_table_name = 'event_registrations' then
    perform public.notify_permission_members_detailed(
      'events.manage',
      'Pendaftaran kegiatan baru',
      'Pendaftaran peserta baru telah diterima.',
      '/admin/pendaftaran?submission=' || new.id::text,
      'registration',
      'event_registrations',
      new.id,
      'submission:event_registrations:' || new.id::text,
      jsonb_build_object(
        'event_id', new.event_id,
        'people_count', new.people_count,
        'created_at', new.created_at
      )
    );
  end if;

  return new;
end;
$$;

revoke all on function public.notify_private_submission() from public;

-- Called by the authenticated notification API. It only creates reminders for
-- auth.uid() and only when that user has the corresponding permission.
create or replace function public.refresh_my_admin_reminders()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    return;
  end if;

  if public.has_permission('events.manage') then
    insert into public.notifications(
      user_id,
      title,
      body,
      link_url,
      type,
      source_type,
      source_id,
      dedupe_key,
      metadata
    )
    select
      current_user_id,
      'Kegiatan segera dimulai',
      event.title || ' akan dimulai dalam 24 jam.',
      '/admin/kegiatan?record=' || event.id::text,
      'event_reminder',
      'events',
      event.id,
      'event-reminder-24h:' || event.id::text,
      jsonb_build_object(
        'starts_at', event.starts_at,
        'location', event.location
      )
    from public.events event
    where event.status = 'published'
      and event.deleted_at is null
      and event.starts_at > now()
      and event.starts_at <= now() + interval '24 hours'
    on conflict do nothing;
  end if;

  if public.has_permission('livestreams.manage') then
    insert into public.notifications(
      user_id,
      title,
      body,
      link_url,
      type,
      source_type,
      source_id,
      dedupe_key,
      metadata
    )
    select
      current_user_id,
      'Live streaming segera berlangsung',
      stream.title || ' akan dimulai dalam 6 jam.',
      '/admin/live?record=' || stream.id::text,
      'livestream_reminder',
      'livestreams',
      stream.id,
      'livestream-reminder-6h:' || stream.id::text,
      jsonb_build_object(
        'starts_at', stream.starts_at,
        'live_status', stream.live_status
      )
    from public.livestreams stream
    where stream.status = 'published'
      and stream.live_status = 'scheduled'
      and stream.deleted_at is null
      and stream.starts_at > now()
      and stream.starts_at <= now() + interval '6 hours'
    on conflict do nothing;

    insert into public.notifications(
      user_id,
      title,
      body,
      link_url,
      type,
      source_type,
      source_id,
      dedupe_key,
      metadata
    )
    select
      current_user_id,
      'Live streaming sedang berlangsung',
      stream.title || ' sedang berlangsung sekarang.',
      '/admin/live?record=' || stream.id::text,
      'livestream_reminder',
      'livestreams',
      stream.id,
      'livestream-live:' || stream.id::text,
      jsonb_build_object(
        'starts_at', stream.starts_at,
        'ends_at', stream.ends_at,
        'live_status', stream.live_status
      )
    from public.livestreams stream
    where stream.status = 'published'
      and stream.deleted_at is null
      and stream.live_status <> 'cancelled'
      and (
        stream.live_status = 'live'
        or (
          stream.live_status = 'scheduled'
          and stream.starts_at <= now()
          and coalesce(stream.ends_at, stream.starts_at + interval '3 hours') > now()
        )
      )
    on conflict do nothing;
  end if;
end;
$$;

revoke all on function public.refresh_my_admin_reminders() from public;
grant execute on function public.refresh_my_admin_reminders() to authenticated;

notify pgrst, 'reload schema';
