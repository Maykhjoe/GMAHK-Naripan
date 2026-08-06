import "server-only";

import { posts as fallbackPosts } from "@/lib/constants/site-data";
import { createPublicClient } from "@/lib/supabase/public";
import type { Post } from "@/types/content";

const DEFAULT_POST_IMAGE =
  "https://images.unsplash.com/photo-1519491050282-cf00c82424b4?auto=format&fit=crop&w=1200&q=85";

const DEFAULT_CATEGORY = "Berita Jemaat";
const DEFAULT_AUTHOR = "Tim Komunikasi";

type CategoryRelation =
  | { name: string }
  | { name: string }[]
  | null;

type PostRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: unknown;
  reading_minutes: number | null;
  seo: unknown;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  category: CategoryRelation;
};

export type PublicPost = Post & {
  content: string[];
  readingMinutes: number;
  publishedAt: string;
  updatedAt: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(
  record: Record<string, unknown>,
  key: string,
): string | null {
  const value = record[key];

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized || null;
}


function categoryName(category: CategoryRelation) {
  if (Array.isArray(category)) {
    return category[0]?.name?.trim() || null;
  }

  return category?.name?.trim() || null;
}

function splitParagraphs(value: string) {
  return value
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function parseContent(content: unknown, excerpt: string): string[] {
  if (typeof content === "string") {
    const paragraphs = splitParagraphs(content);
    return paragraphs.length ? paragraphs : [excerpt];
  }

  if (Array.isArray(content)) {
    const paragraphs = content
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);

    return paragraphs.length ? paragraphs : [excerpt];
  }

  if (isRecord(content)) {
    if (Array.isArray(content.paragraphs)) {
      const paragraphs = content.paragraphs
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean);

      if (paragraphs.length) {
        return paragraphs;
      }
    }

    if (typeof content.body === "string") {
      const paragraphs = splitParagraphs(content.body);

      if (paragraphs.length) {
        return paragraphs;
      }
    }
  }

  return excerpt ? [excerpt] : [];
}

function estimateReadingMinutes(paragraphs: string[]) {
  const words = paragraphs.join(" ").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

function formatPublishedDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

function mapFallbackPost(post: Post): PublicPost {
  const now = new Date().toISOString();

  return {
    ...post,
    content: [
      "Dalam kehidupan yang bergerak cepat, Tuhan mengundang kita untuk kembali kepada hal yang utama: hidup dekat dengan-Nya dan menghadirkan kasih dalam relasi sehari-hari.",
      "Pelayanan yang dilakukan dengan kasih dapat menjadi saluran pengharapan bagi keluarga, jemaat, dan masyarakat sekitar.",
    ],
    readingMinutes: 5,
    publishedAt: now,
    updatedAt: now,
  };
}

function mapDatabasePost(row: PostRow): PublicPost {
  const seo = isRecord(row.seo) ? row.seo : {};
  const excerpt =
    row.excerpt?.trim() ||
    stringValue(seo, "description") ||
    "Baca kabar dan renungan terbaru dari GMAHK Naripan.";
  const content = parseContent(row.content, excerpt);
  const publishedAt = row.published_at || row.created_at;

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    category:
      categoryName(row.category) ||
      stringValue(seo, "category") ||
      DEFAULT_CATEGORY,
    date: formatPublishedDate(publishedAt),
    excerpt,
    image: stringValue(seo, "image") || DEFAULT_POST_IMAGE,
    author: stringValue(seo, "author") || DEFAULT_AUTHOR,
    content,
    readingMinutes:
      row.reading_minutes || estimateReadingMinutes(content),
    publishedAt,
    updatedAt: row.updated_at,
  };
}

function fallbackPostsWithLimit(limit?: number) {
  const mapped = fallbackPosts.map(mapFallbackPost);
  return typeof limit === "number" ? mapped.slice(0, limit) : mapped;
}

export async function getPublishedPosts(
  limit?: number,
): Promise<PublicPost[]> {
  const supabase = createPublicClient();

  if (!supabase) {
    return fallbackPostsWithLimit(limit);
  }

  let query = supabase
    .from("posts")
    .select(
      "id, slug, title, excerpt, content, reading_minutes, seo, published_at, created_at, updated_at, category:post_categories(name)",
    )
    .eq("status", "published")
    .is("deleted_at", null)
    .lte("published_at", new Date().toISOString())
    .order("published_at", {
      ascending: false,
      nullsFirst: false,
    })
    .order("created_at", { ascending: false });

  if (typeof limit === "number") {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error(
      "Gagal mengambil artikel publik dari Supabase:",
      error.message,
    );

    return fallbackPostsWithLimit(limit);
  }

  return (data as PostRow[]).map(mapDatabasePost);
}

export async function getPublishedPostBySlug(
  slug: string,
): Promise<PublicPost | null> {
  const supabase = createPublicClient();

  if (!supabase) {
    const fallback = fallbackPosts.find((post) => post.slug === slug);
    return fallback ? mapFallbackPost(fallback) : null;
  }

  const { data, error } = await supabase
    .from("posts")
    .select(
      "id, slug, title, excerpt, content, reading_minutes, seo, published_at, created_at, updated_at, category:post_categories(name)",
    )
    .eq("slug", slug)
    .eq("status", "published")
    .is("deleted_at", null)
    .lte("published_at", new Date().toISOString())
    .maybeSingle();

  if (error) {
    console.error(
      `Gagal mengambil artikel publik dengan slug "${slug}":`,
      error.message,
    );

    const fallback = fallbackPosts.find((post) => post.slug === slug);
    return fallback ? mapFallbackPost(fallback) : null;
  }

  return data ? mapDatabasePost(data as PostRow) : null;
}
