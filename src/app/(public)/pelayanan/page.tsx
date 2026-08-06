import type { Metadata } from "next";

import { MinistryCard } from "@/components/cards/content-cards";
import { PageHero } from "@/components/sections/page-hero";
import { getPublishedMinistries } from "@/lib/data/ministries";

export const metadata: Metadata = {
  title: "Pelayanan",
  description: "Departemen dan pelayanan GMAHK Jemaat Naripan.",
  alternates: { canonical: "/pelayanan" },
};

export const revalidate = 60;

export default async function MinistriesPage() {
  const ministries = await getPublishedMinistries();

  return (
    <>
      <PageHero
        eyebrow="Melayani Bersama"
        title="Setiap talenta memiliki tempat"
        description="Kenali departemen pelayanan dan temukan ruang untuk bertumbuh, berkarya, serta menjadi berkat."
      />

      <section className="section-pad bg-cream">
        <div className="container-site">
          {ministries.length > 0 ? (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {ministries.map((item) => (
                <MinistryCard key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-primary/20 bg-white p-12 text-center">
              <p className="font-serif text-2xl text-primary">
                Belum ada pelayanan yang dipublikasikan
              </p>
              <p className="mt-2 text-sm leading-6 text-muted">
                Pelayanan yang diterbitkan melalui admin akan tampil otomatis
                di halaman ini.
              </p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
