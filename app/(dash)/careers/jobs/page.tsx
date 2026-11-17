import type { Metadata } from "next";
import { Briefcase } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { Card, PageHeader } from "@/components/ui";
import type { Job } from "@/lib/careers";
import JobsEditor from "./JobsEditor";

export const metadata: Metadata = { title: "Jobs" };

const DESCRIPTION =
  "The openings on the website's Careers page, in the order it shows them. Add one, edit it, close it when it's filled (it leaves the website but stays here), or drag them into a new order.";

/* The jobs on /careers, with how many applications each has had. */
export default async function JobsPage() {
  const { supabase } = await requireAdmin();
  const [jobs, applications] = await Promise.all([
    supabase.from("jobs").select("*").order("sort"),
    supabase.from("job_applications").select("job_id, status"),
  ]);

  if (jobs.error)
    return (
      <>
        <PageHeader icon={Briefcase} title="Jobs" description={DESCRIPTION} />
        <Card title="Not set up yet">
          <p className="text-sm leading-relaxed text-ink/70">
            The careers tables aren&rsquo;t in the database yet. Run{" "}
            <code className="rounded bg-bone px-1">supabase/careers.sql</code> once, in Supabase &gt; SQL Editor, then
            reload. ({jobs.error.message})
          </p>
        </Card>
      </>
    );

  // Each job's applications: all of them, and those not looked at yet.
  const counts: Record<string, { all: number; fresh: number }> = {};
  for (const a of applications.data ?? []) {
    if (!a.job_id) continue;
    const c = (counts[a.job_id] ??= { all: 0, fresh: 0 });
    c.all++;
    if (a.status === "new") c.fresh++;
  }

  return <JobsEditor jobs={jobs.data as Job[]} counts={counts} description={DESCRIPTION} />;
}
