-- Patch 3: Super Admin and admin API hardening.
-- Keeps daily ministry/content permissions intact while making system
-- administration an explicit Super Admin responsibility.

-- ---------------------------------------------------------------------------
-- 1. Explicit active Super Admin check
-- ---------------------------------------------------------------------------

create or replace function public.is_super_admin()
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
     and role.code = 'super_admin'
     and role.status = 'active'
    join public.profiles profile
      on profile.id = user_role.user_id
     and profile.status = 'active'
    where user_role.user_id = auth.uid()
  );
$$;

revoke all on function public.is_super_admin() from public;
grant execute on function public.is_super_admin() to authenticated;

-- Return only the signed-in user's active admin context. This avoids relying
-- on direct reads of the roles table from application code while RLS remains
-- strict on role metadata.
create or replace function public.get_my_admin_context()
returns table(
  role_codes text[],
  ministry_ids uuid[],
  is_active boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    coalesce(
      array_agg(distinct role.code order by role.code)
        filter (where role.code is not null and role.status = 'active'),
      array[]::text[]
    ) as role_codes,
    coalesce(
      array_agg(distinct assignment.ministry_id order by assignment.ministry_id)
        filter (
          where assignment.ministry_id is not null
            and role.status = 'active'
        ),
      array[]::uuid[]
    ) as ministry_ids,
    profile.status = 'active' as is_active
  from public.profiles profile
  left join public.user_roles assignment
    on assignment.user_id = profile.id
  left join public.roles role
    on role.id = assignment.role_id
  where profile.id = auth.uid()
  group by profile.status;
$$;

revoke all on function public.get_my_admin_context() from public;
grant execute on function public.get_my_admin_context() to authenticated;

-- System-level permissions stay Super Admin-only even if a future manual
-- role_permissions edit accidentally grants them to another role.
delete from public.role_permissions role_permission
using public.roles role, public.permissions permission
where role_permission.role_id = role.id
  and role_permission.permission_id = permission.id
  and role.code <> 'super_admin'
  and permission.code in (
    'monitoring.read',
    'users.manage',
    'appearance.manage',
    'settings.manage',
    'posts.delete_permanent'
  );

create or replace function public.has_permission(permission_code text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    -- Super Admin monitors prayer service but does not inherit the routine
    -- prayer inbox used by the selected ministry recipient.
    when permission_code in (
      'prayers.inbox.read',
      'prayers.read',
      'prayers.private.read'
    ) and public.is_super_admin() then false

    -- These rights are structural/system rights, not ministry rights.
    when permission_code in (
      'monitoring.read',
      'users.manage',
      'appearance.manage',
      'settings.manage',
      'posts.delete_permanent'
    ) then public.is_super_admin()

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

-- ---------------------------------------------------------------------------
-- 2. Disable the legacy service-role role setter
-- ---------------------------------------------------------------------------

-- The old RPC had no actor argument, so server code could not prove which
-- Super Admin initiated a role change. Remove it completely so no server code
-- can bypass the audited replacement below.
drop function if exists public.set_user_role(uuid, text);

-- ---------------------------------------------------------------------------
-- 3. Audited Super Admin-only role and department assignment RPC
-- ---------------------------------------------------------------------------

create or replace function public.admin_set_user_role(
  target_user_id uuid,
  target_role_code text,
  target_ministry_id uuid,
  actor_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_role_id uuid;
  effective_ministry_id uuid;
  old_roles text;
begin
  if not exists (
    select 1
    from public.user_roles actor_assignment
    join public.roles actor_role
      on actor_role.id = actor_assignment.role_id
     and actor_role.code = 'super_admin'
     and actor_role.status = 'active'
    join public.profiles actor_profile
      on actor_profile.id = actor_assignment.user_id
     and actor_profile.status = 'active'
    where actor_assignment.user_id = actor_user_id
  ) then
    raise exception 'Tindakan hanya dapat dilakukan oleh Super Admin aktif'
      using errcode = '42501';
  end if;

  if target_user_id = actor_user_id then
    raise exception 'Super Admin tidak dapat mengubah role dirinya sendiri'
      using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.profiles profile where profile.id = target_user_id
  ) then
    raise exception 'Pengguna tidak ditemukan' using errcode = 'P0002';
  end if;

  select role.id
  into target_role_id
  from public.roles role
  where role.code = target_role_code
    and role.status = 'active'
    and role.code in (
      'super_admin',
      'pastor',
      'church_chair',
      'prayer_team',
      'secretary',
      'editor',
      'media',
      'department_admin'
    );

  if target_role_id is null then
    raise exception 'Role tidak valid' using errcode = '22023';
  end if;

  if target_role_code = 'department_admin' then
    if target_ministry_id is null then
      raise exception 'Admin Departemen wajib memiliki departemen'
        using errcode = '22023';
    end if;

    if not exists (
      select 1
      from public.ministries ministry
      where ministry.id = target_ministry_id
        and ministry.deleted_at is null
    ) then
      raise exception 'Departemen tidak valid' using errcode = '22023';
    end if;

    effective_ministry_id := target_ministry_id;
  else
    effective_ministry_id := null;
  end if;

  select string_agg(role.code, ',' order by role.code)
  into old_roles
  from public.user_roles current_assignment
  join public.roles role on role.id = current_assignment.role_id
  where current_assignment.user_id = target_user_id;

  -- Preserve the target role row when it is already assigned. This matters
  -- for the trigger that protects the last active Super Admin.
  delete from public.user_roles assignment
  where assignment.user_id = target_user_id
    and assignment.role_id <> target_role_id;

  insert into public.user_roles(user_id, role_id, ministry_id)
  values (target_user_id, target_role_id, effective_ministry_id)
  on conflict (user_id, role_id)
  do update set ministry_id = excluded.ministry_id;

  insert into public.audit_logs(
    actor_id,
    action,
    entity_type,
    entity_id,
    old_data,
    new_data
  )
  values (
    actor_user_id,
    'role_changed',
    'profiles',
    target_user_id,
    jsonb_build_object('roles', old_roles),
    jsonb_build_object(
      'role', target_role_code,
      'ministry_id', effective_ministry_id
    )
  );
end;
$$;

revoke all on function public.admin_set_user_role(uuid, text, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.admin_set_user_role(uuid, text, uuid, uuid)
  to service_role;

-- ---------------------------------------------------------------------------
-- 4. Audited Super Admin-only account activation/deactivation RPC
-- ---------------------------------------------------------------------------

create or replace function public.admin_set_profile_status(
  target_user_id uuid,
  target_status text,
  actor_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  previous_status text;
begin
  if not exists (
    select 1
    from public.user_roles actor_assignment
    join public.roles actor_role
      on actor_role.id = actor_assignment.role_id
     and actor_role.code = 'super_admin'
     and actor_role.status = 'active'
    join public.profiles actor_profile
      on actor_profile.id = actor_assignment.user_id
     and actor_profile.status = 'active'
    where actor_assignment.user_id = actor_user_id
  ) then
    raise exception 'Tindakan hanya dapat dilakukan oleh Super Admin aktif'
      using errcode = '42501';
  end if;

  if target_status not in ('active', 'inactive') then
    raise exception 'Status pengguna tidak valid' using errcode = '22023';
  end if;

  if target_user_id = actor_user_id and target_status = 'inactive' then
    raise exception 'Super Admin tidak dapat menonaktifkan dirinya sendiri'
      using errcode = '42501';
  end if;

  select profile.status
  into previous_status
  from public.profiles profile
  where profile.id = target_user_id;

  if previous_status is null then
    raise exception 'Pengguna tidak ditemukan' using errcode = 'P0002';
  end if;

  update public.profiles profile
  set status = target_status,
      updated_at = now()
  where profile.id = target_user_id;

  insert into public.audit_logs(
    actor_id,
    action,
    entity_type,
    entity_id,
    old_data,
    new_data
  )
  values (
    actor_user_id,
    'account_status_changed',
    'profiles',
    target_user_id,
    jsonb_build_object('status', previous_status),
    jsonb_build_object('status', target_status)
  );
end;
$$;

revoke all on function public.admin_set_profile_status(uuid, text, uuid)
  from public, anon, authenticated;
grant execute on function public.admin_set_profile_status(uuid, text, uuid)
  to service_role;

-- ---------------------------------------------------------------------------
-- 5. Prevent browser/Data-API writes from bypassing the audited admin RPCs
-- ---------------------------------------------------------------------------

-- User/profile privilege changes are performed by server-side service-role
-- code only after requireSuperAdmin(). Authenticated browser sessions retain
-- read access according to RLS but cannot write these structural tables.
revoke insert, update, delete on table public.profiles from authenticated;
revoke insert, update, delete on table public.user_roles from authenticated;
revoke insert, update, delete on table public.roles from authenticated;
revoke insert, update, delete on table public.permissions from authenticated;
revoke insert, update, delete on table public.role_permissions from authenticated;

-- Remove historical write policies that could otherwise suggest browser-side
-- mutation is supported. Existing own-profile/own-role SELECT policies stay in
-- place, and the read policies below remain Super Admin-only.
drop policy if exists "user administrators manage profiles" on public.profiles;
drop policy if exists "user administrators manage assignments" on public.user_roles;
drop policy if exists "user administrators read roles" on public.roles;
drop policy if exists "user administrators read permissions" on public.permissions;
drop policy if exists "user administrators read role permissions" on public.role_permissions;

create policy "user administrators read roles"
on public.roles for select to authenticated
using (public.has_permission('users.manage'));

create policy "user administrators read permissions"
on public.permissions for select to authenticated
using (public.has_permission('users.manage'));

create policy "user administrators read role permissions"
on public.role_permissions for select to authenticated
using (public.has_permission('users.manage'));
