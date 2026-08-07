import { describe, expect, it } from "vitest";

import {
  articleStatusLabel,
  contributorAllowedStatuses,
  isArticleWorkflowStatus,
} from "./article-workflow";

describe("article editorial workflow", () => {
  it("menerima hanya empat status editorial final", () => {
    expect(isArticleWorkflowStatus("draft")).toBe(true);
    expect(isArticleWorkflowStatus("pending_review")).toBe(true);
    expect(isArticleWorkflowStatus("published")).toBe(true);
    expect(isArticleWorkflowStatus("archived")).toBe(true);
    expect(isArticleWorkflowStatus("scheduled")).toBe(false);
    expect(isArticleWorkflowStatus("inactive")).toBe(false);
  });

  it("tidak menawarkan publish kepada kontributor biasa", () => {
    expect(contributorAllowedStatuses(null)).toEqual([
      "draft",
      "pending_review",
      "archived",
    ]);
    expect(
      contributorAllowedStatuses({ canPublish: false }),
    ).not.toContain("published");
  });

  it("mengizinkan publisher memakai semua status", () => {
    expect(contributorAllowedStatuses({ canPublish: true })).toEqual([
      "draft",
      "pending_review",
      "published",
      "archived",
    ]);
  });

  it("memberi label admin yang mudah dibaca", () => {
    expect(articleStatusLabel("pending_review")).toBe("Menunggu Peninjauan");
    expect(articleStatusLabel("published")).toBe("Dipublikasikan");
  });
});
