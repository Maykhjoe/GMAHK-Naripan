import "server-only";

import { isIP } from "node:net";

import {
  sanitizeAuditDetails,
  type AuditDetailValue,
} from "@/lib/security/audit-redaction";
import { createAdminClient } from "@/lib/supabase/admin";

function normalizeIp(value: string | null) {
  const candidate = value?.trim();

  if (!candidate) {
    return null;
  }

  if (isIP(candidate)) {
    return candidate;
  }

  const bracketMatch = candidate.match(/^\[([^\]]+)](?::\d+)?$/);
  if (bracketMatch?.[1] && isIP(bracketMatch[1])) {
    return bracketMatch[1];
  }

  if (candidate.split(":").length === 2) {
    const [host] = candidate.split(":");
    if (host && isIP(host)) {
      return host;
    }
  }

  return null;
}

function requestMetadata(request?: Request) {
  if (!request) {
    return { ipAddress: null, userAgent: null };
  }

  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0] ?? null;
  const ipAddress = normalizeIp(
    request.headers.get("cf-connecting-ip") ??
      request.headers.get("x-real-ip") ??
      forwarded,
  );
  const userAgent = request.headers.get("user-agent")?.slice(0, 500) ?? null;

  return { ipAddress, userAgent };
}

export async function recordSecurityAudit(input: {
  actorId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  details?: Record<string, AuditDetailValue>;
  request?: Request;
}) {
  const admin = createAdminClient();

  if (!admin) {
    return;
  }

  const { ipAddress, userAgent } = requestMetadata(input.request);
  const { error } = await admin.from("audit_logs").insert({
    actor_id: input.actorId,
    action: input.action.slice(0, 80),
    entity_type: input.entityType.slice(0, 80),
    entity_id: input.entityId ?? null,
    new_data: sanitizeAuditDetails(input.details),
    ip_address: ipAddress,
    user_agent: userAgent,
  });

  if (error) {
    console.error("[security-audit] write failed", {
      code: error.code,
      message: error.message,
    });
  }
}
