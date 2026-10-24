import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { getSetting } from "@/lib/settings";
import type { Viewings } from "@/lib/types";
import { PageHeader } from "@/components/ui";
import NotSeeded from "@/components/NotSeeded";
import ScheduleEditor from "./ScheduleEditor";

export const metadata: Metadata = { title: "Viewing schedule" };

export default async function SchedulePage() {
  const { supabase } = await requireAdmin();
  const viewings = await getSetting<Viewings>(supabase, "viewings");
  return (
    <>
      <PageHeader
        title="Viewing schedule"
        description="When each residence holds room viewings. This is the timetable on the Contact page, and every time someone can pick in Book a Tour. All times are Pretoria time."
      />
      {viewings ? (
        <ScheduleEditor initial={viewings} />
      ) : (
        <NotSeeded what="viewing schedule" />
      )}
    </>
  );
}
