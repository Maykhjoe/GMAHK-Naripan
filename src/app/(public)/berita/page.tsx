import type { Metadata } from "next";
import { Suspense } from "react";

import { ContentBrowser } from "@/components/content/content-browser";
import { PageHero } from "@/components/sections/page-hero";
import { getPublishedPosts } from "@/lib/data/posts";

export const metadata: Metadata = {
  title: "Berita & Renungan",
  description: "Berita jemaat, renungan, dan artikel inspiratif.",
  alternates: {
    canonical: "/berita",
  },
};

export const revalidate = 60;

export default async function NewsPage() {
  const posts = await getPublishedPosts();

  return (
    <>
      <PageHero
        eyebrow="Kabar & Inspirasi"
        title="Berita dan renungan"
        description="Cerita pelayanan, kabar jemaat, dan bahan perenungan untuk menguatkan kehidupan sehari-hari."
      />

      <section className="section-pad bg-cream">
        <div className="container-site">
          <Suspense
            fallback={
              <div className="h-64 animate-pulse rounded-2xl bg-white" />
            }
          >
            <ContentBrowser kind="posts" items={posts} />
          </Suspense>
        </div>
      </section>
    </>
  );
}
