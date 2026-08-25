GMAHK NARIPAN - AUTH OTP & USER INVITATION PATCH

FITUR:
- Forgot Password memakai OTP 6 digit
- Halaman /auth/verify-reset
- Recovery OTP diverifikasi oleh Supabase
- Existing /auth/reset-password tetap dipakai
- Halaman /auth/accept-invite
- Existing Admin -> Pengguna -> Kirim Undangan tetap dipakai
- User membuat password sendiri setelah OTP invite valid
- Rate limiting + origin validation tetap aktif

TIDAK ADA:
- package.json
- package-lock.json
- .env / .env.local
- migration SQL

CARA PASANG:
1. Extract ZIP ke root project, Replace files bila diminta.
2. Jalankan dari root project:
   powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\TERAPKAN-AUTH-OTP-RECOVERY-INVITE.ps1"
3. Baca docs\SUPABASE-AUTH-OTP-SETUP.md
4. Konfigurasi Custom SMTP + template OTP Recovery dan Invite di Supabase.
5. Jalankan:
   Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
   npm.cmd run typecheck
   npm.cmd run lint
   npm.cmd test
   npm.cmd run test:security
   npm.cmd run build
6. Test lokal, lalu git push agar Vercel redeploy.

CATATAN:
File Forgot Password Anda tidak ditimpa. Script hanya menambahkan redirect ke halaman OTP agar styling manual terbaru tetap aman.

SETELAH PATCH SUDAH TERUJI:
- Hapus backup sementara jika ada:
  Get-ChildItem -Recurse -File -Filter "*.bak" | Remove-Item
- Pastikan *.bak ada di .gitignore sebelum git push.
