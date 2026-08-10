import { handleAdminImageUpload } from "@/lib/admin/image-upload";

export async function POST(request: Request) {
  return handleAdminImageUpload(request, {
    permission: "livestreams.manage",
    usage: "livestream-thumbnail",
    label: "Thumbnail",
  });
}
