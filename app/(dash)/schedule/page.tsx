import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { getSetting } from "@/lib/settings";
import { getBuildings } from "@/lib/buildings";
import { buildingName } from "@/lib/site";
import type { Location } from "@/lib/types";
import { viewingWindows, type SavedViewings } from "@/lib/types";
import { CalendarClock } from "lucide-react";
import { PageHeader } from "@/components/ui";
import NotSeeded from "@/components/NotSeeded";
import ScheduleEditor from "./ScheduleEditor";

export const metadata: Metadata = { title: "Viewing schedule" };

export default async function SchedulePage() {
  const { supabase } = await requireAdmin();
  const [viewings, { buildings }] = await Promise.all([
    getSetting<SavedViewings>(supabase, "viewings"),
    getBuildings<Location>(supabase),
  ]);
  // Each building's name as it reads now, renamed or not.
  // Each building, in the website's order, by the name it reads now.
  const houses = buildings.map((b) => ({ slug: b.slug, name: buildingName(b).replace(/^Volley /, "") }));
  return (
    <>
      <PageHeader
        icon={CalendarClock}
        title="Viewing schedule"
        description="When each building holds room viewings: the timetable on the Contact page, and the times people can pick in Book a Tour. All times are Pretoria time."
      />
      {viewings ? (
        <ScheduleEditor initial={viewingWindows(viewings)} houses={houses} />
      ) : (
        <NotSeeded what="viewing schedule" />
      )}
    </>
  );
}
