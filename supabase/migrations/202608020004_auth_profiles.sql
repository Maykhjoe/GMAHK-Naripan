-- Keep auth users and public profiles synchronized, and prevent administrator lockout.
create or replace function public.handle_new_auth_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, full_name, status)
  values (new.id, nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), ''), 'active')
  on conflict (id) do update set full_name = coalesce(excluded.full_name, public.profiles.full_name), updated_at = now();
  return new;
end;
$$;
revoke all on function public.handle_new_auth_user() from public;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_auth_user();

create or replace function public.prevent_last_super_role_removal() returns trigger
language plpgsql security definer set search_path = public as $$
declare old_is_super boolean;
begin
  select code = 'super_admin' into old_is_super from public.roles where id = old.role_id;
  if old_is_super and (tg_op = 'DELETE' or new.role_id is distinct from old.role_id) and not exists (
    select 1 from public.user_roles ur
    join public.roles r on r.id = ur.role_id and r.code = 'super_admin' and r.status = 'active'
    join public.profiles p on p.id = ur.user_id and p.status = 'active'
    where ur.user_id <> old.user_id
  ) then raise exception 'Tidak dapat menghapus Super Admin aktif terakhir'; end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;
revoke all on function public.prevent_last_super_role_removal() from public;
create trigger protect_last_super_role before update or delete on public.user_roles for each row execute function public.prevent_last_super_role_removal();

create or replace function public.prevent_last_super_profile_deactivation() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.status = 'active' and new.status = 'inactive' and exists (
    select 1 from public.user_roles ur join public.roles r on r.id = ur.role_id where ur.user_id = old.id and r.code = 'super_admin'
  ) and not exists (
    select 1 from public.user_roles ur join public.roles r on r.id = ur.role_id and r.code = 'super_admin' and r.status = 'active'
    join public.profiles p on p.id = ur.user_id and p.status = 'active' where ur.user_id <> old.id
  ) then raise exception 'Tidak dapat menonaktifkan Super Admin aktif terakhir'; end if;
  return new;
end;
$$;
revoke all on function public.prevent_last_super_profile_deactivation() from public;
create trigger protect_last_super_profile before update of status on public.profiles for each row execute function public.prevent_last_super_profile_deactivation();

create or replace function public.set_user_role(target_user_id uuid, target_role_code text) returns void
language plpgsql security definer set search_path = public as $$
declare target_role_id uuid;
begin
  select id into target_role_id from public.roles where code = target_role_code and status = 'active';
  if target_role_id is null then raise exception 'Role tidak valid'; end if;
  delete from public.user_roles where user_id = target_user_id and role_id <> target_role_id;
  insert into public.user_roles(user_id, role_id) values (target_user_id, target_role_id) on conflict do nothing;
end;
$$;
revoke all on function public.set_user_role(uuid,text) from public, anon, authenticated;
grant execute on function public.set_user_role(uuid,text) to service_role;
