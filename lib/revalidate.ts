import "server-only";
import { revalidatePath } from "next/cache";
import type { CacheTag } from "@/lib/cache-tags";

/* Tells the public site that some content changed, so it drops its cached
   copy and the next visit reads the new version from Supabase. Called by
   every save, with the tag(s) of whatever the save touched.

   Returns false when the main site couldn't be reached. The save itself
   still worked; the site will catch up within the hour on its own. In
   local development LOCAL_SITE_URL is pinged too, best effort. */
export async function revalidateSite(...tags: CacheTag[]): Promise<boolean> {
  // The admin's own screens, kept a minute in the browser (staleTimes in
  // next.config.ts), are dropped too, so none shows what was there before.
  revalidatePath("/", "layout");
  const site = process.env.MAIN_SITE_URL;
  const secret = process.env.REVALIDATE_SECRET;
  if (!site || !secret) {
    console.warn("revalidateSite: MAIN_SITE_URL or REVALIDATE_SECRET not set");
    return false;
  }

  const ping = async (base: string, tag: CacheTag) => {
    const url = `${base.replace(/\/$/, "")}/api/revalidate?tag=${encodeURIComponent(tag)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}` },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`${res.status} from ${url}`);
  };

  const local = process.env.LOCAL_SITE_URL;
  if (local && local !== site) {
    await Promise.allSettled(tags.map((tag) => ping(local, tag)));
  }
  try {
    await Promise.all(tags.map((tag) => ping(site, tag)));
    return true;
  } catch (err) {
    console.error("revalidateSite:", (err as Error).message);
    return false;
  }
}
