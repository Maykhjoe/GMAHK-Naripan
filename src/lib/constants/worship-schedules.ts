import type { ServiceSchedule } from "@/types/content";

export type RegularWorshipSchedule = {
  id: string;
  title: string;
  day: string;
  startTime: string;
  endTime: string;
  location: string;
  description: string;
  featured?: boolean;
};

export const specialWorshipCategories = [
  "Ibadah Tahun Baru",
  "Kebaktian Kebangunan Rohani",
  "Pekan Doa",
  "Perjamuan Kudus",
  "Ibadah Gabungan",
  "Seminar Rohani",
  "Kegiatan Khusus",
] as const;

export const regularWorshipSchedules = [
  {
    id: "ibadah-rabu",
    title: "Ibadah Rabu",
    day: "Rabu",
    startTime: "19:00",
    endTime: "20:00",
    location: "GMAHK Jemaat Naripan",
    description: "Ibadah doa dan pendalaman Firman pada pertengahan pekan.",
    featured: false,
  },
  {
    id: "ibadah-vesper",
    title: "Ibadah Vesper",
    day: "Jumat",
    startTime: "19:00",
    endTime: "20:00",
    location: "GMAHK Jemaat Naripan",
    description: "Ibadah untuk menyambut datangnya hari Sabat.",
    featured: false,
  },
  {
    id: "ibadah-sabat",
    title: "Ibadah Sabat",
    day: "Sabtu",
    startTime: "09:00",
    endTime: "12:00",
    location: "GMAHK Jemaat Naripan",
    description: "Sekolah Sabat dan kebaktian utama Sabat.",
    featured: true,
  },
] as const satisfies readonly RegularWorshipSchedule[];

export function formatRegularWorshipTime(
  schedule: Pick<RegularWorshipSchedule, "startTime" | "endTime">,
) {
  return `${schedule.startTime}–${schedule.endTime} WIB`;
}

export const regularWorshipScheduleCards: ServiceSchedule[] =
  regularWorshipSchedules.map((schedule) => ({
    id: schedule.id,
    title: schedule.title,
    day: schedule.day,
    date: "Setiap minggu",
    time: formatRegularWorshipTime(schedule),
    location: schedule.location,
    category: "Ibadah Rutin",
    featured: schedule.featured,
  }));
