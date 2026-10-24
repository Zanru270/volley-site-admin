import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

// A value from the `settings` table, or null before it's been seeded.
export async function getSetting<T>(
  supabase: SupabaseClient,
  key: string,
): Promise<T | null> {
  const { data, error } = await supabase
    .from("settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  if (error) throw error;
  return (data?.value as T) ?? null;
}

/* Saves a setting. Selects the row back: Row Level Security turns a
   blocked write into "0 rows" rather than an error, so an empty result
   means it didn't save. */
export async function putSetting(
  supabase: SupabaseClient,
  key: string,
  value: unknown,
) {
  const { data, error } = await supabase
    .from("settings")
    .upsert({ key, value })
    .select("key");
  if (error) throw error;
  if (!data?.length) throw new Error("not allowed (0 rows saved)");
}
