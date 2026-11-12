"use server";

import { requireAdmin } from "@/lib/auth";
import { revalidateSite } from "@/lib/revalidate";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { failed, saved, type Result } from "@/lib/result";
import type { FaqRow } from "@/lib/types";

/* Saves the whole list in one go, in the order given: updates and adds
   every row, then deletes any row that's no longer in the list. */
export async function saveFaqs(input: FaqRow[]): Promise<Result> {
  const { supabase } = await requireAdmin();
  const rows = input.map((row, sort) => ({
    id: row.id,
    tab: row.tab === "boring" ? "boring" : "cool",
    category: row.category.trim(),
    question: row.question.trim(),
    answer: row.answer.trim(),
    list: row.list.map((s) => s.trim()).filter(Boolean),
    sort,
  }));
  const blank = rows.findIndex((r) => !r.category || !r.question);
  if (blank >= 0)
    return {
      ok: false,
      message: `Question ${blank + 1} needs a category and a question.`,
    };

  try {
    if (rows.length) {
      const { data, error } = await supabase.from("faqs").upsert(rows).select("id");
      if (error) throw error;
      if (data.length !== rows.length) throw new Error("not allowed (rows not saved)");
    }
    let remove = supabase.from("faqs").delete();
    remove = rows.length
      ? remove.not("id", "in", `(${rows.map((r) => r.id).join(",")})`)
      : remove.not("id", "is", null);
    const { error } = await remove;
    if (error) throw error;
  } catch (err) {
    return failed(err);
  }
  return saved(await revalidateSite(CACHE_TAGS.FAQS));
}
