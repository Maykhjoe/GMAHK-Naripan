import { handleAdminImageUpload } from "@/lib/admin/image-upload";

export async function POST(request: Request) {
  return handleAdminImageUpload(request, {
    permission: "leaders.manage",
    usage: "leader-photo",
    label: "Foto pengurus",
  });
}
