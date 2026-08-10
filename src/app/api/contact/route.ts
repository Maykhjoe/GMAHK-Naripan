import { handlePublicForm } from "@/lib/api/public-form";
import {
  normalizeEmail,
  normalizePhone,
  normalizePlainText,
} from "@/lib/security/normalize";
import { contactSchema, type ContactInput } from "@/lib/validations/forms";

export async function POST(request: Request) {
  return handlePublicForm(
    request,
    contactSchema,
    "contact_messages",
    (value) => {
      const data = value as ContactInput;
      return {
        name: normalizePlainText(data.name),
        email: normalizeEmail(data.email),
        phone: normalizePhone(data.phone),
        subject: normalizePlainText(data.subject),
        message: normalizePlainText(data.message),
        consent_at: new Date().toISOString(),
        status: "unread",
      };
    },
    { turnstileAction: "contact", limit: 5, windowMs: 10 * 60_000 },
  );
}
