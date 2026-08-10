-- Patch 6 — Security headers, audit-log redaction and controlled data retention.
-- Browser headers are configured in Next.js. This migration makes database
-- audit records safer and adds service-role-only retention maintenance.

-- ---------------------------------------------------------------------------
-- 1. Audit payload redaction: store workflow metadata, not sensitive content.
-- ---------------------------------------------------------------------------

create or replace function public.sanitize_audit_payload(
  p_entity_type text,
  p_action text,
  p_data jsonb
)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_data jsonb := p_data;
begin
  if v_data is null then
    return null;
  end if;

  -- Common credential/content keys are always forbidden in audit payloads.
  v_data := v_data - array[
    'password', 'passcode', 'token', 'access_token', 'refresh_token',
    'secret', 'client_secret', 'authorization', 'cookie',
    'service_role_key', 'turnstile_secret_key', 'request_text',
    'internal_notes'
  ];

  if p_entity_type = 'prayer_requests' then
    if p_action = 'sensitive_access' then
      return jsonb_strip_nulls(jsonb_build_object(
        'reason', left(v_data ->> 'reason', 500),
        'sharing_scope', v_data ->> 'sharing_scope',
        'status', v_data ->> 'status',
        'accessed_at', v_data ->> 'accessed_at'
      ));
    end if;

    return jsonb_strip_nulls(jsonb_build_object(
      'sharing_scope', v_data ->> 'sharing_scope',
      'status', v_data ->> 'status',
      'assigned_to', v_data ->> 'assigned_to',
      'deleted', coalesce((v_data ->> 'deleted')::boolean, (v_data ->> 'deleted_at') is not null)
    ));
  elsif p_entity_type = 'visitor_forms' then
    return jsonb_strip_nulls(jsonb_build_object(
      'visit_date', v_data ->> 'visit_date',
      'people_count', v_data ->> 'people_count',
      'bringing_children', v_data ->> 'bringing_children',
      'status', v_data ->> 'status',
      'assigned_to', v_data ->> 'assigned_to',
      'deleted', (v_data ->> 'deleted_at') is not null
    ));
  elsif p_entity_type = 'contact_messages' then
    return jsonb_strip_nulls(jsonb_build_object(
      'status', v_data ->> 'status',
      'assigned_to', v_data ->> 'assigned_to',
      'deleted', (v_data ->> 'deleted_at') is not null
    ));
  elsif p_entity_type = 'event_registrations' then
    return jsonb_strip_nulls(jsonb_build_object(
      'event_id', v_data ->> 'event_id',
      'people_count', v_data ->> 'people_count',
      'status', v_data ->> 'status',
      'assigned_to', v_data ->> 'assigned_to'
    ));
  elsif p_entity_type = 'site_settings' then
    return jsonb_strip_nulls(jsonb_build_object(
      'key', v_data ->> 'key',
      'is_public', v_data ->> 'is_public',
      'status', v_data ->> 'status'
    ));
  elsif p_entity_type = 'church_profiles' then
    return jsonb_strip_nulls(jsonb_build_object(
      'name', v_data ->> 'name',
      'status', v_data ->> 'status'
    ));
  elsif p_entity_type = 'posts' then
    return jsonb_strip_nulls(jsonb_build_object(
      'slug', v_data ->> 'slug',
      'title', v_data ->> 'title',
      'category_id', v_data ->> 'category_id',
      'author_id', v_data ->> 'author_id',
      'status', v_data ->> 'status',
      'review_submitted_at', v_data ->> 'review_submitted_at',
      'reviewed_by', v_data ->> 'reviewed_by',
      'reviewed_at', v_data ->> 'reviewed_at',
      'published_by', v_data ->> 'published_by',
      'published_at', v_data ->> 'published_at',
      'deleted', (v_data ->> 'deleted_at') is not null
    ));
  elsif p_entity_type = 'events' then
    return jsonb_strip_nulls(jsonb_build_object(
      'title', v_data ->> 'title',
      'category', v_data ->> 'category',
      'ministry_id', v_data ->> 'ministry_id',
      'starts_at', v_data ->> 'starts_at',
      'ends_at', v_data ->> 'ends_at',
      'status', v_data ->> 'status',
      'published_at', v_data ->> 'published_at',
      'deleted', (v_data ->> 'deleted_at') is not null
    ));
  elsif p_entity_type = 'sermons' then
    return jsonb_strip_nulls(jsonb_build_object(
      'title', v_data ->> 'title',
      'sermon_date', v_data ->> 'sermon_date',
      'category_id', v_data ->> 'category_id',
      'speaker_id', v_data ->> 'speaker_id',
      'youtube_id', v_data ->> 'youtube_id',
      'status', v_data ->> 'status',
      'published_at', v_data ->> 'published_at',
      'deleted', (v_data ->> 'deleted_at') is not null
    ));
  elsif p_entity_type = 'livestreams' then
    return jsonb_strip_nulls(jsonb_build_object(
      'title', v_data ->> 'title',
      'starts_at', v_data ->> 'starts_at',
      'ends_at', v_data ->> 'ends_at',
      'live_status', v_data ->> 'live_status',
      'status', v_data ->> 'status',
      'published_at', v_data ->> 'published_at',
      'deleted', (v_data ->> 'deleted_at') is not null
    ));
  elsif p_entity_type = 'ministries' then
    return jsonb_strip_nulls(jsonb_build_object(
      'slug', v_data ->> 'slug',
      'name', v_data ->> 'name',
      'status', v_data ->> 'status',
      'display_order', v_data ->> 'display_order',
      'deleted', (v_data ->> 'deleted_at') is not null
    ));
  elsif p_entity_type = 'leaders' then
    return jsonb_strip_nulls(jsonb_build_object(
      'name', v_data ->> 'name',
      'position', v_data ->> 'position',
      'status', v_data ->> 'status',
      'is_public', v_data ->> 'is_public',
      'display_order', v_data ->> 'display_order',
      'deleted', (v_data ->> 'deleted_at') is not null
    ));
  elsif p_entity_type = 'notifications' then
    return jsonb_strip_nulls(jsonb_build_object(
      'user_id', v_data ->> 'user_id',
      'read_at', v_data ->> 'read_at',
      'status', v_data ->> 'status'
    ));
  end if;

  return v_data;
end;
$$;

revoke all on function public.sanitize_audit_payload(text, text, jsonb) from public;
revoke all on function public.sanitize_audit_payload(text, text, jsonb) from anon;
revoke all on function public.sanitize_audit_payload(text, text, jsonb) from authenticated;

create or replace function public.sanitize_audit_log_row()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.action := left(new.action, 80);
  new.entity_type := left(new.entity_type, 80);
  new.old_data := public.sanitize_audit_payload(new.entity_type, new.action, new.old_data);
  new.new_data := public.sanitize_audit_payload(new.entity_type, new.action, new.new_data);
  new.user_agent := case when new.user_agent is null then null else left(new.user_agent, 500) end;
  return new;
end;
$$;

revoke all on function public.sanitize_audit_log_row() from public;
revoke all on function public.sanitize_audit_log_row() from anon;
revoke all on function public.sanitize_audit_log_row() from authenticated;

drop trigger if exists sanitize_audit_logs_before_write on public.audit_logs;
create trigger sanitize_audit_logs_before_write
before insert or update on public.audit_logs
for each row execute function public.sanitize_audit_log_row();

-- The generic row-change trigger now routes every payload through the same
-- redaction function. The prayer-specific trigger from Patch 1 remains safe.
create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old jsonb := null;
  v_new jsonb := null;
  v_id uuid := null;
begin
  if tg_op in ('UPDATE', 'DELETE') then
    v_old := public.sanitize_audit_payload(tg_table_name, lower(tg_op), to_jsonb(old));
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    v_new := public.sanitize_audit_payload(tg_table_name, lower(tg_op), to_jsonb(new));
  end if;

  v_id := case when tg_op = 'DELETE' then old.id else new.id end;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, old_data, new_data)
  values (auth.uid(), lower(tg_op), tg_table_name, v_id, v_old, v_new);

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function public.audit_row_change() from public;
revoke all on function public.audit_row_change() from anon;
revoke all on function public.audit_row_change() from authenticated;

alter table public.audit_logs
  drop constraint if exists audit_logs_action_length_check;
alter table public.audit_logs
  add constraint audit_logs_action_length_check
  check (char_length(action) between 1 and 80) not valid;

alter table public.audit_logs
  drop constraint if exists audit_logs_entity_type_length_check;
alter table public.audit_logs
  add constraint audit_logs_entity_type_length_check
  check (char_length(entity_type) between 1 and 80) not valid;

alter table public.audit_logs
  drop constraint if exists audit_logs_user_agent_length_check;
alter table public.audit_logs
  add constraint audit_logs_user_agent_length_check
  check (user_agent is null or char_length(user_agent) <= 500) not valid;

create index if not exists idx_audit_created_at
  on public.audit_logs(created_at desc);
create index if not exists idx_audit_entity_created_at
  on public.audit_logs(entity_type, created_at desc);
create index if not exists idx_audit_action_created_at
  on public.audit_logs(action, created_at desc);

-- Scrub historical audit payloads using the same rules. This intentionally
-- preserves the mandatory reason for Super Admin sensitive prayer access.
update public.audit_logs
set
  old_data = public.sanitize_audit_payload(entity_type, action, old_data),
  new_data = public.sanitize_audit_payload(entity_type, action, new_data),
  user_agent = case when user_agent is null then null else left(user_agent, 500) end
where old_data is not null or new_data is not null or user_agent is not null;

-- Audit logs remain append-only for browser roles.
revoke insert, update, delete on public.audit_logs from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Explicit retention policy registry. Prayer requests are manual by design.
-- ---------------------------------------------------------------------------

create table if not exists public.data_retention_policies (
  entity_type text primary key,
  retention_days integer,
  strategy text not null check (strategy in ('delete', 'anonymize', 'manual')),
  enabled boolean not null default true,
  description text,
  updated_at timestamptz not null default now(),
  constraint data_retention_days_check check (
    (strategy = 'manual' and retention_days is null)
    or (strategy <> 'manual' and retention_days between 1 and 3650)
  )
);

alter table public.data_retention_policies enable row level security;
revoke all on table public.data_retention_policies from public, anon, authenticated;

insert into public.data_retention_policies(entity_type, retention_days, strategy, enabled, description)
values
  ('audit_logs', 730, 'delete', true, 'Audit log lebih dari 24 bulan dihapus.'),
  ('notifications', 180, 'delete', true, 'Notifikasi berstatus arsip lebih dari 6 bulan dihapus.'),
  ('security_rate_limits', 1, 'delete', true, 'Counter rate limit kedaluwarsa dibersihkan.'),
  ('contact_messages', 365, 'anonymize', true, 'Pesan yang sudah diarsipkan lebih dari 12 bulan dianonimkan dan disoft-delete.'),
  ('visitor_forms', 365, 'anonymize', true, 'Data pengunjung yang sudah diarsipkan lebih dari 12 bulan dianonimkan dan disoft-delete.'),
  ('event_registrations', 365, 'anonymize', true, 'Pendaftaran selesai/dibatalkan lebih dari 12 bulan dianonimkan.'),
  ('prayer_requests', null, 'manual', false, 'Permohonan doa tidak diproses otomatis; keputusan retensi mengikuti kebijakan pelayanan.')
on conflict(entity_type) do update set
  retention_days = excluded.retention_days,
  strategy = excluded.strategy,
  enabled = excluded.enabled,
  description = excluded.description,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- 3. Service-role-only retention runner. It never auto-purges prayer content.
-- ---------------------------------------------------------------------------

create or replace function public.run_data_retention()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_days integer;
  v_notifications integer := 0;
  v_rate_limits integer := 0;
  v_contacts integer := 0;
  v_visitors integer := 0;
  v_registrations integer := 0;
  v_audit integer := 0;
begin
  select retention_days into v_days
  from public.data_retention_policies
  where entity_type = 'notifications' and enabled and strategy = 'delete';

  if v_days is not null then
    delete from public.notifications
    where status = 'archived'
      and created_at < now() - make_interval(days => v_days);
    get diagnostics v_notifications = row_count;
  end if;

  select retention_days into v_days
  from public.data_retention_policies
  where entity_type = 'security_rate_limits' and enabled and strategy = 'delete';

  if v_days is not null then
    delete from public.security_rate_limits
    where expires_at < now() - make_interval(days => v_days);
    get diagnostics v_rate_limits = row_count;
  end if;

  select retention_days into v_days
  from public.data_retention_policies
  where entity_type = 'contact_messages' and enabled and strategy = 'anonymize';

  if v_days is not null then
    update public.contact_messages
    set
      name = 'Data dihapus',
      email = 'deleted+' || left(replace(id::text, '-', ''), 12) || '@example.invalid',
      phone = null,
      subject = 'Data kontak dihapus sesuai retensi',
      message = 'Data pribadi telah dihapus sesuai kebijakan retensi.',
      internal_notes = null,
      assigned_to = null,
      deleted_at = coalesce(deleted_at, now())
    where status = 'archived'
      and updated_at < now() - make_interval(days => v_days)
      and name <> 'Data dihapus';
    get diagnostics v_contacts = row_count;
  end if;

  select retention_days into v_days
  from public.data_retention_policies
  where entity_type = 'visitor_forms' and enabled and strategy = 'anonymize';

  if v_days is not null then
    update public.visitor_forms
    set
      name = 'Data dihapus',
      whatsapp = 'redacted',
      notes = null,
      internal_notes = null,
      assigned_to = null,
      deleted_at = coalesce(deleted_at, now())
    where status = 'archived'
      and updated_at < now() - make_interval(days => v_days)
      and name <> 'Data dihapus';
    get diagnostics v_visitors = row_count;
  end if;

  select retention_days into v_days
  from public.data_retention_policies
  where entity_type = 'event_registrations' and enabled and strategy = 'anonymize';

  if v_days is not null then
    update public.event_registrations
    set
      name = 'Data dihapus',
      whatsapp = null,
      email = null,
      notes = null,
      internal_notes = null,
      assigned_to = null
    where status in ('attended', 'cancelled')
      and updated_at < now() - make_interval(days => v_days)
      and name <> 'Data dihapus';
    get diagnostics v_registrations = row_count;
  end if;

  -- Delete old audit logs last so anonymization actions above remain auditable.
  select retention_days into v_days
  from public.data_retention_policies
  where entity_type = 'audit_logs' and enabled and strategy = 'delete';

  if v_days is not null then
    delete from public.audit_logs
    where created_at < now() - make_interval(days => v_days);
    get diagnostics v_audit = row_count;
  end if;

  return jsonb_build_object(
    'notifications_deleted', v_notifications,
    'rate_limits_deleted', v_rate_limits,
    'contact_messages_anonymized', v_contacts,
    'visitor_forms_anonymized', v_visitors,
    'event_registrations_anonymized', v_registrations,
    'audit_logs_deleted', v_audit,
    'prayer_requests_automatic_changes', 0
  );
end;
$$;

revoke all on function public.run_data_retention() from public;
revoke all on function public.run_data_retention() from anon;
revoke all on function public.run_data_retention() from authenticated;
grant execute on function public.run_data_retention() to service_role;

comment on function public.run_data_retention() is
  'Applies configured retention rules. Prayer requests are intentionally excluded from automatic changes.';

notify pgrst, 'reload schema';
