"use client";

import {
  FormEvent,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SelectOption } from "@/lib/data/pagination";

type SelectFilter = {
  name: "category" | "year" | "speaker" | "scope";
  label: string;
  value: string;
  options: SelectOption[];
  defaultValue?: string;
};

type DateFilter = {
  name: "dateFrom" | "dateTo";
  label: string;
  value: string;
};

type PublicContentFiltersProps = {
  query: string;
  placeholder: string;
  selects?: SelectFilter[];
  dates?: DateFilter[];
};

export function PublicContentFilters({
  query,
  placeholder,
  selects = [],
  dates = [],
}: PublicContentFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [queryInput, setQueryInput] = useState(query);
  const [isPending, startTransition] = useTransition();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  function navigate(name: string, value: string) {
    const next = new URLSearchParams(searchParams.toString());

    if (value) {
      next.set(name, value);
    } else {
      next.delete(name);
    }

    next.delete("page");

    startTransition(() => {
      router.replace(`${pathname}${next.size ? `?${next.toString()}` : ""}`, {
        scroll: false,
      });
    });
  }

  function scheduleQuery(value: string) {
    setQueryInput(value);

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      navigate("q", value.trim());
    }, 450);
  }

  function submitQuery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    navigate("q", queryInput.trim());
  }

  function reset() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    setQueryInput("");
    startTransition(() => router.replace(pathname, { scroll: false }));
  }

  const hasFilters =
    Boolean(query) ||
    selects.some(
      (filter) => Boolean(filter.value) && filter.value !== filter.defaultValue,
    ) ||
    dates.some((filter) => Boolean(filter.value));

  return (
    <div
      className="rounded-2xl border border-primary/10 bg-white p-4 shadow-sm"
      aria-busy={isPending}
    >
      <div className="grid gap-3 lg:grid-cols-12">
        <form
          onSubmit={submitQuery}
          className="flex gap-2 lg:col-span-5"
          role="search"
        >
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">{placeholder}</span>
            <Search
              className="absolute left-4 top-3.5 size-5 text-muted"
              aria-hidden="true"
            />
            <Input
              value={queryInput}
              onChange={(event) => scheduleQuery(event.target.value)}
              className="pl-12"
              placeholder={placeholder}
              autoComplete="off"
            />
          </label>
          <Button type="submit" variant="secondary" className="px-4">
            {isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Search className="size-4" aria-hidden="true" />
            )}
            <span className="sr-only sm:not-sr-only">Cari</span>
          </Button>
        </form>

        {selects.map((filter) => (
          <label key={filter.name} className="lg:col-span-2">
            <span className="sr-only">{filter.label}</span>
            <select
              aria-label={filter.label}
              value={filter.value}
              onChange={(event) => navigate(filter.name, event.target.value)}
              className="h-12 w-full rounded-xl border border-primary/15 bg-white px-4 text-sm outline-none transition focus:border-secondary focus:ring-3 focus:ring-secondary/10"
            >
              <option value="">{filter.label}</option>
              {filter.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ))}

        {dates.map((filter) => (
          <label key={filter.name} className="lg:col-span-2">
            <span className="mb-1 block text-xs font-semibold text-muted">
              {filter.label}
            </span>
            <Input
              type="date"
              value={filter.value}
              onChange={(event) => navigate(filter.name, event.target.value)}
              aria-label={filter.label}
            />
          </label>
        ))}

        {hasFilters && (
          <div className="flex items-end lg:col-span-1">
            <Button
              type="button"
              variant="secondary"
              size="icon"
              onClick={reset}
              aria-label="Hapus semua filter"
              title="Hapus semua filter"
            >
              <X className="size-4" aria-hidden="true" />
            </Button>
          </div>
        )}
      </div>

      <p className="mt-3 text-xs leading-5 text-muted">
        Pencarian diperbarui otomatis setelah Anda berhenti mengetik.
      </p>
    </div>
  );
}
