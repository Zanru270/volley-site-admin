import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { isKind, newestFirst } from "@/lib/articles";
import type { Article } from "@/lib/types";
import ArticleList from "./ArticleList";

export const metadata: Metadata = { title: "Articles" };

/* Every article, newest first, under two tabs (the Volley Reader and Goings
   on); each opens in its own live editor. ?tab=goings-on opens on that tab,
   as the editor's way back does. */
export default async function ArticlesPage({ searchParams }: PageProps<"/articles">) {
  const { tab } = await searchParams;
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.from("articles").select("*").order("sort");
  if (error) throw error;
  return <ArticleList initial={newestFirst(data as Article[])} tab={isKind(tab) ? tab : "reader"} />;
}
