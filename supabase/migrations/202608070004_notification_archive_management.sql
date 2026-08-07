-- Archive management for the admin notification center.
-- "deleted" rows keep only a minimal tombstone so reminder dedupe keys cannot
-- recreate a notification that the user permanently removed.

alter table public.notifications
  add column if not exists deleted_at timestamptz;

alter table public.notifications
  drop constraint if exists notifications_status_check;

alter table public.notifications
  add constraint notifications_status_check
  check (status in ('active', 'archived', 'deleted'));

create index if not exists idx_notifications_user_archived_created
  on public.notifications(user_id, created_at desc)
  where status = 'archived';

create index if not exists idx_notifications_user_status_created
  on public.notifications(user_id, status, created_at desc)
  where status in ('active', 'archived');

notify pgrst, 'reload schema';
