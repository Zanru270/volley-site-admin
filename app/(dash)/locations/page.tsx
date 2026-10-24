import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import type { Location } from "@/lib/types";
import { PageHeader } from "@/components/ui";
import NotSeeded from "@/components/NotSeeded";
import LocationList from "./LocationList";

export const metadata: Metadata = { title: "Locations" };

// Whole rows: the edit drawer opens on the list, with no page of its own.
export default async function LocationsPage() {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.from("locations").select("*").order("slug");
  if (error) throw error;
  if (data.length === 0)
    return (
      <>
        <PageHeader title="Locations" />
        <NotSeeded what="location" />
      </>
    );
  return <LocationList locations={data as (Location & { updated_at?: string })[]} />;
}
