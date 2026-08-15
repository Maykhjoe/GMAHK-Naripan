import "server-only";

import { revalidatePath } from "next/cache";

import { publicPathsForAdminMutation } from "@/lib/cache/public-content-paths";

export function revalidatePublicContent(section: string, record?: unknown) {
  for (const path of publicPathsForAdminMutation(section, record)) {
    revalidatePath(path);
  }
}
