-- Route all public submissions through server-verified endpoints and reserve event capacity atomically.
drop policy if exists "public submit prayer" on public.prayer_requests;
drop policy if exists "public submit visitor" on public.visitor_forms;
drop policy if exists "public submit contact" on public.contact_messages;
drop policy if exists "public register event" on public.event_registrations;
revoke insert on public.prayer_requests, public.visitor_forms, public.contact_messages, public.event_registrations from anon, authenticated;

-- Administrators may still read and update registration workflow status.
drop policy if exists "event admins registrations" on public.event_registrations;
create policy "event admins read registrations" on public.event_registrations for select to authenticated using (public.has_permission('events.manage'));
create policy "event admins update registrations" on public.event_registrations for update to authenticated using (public.has_permission('events.manage')) with check (public.has_permission('events.manage'));

create or replace function public.register_for_event(
  p_event_slug text,
  p_name text,
  p_whatsapp text,
  p_email text,
  p_people_count integer,
  p_notes text,
  p_consent boolean
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  target_event public.events%rowtype;
  reserved_count integer;
  registration_id uuid;
begin
  select * into target_event from public.events
  where slug = p_event_slug and status = 'published' and deleted_at is null
  for update;
  if not found then return jsonb_build_object('success', false, 'reason', 'not_found'); end if;
  if not target_event.registration_enabled then return jsonb_build_object('success', false, 'reason', 'closed'); end if;
  if now() >= target_event.starts_at then return jsonb_build_object('success', false, 'reason', 'started'); end if;
  if target_event.registration_deadline is not null and now() > target_event.registration_deadline then return jsonb_build_object('success', false, 'reason', 'deadline'); end if;
  if p_people_count is null or p_people_count < 1 or p_people_count > 20 then return jsonb_build_object('success', false, 'reason', 'invalid_count'); end if;
  if p_consent is not true then return jsonb_build_object('success', false, 'reason', 'consent_required'); end if;
  if nullif(trim(coalesce(p_whatsapp, '')), '') is null and nullif(trim(coalesce(p_email, '')), '') is null then return jsonb_build_object('success', false, 'reason', 'contact_required'); end if;

  if exists (
    select 1 from public.event_registrations registration
    where registration.event_id = target_event.id and registration.status <> 'cancelled'
      and ((nullif(trim(coalesce(p_email, '')), '') is not null and lower(registration.email) = lower(trim(p_email)))
        or (nullif(trim(coalesce(p_whatsapp, '')), '') is not null and regexp_replace(coalesce(registration.whatsapp, ''), '\D', '', 'g') = regexp_replace(p_whatsapp, '\D', '', 'g')))
  ) then return jsonb_build_object('success', false, 'reason', 'already_registered'); end if;

  select coalesce(sum(people_count), 0)::integer into reserved_count
  from public.event_registrations where event_id = target_event.id and status <> 'cancelled';
  if target_event.capacity is not null and reserved_count + p_people_count > target_event.capacity then
    return jsonb_build_object('success', false, 'reason', 'capacity', 'remaining', greatest(target_event.capacity - reserved_count, 0));
  end if;

  insert into public.event_registrations(event_id, name, whatsapp, email, people_count, notes, status, consent_at)
  values (target_event.id, trim(p_name), nullif(trim(coalesce(p_whatsapp, '')), ''), nullif(lower(trim(coalesce(p_email, ''))), ''), p_people_count, nullif(trim(coalesce(p_notes, '')), ''), 'registered', now())
  returning id into registration_id;
  return jsonb_build_object('success', true, 'registrationId', registration_id, 'eventTitle', target_event.title);
end;
$$;
revoke all on function public.register_for_event(text,text,text,text,integer,text,boolean) from public, anon, authenticated;
grant execute on function public.register_for_event(text,text,text,text,integer,text,boolean) to service_role;
