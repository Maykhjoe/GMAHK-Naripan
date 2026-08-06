-- GMAHK Naripan — Supabase PostgreSQL schema
-- Apply with: supabase db push
-- Assumptions: single church/site, Asia/Jakarta timezone, UUID IDs, soft delete for mutable content.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code in ('super_admin','web_administrator','secretariat','media_team','editor','pastoral','department_admin')),
  name text not null,
  description text,
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.permissions (
  id uuid primary key default gen_random_uuid(), code text not null unique, name text not null, module text not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.role_permissions (
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  created_at timestamptz not null default now(), primary key (role_id, permission_id)
);
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text, avatar_url text, phone text, status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.user_roles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  ministry_id uuid,
  created_at timestamptz not null default now(), primary key(user_id, role_id)
);

create table public.site_settings (
  id uuid primary key default gen_random_uuid(), key text not null unique, value jsonb not null default '{}'::jsonb,
  description text, is_public boolean not null default false, status text not null default 'active',
  created_by uuid references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.navigation_items (
  id uuid primary key default gen_random_uuid(), parent_id uuid references public.navigation_items(id) on delete cascade,
  label text not null, href text not null, position integer not null default 0, is_external boolean not null default false,
  status text not null default 'active', created_by uuid references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.church_profiles (
  id uuid primary key default gen_random_uuid(), name text not null, short_name text, description text, history text, vision text, mission text,
  address text, whatsapp text, phone text, email text, instagram_url text, youtube_url text, maps_embed_url text, timezone text not null default 'Asia/Jakarta',
  status text not null default 'active', created_by uuid references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.media_files (
  id uuid primary key default gen_random_uuid(), bucket text not null, storage_path text not null unique, file_name text not null, mime_type text not null,
  size_bytes bigint not null check (size_bytes >= 0 and size_bytes <= 10485760), width integer, height integer, alt_text text, metadata jsonb not null default '{}'::jsonb,
  status text not null default 'active', created_by uuid references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table public.speakers (
  id uuid primary key default gen_random_uuid(), name text not null, bio text, photo_id uuid references public.media_files(id) on delete set null,
  status text not null default 'active', created_by uuid references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table public.leaders (
  id uuid primary key default gen_random_uuid(), name text not null, position text not null, bio text, photo_id uuid references public.media_files(id) on delete set null,
  display_order integer not null default 0, is_public boolean not null default true, status text not null default 'draft',
  created_by uuid references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table public.ministries (
  id uuid primary key default gen_random_uuid(), slug text not null unique, name text not null, short_description text, description text,
  coordinator_id uuid references public.leaders(id) on delete set null, contact text, thumbnail_id uuid references public.media_files(id) on delete set null,
  programs jsonb not null default '[]'::jsonb, seo jsonb not null default '{}'::jsonb, display_order integer not null default 0,
  status text not null default 'draft' check (status in ('draft','scheduled','published','inactive')),
  published_at timestamptz, created_by uuid references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
alter table public.user_roles add constraint user_roles_ministry_id_fkey foreign key (ministry_id) references public.ministries(id) on delete cascade;

create table public.service_schedules (
  id uuid primary key default gen_random_uuid(), slug text not null unique, title text not null, category text not null, description text,
  starts_at timestamptz not null, ends_at timestamptz, recurrence_rule text, location text, speaker_id uuid references public.speakers(id) on delete set null,
  zoom_url text, youtube_url text, is_featured boolean not null default false, status text not null default 'draft', published_at timestamptz,
  created_by uuid references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  check (ends_at is null or ends_at > starts_at)
);
create table public.events (
  id uuid primary key default gen_random_uuid(), ministry_id uuid references public.ministries(id) on delete set null, slug text not null unique,
  title text not null, category text not null, short_description text, description text, starts_at timestamptz not null, ends_at timestamptz,
  location text, speaker_id uuid references public.speakers(id) on delete set null, poster_id uuid references public.media_files(id) on delete set null,
  rundown jsonb not null default '[]'::jsonb, zoom_url text, youtube_url text, registration_enabled boolean not null default false,
  capacity integer check (capacity is null or capacity > 0), registration_deadline timestamptz, seo jsonb not null default '{}'::jsonb,
  status text not null default 'draft', published_at timestamptz, created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  check (ends_at is null or ends_at > starts_at)
);
create table public.event_registrations (
  id uuid primary key default gen_random_uuid(), event_id uuid not null references public.events(id) on delete cascade,
  name text not null, whatsapp text, email text, people_count integer not null default 1 check (people_count between 1 and 20), notes text,
  status text not null default 'registered' check (status in ('registered','confirmed','cancelled','attended')),
  consent_at timestamptz not null default now(), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.sermon_categories (
  id uuid primary key default gen_random_uuid(), slug text not null unique, name text not null, status text not null default 'active',
  created_by uuid references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.sermons (
  id uuid primary key default gen_random_uuid(), category_id uuid references public.sermon_categories(id) on delete set null, speaker_id uuid references public.speakers(id) on delete set null,
  slug text not null unique, title text not null, sermon_date date not null, main_verse text, description text, youtube_id text,
  audio_id uuid references public.media_files(id) on delete set null, material_pdf_id uuid references public.media_files(id) on delete set null,
  thumbnail_id uuid references public.media_files(id) on delete set null, seo jsonb not null default '{}'::jsonb,
  status text not null default 'draft', published_at timestamptz, created_by uuid references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table public.post_categories (
  id uuid primary key default gen_random_uuid(), slug text not null unique, name text not null, status text not null default 'active',
  created_by uuid references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.post_tags (
  id uuid primary key default gen_random_uuid(), slug text not null unique, name text not null,
  created_by uuid references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.posts (
  id uuid primary key default gen_random_uuid(), category_id uuid references public.post_categories(id) on delete set null, slug text not null unique,
  title text not null, excerpt text, content jsonb not null default '{}'::jsonb, author_id uuid references public.profiles(id) on delete set null,
  featured_image_id uuid references public.media_files(id) on delete set null, reading_minutes integer check (reading_minutes is null or reading_minutes > 0),
  seo jsonb not null default '{}'::jsonb, view_count bigint not null default 0 check (view_count >= 0),
  status text not null default 'draft', published_at timestamptz, created_by uuid references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table public.post_tag_assignments (
  post_id uuid not null references public.posts(id) on delete cascade, tag_id uuid not null references public.post_tags(id) on delete cascade,
  created_at timestamptz not null default now(), primary key(post_id, tag_id)
);
create table public.livestreams (
  id uuid primary key default gen_random_uuid(), title text not null, theme text, speaker_id uuid references public.speakers(id) on delete set null,
  starts_at timestamptz not null, ends_at timestamptz, youtube_id text, zoom_url text, live_status text not null default 'scheduled' check (live_status in ('scheduled','live','ended','cancelled')),
  status text not null default 'draft', published_at timestamptz, created_by uuid references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table public.gallery_albums (
  id uuid primary key default gen_random_uuid(), slug text not null unique, title text not null, description text, event_date date, category text,
  cover_id uuid references public.media_files(id) on delete set null, display_order integer not null default 0, status text not null default 'draft', published_at timestamptz,
  created_by uuid references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table public.gallery_images (
  id uuid primary key default gen_random_uuid(), album_id uuid not null references public.gallery_albums(id) on delete cascade,
  media_id uuid not null references public.media_files(id) on delete cascade, title text, description text, display_order integer not null default 0,
  status text not null default 'active', created_by uuid references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(album_id, media_id)
);
create table public.prayer_requests (
  id uuid primary key default gen_random_uuid(), name text, is_anonymous boolean not null default false, whatsapp text, email text,
  category text not null check (category in ('Kesehatan','Keluarga','Pekerjaan','Pendidikan','Kerohanian','Ucapan syukur','Lainnya')),
  request_text text not null check (char_length(request_text) between 20 and 2000), may_contact boolean not null default false,
  privacy_consent boolean not null check (privacy_consent), assigned_to uuid references public.profiles(id) on delete set null,
  status text not null default 'unread' check (status in ('unread','in_prayer','follow_up','archived')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table public.visitor_forms (
  id uuid primary key default gen_random_uuid(), name text not null, whatsapp text not null, visit_date date not null,
  people_count integer not null default 1 check (people_count between 1 and 20), bringing_children boolean not null default false, notes text,
  assigned_to uuid references public.profiles(id) on delete set null, status text not null default 'new' check (status in ('new','contacted','visited','archived')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table public.contact_messages (
  id uuid primary key default gen_random_uuid(), name text not null, email text not null, phone text, subject text not null,
  message text not null check (char_length(message) between 15 and 2000), assigned_to uuid references public.profiles(id) on delete set null,
  status text not null default 'unread' check (status in ('unread','in_progress','replied','archived')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table public.announcements (
  id uuid primary key default gen_random_uuid(), title text not null, content text not null, starts_at timestamptz, ends_at timestamptz,
  link_url text, display_order integer not null default 0, status text not null default 'draft', published_at timestamptz,
  created_by uuid references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table public.downloads (
  id uuid primary key default gen_random_uuid(), slug text not null unique, title text not null, description text,
  media_id uuid not null references public.media_files(id) on delete restrict, download_count bigint not null default 0 check (download_count >= 0),
  status text not null default 'draft', published_at timestamptz, created_by uuid references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(), actor_id uuid references public.profiles(id) on delete set null, action text not null,
  entity_type text not null, entity_id uuid, old_data jsonb, new_data jsonb, ip_address inet, user_agent text,
  created_at timestamptz not null default now()
);
create table public.notifications (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null, body text, link_url text, read_at timestamptz, status text not null default 'active', created_at timestamptz not null default now()
);

-- Workload-shaped indexes
create index idx_navigation_parent_position on public.navigation_items(parent_id, position) where status='active';
create index idx_ministries_status_order on public.ministries(status, display_order) where deleted_at is null;
create index idx_schedules_start_status on public.service_schedules(starts_at, status) where deleted_at is null;
create index idx_events_start_status on public.events(starts_at, status) where deleted_at is null;
create index idx_event_registrations_event_status on public.event_registrations(event_id, status);
create index idx_sermons_date_status on public.sermons(sermon_date desc, status) where deleted_at is null;
create index idx_posts_published_status on public.posts(published_at desc, status) where deleted_at is null;
create index idx_livestreams_start_status on public.livestreams(starts_at, live_status) where deleted_at is null;
create index idx_gallery_images_album_order on public.gallery_images(album_id, display_order);
create index idx_prayer_unread on public.prayer_requests(created_at desc) where status='unread' and deleted_at is null;
create index idx_visitors_new on public.visitor_forms(visit_date, created_at) where status='new' and deleted_at is null;
create index idx_contact_unread on public.contact_messages(created_at desc) where status='unread' and deleted_at is null;
create index idx_audit_actor_date on public.audit_logs(actor_id, created_at desc);
create index idx_notifications_user_unread on public.notifications(user_id, created_at desc) where read_at is null;

-- updated_at triggers
DO $$ declare t text; begin foreach t in array array['roles','permissions','profiles','site_settings','navigation_items','church_profiles','media_files','speakers','leaders','ministries','service_schedules','events','event_registrations','sermon_categories','sermons','post_categories','post_tags','posts','livestreams','gallery_albums','gallery_images','prayer_requests','visitor_forms','contact_messages','announcements','downloads'] loop execute format('create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()', t, t); end loop; end $$;

-- RBAC helper used by RLS. SECURITY DEFINER only reads role mapping.
create or replace function public.has_permission(permission_code text) returns boolean language sql stable security definer set search_path=public as $$
  select exists (
    select 1 from public.user_roles ur join public.roles r on r.id=ur.role_id
    left join public.role_permissions rp on rp.role_id=r.id left join public.permissions p on p.id=rp.permission_id
    where ur.user_id=auth.uid() and r.status='active' and (r.code='super_admin' or p.code=permission_code)
  );
$$;
revoke all on function public.has_permission(text) from public;
grant execute on function public.has_permission(text) to authenticated;

-- Enable RLS everywhere containing application data.
DO $$ declare t text; begin foreach t in array array['roles','permissions','role_permissions','profiles','user_roles','site_settings','navigation_items','church_profiles','media_files','speakers','leaders','ministries','service_schedules','events','event_registrations','sermon_categories','sermons','post_categories','post_tags','posts','post_tag_assignments','livestreams','gallery_albums','gallery_images','prayer_requests','visitor_forms','contact_messages','announcements','downloads','audit_logs','notifications'] loop execute format('alter table public.%I enable row level security', t); end loop; end $$;

-- Public published content
create policy "public read active navigation" on public.navigation_items for select using (status='active');
create policy "public read church profile" on public.church_profiles for select using (status='active');
create policy "public read speakers" on public.speakers for select using (status='active' and deleted_at is null);
create policy "public read leaders" on public.leaders for select using (is_public and status='published' and deleted_at is null);
create policy "public read ministries" on public.ministries for select using (status='published' and deleted_at is null);
create policy "public read schedules" on public.service_schedules for select using (status='published' and deleted_at is null);
create policy "public read events" on public.events for select using (status='published' and deleted_at is null);
create policy "public read sermon categories" on public.sermon_categories for select using (status='active');
create policy "public read sermons" on public.sermons for select using (status='published' and deleted_at is null);
create policy "public read post categories" on public.post_categories for select using (status='active');
create policy "public read post tags" on public.post_tags for select using (true);
create policy "public read published posts" on public.posts for select using (status='published' and deleted_at is null);
create policy "public read post tags assignments" on public.post_tag_assignments for select using (exists(select 1 from public.posts p where p.id=post_id and p.status='published' and p.deleted_at is null));
create policy "public read live" on public.livestreams for select using (status='published' and deleted_at is null);
create policy "public read gallery albums" on public.gallery_albums for select using (status='published' and deleted_at is null);
create policy "public read gallery images" on public.gallery_images for select using (status='active' and exists(select 1 from public.gallery_albums a where a.id=album_id and a.status='published' and a.deleted_at is null));
create policy "public read announcements" on public.announcements for select using (status='published' and deleted_at is null and (starts_at is null or starts_at<=now()) and (ends_at is null or ends_at>=now()));
create policy "public read downloads" on public.downloads for select using (status='published' and deleted_at is null);

-- Anonymous insert-only forms; no public select.
create policy "public submit prayer" on public.prayer_requests for insert to anon, authenticated with check (privacy_consent=true);
create policy "public submit visitor" on public.visitor_forms for insert to anon, authenticated with check (true);
create policy "public submit contact" on public.contact_messages for insert to anon, authenticated with check (true);
create policy "public register event" on public.event_registrations for insert to anon, authenticated with check (exists(select 1 from public.events e where e.id=event_id and e.registration_enabled and e.status='published'));

-- Private access according to permission.
create policy "pastoral manage prayer" on public.prayer_requests for all to authenticated using (public.has_permission('prayers.read')) with check (public.has_permission('prayers.read'));
create policy "secretariat manage visitors" on public.visitor_forms for all to authenticated using (public.has_permission('visitors.read')) with check (public.has_permission('visitors.read'));
create policy "secretariat manage messages" on public.contact_messages for all to authenticated using (public.has_permission('messages.read')) with check (public.has_permission('messages.read'));
create policy "event admins registrations" on public.event_registrations for select to authenticated using (public.has_permission('events.manage'));
create policy "user sees own profile" on public.profiles for select to authenticated using (id=auth.uid() or public.has_permission('users.manage'));
create policy "user sees own roles" on public.user_roles for select to authenticated using (user_id=auth.uid() or public.has_permission('users.manage'));
create policy "user sees notifications" on public.notifications for all to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy "admins read audit" on public.audit_logs for select to authenticated using (public.has_permission('settings.manage'));

-- Broad authenticated policies for content tables, always backed by server authorization checks.
DO $$ declare t text; begin foreach t in array array['site_settings','navigation_items','church_profiles','media_files','speakers','leaders','ministries','service_schedules','events','sermon_categories','sermons','post_categories','post_tags','posts','post_tag_assignments','livestreams','gallery_albums','gallery_images','announcements','downloads'] loop execute format('create policy "authenticated manage %s" on public.%I for all to authenticated using (public.has_permission(''dashboard.read'')) with check (public.has_permission(''dashboard.read''))', t, t); end loop; end $$;

-- Create private/public storage buckets. Service role key remains server-only.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types) values
('public-media','public-media',true,10485760,array['image/jpeg','image/png','image/webp','application/pdf']),
('private-documents','private-documents',false,10485760,array['application/pdf','image/jpeg','image/png'])
on conflict (id) do nothing;
create policy "public view public media" on storage.objects for select using (bucket_id='public-media');
create policy "authenticated upload public media" on storage.objects for insert to authenticated with check (bucket_id='public-media' and public.has_permission('files.manage'));
create policy "authorized manage public media" on storage.objects for update to authenticated using (bucket_id='public-media' and public.has_permission('files.manage'));
create policy "authorized delete public media" on storage.objects for delete to authenticated using (bucket_id='public-media' and public.has_permission('files.manage'));
create policy "authorized private documents" on storage.objects for all to authenticated using (bucket_id='private-documents' and public.has_permission('files.manage')) with check (bucket_id='private-documents' and public.has_permission('files.manage'));
