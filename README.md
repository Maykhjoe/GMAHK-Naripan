# Website Resmi GMAHK Jemaat Naripan

Website full-stack Next.js untuk pusat informasi gereja, jadwal ibadah, kegiatan, khotbah, live streaming, berita, galeri, formulir privat, dan dashboard admin.

## Stack

- Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4
- Komponen bergaya shadcn/ui dengan Radix UI
- Lucide React, Framer Motion
- React Hook Form + Zod
- Supabase PostgreSQL, Authentication, Storage, dan RLS
- Route Handlers untuk API
- Vitest + Testing Library
- Siap deployment ke Vercel

## Menjalankan secara lokal

```bash
npm install
cp .env.example .env.local
npm run dev
```

Buka `http://localhost:3000`. Tanpa environment Supabase, website berjalan dalam **mode demo lokal**: UI dan validasi berfungsi, API formulir mengembalikan sukses tanpa menyimpan data, dan dashboard admin dapat dipreview. Mode demo hanya diizinkan pada development; pada production, route admin akan menolak akses bila konfigurasi autentikasi belum tersedia.

## Supabase

1. Buat project Supabase baru.
2. Instal Supabase CLI dan hubungkan project lokal ke project Supabase.
3. Terapkan **seluruh migration secara berurutan** dengan `supabase db push`. Jangan hanya menjalankan migration pertama karena migration berikutnya memuat penguatan RBAC, audit, notifikasi, autentikasi, dan keamanan formulir publik.
4. Untuk database lokal yang aman untuk di-reset, gunakan `supabase db reset` agar seluruh migration dan `supabase/seed.sql` diterapkan otomatis.
5. Isi `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
6. Simpan `SUPABASE_SERVICE_ROLE_KEY` hanya di server/Vercel; key ini tidak digunakan pada Client Component.
7. Buat pengguna melalui Supabase Auth, lalu tetapkan role pada `user_roles`.

### Menetapkan Super Admin pertama

Setelah pengguna Auth dibuat, jalankan dari SQL Editor dengan UUID yang benar:

```sql
insert into public.user_roles(user_id, role_id)
select 'AUTH-USER-UUID'::uuid, id from public.roles where code = 'super_admin';
```

## Privasi dan keamanan

- `prayer_requests`, `visitor_forms`, `contact_messages`, dan `event_registrations` tidak mempunyai policy public SELECT.
- Akses data privat dikendalikan RLS + RBAC.
- Form publik divalidasi di client dan server serta memakai rate limiting dasar.
- Upload dibatasi MIME type dan maksimum 10MB pada bucket.
- Soft delete digunakan untuk konten mutable; aktivitas penting disiapkan pada `audit_logs`.
- Untuk rate limiting terdistribusi di produksi, ganti in-memory limiter dengan Vercel KV/Upstash.
- Aktifkan Cloudflare Turnstile dengan dua environment variable yang tersedia sebelum produksi.

## Route utama

- Public: `/`, `/tentang`, `/jadwal-ibadah`, `/kegiatan`, `/khotbah`, `/live`, `/pelayanan`, `/berita`, `/galeri`, `/pengunjung-baru`, `/permohonan-doa`, `/kontak`
- Admin: `/admin`
- Auth: `/auth/login`
- API: `/api/prayer-requests`, `/api/visitor-forms`, `/api/contact`

## Quality gates

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

## Deployment Vercel

1. Push repository ke GitHub.
2. Import project di Vercel.
3. Tambahkan environment variables untuk Production, Preview, dan Development.
4. Set `NEXT_PUBLIC_SITE_URL` ke domain produksi.
5. Deploy, lalu perbarui URL redirect Auth pada dashboard Supabase.
6. Jalankan Lighthouse pada mobile dan desktop setelah gambar, embed Maps, dan data asli ditambahkan.

## Placeholder yang wajib diperbarui

- Logo resmi
- Foto pendeta
- Alamat, Google Maps, WhatsApp, email, Instagram, dan YouTube
- Nama pendeta, koordinator, dan pengurus yang telah disetujui
- YouTube ID live/khotbah
- Informasi parkir dan jam sekretariat

Tidak ada identitas pengurus atau data sensitif fiktif yang dibuat.
