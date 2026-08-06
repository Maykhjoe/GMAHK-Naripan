import { describe, expect, it } from "vitest";
import { events, ministries, posts, sermons } from "@/lib/constants/site-data";
import { getOpenGraphContent } from "./open-graph";

describe("getOpenGraphContent", () => {
  it("resolves event content", () => {
    const event = events[0];
    expect(getOpenGraphContent("event", event.slug)).toEqual({
      title: event.title,
      eyebrow: event.category,
      description: `${event.date} · ${event.time} · ${event.location}`,
      image: event.image,
    });
  });

  it("resolves article content", () => {
    const post = posts[0];
    expect(getOpenGraphContent("article", post.slug)).toEqual({
      title: post.title,
      eyebrow: post.category,
      description: post.excerpt,
      image: post.image,
    });
  });

  it("resolves sermon content", () => {
    const sermon = sermons[0];
    expect(getOpenGraphContent("sermon", sermon.slug)).toEqual({
      title: sermon.title,
      eyebrow: sermon.category,
      description: `${sermon.speaker} · ${sermon.date} · ${sermon.verse}`,
      image: sermon.image,
    });
  });

  it("resolves ministry content without inventing an image", () => {
    const ministry = ministries[0];
    expect(getOpenGraphContent("ministry", ministry.slug)).toEqual({
      title: ministry.name,
      eyebrow: "Departemen Pelayanan",
      description: ministry.description,
    });
  });

  it("returns null for an unknown slug", () => {
    expect(getOpenGraphContent("event", "tidak-ada")).toBeNull();
  });
});
