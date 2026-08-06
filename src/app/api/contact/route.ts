import { contactSchema, type ContactInput } from "@/lib/validations/forms";
import { handlePublicForm } from "@/lib/api/public-form";

export async function POST(request: Request) {
  return handlePublicForm(request, contactSchema, "contact_messages", (value) => { const data = value as ContactInput; return { name: data.name, email: data.email, phone: data.phone || null, subject: data.subject, message: data.message, status: "unread" }; }, { turnstileAction: "contact" });
}
