import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";

import { JsonLd } from "@/components/seo/json-ld";
import { getSiteConfig } from "@/lib/data/site-settings";
import {
  createChurchJsonLd,
  createWebsiteJsonLd,
} from "@/lib/seo/structured-data";
import "./globals.css";

export const revalidate = 60;

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSiteConfig();

  return {
    metadataBase: new URL(site.url),
    title: {
      default: site.name,
      template: `%s | ${site.shortName}`,
    },
    description: site.description,
    applicationName: site.shortName,
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      locale: "id_ID",
      url: site.url,
      siteName: site.name,
      title: site.name,
      description: site.description,
    },
    twitter: {
      card: "summary_large_image",
      title: site.name,
      description: site.description,
    },
    robots: { index: true, follow: true },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const site = await getSiteConfig();

  return (
    <html
      lang="id"
      className={`${inter.variable} ${playfair.variable} antialiased`}
    >
      <body>
        <JsonLd data={createChurchJsonLd(site)} />
        <JsonLd data={createWebsiteJsonLd(site)} />
        {children}
      </body>
    </html>
  );
}
