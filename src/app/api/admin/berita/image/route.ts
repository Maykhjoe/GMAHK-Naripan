import { handleAdminImageUpload } from "@/lib/admin/image-upload";

export async function POST(request: Request) {
  return handleAdminImageUpload(request, {
    permission: "posts.manage",
    usage: "post-featured-image",
    label: "Gambar",
  });
}
