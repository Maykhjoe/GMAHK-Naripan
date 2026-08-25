# Setup Supabase Auth OTP — GMAHK Naripan

Patch aplikasi ini menambahkan UI dan endpoint untuk:

- Forgot Password -> OTP 6 digit -> Reset Password
- Admin `Kirim Undangan` -> OTP 6 digit -> Set Password Pertama

## Penting

Supabase harus mengirim **kode OTP** di email. Jika template Recovery / Invite masih template default berbentuk link, halaman OTP aplikasi tidak akan menerima kode yang bisa dilihat user.

Untuk project Free baru yang memakai SMTP bawaan Supabase, template email tidak dapat dikustomisasi. Gunakan **Custom SMTP** agar template dapat diedit dan email production dapat dikirim ke alamat admin yang sebenarnya.

## 1. Custom SMTP

Dashboard Supabase:

`Authentication -> Emails / SMTP Settings`

Gunakan provider SMTP pilihan Anda (Resend, Postmark, Brevo, SendGrid, Amazon SES, dll).

Saran sender:

- Sender name: `GMAHK Naripan`
- Sender email: alamat no-reply pada domain yang sudah diverifikasi di provider SMTP.

Jangan menyimpan password SMTP di source Git.

## 2. Template Reset Password / Recovery

Subject:

`Kode pemulihan kata sandi GMAHK Naripan`

Body minimal:

```html
<h2>Pemulihan Kata Sandi</h2>
<p>Kami menerima permintaan untuk mengatur ulang kata sandi akun Admin GMAHK Naripan.</p>
<p>Kode pemulihan Anda:</p>
<p style="font-size:32px;font-weight:700;letter-spacing:8px;">{{ .Token }}</p>
<p>Masukkan kode tersebut di halaman pemulihan kata sandi.</p>
<p><a href="{{ .SiteURL }}/auth/verify-reset">Buka halaman verifikasi</a></p>
<p>Jika Anda tidak meminta pemulihan ini, abaikan email tersebut.</p>
```

**Jangan jadikan `{{ .ConfirmationURL }}` sebagai CTA utama** jika Anda ingin flow OTP manual.

## 3. Template Invite User

Subject:

`Undangan Admin GMAHK Naripan`

Body minimal:

```html
<h2>Undangan Admin GMAHK Naripan</h2>
<p>Anda menerima undangan untuk mengaktifkan akun administrasi GMAHK Naripan.</p>
<p>Kode aktivasi Anda:</p>
<p style="font-size:32px;font-weight:700;letter-spacing:8px;">{{ .Token }}</p>
<p>Buka halaman berikut lalu masukkan email, kode, dan buat kata sandi pribadi:</p>
<p><a href="{{ .SiteURL }}/auth/accept-invite">Aktifkan akun</a></p>
<p>Jangan bagikan kode ini kepada siapa pun.</p>
```

## 4. URL Configuration

Pastikan production:

- Site URL: `https://gmahk-naripan.vercel.app`
- Redirect URL production yang sudah ada tetap boleh dipertahankan untuk flow lain.
- Localhost redirect tetap boleh dipertahankan untuk development lokal.

Flow OTP di patch ini tidak bergantung pada redirect link email untuk recovery/invite.

## 5. Cara uji Forgot Password

1. Buka `/auth/forgot-password`.
2. Masukkan email Super Admin.
3. Setelah request berhasil aplikasi akan membuka `/auth/verify-reset?email=...`.
4. Masukkan OTP 6 digit dari email.
5. Jika valid, aplikasi membuka `/auth/reset-password`.
6. Masukkan password baru melalui halaman reset yang sudah ada.
7. Login ulang.

## 6. Cara uji Tambah Pengguna

1. Admin -> Pengguna.
2. Isi Nama, Email, Role, dan Departemen jika role `Admin Departemen`.
3. Klik `Kirim Undangan`.
4. User menerima email undangan dengan OTP 6 digit.
5. User membuka `/auth/accept-invite`.
6. Masukkan email + OTP + password baru minimal 12 karakter.
7. Setelah berhasil, login dari `/auth/login`.

Existing endpoint Admin Pengguna tetap menangani pembuatan user/role/department. Patch ini tidak mengubah RBAC atau permission assignment.

## 7. Security

Endpoint OTP baru menggunakan:

- origin validation
- request size limit
- normalisasi email
- rate limit IP
- rate limit IP + email
- Supabase `verifyOtp`
- password tidak pernah dikirim ke Super Admin

Jangan membuat tabel OTP sendiri dan jangan menyimpan OTP plaintext di database aplikasi.
