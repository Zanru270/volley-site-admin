"use client";

import { useEffect, useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  CalendarDays,
  Check,
  ChevronDown,
  Clock,
  Download,
  Eye,
  FileText,
  Handshake,
  Info,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Search,
  Sparkles,
  Trash2,
  Trophy,
  X,
  type LucideIcon,
} from "lucide-react";
import { Badge, button, CountPill, Field, inputClass, SearchBox, textareaClass } from "@/components/ui";
import CustomSelect from "@/components/CustomSelect";
import { useAction } from "@/components/forms";
import { useConfirm } from "@/components/ConfirmProvider";
import { useToast } from "@/components/ToastProvider";
import {
  APPLICATION_TABS,
  CAREER_EMAILS_LIVE,
  careerEmail,
  statusLabel,
  type ApplicationTab,
  type CareerEmailKind,
  type JobApplication,
} from "@/lib/careers";
import { decideApplication, deleteApplication, saveApplicationNotes, setApplicationStatus } from "./actions";
import { DateTimePicker } from "@/components/DatePicker";

const TONE: Record<string, "yellow" | "pink" | "lemon" | "stone" | "ink"> = {
  new: "yellow",
  reviewing: "pink",
  interview: "ink",
  offered: "pink",
  hired: "lemon",
  declined: "stone",
  closed: "stone",
};
const TAB_LABELS: Record<ApplicationTab, string> = {
  new: "New",
  reviewing: "Reviewing",
  interview: "Interview",
  offered: "Offered",
  hired: "Hired",
  declined: "Declined",
  closed: "Closed",
  all: "Everyone",
};
const fullName = (a: JobApplication) => `${a.name} ${a.surname}`.trim();
const date = (iso: string) =>
  new Date(iso).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Johannesburg" });
const dateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-ZA", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Johannesburg",
  });

type Decision = "interview" | "offer" | "decline";

/* The job applications, as the waitlist's Applications page lays them
   out: a strip of counts, a job filter and search, a tab per status (with
   counts), and a row each, newest first, that opens in place with
   everything about the person, their CV, the team's notes, and the
   controls:

   - New / Reviewing / Hired / Closed: marks for the team, no email.
   - Interview, Offer, Decline: each opens a window with the email the
     applicant will get (Interview picks a time and place), then marks
     them. Mailing isn't set up yet (CAREER_EMAILS_LIVE): the window says
     so, and only the status changes. */
export default function JobApplicationsList({
  applications: saved,
  jobs,
  initialJob,
  initialOpen,
}: {
  applications: JobApplication[];
  jobs: { id: string; title: string }[];
  initialJob?: string;
  initialOpen?: string;
}) {
  const router = useRouter();
  // A mark shows at once, and goes back if it couldn't be saved; deleted, it goes.
  const [applications, show] = useOptimistic(saved, (all, change: { id: string; status?: string; gone?: boolean }) =>
    change.gone
      ? all.filter((a) => a.id !== change.id)
      : all.map((a) => (a.id === change.id ? { ...a, status: (change.status ?? a.status) as JobApplication["status"] } : a)),
  );
  const startOn = applications.find((a) => a.id === initialOpen);
  const [tab, setTab] = useState<ApplicationTab>(() => (startOn ? startOn.status : initialJob ? "all" : "new"));
  const [job, setJob] = useState(initialJob && jobs.some((j) => j.id === initialJob) ? initialJob : "all");
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(startOn?.id ?? null);
  const [deciding, setDeciding] = useState<{ application: JobApplication; kind: Decision } | null>(null);
  const [previewing, setPreviewing] = useState<JobApplication | null>(null);
  const { pending, run } = useAction();
  const confirm = useConfirm();
  // Read once on load, for "This week": reading the clock while drawing would change it.
  const [loadedAt] = useState(() => Date.now());

  // The job filter: every job, and any title applied for that's since been deleted.
  const jobOptions = [
    { value: "all", label: "All jobs" },
    ...jobs.map((j) => ({ value: j.id, label: j.title })),
    ...[...new Set(applications.filter((a) => !a.job_id).map((a) => a.job_title))]
      .filter(Boolean)
      .map((title) => ({ value: `title:${title}`, label: `${title} (deleted)` })),
  ];
  const inJob = applications.filter((a) =>
    job === "all" ? true : job.startsWith("title:") ? !a.job_id && a.job_title === job.slice(6) : a.job_id === job,
  );
  const inTab = (t: ApplicationTab) => (t === "all" ? inJob : inJob.filter((a) => a.status === t));
  const q = search.trim().toLowerCase();
  const shown = inTab(tab).filter(
    (a) => !q || [fullName(a), a.email, a.phone, a.job_title, a.address].some((t) => t?.toLowerCase().includes(q)),
  );

  const weekAgo = loadedAt - 7 * 24 * 3600_000;
  const stats: { label: string; value: number; hint: string; icon: LucideIcon; tab?: ApplicationTab }[] = [
    { label: "New", value: inTab("new").length, hint: "Not looked at yet", icon: Sparkles, tab: "new" },
    { label: "Interviews", value: inTab("interview").length, hint: "Shortlisted, meeting them", icon: CalendarDays, tab: "interview" },
    { label: "Hired", value: inTab("hired").length, hint: "Joined the crew", icon: Trophy, tab: "hired" },
    {
      label: "This week",
      value: inJob.filter((a) => new Date(a.created_at).getTime() >= weekAgo).length,
      hint: "Applied in the last 7 days",
      icon: Clock,
    },
  ];

  const mark = (a: JobApplication, status: string) =>
    run(() => setApplicationStatus(a.id, status), `Marked ${statusLabel(status).toLowerCase()}`, undefined, () =>
      show({ id: a.id, status }),
    );
  const remove = async (a: JobApplication) => {
    const yes = await confirm({
      title: `Delete ${fullName(a)}'s application?`,
      message: "Their details and their CV are deleted for good. To keep them but move them out of the way, close it instead.",
      confirmText: "Delete application",
      variant: "danger",
    });
    if (yes) {
      setOpenId(null);
      await run(() => deleteApplication(a.id), "Application deleted", undefined, () => show({ id: a.id, gone: true }));
    }
  };

  return (
    <>
      {!CAREER_EMAILS_LIVE && (
        <p className="mb-6 flex items-start gap-2.5 rounded-xl border border-ink/10 bg-yellow/25 px-4 py-3 text-sm text-ink/75">
          <Info className="mt-0.5 size-4 shrink-0" />
          <span>
            Emails aren&rsquo;t set up yet. Interview, Offer and Decline show the email each person will get and change
            their status, but nothing is sent until mailing is connected.
          </span>
        </p>
      )}

      {/* The counts: click one to go to its tab. */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <button
            key={s.label}
            type="button"
            disabled={!s.tab}
            onClick={() => s.tab && setTab(s.tab)}
            className={`flex min-h-26 flex-col justify-between gap-3 rounded-2xl border bg-white p-4 text-left transition-colors sm:p-5 ${
              s.tab ? "cursor-pointer hover:border-ink/30" : "cursor-default"
            } ${s.tab && tab === s.tab ? "border-ink" : "border-ink/10"}`}
          >
            <span className="flex items-start justify-between gap-2">
              <span className="text-[13px] font-medium text-ink/55">{s.label}</span>
              <s.icon className="size-4 shrink-0 text-ink/35" />
            </span>
            <span>
              <span className="block font-publish text-3xl text-ink tabular-nums">{s.value}</span>
              <span className="mt-0.5 block truncate text-[11px] text-ink/45">{s.hint}</span>
            </span>
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-ink/10 bg-white p-4 md:flex-row md:items-end md:justify-between">
        <SearchBox value={search} onChange={setSearch} placeholder="Search names, emails, jobs..." />
        <CustomSelect label="Job" value={job} onChange={setJob} options={jobOptions} className="w-64" />
      </div>

      {/* The tabs, underlined, each with its count. */}
      <div role="tablist" aria-label="Status" className="mb-5 flex items-center gap-6 overflow-x-auto border-b border-ink/10">
        {APPLICATION_TABS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`-mb-px shrink-0 cursor-pointer border-b-2 pb-3 text-sm font-medium whitespace-nowrap transition-colors ${
              tab === t ? "border-ink text-ink" : "border-transparent text-ink/50 hover:text-ink"
            }`}
          >
            {TAB_LABELS[t]} <span className={tab === t ? "text-ink/45" : "text-ink/30"}>({inTab(t).length})</span>
          </button>
        ))}
        <span className="ml-auto shrink-0 pb-3">
          <CountPill>
            {shown.length} {shown.length === 1 ? "application" : "applications"}
          </CountPill>
        </span>
      </div>

      {shown.length === 0 ? (
        <p className="rounded-2xl border border-ink/10 bg-white px-6 py-14 text-center text-sm text-ink/50">
          {applications.length === 0
            ? "No one has applied yet. Applications from the website's Careers page show up here."
            : q
              ? `No one matches "${search}".`
              : "No one here."}
        </p>
      ) : (
        <ul className="divide-y divide-ink/8 overflow-hidden rounded-2xl border border-ink/10 bg-white">
          {shown.map((a) => (
            <Row
              key={a.id}
              application={a}
              open={openId === a.id}
              onToggle={() => setOpenId(openId === a.id ? null : a.id)}
              pending={pending}
              onMark={(status) => mark(a, status)}
              onDecide={(kind) => setDeciding({ application: a, kind })}
              onPreview={() => setPreviewing(a)}
              onDelete={() => remove(a)}
              onSaveNotes={(notes) => run(() => saveApplicationNotes(a.id, notes), "Notes saved")}
            />
          ))}
        </ul>
      )}

      {deciding && (
        <DecisionWindow
          key={`${deciding.application.id}:${deciding.kind}`}
          application={deciding.application}
          kind={deciding.kind}
          onClose={() => setDeciding(null)}
          onDone={() => {
            setDeciding(null);
            router.refresh();
          }}
        />
      )}

      {previewing && <ReceivedWindow application={previewing} onClose={() => setPreviewing(null)} />}
    </>
  );
}

/* One application: its summary row, and below it, once opened, all of it
   and its controls. */
function Row({
  application: a,
  open,
  onToggle,
  pending,
  onMark,
  onDecide,
  onPreview,
  onDelete,
  onSaveNotes,
}: {
  application: JobApplication;
  open: boolean;
  onToggle: () => void;
  pending: boolean;
  onMark: (status: string) => void;
  onDecide: (kind: Decision) => void;
  onPreview: () => void;
  onDelete: () => void;
  onSaveNotes: (notes: string) => void;
}) {
  const [notes, setNotes] = useState(a.notes);
  const cv = `/careers/applications/${a.id}/cv`;
  const item = (label: string, value: React.ReactNode) =>
    value ? (
      <div className="flex justify-between gap-4 py-1.5 text-sm">
        <span className="shrink-0 text-ink/50">{label}</span>
        <span className="min-w-0 text-right wrap-break-word text-ink">{value}</span>
      </div>
    ) : null;
  const link = (href: string, text: string, Icon: LucideIcon) => (
    <a href={href} className="inline-flex items-center gap-1.5 underline-offset-2 hover:underline">
      <Icon className="size-3.5 text-ink/40" /> {text}
    </a>
  );
  // A status mark: a pill, filled when it's the current one.
  const pill = (status: string, label: string, Icon: LucideIcon) => (
    <button
      type="button"
      disabled={pending || a.status === status}
      onClick={() => onMark(status)}
      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-default ${
        a.status === status
          ? "border-ink bg-white text-ink shadow-sm"
          : "border-ink/12 bg-white text-ink/55 hover:border-ink/40 hover:text-ink disabled:opacity-50"
      }`}
    >
      <Icon className="size-3.5" /> {label}
    </button>
  );
  const decision = (kind: Decision, label: string, Icon: LucideIcon, style: string) => (
    <button
      type="button"
      onClick={() => onDecide(kind)}
      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${style}`}
    >
      <Icon className="size-3.5" /> {label}
    </button>
  );

  return (
    <li className={open ? "bg-bone/30" : ""}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center gap-4 px-4 py-3.5 text-left transition-colors hover:bg-bone/40"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-pink/30 text-sm font-medium text-brick">
          {`${a.name[0] ?? ""}${a.surname[0] ?? ""}`.toUpperCase()}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-ink">{fullName(a)}</span>
          <span className="block truncate text-xs text-ink/55">{a.job_title || "No job named"}</span>
        </span>
        <span className="hidden truncate text-xs text-ink/50 md:block md:w-56">{a.email}</span>
        <span className="hidden w-24 shrink-0 text-right text-xs text-ink/50 tabular-nums sm:block">{date(a.created_at)}</span>
        <span className="w-24 shrink-0 text-right">
          <Badge tone={TONE[a.status] ?? "stone"}>{statusLabel(a.status)}</Badge>
        </span>
        <ChevronDown className={`size-4 shrink-0 text-ink/35 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="space-y-5 border-t border-ink/8 px-4 pt-4 pb-5 md:px-6">
          <p className="text-xs text-ink/50">
            Applied for <span className="text-ink/75">{a.job_title || "a job"}</span> on {dateTime(a.created_at)}
          </p>

          <div className="grid gap-6 md:grid-cols-2">
            <section>
              <h4 className="mb-1 text-xs font-medium tracking-wide text-ink/45 uppercase">Contact</h4>
              <div className="divide-y divide-ink/6">
                {item("Email", a.email && link(`mailto:${a.email}`, a.email, Mail))}
                {item("Phone", a.phone && link(`tel:${a.phone}`, a.phone, Phone))}
                {item(
                  "Address",
                  a.address && (
                    <span className="inline-flex items-start gap-1.5">
                      <MapPin className="mt-0.5 size-3.5 shrink-0 text-ink/40" /> {a.address}
                    </span>
                  ),
                )}
              </div>
            </section>
            <section>
              <h4 className="mb-2 text-xs font-medium tracking-wide text-ink/45 uppercase">CV</h4>
              <div className="flex items-center gap-3 rounded-xl border border-ink/10 bg-white p-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-pink/20">
                  <FileText className="size-5 text-brick" strokeWidth={1.5} />
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-ink">{fullName(a)} CV.pdf</span>
                <a href={cv} target="_blank" rel="noopener noreferrer" className={`${button.secondary} px-3! py-1.5! text-xs`}>
                  <Eye className="size-3.5" /> Open
                </a>
                <a href={`${cv}?download`} className={`${button.secondary} px-3! py-1.5! text-xs`}>
                  <Download className="size-3.5" /> Download
                </a>
              </div>
            </section>
          </div>

          {/* At Interview: when it is. */}
          {a.status === "interview" && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink/10 bg-white px-4 py-3">
              <span className="text-sm text-ink">
                {a.interview_at ? (
                  <span className="font-medium">Interview: {dateTime(a.interview_at)}</span>
                ) : (
                  <span className="text-ink/60">Invited to an interview: no time set yet.</span>
                )}
              </span>
              <button type="button" onClick={() => onDecide("interview")} className={`${button.secondary} px-3! py-1.5! text-xs`}>
                <CalendarDays className="size-3.5" /> {a.interview_at ? "Move" : "Set a time"}
              </button>
            </div>
          )}

          <section>
            <Field label="Team notes" hint="Only the team sees these.">
              <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className={textareaClass} placeholder="First impressions, who's meeting them…" />
            </Field>
            {notes !== a.notes && (
              <div className="mt-2 flex gap-2">
                <button type="button" onClick={() => onSaveNotes(notes)} disabled={pending} className={`${button.primary} px-3! py-1.5! text-xs`}>
                  Save notes
                </button>
                <button type="button" onClick={() => setNotes(a.notes)} className={`${button.ghost} text-xs`}>
                  Discard
                </button>
              </div>
            )}
          </section>

          {/* The controls: marks for the team, then the decisions, which email. */}
          <div className="space-y-3 border-t border-ink/10 pt-4">
            <h4 className="text-xs font-medium tracking-wide text-ink/45 uppercase">Update status</h4>
            <div className="flex flex-wrap items-center gap-2">
              {pill("new", "Mark as new", Clock)}
              {pill("reviewing", "Reviewing", Search)}
              {pill("hired", "Hired", Trophy)}
              {pill("closed", "Close, no email", Archive)}
              <span aria-hidden="true" className="mx-1 hidden h-5 border-l border-ink/12 sm:block" />
              {decision("interview", a.status === "interview" ? "Move interview" : "Invite to interview", CalendarDays, "border border-ink bg-white text-ink hover:bg-ink hover:text-bone")}
              {decision("offer", "Make an offer", Handshake, "bg-ink text-bone hover:bg-green")}
              {decision("decline", "Decline", X, "border border-ink/15 bg-white text-ink/70 hover:border-pink hover:bg-pink/15 hover:text-brick")}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink/10 pt-4">
            <button type="button" onClick={onPreview} className={`${button.ghost} text-xs`}>
              <Mail className="size-3.5" /> Emails sent when they applied
            </button>
            <button type="button" onClick={onDelete} className={`${button.ghost} text-xs hover:text-brick!`}>
              <Trash2 className="size-3.5" /> Delete application
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

const WINDOW: Record<Decision, { title: string; send: string; done: (name: string) => string }> = {
  interview: { title: "Invite to an interview", send: "Mark Interview", done: (n) => `${n} invited` },
  offer: { title: "Make an offer", send: "Mark Offered", done: (n) => `${n} offered` },
  decline: { title: "Decline", send: "Mark Declined", done: (n) => `${n} declined` },
};

// A window over the page, as the waitlist's email windows are.
function Window({
  label,
  title,
  subtitle,
  busy = false,
  onClose,
  children,
  footer,
}: {
  label: string;
  title: string;
  subtitle: string;
  busy?: boolean;
  onClose: () => void;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (ev: KeyboardEvent) => ev.key === "Escape" && !busy && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [busy, onClose]);

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-ink/40 p-3 backdrop-blur-[2px]" onClick={busy ? undefined : onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        onClick={(ev) => ev.stopPropagation()}
        className="flex max-h-full w-full max-w-2xl animate-pop-in flex-col overflow-hidden rounded-2xl bg-white shadow-soft"
      >
        <header className="flex items-start justify-between gap-4 border-b border-ink/8 px-6 py-4">
          <div>
            <p className="font-publish text-2xl text-ink">{title}</p>
            <p className="mt-0.5 text-sm text-ink/55">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
            className="flex size-8 cursor-pointer items-center justify-center rounded-full text-ink/50 transition-colors hover:bg-bone hover:text-ink"
          >
            <X className="size-4" />
          </button>
        </header>
        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">{children}</div>
        <footer className="flex items-center justify-end gap-2 border-t border-ink/8 px-6 py-3.5">{footer}</footer>
      </div>
    </div>
  );
}

// An email as the person will read it.
function EmailPreview({ heading, email }: { heading: string; email: { to: string; subject: string; text: string } }) {
  return (
    <section>
      <h4 className="mb-2 text-xs font-medium tracking-wide text-ink/45 uppercase">{heading}</h4>
      <div className="rounded-xl border border-ink/10 bg-bone/30">
        <div className="space-y-0.5 border-b border-ink/8 px-4 py-3 text-xs text-ink/55">
          <p>
            To: <span className="text-ink">{email.to}</span>
          </p>
          <p>
            Subject: <span className="text-ink">{email.subject}</span>
          </p>
        </div>
        <p className="px-4 py-3 text-sm leading-relaxed whitespace-pre-line text-ink/85">{email.text}</p>
      </div>
    </section>
  );
}

const NOT_LIVE = (
  <p className="flex items-start gap-2 rounded-xl bg-yellow/25 px-4 py-3 text-xs leading-relaxed text-ink/70">
    <Info className="mt-px size-3.5 shrink-0" />
    Mailing isn&rsquo;t set up yet, so this email won&rsquo;t be sent: only their status changes. Once it&rsquo;s
    connected, this is exactly what they&rsquo;ll get.
  </p>
);

/* Before a decision: for Interview, when and where; a line of your own;
   and the email the applicant gets. */
function DecisionWindow({
  application: a,
  kind,
  onClose,
  onDone,
}: {
  application: JobApplication;
  kind: Decision;
  onClose: () => void;
  onDone: () => void;
}) {
  const toast = useToast();
  // The datetime-local value, in the browser's time: Pretoria's for the team.
  const [at, setAt] = useState(() => (a.interview_at ? toLocalInput(a.interview_at) : ""));
  const [place, setPlace] = useState("");
  const [note, setNote] = useState("");
  const [sending, start] = useTransition();
  const interviewAt = at ? new Date(at).toISOString() : undefined;
  const email = careerEmail(kind, a, { note, interviewAt, place });

  const confirm = () =>
    start(async () => {
      const result = await decideApplication(a.id, kind, { interviewAt });
      toast.result(result, WINDOW[kind].done(a.name));
      if (result.ok) onDone();
    });

  return (
    <Window
      label={`${WINDOW[kind].title}: ${fullName(a)}`}
      title={WINDOW[kind].title}
      subtitle={`${fullName(a)} · ${a.job_title}`}
      busy={sending}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={sending} className={button.ghost}>
            Cancel
          </button>
          <button type="button" onClick={confirm} disabled={sending} className={`${kind === "decline" ? button.danger : button.primary} disabled:opacity-50`}>
            {sending ? <Loader2 className="size-4 animate-spin" /> : kind === "decline" ? <X className="size-4" /> : <Check className="size-4" />}
            {sending ? "Saving…" : CAREER_EMAILS_LIVE ? `Send & ${WINDOW[kind].send.toLowerCase()}` : WINDOW[kind].send}
          </button>
        </>
      }
    >
      {!CAREER_EMAILS_LIVE && NOT_LIVE}
      {kind === "interview" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="When" hint="Leave empty to invite now and set the time later.">
            <DateTimePicker value={at} onChange={setAt} />
          </Field>
          <Field label="Where">
            <input value={place} onChange={(e) => setPlace(e.target.value)} className={inputClass} placeholder="Volley Brooklyn, or a video call link" />
          </Field>
        </div>
      )}
      <Field label="A line of your own" hint="Optional. Added to their email, before the sign-off.">
        <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} className={textareaClass} />
      </Field>
      <EmailPreview heading="Their email" email={email} />
    </Window>
  );
}

/* The two emails that go as someone applies, once mailing is set up: theirs
   ("we've got it") and the team's ("someone applied"). */
function ReceivedWindow({ application: a, onClose }: { application: JobApplication; onClose: () => void }) {
  const kinds: [CareerEmailKind, string][] = [
    ["received", "To them"],
    ["team", "To the team"],
  ];
  return (
    <Window
      label={`Emails on applying: ${fullName(a)}`}
      title="When they applied"
      subtitle={`${fullName(a)} · ${dateTime(a.created_at)}`}
      onClose={onClose}
      footer={
        <button type="button" onClick={onClose} className={button.primary}>
          Done
        </button>
      }
    >
      {!CAREER_EMAILS_LIVE && (
        <p className="flex items-start gap-2 rounded-xl bg-yellow/25 px-4 py-3 text-xs leading-relaxed text-ink/70">
          <Info className="mt-px size-3.5 shrink-0" />
          Mailing isn&rsquo;t set up yet, so these weren&rsquo;t sent. Once it is, every new application sends both.
        </p>
      )}
      {kinds.map(([kind, heading]) => (
        <EmailPreview key={kind} heading={heading} email={careerEmail(kind, a)} />
      ))}
    </Window>
  );
}

// An ISO time as a datetime-local input's value, in the browser's own zone.
function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
