-- Patch: Modul Galeri Lengkap
-- Struktur gallery_albums dan gallery_images sudah tersedia sejak initial schema.
-- Migration ini hanya menambahkan index yang membantu daftar album dan urutan foto.
-- Upload media galeri tetap dilakukan melalui server-side API/service role,
-- sehingga fungsi RLS media existing tidak perlu diubah.

create index if not exists gallery_images_album_status_order_idx
  on public.gallery_images(album_id, status, display_order, created_at);

create index if not exists gallery_albums_public_listing_idx
  on public.gallery_albums(status, display_order, event_date desc)
  where deleted_at is null;
