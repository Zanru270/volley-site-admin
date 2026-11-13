"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { getSetting, putSetting } from "@/lib/settings";
import { appSupabase } from "@/lib/appSupabase";
import { failed, type Result } from "@/lib/result";
import { mailConfigured, sendMail } from "@/lib/app/mailgun";
import { googleLink, ics, outlookLink, whenText, type CalendarEvent } from "@/lib/app/calendar";
import { interviewTimeParent, interviewTimeStudent, interviewTimeTeam, type InterviewMail } from "@/lib/app/emails";
import {
  DEFAULT_INTERVIEW_SETTINGS,
  INTERVIEW_LENGTHS,
  UNDECIDED,
  type InterviewPlan,
  type InterviewSettings,
  type WaitlistEntry,
} from "@/lib/waitlist";

/* Interviews: who runs them and where (the CMS's "interviews" setting),
   and each application's interview time, kept with the application in
   the Volley app's project (Volley-App migration 027).

   Scheduling, moving or cancelling one can email the student, their parent
   and each interviewer who has an email, with "Add to calendar" links and
   the invite attached; the same event id each time, so a moved or
   cancelled interview updates the one already in their calendars. */

export async function getInterviewSettings(): Promise<InterviewSettings> {
  const { supabase } = await requireAdmin();
  return (await getSetting<InterviewSettings>(supabase, "interviews")) ?? DEFAULT_INTERVIEW_SETTINGS;
}

export async function saveInterviewSettings(input: InterviewSettings): Promise<Result> {
  const { supabase } = await requireAdmin();
  const interviewers = input.interviewers
    .map((i) => ({ name: i.name.trim(), email: i.email.trim() }))
    .filter((i) => i.name);
  if (interviewers.some((i) => i.email && !/^\S+@\S+\.\S+$/.test(i.email)))
    return { ok: false, message: "One of the interviewers' emails doesn't look right." };
  const places = [...new Set(input.places.map((p) => p.trim()).filter(Boolean))];
  try {
    await putSetting(supabase, "interviews", { interviewers, places });
  } catch (err) {
    return failed(err);
  }
  // Applications offers these too; its kept copy is dropped.
  revalidatePath("/", "layout");
  return { ok: true, message: "Saved." };
}

async function load(id: string) {
  const { supabase } = await requireAdmin();
  const db = appSupabase();
  if (!db) throw new Error("The Volley app isn't connected.");
  const { data, error } = await db.from("waitlist").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  const settings = (await getSetting<InterviewSettings>(supabase, "interviews")) ?? DEFAULT_INTERVIEW_SETTINGS;
  return { db, entry: data as WaitlistEntry | null, settings };
}

// What's wrong with a plan, as a message, or null.
function checkPlan(plan: InterviewPlan): string | null {
  const start = new Date(plan.at);
  if (Number.isNaN(start.getTime())) return "Pick a date and time.";
  if (!INTERVIEW_LENGTHS.includes(plan.minutes)) return "Pick how long it runs.";
  if (plan.mode === "in_person" && !plan.place.trim()) return "Say where it is.";
  if (plan.mode === "online" && !/^https?:\/\/\S+$/.test(plan.link.trim()))
    return "Add the meeting link, starting with https://.";
  if (!plan.with.length) return "Pick who's interviewing.";
  return null;
}

// The interview as its emails and calendar invite describe it.
function describe(entry: WaitlistEntry, plan: InterviewPlan, kind: InterviewMail["kind"]) {
  const start = new Date(plan.at);
  const where = plan.mode === "online" ? "Online" : plan.place.trim();
  const event: CalendarEvent = {
    uid: `interview-${entry.id}@volley`,
    // Higher each time, so calendars take the newest.
    sequence: Math.floor(Date.now() / 1000),
    start,
    minutes: plan.minutes,
    title: `Volley ${entry.house} interview: ${entry.name} ${entry.surname}`.trim(),
    location: plan.mode === "online" ? plan.link.trim() : where,
    description: [
      `Interview for Volley ${entry.house}.`,
      plan.with.length ? `With ${plan.with.join(", ")}.` : "",
      plan.mode === "online" ? `Join: ${plan.link.trim()}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
    cancelled: kind === "cancelled",
  };
  const mail: InterviewMail = {
    kind,
    building: entry.house,
    when: whenText(start, plan.minutes),
    where,
    link: plan.mode === "online" ? plan.link.trim() : "",
    with: plan.with,
    google: googleLink(event),
    outlook: outlookLink(event),
  };
  return { event, mail };
}

// The interview as it's saved on an application, or null.
const savedPlan = (e: WaitlistEntry): InterviewPlan | null =>
  e.interview_at
    ? {
        at: e.interview_at,
        minutes: e.interview_minutes ?? 30,
        mode: e.interview_mode ?? "in_person",
        place: e.interview_place ?? "",
        link: e.interview_link ?? "",
        with: e.interview_with ?? [],
      }
    : null;

/* Sends an interview's emails: the student (with `note`), their parent,
   and each interviewer with an email, each with the invite attached. The
   student's must go; the rest only warn. */
async function sendInterviewMails(entry: WaitlistEntry, plan: InterviewPlan, kind: InterviewMail["kind"], settings: InterviewSettings, note: string) {
  const { event, mail } = describe(entry, plan, kind);
  const organiser = process.env.MAILGUN_REPLY_TO || process.env.WAITLIST_NOTIFY_EMAIL || "noreply@volley.co.za";
  const attachment = { filename: "interview.ics", content: ics(event, organiser), contentType: "text/calendar; charset=utf-8" };
  await sendMail({ to: entry.email, ...interviewTimeStudent(entry.name, mail, note), attachment });

  const warnings: string[] = [];
  const tryMail = async (to: string, message: { subject: string; html: string; text: string }) => {
    try {
      await sendMail({ to, ...message, attachment });
    } catch (err) {
      warnings.push(`${to} (${(err as Error).message})`);
    }
  };
  if (entry.parent_email.trim()) await tryMail(entry.parent_email, interviewTimeParent(entry.parent_name, entry.name, mail));
  for (const name of plan.with) {
    const email = settings.interviewers.find((i) => i.name === name)?.email;
    if (email) await tryMail(email, interviewTimeTeam(name, entry, mail));
  }
  return warnings.length ? ` These emails didn't send: ${warnings.join("; ")}.` : "";
}

/* Schedules (or moves) someone's interview to `plan`, marks them
   "Interview" if they weren't yet, and with `email`, tells everyone. */
export async function scheduleInterview(id: string, plan: InterviewPlan, options: { email: boolean; note?: string }): Promise<Result> {
  const problem = checkPlan(plan);
  if (problem) return { ok: false, message: problem };
  if (options.email && !mailConfigured())
    return { ok: false, message: "Email isn't set up yet: add MAILGUN_API_KEY and MAILGUN_DOMAIN, or untick “Email them”." };
  try {
    const { db, entry, settings } = await load(id);
    if (!entry) return { ok: false, message: "Application not found." };
    if (!UNDECIDED.includes(entry.status)) return { ok: false, message: "This person has already been accepted or declined." };
    const before = savedPlan(entry);
    const kind = before ? "moved" : "scheduled";

    const { error } = await db
      .from("waitlist")
      .update({
        status: "interview",
        interview_at: new Date(plan.at).toISOString(),
        interview_minutes: plan.minutes,
        interview_mode: plan.mode,
        interview_place: plan.mode === "in_person" ? plan.place.trim() : "",
        interview_link: plan.mode === "online" ? plan.link.trim() : "",
        interview_with: plan.with,
      })
      .eq("id", id);
    if (error) {
      if (error.code === "PGRST204" || /column .*interview_/i.test(error.message))
        return {
          ok: false,
          message: "The Volley app's database needs a one-off update first: Volley-App/supabase/migrations/027_waitlist_interview_times.sql.",
        };
      if (/check constraint/i.test(error.message))
        return { ok: false, message: "The Volley app's database needs a one-off update first: Volley-App/supabase/migrations/026_waitlist_interview.sql." };
      throw error;
    }
    const warnings = options.email ? await sendInterviewMails(entry, plan, kind, settings, options.note ?? "") : "";
    const { mail } = describe(entry, plan, kind);
    return {
      ok: true,
      message: `${entry.name}'s interview is ${kind === "moved" ? "moved to" : "set for"} ${mail.when}.${options.email ? " Everyone's been emailed." : ""}${warnings}`,
    };
  } catch (err) {
    return failed(err);
  }
}

// Cancels someone's interview (they stay at "Interview"), telling everyone with `email`.
export async function cancelInterview(id: string, options: { email: boolean }): Promise<Result> {
  if (options.email && !mailConfigured()) return { ok: false, message: "Email isn't set up yet: add MAILGUN_API_KEY and MAILGUN_DOMAIN." };
  try {
    const { db, entry, settings } = await load(id);
    if (!entry) return { ok: false, message: "Application not found." };
    const plan = savedPlan(entry);
    if (!plan) return { ok: false, message: "There's no interview to cancel." };
    const { error } = await db.from("waitlist").update({ interview_at: null }).eq("id", id);
    if (error) throw error;
    const warnings = options.email ? await sendInterviewMails(entry, plan, "cancelled", settings, "") : "";
    return { ok: true, message: `${entry.name}'s interview is cancelled.${options.email ? " Everyone's been emailed." : ""}${warnings}` };
  } catch (err) {
    return failed(err);
  }
}

// The student's email for `plan`, as text, for the window to show before it goes.
export async function previewInterviewEmail(
  id: string,
  plan: InterviewPlan,
  note: string,
): Promise<{ ok: true; to: string; subject: string; text: string } | { ok: false; message: string }> {
  if (checkPlan(plan)) return { ok: false, message: checkPlan(plan)! };
  try {
    const { entry } = await load(id);
    if (!entry) return { ok: false, message: "Application not found." };
    const { mail } = describe(entry, plan, entry.interview_at ? "moved" : "scheduled");
    const email = interviewTimeStudent(entry.name, mail, note);
    return { ok: true, to: entry.email, subject: email.subject, text: email.text };
  } catch (err) {
    return failed(err) as { ok: false; message: string };
  }
}
