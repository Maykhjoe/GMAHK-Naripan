import { visitorSchema, type VisitorInput } from "@/lib/validations/forms";
import { handlePublicForm } from "@/lib/api/public-form";

export async function POST(request: Request) {
  return handlePublicForm(request, visitorSchema, "visitor_forms", (value) => { const data = value as VisitorInput; return { name: data.name, whatsapp: data.whatsapp, visit_date: data.visitDate, people_count: data.peopleCount, bringing_children: data.bringingChildren, notes: data.notes || null, status: "new" }; }, { turnstileAction: "visitor" });
}
