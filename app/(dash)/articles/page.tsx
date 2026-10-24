import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import type { Article } from "@/lib/types";
import ArticleList from "./ArticleList";

export const metadata: Metadata = { title: "Volley Reader" };

// Whole rows: the edit drawer opens on the list, with no page of its own.
export default async function ArticlesPage() {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.from("articles").select("*").order("sort");
  if (error) throw error;
  return <ArticleList initial={data as Article[]} />;
}
