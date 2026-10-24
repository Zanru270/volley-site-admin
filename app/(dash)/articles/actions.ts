"use server";

import { requireAdmin } from "@/lib/auth";
import { revalidateSite } from "@/lib/revalidate";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { failed, saved, type Result } from "@/lib/result";
import type { Article } from "@/lib/types";

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/* Adds or updates an article. A new one (id "new") goes to the front of
   the carousel. Returns the saved id. */
export async function saveArticle(
  input: Article,
): Promise<Result & { id?: string }> {
  const { supabase } = await requireAdmin();
  const article = {
    slug: input.slug.trim(),
    title: input.title.trim(),
    location: input.location.trim(),
    meta: input.meta.trim(),
    category: input.category.trim(),
    excerpt: input.excerpt.trim(),
    image: input.image.trim(),
    hero: input.hero.trim(),
    aspect: input.aspect.trim(),
    body: input.body,
    published: Boolean(input.published),
  };
  if (!article.title) return { ok: false, message: "Give the article a title." };
  if (!SLUG.test(article.slug))
    return {
      ok: false,
      message: "The URL may only use lowercase letters, numbers and single dashes.",
    };
  if (article.published && !article.image)
    return { ok: false, message: "A published article needs a card photo." };

  try {
    let id = input.id;
    if (id === "new") {
      const { data: first } = await supabase
        .from("articles")
        .select("sort")
        .order("sort")
        .limit(1)
        .maybeSingle();
      const { data, error } = await supabase
        .from("articles")
        .insert({ ...article, sort: (first?.sort ?? 0) - 1 })
        .select("id")
        .single();
      if (error) throw error;
      id = data.id;
    } else {
      const { data, error } = await supabase
        .from("articles")
        .update(article)
        .eq("id", id)
        .select("id");
      if (error) throw error;
      if (!data.length) throw new Error("not allowed (0 rows saved)");
    }
    return { ...saved(await revalidateSite(CACHE_TAGS.ARTICLES)), id };
  } catch (err) {
    const e = err as { code?: string };
    if (e.code === "23505")
      return { ok: false, message: "Another article already uses that URL." };
    return failed(err);
  }
}

export async function deleteArticle(id: string): Promise<Result> {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("articles").delete().eq("id", id);
  if (error) return failed(error);
  return saved(await revalidateSite(CACHE_TAGS.ARTICLES));
}

// Saves the carousel order: `ids` front to back.
export async function reorderArticles(ids: string[]): Promise<Result> {
  const { supabase } = await requireAdmin();
  try {
    for (const [sort, id] of ids.entries()) {
      const { error } = await supabase.from("articles").update({ sort }).eq("id", id);
      if (error) throw error;
    }
  } catch (err) {
    return failed(err);
  }
  return saved(await revalidateSite(CACHE_TAGS.ARTICLES));
}
