import { handlePublicForm } from "@/lib/api/public-form";
import { visitorSchema, type VisitorInput } from "@/lib/validations/forms";

export async function POST(request: Request) {
  return handlePublicForm(
    request,
    visitorSchema,
    "visitor_forms",
    (value) => {
      const data = value as VisitorInput;

      return {
        name: data.name,
        whatsapp: data.whatsapp,
        visit_date: data.visitDate,
        people_count: data.peopleCount,
        bringing_children: data.bringingChildren,
        notes: data.notes || null,
        consent_at: new Date().toISOString(),
        status: "new",
      };
    },
    { turnstileAction: "visitor" },
  );
}
