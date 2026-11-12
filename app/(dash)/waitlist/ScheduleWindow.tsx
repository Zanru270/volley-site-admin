"use client";

import { useEffect, useId, useState, useTransition } from "react";
import { CalendarClock, Loader2, MapPin, Video, X } from "lucide-react";
import { button, Field, inputClass, labelClass, textareaClass } from "@/components/ui";
import CustomSelect from "@/components/CustomSelect";
import { useToast } from "@/components/ToastProvider";
import { useConfirm } from "@/components/ConfirmProvider";
import { INTERVIEW_LENGTHS, type InterviewPlan, type InterviewSettings, type WaitlistEntry } from "@/lib/waitlist";
import { cancelInterview, previewInterviewEmail, scheduleInterview } from "./interviews/actions";

// A date and time as Pretoria has them, from an ISO moment.
const local = (iso: string) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Johannesburg",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour")}:${get("minute")}` };
};
const tomorrow = () => local(new Date(Date.now() + 24 * 3600_000).toISOString()).date;

/* Setting (or moving) someone's interview: the day and time (Pretoria
   time), how long, in person (where: typed freely, with the saved places
   offered) or online (the meeting link), and who's interviewing (any of
   the interviewers, together or alone). With "Email them" ticked, the
   student and their parent, and each interviewer with an email, get the
   details and an "Add to calendar" invite; the student's email shows
   here first, with room for a line of your own. A scheduled one can be
   cancelled from here too. */
export default function ScheduleWindow({
  entry: e,
  settings,
  onClose,
  onDone,
}: {
  entry: WaitlistEntry;
  settings: InterviewSettings;
  onClose: () => void;
  onDone: () => void;
}) {
  const toast = useToast();
  const confirm = useConfirm();
  const placesId = useId();
  const scheduled = Boolean(e.interview_at);
  const start = e.interview_at ? local(e.interview_at) : { date: tomorrow(), time: "10:00" };
  const [date, setDate] = useState(start.date);
  const [time, setTime] = useState(start.time);
  const [minutes, setMinutes] = useState(e.interview_minutes ?? 30);
  const [mode, setMode] = useState<InterviewPlan["mode"]>(e.interview_mode ?? "in_person");
  const [place, setPlace] = useState(e.interview_place || (settings.places.find((p) => p.toLowerCase().includes(e.house.toLowerCase())) ?? ""));
  const [link, setLink] = useState(e.interview_link ?? "");
  const [people, setPeople] = useState<string[]>(e.interview_with?.length ? e.interview_with : settings.interviewers.slice(0, 1).map((i) => i.name));
  const [note, setNote] = useState("");
  const [email, setEmail] = useState(true);
  const [preview, setPreview] = useState<{ to: string; subject: string; text: string } | { problem: string } | null>(null);
  const [saving, start2] = useTransition();

  const plan: InterviewPlan = { at: `${date}T${time}:00+02:00`, minutes, mode, place, link, with: people };
  const planKey = JSON.stringify(plan);

  // The student's email as it stands, a moment after the last change.
  useEffect(() => {
    if (!email) return;
    let live = true;
    const timer = setTimeout(async () => {
      const result = await previewInterviewEmail(e.id, JSON.parse(planKey), note);
      if (live) setPreview(result.ok ? result : { problem: result.message });
    }, 300);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [e.id, planKey, note, email]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (ev: KeyboardEvent) => ev.key === "Escape" && !saving && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [saving, onClose]);

  const save = () =>
    start2(async () => {
      const result = await scheduleInterview(e.id, plan, { email, note });
      toast.result(result, scheduled ? "Interview moved" : "Interview scheduled");
      if (result.ok) onDone();
    });
  const cancel = async () => {
    const yes = await confirm({
      title: "Cancel this interview?",
      message: `${e.name} stays at Interview, with no time. ${email ? "They, their parent and the interviewers are emailed that it's cancelled." : "No one is emailed."}`,
      confirmText: "Cancel interview",
      variant: "danger",
    });
    if (!yes) return;
    start2(async () => {
      const result = await cancelInterview(e.id, { email });
      toast.result(result, "Interview cancelled");
      if (result.ok) onDone();
    });
  };
  const toggle = (name: string) => setPeople((p) => (p.includes(name) ? p.filter((x) => x !== name) : [...p, name]));
  const segment = (on: boolean) =>
    `inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm transition-colors ${
      on ? "bg-white font-medium text-ink shadow-soft" : "text-ink/55 hover:text-ink"
    }`;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-ink/40 p-3 backdrop-blur-[2px]" onClick={saving ? undefined : onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Interview: ${e.name} ${e.surname}`}
        onClick={(ev) => ev.stopPropagation()}
        className="flex max-h-full w-full max-w-2xl animate-pop-in flex-col overflow-hidden rounded-2xl bg-white shadow-soft"
      >
        <header className="flex items-start justify-between gap-4 border-b border-ink/8 px-6 py-4">
          <div>
            <p className="font-publish text-2xl text-ink">{scheduled ? "Move the interview" : "Schedule interview"}</p>
            <p className="mt-0.5 text-sm text-ink/55">
              {e.name} {e.surname} · Volley {e.house}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close"
            className="flex size-8 cursor-pointer items-center justify-center rounded-full text-ink/50 transition-colors hover:bg-bone hover:text-ink"
          >
            <X className="size-4" />
          </button>
        </header>

        <form
          id="schedule-interview"
          onSubmit={(ev) => {
            ev.preventDefault();
            save();
          }}
          className="flex-1 space-y-5 overflow-y-auto px-6 py-5"
        >
          <div className="grid gap-4 sm:grid-cols-[1fr_8rem_9rem]">
            <Field label="Day">
              <input type="date" required value={date} onChange={(ev) => setDate(ev.target.value)} className={inputClass} />
            </Field>
            <Field label="Time">
              <input type="time" required value={time} onChange={(ev) => setTime(ev.target.value)} className={inputClass} />
            </Field>
            <CustomSelect
              label="How long"
              value={String(minutes)}
              onChange={(v) => setMinutes(Number(v))}
              options={INTERVIEW_LENGTHS.map((m) => ({ value: String(m), label: m < 60 ? `${m} min` : `${m / 60} hour${m > 60 ? "s" : ""}`.replace("1.5 hours", "1½ hours") }))}
            />
          </div>

          <div className="space-y-2">
            <span className={labelClass}>Where</span>
            <div className="flex gap-1 rounded-xl bg-bone/60 p-1">
              <button type="button" onClick={() => setMode("in_person")} className={segment(mode === "in_person")}>
                <MapPin className="size-4" /> In person
              </button>
              <button type="button" onClick={() => setMode("online")} className={segment(mode === "online")}>
                <Video className="size-4" /> Online
              </button>
            </div>
            {mode === "in_person" ? (
              <>
                <input
                  list={placesId}
                  value={place}
                  onChange={(ev) => setPlace(ev.target.value)}
                  placeholder="Volley Baileys study center"
                  aria-label="Where it is"
                  className={inputClass}
                />
                <datalist id={placesId}>
                  {settings.places.map((p) => (
                    <option key={p} value={p} />
                  ))}
                </datalist>
                <p className="text-xs text-ink/50">Type anywhere, or pick a saved place (kept on the Interviews page).</p>
              </>
            ) : (
              <input
                type="url"
                value={link}
                onChange={(ev) => setLink(ev.target.value)}
                placeholder="https://meet.google.com/…"
                aria-label="Meeting link"
                className={inputClass}
              />
            )}
          </div>

          <div className="space-y-2">
            <span className={labelClass}>With</span>
            <div className="flex flex-wrap gap-1.5">
              {settings.interviewers.map((i) => (
                <button
                  key={i.name}
                  type="button"
                  aria-pressed={people.includes(i.name)}
                  onClick={() => toggle(i.name)}
                  title={i.email ? `Gets the invite at ${i.email}` : "No email saved: named only"}
                  className={`cursor-pointer rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                    people.includes(i.name) ? "border-ink bg-ink text-bone" : "border-ink/20 bg-white text-ink/60 hover:border-ink/50 hover:text-ink"
                  }`}
                >
                  {i.name}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3 border-t border-ink/8 pt-5">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
              <input type="checkbox" checked={email} onChange={(ev) => setEmail(ev.target.checked)} className="size-4 accent-ink" />
              Email them, with an &ldquo;Add to calendar&rdquo; invite
            </label>
            {email && (
              <>
                <Field label="A line of your own" hint="Optional. Added to their email.">
                  <textarea rows={2} value={note} onChange={(ev) => setNote(ev.target.value)} className={textareaClass} placeholder="Bring your ID along." />
                </Field>
                <div className="rounded-xl border border-ink/10 bg-bone/30">
                  {!preview ? (
                    <p className="flex items-center gap-2 px-4 py-6 text-sm text-ink/50">
                      <Loader2 className="size-4 animate-spin" /> Writing it…
                    </p>
                  ) : "problem" in preview ? (
                    <p className="px-4 py-4 text-sm text-ink/55">{preview.problem}</p>
                  ) : (
                    <>
                      <div className="space-y-0.5 border-b border-ink/8 px-4 py-3 text-xs text-ink/55">
                        <p>
                          To: <span className="text-ink">{preview.to}</span>
                        </p>
                        <p>
                          Subject: <span className="text-ink">{preview.subject}</span>
                        </p>
                      </div>
                      <p className="px-4 py-3 text-sm leading-relaxed whitespace-pre-line text-ink/85">{preview.text}</p>
                    </>
                  )}
                </div>
                <p className="text-xs text-ink/50">
                  {e.parent_email ? "Their parent gets one too, and " : ""}each interviewer with a saved email gets the invite.
                </p>
              </>
            )}
          </div>
        </form>

        <footer className="flex items-center justify-between gap-2 border-t border-ink/8 px-6 py-3.5">
          <span>
            {scheduled && (
              <button type="button" onClick={cancel} disabled={saving} className={`${button.ghost} text-brick! hover:text-red!`}>
                Cancel interview
              </button>
            )}
          </span>
          <span className="flex gap-2">
            <button type="button" onClick={onClose} disabled={saving} className={button.ghost}>
              Close
            </button>
            <button type="submit" form="schedule-interview" disabled={saving} className={`${button.primary} disabled:opacity-50`}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : <CalendarClock className="size-4" />}
              {saving ? "Saving…" : scheduled ? "Move it" : "Schedule it"}
            </button>
          </span>
        </footer>
      </div>
    </div>
  );
}
