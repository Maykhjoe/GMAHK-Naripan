import { handleAdminImageUpload } from "@/lib/admin/image-upload";

export async function POST(request: Request) {
  return handleAdminImageUpload(request, {
    permission: "ministries.manage",
    usage: "ministry-thumbnail",
    label: "Gambar pelayanan",
  });
}
