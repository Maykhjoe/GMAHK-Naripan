-- Search indexes and public filter helpers for paginated content browsing.
create schema if not exists extensions;
create extension if not exists pg_trgm with schema extensions;

alter table public.posts
  add column if not exists search_text text not null default '';
alter table public.events
  add column if not exists search_text text not null default '';
alter table public.sermons
  add column if not exists search_text text not null default '';
alter table public.ministries
  add column if not exists search_text text not null default '';
alter table public.leaders
  add column if not exists search_text text not null default '';

create or replace function public.refresh_content_search_text()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  case tg_table_name
    when 'posts' then
      new.search_text := lower(concat_ws(
        ' ',
        new.title,
        new.excerpt,
        new.content::text,
        new.seo::text
      ));
    when 'events' then
      new.search_text := lower(concat_ws(
        ' ',
        new.title,
        new.category,
        new.short_description,
        new.description,
        new.location,
        new.rundown::text,
        new.seo::text
      ));
    when 'sermons' then
      new.search_text := lower(concat_ws(
        ' ',
        new.title,
        new.main_verse,
        new.description,
        new.seo::text
      ));
    when 'ministries' then
      new.search_text := lower(concat_ws(
        ' ',
        new.name,
        new.short_description,
        new.description,
        new.contact,
        new.programs::text,
        new.seo::text
      ));
    when 'leaders' then
      new.search_text := lower(concat_ws(
        ' ',
        new.name,
        new.position,
        new.bio,
        new.period,
        new.phone,
        new.email
      ));
    else
      new.search_text := '';
  end case;

  return new;
end;
$$;

revoke all on function public.refresh_content_search_text() from public;

-- Recreate triggers safely so the migration can be rerun in development.
drop trigger if exists refresh_posts_search_text on public.posts;
create trigger refresh_posts_search_text
before insert or update of title, excerpt, content, seo
on public.posts
for each row execute function public.refresh_content_search_text();

drop trigger if exists refresh_events_search_text on public.events;
create trigger refresh_events_search_text
before insert or update of title, category, short_description, description, location, rundown, seo
on public.events
for each row execute function public.refresh_content_search_text();

drop trigger if exists refresh_sermons_search_text on public.sermons;
create trigger refresh_sermons_search_text
before insert or update of title, main_verse, description, seo
on public.sermons
for each row execute function public.refresh_content_search_text();

drop trigger if exists refresh_ministries_search_text on public.ministries;
create trigger refresh_ministries_search_text
before insert or update of name, short_description, description, contact, programs, seo
on public.ministries
for each row execute function public.refresh_content_search_text();

drop trigger if exists refresh_leaders_search_text on public.leaders;
create trigger refresh_leaders_search_text
before insert or update of name, position, bio, period, phone, email
on public.leaders
for each row execute function public.refresh_content_search_text();

-- Backfill existing content.
update public.posts
set search_text = lower(concat_ws(
  ' ', title, excerpt, content::text, seo::text
));

update public.events
set search_text = lower(concat_ws(
  ' ', title, category, short_description, description, location, rundown::text, seo::text
));

update public.sermons
set search_text = lower(concat_ws(
  ' ', title, main_verse, description, seo::text
));

update public.ministries
set search_text = lower(concat_ws(
  ' ', name, short_description, description, contact, programs::text, seo::text
));

update public.leaders
set search_text = lower(concat_ws(
  ' ', name, position, bio, period, phone, email
));

create index if not exists idx_posts_search_text
  on public.posts using gin (search_text extensions.gin_trgm_ops)
  where deleted_at is null;
create index if not exists idx_events_search_text
  on public.events using gin (search_text extensions.gin_trgm_ops)
  where deleted_at is null;
create index if not exists idx_sermons_search_text
  on public.sermons using gin (search_text extensions.gin_trgm_ops)
  where deleted_at is null;
create index if not exists idx_ministries_search_text
  on public.ministries using gin (search_text extensions.gin_trgm_ops)
  where deleted_at is null;
create index if not exists idx_leaders_search_text
  on public.leaders using gin (search_text extensions.gin_trgm_ops)
  where deleted_at is null;

create or replace function public.public_sermon_speaker_options()
returns table(value text)
language sql
stable
set search_path = public
as $$
  select distinct trim(coalesce(nullif(s.seo ->> 'speaker', ''), sp.name)) as value
  from public.sermons s
  left join public.speakers sp on sp.id = s.speaker_id
  where s.status = 'published'
    and s.deleted_at is null
    and (s.published_at is null or s.published_at <= now())
    and coalesce(nullif(s.seo ->> 'speaker', ''), sp.name) is not null
  order by value;
$$;

grant execute on function public.public_sermon_speaker_options() to anon, authenticated;
