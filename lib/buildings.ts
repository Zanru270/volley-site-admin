import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/* The buildings (the `locations` table), in the order the website shows
   them: by `sort`, then by slug for any not yet placed. `sortable` is false
   while the database is still missing its `sort` column (supabase/
   schema.sql adds it); they then come by slug, and can't be reordered. */
export async function getBuildings<T>(
  supabase: SupabaseClient,
  columns = "*",
): Promise<{ buildings: T[]; sortable: boolean }> {
  const sorted = await supabase
    .from("locations")
    .select(columns)
    .order("sort", { ascending: true, nullsFirst: false })
    .order("slug");
  if (!sorted.error) return { buildings: sorted.data as T[], sortable: true };
  if (sorted.error.code !== "42703") throw sorted.error;
  const plain = await supabase.from("locations").select(columns).order("slug");
  if (plain.error) throw plain.error;
  return { buildings: plain.data as T[], sortable: false };
}
