import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { BLANK_ARTICLE, today } from "@/lib/articles";
import { createPreviewToken } from "@/lib/preview-token";
import type { Article } from "@/lib/types";
import ArticleLiveEditor from "../ArticleLiveEditor";

export const metadata: Metadata = { title: "Article" };

/* One Volley Reader article in its live, on-page editor
   (ArticleLiveEditor.tsx), as the Bow + Arc CMS edits a News & Views
   article. /articles/new starts a new one. */
export default async function ArticlePage({ params }: PageProps<"/articles/[id]">) {
  const { id } = await params;
  const { supabase, user } = await requireAdmin();
  // A new article is dated today; that can be changed.
  let article: Article = { ...BLANK_ARTICLE, date: today() };
  if (id !== "new") {
    const { data, error } = await supabase.from("articles").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    if (!data) notFound();
    article = data as Article;
  }
  return <ArticleLiveEditor key={id} initial={article} preview={createPreviewToken(user.id)} />;
}
