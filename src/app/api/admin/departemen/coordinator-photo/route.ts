import { handleAdminImageUpload } from "@/lib/admin/image-upload";

export async function POST(request: Request) {
  return handleAdminImageUpload(request, {
    permission: "ministries.manage",
    usage: "ministry-coordinator-photo",
    label: "Foto koordinator",
    maxBytes: 5 * 1024 * 1024,
  });
}
