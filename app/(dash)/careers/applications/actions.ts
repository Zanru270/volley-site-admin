"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { failed, type Result } from "@/lib/result";
import { APPLICATION_STATUSES, CAREER_EMAILS_LIVE, statusLabel, type ApplicationStatus } from "@/lib/careers";

/* The Job applications page's saves. Applications aren't on the website,
   so nothing here pings it; the admin's own pages are refreshed. */

const STATUSES = APPLICATION_STATUSES.map((s) => s.value) as string[];

async function update(id: string, patch: Record<string, unknown>): Promise<Result | null> {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.from("job_applications").update(patch).eq("id", id).select("id");
  if (error) return failed(error);
  if (!data.length) return { ok: false, message: "That application isn't there any more." };
  revalidatePath("/careers", "layout");
  return null;
}

// A mark for the team (New, Reviewing, Hired, Closed): no email.
export async function setApplicationStatus(id: string, status: string): Promise<Result> {
  if (!STATUSES.includes(status)) return { ok: false, message: "That isn't a status." };
  return (await update(id, { status })) ?? { ok: true, message: `Marked ${statusLabel(status).toLowerCase()}.` };
}

/* Interview, Offer and Decline: the status, and for Interview its time.
   Each comes with an email to the applicant (careerEmail in
   lib/careers.ts). Mailing isn't set up yet, so for now only the status
   changes, and the message says the email didn't go. Once it is, the
   email is sent here first, and its time recorded in `emailed`. */
export async function decideApplication(
  id: string,
  kind: "interview" | "offer" | "decline",
  extra: { interviewAt?: string } = {},
): Promise<Result> {
  const status: ApplicationStatus = kind === "interview" ? "interview" : kind === "offer" ? "offered" : "declined";
  const patch: Record<string, unknown> = { status };
  if (kind === "interview") {
    const at = extra.interviewAt ? new Date(extra.interviewAt) : null;
    if (at && Number.isNaN(at.getTime())) return { ok: false, message: "Check the interview's date and time." };
    patch.interview_at = at?.toISOString() ?? null;
  }
  const failure = await update(id, patch);
  if (failure) return failure;
  return {
    ok: true,
    message: CAREER_EMAILS_LIVE
      ? `Marked ${statusLabel(status).toLowerCase()} and emailed.`
      : `Marked ${statusLabel(status).toLowerCase()}. No email went: mailing isn't set up yet.`,
  };
}

// The team's notes on someone, private to the admin.
export async function saveApplicationNotes(id: string, notes: string): Promise<Result> {
  return (await update(id, { notes: String(notes ?? "").slice(0, 6000) })) ?? { ok: true, message: "Notes saved." };
}

// Deletes an application and its CV, for good.
export async function deleteApplication(id: string): Promise<Result> {
  const { supabase } = await requireAdmin();
  try {
    const { data, error } = await supabase.from("job_applications").delete().eq("id", id).select("cv_path");
    if (error) throw error;
    if (!data.length) return { ok: false, message: "That application isn't there any more." };
    const path = data[0].cv_path;
    if (path) await supabase.storage.from("cvs").remove([path]);
  } catch (err) {
    return failed(err);
  }
  revalidatePath("/careers", "layout");
  return { ok: true, message: "Application and CV deleted." };
}
