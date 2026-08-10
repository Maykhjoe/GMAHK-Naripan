import { handleAdminImageUpload } from "@/lib/admin/image-upload";

export async function POST(request: Request) {
  return handleAdminImageUpload(request, {
    permission: "sermons.manage",
    usage: "sermon-thumbnail",
    label: "Thumbnail",
  });
}
