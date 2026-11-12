"use server";

import { requireAdmin } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { getStoragePathFromUrl, withCropCompanions } from "@/lib/storage-utils";

/* Deletes uploaded photos from the media bucket, with the original kept
   beside any that was cropped: ones replaced by a save, and ones uploaded
   in a form then never saved. Only files in the bucket are touched; the
   website's own files (paths like /images/x.webp) are skipped. Best effort:
   a file that can't be removed is only logged, as nothing on the site uses
   it any more.

   Done with the service role key, once the caller is known to be an admin:
   Storage only deletes files the caller's own login may also read, and an
   admin's login has rules to upload and delete, not to read, so with it
   the delete would report success and remove nothing. */
export async function deleteUploads(urls: string[]): Promise<void> {
  await requireAdmin();
  const paths = [...new Set(urls.map((url) => getStoragePathFromUrl(url, "media")).filter((p): p is string => !!p))];
  if (!paths.length) return;
  const { error } = await createServiceClient().storage.from("media").remove(withCropCompanions(paths));
  if (error) console.error("deleteUploads:", error.message);
}
