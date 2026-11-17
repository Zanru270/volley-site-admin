"use server";

import { requireAdmin } from "@/lib/auth";
import { revalidateSite } from "@/lib/revalidate";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { failed, saved, type Result } from "@/lib/result";
import type { Job } from "@/lib/careers";

/* The Jobs page's saves. Each is live on the website's /careers page once
   it's done (CACHE_TAGS.CAREERS). */

const text = (v: unknown, max = 200) => String(v ?? "").trim().slice(0, max);

// A job's fields as they're saved: trimmed and capped.
const fields = (j: Job) => ({
  title: text(j.title),
  department: text(j.department),
  location: text(j.location),
  job_type: text(j.job_type),
  qualifications: text(j.qualifications),
  experience: text(j.experience),
  salary: text(j.salary),
  summary: text(j.summary, 400),
  description: text(j.description, 6000),
  duties: text(j.duties, 6000),
  open: Boolean(j.open),
});

// Saves a job from the drawer: a new one (no id) goes to the end of the list.
export async function saveJob(input: Job): Promise<Result> {
  const { supabase } = await requireAdmin();
  const job = fields(input);
  if (!job.title) return { ok: false, message: "The job needs a title." };
  try {
    if (input.id) {
      const { data, error } = await supabase.from("jobs").update(job).eq("id", input.id).select("id");
      if (error) throw error;
      if (!data.length) return { ok: false, message: "That job isn't there any more." };
    } else {
      const { data: last } = await supabase.from("jobs").select("sort").order("sort", { ascending: false }).limit(1);
      const { error } = await supabase
        .from("jobs")
        .insert({ ...job, sort: (last?.[0]?.sort ?? -1) + 1 })
        .select("id");
      if (error) throw error;
    }
  } catch (err) {
    return missingTable(err) ?? failed(err);
  }
  return saved(await revalidateSite(CACHE_TAGS.CAREERS));
}

// Opens or closes a job: closed, it's off the website but kept here.
export async function setJobOpen(id: string, open: boolean): Promise<Result> {
  const { supabase } = await requireAdmin();
  try {
    const { data, error } = await supabase.from("jobs").update({ open }).eq("id", id).select("id");
    if (error) throw error;
    if (!data.length) throw new Error("not allowed (0 rows saved)");
  } catch (err) {
    return failed(err);
  }
  return saved(await revalidateSite(CACHE_TAGS.CAREERS));
}

// The jobs in their new order, by id, first to last.
export async function saveJobOrder(ids: string[]): Promise<Result> {
  const { supabase } = await requireAdmin();
  try {
    for (const [sort, id] of ids.entries()) {
      const { data, error } = await supabase.from("jobs").update({ sort }).eq("id", id).select("id");
      if (error) throw error;
      if (!data.length) throw new Error("not allowed (0 rows saved)");
    }
  } catch (err) {
    return failed(err);
  }
  return saved(await revalidateSite(CACHE_TAGS.CAREERS));
}

/* Deletes a job. Its applications stay, under the title they applied
   for (the table keeps it), on the Job applications page. */
export async function deleteJob(id: string): Promise<Result> {
  const { supabase } = await requireAdmin();
  try {
    const { data, error } = await supabase.from("jobs").delete().eq("id", id).select("id");
    if (error) throw error;
    if (!data.length) throw new Error("not allowed (0 rows deleted)");
  } catch (err) {
    return failed(err);
  }
  await revalidateSite(CACHE_TAGS.CAREERS);
  return { ok: true, message: "Deleted. Its applications are still under Job applications." };
}

// Before supabase/careers.sql has been run: say so, plainly.
function missingTable(err: unknown): Result | null {
  const code = (err as { code?: string })?.code;
  return code === "42P01" || code === "PGRST205"
    ? { ok: false, message: "Couldn't save: the careers tables aren't set up yet. Run supabase/careers.sql once, in Supabase's SQL editor." }
    : null;
}
