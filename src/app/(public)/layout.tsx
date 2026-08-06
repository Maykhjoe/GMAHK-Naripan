import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { getSiteConfig } from "@/lib/data/site-settings";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const site = await getSiteConfig();

  return (
    <>
      <Navbar site={site} />
      <main className="min-h-screen">{children}</main>
      <Footer site={site} />
    </>
  );
}
