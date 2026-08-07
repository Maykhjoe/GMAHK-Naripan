import type { SupabaseClient } from "@supabase/supabase-js";

export const articleWorkflowStatuses = [
  "draft",
  "pending_review",
  "published",
  "archived",
] as const;

export type ArticleWorkflowStatus = (typeof articleWorkflowStatuses)[number];

export type ArticleWorkflowCapabilities = {
  userId: string;
  canReview: boolean;
  canPublish: boolean;
  canEditAll: boolean;
  canDeletePermanent: boolean;
};

export function isArticleWorkflowStatus(
  value: unknown,
): value is ArticleWorkflowStatus {
  return (
    typeof value === "string" &&
    (articleWorkflowStatuses as readonly string[]).includes(value)
  );
}

export function articleStatusLabel(status: unknown) {
  switch (status) {
    case "draft":
      return "Draf";
    case "pending_review":
      return "Menunggu Peninjauan";
    case "published":
      return "Dipublikasikan";
    case "archived":
      return "Diarsipkan";
    default:
      return String(status ?? "—");
  }
}

export function contributorAllowedStatuses(
  capabilities: Pick<ArticleWorkflowCapabilities, "canPublish"> | null,
) {
  return capabilities?.canPublish
    ? articleWorkflowStatuses
    : (["draft", "pending_review", "archived"] as const);
}

export async function getArticleWorkflowCapabilities(
  supabase: SupabaseClient,
  userId: string,
): Promise<ArticleWorkflowCapabilities> {
  const [review, publish, editAll, deletePermanent] = await Promise.all([
    supabase.rpc("has_permission", { permission_code: "posts.review" }),
    supabase.rpc("has_permission", { permission_code: "posts.publish" }),
    supabase.rpc("has_permission", { permission_code: "posts.edit_all" }),
    supabase.rpc("has_permission", {
      permission_code: "posts.delete_permanent",
    }),
  ]);

  return {
    userId,
    canReview: !review.error && Boolean(review.data),
    canPublish: !publish.error && Boolean(publish.data),
    canEditAll: !editAll.error && Boolean(editAll.data),
    canDeletePermanent:
      !deletePermanent.error && Boolean(deletePermanent.data),
  };
}
