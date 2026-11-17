"use client";

import { useOptimistic, useState, type FormEvent } from "react";
import Link from "next/link";
import { Briefcase, Edit2, Plus, Trash2, UserSearch } from "lucide-react";
import { Badge, button, CountPill, Field, iconButton, iconButtonDanger, inputClass, PageHeader, textareaClass, Toggle, Toolbar } from "@/components/ui";
import EditModal from "@/components/EditModal";
import Sortable from "@/components/Sortable";
import { RowControls, useAction } from "@/components/forms";
import { useConfirm } from "@/components/ConfirmProvider";
import { BLANK_JOB, type Job } from "@/lib/careers";
import { deleteJob, saveJob, saveJobOrder, setJobOpen } from "./actions";

type Counts = Record<string, { all: number; fresh: number }>;

/* The jobs, as the website's Careers page lists them: a row each, in its
   order (drag by the grip, or the arrows), with its Open switch, how many
   have applied, and Edit and Delete. Each of those saves at once, as the
   admin's lists do; a job's details are edited in the drawer, which saves
   on Save. */
export default function JobsEditor({ jobs, counts, description }: { jobs: Job[]; counts: Counts; description: string }) {
  // The order on screen, moved live while dragging; back to the saved one
  // whenever the page's data is refreshed.
  const [order, setOrder] = useState(jobs);
  const [savedJobs, setSavedJobs] = useState(jobs);
  if (jobs !== savedJobs) {
    setSavedJobs(jobs);
    setOrder(jobs);
  }
  // Opened, closed or deleted shows at once, and goes back if it couldn't be saved.
  const [shown, show] = useOptimistic(order, (all, change: { id: string; open?: boolean; gone?: boolean }) =>
    change.gone ? all.filter((j) => j.id !== change.id) : all.map((j) => (j.id === change.id ? { ...j, open: change.open ?? j.open } : j)),
  );
  const { pending, run } = useAction();
  const confirm = useConfirm();

  // The drawer: a copy of the job being edited (no id: a new one), and how it started.
  const [editing, setEditing] = useState<Job | null>(null);
  const [start, setStart] = useState<Job>(BLANK_JOB);
  const open = (job: Job | null) => {
    const draft = job ?? BLANK_JOB;
    setEditing(draft);
    setStart(draft);
  };
  const set = (patch: Partial<Job>) => setEditing((j) => j && { ...j, ...patch });

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    if (await run(() => saveJob(editing), editing.id ? "Job saved" : "Job added")) setEditing(null);
  };

  const toggle = (job: Job, isOpen: boolean) =>
    run(() => setJobOpen(job.id, isOpen), isOpen ? `${job.title} is open` : `${job.title} is closed`, undefined, () =>
      show({ id: job.id, open: isOpen }),
    );

  const remove = async (job: Job) => {
    const applied = counts[job.id]?.all ?? 0;
    const yes = await confirm({
      title: `Delete ${job.title || "this job"}?`,
      message: `It comes off the website and out of this list for good.${
        applied ? ` Its ${applied} ${applied === 1 ? "application stays" : "applications stay"} under Job applications.` : ""
      } To take it off the website but keep it here, close it instead.`,
      confirmText: "Delete job",
      variant: "danger",
    });
    if (yes) await run(() => deleteJob(job.id), "Job deleted", undefined, () => show({ id: job.id, gone: true }));
  };

  const saveOrder = async (next: Job[], before: Job[]) => {
    const ids = (list: Job[]) => list.map((j) => j.id);
    if (ids(next).join() === ids(before).join()) return;
    const undo = () => {
      setOrder(before);
      void run(() => saveJobOrder(ids(before)), "Order put back");
    };
    if (!(await run(() => saveJobOrder(ids(next)), "Order saved", { label: "Undo", onClick: undo }))) setOrder(before);
  };

  const openCount = shown.filter((j) => j.open).length;

  return (
    <>
      <PageHeader
        icon={Briefcase}
        title="Jobs"
        description={description}
        actions={
          <button type="button" onClick={() => open(null)} className={`${button.primary} w-full sm:w-auto`}>
            <Plus className="size-4" /> Add job
          </button>
        }
      />

      <Toolbar>
        <span className="text-sm text-ink/50">Open jobs show on the website, in this order.</span>
        <CountPill>
          {openCount} open · {shown.length - openCount} closed
        </CountPill>
      </Toolbar>

      {shown.length === 0 ? (
        <p className="rounded-2xl border border-ink/10 bg-white px-6 py-14 text-center text-sm text-ink/50">
          No jobs yet. Add one, and it&rsquo;s on the website as soon as it&rsquo;s saved.
        </p>
      ) : (
        <Sortable
          items={shown}
          getKey={(j) => j.id}
          onChange={setOrder}
          onCommit={saveOrder}
          disabled={pending}
          className="divide-y divide-ink/8 overflow-hidden rounded-2xl border border-ink/10 bg-white"
          itemClassName="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:gap-4"
        >
          {(job, sort) => {
            const c = counts[job.id];
            return (
              <>
                <button
                  type="button"
                  onClick={() => open(job)}
                  className="min-w-0 flex-1 cursor-pointer text-left"
                  aria-label={`Edit ${job.title}`}
                >
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-ink">{job.title || "Untitled job"}</span>
                    {!job.open && <Badge>Closed</Badge>}
                  </span>
                  <span className="mt-1 block truncate text-xs text-ink/50">
                    {[job.department, job.location, job.job_type, job.experience].filter(Boolean).join(" · ") || "No details yet"}
                  </span>
                </button>

                <div className="flex items-center gap-4">
                  <Link
                    href={`/careers/applications?job=${job.id}`}
                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs text-ink/60 transition-colors hover:bg-bone/60 hover:text-ink"
                    title="See its applications"
                  >
                    <UserSearch className="size-3.5" />
                    {c?.all ?? 0} {c?.all === 1 ? "application" : "applications"}
                    {c?.fresh ? <Badge tone="yellow">{c.fresh} new</Badge> : null}
                  </Link>
                  <div className="w-28">
                    <Toggle
                      checked={job.open}
                      onChange={(isOpen) => toggle(job, isOpen)}
                      label={<span className="text-xs">{job.open ? "Open" : "Closed"}</span>}
                    />
                  </div>
                  <div className="flex items-center">
                    <RowControls {...sort.row} />
                    <button type="button" onClick={() => open(job)} className={iconButton} aria-label={`Edit ${job.title}`}>
                      <Edit2 className="size-4" />
                    </button>
                    <button type="button" onClick={() => remove(job)} className={iconButtonDanger} aria-label={`Delete ${job.title}`}>
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              </>
            );
          }}
        </Sortable>
      )}

      <EditModal
        isOpen={editing !== null}
        onClose={() => setEditing(null)}
        title={editing?.id ? "Edit job" : "Add job"}
        formId="job-form"
        saveLabel={editing?.id ? "Save" : "Add job"}
        isSaving={pending}
        wide
        dirty={JSON.stringify(editing) !== JSON.stringify(start)}
      >
        {editing && (
          <form id="job-form" onSubmit={onSubmit} className="space-y-6">
            <Field label="Title">
              <input required value={editing.title} onChange={(e) => set({ title: e.target.value })} className={inputClass} placeholder="Operations Manager" />
            </Field>
            <Field label="Summary" hint="A line or two under the title on the website.">
              <textarea rows={2} value={editing.summary} onChange={(e) => set({ summary: e.target.value })} className={textareaClass} />
            </Field>

            <div className="grid gap-6 sm:grid-cols-2">
              {(
                [
                  ["department", "Department", "Operations"],
                  ["location", "Location", "Pretoria"],
                  ["job_type", "Job type", "Full time"],
                  ["qualifications", "Qualifications", "Degree or diploma"],
                  ["experience", "Experience", "5+ years"],
                  ["salary", "Offered salary", "Market related"],
                ] as const
              ).map(([key, label, placeholder]) => (
                <Field key={key} label={label}>
                  <input value={editing[key]} onChange={(e) => set({ [key]: e.target.value })} className={inputClass} placeholder={placeholder} />
                </Field>
              ))}
            </div>

            <Field label="Description" hint="What the role is. New lines show as new lines.">
              <textarea rows={5} value={editing.description} onChange={(e) => set({ description: e.target.value })} className={textareaClass} />
            </Field>
            <Field label="What will I do?" hint="A day in the role.">
              <textarea rows={5} value={editing.duties} onChange={(e) => set({ duties: e.target.value })} className={textareaClass} />
            </Field>

            <div className="rounded-xl border border-ink/10 p-4">
              <Toggle
                checked={editing.open}
                onChange={(isOpen) => set({ open: isOpen })}
                label="Open"
                description="On the website, taking applications. Closed, it's kept here but off the website."
              />
            </div>
          </form>
        )}
      </EditModal>
    </>
  );
}
