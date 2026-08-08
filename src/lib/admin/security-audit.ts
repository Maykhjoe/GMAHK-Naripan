import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export async function recordSecurityAudit(input: {
  actorId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  details?: Record<string, string | number | boolean | null>;
}) {
  const admin = createAdminClient();

  if (!admin) {
    return;
  }

  const { error } = await admin.from("audit_logs").insert({
    actor_id: input.actorId,
    action: input.action.slice(0, 80),
    entity_type: input.entityType.slice(0, 80),
    entity_id: input.entityId ?? null,
    new_data: input.details ?? {},
  });

  if (error) {
    console.error("[security-audit] write failed", {
      code: error.code,
      message: error.message,
    });
  }
}
