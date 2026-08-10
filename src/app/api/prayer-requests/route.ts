import { handlePublicForm } from "@/lib/api/public-form";
import {
  normalizeEmail,
  normalizePhone,
  normalizePlainText,
} from "@/lib/security/normalize";
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
        name: data.anonymous ? null : normalizePlainText(data.name),
        is_anonymous: data.anonymous,
        whatsapp: normalizePhone(data.whatsapp),
        email: normalizeEmail(data.email),
        category: data.category,
        request_text: normalizePlainText(data.request),
        sharing_scope: data.sharingScope,
        may_contact: data.mayContact,
        privacy_consent: data.privacyConsent,
        status: "unread",
      };
    },
    { turnstileAction: "prayer", limit: 4, windowMs: 10 * 60_000 },
  );
}
