import type { AdminResource } from "@/lib/admin/resources";

export type ResourceMutationMode = "create" | "update";

function nonEmptyString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized || null;
}

export function createSlug(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function paragraphArray(value: unknown) {
  if (typeof value === "string") {
    return value
      .split(/\n\s*\n/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (value && typeof value === "object" && "paragraphs" in value) {
    return paragraphArray((value as { paragraphs: unknown }).paragraphs);
  }

  return [];
}

function lineArray(value: unknown) {
  if (typeof value === "string") {
    return value
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") {
          return item.trim();
        }

        if (item && typeof item === "object") {
          const record = item as Record<string, unknown>;
          const time = nonEmptyString(record.time);
          const label =
            nonEmptyString(record.item) ??
            nonEmptyString(record.title) ??
            nonEmptyString(record.name);

          if (time && label) {
            return `${time} — ${label}`;
          }

          return label ?? "";
        }

        return "";
      })
      .filter(Boolean);
  }

  return [];
}

function plainTextFromContent(value: unknown) {
  return paragraphArray(value).join(" ");
}

function estimateReadingMinutes(value: unknown) {
  const words = plainTextFromContent(value)
    .split(/\s+/)
    .filter(Boolean).length;

  return Math.max(1, Math.ceil(words / 200));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function createSeo(
  title: unknown,
  description: unknown,
  extras: Record<string, unknown> = {},
  current: unknown = {},
) {
  const normalizedTitle = nonEmptyString(title);
  const normalizedDescription = nonEmptyString(description);
  const currentSeo = isRecord(current) ? current : {};

  return {
    ...currentSeo,
    ...(normalizedTitle ? { title: normalizedTitle } : {}),
    ...(normalizedDescription
      ? { description: normalizedDescription.slice(0, 180) }
      : {}),
    ...Object.fromEntries(
      Object.entries(extras).filter(([, value]) => value !== undefined),
    ),
  };
}

export function extractYouTubeId(value: unknown) {
  const normalized = nonEmptyString(value);

  if (!normalized) {
    return null;
  }

  if (/^[a-zA-Z0-9_-]{11}$/.test(normalized)) {
    return normalized;
  }

  try {
    const url = new URL(normalized);

    if (url.hostname === "youtu.be") {
      return url.pathname.split("/").filter(Boolean)[0] ?? normalized;
    }

    if (url.hostname.endsWith("youtube.com")) {
      if (url.pathname === "/watch") {
        return url.searchParams.get("v") ?? normalized;
      }

      const segments = url.pathname.split("/").filter(Boolean);
      const markerIndex = segments.findIndex((segment) =>
        ["embed", "shorts", "live"].includes(segment),
      );

      if (markerIndex >= 0) {
        return segments[markerIndex + 1] ?? normalized;
      }
    }
  } catch {
    return normalized;
  }

  return normalized;
}

function settingValue(value: unknown) {
  if (typeof value !== "string") {
    return value;
  }

  const normalized = value.trim();

  if (!normalized) {
    return "";
  }

  try {
    return JSON.parse(normalized) as unknown;
  } catch {
    return normalized;
  }
}

function normalizeOptionalEmptyValues(
  payload: Record<string, unknown>,
  resource: AdminResource,
) {
  for (const field of resource.fields) {
    if (!field.required && payload[field.key] === "") {
      payload[field.key] = null;
    }
  }
}

export function prepareResourcePayload(
  section: string,
  resource: AdminResource,
  data: Record<string, unknown>,
  mode: ResourceMutationMode,
  currentRecord?: Record<string, unknown>,
) {
  const payload = { ...data };

  normalizeOptionalEmptyValues(payload, resource);

  if (mode === "create" && resource.slugSource) {
    const source = nonEmptyString(payload[resource.slugSource]);

    if (source) {
      payload.slug = createSlug(source);
    }
  }

  switch (section) {
    case "berita": {
      if (mode === "create" || "content" in payload) {
        const paragraphs = paragraphArray(payload.content);
        payload.content = { paragraphs };
        payload.reading_minutes = estimateReadingMinutes(paragraphs);
      }

      const author = nonEmptyString(payload.author_name);
      const image = nonEmptyString(payload.featured_image_url);

      if (
        mode === "create" ||
        "title" in payload ||
        "excerpt" in payload ||
        "author_name" in payload ||
        "featured_image_url" in payload
      ) {
        payload.seo = createSeo(
          payload.title,
          payload.excerpt,
          {
            author: author ?? undefined,
            image: image ?? undefined,
          },
          currentRecord?.seo,
        );

        if ("author_name" in payload && !author) {
          delete (payload.seo as Record<string, unknown>).author;
        }

        if ("featured_image_url" in payload && !image) {
          delete (payload.seo as Record<string, unknown>).image;
        }
      }

      delete payload.author_name;
      delete payload.featured_image_url;
      break;
    }

    case "kegiatan": {
      if (mode === "create" || "rundown" in payload) {
        payload.rundown = lineArray(payload.rundown);
      }

      const image = nonEmptyString(payload.poster_url);

      if (
        mode === "create" ||
        "title" in payload ||
        "short_description" in payload ||
        "description" in payload ||
        "poster_url" in payload
      ) {
        payload.seo = createSeo(
          payload.title,
          payload.short_description ?? payload.description,
          {
            image: image ?? undefined,
          },
          currentRecord?.seo,
        );

        if ("poster_url" in payload && !image) {
          delete (payload.seo as Record<string, unknown>).image;
        }
      }

      delete payload.poster_url;
      break;
    }

    case "departemen": {
      if (mode === "create" || "programs" in payload) {
        payload.programs = lineArray(payload.programs);
      }

      const shortName = nonEmptyString(payload.short_name);
      const coordinator = nonEmptyString(payload.coordinator_name);
      const email = nonEmptyString(payload.contact_email);
      const schedule = nonEmptyString(payload.schedule);
      const location = nonEmptyString(payload.location);
      const icon = nonEmptyString(payload.ministry_icon);
      const image = nonEmptyString(payload.thumbnail_url);

      if (
        mode === "create" ||
        "name" in payload ||
        "short_description" in payload ||
        "description" in payload ||
        "short_name" in payload ||
        "coordinator_name" in payload ||
        "contact_email" in payload ||
        "schedule" in payload ||
        "location" in payload ||
        "ministry_icon" in payload ||
        "thumbnail_url" in payload
      ) {
        payload.seo = createSeo(
          payload.name,
          payload.short_description ?? payload.description,
          {
            shortName: shortName ?? undefined,
            coordinator: coordinator ?? undefined,
            email: email ?? undefined,
            schedule: schedule ?? undefined,
            location: location ?? undefined,
            icon: icon ?? undefined,
            image: image ?? undefined,
          },
          currentRecord?.seo,
        );

        const seo = payload.seo as Record<string, unknown>;

        if ("short_name" in payload && !shortName) {
          delete seo.shortName;
        }

        if ("coordinator_name" in payload && !coordinator) {
          delete seo.coordinator;
        }

        if ("contact_email" in payload && !email) {
          delete seo.email;
        }

        if ("schedule" in payload && !schedule) {
          delete seo.schedule;
        }

        if ("location" in payload && !location) {
          delete seo.location;
        }

        if ("ministry_icon" in payload && !icon) {
          delete seo.icon;
        }

        if ("thumbnail_url" in payload && !image) {
          delete seo.image;
        }
      }

      delete payload.short_name;
      delete payload.coordinator_name;
      delete payload.contact_email;
      delete payload.schedule;
      delete payload.location;
      delete payload.ministry_icon;
      delete payload.thumbnail_url;
      break;
    }

    case "khotbah": {
      if ("youtube_id" in payload) {
        payload.youtube_id = extractYouTubeId(payload.youtube_id);
      }

      const speaker = nonEmptyString(payload.speaker_name);
      const image = nonEmptyString(payload.thumbnail_url);
      const audio = nonEmptyString(payload.audio_url);
      const materialPdf = nonEmptyString(payload.material_pdf_url);

      if (
        mode === "create" ||
        "title" in payload ||
        "description" in payload ||
        "speaker_name" in payload ||
        "thumbnail_url" in payload ||
        "audio_url" in payload ||
        "material_pdf_url" in payload
      ) {
        payload.seo = createSeo(
          payload.title,
          payload.description,
          {
            speaker: speaker ?? undefined,
            image: image ?? undefined,
            audio: audio ?? undefined,
            materialPdf: materialPdf ?? undefined,
          },
          currentRecord?.seo,
        );

        const seo = payload.seo as Record<string, unknown>;

        if ("speaker_name" in payload && !speaker) {
          delete seo.speaker;
        }

        if ("thumbnail_url" in payload && !image) {
          delete seo.image;
        }

        if ("audio_url" in payload && !audio) {
          delete seo.audio;
        }

        if ("material_pdf_url" in payload && !materialPdf) {
          delete seo.materialPdf;
        }
      }

      delete payload.speaker_name;
      delete payload.thumbnail_url;
      delete payload.audio_url;
      delete payload.material_pdf_url;
      break;
    }

    case "live":
      if ("youtube_id" in payload) {
        payload.youtube_id = extractYouTubeId(payload.youtube_id);
      }
      break;

    case "pengaturan":
      if ("value" in payload) {
        payload.value = settingValue(payload.value);
      }
      break;

    default:
      break;
  }

  return payload;
}
