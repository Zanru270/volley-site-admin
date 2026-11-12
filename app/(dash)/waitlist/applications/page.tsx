import type { Metadata } from "next";
import { Inbox } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { appSupabase } from "@/lib/appSupabase";
import { Card, PageHeader } from "@/components/ui";
import { DEFAULT_INTERVIEW_SETTINGS, type InterviewSettings, type WaitlistEntry } from "@/lib/waitlist";
import { placements } from "@/lib/app/units";
import { getSetting } from "@/lib/settings";
import { getBuildings } from "@/lib/buildings";
import { buildingName } from "@/lib/site";
import type { Location, WaitlistForm } from "@/lib/types";
import { accountsOn } from "./actions";
import ApplicationsList from "./ApplicationsList";

export const metadata: Metadata = { title: "Applications" };

/* Everyone who's joined the waitlist through the website's "Apply now"
   form, read from the Volley app's project (lib/appSupabase.ts), newest
   first, so the filters count and switch without a reload. With the same
   controls as the Volley app's admin: a status for those still waiting,
   Accept (into a unit, which makes their account and emails them and
   their parent) and Decline (the sorry emails). */
export default async function ApplicationsPage({ searchParams }: { searchParams: Promise<{ open?: string }> }) {
  const { open } = await searchParams;
  const { supabase } = await requireAdmin();
  const app = appSupabase();
  const header = (
    <PageHeader
      icon={Inbox}
      title="Applications"
      description='Everyone who has joined the waitlist through "Apply now" on the website. Open someone to see all of it; invite them to an interview, accept or decline them, and they and their parent are emailed.'
    />
  );
  if (!app)
    return (
      <>
        {header}
        <Card title="Not connected yet">
          <p className="text-sm leading-relaxed text-ink/70">
            The applications are kept in the Volley app&rsquo;s database. Add its address and service role key to this
            admin&rsquo;s settings as <code className="rounded bg-bone px-1">VOLLEY_APP_SUPABASE_URL</code> and{" "}
            <code className="rounded bg-bone px-1">VOLLEY_APP_SUPABASE_SERVICE_ROLE_KEY</code> (Supabase &gt; the Volley
            app&rsquo;s project &gt; Project Settings &gt; API), then reload.
          </p>
        </Card>
      </>
    );

  const { data, error } = await app
    .from("waitlist")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(2000);
  const entries = (data ?? []) as WaitlistEntry[];
  // Where accepted people went: "Brooklyn, unit 114".
  const placed = entries.flatMap((e) => (e.apartment_id ? [e.apartment_id] : []));
  const where = error ? {} : await placements(placed).catch(() => ({}));
  // What Interview and Accept can offer: the website's buildings, and the
  // form's unit types.
  const [{ buildings }, form, interviews] = await Promise.all([
    getBuildings<Location>(supabase),
    getSetting<WaitlistForm>(supabase, "waitlist_form"),
    getSetting<InterviewSettings>(supabase, "interviews"),
  ]);
  return (
    <>
      {header}
      {error ? (
        <Card title="Couldn't load the applications">
          <p className="text-sm text-ink/70">{error.message}</p>
        </Card>
      ) : (
        <ApplicationsList
          entries={entries}
          placements={where}
          accounts={await accountsOn()}
          buildings={buildings.map((b) => buildingName(b).replace(/^Volley /, ""))}
          unitTypes={form?.unitTypes ?? []}
          interviews={interviews ?? DEFAULT_INTERVIEW_SETTINGS}
          initialOpen={open}
        />
      )}
    </>
  );
}
