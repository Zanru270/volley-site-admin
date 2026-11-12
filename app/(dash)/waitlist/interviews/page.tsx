import type { Metadata } from "next";
import { CalendarClock } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { appSupabase } from "@/lib/appSupabase";
import { getSetting } from "@/lib/settings";
import { Card, PageHeader } from "@/components/ui";
import { DEFAULT_INTERVIEW_SETTINGS, type InterviewSettings, type WaitlistEntry } from "@/lib/waitlist";
import InterviewsBoard from "./InterviewsBoard";

export const metadata: Metadata = { title: "Interviews" };

/* Everyone at "Interview" on the waitlist, with their interview's time if
   it has one (InterviewsBoard.tsx), from the Volley app's project. */
export default async function InterviewsPage() {
  const { supabase } = await requireAdmin();
  const app = appSupabase();
  const header = (
    <PageHeader
      icon={CalendarClock}
      title="Interviews"
      description="Who's coming in, when, where and with whom. Schedule one from here or from their application; they, their parent and the interviewers get the details and an “Add to calendar” invite."
    />
  );
  if (!app)
    return (
      <>
        {header}
        <Card title="Not connected yet">
          <p className="text-sm text-ink/70">Interviews come from the applications, kept in the Volley app&rsquo;s database. Connect it as the Applications page describes.</p>
        </Card>
      </>
    );
  // Those at Interview, and everyone else still waiting on a decision,
  // who can be scheduled straight from here.
  const [{ data, error }, settings] = await Promise.all([
    app
      .from("waitlist")
      .select("*")
      .in("status", ["new", "contacted", "interview", "offered"])
      .order("created_at", { ascending: false }),
    getSetting<InterviewSettings>(supabase, "interviews"),
  ]);
  return (
    <>
      {header}
      {error ? (
        <Card title="Couldn't load the interviews">
          <p className="text-sm text-ink/70">
            {/interview_at/.test(error.message)
              ? "The Volley app's database needs a one-off update first: Volley-App/supabase/migrations/026_waitlist_interview.sql, then 027_waitlist_interview_times.sql."
              : error.message}
          </p>
        </Card>
      ) : (
        <InterviewsBoard entries={(data ?? []) as WaitlistEntry[]} settings={settings ?? DEFAULT_INTERVIEW_SETTINGS} />
      )}
    </>
  );
}
