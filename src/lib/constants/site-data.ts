import {
  regularWorshipScheduleCards,
  regularWorshipSchedules,
  formatRegularWorshipTime,
} from "@/lib/constants/worship-schedules";

import type {
  EventItem,
  Ministry,
  Post,
  Sermon,
  ServiceSchedule,
} from "@/types/content";

import { defaultSiteConfig } from "@/lib/site/config";

export const siteConfig = defaultSiteConfig;

type NavChild = {
  label: string;
  href: string;
};

type NavItem = {
  label: string;
  href: string;
  children?: readonly NavChild[];
};

export const navItems: readonly NavItem[] = [
  { label: "Beranda", href: "/" },
  {
    label: "Tentang",
    href: "/tentang",
    children: [
      { label: "Profil Gereja", href: "/tentang#profil-gereja" },
      { label: "Sejarah", href: "/tentang#sejarah" },
      { label: "Visi dan Misi", href: "/tentang#visi-dan-misi" },
      { label: "Kepercayaan", href: "/tentang#kepercayaan" },
      { label: "Pengurus", href: "/tentang#pengurus" },
    ],
  },
  { label: "Jadwal Ibadah", href: "/jadwal-ibadah" },
  { label: "Kegiatan", href: "/kegiatan" },
  { label: "Khotbah", href: "/khotbah" },
  {
    label: "Pelayanan",
    href: "/pelayanan",
    children: [
      { label: "Sekolah Sabat", href: "/pelayanan#sekolah-sabat" },
      { label: "Pemuda Advent", href: "/pelayanan#pemuda-advent" },
      { label: "Pelayanan Anak", href: "/pelayanan#pelayanan-anak" },
      { label: "Pelayanan Wanita", href: "/pelayanan#pelayanan-wanita" },
      { label: "Musik", href: "/pelayanan#musik" },
      { label: "Komunikasi", href: "/pelayanan#komunikasi" },
      { label: "Kesehatan", href: "/pelayanan#kesehatan" },
      { label: "Pathfinder", href: "/pelayanan#pathfinder" },
      { label: "Adventurer", href: "/pelayanan#adventurer" },
      {
        label: "Pelayanan Masyarakat",
        href: "/pelayanan#pelayanan-masyarakat",
      },
    ],
  },
  { label: "Berita", href: "/berita" },
  { label: "Galeri", href: "/galeri" },
  { label: "Kontak", href: "/kontak" },
];

export const weeklyWorshipSchedules = regularWorshipSchedules.map(
  (schedule) => ({
    title: schedule.title,
    day: schedule.day,
    time: formatRegularWorshipTime(schedule),
  }),
);

// Alias dipertahankan untuk kompatibilitas komponen lama.
// Sumber jadwal rutin tetap hanya berada di worship-schedules.ts.
export const schedules: ServiceSchedule[] = regularWorshipScheduleCards;
export const schedulePageItems: ServiceSchedule[] = regularWorshipScheduleCards;

export const events: EventItem[] = [
  {
    id: "1",
    slug: "seminar-kesehatan-keluarga",
    title: "Seminar Kesehatan Keluarga",
    category: "Kesehatan",
    date: "15 Agustus 2026",
    time: "14.00 WIB",
    startsAt: "2026-08-15T14:00:00+07:00",
    endsAt: "2026-08-15T16:00:00+07:00",
    location: "Aula GMAHK Naripan",
    description:
      "Belajar membangun kebiasaan sehat yang sederhana dan berkelanjutan untuk seluruh keluarga.",
    image:
      "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=1200&q=85",
    registration: true,
  },
  {
    id: "2",
    slug: "pelayanan-kasih-untuk-sesama",
    title: "Pelayanan Kasih untuk Sesama",
    category: "Pelayanan Masyarakat",
    date: "23 Agustus 2026",
    time: "08.00 WIB",
    startsAt: "2026-08-23T08:00:00+07:00",
    endsAt: "2026-08-23T12:00:00+07:00",
    location: "Wilayah Bandung",
    description:
      "Berbagi paket kebutuhan dan pemeriksaan kesehatan sederhana bagi masyarakat sekitar.",
    image:
      "https://images.unsplash.com/photo-1559027615-cd4628902d4a?auto=format&fit=crop&w=1200&q=85",
    registration: true,
  },
  {
    id: "3",
    slug: "kemah-rohani-pathfinder",
    title: "Kemah Rohani Pathfinder",
    category: "Pathfinder",
    date: "05 September 2026",
    time: "07.00 WIB",
    startsAt: "2026-09-05T07:00:00+07:00",
    endsAt: "2026-09-06T15:00:00+07:00",
    location: "Bumi Perkemahan",
    description:
      "Akhir pekan penuh pembelajaran, persahabatan, keterampilan, dan pertumbuhan rohani.",
    image:
      "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=1200&q=85",
  },
];

export const sermons: Sermon[] = [
  {
    id: "1",
    slug: "iman-yang-bertumbuh",
    title: "Iman yang Terus Bertumbuh",
    speaker: "Pembicara Tamu",
    date: "01 Agustus 2026",
    verse: "Kolose 2:6–7",
    category: "Khotbah Sabat",
    image:
      "https://images.unsplash.com/photo-1507692049790-de58290a4334?auto=format&fit=crop&w=1200&q=85",
    youtubeId: "ysz5S6PUM-U",
  },
  {
    id: "2",
    slug: "kasih-dalam-tindakan",
    title: "Kasih dalam Tindakan",
    speaker: "Tim Pelayanan",
    date: "25 Juli 2026",
    verse: "1 Yohanes 3:18",
    category: "Renungan",
    image:
      "https://images.unsplash.com/photo-1438232992991-995b7058bbb3?auto=format&fit=crop&w=1200&q=85",
    youtubeId: "ysz5S6PUM-U",
  },
  {
    id: "3",
    slug: "pengharapan-yang-teguh",
    title: "Pengharapan yang Teguh",
    speaker: "Pembicara Jemaat",
    date: "18 Juli 2026",
    verse: "Ibrani 10:23",
    category: "Khotbah Sabat",
    image:
      "https://images.unsplash.com/photo-1473177104440-ffee2f376098?auto=format&fit=crop&w=1200&q=85",
    youtubeId: "ysz5S6PUM-U",
  },
];

export const posts: Post[] = [
  {
    id: "1",
    slug: "melayani-dengan-hati",
    title: "Melayani dengan Hati yang Bersukacita",
    category: "Renungan",
    date: "03 Agustus 2026",
    excerpt:
      "Pelayanan bukan sekadar kegiatan, melainkan jawaban kasih atas anugerah yang telah kita terima.",
    image:
      "https://images.unsplash.com/photo-1519491050282-cf00c82424b4?auto=format&fit=crop&w=1200&q=85",
    author: "Tim Editorial",
  },
  {
    id: "2",
    slug: "kebersamaan-sekolah-sabat",
    title: "Kebersamaan dalam Kelas Sekolah Sabat",
    category: "Berita Jemaat",
    date: "30 Juli 2026",
    excerpt:
      "Ruang belajar yang hangat untuk bertanya, berbagi pengalaman, dan bertumbuh bersama.",
    image:
      "https://images.unsplash.com/photo-1520857014576-2c4f4c972b57?auto=format&fit=crop&w=1200&q=85",
    author: "Tim Komunikasi",
  },
  {
    id: "3",
    slug: "generasi-muda-yang-berdampak",
    title: "Generasi Muda yang Bertumbuh dan Berdampak",
    category: "Pemuda",
    date: "27 Juli 2026",
    excerpt:
      "Pemuda Advent diajak menemukan panggilan, membangun karakter, dan hadir bagi lingkungan.",
    image:
      "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=85",
    author: "Pemuda Advent",
  },
];

export const ministries: Ministry[] = [
  {
    slug: "sekolah-sabat",
    name: "Sekolah Sabat",
    description:
      "Belajar Firman Tuhan dalam kelas yang hangat dan interaktif.",
    icon: "BookOpen",
  },
  {
    slug: "pemuda-advent",
    name: "Pemuda Advent",
    description:
      "Ruang bertumbuh, berkarya, dan melayani bagi generasi muda.",
    icon: "Users",
  },
  {
    slug: "pelayanan-anak",
    name: "Pelayanan Anak",
    description:
      "Menolong anak mengenal Yesus melalui pengalaman yang menyenangkan.",
    icon: "Heart",
  },
  {
    slug: "pelayanan-wanita",
    name: "Pelayanan Wanita",
    description:
      "Menguatkan perempuan untuk bertumbuh dan saling menopang.",
    icon: "Flower2",
  },
  {
    slug: "musik",
    name: "Pelayanan Musik",
    description:
      "Melayani jemaat melalui pujian yang berpusat pada Kristus.",
    icon: "Music2",
  },
  {
    slug: "kesehatan",
    name: "Pelayanan Kesehatan",
    description:
      "Mendorong kehidupan sehat secara utuh: tubuh, pikiran, dan rohani.",
    icon: "Activity",
  },
];

export const allMinistries: Ministry[] = [
  ...ministries,
  {
    slug: "komunikasi",
    name: "Komunikasi",
    description:
      "Membagikan kabar baik melalui media yang relevan dan bertanggung jawab.",
    icon: "Users",
  },
  {
    slug: "pathfinder",
    name: "Pathfinder",
    description:
      "Pembinaan karakter, keterampilan, dan iman bagi remaja.",
    icon: "Activity",
  },
  {
    slug: "adventurer",
    name: "Adventurer",
    description:
      "Kegiatan bermakna bagi anak dan orang tua untuk bertumbuh bersama.",
    icon: "Heart",
  },
  {
    slug: "pelayanan-masyarakat",
    name: "Pelayanan Masyarakat",
    description:
      "Hadir melalui tindakan kasih yang menjawab kebutuhan sekitar.",
    icon: "Users",
  },
];

export const galleryImages = [
  "https://images.unsplash.com/photo-1519491050282-cf00c82424b4?auto=format&fit=crop&w=1000&q=85",
  "https://images.unsplash.com/photo-1438232992991-995b7058bbb3?auto=format&fit=crop&w=1000&q=85",
  "https://images.unsplash.com/photo-1520857014576-2c4f4c972b57?auto=format&fit=crop&w=1000&q=85",
  "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1000&q=85",
  "https://images.unsplash.com/photo-1473177104440-ffee2f376098?auto=format&fit=crop&w=1000&q=85",
];
