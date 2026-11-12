"use server";

import { requireAdmin } from "@/lib/auth";
import { after } from "next/server";
import { revalidateSite } from "@/lib/revalidate";
import { sweepUnusedUploads } from "@/lib/media-sweep";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { failed, saved, type Result } from "@/lib/result";
import type { Article } from "@/lib/types";

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/* Adds or updates an article. Articles show newest first by `date`, so a
   new one goes wherever its date puts it. Returns the saved id. */
export async function saveArticle(
  input: Article,
): Promise<Result & { id?: string }> {
  const { supabase } = await requireAdmin();
  const article = {
    slug: input.slug.trim(),
    title: input.title.trim(),
    location: input.location.trim(),
    date: input.date && DATE.test(input.date) ? input.date : null,
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
      const { data, error } = await supabase.from("articles").insert(article).select("id").single();
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
    after(sweepUnusedUploads);
    const result = saved(await revalidateSite(CACHE_TAGS.ARTICLES));
    // A draft isn't on the site, whatever the site was told.
    if (!article.published) result.message = "Saved as a draft. It isn't on the website.";
    return { ...result, id };
  } catch (err) {
    const e = err as { code?: string };
    if (e.code === "23505")
      return { ok: false, message: "Another article already uses that URL." };
    if (e.code === "PGRST204")
      return {
        ok: false,
        message:
          "Couldn't save: the database needs a one-off update first. Ask whoever set up the admin to run supabase/reader-dates.sql.",
      };
    return failed(err);
  }
}

export async function deleteArticle(id: string): Promise<Result> {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("articles").delete().eq("id", id);
  if (error) return failed(error);
  return saved(await revalidateSite(CACHE_TAGS.ARTICLES));
}
