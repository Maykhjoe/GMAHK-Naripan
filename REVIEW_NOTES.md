# Catatan Perbaikan Proyek

Perbaikan ini dibuat dengan menjaga struktur utama website, route, komponen, dan susunan halaman tetap sama. Fokusnya adalah memperbaiki bug non-destruktif, merapikan kode yang disentuh, meningkatkan aksesibilitas, dan memberi polesan visual ringan.

## Perbaikan yang diterapkan

- Memperbaiki submenu navbar agar memakai link anchor yang eksplisit dan benar.
- Menambahkan anchor pada bagian Tentang, kartu Pelayanan, dan kartu Jadwal.
- Memperbaiki empat halaman detail pelayanan yang sebelumnya berpotensi 404: Komunikasi, Pathfinder, Adventurer, dan Pelayanan Masyarakat.
- Memasukkan seluruh halaman pelayanan ke sitemap dan Open Graph generator.
- Menjaga jumlah kartu pelayanan dan jadwal di homepage tetap seperti semula.
- Menambahkan status menu aktif, dukungan keyboard, tombol Escape, dan penutupan menu mobile saat route berubah.
- Merapikan footer, menambahkan nama akun Instagram/YouTube, link email, dan link Google Maps.
- Menggunakan React Icons untuk logo Instagram/YouTube dan Lucide untuk ikon UI umum.
- Memperbaiki halaman Kontak agar tidak menampilkan nomor telepon placeholder `-`.
- Mengubah tombol pelayanan menjadi link email yang benar-benar berfungsi.
- Menghapus `suppressHydrationWarning` karena warning sebelumnya berasal dari ekstensi browser, bukan aplikasi.
- Membatasi mode demo admin hanya untuk development; production menolak akses bila konfigurasi Supabase belum tersedia.
- Memperbarui petunjuk migration Supabase agar seluruh migration diterapkan berurutan.
- Mengoptimalkan logo hijau dari sekitar 1,3 MB menjadi sekitar 21 KB dengan bentuk yang konsisten dengan logo putih.
- Merapikan format JSX/CSS pada file yang disentuh tanpa mengubah susunan halaman utama.

## Hal yang sengaja belum diubah

- Halaman publik masih membaca data statis. Admin belum dihubungkan ke halaman publik karena perubahan tersebut menyentuh arsitektur data dan sebaiknya dikerjakan sebagai tahap terpisah.
- Jadwal ibadah belum diseragamkan karena source memiliki dua versi: footer memakai 09.00/10.00, sedangkan halaman jadwal dan homepage memakai 08.00/09.00. Data asli dipertahankan sampai jadwal resmi dikonfirmasi.
- Placeholder nama pendeta, koordinator, jam sekretariat, Zoom, WhatsApp, dan data resmi lain tidak diisi dengan data rekaan.

## Validasi yang dilakukan

- Seluruh 125 file TypeScript/TSX berhasil diparsing tanpa syntax error.
- Seluruh import lokal diperiksa; tidak ditemukan path import yang hilang.
- Logo hijau berhasil dirender setelah optimasi.

Full `npm run typecheck`, `npm test`, dan `npm run build` belum dapat dijalankan di environment analisis karena dependency project tidak tersedia dan registry internal tidak menyediakan versi package yang dibutuhkan. Jalankan quality gates berikut setelah menyalin project:

```bash
npm install
npm run typecheck
npm run lint
npm test
npm run build
```
