-- Complete public form inboxes, privacy choices, and notification routing.

-- Add a dedicated prayer-team role while keeping the existing enum-like check.
alter table public.roles drop constraint if exists roles_code_check;
alter table public.roles
  add constraint roles_code_check check (
    code in (
      'super_admin',
      'web_administrator',
      'secretariat',
      'media_team',
      'editor',
      'pastoral',
      'prayer_team',
      'department_admin'
    )
  );

insert into public.roles(code, name, description)
values (
  'prayer_team',
  'Tim Doa',
  'Membaca dan menindaklanjuti permohonan yang dibagikan kepada tim doa'
)
on conflict(code) do update set
  name = excluded.name,
  description = excluded.description,
  status = 'active';

insert into public.permissions(code, name, module)
values (
  'prayers.private.read',
  'Baca Permohonan Doa Rahasia',
  'prayers'
)
on conflict(code) do update set
  name = excluded.name,
  module = excluded.module;

insert into public.role_permissions(role_id, permission_id)
select role.id, permission.id
from public.roles role
join public.permissions permission
  on permission.code in ('dashboard.read', 'prayers.read')
where role.code = 'prayer_team'
on conflict do nothing;

insert into public.role_permissions(role_id, permission_id)
select role.id, permission.id
from public.roles role
join public.permissions permission
  on permission.code = 'prayers.private.read'
where role.code = 'pastoral'
on conflict do nothing;

-- Store the requester's access choice and internal follow-up notes.
alter table public.prayer_requests
  add column if not exists sharing_scope text not null default 'prayer_team';
alter table public.prayer_requests
  drop constraint if exists prayer_requests_sharing_scope_check;
alter table public.prayer_requests
  add constraint prayer_requests_sharing_scope_check
  check (sharing_scope in ('prayer_team', 'pastoral_only'));
alter table public.prayer_requests
  add column if not exists internal_notes text;

alter table public.visitor_forms
  add column if not exists internal_notes text;
alter table public.visitor_forms
  add column if not exists consent_at timestamptz not null default now();

alter table public.contact_messages
  add column if not exists internal_notes text;
alter table public.contact_messages
  add column if not exists consent_at timestamptz not null default now();

alter table public.event_registrations
  add column if not exists internal_notes text;
alter table public.event_registrations
  add column if not exists assigned_to uuid references public.profiles(id) on delete set null;

create index if not exists idx_prayer_scope_status
  on public.prayer_requests(sharing_scope, status, created_at desc)
  where deleted_at is null;
create index if not exists idx_registration_created_status
  on public.event_registrations(created_at desc, status);

-- Prayer access follows the requester's chosen privacy scope.
drop policy if exists "pastoral manage prayer" on public.prayer_requests;
drop policy if exists "authorized read prayer requests" on public.prayer_requests;
drop policy if exists "authorized update prayer requests" on public.prayer_requests;
drop policy if exists "authorized delete prayer requests" on public.prayer_requests;

create policy "authorized read prayer requests"
on public.prayer_requests for select to authenticated
using (
  public.has_permission('prayers.private.read')
  or (
    sharing_scope = 'prayer_team'
    and public.has_permission('prayers.read')
  )
);

create policy "authorized update prayer requests"
on public.prayer_requests for update to authenticated
using (
  public.has_permission('prayers.private.read')
  or (
    sharing_scope = 'prayer_team'
    and public.has_permission('prayers.read')
  )
)
with check (
  public.has_permission('prayers.private.read')
  or (
    sharing_scope = 'prayer_team'
    and public.has_permission('prayers.read')
  )
);

create policy "authorized delete prayer requests"
on public.prayer_requests for delete to authenticated
using (
  public.has_permission('prayers.private.read')
  or (
    sharing_scope = 'prayer_team'
    and public.has_permission('prayers.read')
  )
);

-- Route notifications to the correct team and to the dedicated registration inbox.
create or replace function public.notify_private_submission() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name = 'prayer_requests' then
    if new.sharing_scope = 'pastoral_only' then
      perform public.notify_permission_members(
        'prayers.private.read',
        'Permohonan doa rahasia baru',
        'Permohonan rahasia baru menunggu perhatian pastoral.',
        '/admin/permohonan-doa'
      );
    else
      perform public.notify_permission_members(
        'prayers.read',
        'Permohonan doa baru',
        'Sebuah permohonan doa baru menunggu perhatian tim doa.',
        '/admin/permohonan-doa'
      );
    end if;
  elsif tg_table_name = 'visitor_forms' then
    perform public.notify_permission_members(
      'visitors.read',
      'Rencana kunjungan baru',
      'Seorang pengunjung baru merencanakan kunjungan.',
      '/admin/pengunjung'
    );
  elsif tg_table_name = 'contact_messages' then
    perform public.notify_permission_members(
      'messages.read',
      'Pesan website baru',
      'Pesan baru diterima melalui halaman kontak.',
      '/admin/pesan'
    );
  elsif tg_table_name = 'event_registrations' then
    perform public.notify_permission_members(
      'events.manage',
      'Pendaftaran kegiatan baru',
      'Pendaftaran peserta baru telah diterima.',
      '/admin/pendaftaran'
    );
  end if;

  return new;
end;
$$;

revoke all on function public.notify_private_submission() from public;

-- Keep auditability without duplicating sensitive form contents.
create or replace function public.audit_row_change() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  previous_data jsonb;
  current_data jsonb;
begin
  previous_data := case
    when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old)
    else null
  end;
  current_data := case
    when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new)
    else null
  end;

  if tg_table_name = 'prayer_requests' then
    previous_data := previous_data - array[
      'name', 'whatsapp', 'email', 'request_text', 'internal_notes'
    ];
    current_data := current_data - array[
      'name', 'whatsapp', 'email', 'request_text', 'internal_notes'
    ];
  elsif tg_table_name = 'visitor_forms' then
    previous_data := previous_data - array[
      'name', 'whatsapp', 'notes', 'internal_notes'
    ];
    current_data := current_data - array[
      'name', 'whatsapp', 'notes', 'internal_notes'
    ];
  elsif tg_table_name = 'contact_messages' then
    previous_data := previous_data - array[
      'name', 'email', 'phone', 'message', 'internal_notes'
    ];
    current_data := current_data - array[
      'name', 'email', 'phone', 'message', 'internal_notes'
    ];
  elsif tg_table_name = 'event_registrations' then
    previous_data := previous_data - array[
      'name', 'whatsapp', 'email', 'notes', 'internal_notes'
    ];
    current_data := current_data - array[
      'name', 'whatsapp', 'email', 'notes', 'internal_notes'
    ];
  end if;

  insert into public.audit_logs(
    actor_id,
    action,
    entity_type,
    entity_id,
    old_data,
    new_data
  )
  values (
    auth.uid(),
    lower(tg_op),
    tg_table_name,
    coalesce(
      case when tg_op = 'DELETE' then old.id else new.id end,
      null
    ),
    previous_data,
    current_data
  );

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function public.audit_row_change() from public;
