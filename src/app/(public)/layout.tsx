import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { getLivestreamOverview } from "@/lib/data/livestreams";
import { getSiteConfig } from "@/lib/data/site-settings";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [site, livestream] = await Promise.all([
    getSiteConfig(),
    getLivestreamOverview(),
  ]);

  return (
    <>
      <Navbar site={site} isLive={livestream.isLive} />
      <main className="min-h-screen">{children}</main>
      <Footer site={site} />
    </>
  );
}
