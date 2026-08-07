import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

type QueryPaginationProps = {
  pathname: string;
  page: number;
  pageCount: number;
  params: Record<string, string | undefined>;
};

type PageToken = number | "ellipsis-start" | "ellipsis-end";

function pageTokens(page: number, pageCount: number): PageToken[] {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }

  const tokens: PageToken[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(pageCount - 1, page + 1);

  if (start > 2) {
    tokens.push("ellipsis-start");
  }

  for (let value = start; value <= end; value += 1) {
    tokens.push(value);
  }

  if (end < pageCount - 1) {
    tokens.push("ellipsis-end");
  }

  tokens.push(pageCount);
  return tokens;
}

function hrefFor(
  pathname: string,
  params: Record<string, string | undefined>,
  page: number,
) {
  const next = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value && key !== "page") {
      next.set(key, value);
    }
  }

  if (page > 1) {
    next.set("page", String(page));
  }

  return `${pathname}${next.size ? `?${next.toString()}` : ""}`;
}

const baseClass =
  "grid size-11 place-items-center rounded-full border text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2";

export function QueryPagination({
  pathname,
  page,
  pageCount,
  params,
}: QueryPaginationProps) {
  if (pageCount <= 1) {
    return null;
  }

  return (
    <nav
      aria-label="Navigasi halaman hasil"
      className="mt-12 flex flex-wrap items-center justify-center gap-2"
    >
      {page > 1 ? (
        <Link
          href={hrefFor(pathname, params, page - 1)}
          scroll={false}
          className={cn(baseClass, "border-primary/15 bg-white text-primary")}
          aria-label="Halaman sebelumnya"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
        </Link>
      ) : (
        <span
          className={cn(
            baseClass,
            "cursor-not-allowed border-primary/10 bg-white/60 text-muted/50",
          )}
          aria-hidden="true"
        >
          <ChevronLeft className="size-4" />
        </span>
      )}

      {pageTokens(page, pageCount).map((token) =>
        typeof token === "number" ? (
          <Link
            key={token}
            href={hrefFor(pathname, params, token)}
            scroll={false}
            aria-current={token === page ? "page" : undefined}
            aria-label={`Halaman ${token}`}
            className={cn(
              baseClass,
              token === page
                ? "border-primary bg-primary text-white"
                : "border-primary/15 bg-white text-primary hover:border-gold",
            )}
          >
            {token}
          </Link>
        ) : (
          <span
            key={token}
            className="grid size-11 place-items-center text-sm text-muted"
            aria-hidden="true"
          >
            …
          </span>
        ),
      )}

      {page < pageCount ? (
        <Link
          href={hrefFor(pathname, params, page + 1)}
          scroll={false}
          className={cn(baseClass, "border-primary/15 bg-white text-primary")}
          aria-label="Halaman berikutnya"
        >
          <ChevronRight className="size-4" aria-hidden="true" />
        </Link>
      ) : (
        <span
          className={cn(
            baseClass,
            "cursor-not-allowed border-primary/10 bg-white/60 text-muted/50",
          )}
          aria-hidden="true"
        >
          <ChevronRight className="size-4" />
        </span>
      )}
    </nav>
  );
}
