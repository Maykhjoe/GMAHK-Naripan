-- Safe seed data in Indonesian. No real leader identities or sensitive contact data.
insert into public.roles(code,name,description) values
('super_admin','Super Admin','Akses penuh sistem'),('web_administrator','Web Administrator','Administrasi teknis dan konten'),
('secretariat','Sekretariat','Jadwal, pengunjung, pesan, dan administrasi'),('media_team','Media Team','Khotbah, live, galeri, dan media'),
('editor','Editor','Berita, renungan, dan konten'),('pastoral','Pastoral','Pelayanan pastoral dan permohonan doa'),
('department_admin','Department Admin','Konten departemen yang ditugaskan') on conflict(code) do nothing;

insert into public.permissions(code,name,module) values
('dashboard.read','Lihat Dashboard','dashboard'),('schedules.manage','Kelola Jadwal','schedules'),('events.manage','Kelola Kegiatan','events'),
('sermons.manage','Kelola Khotbah','sermons'),('livestreams.manage','Kelola Live','livestreams'),('posts.manage','Kelola Artikel','posts'),
('ministries.manage','Kelola Departemen','ministries'),('leaders.manage','Kelola Pengurus','leaders'),('gallery.manage','Kelola Galeri','gallery'),
('prayers.read','Baca Permohonan Doa','prayers'),('visitors.read','Baca Pengunjung Baru','visitors'),('messages.read','Baca Pesan','messages'),
('files.manage','Kelola File','files'),('users.manage','Kelola Pengguna','users'),('appearance.manage','Kelola Tampilan','appearance'),
('settings.manage','Kelola Pengaturan','settings') on conflict(code) do nothing;

-- Web administrator receives all non-private content administration permissions.
insert into public.role_permissions(role_id,permission_id)
select r.id,p.id from public.roles r cross join public.permissions p where r.code='web_administrator' and p.code in
('dashboard.read','schedules.manage','events.manage','sermons.manage','livestreams.manage','posts.manage','ministries.manage','leaders.manage','gallery.manage','files.manage','users.manage','appearance.manage','settings.manage') on conflict do nothing;
insert into public.role_permissions(role_id,permission_id)
select r.id,p.id from public.roles r cross join public.permissions p where
(r.code='pastoral' and p.code in ('dashboard.read','schedules.manage','sermons.manage','posts.manage','prayers.read','visitors.read')) or
(r.code='secretariat' and p.code in ('dashboard.read','schedules.manage','events.manage','leaders.manage','visitors.read','messages.read','files.manage')) or
(r.code='media_team' and p.code in ('dashboard.read','sermons.manage','livestreams.manage','gallery.manage','files.manage')) or
(r.code='editor' and p.code in ('dashboard.read','posts.manage','sermons.manage','events.manage')) or
(r.code='department_admin' and p.code in ('dashboard.read','events.manage','posts.manage','ministries.manage','gallery.manage')) on conflict do nothing;

insert into public.church_profiles(name,short_name,description,vision,mission,address,whatsapp,email,status) values
('Gereja Masehi Advent Hari Ketujuh Jemaat Naripan','GMAHK Naripan','Sebuah keluarga iman yang bertumbuh dalam Firman dan melayani dalam kasih.','Menjadi komunitas yang mencerminkan kasih Kristus dan membawa pengharapan.','["Bertumbuh dalam Firman","Melayani dengan kasih","Menguatkan setiap generasi"]','[Alamat Gereja — silakan diperbarui]','[Nomor WhatsApp]','[Email Gereja]','active');

insert into public.sermon_categories(slug,name,status) values
('khotbah-sabat','Khotbah Sabat','active'),('renungan','Renungan','active'),('sekolah-sabat','Sekolah Sabat','active'),
('pendalaman-alkitab','Kelompok Pendalaman Alkitab','active'),('seminar','Seminar','active'),('kesaksian','Kesaksian','active'),('musik-rohani','Musik Rohani','active') on conflict(slug) do nothing;
insert into public.post_categories(slug,name,status) values
('renungan','Renungan','active'),('berita-jemaat','Berita Jemaat','active'),('pemuda','Pemuda','active'),('kesehatan','Kesehatan','active') on conflict(slug) do nothing;
insert into public.post_tags(slug,name) values ('iman','Iman'),('pelayanan','Pelayanan'),('keluarga','Keluarga'),('kesehatan','Kesehatan') on conflict(slug) do nothing;

insert into public.ministries(slug,name,short_description,description,display_order,status,published_at) values
('sekolah-sabat','Sekolah Sabat','Belajar Firman dalam kelas yang hangat.','Belajar Firman Tuhan dalam kelas yang hangat dan interaktif.',1,'published',now()),
('pemuda-advent','Pemuda Advent','Bertumbuh dan berkarya bersama.','Ruang bertumbuh, berkarya, dan melayani bagi generasi muda.',2,'published',now()),
('pelayanan-anak','Pelayanan Anak','Mengenal Yesus dengan sukacita.','Menolong anak mengenal Yesus melalui pengalaman yang menyenangkan.',3,'published',now()),
('pelayanan-wanita','Pelayanan Wanita','Saling menguatkan dalam iman.','Menguatkan perempuan untuk bertumbuh dan saling menopang.',4,'published',now()),
('musik','Pelayanan Musik','Pujian yang berpusat pada Kristus.','Melayani jemaat melalui pujian yang berpusat pada Kristus.',5,'published',now()),
('kesehatan','Pelayanan Kesehatan','Hidup sehat secara menyeluruh.','Mendorong kehidupan sehat secara utuh: tubuh, pikiran, dan rohani.',6,'published',now()) on conflict(slug) do nothing;

insert into public.service_schedules(slug,title,category,starts_at,ends_at,location,is_featured,status,published_at) values
('sekolah-sabat-mingguan','Sekolah Sabat','Sekolah Sabat','2026-08-08 08:00:00+07','2026-08-08 09:00:00+07','Ruang Ibadah Utama',true,'published',now()),
('kebaktian-sabat-2026-08-08','Kebaktian Sabat','Kebaktian Sabat','2026-08-08 09:00:00+07','2026-08-08 11:00:00+07','GMAHK Jemaat Naripan',false,'published',now()),
('adventist-youth-2026-08-08','Adventist Youth','Adventist Youth','2026-08-08 16:00:00+07','2026-08-08 18:00:00+07','Aula Gereja',false,'published',now()),
('pertemuan-doa-2026-08-12','Pertemuan Doa','Pertemuan Doa','2026-08-12 18:30:00+07','2026-08-12 19:30:00+07','Ruang Doa',false,'published',now()) on conflict(slug) do nothing;

insert into public.events(slug,title,category,short_description,description,starts_at,ends_at,location,registration_enabled,capacity,status,published_at) values
('seminar-kesehatan-keluarga','Seminar Kesehatan Keluarga','Kesehatan','Kebiasaan sehat untuk seluruh keluarga.','Belajar membangun kebiasaan sehat yang sederhana dan berkelanjutan.','2026-08-15 14:00:00+07','2026-08-15 17:00:00+07','Aula GMAHK Naripan',true,100,'published',now()),
('pelayanan-kasih-untuk-sesama','Pelayanan Kasih untuk Sesama','Pelayanan Masyarakat','Hadir dan berbagi bagi masyarakat.','Berbagi paket kebutuhan dan pemeriksaan kesehatan sederhana.','2026-08-23 08:00:00+07','2026-08-23 13:00:00+07','Wilayah Bandung',true,60,'published',now()),
('kemah-rohani-pathfinder','Kemah Rohani Pathfinder','Pathfinder','Belajar, bersahabat, dan bertumbuh.','Akhir pekan pembelajaran, keterampilan, dan pertumbuhan rohani.','2026-09-05 07:00:00+07','2026-09-06 15:00:00+07','Bumi Perkemahan',false,null,'published',now()) on conflict(slug) do nothing;
