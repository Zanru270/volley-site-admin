"use server";

import { requireAdmin } from "@/lib/auth";
import { putSetting } from "@/lib/settings";
import { revalidateSite } from "@/lib/revalidate";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { failed, saved, type Result } from "@/lib/result";
import type { Banner } from "@/lib/types";

export async function saveBanner(input: Banner): Promise<Result> {
  const { supabase } = await requireAdmin();
  const banner: Banner = {
    enabled: Boolean(input.enabled),
    text: String(input.text ?? ""),
    linkText: String(input.linkText ?? ""),
    linkHref: String(input.linkHref ?? "").trim(),
    after: String(input.after ?? ""),
  };
  if (banner.linkText && !banner.linkHref)
    return { ok: false, message: "Add a link for the link text, or clear it." };
  try {
    await putSetting(supabase, "banner", banner);
  } catch (err) {
    return failed(err);
  }
  return saved(await revalidateSite(CACHE_TAGS.BANNER));
}
