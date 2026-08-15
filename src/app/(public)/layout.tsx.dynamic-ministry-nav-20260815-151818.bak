import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { MotionProvider } from "@/components/motion/motion-provider";
import {
  PublicMotionChrome,
  PublicPageMotion,
} from "@/components/motion/public-motion-chrome";
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
    <MotionProvider>
      <Navbar site={site} isLive={livestream.isLive} />
      <PublicMotionChrome />
      <main className="min-h-screen">
        <PublicPageMotion>{children}</PublicPageMotion>
      </main>
      <Footer site={site} />
    </MotionProvider>
  );
}
