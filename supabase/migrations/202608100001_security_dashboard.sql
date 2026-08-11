-- Patch 7 — Security Dashboard and automated security diagnostics.
-- The dashboard RPC is service-role-only; browser sessions cannot call it.
-- It exposes counts/status only, never secrets or prayer content.

create or replace function public.get_security_dashboard_checks()
returns table(
  check_key text,
  category text,
  title text,
  status text,
  issue_count bigint,
  summary text,
  remediation text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  -- 1. Expected application tables must exist and have RLS enabled.
  return query
  with expected(table_name) as (
    values
      ('roles'), ('permissions'), ('role_permissions'), ('profiles'),
      ('user_roles'), ('site_settings'), ('media_files'), ('leaders'),
      ('ministries'), ('service_schedules'), ('events'),
      ('event_registrations'), ('sermons'), ('posts'),
      ('gallery_albums'), ('gallery_images'), ('prayer_requests'),
      ('visitor_forms'), ('contact_messages'), ('notifications'),
      ('audit_logs'), ('data_retention_policies'), ('security_rate_limits')
  ), findings as (
    select count(*)::bigint as issue_count
    from expected expected_table
    left join pg_catalog.pg_namespace namespace
      on namespace.nspname = 'public'
    left join pg_catalog.pg_class relation
      on relation.relnamespace = namespace.oid
     and relation.relname = expected_table.table_name
    where relation.oid is null
       or relation.relrowsecurity is not true
  )
  select
    'rls_enabled'::text,
    'Database & RLS'::text,
    'RLS tabel aplikasi'::text,
    case when findings.issue_count = 0 then 'pass' else 'fail' end::text,
    findings.issue_count,
    case
      when findings.issue_count = 0 then 'Semua tabel aplikasi yang dipantau tersedia dan RLS aktif.'
      else format('%s tabel hilang atau RLS belum aktif.', findings.issue_count)
    end::text,
    case when findings.issue_count = 0 then null else 'Periksa migration dan aktifkan RLS sebelum production.' end::text
  from findings;

  -- 2. Tables with RLS but zero policies are safe-deny, but usually deserve review.
  return query
  with expected(table_name) as (
    values
      ('posts'), ('events'), ('sermons'), ('ministries'), ('leaders'),
      ('service_schedules'), ('prayer_requests'), ('visitor_forms'),
      ('contact_messages'), ('event_registrations'), ('media_files'),
      ('notifications'), ('gallery_albums'), ('gallery_images')
  ), findings as (
    select count(*)::bigint as issue_count
    from expected expected_table
    where not exists (
      select 1
      from pg_catalog.pg_policies policy
      where policy.schemaname = 'public'
        and policy.tablename = expected_table.table_name
    )
  )
  select
    'rls_policy_coverage'::text,
    'Database & RLS'::text,
    'Cakupan policy RLS'::text,
    case when findings.issue_count = 0 then 'pass' else 'warning' end::text,
    findings.issue_count,
    case
      when findings.issue_count = 0 then 'Tabel data utama memiliki policy RLS eksplisit.'
      else format('%s tabel data utama tidak memiliki policy RLS eksplisit dan akan bersifat deny-all.', findings.issue_count)
    end::text,
    case when findings.issue_count = 0 then null else 'Tinjau apakah deny-all memang disengaja; jika tidak, tambahkan policy paling minimal.' end::text
  from findings;

  -- 3. At least one active Super Admin must remain available.
  return query
  with totals as (
    select count(distinct assignment.user_id)::bigint as total
    from public.user_roles assignment
    join public.roles role
      on role.id = assignment.role_id
     and role.code = 'super_admin'
     and role.status = 'active'
    join public.profiles profile
      on profile.id = assignment.user_id
     and profile.status = 'active'
  )
  select
    'active_super_admin'::text,
    'Akun & Role'::text,
    'Super Admin aktif'::text,
    case when totals.total >= 1 then 'pass' else 'fail' end::text,
    case when totals.total >= 1 then 0 else 1 end::bigint,
    format('%s Super Admin aktif terdeteksi.', totals.total)::text,
    case when totals.total >= 1 then null else 'Pulihkan minimal satu akun Super Admin aktif melalui prosedur recovery yang terkontrol.' end::text
  from totals;

  -- 4. Active profiles should have at least one active role.
  return query
  with findings as (
    select count(*)::bigint as issue_count
    from public.profiles profile
    where profile.status = 'active'
      and not exists (
        select 1
        from public.user_roles assignment
        join public.roles role
          on role.id = assignment.role_id
         and role.status = 'active'
        where assignment.user_id = profile.id
      )
  )
  select
    'active_profiles_without_role'::text,
    'Akun & Role'::text,
    'Akun aktif tanpa role'::text,
    case when findings.issue_count = 0 then 'pass' else 'warning' end::text,
    findings.issue_count,
    case when findings.issue_count = 0 then 'Semua profil aktif memiliki role admin aktif.' else format('%s profil aktif tidak memiliki role aktif.', findings.issue_count) end::text,
    case when findings.issue_count = 0 then null else 'Tinjau akun tersebut dari menu Pengguna; berikan role yang benar atau nonaktifkan akun.' end::text
  from findings;

  -- 5. Department admins need a concrete department assignment.
  return query
  with findings as (
    select count(distinct assignment.user_id)::bigint as issue_count
    from public.user_roles assignment
    join public.roles role
      on role.id = assignment.role_id
     and role.code = 'department_admin'
     and role.status = 'active'
    join public.profiles profile
      on profile.id = assignment.user_id
     and profile.status = 'active'
    where assignment.ministry_id is null
  )
  select
    'department_admin_assignment'::text,
    'Akun & Role'::text,
    'Penugasan Admin Departemen'::text,
    case when findings.issue_count = 0 then 'pass' else 'fail' end::text,
    findings.issue_count,
    case when findings.issue_count = 0 then 'Semua Admin Departemen aktif telah ditugaskan ke departemen.' else format('%s Admin Departemen aktif belum memiliki penugasan.', findings.issue_count) end::text,
    case when findings.issue_count = 0 then null else 'Tetapkan ministry_id melalui menu Pengguna sebelum akun tersebut mengelola data departemen.' end::text
  from findings;

  -- 6. Active non-Super Admin roles should have at least one permission.
  return query
  with findings as (
    select count(*)::bigint as issue_count
    from public.roles role
    where role.status = 'active'
      and role.code <> 'super_admin'
      and not exists (
        select 1
        from public.role_permissions assignment
        where assignment.role_id = role.id
      )
  )
  select
    'role_without_permissions'::text,
    'Akun & Role'::text,
    'Role aktif memiliki permission'::text,
    case when findings.issue_count = 0 then 'pass' else 'warning' end::text,
    findings.issue_count,
    case when findings.issue_count = 0 then 'Semua role pelayanan/admin aktif memiliki minimal satu permission.' else format('%s role aktif tidak memiliki permission assignment.', findings.issue_count) end::text,
    case when findings.issue_count = 0 then null else 'Tinjau role tersebut; berikan permission minimum yang sesuai atau nonaktifkan role jika tidak digunakan.' end::text
  from findings;

  -- 7. System privileges must never be granted to non-Super Admin roles.
  return query
  with findings as (
    select count(*)::bigint as issue_count
    from public.role_permissions role_permission
    join public.roles role on role.id = role_permission.role_id
    join public.permissions permission on permission.id = role_permission.permission_id
    where role.code <> 'super_admin'
      and permission.code in (
        'monitoring.read', 'users.manage', 'appearance.manage',
        'settings.manage', 'posts.delete_permanent'
      )
  )
  select
    'system_permission_leak'::text,
    'Akun & Role'::text,
    'Permission sistem hanya Super Admin'::text,
    case when findings.issue_count = 0 then 'pass' else 'fail' end::text,
    findings.issue_count,
    case when findings.issue_count = 0 then 'Tidak ada role lain yang memiliki permission struktural Super Admin.' else format('%s assignment permission sistem ditemukan pada role non-Super Admin.', findings.issue_count) end::text,
    case when findings.issue_count = 0 then null else 'Cabut assignment permission struktural dari role non-Super Admin dan audit perubahan role_permissions.' end::text
  from findings;

  -- 8. Browser roles must not directly mutate privilege tables.
  return query
  with findings as (
    select count(*)::bigint as issue_count
    from information_schema.role_table_grants grant_row
    where grant_row.table_schema = 'public'
      and grant_row.table_name in ('roles', 'permissions', 'role_permissions', 'user_roles')
      and grant_row.grantee in ('anon', 'authenticated')
      and grant_row.privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE')
  )
  select
    'privilege_table_browser_writes'::text,
    'Database & RLS'::text,
    'Privilege table tidak writable dari browser'::text,
    case when findings.issue_count = 0 then 'pass' else 'fail' end::text,
    findings.issue_count,
    case when findings.issue_count = 0 then 'Browser role tidak memiliki grant mutasi pada tabel privilege.' else format('%s grant mutasi browser ditemukan pada tabel privilege.', findings.issue_count) end::text,
    case when findings.issue_count = 0 then null else 'REVOKE grant mutasi dari anon/authenticated dan gunakan RPC server-only yang diaudit.' end::text
  from findings;

  -- 9. Sensitive public-form tables use server-side submission flow.
  return query
  with findings as (
    select count(*)::bigint as issue_count
    from information_schema.role_table_grants grant_row
    where grant_row.table_schema = 'public'
      and grant_row.table_name in (
        'prayer_requests', 'visitor_forms', 'contact_messages', 'event_registrations'
      )
      and grant_row.grantee in ('anon', 'authenticated')
      and grant_row.privilege_type in ('INSERT', 'DELETE')
  )
  select
    'sensitive_form_direct_writes'::text,
    'Form & Privasi'::text,
    'Form sensitif melalui server'::text,
    case when findings.issue_count = 0 then 'pass' else 'fail' end::text,
    findings.issue_count,
    case when findings.issue_count = 0 then 'Browser tidak memiliki grant INSERT/DELETE langsung pada tabel form sensitif.' else format('%s grant direct-write ditemukan pada tabel form sensitif.', findings.issue_count) end::text,
    case when findings.issue_count = 0 then null else 'Cabut grant langsung dan pertahankan validasi/Turnstile/rate-limit pada route server.' end::text
  from findings;

  -- 10. Storage browser sessions must not have write RLS policies.
  return query
  with findings as (
    select count(*)::bigint as issue_count
    from pg_catalog.pg_policies policy
    where policy.schemaname = 'storage'
      and policy.tablename = 'objects'
      and policy.cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
      and (
        'anon' = any(policy.roles)
        or 'authenticated' = any(policy.roles)
        or 'public' = any(policy.roles)
      )
  )
  select
    'storage_browser_write_policy'::text,
    'Upload & Storage'::text,
    'Storage write server-only'::text,
    case when findings.issue_count = 0 then 'pass' else 'fail' end::text,
    findings.issue_count,
    case when findings.issue_count = 0 then 'Tidak ada policy write storage.objects untuk browser role.' else format('%s policy write Storage dapat dijangkau browser role.', findings.issue_count) end::text,
    case when findings.issue_count = 0 then null else 'Hapus policy write browser; upload harus melalui route server yang memvalidasi role, MIME, ekstensi, ukuran, dan signature.' end::text
  from findings;

  -- 11. Prayer scope contains only the two final recipients.
  return query
  with findings as (
    select count(*)::bigint as issue_count
    from public.prayer_requests prayer
    where prayer.sharing_scope is null
       or prayer.sharing_scope not in ('prayer_team', 'pastor')
  )
  select
    'prayer_scope'::text,
    'Form & Privasi'::text,
    'Tujuan permohonan doa final'::text,
    case when findings.issue_count = 0 then 'pass' else 'fail' end::text,
    findings.issue_count,
    case when findings.issue_count = 0 then 'Semua permohonan menggunakan Tim Pendoa Jemaat atau Pendeta/Gembala Jemaat.' else format('%s permohonan memiliki sharing_scope di luar aturan final.', findings.issue_count) end::text,
    case when findings.issue_count = 0 then null else 'Jangan memetakan otomatis data yang tidak dikenal. Tinjau manual sebelum memperbaiki sharing_scope.' end::text
  from findings;

  -- 12. Assigned prayer handler must match the requested service role.
  return query
  with findings as (
    select count(*)::bigint as issue_count
    from public.prayer_requests prayer
    where prayer.assigned_to is not null
      and not exists (
        select 1
        from public.user_roles assignment
        join public.roles role
          on role.id = assignment.role_id
         and role.status = 'active'
        join public.profiles profile
          on profile.id = assignment.user_id
         and profile.status = 'active'
        where assignment.user_id = prayer.assigned_to
          and role.code = prayer.sharing_scope
      )
  )
  select
    'prayer_handler_role'::text,
    'Form & Privasi'::text,
    'Penanggung jawab doa sesuai penerima'::text,
    case when findings.issue_count = 0 then 'pass' else 'fail' end::text,
    findings.issue_count,
    case when findings.issue_count = 0 then 'Semua penanggung jawab yang terisi memiliki role pelayanan sesuai pilihan jemaat.' else format('%s permohonan memiliki penanggung jawab yang tidak sesuai role penerima.', findings.issue_count) end::text,
    case when findings.issue_count = 0 then null else 'Kosongkan/ubah assigned_to melalui alur pelayanan yang benar dan audit penyebab mismatch.' end::text
  from findings;

  -- 13. SECURITY DEFINER functions in public need an explicit search_path.
  return query
  with findings as (
    select count(*)::bigint as issue_count
    from pg_catalog.pg_proc procedure
    join pg_catalog.pg_namespace namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'public'
      and procedure.prosecdef
      and not exists (
        select 1
        from unnest(coalesce(procedure.proconfig, array[]::text[])) configuration
        where configuration like 'search_path=%'
      )
  )
  select
    'security_definer_search_path'::text,
    'Database & RLS'::text,
    'SECURITY DEFINER memakai search_path eksplisit'::text,
    case when findings.issue_count = 0 then 'pass' else 'fail' end::text,
    findings.issue_count,
    case when findings.issue_count = 0 then 'Function SECURITY DEFINER pada schema public memiliki search_path eksplisit.' else format('%s function SECURITY DEFINER tidak mengunci search_path.', findings.issue_count) end::text,
    case when findings.issue_count = 0 then null else 'Tambahkan SET search_path = '''' dan gunakan nama schema lengkap pada setiap object yang direferensikan.' end::text
  from findings;

  -- 14. Audit payload must not contain forbidden root keys after Patch 6.
  return query
  with findings as (
    select count(*)::bigint as issue_count
    from public.audit_logs audit
    where exists (
      select 1
      from jsonb_object_keys(case when jsonb_typeof(audit.old_data) = 'object' then audit.old_data else '{}'::jsonb end) key_name
      where lower(key_name) in (
        'password', 'passcode', 'token', 'access_token', 'refresh_token',
        'secret', 'client_secret', 'authorization', 'cookie',
        'service_role_key', 'turnstile_secret_key', 'request_text',
        'internal_notes'
      )
    ) or exists (
      select 1
      from jsonb_object_keys(case when jsonb_typeof(audit.new_data) = 'object' then audit.new_data else '{}'::jsonb end) key_name
      where lower(key_name) in (
        'password', 'passcode', 'token', 'access_token', 'refresh_token',
        'secret', 'client_secret', 'authorization', 'cookie',
        'service_role_key', 'turnstile_secret_key', 'request_text',
        'internal_notes'
      )
    )
  )
  select
    'audit_sensitive_keys'::text,
    'Audit & Retensi'::text,
    'Audit log bebas key sensitif'::text,
    case when findings.issue_count = 0 then 'pass' else 'fail' end::text,
    findings.issue_count,
    case when findings.issue_count = 0 then 'Tidak ditemukan key sensitif terlarang pada payload audit.' else format('%s audit log masih mengandung key sensitif pada root payload.', findings.issue_count) end::text,
    case when findings.issue_count = 0 then null else 'Jalankan sanitasi audit historis dan periksa semua jalur penulisan audit.' end::text
  from findings;

  -- 15. Prayer request retention stays manual by design.
  return query
  with findings as (
    select count(*)::bigint as issue_count
    from public.data_retention_policies policy
    where policy.entity_type = 'prayer_requests'
      and (policy.enabled is true or policy.strategy <> 'manual' or policy.retention_days is not null)
  )
  select
    'prayer_retention_manual'::text,
    'Audit & Retensi'::text,
    'Retensi permohonan doa tetap manual'::text,
    case when findings.issue_count = 0 then 'pass' else 'fail' end::text,
    findings.issue_count,
    case when findings.issue_count = 0 then 'Permohonan doa tidak termasuk proses retensi otomatis.' else 'Kebijakan retensi permohonan doa berubah dari mode manual.' end::text,
    case when findings.issue_count = 0 then null else 'Kembalikan prayer_requests ke strategy=manual, enabled=false, retention_days=null sebelum menjalankan retensi.' end::text
  from findings;
end;
$$;

revoke all on function public.get_security_dashboard_checks() from public;
revoke all on function public.get_security_dashboard_checks() from anon;
revoke all on function public.get_security_dashboard_checks() from authenticated;
grant execute on function public.get_security_dashboard_checks() to service_role;

comment on function public.get_security_dashboard_checks() is
  'Service-role-only security posture checks. Returns metadata/counts only and never prayer content or secret values.';
