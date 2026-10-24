import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import type { FaqRow } from "@/lib/types";
import FaqEditor from "./FaqEditor";

export const metadata: Metadata = { title: "FAQs" };

export default async function FaqsPage() {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("faqs")
    .select("id, tab, category, question, answer, list")
    .order("sort");
  if (error) throw error;
  return <FaqEditor initial={data as FaqRow[]} />;
}
