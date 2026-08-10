import { handlePublicForm } from "@/lib/api/public-form";
import { normalizePhone, normalizePlainText } from "@/lib/security/normalize";
import { visitorSchema, type VisitorInput } from "@/lib/validations/forms";

export async function POST(request: Request) {
  return handlePublicForm(
    request,
    visitorSchema,
    "visitor_forms",
    (value) => {
      const data = value as VisitorInput;
      return {
        name: normalizePlainText(data.name),
        whatsapp: normalizePhone(data.whatsapp),
        visit_date: data.visitDate,
        people_count: data.peopleCount,
        bringing_children: data.bringingChildren,
        notes: normalizePlainText(data.notes),
        consent_at: new Date().toISOString(),
        status: "new",
      };
    },
    { turnstileAction: "visitor", limit: 5, windowMs: 10 * 60_000 },
  );
}
