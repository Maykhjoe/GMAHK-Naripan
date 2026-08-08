-- Patch 4 — Supabase RLS hardening
-- Defense in depth for direct Data API access after API/Super Admin hardening.
-- Keeps public published content readable while enforcing department, ownership,
-- editorial, and prayer-recipient boundaries at the database layer.

-- ---------------------------------------------------------------------------
-- 1. Reusable RLS scope helpers
-- ---------------------------------------------------------------------------

create or replace function public.user_assigned_to_ministry(target_ministry_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select target_ministry_id is not null
    and exists (
      select 1
      from public.user_roles assignment
      join public.roles role
        on role.id = assignment.role_id
       and role.code = 'department_admin'
       and role.status = 'active'
      join public.profiles profile
        on profile.id = assignment.user_id
       and profile.status = 'active'
      where assignment.user_id = auth.uid()
        and assignment.ministry_id = target_ministry_id
    );
$$;

create or replace function public.can_manage_ministry_row(target_ministry_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_super_admin()
    or (
      public.has_permission('ministries.manage')
      and public.has_active_role('department_admin')
      and public.user_assigned_to_ministry(target_ministry_id)
    );
$$;

create or replace function public.can_manage_event_ministry(target_ministry_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_permission('events.manage')
    and (
      public.is_super_admin()
      or not public.has_active_role('department_admin')
      or public.user_assigned_to_ministry(target_ministry_id)
    );
$$;

create or replace function public.can_manage_event_registration(target_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_permission('events.manage')
    and exists (
      select 1
      from public.events event
      where event.id = target_event_id
        and event.deleted_at is null
        and (
          public.is_super_admin()
          or not public.has_active_role('department_admin')
          or public.user_assigned_to_ministry(event.ministry_id)
        )
    );
$$;

create or replace function public.can_manage_gallery_owner(target_owner_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_permission('gallery.manage')
    and (
      public.is_super_admin()
      or not public.has_active_role('department_admin')
      or target_owner_id = auth.uid()
    );
$$;

create or replace function public.can_manage_gallery_album(target_album_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.gallery_albums album
    where album.id = target_album_id
      and album.deleted_at is null
      and public.can_manage_gallery_owner(album.created_by)
  );
$$;

create or replace function public.can_contribute_media_usage(
  target_usage text,
  target_owner_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select target_owner_id = auth.uid()
    and case target_usage
      when 'post-featured-image' then public.has_permission('posts.manage')
      when 'event-poster' then public.has_permission('events.manage')
      when 'sermon-thumbnail' then public.has_permission('sermons.manage')
      when 'livestream-thumbnail' then public.has_permission('livestreams.manage')
      when 'leader-photo' then public.has_permission('leaders.manage')
      when 'ministry-thumbnail' then public.has_permission('ministries.manage')
      else false
    end;
$$;

revoke all on function public.user_assigned_to_ministry(uuid) from public;
revoke all on function public.can_manage_ministry_row(uuid) from public;
revoke all on function public.can_manage_event_ministry(uuid) from public;
revoke all on function public.can_manage_event_registration(uuid) from public;
revoke all on function public.can_manage_gallery_owner(uuid) from public;
revoke all on function public.can_manage_gallery_album(uuid) from public;
revoke all on function public.can_contribute_media_usage(text, uuid) from public;

grant execute on function public.user_assigned_to_ministry(uuid) to authenticated;
grant execute on function public.can_manage_ministry_row(uuid) to authenticated;
grant execute on function public.can_manage_event_ministry(uuid) to authenticated;
grant execute on function public.can_manage_event_registration(uuid) to authenticated;
grant execute on function public.can_manage_gallery_owner(uuid) to authenticated;
grant execute on function public.can_manage_gallery_album(uuid) to authenticated;
grant execute on function public.can_contribute_media_usage(text, uuid) to authenticated;

-- Indexes used by RLS scope checks.
create index if not exists user_roles_user_ministry_idx
  on public.user_roles(user_id, ministry_id)
  where ministry_id is not null;

create index if not exists events_ministry_active_idx
  on public.events(ministry_id, starts_at desc)
  where deleted_at is null;

create index if not exists gallery_albums_created_by_active_idx
  on public.gallery_albums(created_by, created_at desc)
  where deleted_at is null;

-- ---------------------------------------------------------------------------
-- 2. Admin Departemen: ministries are update-only within assigned department
-- ---------------------------------------------------------------------------

drop policy if exists "module manage ministries" on public.ministries;
drop policy if exists "rls ministries scoped select" on public.ministries;
drop policy if exists "rls ministries superadmin insert" on public.ministries;
drop policy if exists "rls ministries scoped update" on public.ministries;
drop policy if exists "rls ministries superadmin delete" on public.ministries;

create policy "rls ministries scoped select"
on public.ministries for select to authenticated
using (public.can_manage_ministry_row(id));

-- Creating a new department is structural administration. Admin Departemen
-- only manages an already assigned department.
create policy "rls ministries superadmin insert"
on public.ministries for insert to authenticated
with check (public.is_super_admin());

create policy "rls ministries scoped update"
on public.ministries for update to authenticated
using (public.can_manage_ministry_row(id))
with check (public.can_manage_ministry_row(id));

create policy "rls ministries superadmin delete"
on public.ministries for delete to authenticated
using (public.is_super_admin());

-- ---------------------------------------------------------------------------
-- 3. Events and registrations: department boundary enforced in PostgreSQL
-- ---------------------------------------------------------------------------

drop policy if exists "module manage events" on public.events;
drop policy if exists "rls events scoped select" on public.events;
drop policy if exists "rls events scoped insert" on public.events;
drop policy if exists "rls events scoped update" on public.events;
drop policy if exists "rls events superadmin delete" on public.events;

create policy "rls events scoped select"
on public.events for select to authenticated
using (public.can_manage_event_ministry(ministry_id));

create policy "rls events scoped insert"
on public.events for insert to authenticated
with check (
  public.can_manage_event_ministry(ministry_id)
  and created_by = auth.uid()
);

create policy "rls events scoped update"
on public.events for update to authenticated
using (public.can_manage_event_ministry(ministry_id))
with check (public.can_manage_event_ministry(ministry_id));

-- Application deletion is soft-delete through UPDATE. True DELETE is reserved
-- to Super Admin as a recovery/maintenance capability.
create policy "rls events superadmin delete"
on public.events for delete to authenticated
using (public.is_super_admin());

-- Replace legacy all-events registration access. Published event data remains
-- public, but registrant identity/contact is available only inside the event
-- manager's permitted scope.
drop policy if exists "event admins registrations" on public.event_registrations;
drop policy if exists "event admins read registrations" on public.event_registrations;
drop policy if exists "event admins update registrations" on public.event_registrations;
drop policy if exists "rls registrations scoped select" on public.event_registrations;
drop policy if exists "rls registrations scoped update" on public.event_registrations;

create policy "rls registrations scoped select"
on public.event_registrations for select to authenticated
using (public.can_manage_event_registration(event_id));

create policy "rls registrations scoped update"
on public.event_registrations for update to authenticated
using (public.can_manage_event_registration(event_id))
with check (public.can_manage_event_registration(event_id));

-- Public registration continues through the server-only service-role RPC.
revoke insert, delete on table public.event_registrations from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. Gallery ownership for Admin Departemen
-- ---------------------------------------------------------------------------

drop policy if exists "module manage gallery_albums" on public.gallery_albums;
drop policy if exists "module manage gallery_images" on public.gallery_images;
drop policy if exists "rls gallery albums scoped select" on public.gallery_albums;
drop policy if exists "rls gallery albums own insert" on public.gallery_albums;
drop policy if exists "rls gallery albums scoped update" on public.gallery_albums;
drop policy if exists "rls gallery albums superadmin delete" on public.gallery_albums;
drop policy if exists "rls gallery images scoped select" on public.gallery_images;
drop policy if exists "rls gallery images scoped insert" on public.gallery_images;
drop policy if exists "rls gallery images scoped update" on public.gallery_images;
drop policy if exists "rls gallery images superadmin delete" on public.gallery_images;

create policy "rls gallery albums scoped select"
on public.gallery_albums for select to authenticated
using (public.can_manage_gallery_owner(created_by));

create policy "rls gallery albums own insert"
on public.gallery_albums for insert to authenticated
with check (
  public.has_permission('gallery.manage')
  and created_by = auth.uid()
);

create policy "rls gallery albums scoped update"
on public.gallery_albums for update to authenticated
using (public.can_manage_gallery_owner(created_by))
with check (public.can_manage_gallery_owner(created_by));

create policy "rls gallery albums superadmin delete"
on public.gallery_albums for delete to authenticated
using (public.is_super_admin());

create policy "rls gallery images scoped select"
on public.gallery_images for select to authenticated
using (public.can_manage_gallery_album(album_id));

create policy "rls gallery images scoped insert"
on public.gallery_images for insert to authenticated
with check (
  public.can_manage_gallery_album(album_id)
  and created_by = auth.uid()
);

create policy "rls gallery images scoped update"
on public.gallery_images for update to authenticated
using (public.can_manage_gallery_album(album_id))
with check (public.can_manage_gallery_album(album_id));

create policy "rls gallery images superadmin delete"
on public.gallery_images for delete to authenticated
using (public.is_super_admin());

-- ---------------------------------------------------------------------------
-- 5. Media metadata: module-specific own uploads without files.manage leakage
-- ---------------------------------------------------------------------------

-- files.manage gives Media/Sekretaris/Super Admin the file-library role, but
-- the old FOR ALL policy is removed so it cannot bypass creator attribution or
-- the Super Admin-only hard-delete rule. Other module managers receive only
-- metadata access for files they uploaded for the matching module usage.
drop policy if exists "module manage media_files" on public.media_files;
drop policy if exists "post contributors insert own media" on public.media_files;
drop policy if exists "post contributors read own media" on public.media_files;
drop policy if exists "post contributors update own media" on public.media_files;
drop policy if exists "post contributors delete own media" on public.media_files;
drop policy if exists "module contributors select own media" on public.media_files;
drop policy if exists "module contributors insert own media" on public.media_files;
drop policy if exists "module contributors update own media" on public.media_files;
drop policy if exists "media managers select all" on public.media_files;
drop policy if exists "media managers own insert" on public.media_files;
drop policy if exists "media managers update all" on public.media_files;
drop policy if exists "media metadata superadmin delete" on public.media_files;

create policy "media managers select all"
on public.media_files for select to authenticated
using (public.has_permission('files.manage'));

create policy "module contributors select own media"
on public.media_files for select to authenticated
using (
  public.can_contribute_media_usage(metadata ->> 'usage', created_by)
);

create policy "module contributors insert own media"
on public.media_files for insert to authenticated
with check (
  bucket = 'public-media'
  and created_by = auth.uid()
  and public.can_contribute_media_usage(metadata ->> 'usage', created_by)
);

create policy "module contributors update own media"
on public.media_files for update to authenticated
using (
  public.can_contribute_media_usage(metadata ->> 'usage', created_by)
)
with check (
  bucket = 'public-media'
  and created_by = auth.uid()
  and public.can_contribute_media_usage(metadata ->> 'usage', created_by)
);

create policy "media managers own insert"
on public.media_files for insert to authenticated
with check (
  public.has_permission('files.manage')
  and created_by = auth.uid()
);

create policy "media managers update all"
on public.media_files for update to authenticated
using (public.has_permission('files.manage'))
with check (public.has_permission('files.manage'));

-- Soft deletion is the application path. True metadata deletion is Super Admin.
create policy "media metadata superadmin delete"
on public.media_files for delete to authenticated
using (public.is_super_admin());

-- ---------------------------------------------------------------------------
-- 6. Article taxonomy: contributors can use taxonomy, editors govern taxonomy
-- ---------------------------------------------------------------------------

drop policy if exists "module manage post_categories" on public.post_categories;
drop policy if exists "module manage post_tags" on public.post_tags;
drop policy if exists "module manage post_tag_assignments" on public.post_tag_assignments;
drop policy if exists "rls post categories admin read" on public.post_categories;
drop policy if exists "rls post categories editorial insert" on public.post_categories;
drop policy if exists "rls post categories editorial update" on public.post_categories;
drop policy if exists "rls post categories superadmin delete" on public.post_categories;
drop policy if exists "rls post tags admin read" on public.post_tags;
drop policy if exists "rls post tags editorial insert" on public.post_tags;
drop policy if exists "rls post tags editorial update" on public.post_tags;
drop policy if exists "rls post tags superadmin delete" on public.post_tags;
drop policy if exists "rls post tag assignments contributor select" on public.post_tag_assignments;
drop policy if exists "rls post tag assignments contributor insert" on public.post_tag_assignments;
drop policy if exists "rls post tag assignments contributor delete" on public.post_tag_assignments;

create policy "rls post categories admin read"
on public.post_categories for select to authenticated
using (public.has_permission('posts.manage'));

create policy "rls post categories editorial insert"
on public.post_categories for insert to authenticated
with check (
  public.has_permission('posts.edit_all')
  and created_by = auth.uid()
);

create policy "rls post categories editorial update"
on public.post_categories for update to authenticated
using (public.has_permission('posts.edit_all'))
with check (public.has_permission('posts.edit_all'));

create policy "rls post categories superadmin delete"
on public.post_categories for delete to authenticated
using (public.is_super_admin());

create policy "rls post tags admin read"
on public.post_tags for select to authenticated
using (public.has_permission('posts.manage'));

create policy "rls post tags editorial insert"
on public.post_tags for insert to authenticated
with check (
  public.has_permission('posts.edit_all')
  and created_by = auth.uid()
);

create policy "rls post tags editorial update"
on public.post_tags for update to authenticated
using (public.has_permission('posts.edit_all'))
with check (public.has_permission('posts.edit_all'));

create policy "rls post tags superadmin delete"
on public.post_tags for delete to authenticated
using (public.is_super_admin());

create policy "rls post tag assignments contributor select"
on public.post_tag_assignments for select to authenticated
using (
  exists (
    select 1
    from public.posts post
    where post.id = public.post_tag_assignments.post_id
      and (
        post.created_by = auth.uid()
        or public.has_permission('posts.edit_all')
      )
  )
);

create policy "rls post tag assignments contributor insert"
on public.post_tag_assignments for insert to authenticated
with check (
  exists (
    select 1
    from public.posts post
    where post.id = public.post_tag_assignments.post_id
      and (
        post.created_by = auth.uid()
        or public.has_permission('posts.edit_all')
      )
  )
);

create policy "rls post tag assignments contributor delete"
on public.post_tag_assignments for delete to authenticated
using (
  exists (
    select 1
    from public.posts post
    where post.id = public.post_tag_assignments.post_id
      and (
        post.created_by = auth.uid()
        or public.has_permission('posts.edit_all')
      )
  )
);

-- ---------------------------------------------------------------------------
-- 7. Soft-deletable content: true DELETE is Super Admin-only
-- ---------------------------------------------------------------------------

-- Split legacy FOR ALL policies for resources where non-Super Admin managers
-- still need normal create/read/update, but permanent row deletion must not be
-- possible through a direct Data API call.
do $$
declare
  item text[];
begin
  foreach item slice 1 in array array[
    array['service_schedules', 'schedules.manage'],
    array['speakers', 'sermons.manage'],
    array['leaders', 'leaders.manage'],
    array['sermon_categories', 'sermons.manage'],
    array['sermons', 'sermons.manage'],
    array['livestreams', 'livestreams.manage'],
    array['announcements', 'appearance.manage'],
    array['downloads', 'files.manage']
  ] loop
    execute format('drop policy if exists "module manage %s" on public.%I', item[1], item[1]);
    execute format('drop policy if exists "rls %s managers select" on public.%I', item[1], item[1]);
    execute format('drop policy if exists "rls %s managers insert" on public.%I', item[1], item[1]);
    execute format('drop policy if exists "rls %s managers update" on public.%I', item[1], item[1]);
    execute format('drop policy if exists "rls %s superadmin delete" on public.%I', item[1], item[1]);

    execute format(
      'create policy "rls %s managers select" on public.%I for select to authenticated using (public.has_permission(%L))',
      item[1], item[1], item[2]
    );
    execute format(
      'create policy "rls %s managers insert" on public.%I for insert to authenticated with check (public.has_permission(%L) and created_by = auth.uid())',
      item[1], item[1], item[2]
    );
    execute format(
      'create policy "rls %s managers update" on public.%I for update to authenticated using (public.has_permission(%L)) with check (public.has_permission(%L))',
      item[1], item[1], item[2], item[2]
    );
    execute format(
      'create policy "rls %s superadmin delete" on public.%I for delete to authenticated using (public.is_super_admin())',
      item[1], item[1]
    );
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- 8. Sensitive public submissions: no direct browser creation/deletion
-- ---------------------------------------------------------------------------

-- Public forms are inserted by server-verified service-role routes after Zod,
-- Turnstile, and rate-limit checks. Keep direct Data API INSERT blocked even if
-- an old permissive policy still exists from a prior migration.
revoke insert on table public.prayer_requests from anon, authenticated;
revoke insert on table public.visitor_forms from anon, authenticated;
revoke insert on table public.contact_messages from anon, authenticated;

-- Workflow uses UPDATE/soft-delete. Do not allow a ministry role to physically
-- erase sensitive submissions with a direct DELETE request.
revoke delete on table public.prayer_requests from anon, authenticated;
revoke delete on table public.visitor_forms from anon, authenticated;
revoke delete on table public.contact_messages from anon, authenticated;

-- Replace visitor/contact FOR ALL policies with read/update only. Prayer RLS is
-- already recipient-specific from Patch 1 and is preserved below.
drop policy if exists "secretariat manage visitors" on public.visitor_forms;
drop policy if exists "rls visitor readers select" on public.visitor_forms;
drop policy if exists "rls visitor readers update" on public.visitor_forms;

create policy "rls visitor readers select"
on public.visitor_forms for select to authenticated
using (public.has_permission('visitors.read'));

create policy "rls visitor readers update"
on public.visitor_forms for update to authenticated
using (public.has_permission('visitors.read'))
with check (public.has_permission('visitors.read'));

drop policy if exists "secretariat manage messages" on public.contact_messages;
drop policy if exists "rls message readers select" on public.contact_messages;
drop policy if exists "rls message readers update" on public.contact_messages;

create policy "rls message readers select"
on public.contact_messages for select to authenticated
using (public.has_permission('messages.read'));

create policy "rls message readers update"
on public.contact_messages for update to authenticated
using (public.has_permission('messages.read'))
with check (public.has_permission('messages.read'));

-- The recipient DELETE policy is no longer needed because physical deletion of
-- prayer rows is blocked for authenticated users.
drop policy if exists "recipient delete prayer requests" on public.prayer_requests;

-- ---------------------------------------------------------------------------
-- 9. Prayer assignment must stay inside the selected recipient role
-- ---------------------------------------------------------------------------

-- Existing legacy assignments that do not match the selected recipient are
-- cleared rather than silently exposing a prayer to the wrong handler.
update public.prayer_requests prayer
set assigned_to = null
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
      and role.code = case prayer.sharing_scope
        when 'prayer_team' then 'prayer_team'
        when 'pastor' then 'pastor'
        else '__invalid__'
      end
      and not exists (
        select 1
        from public.user_roles super_assignment
        join public.roles super_role
          on super_role.id = super_assignment.role_id
         and super_role.code = 'super_admin'
         and super_role.status = 'active'
        where super_assignment.user_id = prayer.assigned_to
      )
  );

create or replace function public.enforce_prayer_assignment_scope()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  expected_role text;
begin
  if new.assigned_to is null then
    return new;
  end if;

  expected_role := case new.sharing_scope
    when 'prayer_team' then 'prayer_team'
    when 'pastor' then 'pastor'
    else null
  end;

  if expected_role is null then
    raise exception 'Tujuan pelayanan doa tidak valid'
      using errcode = '23514';
  end if;

  if not exists (
    select 1
    from public.user_roles assignment
    join public.roles role
      on role.id = assignment.role_id
     and role.code = expected_role
     and role.status = 'active'
    join public.profiles profile
      on profile.id = assignment.user_id
     and profile.status = 'active'
    where assignment.user_id = new.assigned_to
      and not exists (
        select 1
        from public.user_roles super_assignment
        join public.roles super_role
          on super_role.id = super_assignment.role_id
         and super_role.code = 'super_admin'
         and super_role.status = 'active'
        where super_assignment.user_id = new.assigned_to
      )
  ) then
    raise exception 'Penanggung jawab tidak sesuai dengan penerima permohonan doa'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_prayer_assignment_scope() from public;

drop trigger if exists enforce_prayer_assignment_scope on public.prayer_requests;
create trigger enforce_prayer_assignment_scope
before insert or update of assigned_to, sharing_scope on public.prayer_requests
for each row execute function public.enforce_prayer_assignment_scope();

-- ---------------------------------------------------------------------------
-- 10. Creator attribution cannot be forged by authenticated Data API updates
-- ---------------------------------------------------------------------------

create or replace function public.preserve_created_by_identity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null then
    new.created_by := old.created_by;
  end if;

  return new;
end;
$$;

revoke all on function public.preserve_created_by_identity() from public;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'site_settings', 'navigation_items', 'church_profiles', 'media_files',
    'speakers', 'leaders', 'ministries', 'service_schedules', 'events',
    'sermon_categories', 'sermons', 'post_categories', 'post_tags',
    'livestreams', 'gallery_albums', 'gallery_images', 'announcements',
    'downloads'
  ] loop
    execute format('drop trigger if exists protect_%I_created_by on public.%I', table_name, table_name);
    execute format(
      'create trigger protect_%I_created_by before update on public.%I for each row execute function public.preserve_created_by_identity()',
      table_name, table_name
    );
  end loop;
end;
$$;

-- posts has its own stricter editorial trigger that already preserves created_by.

-- ---------------------------------------------------------------------------
-- 11. RLS must remain enabled on every application table touched by this patch
-- ---------------------------------------------------------------------------

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'roles', 'permissions', 'role_permissions', 'profiles', 'user_roles',
    'site_settings', 'navigation_items', 'church_profiles', 'media_files',
    'speakers', 'leaders', 'ministries', 'service_schedules', 'events',
    'event_registrations', 'sermon_categories', 'sermons', 'post_categories',
    'post_tags', 'posts', 'post_tag_assignments', 'livestreams',
    'gallery_albums', 'gallery_images', 'prayer_requests', 'visitor_forms',
    'contact_messages', 'announcements', 'downloads', 'audit_logs',
    'notifications'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end;
$$;
