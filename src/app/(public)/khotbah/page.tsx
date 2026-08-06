import type { Metadata } from "next";
import { Suspense } from "react";

import { ContentBrowser } from "@/components/content/content-browser";
import { PageHero } from "@/components/sections/page-hero";
import { getPublishedSermons } from "@/lib/data/sermons";

export const metadata: Metadata = {
  title: "Arsip Khotbah",
  description:
    "Khotbah, renungan, seminar, dan kesaksian GMAHK Jemaat Naripan.",
  alternates: {
    canonical: "/khotbah",
  },
};

export const revalidate = 60;

export default async function SermonsPage() {
  const sermons = await getPublishedSermons();

  return (
    <>
      <PageHero
        eyebrow="Arsip Firman"
        title="Dengarkan, renungkan, dan bertumbuh"
        description="Kumpulan khotbah dan renungan untuk menyertai perjalanan iman Anda."
      />

      <section className="section-pad bg-cream">
        <div className="container-site">
          {sermons.length > 0 ? (
            <Suspense
              fallback={
                <div className="h-64 animate-pulse rounded-2xl bg-white" />
              }
            >
              <ContentBrowser kind="sermons" items={sermons} />
            </Suspense>
          ) : (
            <div className="rounded-2xl border border-dashed border-primary/20 bg-white p-12 text-center text-sm text-muted">
              Belum ada khotbah yang dipublikasikan.
            </div>
          )}
        </div>
      </section>
    </>
  );
}
