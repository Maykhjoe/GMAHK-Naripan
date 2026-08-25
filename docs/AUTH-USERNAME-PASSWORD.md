# Auth Admin Username + Password

Sistem admin GMAHK Naripan memakai **username + password** untuk pengalaman login,
namun tetap menggunakan **Supabase Auth** sebagai mesin session/JWT sehingga RLS,
RBAC, audit, dan proteksi database yang sudah ada tetap berlaku.

## Perubahan utama

- Admin tidak lagi membutuhkan email untuk login.
- Super Admin membuat akun langsung dari **Admin → Pengguna**.
- Form pembuatan akun: nama lengkap, username, password, role, dan departemen bila diperlukan.
- Tidak ada invite email, OTP invite, forgot-password email, recovery link, atau SMTP untuk Auth.
- Lupa password pengguna ditangani oleh Super Admin melalui tombol **Reset Password**.
- Password tidak pernah disimpan di `profiles`, log, maupun tabel aplikasi.
- Supabase Auth tetap menyimpan password dalam bentuk hash internal.

## Migrasi akun lama

Migration `202608250001_username_password_auth.sql` menambahkan `profiles.username`.

- Super Admin lama pertama mendapatkan username awal: `superadmin`.
- Akun lama lainnya mendapatkan username sementara `user_<id>` / `admin_<id>`.
- Password Supabase Auth lama **tidak berubah**.

Setelah migration, Super Admin lama dapat login dengan:

- Username: `superadmin`
- Password: password Supabase Auth yang selama ini digunakan.

Jika password Super Admin lupa, recovery break-glass tetap dilakukan oleh pemilik
project melalui Supabase Admin API/Dashboard, bukan melalui halaman publik.

## Pembuatan akun baru

Endpoint Super Admin membuat Supabase Auth user dengan email internal acak. Email
tersebut hanya identifier teknis Auth dan tidak ditampilkan kepada pengguna.
Pengguna login menggunakan username yang tersimpan di `public.profiles`.

## Password policy

Pembuatan/reset password mewajibkan:

- minimal 12 karakter;
- huruf besar;
- huruf kecil;
- angka;
- maksimal 128 karakter.

## Username policy

- 3–32 karakter;
- otomatis lowercase;
- boleh huruf `a-z`, angka, `.`, `_`, dan `-`;
- harus diawali dan diakhiri huruf/angka;
- unik tanpa membedakan kapitalisasi.

## Route Auth yang dipertahankan

- `/auth/login`
- `/auth/unauthorized`
- `/api/auth/login`

## Route Auth lama yang dihapus

- `/auth/forgot-password`
- `/auth/verify-reset`
- `/auth/reset-password`
- `/auth/accept-invite`
- `/auth/callback`
- `/api/auth/forgot-password`
- `/api/auth/verify-reset-otp`
- `/api/auth/accept-invite`

## Setelah install

```powershell
npx.cmd supabase db push
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
npm.cmd run test:security
npm.cmd run build
```
