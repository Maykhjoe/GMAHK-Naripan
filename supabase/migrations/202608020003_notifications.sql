-- Notify the correct admin teams when private/public forms receive new data.
create or replace function public.notify_permission_members(permission_code text, notification_title text, notification_body text, notification_link text)
returns void language sql security definer set search_path = public as $$
  insert into public.notifications(user_id, title, body, link_url)
  select distinct ur.user_id, notification_title, notification_body, notification_link
  from public.user_roles ur
  join public.roles r on r.id = ur.role_id and r.status = 'active'
  left join public.role_permissions rp on rp.role_id = r.id
  left join public.permissions p on p.id = rp.permission_id
  join public.profiles profile on profile.id = ur.user_id and profile.status = 'active'
  where r.code = 'super_admin' or p.code = permission_code;
$$;
revoke all on function public.notify_permission_members(text,text,text,text) from public;

create or replace function public.notify_private_submission() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name = 'prayer_requests' then
    perform public.notify_permission_members('prayers.read', 'Permohonan doa baru', 'Sebuah permohonan doa baru menunggu perhatian pastoral.', '/admin/permohonan-doa');
  elsif tg_table_name = 'visitor_forms' then
    perform public.notify_permission_members('visitors.read', 'Rencana kunjungan baru', 'Seorang pengunjung baru merencanakan kunjungan.', '/admin/pengunjung');
  elsif tg_table_name = 'contact_messages' then
    perform public.notify_permission_members('messages.read', 'Pesan website baru', 'Pesan baru diterima melalui halaman kontak.', '/admin/pesan');
  elsif tg_table_name = 'event_registrations' then
    perform public.notify_permission_members('events.manage', 'Pendaftaran kegiatan baru', 'Pendaftaran peserta baru telah diterima.', '/admin/kegiatan');
  end if;
  return new;
end;
$$;
revoke all on function public.notify_private_submission() from public;

create trigger notify_new_prayer after insert on public.prayer_requests for each row execute function public.notify_private_submission();
create trigger notify_new_visitor after insert on public.visitor_forms for each row execute function public.notify_private_submission();
create trigger notify_new_contact after insert on public.contact_messages for each row execute function public.notify_private_submission();
create trigger notify_new_registration after insert on public.event_registrations for each row execute function public.notify_private_submission();
