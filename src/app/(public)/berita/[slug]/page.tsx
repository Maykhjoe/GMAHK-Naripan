import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";

import { ArticleCard } from "@/components/cards/content-cards";
import { JsonLd } from "@/components/seo/json-ld";
import { ShareActions } from "@/components/share/share-actions";
import { Badge } from "@/components/ui/badge";
import {
  getPublishedPostBySlug,
  getPublishedPosts,
} from "@/lib/data/posts";
import { getSiteConfig } from "@/lib/data/site-settings";
import {
  createArticleJsonLd,
  createBreadcrumbJsonLd,
} from "@/lib/seo/structured-data";

export const revalidate = 60;

type PostDetailProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({
  params,
}: PostDetailProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedPostBySlug(slug);

  if (!post) {
    return {
      title: "Artikel Tidak Ditemukan",
    };
  }

  return {
    title: post.title,
    description: post.excerpt,
    alternates: {
      canonical: `/berita/${post.slug}`,
    },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.excerpt,
      url: `/berita/${post.slug}`,
      images: [
        {
          url: post.image,
          alt: post.title,
        },
      ],
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      authors: [post.author],
      section: post.category,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
      images: [post.image],
    },
  };
}

export default async function PostDetail({ params }: PostDetailProps) {
  const { slug } = await params;
  const [post, latestPosts, siteConfig] = await Promise.all([
    getPublishedPostBySlug(slug),
    getPublishedPosts(4),
    getSiteConfig(),
  ]);

  if (!post) {
    notFound();
  }

  const relatedPosts = latestPosts
    .filter((item) => item.id !== post.id)
    .slice(0, 3);

  return (
    <>
      <JsonLd data={createArticleJsonLd(post, siteConfig)} />
      <JsonLd
        data={createBreadcrumbJsonLd(
          [
            { name: "Beranda", path: "/" },
            { name: "Berita", path: "/berita" },
            {
              name: post.title,
              path: `/berita/${post.slug}`,
            },
          ],
          siteConfig.url,
        )}
      />

      <article>
        <header className="bg-primary pb-16 pt-36 text-center text-white">
          <div className="container-site max-w-4xl">
            <Badge className="bg-gold text-primary">
              {post.category}
            </Badge>

            <h1 className="heading-display mt-6 text-5xl text-balance sm:text-6xl">
              {post.title}
            </h1>

            <p className="mt-6 text-sm text-white/60">
              {post.author} · {post.date} · {post.readingMinutes} menit baca
            </p>
          </div>
        </header>

        <div className="container-site -mt-1 max-w-5xl">
          <div className="relative aspect-[16/8] overflow-hidden rounded-b-[2rem]">
            <Image
              src={post.image}
              alt={post.title}
              fill
              priority
              className="object-cover"
              sizes="100vw"
            />
          </div>
        </div>

        <div className="section-pad container-site max-w-3xl">
          <p className="font-serif text-2xl leading-9 text-secondary">
            {post.excerpt}
          </p>

          <div className="mt-8 space-y-6">
            {post.content.map((paragraph, index) => (
              <p
                key={`${post.id}-paragraph-${index}`}
                className="leading-8 text-muted"
              >
                {paragraph}
              </p>
            ))}
          </div>

          <ShareActions
            title={post.title}
            url={`${siteConfig.url}/berita/${post.slug}`}
          />
        </div>
      </article>

      {relatedPosts.length > 0 && (
        <section className="section-pad bg-cream">
          <div className="container-site">
            <h2 className="font-serif text-4xl text-primary">
              Artikel terkait
            </h2>

            <div className="mt-8 grid gap-8 md:grid-cols-3">
              {relatedPosts.map((item) => (
                <ArticleCard key={item.id} item={item} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
