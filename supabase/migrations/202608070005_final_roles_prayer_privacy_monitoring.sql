-- Final role structure, prayer-recipient privacy, and Super Admin monitoring.
-- Super Admin monitors service progress without becoming a routine prayer recipient.

-- ---------------------------------------------------------------------------
-- 1. Final role codes and safe migration from legacy role codes
-- ---------------------------------------------------------------------------

alter table public.roles drop constraint if exists roles_code_check;

insert into public.roles(code, name, description, status)
values
  ('super_admin', 'Super Admin', 'Mengelola sistem, keamanan, pengguna, dan monitoring pelayanan.', 'active'),
  ('pastor', 'Pendeta/Gembala Jemaat', 'Memimpin pelayanan jemaat dan menangani permohonan doa untuk pendeta.', 'active'),
  ('church_chair', 'Ketua Jemaat', 'Mendukung operasional pelayanan di bawah Pendeta/Gembala Jemaat.', 'active'),
  ('prayer_team', 'Tim Pendoa Jemaat', 'Menangani permohonan doa yang ditujukan kepada Tim Pendoa Jemaat.', 'active'),
  ('secretary', 'Sekretaris', 'Mengelola kegiatan, jadwal, pengunjung, pesan, dan administrasi.', 'active'),
  ('editor', 'Editor', 'Mengelola berita, artikel, renungan, dan kualitas konten.', 'active'),
  ('media', 'Media', 'Mengelola khotbah, live streaming, galeri, dan aset media.', 'active'),
  ('department_admin', 'Admin Departemen', 'Mengelola konten dan pelayanan departemen yang ditugaskan.', 'active')
on conflict (code) do update set
  name = excluded.name,
  description = excluded.description,
  status = 'active';

-- Move users from legacy roles to their final equivalent. Web Administrator is
-- intentionally downgraded to Editor; system-management rights remain exclusive
-- to Super Admin.
do $$
declare
  mapping record;
  old_role_id uuid;
  new_role_id uuid;
begin
  for mapping in
    select * from (values
      ('pastoral', 'pastor'),
      ('secretariat', 'secretary'),
      ('media_team', 'media'),
      ('web_administrator', 'editor')
    ) as role_map(old_code, new_code)
  loop
    select id into old_role_id from public.roles where code = mapping.old_code;
    select id into new_role_id from public.roles where code = mapping.new_code;

    if old_role_id is not null and new_role_id is not null then
      insert into public.user_roles as destination(user_id, role_id, ministry_id)
      select user_id, new_role_id, ministry_id
      from public.user_roles
      where role_id = old_role_id
      on conflict (user_id, role_id) do update set
        ministry_id = coalesce(destination.ministry_id, excluded.ministry_id);

      delete from public.user_roles where role_id = old_role_id;
      delete from public.role_permissions where role_id = old_role_id;
      delete from public.roles where id = old_role_id;
    end if;
  end loop;
end;
$$;

alter table public.roles
  add constraint roles_code_check check (
    code in (
      'super_admin',
      'pastor',
      'church_chair',
      'prayer_team',
      'secretary',
      'editor',
      'media',
      'department_admin'
    )
  );

-- ---------------------------------------------------------------------------
-- 2. Final permission matrix
-- ---------------------------------------------------------------------------

insert into public.permissions(code, name, module)
values
  ('dashboard.read', 'Lihat Dashboard', 'dashboard'),
  ('monitoring.read', 'Lihat Monitoring Pelayanan', 'monitoring'),
  ('schedules.manage', 'Kelola Jadwal', 'schedules'),
  ('events.manage', 'Kelola Kegiatan', 'events'),
  ('sermons.manage', 'Kelola Khotbah', 'sermons'),
  ('livestreams.manage', 'Kelola Live', 'livestreams'),
  ('posts.manage', 'Kelola Artikel', 'posts'),
  ('ministries.manage', 'Kelola Departemen', 'ministries'),
  ('leaders.manage', 'Kelola Pengurus', 'leaders'),
  ('gallery.manage', 'Kelola Galeri', 'gallery'),
  ('prayers.inbox.read', 'Akses Kotak Masuk Permohonan Doa', 'prayers'),
  ('visitors.read', 'Baca Pengunjung Baru', 'visitors'),
  ('messages.read', 'Baca Pesan', 'messages'),
  ('files.manage', 'Kelola File', 'files'),
  ('users.manage', 'Kelola Pengguna', 'users'),
  ('appearance.manage', 'Kelola Tampilan', 'appearance'),
  ('settings.manage', 'Kelola Pengaturan', 'settings')
on conflict (code) do update set
  name = excluded.name,
  module = excluded.module;

-- Rebuild final-role permissions so legacy elevated access does not survive.
delete from public.role_permissions
where role_id in (
  select id from public.roles
  where code in (
    'super_admin', 'pastor', 'church_chair', 'prayer_team',
    'secretary', 'editor', 'media', 'department_admin'
  )
);

with permission_matrix(role_code, permission_code) as (
  values
    ('super_admin', 'dashboard.read'),
    ('super_admin', 'monitoring.read'),

    ('pastor', 'dashboard.read'),
    ('pastor', 'schedules.manage'),
    ('pastor', 'events.manage'),
    ('pastor', 'sermons.manage'),
    ('pastor', 'posts.manage'),
    ('pastor', 'leaders.manage'),
    ('pastor', 'prayers.inbox.read'),
    ('pastor', 'visitors.read'),

    ('church_chair', 'dashboard.read'),
    ('church_chair', 'schedules.manage'),
    ('church_chair', 'events.manage'),
    ('church_chair', 'posts.manage'),
    ('church_chair', 'leaders.manage'),
    ('church_chair', 'visitors.read'),

    ('prayer_team', 'dashboard.read'),
    ('prayer_team', 'posts.manage'),
    ('prayer_team', 'prayers.inbox.read'),

    ('secretary', 'dashboard.read'),
    ('secretary', 'schedules.manage'),
    ('secretary', 'events.manage'),
    ('secretary', 'posts.manage'),
    ('secretary', 'leaders.manage'),
    ('secretary', 'visitors.read'),
    ('secretary', 'messages.read'),
    ('secretary', 'files.manage'),

    ('editor', 'dashboard.read'),
    ('editor', 'posts.manage'),
    ('editor', 'sermons.manage'),
    ('editor', 'events.manage'),

    ('media', 'dashboard.read'),
    ('media', 'posts.manage'),
    ('media', 'sermons.manage'),
    ('media', 'livestreams.manage'),
    ('media', 'gallery.manage'),
    ('media', 'files.manage'),

    ('department_admin', 'dashboard.read'),
    ('department_admin', 'posts.manage'),
    ('department_admin', 'events.manage'),
    ('department_admin', 'ministries.manage'),
    ('department_admin', 'gallery.manage')
)
insert into public.role_permissions(role_id, permission_id)
select role.id, permission.id
from permission_matrix matrix
join public.roles role on role.code = matrix.role_code
join public.permissions permission on permission.code = matrix.permission_code
on conflict do nothing;

-- Exact active-role check used by privacy policies and privileged RPCs.
create or replace function public.has_active_role(target_role_code text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles user_role
    join public.roles role
      on role.id = user_role.role_id
     and role.status = 'active'
    join public.profiles profile
      on profile.id = user_role.user_id
     and profile.status = 'active'
    where user_role.user_id = auth.uid()
      and role.code = target_role_code
  );
$$;

revoke all on function public.has_active_role(text) from public;
grant execute on function public.has_active_role(text) to authenticated;

-- Super Admin keeps global system rights, but prayer-inbox permissions are not
-- inherited. Prayer content is accessed only by the selected recipient role or
-- by the separately audited emergency-access RPC below.
create or replace function public.has_permission(permission_code text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when permission_code in (
      'prayers.inbox.read',
      'prayers.read',
      'prayers.private.read'
    ) and public.has_active_role('super_admin') then false
    else exists (
      select 1
      from public.user_roles user_role
      join public.roles role
        on role.id = user_role.role_id
       and role.status = 'active'
      join public.profiles profile
        on profile.id = user_role.user_id
       and profile.status = 'active'
      left join public.role_permissions role_permission
        on role_permission.role_id = role.id
      left join public.permissions permission
        on permission.id = role_permission.permission_id
      where user_role.user_id = auth.uid()
        and (
          permission.code = permission_code
          or role.code = 'super_admin'
        )
    )
  end;
$$;

revoke all on function public.has_permission(text) from public;
grant execute on function public.has_permission(text) to authenticated;

-- Every final role can contribute articles, including a featured image. The
-- policy is limited to each user's own post-image path and media metadata.
drop policy if exists "post contributors insert own media" on public.media_files;
drop policy if exists "post contributors read own media" on public.media_files;
drop policy if exists "post contributors update own media" on public.media_files;
drop policy if exists "post contributors delete own media" on public.media_files;

create policy "post contributors insert own media"
on public.media_files for insert to authenticated
with check (
  public.has_permission('posts.manage')
  and created_by = auth.uid()
  and bucket = 'public-media'
  and metadata ->> 'usage' = 'post-featured-image'
);

create policy "post contributors read own media"
on public.media_files for select to authenticated
using (
  public.has_permission('posts.manage')
  and created_by = auth.uid()
  and bucket = 'public-media'
  and metadata ->> 'usage' = 'post-featured-image'
);

create policy "post contributors update own media"
on public.media_files for update to authenticated
using (
  public.has_permission('posts.manage')
  and created_by = auth.uid()
  and bucket = 'public-media'
  and metadata ->> 'usage' = 'post-featured-image'
)
with check (
  public.has_permission('posts.manage')
  and created_by = auth.uid()
  and bucket = 'public-media'
  and metadata ->> 'usage' = 'post-featured-image'
);

create policy "post contributors delete own media"
on public.media_files for delete to authenticated
using (
  public.has_permission('posts.manage')
  and created_by = auth.uid()
  and bucket = 'public-media'
  and metadata ->> 'usage' = 'post-featured-image'
);

drop policy if exists "post contributors upload own images" on storage.objects;
drop policy if exists "post contributors delete own images" on storage.objects;

create policy "post contributors upload own images"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'public-media'
  and public.has_permission('posts.manage')
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "post contributors delete own images"
on storage.objects for delete to authenticated
using (
  bucket_id = 'public-media'
  and public.has_permission('posts.manage')
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- ---------------------------------------------------------------------------
-- 3. Two final prayer recipients and strict row privacy
-- ---------------------------------------------------------------------------

-- IMPORTANT: remove the legacy CHECK constraint before converting legacy
-- values. The old constraint only accepts ('prayer_team', 'pastoral_only'), so
-- updating 'pastoral_only' to 'pastor' while it is still active raises 23514.
alter table public.prayer_requests
  drop constraint if exists prayer_requests_sharing_scope_check;

-- Normalize the only legacy private-recipient value used by the previous
-- public-forms migration. Existing prayer_team rows remain unchanged.
update public.prayer_requests
set sharing_scope = 'pastor'
where sharing_scope = 'pastoral_only';

-- Fail closed if an unexpected historical value exists. Do not silently route
-- an unknown/sensitive prayer request to another recipient role.
do $$
declare
  unexpected_scopes text;
begin
  select string_agg(scope_value, ', ' order by scope_value)
  into unexpected_scopes
  from (
    select distinct coalesce(sharing_scope, '<NULL>') as scope_value
    from public.prayer_requests
    where sharing_scope is null
       or sharing_scope not in ('prayer_team', 'pastor')
  ) unexpected;

  if unexpected_scopes is not null then
    raise exception 'Nilai sharing_scope lama tidak dikenali: %', unexpected_scopes
      using errcode = '23514';
  end if;
end;
$$;

alter table public.prayer_requests
  alter column sharing_scope set default 'prayer_team';

alter table public.prayer_requests
  add constraint prayer_requests_sharing_scope_check
  check (sharing_scope in ('prayer_team', 'pastor'));

-- Anonymous submission cannot pre-fill internal workflow fields.
drop policy if exists "public submit prayer" on public.prayer_requests;
create policy "public submit prayer"
on public.prayer_requests for insert to anon, authenticated
with check (
  privacy_consent = true
  and status = 'unread'
  and assigned_to is null
  and internal_notes is null
  and deleted_at is null
  and sharing_scope in ('prayer_team', 'pastor')
);

-- Remove every legacy prayer-management policy before applying exact-role RLS.
drop policy if exists "pastoral manage prayer" on public.prayer_requests;
drop policy if exists "authorized read prayer requests" on public.prayer_requests;
drop policy if exists "authorized update prayer requests" on public.prayer_requests;
drop policy if exists "authorized delete prayer requests" on public.prayer_requests;
drop policy if exists "recipient read prayer requests" on public.prayer_requests;
drop policy if exists "recipient update prayer requests" on public.prayer_requests;
drop policy if exists "recipient delete prayer requests" on public.prayer_requests;

create policy "recipient read prayer requests"
on public.prayer_requests for select to authenticated
using (
  not public.has_active_role('super_admin')
  and (
    (sharing_scope = 'prayer_team' and public.has_active_role('prayer_team'))
    or
    (sharing_scope = 'pastor' and public.has_active_role('pastor'))
  )
);

create policy "recipient update prayer requests"
on public.prayer_requests for update to authenticated
using (
  not public.has_active_role('super_admin')
  and (
    (sharing_scope = 'prayer_team' and public.has_active_role('prayer_team'))
    or
    (sharing_scope = 'pastor' and public.has_active_role('pastor'))
  )
)
with check (
  not public.has_active_role('super_admin')
  and (
    (sharing_scope = 'prayer_team' and public.has_active_role('prayer_team'))
    or
    (sharing_scope = 'pastor' and public.has_active_role('pastor'))
  )
);

create policy "recipient delete prayer requests"
on public.prayer_requests for delete to authenticated
using (
  not public.has_active_role('super_admin')
  and (
    (sharing_scope = 'prayer_team' and public.has_active_role('prayer_team'))
    or
    (sharing_scope = 'pastor' and public.has_active_role('pastor'))
  )
);

-- Prayer audit records must never duplicate requester identity, contact,
-- prayer text, or internal notes. Replace the generic full-row trigger.
drop trigger if exists audit_prayer_requests on public.prayer_requests;
drop trigger if exists audit_prayer_requests_safe on public.prayer_requests;

create or replace function public.audit_prayer_request_change_safe()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  record_id uuid := case when tg_op = 'DELETE' then old.id else new.id end;
  previous_metadata jsonb := null;
  current_metadata jsonb := null;
begin
  if tg_op in ('UPDATE', 'DELETE') then
    previous_metadata := jsonb_build_object(
      'sharing_scope', old.sharing_scope,
      'status', old.status,
      'assigned_to', old.assigned_to,
      'deleted', old.deleted_at is not null
    );
  end if;

  if tg_op in ('INSERT', 'UPDATE') then
    current_metadata := jsonb_build_object(
      'sharing_scope', new.sharing_scope,
      'status', new.status,
      'assigned_to', new.assigned_to,
      'deleted', new.deleted_at is not null
    );
  end if;

  insert into public.audit_logs(
    actor_id, action, entity_type, entity_id, old_data, new_data
  )
  values (
    auth.uid(),
    lower(tg_op),
    'prayer_requests',
    record_id,
    previous_metadata,
    current_metadata
  );

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function public.audit_prayer_request_change_safe() from public;

create trigger audit_prayer_requests_safe
after insert or update or delete on public.prayer_requests
for each row execute function public.audit_prayer_request_change_safe();

-- Remove sensitive fields that may have been copied by the previous generic
-- trigger. Only workflow metadata remains in historical prayer audit rows.
update public.audit_logs
set
  old_data = case
    when old_data is null then null
    else jsonb_strip_nulls(jsonb_build_object(
      'sharing_scope', old_data ->> 'sharing_scope',
      'status', old_data ->> 'status',
      'assigned_to', old_data ->> 'assigned_to',
      'deleted', (old_data ->> 'deleted_at') is not null
    ))
  end,
  new_data = case
    when new_data is null then null
    else jsonb_strip_nulls(jsonb_build_object(
      'sharing_scope', new_data ->> 'sharing_scope',
      'status', new_data ->> 'status',
      'assigned_to', new_data ->> 'assigned_to',
      'deleted', (new_data ->> 'deleted_at') is not null
    ))
  end
where entity_type = 'prayer_requests'
  and action <> 'sensitive_access';

-- ---------------------------------------------------------------------------
-- 4. Super Admin monitoring without routine access to prayer contents
-- ---------------------------------------------------------------------------

create or replace function public.get_prayer_service_monitoring()
returns table (
  total_count bigint,
  unread_count bigint,
  in_prayer_count bigint,
  follow_up_count bigint,
  archived_count bigint,
  prayer_team_count bigint,
  pastor_count bigint,
  overdue_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.has_active_role('super_admin') then
    raise exception 'Akses monitoring hanya untuk Super Admin'
      using errcode = '42501';
  end if;

  return query
  select
    count(*)::bigint,
    count(*) filter (where prayer.status = 'unread')::bigint,
    count(*) filter (where prayer.status = 'in_prayer')::bigint,
    count(*) filter (where prayer.status = 'follow_up')::bigint,
    count(*) filter (where prayer.status = 'archived')::bigint,
    count(*) filter (where prayer.sharing_scope = 'prayer_team')::bigint,
    count(*) filter (where prayer.sharing_scope = 'pastor')::bigint,
    count(*) filter (
      where prayer.status = 'unread'
        and prayer.created_at <= now() - interval '24 hours'
    )::bigint
  from public.prayer_requests prayer
  where prayer.deleted_at is null;
end;
$$;

create or replace function public.list_prayer_service_monitoring(
  limit_rows integer default 20,
  offset_rows integer default 0,
  filter_scope text default null,
  filter_status text default null
)
returns table (
  id uuid,
  sharing_scope text,
  status text,
  assigned_to uuid,
  assigned_to_name text,
  created_at timestamptz,
  updated_at timestamptz,
  age_hours integer,
  filtered_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.has_active_role('super_admin') then
    raise exception 'Akses monitoring hanya untuk Super Admin'
      using errcode = '42501';
  end if;

  return query
  select
    prayer.id,
    prayer.sharing_scope,
    prayer.status,
    prayer.assigned_to,
    handler.full_name,
    prayer.created_at,
    prayer.updated_at,
    greatest(
      0,
      floor(extract(epoch from (now() - prayer.created_at)) / 3600)::integer
    ) as age_hours,
    count(*) over()::bigint as filtered_count
  from public.prayer_requests prayer
  left join public.profiles handler on handler.id = prayer.assigned_to
  where prayer.deleted_at is null
    and (filter_scope is null or prayer.sharing_scope = filter_scope)
    and (filter_status is null or prayer.status = filter_status)
  order by prayer.created_at desc
  limit least(greatest(limit_rows, 1), 100)
  offset greatest(offset_rows, 0);
end;
$$;

-- Emergency/technical access. The reason is mandatory and the sensitive prayer
-- content is never copied into the audit log.
create or replace function public.super_admin_open_prayer_request(
  target_prayer_id uuid,
  access_reason text
)
returns table (
  request_id uuid,
  requester_name text,
  is_anonymous boolean,
  whatsapp text,
  email text,
  category text,
  request_text text,
  may_contact boolean,
  sharing_scope text,
  status text,
  internal_notes text,
  assigned_to uuid,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_reason text := trim(coalesce(access_reason, ''));
  current_scope text;
  current_status text;
begin
  if not public.has_active_role('super_admin') then
    raise exception 'Akses khusus hanya untuk Super Admin'
      using errcode = '42501';
  end if;

  if char_length(normalized_reason) < 10 or char_length(normalized_reason) > 500 then
    raise exception 'Alasan akses harus 10 sampai 500 karakter'
      using errcode = '22023';
  end if;

  select prayer.sharing_scope, prayer.status
  into current_scope, current_status
  from public.prayer_requests prayer
  where prayer.id = target_prayer_id
    and prayer.deleted_at is null;

  if not found then
    raise exception 'Permohonan tidak ditemukan'
      using errcode = 'P0002';
  end if;

  insert into public.audit_logs(
    actor_id,
    action,
    entity_type,
    entity_id,
    new_data
  )
  values (
    auth.uid(),
    'sensitive_access',
    'prayer_requests',
    target_prayer_id,
    jsonb_build_object(
      'reason', normalized_reason,
      'sharing_scope', current_scope,
      'status', current_status,
      'accessed_at', now()
    )
  );

  return query
  select
    prayer.id,
    prayer.name,
    prayer.is_anonymous,
    prayer.whatsapp,
    prayer.email,
    prayer.category,
    prayer.request_text,
    prayer.may_contact,
    prayer.sharing_scope,
    prayer.status,
    prayer.internal_notes,
    prayer.assigned_to,
    prayer.created_at,
    prayer.updated_at
  from public.prayer_requests prayer
  where prayer.id = target_prayer_id
    and prayer.deleted_at is null;
end;
$$;

revoke all on function public.get_prayer_service_monitoring() from public;
revoke all on function public.list_prayer_service_monitoring(integer, integer, text, text) from public;
revoke all on function public.super_admin_open_prayer_request(uuid, text) from public;
grant execute on function public.get_prayer_service_monitoring() to authenticated;
grant execute on function public.list_prayer_service_monitoring(integer, integer, text, text) to authenticated;
grant execute on function public.super_admin_open_prayer_request(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Role-specific prayer notifications; Super Admin receives monitoring alerts
-- ---------------------------------------------------------------------------

create or replace function public.notify_role_members_detailed(
  target_role_code text,
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
set search_path = ''
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
    user_role.user_id,
    notification_title,
    notification_body,
    notification_link,
    notification_type,
    notification_source_type,
    notification_source_id,
    notification_dedupe_key,
    coalesce(notification_metadata, '{}'::jsonb)
  from public.user_roles user_role
  join public.roles role
    on role.id = user_role.role_id
   and role.status = 'active'
  join public.profiles profile
    on profile.id = user_role.user_id
   and profile.status = 'active'
  where role.code = target_role_code
    and not exists (
      select 1
      from public.user_roles super_assignment
      join public.roles super_role
        on super_role.id = super_assignment.role_id
       and super_role.code = 'super_admin'
       and super_role.status = 'active'
      where super_assignment.user_id = user_role.user_id
    )
  on conflict do nothing;
$$;

revoke all on function public.notify_role_members_detailed(
  text, text, text, text, text, text, uuid, text, jsonb
) from public;

create or replace function public.notify_private_submission()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_table_name = 'prayer_requests' then
    if new.sharing_scope = 'pastor' then
      perform public.notify_role_members_detailed(
        'pastor',
        'Permohonan doa untuk Pendeta/Gembala',
        'Permohonan doa baru menunggu pelayanan Pendeta/Gembala Jemaat.',
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
      perform public.notify_role_members_detailed(
        'prayer_team',
        'Permohonan doa untuk Tim Pendoa',
        'Permohonan doa baru menunggu pelayanan Tim Pendoa Jemaat.',
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

-- Keep existing event/live reminders and add metadata-only overdue prayer alerts
-- for Super Admin. No prayer text, requester name, or contact is copied.
create or replace function public.refresh_my_admin_reminders()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    return;
  end if;

  if public.has_permission('events.manage') then
    insert into public.notifications(
      user_id, title, body, link_url, type, source_type, source_id,
      dedupe_key, metadata
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
      jsonb_build_object('starts_at', event.starts_at, 'location', event.location)
    from public.events event
    where event.status = 'published'
      and event.deleted_at is null
      and event.starts_at > now()
      and event.starts_at <= now() + interval '24 hours'
    on conflict do nothing;
  end if;

  if public.has_permission('livestreams.manage') then
    insert into public.notifications(
      user_id, title, body, link_url, type, source_type, source_id,
      dedupe_key, metadata
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
      jsonb_build_object('starts_at', stream.starts_at, 'live_status', stream.live_status)
    from public.livestreams stream
    where stream.status = 'published'
      and stream.live_status = 'scheduled'
      and stream.deleted_at is null
      and stream.starts_at > now()
      and stream.starts_at <= now() + interval '6 hours'
    on conflict do nothing;

    insert into public.notifications(
      user_id, title, body, link_url, type, source_type, source_id,
      dedupe_key, metadata
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

  if public.has_active_role('super_admin') then
    insert into public.notifications(
      user_id, title, body, link_url, type, source_type, source_id,
      dedupe_key, metadata
    )
    select
      current_user_id,
      'Tindak lanjut doa melewati 24 jam',
      'Satu permohonan doa belum ditindaklanjuti lebih dari 24 jam.',
      '/admin/monitoring?prayer=' || prayer.id::text,
      'system',
      'prayer_requests',
      prayer.id,
      'prayer-monitor-overdue:' || prayer.id::text,
      jsonb_build_object(
        'sharing_scope', prayer.sharing_scope,
        'status', prayer.status,
        'created_at', prayer.created_at
      )
    from public.prayer_requests prayer
    where prayer.deleted_at is null
      and prayer.status = 'unread'
      and prayer.created_at <= now() - interval '24 hours'
    on conflict do nothing;
  end if;
end;
$$;

revoke all on function public.refresh_my_admin_reminders() from public;
grant execute on function public.refresh_my_admin_reminders() to authenticated;

-- Archive legacy or incorrectly routed routine prayer notifications. Valid
-- active notifications remain only with the exact selected recipient role.
update public.notifications notification
set status = 'archived', updated_at = now()
where notification.type = 'prayer'
  and notification.status = 'active'
  and (
    notification.source_id is null
    or exists (
      select 1
      from public.user_roles user_role
      join public.roles role on role.id = user_role.role_id
      where user_role.user_id = notification.user_id
        and role.code = 'super_admin'
        and role.status = 'active'
    )
    or exists (
      select 1
      from public.prayer_requests prayer
      where prayer.id = notification.source_id
        and (
          (
            prayer.sharing_scope = 'prayer_team'
            and not exists (
              select 1
              from public.user_roles user_role
              join public.roles role on role.id = user_role.role_id
              join public.profiles profile on profile.id = user_role.user_id
              where user_role.user_id = notification.user_id
                and role.code = 'prayer_team'
                and role.status = 'active'
                and profile.status = 'active'
            )
          )
          or (
            prayer.sharing_scope = 'pastor'
            and not exists (
              select 1
              from public.user_roles user_role
              join public.roles role on role.id = user_role.role_id
              join public.profiles profile on profile.id = user_role.user_id
              where user_role.user_id = notification.user_id
                and role.code = 'pastor'
                and role.status = 'active'
                and profile.status = 'active'
            )
          )
        )
    )
  );

notify pgrst, 'reload schema';
