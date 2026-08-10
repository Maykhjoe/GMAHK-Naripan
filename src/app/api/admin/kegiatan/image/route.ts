import { handleAdminImageUpload } from "@/lib/admin/image-upload";

export async function POST(request: Request) {
  return handleAdminImageUpload(request, {
    permission: "events.manage",
    usage: "event-poster",
    label: "Poster",
  });
}
