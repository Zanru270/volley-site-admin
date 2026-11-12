import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { newestFirst } from "@/lib/articles";
import type { Article } from "@/lib/types";
import ArticleList from "./ArticleList";

export const metadata: Metadata = { title: "Volley Reader" };

// Every article, newest first; each opens in its own live editor.
export default async function ArticlesPage() {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.from("articles").select("*").order("sort");
  if (error) throw error;
  return <ArticleList initial={newestFirst(data as Article[])} />;
}
