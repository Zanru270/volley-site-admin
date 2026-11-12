import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createPreviewToken } from "@/lib/preview-token";
import type { Location } from "@/lib/types";
import { includedLists } from "@/lib/included";
import BuildingLiveEditor from "../BuildingLiveEditor";

/* The icons a "What's included" item can have: the files in the site's
   public/icons/included, as it lists them. None if it can't be reached. */
async function includedIcons(): Promise<string[]> {
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
  if (!site) return [];
  try {
    const res = await fetch(`${site}/api/included-icons`, { cache: "no-store" });
    const { icons } = await res.json();
    return Array.isArray(icons) ? icons.filter((i): i is string => typeof i === "string") : [];
  } catch {
    return [];
  }
}

export const metadata: Metadata = { title: "Building" };

/* One building in its live, on-page editor (BuildingLiveEditor.tsx), as the
   Bow + Arc CMS edits a project. */
export default async function BuildingPage({ params }: PageProps<"/buildings/[slug]">) {
  const { slug } = await params;
  const { supabase, user } = await requireAdmin();
  const [{ data, error }, icons] = await Promise.all([
    supabase.from("locations").select("*").eq("slug", slug).maybeSingle(),
    includedIcons(),
  ]);
  if (error) throw error;
  if (!data) notFound();
  return <BuildingLiveEditor key={slug} initial={{ ...(data as Location), ...("included" in data ? { included: includedLists(data.included) } : {}) }} icons={icons} preview={createPreviewToken(user.id)} />;
}
