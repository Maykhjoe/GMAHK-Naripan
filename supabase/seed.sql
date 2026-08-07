-- Safe seed data in Indonesian. No real leader identities or sensitive contact data.
insert into public.roles(code,name,description) values
('super_admin','Super Admin','Mengelola sistem, keamanan, pengguna, dan monitoring pelayanan.'),
('pastor','Pendeta/Gembala Jemaat','Memimpin pelayanan jemaat dan menangani permohonan doa untuk pendeta.'),
('church_chair','Ketua Jemaat','Mendukung operasional pelayanan di bawah Pendeta/Gembala Jemaat.'),
('prayer_team','Tim Pendoa Jemaat','Menangani permohonan doa yang ditujukan kepada Tim Pendoa Jemaat.'),
('secretary','Sekretaris','Kegiatan, jadwal, pengunjung, pesan, dan administrasi.'),
('editor','Editor','Berita, renungan, dan kualitas konten.'),
('media','Media','Khotbah, live, galeri, dan media.'),
('department_admin','Admin Departemen','Konten departemen yang ditugaskan')
on conflict(code) do update set name=excluded.name, description=excluded.description, status='active';

insert into public.permissions(code,name,module) values
('dashboard.read','Lihat Dashboard','dashboard'),
('monitoring.read','Lihat Monitoring Pelayanan','monitoring'),
('schedules.manage','Kelola Jadwal','schedules'),
('events.manage','Kelola Kegiatan','events'),
('sermons.manage','Kelola Khotbah','sermons'),
('livestreams.manage','Kelola Live','livestreams'),
('posts.manage','Kelola Artikel','posts'),
('ministries.manage','Kelola Departemen','ministries'),
('leaders.manage','Kelola Pengurus','leaders'),
('gallery.manage','Kelola Galeri','gallery'),
('prayers.inbox.read','Akses Kotak Masuk Permohonan Doa','prayers'),
('visitors.read','Baca Pengunjung Baru','visitors'),
('messages.read','Baca Pesan','messages'),
('files.manage','Kelola File','files'),
('users.manage','Kelola Pengguna','users'),
('appearance.manage','Kelola Tampilan','appearance'),
('settings.manage','Kelola Pengaturan','settings')
on conflict(code) do update set name=excluded.name, module=excluded.module;

-- The final permission matrix is also enforced by migration 202608070005.
with permission_matrix(role_code, permission_code) as (
  values
    ('super_admin','dashboard.read'),('super_admin','monitoring.read'),
    ('pastor','dashboard.read'),('pastor','schedules.manage'),('pastor','events.manage'),
    ('pastor','sermons.manage'),('pastor','posts.manage'),('pastor','leaders.manage'),
    ('pastor','prayers.inbox.read'),('pastor','visitors.read'),
    ('church_chair','dashboard.read'),('church_chair','schedules.manage'),
    ('church_chair','events.manage'),('church_chair','posts.manage'),
    ('church_chair','leaders.manage'),('church_chair','visitors.read'),
    ('prayer_team','dashboard.read'),('prayer_team','posts.manage'),
    ('prayer_team','prayers.inbox.read'),
    ('secretary','dashboard.read'),('secretary','schedules.manage'),
    ('secretary','events.manage'),('secretary','posts.manage'),
    ('secretary','leaders.manage'),('secretary','visitors.read'),
    ('secretary','messages.read'),('secretary','files.manage'),
    ('editor','dashboard.read'),('editor','posts.manage'),
    ('editor','sermons.manage'),('editor','events.manage'),
    ('media','dashboard.read'),('media','posts.manage'),('media','sermons.manage'),
    ('media','livestreams.manage'),('media','gallery.manage'),('media','files.manage'),
    ('department_admin','dashboard.read'),('department_admin','posts.manage'),
    ('department_admin','events.manage'),('department_admin','ministries.manage'),
    ('department_admin','gallery.manage')
)
insert into public.role_permissions(role_id,permission_id)
select role.id, permission.id
from permission_matrix matrix
join public.roles role on role.code=matrix.role_code
join public.permissions permission on permission.code=matrix.permission_code
on conflict do nothing;

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
