import type { Metadata } from "next";
import { UserSearch } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { Card, PageHeader } from "@/components/ui";
import type { JobApplication } from "@/lib/careers";
import JobApplicationsList from "./JobApplicationsList";

export const metadata: Metadata = { title: "Job applications" };

/* Everyone who's applied for a job through the website's Careers page,
   newest first, with their CVs. `?job=` starts on one job's (from the Jobs
   page), `?open=` on one application. */
export default async function JobApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ job?: string; open?: string }>;
}) {
  const { job, open } = await searchParams;
  const { supabase } = await requireAdmin();
  const header = (
    <PageHeader
      icon={UserSearch}
      title="Job applications"
      description="Everyone who has applied through the website's Careers page. Open someone to see their details and CV; mark where they stand, invite them to an interview, make an offer or decline them."
    />
  );
  const [applications, jobs] = await Promise.all([
    supabase.from("job_applications").select("*").order("created_at", { ascending: false }).limit(2000),
    supabase.from("jobs").select("id, title").order("sort"),
  ]);
  const error = applications.error ?? jobs.error;
  if (error)
    return (
      <>
        {header}
        <Card title="Not set up yet">
          <p className="text-sm leading-relaxed text-ink/70">
            The careers tables aren&rsquo;t in the database yet. Run{" "}
            <code className="rounded bg-bone px-1">supabase/careers.sql</code> once, in Supabase &gt; SQL Editor, then
            reload. ({error.message})
          </p>
        </Card>
      </>
    );
  return (
    <>
      {header}
      <JobApplicationsList
        applications={applications.data as JobApplication[]}
        jobs={jobs.data ?? []}
        initialJob={job}
        initialOpen={open}
      />
    </>
  );
}
