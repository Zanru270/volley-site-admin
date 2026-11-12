import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { parseCroppedPath } from "@/lib/storage-utils";

/* The safety net under deleteUploads (lib/media-actions.ts): deletes every
   file in the media bucket that nothing saved mentions, once it's a day
   old. The editors delete their own unsaved uploads when they're left, but
   a closed tab or a reload never gets that far.

   The day is so it never takes a photo from a form someone still has open
   and hasn't saved yet. A cropped image's stored original counts as used
   whenever the image does. Any table it can't read stops it, rather than
   deleting what that table might use.

   Run after a save (saveLocation, saveHome, saveArticle), with after(), so
   the save doesn't wait for it. Server only, and only after requireAdmin(). */

// Every table whose rows can hold a photo's address.
const TABLES = ["settings", "faqs", "articles", "locations"];
const MIN_AGE_MS = 24 * 60 * 60 * 1000;

export async function sweepUnusedUploads(): Promise<void> {
  const db = createServiceClient();
  const bucket = db.storage.from("media");

  const files: { path: string; created: string | null }[] = [];
  const list = async (prefix: string) => {
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await bucket.list(prefix, { limit: 1000, offset });
      if (error) throw error;
      for (const item of data) {
        const path = prefix ? `${prefix}/${item.name}` : item.name;
        // A folder has no id.
        if (item.id === null) await list(path);
        else files.push({ path, created: item.created_at });
      }
      if (data.length < 1000) break;
    }
  };

  try {
    await list("");
    let saved = "";
    for (const table of TABLES) {
      const { data, error } = await db.from(table).select("*");
      if (error) throw error;
      saved += JSON.stringify(data);
    }
    // Addresses can be saved percent-encoded; a stray % is left as it is.
    saved = decodeURIComponent(saved.replace(/%(?![0-9A-Fa-f]{2})/g, "%25"));

    const used = new Set(files.filter((f) => saved.includes(f.path)).map((f) => f.path));
    for (const path of [...used]) {
      const cropped = parseCroppedPath(path);
      if (cropped) used.add(cropped.originalPath);
    }
    const cutoff = Date.now() - MIN_AGE_MS;
    const unused = files
      // No date, no telling how new it is: kept.
      .filter((f) => !used.has(f.path) && f.created !== null && Date.parse(f.created) < cutoff)
      .map((f) => f.path);
    if (!unused.length) return;
    const { error } = await bucket.remove(unused);
    if (error) throw error;
  } catch (error) {
    console.error("sweepUnusedUploads:", error instanceof Error ? error.message : error);
  }
}
