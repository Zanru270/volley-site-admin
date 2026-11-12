import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Building2 } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { getBuildings } from "@/lib/buildings";
import type { Location } from "@/lib/types";
import { PageHeader } from "@/components/ui";
import NotSeeded from "@/components/NotSeeded";
import BuildingList from "./BuildingList";

export const metadata: Metadata = { title: "Buildings" };

/* Whole rows, in the website's order. Each building opens in its own live
   editor; /buildings?edit=roper, from older links, goes straight there. */
export default async function BuildingsPage({ searchParams }: PageProps<"/buildings">) {
  const { edit } = await searchParams;
  if (typeof edit === "string" && /^[a-z0-9-]+$/.test(edit)) redirect(`/buildings/${edit}`);
  const { supabase } = await requireAdmin();
  const { buildings, sortable } = await getBuildings<Location & { updated_at?: string }>(supabase);
  if (buildings.length === 0)
    return (
      <>
        <PageHeader icon={Building2} title="Buildings" />
        <NotSeeded what="buildings list" />
      </>
    );
  return (
    <BuildingList
      buildings={buildings}
      sortable={sortable}
    />
  );
}
