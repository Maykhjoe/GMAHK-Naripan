import "server-only";

import { cache } from "react";

import { createPublicClient } from "@/lib/supabase/public";

export type PublicLeader = {
  id: string;
  name: string;
  position: string;
  bio: string | null;
  period: string | null;
  phone: string | null;
  email: string | null;
  photoUrl: string | null;
  displayOrder: number;
};

type LeaderRow = {
  id: string;
  name: string;
  position: string;
  bio: string | null;
  period: string | null;
  phone: string | null;
  email: string | null;
  photo_url: string | null;
  display_order: number;
};

function cleanOptional(value: string | null) {
  const normalized = value?.trim();
  return normalized || null;
}

function mapLeader(row: LeaderRow): PublicLeader {
  return {
    id: row.id,
    name: row.name.trim(),
    position: row.position.trim(),
    bio: cleanOptional(row.bio),
    period: cleanOptional(row.period),
    phone: cleanOptional(row.phone),
    email: cleanOptional(row.email),
    photoUrl: cleanOptional(row.photo_url),
    displayOrder: row.display_order,
  };
}

export const getPublishedLeaders = cache(
  async (): Promise<PublicLeader[]> => {
    const supabase = createPublicClient();

    if (!supabase) {
      return [];
    }

    const { data, error } = await supabase
      .from("leaders")
      .select(
        "id, name, position, bio, period, phone, email, photo_url, display_order",
      )
      .eq("is_public", true)
      .eq("status", "published")
      .is("deleted_at", null)
      .order("display_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      console.error("Data pengurus tidak dapat dimuat:", error.message);
      return [];
    }

    return (data as LeaderRow[]).map(mapLeader);
  },
);
