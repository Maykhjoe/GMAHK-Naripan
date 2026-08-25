-- GMAHK Naripan — username/password admin authentication
-- Keeps Supabase Auth as the session/JWT/RLS engine while removing the need
-- for user invitation emails and self-service password recovery.

begin;

alter table public.profiles
  add column if not exists username text;

-- Give the first existing Super Admin a predictable migration username.
-- Other existing profiles receive a collision-resistant temporary username
-- and can have their password reset by Super Admin from the admin panel.
with ranked_super_admins as (
  select
    p.id,
    row_number() over (order by p.created_at, p.id) as rn
  from public.profiles p
  join public.user_roles ur on ur.user_id = p.id
  join public.roles r on r.id = ur.role_id
  where r.code = 'super_admin'
    and p.username is null
)
update public.profiles p
set username = case
  when ranked_super_admins.rn = 1
    and not exists (
      select 1
      from public.profiles existing
      where lower(existing.username) = 'superadmin'
    )
    then 'superadmin'
  else 'admin_' || substr(replace(p.id::text, '-', ''), 1, 12)
end
from ranked_super_admins
where p.id = ranked_super_admins.id
  and p.username is null;

update public.profiles
set username = 'user_' || substr(replace(id::text, '-', ''), 1, 12)
where username is null;

update public.profiles
set username = lower(trim(username));

create unique index if not exists profiles_username_lower_unique
  on public.profiles (lower(username));

alter table public.profiles
  alter column username set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_username_format_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_username_format_check
      check (
        username = lower(username)
        and char_length(username) between 3 and 32
        and username ~ '^[a-z0-9][a-z0-9._-]{1,30}[a-z0-9]$'
      );
  end if;
end
$$;

comment on column public.profiles.username is
  'Unique lowercase username used for admin login. Supabase Auth email remains an internal identifier only.';

-- Keep profile synchronization compatible with username-based user creation.
create or replace function public.handle_new_auth_user() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username text;
begin
  v_username := lower(
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'username', '')), '')
  );

  if v_username is null then
    v_username := 'user_' || substr(replace(new.id::text, '-', ''), 1, 12);
  end if;

  insert into public.profiles(id, username, full_name, status)
  values (
    new.id,
    v_username,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), ''),
    'active'
  )
  on conflict (id) do update
    set username = coalesce(excluded.username, public.profiles.username),
        full_name = coalesce(excluded.full_name, public.profiles.full_name),
        updated_at = now();

  return new;
end;
$$;

revoke all on function public.handle_new_auth_user() from public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

commit;
