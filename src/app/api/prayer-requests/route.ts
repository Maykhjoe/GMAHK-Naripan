import { handlePublicForm } from "@/lib/api/public-form";
import {
  prayerRequestSchema,
  type PrayerRequestInput,
} from "@/lib/validations/forms";

export async function POST(request: Request) {
  return handlePublicForm(
    request,
    prayerRequestSchema,
    "prayer_requests",
    (value) => {
      const data = value as PrayerRequestInput;

      return {
        name: data.anonymous ? null : data.name,
        is_anonymous: data.anonymous,
        whatsapp: data.whatsapp || null,
        email: data.email || null,
        category: data.category,
        request_text: data.request,
        sharing_scope: data.sharingScope,
        may_contact: data.mayContact,
        privacy_consent: data.privacyConsent,
        status: "unread",
      };
    },
    { turnstileAction: "prayer" },
  );
}
