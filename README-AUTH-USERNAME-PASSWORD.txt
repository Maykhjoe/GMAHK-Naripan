GMAHK NARIPAN - FULL AUTH USERNAME/PASSWORD PRODUCTION REWRITE
============================================================

Tujuan:
- Login admin memakai username + password.
- Super Admin membuat akun langsung tanpa invite email.
- Tidak ada OTP invite / forgot-password email / recovery link.
- Reset password dilakukan oleh Super Admin dari Admin -> Pengguna.
- Supabase Auth tetap dipakai sebagai mesin password hash, session, JWT, dan RLS.

INSTALL:
1. Extract ZIP ke root project dan pilih Replace files.
2. Dari root project jalankan:

   powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\TERAPKAN-AUTH-USERNAME-PASSWORD.ps1"

3. WAJIB jalankan migration:

   npx.cmd supabase db push

4. Verifikasi:

   Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
   npm.cmd run typecheck
   npm.cmd run lint
   npm.cmd test
   npm.cmd run test:security
   npm.cmd run build

MIGRASI SUPER ADMIN LAMA:
- Akun Auth dan password lama TIDAK dihapus.
- Username awal Super Admin pertama menjadi: superadmin
- Login setelah migration:
    Username: superadmin
    Password: password Supabase Auth lama Anda

Jika password Super Admin lupa, gunakan break-glass Supabase Admin API seperti
sebelumnya. Tidak ada forgot-password publik lagi.

CATATAN:
- Custom SMTP boleh tetap aktif di Supabase, tetapi tidak lagi diperlukan untuk Auth.
- Email internal yang dibuat untuk user baru hanya identifier teknis Supabase Auth
  dan tidak ditampilkan pada UI.
- Password tidak pernah disimpan di tabel public atau audit log.
