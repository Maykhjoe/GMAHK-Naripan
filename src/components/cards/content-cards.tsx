import Image from "next/image";
import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  Clock3,
  Flower2,
  Heart,
  MapPin,
  Music2,
  Play,
  Plus,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type {
  EventItem,
  Ministry,
  Post,
  Sermon,
  ServiceSchedule,
} from "@/types/content";

export function ServiceScheduleCard({ item }: { item: ServiceSchedule }) {
  return (
    <Card
      id={item.id}
      className={cn(
        "group relative scroll-mt-28 overflow-hidden p-6 transition duration-500 hover:-translate-y-1 hover:shadow-xl",
        item.featured && "bg-primary text-white md:row-span-2",
      )}
    >
      <Badge className={item.featured ? "bg-gold text-primary" : ""}>
        {item.category}
      </Badge>

      <h3 className="mt-5 font-serif text-2xl font-semibold">{item.title}</h3>

      <div
        className={cn(
          "mt-5 space-y-3 text-sm",
          item.featured ? "text-white/65" : "text-muted",
        )}
      >
        <p className="flex items-start gap-2">
          <CalendarDays
            className="mt-0.5 size-4 shrink-0 text-gold"
            aria-hidden="true"
          />
          <span>
            {item.day}, {item.date}
          </span>
        </p>

        <p className="flex items-start gap-2">
          <Clock3
            className="mt-0.5 size-4 shrink-0 text-gold"
            aria-hidden="true"
          />
          <span>{item.time}</span>
        </p>

        <p className="flex items-start gap-2">
          <MapPin
            className="mt-0.5 size-4 shrink-0 text-gold"
            aria-hidden="true"
          />
          <span>{item.location}</span>
        </p>

        {item.speaker && (
          <p className="border-t border-current/10 pt-3">
            Pembicara: {item.speaker}
          </p>
        )}
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Button
          asChild
          variant={item.featured ? "primary" : "secondary"}
          size="default"
        >
          <Link href={`/jadwal-ibadah#${item.id}`}>Lihat jadwal</Link>
        </Button>

        <Button
          type="button"
          variant={item.featured ? "outlineLight" : "secondary"}
          size="icon"
          aria-label="Fitur tambah ke kalender segera tersedia"
          title="Fitur tambah ke kalender segera tersedia"
          disabled
        >
          <Plus className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </Card>
  );
}

export function EventCard({ item }: { item: EventItem }) {
  return (
    <Card className="group overflow-hidden">
      <Link
        href={`/kegiatan/${item.slug}`}
        className="relative block aspect-[4/3] overflow-hidden"
      >
        <Image
          src={item.image}
          alt={`Poster ${item.title}`}
          fill
          className="object-cover transition duration-700 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, 33vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-primary/45 to-transparent" />
        <Badge className="absolute left-4 top-4 bg-white/90">
          {item.category}
        </Badge>
      </Link>

      <div className="p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-secondary">
          {item.date} · {item.time}
        </p>

        <h3 className="mt-3 font-serif text-2xl font-semibold text-primary">
          <Link href={`/kegiatan/${item.slug}`}>{item.title}</Link>
        </h3>

        <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted">
          {item.description}
        </p>

        <p className="mt-4 flex items-start gap-2 text-xs text-muted">
          <MapPin
            className="mt-0.5 size-4 shrink-0 text-gold"
            aria-hidden="true"
          />
          <span>{item.location}</span>
        </p>

        <div className="mt-6 flex items-center justify-between gap-4">
          <Link
            href={`/kegiatan/${item.slug}`}
            className="flex items-center gap-2 text-sm font-semibold text-primary"
          >
            Lihat detail
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </Link>

          {item.isPast ? (
            <Badge>Selesai</Badge>
          ) : (item.registrationOpen ?? item.registration) ? (
            <Badge>Pendaftaran</Badge>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

export function SermonCard({ item }: { item: Sermon }) {
  return (
    <Card className="group overflow-hidden">
      <Link
        href={`/khotbah/${item.slug}`}
        className="relative block aspect-video overflow-hidden"
      >
        <Image
          src={item.image}
          alt={`Khotbah ${item.title}`}
          fill
          className="object-cover transition duration-700 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, 33vw"
        />
        <span className="absolute inset-0 bg-primary/25" />
        <span className="absolute left-1/2 top-1/2 grid size-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-gold text-primary shadow-xl transition group-hover:scale-110">
          {item.youtubeId ? (
            <Play className="size-5 fill-current" aria-hidden="true" />
          ) : (
            <BookOpen className="size-5" aria-hidden="true" />
          )}
        </span>
        <Badge className="absolute left-4 top-4 bg-white/90">
          {item.category}
        </Badge>
      </Link>

      <div className="p-6">
        <h3 className="font-serif text-2xl font-semibold text-primary">
          <Link href={`/khotbah/${item.slug}`}>{item.title}</Link>
        </h3>
        <p className="mt-3 text-sm font-semibold text-secondary">
          {item.speaker}
        </p>
        <div className="mt-4 flex flex-wrap justify-between gap-3 text-xs text-muted">
          <span>{item.date}</span>
          <span>{item.verse}</span>
        </div>
      </div>
    </Card>
  );
}

export function ArticleCard({ item }: { item: Post }) {
  return (
    <article className="group">
      <Link
        href={`/berita/${item.slug}`}
        className="relative block aspect-[4/3] overflow-hidden rounded-2xl"
      >
        <Image
          src={item.image}
          alt={item.title}
          fill
          className="object-cover transition duration-700 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, 33vw"
        />
      </Link>

      <Badge className="mt-5">{item.category}</Badge>
      <h3 className="mt-3 font-serif text-2xl font-semibold leading-tight text-primary">
        <Link href={`/berita/${item.slug}`}>{item.title}</Link>
      </h3>
      <p className="mt-3 text-sm leading-6 text-muted">{item.excerpt}</p>
      <p className="mt-4 text-xs text-muted">
        {item.date} · {item.author}
      </p>
    </article>
  );
}

const icons = { BookOpen, Users, Heart, Flower2, Music2, Activity };

export function MinistryCard({ item }: { item: Ministry }) {
  const Icon = icons[item.icon as keyof typeof icons] ?? Heart;
  const hasImage = Boolean(item.image);

  return (
    <Link
      id={item.slug}
      href={`/pelayanan/${item.slug}`}
      className={cn(
        "group scroll-mt-28 rounded-2xl border border-primary/10 bg-white transition duration-500 hover:-translate-y-1 hover:border-gold/60 hover:shadow-xl",
        hasImage ? "overflow-hidden" : "p-7",
      )}
    >
      {item.image ? (
        <div className="relative aspect-[16/9] overflow-hidden bg-primary/5">
          <Image
            src={item.image}
            alt={`Pelayanan ${item.name}`}
            fill
            className="object-cover transition duration-700 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-primary/75 via-primary/5 to-transparent" />
          <span className="absolute bottom-4 left-4 grid size-12 place-items-center rounded-xl border border-white/20 bg-primary/85 text-gold backdrop-blur-sm">
            <Icon className="size-5" aria-hidden="true" />
          </span>
        </div>
      ) : (
        <span className="grid size-12 place-items-center rounded-xl bg-cream text-secondary transition group-hover:bg-primary group-hover:text-gold">
          <Icon className="size-5" aria-hidden="true" />
        </span>
      )}

      <div className={cn(hasImage && "p-7")}>
        <h3 className="font-serif text-2xl font-semibold text-primary">
          {item.name}
        </h3>
        <p className="mt-3 text-sm leading-6 text-muted">
          {item.description}
        </p>
        <span className="mt-6 flex items-center gap-2 text-sm font-semibold text-primary">
          Lihat pelayanan
          <ArrowUpRight className="size-4" aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
}

export function GalleryCard({
  src,
  index,
}: {
  src: string;
  index: number;
}) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl",
        index === 0 ? "md:col-span-2 md:row-span-2" : "",
      )}
    >
      <Image
        src={src}
        alt={`Galeri kehidupan jemaat ${index + 1}`}
        fill
        className="object-cover transition duration-700 group-hover:scale-105"
        sizes="(max-width: 768px) 100vw, 40vw"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-primary/70 via-transparent to-transparent opacity-80" />
      <span className="absolute bottom-5 left-5 text-sm font-semibold text-white">
        Kehidupan Jemaat · 2026
      </span>
    </div>
  );
}
