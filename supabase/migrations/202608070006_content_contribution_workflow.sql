-- Content contribution and editorial workflow for news/articles.
-- All final admin roles keep posts.manage (contribution). Publication and
-- editorial control are separated into explicit permissions.

-- ---------------------------------------------------------------------------
-- 1. Editorial permissions
-- ---------------------------------------------------------------------------

insert into public.permissions(code, name, module)
values
  ('posts.review', 'Tinjau Artikel', 'posts'),
  ('posts.publish', 'Publikasikan Artikel', 'posts'),
  ('posts.edit_all', 'Edit Semua Artikel', 'posts'),
  ('posts.delete_permanent', 'Hapus Permanen Artikel', 'posts')
on conflict (code) do update set
  name = excluded.name,
  module = excluded.module;

with editorial_matrix(role_code, permission_code) as (
  values
    ('super_admin', 'posts.review'),
    ('super_admin', 'posts.publish'),
    ('super_admin', 'posts.edit_all'),
    ('super_admin', 'posts.delete_permanent'),

    ('pastor', 'posts.review'),
    ('pastor', 'posts.publish'),
    ('pastor', 'posts.edit_all'),

    ('church_chair', 'posts.review'),
    ('church_chair', 'posts.publish'),
    ('church_chair', 'posts.edit_all'),

    ('editor', 'posts.review'),
    ('editor', 'posts.publish'),
    ('editor', 'posts.edit_all')
)
insert into public.role_permissions(role_id, permission_id)
select role.id, permission.id
from editorial_matrix matrix
join public.roles role on role.code = matrix.role_code
join public.permissions permission on permission.code = matrix.permission_code
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 2. Workflow metadata
-- ---------------------------------------------------------------------------

alter table public.posts
  add column if not exists updated_by uuid references public.profiles(id) on delete set null,
  add column if not exists reviewed_by uuid references public.profiles(id) on delete set null,
  add column if not exists published_by uuid references public.profiles(id) on delete set null,
  add column if not exists review_submitted_at timestamptz,
  add column if not exists reviewed_at timestamptz,
  add column if not exists review_notes text;

-- Legacy statuses from the previous generic content form are normalized to
-- the final editorial workflow. Scheduled articles are safely returned to
-- Draft rather than being published unexpectedly.
update public.posts
set status = 'draft'
where status = 'scheduled';

update public.posts
set status = 'archived'
where status = 'inactive';

update public.posts
set updated_by = created_by
where updated_by is null
  and created_by is not null;

alter table public.posts
  drop constraint if exists posts_review_notes_length_check;

alter table public.posts
  add constraint posts_review_notes_length_check
  check (review_notes is null or char_length(review_notes) <= 2000);

create index if not exists posts_status_review_submitted_idx
  on public.posts(status, review_submitted_at desc)
  where deleted_at is null;

create index if not exists posts_created_by_status_idx
  on public.posts(created_by, status)
  where deleted_at is null;

-- ---------------------------------------------------------------------------
-- 3. Database-enforced workflow transitions
-- ---------------------------------------------------------------------------

create or replace function public.enforce_post_editorial_workflow()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  can_review boolean;
  can_publish boolean;
  can_edit_all boolean;
begin
  -- SQL migrations, maintenance jobs, and trusted database operations do not
  -- have an authenticated JWT actor. Leave those operations untouched.
  if actor is null then
    return new;
  end if;

  if not public.has_permission('posts.manage') then
    raise exception 'article contribution permission required'
      using errcode = '42501';
  end if;

  can_review := public.has_permission('posts.review');
  can_publish := public.has_permission('posts.publish');
  can_edit_all := public.has_permission('posts.edit_all');

  if new.status not in ('draft', 'pending_review', 'published', 'archived') then
    raise exception 'invalid article workflow status'
      using errcode = '23514';
  end if;

  if tg_op = 'INSERT' then
    if new.created_by is null then
      new.created_by := actor;
    end if;

    if new.created_by <> actor and not can_edit_all then
      raise exception 'cannot create article for another user'
        using errcode = '42501';
    end if;

    if new.status = 'published' and not can_publish then
      raise exception 'article publish permission required'
        using errcode = '42501';
    end if;

    new.updated_by := actor;

    if not can_review then
      new.reviewed_by := null;
      new.reviewed_at := null;
      new.review_notes := null;
    end if;

    if not can_publish then
      new.published_by := null;
      new.published_at := null;
    end if;

    if new.status = 'pending_review' then
      new.review_submitted_at := coalesce(new.review_submitted_at, now());
      new.reviewed_by := null;
      new.reviewed_at := null;
    elsif new.status = 'published' then
      new.published_by := actor;
      new.published_at := coalesce(new.published_at, now());

      if can_review then
        new.reviewed_by := actor;
        new.reviewed_at := coalesce(new.reviewed_at, now());
      end if;
    end if;

    return new;
  end if;

  -- UPDATE
  new.created_by := old.created_by;

  if old.created_by <> actor and not can_edit_all then
    raise exception 'cannot edit another contributor article'
      using errcode = '42501';
  end if;

  if old.status = 'published' and not can_edit_all then
    raise exception 'published article requires editorial permission'
      using errcode = '42501';
  end if;

  if new.status = 'published' and not can_publish then
    raise exception 'article publish permission required'
      using errcode = '42501';
  end if;

  -- System-maintained attribution cannot be forged through the Data API.
  new.updated_by := actor;
  new.reviewed_by := old.reviewed_by;
  new.reviewed_at := old.reviewed_at;
  new.published_by := old.published_by;
  new.published_at := old.published_at;
  new.review_submitted_at := old.review_submitted_at;

  if not can_review then
    new.review_notes := old.review_notes;
  end if;

  if new.status = 'pending_review' then
    new.review_submitted_at := now();
    new.reviewed_by := null;
    new.reviewed_at := null;

    -- A fresh submission starts a clean review cycle.
    if old.status <> 'pending_review' then
      new.review_notes := null;
    end if;
  elsif old.status = 'pending_review' and new.status = 'draft' then
    if can_review then
      new.reviewed_by := actor;
      new.reviewed_at := now();
    end if;
  elsif new.status = 'published' and old.status <> 'published' then
    new.published_by := actor;
    new.published_at := now();

    if can_review then
      new.reviewed_by := actor;
      new.reviewed_at := now();
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_post_editorial_workflow() from public;

-- Recreate so rerunning a failed local migration remains safe.
drop trigger if exists enforce_post_editorial_workflow on public.posts;
create trigger enforce_post_editorial_workflow
before insert or update on public.posts
for each row execute function public.enforce_post_editorial_workflow();

-- ---------------------------------------------------------------------------
-- 4. Replace the broad posts.manage policy with ownership/editorial RLS
-- ---------------------------------------------------------------------------

drop policy if exists "module manage posts" on public.posts;
drop policy if exists "article contributors read own" on public.posts;
drop policy if exists "article reviewers read all" on public.posts;
drop policy if exists "article contributors insert own" on public.posts;
drop policy if exists "article contributors update own" on public.posts;
drop policy if exists "article editors update all" on public.posts;
drop policy if exists "article permanent delete" on public.posts;

create policy "article contributors read own"
on public.posts for select to authenticated
using (
  public.has_permission('posts.manage')
  and created_by = auth.uid()
);

create policy "article reviewers read all"
on public.posts for select to authenticated
using (
  public.has_permission('posts.review')
  or public.has_permission('posts.edit_all')
);

create policy "article contributors insert own"
on public.posts for insert to authenticated
with check (
  public.has_permission('posts.manage')
  and created_by = auth.uid()
  and (
    status in ('draft', 'pending_review')
    or (status = 'published' and public.has_permission('posts.publish'))
    or (status = 'archived' and public.has_permission('posts.edit_all'))
  )
);

create policy "article contributors update own"
on public.posts for update to authenticated
using (
  public.has_permission('posts.manage')
  and created_by = auth.uid()
)
with check (
  public.has_permission('posts.manage')
  and created_by = auth.uid()
);

create policy "article editors update all"
on public.posts for update to authenticated
using (public.has_permission('posts.edit_all'))
with check (public.has_permission('posts.edit_all'));

-- Regular application deletion remains a soft archive. A true DELETE is
-- reserved for Super Admin through this explicit permission.
create policy "article permanent delete"
on public.posts for delete to authenticated
using (public.has_permission('posts.delete_permanent'));

-- Public published-content policy from the base schema stays intact:
-- status='published' and deleted_at is null.
