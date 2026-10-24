"use server";

import { requireAdmin } from "@/lib/auth";
import { revalidateSite } from "@/lib/revalidate";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { failed, saved, type Result } from "@/lib/result";
import type { Location } from "@/lib/types";

const orNull = <T,>(v: T | "" | null | undefined) =>
  v === "" || v === undefined ? null : v;

export async function saveLocation(input: Location): Promise<Result> {
  const { supabase } = await requireAdmin();
  const paragraphs = (
    Array.isArray(input.description) ? input.description : [input.description ?? ""]
  )
    .map((p) => p.trim())
    .filter(Boolean);
  const stats = (input.stats ?? []).filter((s) => s.value.trim() || s.label.trim());
  const rooms = input.rooms && {
    intro: input.rooms.intro.trim(),
    paymentPlans: input.rooms.paymentPlans.filter((n) => Number.isInteger(n) && n > 0),
    types: input.rooms.types.map((t) => ({
      ...t,
      label: t.label.trim(),
      images: t.images.filter((img) => img.src.trim()),
      fee: t.fee === null || Number.isNaN(t.fee) ? null : t.fee,
    })),
  };
  if (rooms?.types.some((t) => !t.label))
    return { ok: false, message: "Every room type needs a name." };
  if (rooms && !rooms.paymentPlans.length)
    return { ok: false, message: "Add at least one payment plan (e.g. 12)." };

  const row = {
    address: orNull(input.address?.trim()),
    description: paragraphs.length ? paragraphs : null,
    pricelist: orNull(input.pricelist?.trim()),
    stats: stats.length ? stats : null,
    rooms: rooms && rooms.types.length ? rooms : null,
  };
  const { data, error } = await supabase
    .from("locations")
    .update(row)
    .eq("slug", input.slug)
    .select("slug");
  if (error) return failed(error);
  if (!data?.length) return { ok: false, message: "Couldn't save: not allowed (0 rows saved)." };
  return saved(await revalidateSite(CACHE_TAGS.LOCATIONS));
}
