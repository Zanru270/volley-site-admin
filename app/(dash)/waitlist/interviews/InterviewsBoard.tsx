"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarClock, ChevronLeft, ChevronRight, MapPin, Plus, Trash2, UserRound, Video } from "lucide-react";
import { button, Card, inputClass, labelClass, tab, tabs } from "@/components/ui";
import { StringList } from "@/components/forms";
import { useToast } from "@/components/ToastProvider";
import type { InterviewSettings, WaitlistEntry } from "@/lib/waitlist";
import ScheduleWindow from "../ScheduleWindow";
import { saveInterviewSettings } from "./actions";

const TZ = { timeZone: "Africa/Johannesburg" } as const;
// "2027-01-14", the day a moment falls on in Pretoria.
const dayOf = (d: Date) => new Intl.DateTimeFormat("en-CA", TZ).format(d);
const timeOf = (d: Date) => d.toLocaleTimeString("en-ZA", { ...TZ, hour: "2-digit", minute: "2-digit", hour12: false });
const addDays = (iso: string, n: number) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};
const weekdayOf = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
};
const dayLabel = (iso: string, today: string) =>
  iso === today
    ? "Today"
    : iso === addDays(today, 1)
      ? "Tomorrow"
      : new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long" });
const startOf = (e: WaitlistEntry) => new Date(e.interview_at!);
const endOf = (e: WaitlistEntry) => new Date(startOf(e).getTime() + (e.interview_minutes ?? 30) * 60_000);
const whereOf = (e: WaitlistEntry) => (e.interview_mode === "online" ? "Online" : e.interview_place || "No place yet");

/* Every interview, for everyone in the admin: who, when, where and with
   whom. "Upcoming" lists them by day; "Week" lays a week out as a calendar.
   Those at Interview with no time yet wait above, each a click from
   scheduling, and those whose interview has passed wait on a decision on
   their application. Under it, the interviewers (and the email each one's
   invite goes to) and the saved places, saved on their own. */
export default function InterviewsBoard({
  entries: everyone,
  settings: initialSettings,
}: {
  // Everyone still waiting on a decision; those at Interview are the board.
  entries: WaitlistEntry[];
  settings: InterviewSettings;
}) {
  const entries = everyone.filter((e) => e.status === "interview");
  const [picking, setPicking] = useState(false);
  const router = useRouter();
  const [view, setView] = useState<"upcoming" | "week">("upcoming");
  const [settings, setSettings] = useState(initialSettings);
  const [editing, setEditing] = useState<WaitlistEntry | null>(null);
  // Read once on load: "now" and "today" for the lists and the week.
  const [now] = useState(() => Date.now());
  const today = dayOf(new Date(now));
  const [weekStart, setWeekStart] = useState(() => addDays(today, -((weekdayOf(today) + 6) % 7)));

  const scheduled = entries.filter((e) => e.interview_at).sort((a, b) => startOf(a).getTime() - startOf(b).getTime());
  const waiting = entries.filter((e) => !e.interview_at);
  const upcoming = scheduled.filter((e) => endOf(e).getTime() >= now);
  const past = scheduled.filter((e) => endOf(e).getTime() < now).reverse();
  const byDay = new Map<string, WaitlistEntry[]>();
  for (const e of upcoming) byDay.set(dayOf(startOf(e)), [...(byDay.get(dayOf(startOf(e))) ?? []), e]);

  const item = (e: WaitlistEntry, done = false) => (
    <li key={e.id} className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center">
      <span className="w-28 shrink-0 text-sm font-medium text-ink tabular-nums">
        {timeOf(startOf(e))}–{timeOf(endOf(e))}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-ink">
          {e.name} {e.surname} <span className="font-normal text-ink/50">· Volley {e.house}</span>
        </span>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-ink/55">
          <span className="inline-flex items-center gap-1">
            {e.interview_mode === "online" ? <Video className="size-3.5" /> : <MapPin className="size-3.5" />}
            {e.interview_mode === "online" && e.interview_link ? (
              <a href={e.interview_link} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">
                Online
              </a>
            ) : (
              whereOf(e)
            )}
          </span>
          {!!e.interview_with?.length && (
            <span className="inline-flex items-center gap-1">
              <UserRound className="size-3.5" /> {e.interview_with.join(", ")}
            </span>
          )}
        </span>
      </span>
      <span className="flex shrink-0 gap-2">
        {!done && (
          <button type="button" onClick={() => setEditing(e)} className={`${button.secondary} px-3! py-1.5! text-xs`}>
            Move
          </button>
        )}
        <Link href={`/waitlist/applications?open=${e.id}`} className={`${button.secondary} px-3! py-1.5! text-xs`}>
          {done ? "Decide" : "Application"}
        </Link>
      </span>
    </li>
  );

  // The week: Monday to Sunday, each day its interviews by time.
  const week = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <button type="button" onClick={() => setPicking(true)} className={button.primary}>
          <Plus className="size-4" /> Schedule an interview
        </button>
      </div>

      {waiting.length > 0 && (
        <Card title={`Waiting for a time (${waiting.length})`} description="Invited to an interview, with no day set yet.">
          <ul className="divide-y divide-ink/8 overflow-hidden rounded-xl border border-ink/10">
            {waiting.map((e) => (
              <li key={e.id} className="flex items-center gap-3 px-4 py-3">
                <span className="min-w-0 flex-1 truncate text-sm text-ink">
                  {e.name} {e.surname} <span className="text-ink/50">· Volley {e.house}, {e.unit}</span>
                </span>
                <button type="button" onClick={() => setEditing(e)} className={`${button.primary} px-3! py-1.5! text-xs`}>
                  <CalendarClock className="size-3.5" /> Schedule
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div role="tablist" aria-label="View" className={tabs}>
            <button type="button" role="tab" aria-selected={view === "upcoming"} onClick={() => setView("upcoming")} className={tab(view === "upcoming")}>
              Upcoming
            </button>
            <button type="button" role="tab" aria-selected={view === "week"} onClick={() => setView("week")} className={tab(view === "week")}>
              Week
            </button>
          </div>
          {view === "week" && (
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setWeekStart(addDays(weekStart, -7))} aria-label="The week before" className={`${button.secondary} px-2! py-1.5!`}>
                <ChevronLeft className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setWeekStart(addDays(today, -((weekdayOf(today) + 6) % 7)))}
                className={`${button.secondary} px-3! py-1.5! text-xs`}
              >
                This week
              </button>
              <button type="button" onClick={() => setWeekStart(addDays(weekStart, 7))} aria-label="The week after" className={`${button.secondary} px-2! py-1.5!`}>
                <ChevronRight className="size-4" />
              </button>
            </div>
          )}
        </div>

        {view === "upcoming" ? (
          upcoming.length === 0 ? (
            <p className="rounded-2xl border border-ink/10 bg-white px-6 py-14 text-center text-sm text-ink/50">No interviews coming up.</p>
          ) : (
            <div className="space-y-5">
              {[...byDay.entries()].map(([day, list]) => (
                <section key={day}>
                  <h3 className="mb-2 text-sm font-semibold text-ink">{dayLabel(day, today)}</h3>
                  <ul className="divide-y divide-ink/8 overflow-hidden rounded-2xl border border-ink/10 bg-white">{list.map((e) => item(e))}</ul>
                </section>
              ))}
            </div>
          )
        ) : (
          <div className="grid gap-3 md:grid-cols-7">
            {week.map((day) => {
              const list = scheduled.filter((e) => dayOf(startOf(e)) === day);
              return (
                <div key={day} className={`flex min-h-40 flex-col rounded-xl border p-2 ${day === today ? "border-ink/40 bg-white" : "border-ink/10 bg-bone/30"}`}>
                  <p className="px-1 pb-2 text-xs font-medium text-ink/55">
                    {new Date(`${day}T12:00:00Z`).toLocaleDateString("en-ZA", { weekday: "short", day: "numeric", month: "short" })}
                  </p>
                  <div className="flex flex-col gap-2">
                    {list.map((e) => (
                      <button
                        key={e.id}
                        type="button"
                        onClick={() => setEditing(e)}
                        className={`cursor-pointer rounded-lg border-l-4 bg-white px-2.5 py-2 text-left shadow-sm transition-shadow hover:shadow-soft ${
                          endOf(e).getTime() < now ? "border-stone opacity-60" : "border-pink"
                        }`}
                      >
                        <span className="block text-xs font-semibold text-ink tabular-nums">{timeOf(startOf(e))}</span>
                        <span className="block truncate text-xs text-ink">
                          {e.name} {e.surname}
                        </span>
                        <span className="block truncate text-[11px] text-ink/50">{whereOf(e)}</span>
                      </button>
                    ))}
                    {list.length === 0 && <p className="px-1 text-xs text-ink/30">Nothing</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {past.length > 0 && (
        <Card title="Interviewed, waiting on a decision" description="Their interview has passed: accept or decline them on their application.">
          <ul className="divide-y divide-ink/8 overflow-hidden rounded-xl border border-ink/10">{past.map((e) => item(e, true))}</ul>
        </Card>
      )}

      <Settings settings={settings} onSaved={setSettings} />

      {picking && (
        <PickApplicant
          entries={everyone.filter((e) => !e.interview_at)}
          onPick={(e) => {
            setPicking(false);
            setEditing(e);
          }}
          onClose={() => setPicking(false)}
        />
      )}

      {editing && (
        <ScheduleWindow
          key={editing.id}
          entry={editing}
          settings={settings}
          onClose={() => setEditing(null)}
          onDone={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

/* The interviewers (each one's invite goes to their email; without one,
   they're named but not sent anything) and the places offered when
   scheduling. Saved on their own, with this card's Save. */
function Settings({ settings, onSaved }: { settings: InterviewSettings; onSaved: (s: InterviewSettings) => void }) {
  const toast = useToast();
  const [draft, setDraft] = useState(settings);
  const [pending, start] = useTransition();
  const dirty = JSON.stringify(draft) !== JSON.stringify(settings);
  const setPerson = (i: number, patch: Partial<InterviewSettings["interviewers"][number]>) =>
    setDraft((d) => ({ ...d, interviewers: d.interviewers.map((p, j) => (j === i ? { ...p, ...patch } : p)) }));

  return (
    <Card
      title="Interviewers and places"
      description="Who can run interviews, and the places offered when scheduling one. An interviewer's email gets their calendar invites."
      actions={
        <button
          type="button"
          disabled={!dirty || pending}
          onClick={() =>
            start(async () => {
              const result = await saveInterviewSettings(draft);
              toast.result(result);
              if (result.ok) onSaved(draft);
            })
          }
          className={`${button.primary} py-2! disabled:opacity-40`}
        >
          Save
        </button>
      }
    >
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-2">
          <span className={labelClass}>Interviewers</span>
          {draft.interviewers.map((p, i) => (
            <div key={i} className="flex gap-2">
              <input value={p.name} onChange={(ev) => setPerson(i, { name: ev.target.value })} placeholder="Name" aria-label="Name" className={`${inputClass} w-36`} />
              <input
                type="email"
                value={p.email}
                onChange={(ev) => setPerson(i, { email: ev.target.value })}
                placeholder="Email, for their invites"
                aria-label={`${p.name || "Their"} email`}
                className={inputClass}
              />
              <button
                type="button"
                onClick={() => setDraft((d) => ({ ...d, interviewers: d.interviewers.filter((_, j) => j !== i) }))}
                aria-label={`Remove ${p.name || "this interviewer"}`}
                className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-lg text-ink/40 transition-colors hover:bg-bone hover:text-brick"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
          <button type="button" onClick={() => setDraft((d) => ({ ...d, interviewers: [...d.interviewers, { name: "", email: "" }] }))} className={button.ghost}>
            <Plus className="size-4" /> Add an interviewer
          </button>
        </div>
        <div className="space-y-2">
          <span className={labelClass}>Places</span>
          <StringList values={draft.places} onChange={(places) => setDraft((d) => ({ ...d, places }))} addLabel="Add a place" />
        </div>
      </div>
    </Card>
  );
}

/* Who the new interview is with: anyone still waiting on a decision who
   has no interview yet, newest first, searchable. Picking one goes on to
   setting its time. */
function PickApplicant({
  entries,
  onPick,
  onClose,
}: {
  entries: WaitlistEntry[];
  onPick: (e: WaitlistEntry) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  const shown = entries.filter(
    (e) => !query || [`${e.name} ${e.surname}`, e.email, e.house, e.unit].some((t) => t?.toLowerCase().includes(query)),
  );
  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-ink/40 p-3 backdrop-blur-[2px]" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Schedule an interview with"
        onClick={(ev) => ev.stopPropagation()}
        onKeyDown={(ev) => ev.key === "Escape" && onClose()}
        className="flex max-h-[80vh] w-full max-w-lg animate-pop-in flex-col overflow-hidden rounded-2xl bg-white shadow-soft"
      >
        <div className="border-b border-ink/8 px-5 py-4">
          <p className="font-publish text-2xl text-ink">Schedule an interview</p>
          <p className="mt-0.5 text-sm text-ink/55">Who with? Anyone waiting on a decision.</p>
          <input
            autoFocus
            value={q}
            onChange={(ev) => setQ(ev.target.value)}
            placeholder="Search names, emails, buildings..."
            aria-label="Search applicants"
            className={`${inputClass} mt-3`}
          />
        </div>
        <ul className="flex-1 divide-y divide-ink/8 overflow-y-auto">
          {shown.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                onClick={() => onPick(e)}
                className="flex w-full cursor-pointer items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-bone/50"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-ink">
                    {e.name} {e.surname}
                  </span>
                  <span className="block truncate text-xs text-ink/55">
                    Volley {e.house}, {e.unit}
                  </span>
                </span>
                <CalendarClock className="size-4 shrink-0 text-ink/35" />
              </button>
            </li>
          ))}
          {shown.length === 0 && <li className="px-5 py-10 text-center text-sm text-ink/50">No one to schedule.</li>}
        </ul>
        <div className="border-t border-ink/8 px-5 py-3 text-right">
          <button type="button" onClick={onClose} className={button.ghost}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
