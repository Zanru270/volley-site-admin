"use client";

/* eslint-disable @next/next/no-img-element -- a signed link to a private photo */
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  CalendarDays,
  Check,
  ChevronDown,
  Clock,
  Download,
  Expand,
  RotateCcw,
  Loader2,
  Mail,
  MessageSquare,
  Phone,
  PhoneCall,
  RotateCw,
  Sparkles,
  ThumbsUp,
  X,
  type LucideIcon,
} from "lucide-react";
import { Badge, button, CountPill, Field, SearchBox, textareaClass } from "@/components/ui";
import CustomSelect from "@/components/CustomSelect";
import { useAction } from "@/components/forms";
import { useToast } from "@/components/ToastProvider";
import {
  UNDECIDED,
  WAITLIST_STATUSES,
  WAITLIST_TABS,
  type InterviewSettings,
  type WaitlistEntry,
  type WaitlistTab,
} from "@/lib/waitlist";
import UnitPicker from "./UnitPicker";
import ScheduleWindow from "../ScheduleWindow";
import {
  acceptApplicant,
  acceptOffer,
  declineApplicant,
  inviteToInterview,
  previewEmail,
  resendPasswordLink,
  setWaitlistStatus,
  type EmailKind,
} from "./actions";

const statusLabel = (s: string) => WAITLIST_STATUSES.find((x) => x.value === s)?.label ?? s;
const TONE: Record<string, "yellow" | "pink" | "lemon" | "stone" | "ink"> = {
  new: "yellow",
  contacted: "pink",
  interview: "ink",
  offered: "pink",
  accepted: "lemon",
  declined: "stone",
  closed: "stone",
};
const TAB_LABELS: Record<WaitlistTab, string> = {
  new: "New",
  contacted: "Contacted",
  interview: "Interview",
  accepted: "Accepted",
  declined: "Declined",
  closed: "Closed",
  all: "Everyone",
};
const fullName = (e: WaitlistEntry) => `${e.name} ${e.surname}`.trim();
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

/* The waitlist's applications, as Bow + Arc's enquiries are laid out: a
   strip of counts, a building filter, a tab per status (with counts), and
   a row each, newest first, that opens in place with everything about the
   person, ID photo included, and the controls at its foot:

   - Mark new / Mark contacted / Close: marks for the team, no email.
   - Interview, Accept, Decline: each opens a window with the email the
     student will get (with room for a line of your own), and sends it, to
     their parent too, once confirmed. Accept picks the building and unit
     type to offer; once the Volley app is live (`accounts`), it picks a
     unit and makes their account instead (UnitPicker).

   `buildings` and `unitTypes`: what Accept and Interview can offer (the
   website's buildings, and the form's unit types). */
export default function ApplicationsList({
  entries,
  placements,
  accounts,
  buildings,
  unitTypes,
  interviews,
  initialOpen,
}: {
  entries: WaitlistEntry[];
  placements: Record<string, string>;
  accounts: boolean;
  buildings: string[];
  unitTypes: string[];
  // Who runs interviews and where, for scheduling one.
  interviews: InterviewSettings;
  // An application to start opened on (from the Interviews page), on its tab.
  initialOpen?: string;
}) {
  const router = useRouter();
  const startOn = entries.find((e) => e.id === initialOpen);
  const [tab, setTab] = useState<WaitlistTab>(() =>
    !startOn ? "new" : startOn.status === "offered" ? "contacted" : ((WAITLIST_TABS as readonly string[]).includes(startOn.status) ? (startOn.status as WaitlistTab) : "all"),
  );
  const [building, setBuilding] = useState("all");
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(startOn?.id ?? null);
  const [scheduling, setScheduling] = useState<WaitlistEntry | null>(null);
  const [emailing, setEmailing] = useState<{ entry: WaitlistEntry; kind: EmailKind } | null>(null);
  const [placing, setPlacing] = useState<WaitlistEntry | null>(null);
  const { pending, run } = useAction();
  // Read once on load, for "This week": reading the clock while drawing would change it.
  const [loadedAt] = useState(() => Date.now());

  const houses = [...new Set(entries.map((e) => e.house).filter(Boolean))].sort();
  const inBuilding = entries.filter((e) => building === "all" || e.house === building);
  const inTab = (t: WaitlistTab) => (t === "all" ? inBuilding : inBuilding.filter((e) => (t === "contacted" ? ["contacted", "offered"].includes(e.status) : e.status === t)));
  const q = search.trim().toLowerCase();
  const shown = inTab(tab).filter(
    (e) =>
      !q ||
      [fullName(e), e.email, e.phone, e.house, e.unit, `${e.parent_name} ${e.parent_surname}`, e.parent_email].some((t) =>
        t?.toLowerCase().includes(q),
      ),
  );

  const weekAgo = loadedAt - 7 * 24 * 3600_000;
  const stats: { label: string; value: number; hint: string; icon: LucideIcon; tab?: WaitlistTab }[] = [
    { label: "New", value: inTab("new").length, hint: "Not looked at yet", icon: Sparkles, tab: "new" },
    { label: "Interviews", value: inTab("interview").length, hint: "Shortlisted, deciding", icon: MessageSquare, tab: "interview" },
    { label: "Accepted", value: inTab("accepted").length, hint: "Given a place", icon: ThumbsUp, tab: "accepted" },
    {
      label: "This week",
      value: inBuilding.filter((e) => new Date(e.created_at).getTime() >= weekAgo).length,
      hint: "Applied in the last 7 days",
      icon: CalendarDays,
    },
  ];

  const mark = (e: WaitlistEntry, status: string) =>
    run(() => setWaitlistStatus(e.id, status), `Marked ${statusLabel(status).toLowerCase()}`).then((ok) => ok && router.refresh());
  const openDecision = (entry: WaitlistEntry, kind: EmailKind) =>
    kind === "accept" && accounts ? setPlacing(entry) : setEmailing({ entry, kind });

  return (
    <>
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
        <SearchBox value={search} onChange={setSearch} placeholder="Search names, emails, buildings..." />
        <div className="flex flex-wrap items-end gap-3">
          <CustomSelect
            label="Building"
            value={building}
            onChange={setBuilding}
            options={[{ value: "all", label: "All buildings" }, ...houses.map((h) => ({ value: h, label: h }))]}
            className="w-52"
          />
          <a href={`/waitlist/applications/export?status=${tab}`} className={`${button.secondary} py-2.5!`}>
            <Download className="size-4" /> Export CSV
          </a>
        </div>
      </div>

      {/* The tabs, underlined, each with its count. */}
      <div role="tablist" aria-label="Status" className="mb-5 flex items-center gap-6 overflow-x-auto border-b border-ink/10">
        {WAITLIST_TABS.map((t) => (
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
          {entries.length === 0 ? "No one has applied yet." : q ? `No one matches "${search}".` : "No one here."}
        </p>
      ) : (
        <ul className="divide-y divide-ink/8 overflow-hidden rounded-2xl border border-ink/10 bg-white">
          {shown.map((e) => (
            <Row
              key={e.id}
              entry={e}
              open={openId === e.id}
              onToggle={() => setOpenId(openId === e.id ? null : e.id)}
              placedIn={e.apartment_id ? placements[e.apartment_id] : undefined}
              pending={pending}
              accounts={accounts}
              onMark={(status) => mark(e, status)}
              onDecide={(kind) => openDecision(e, kind)}
              onResend={() => run(() => resendPasswordLink(e.id), "Link sent")}
              onSchedule={() => setScheduling(e)}
            />
          ))}
        </ul>
      )}

      {emailing && (
        <EmailWindow
          key={`${emailing.entry.id}:${emailing.kind}`}
          entry={emailing.entry}
          kind={emailing.kind}
          buildings={buildings}
          unitTypes={unitTypes}
          onClose={() => setEmailing(null)}
          onDone={() => {
            setEmailing(null);
            router.refresh();
          }}
        />
      )}

      {scheduling && (
        <ScheduleWindow
          key={scheduling.id}
          entry={scheduling}
          settings={interviews}
          onClose={() => setScheduling(null)}
          onDone={() => {
            setScheduling(null);
            router.refresh();
          }}
        />
      )}

      {placing && (
        <UnitPicker
          key={placing.id}
          entry={placing}
          accepting={pending}
          onClose={() => setPlacing(null)}
          onAccept={async (apartmentId) => {
            if (await run(() => acceptApplicant(placing.id, apartmentId), `${placing.name} accepted`)) {
              setPlacing(null);
              router.refresh();
            }
          }}
        />
      )}
    </>
  );
}

/* One application: its summary row, and below it, once opened, all of it
   and its controls. */
function Row({
  entry: e,
  open,
  onToggle,
  placedIn,
  pending,
  accounts,
  onMark,
  onDecide,
  onResend,
  onSchedule,
}: {
  entry: WaitlistEntry;
  open: boolean;
  onToggle: () => void;
  placedIn?: string;
  pending: boolean;
  accounts: boolean;
  onMark: (status: string) => void;
  onDecide: (kind: EmailKind) => void;
  onResend: () => void;
  onSchedule: () => void;
}) {
  const undecided = UNDECIDED.includes(e.status);
  const idPhoto = `/waitlist/applications/${e.id}/id-document`;
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
      disabled={pending || e.status === status}
      onClick={() => onMark(status)}
      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-default ${
        e.status === status
          ? "border-ink bg-white text-ink shadow-sm"
          : "border-ink/12 bg-white text-ink/55 hover:border-ink/40 hover:text-ink disabled:opacity-50"
      }`}
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
          {`${e.name[0] ?? ""}${e.surname[0] ?? ""}`.toUpperCase()}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-ink">{fullName(e)}</span>
          <span className="block truncate text-xs text-ink/55">{[e.house, e.unit].filter(Boolean).join(" · ")}</span>
        </span>
        <span className="hidden truncate text-xs text-ink/50 md:block md:w-56">{e.email}</span>
        <span className="hidden w-24 shrink-0 text-right text-xs text-ink/50 tabular-nums sm:block">{date(e.created_at)}</span>
        <span className="w-24 shrink-0 text-right">
          <Badge tone={TONE[e.status] ?? "stone"}>{statusLabel(e.status)}</Badge>
        </span>
        <ChevronDown className={`size-4 shrink-0 text-ink/35 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="space-y-5 border-t border-ink/8 px-4 pt-4 pb-5 md:px-6">
          <p className="text-xs text-ink/50">Applied {dateTime(e.created_at)}</p>
          <div className="grid gap-6 md:grid-cols-3">
            <section>
              <h4 className="mb-1 text-xs font-medium tracking-wide text-ink/45 uppercase">Student</h4>
              <div className="divide-y divide-ink/6">
                {item("Email", e.email && link(`mailto:${e.email}`, e.email, Mail))}
                {item("Phone", e.phone && link(`tel:${e.phone}`, e.phone, Phone))}
              </div>
            </section>
            <section>
              <h4 className="mb-1 text-xs font-medium tracking-wide text-ink/45 uppercase">Would like</h4>
              <div className="divide-y divide-ink/6">
                {item("Building", e.house)}
                {item("Unit type", e.unit)}
              </div>
            </section>
            <section>
              <h4 className="mb-1 text-xs font-medium tracking-wide text-ink/45 uppercase">Parent or guardian</h4>
              <div className="divide-y divide-ink/6">
                {item("Name", `${e.parent_name} ${e.parent_surname}`.trim())}
                {item("Phone", e.parent_phone && link(`tel:${e.parent_phone}`, e.parent_phone, Phone))}
                {item("Email", e.parent_email && link(`mailto:${e.parent_email}`, e.parent_email, Mail))}
              </div>
            </section>
          </div>

          <div className="grid gap-6 md:grid-cols-[minmax(0,18rem)_1fr]">
            <section>
              <h4 className="mb-2 text-xs font-medium tracking-wide text-ink/45 uppercase">Driver&rsquo;s licence or ID</h4>
              {e.id_document_path ? (
                <IdPhoto src={idPhoto} alt={`${fullName(e)}'s ID`} />
              ) : (
                <p className="rounded-xl bg-white px-4 py-3 text-sm text-ink/55">Not sent: they applied before the form asked for it.</p>
              )}
            </section>
            {(e.admin_notes || placedIn || e.decided_at) && (
              <section>
                <h4 className="mb-1 text-xs font-medium tracking-wide text-ink/45 uppercase">Decision</h4>
                <div className="divide-y divide-ink/6">
                  {item("Placed in", placedIn)}
                  {item("Decided", e.decided_at && dateTime(e.decided_at))}
                </div>
                {e.admin_notes && <p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-ink/75">{e.admin_notes}</p>}
              </section>
            )}
          </div>

          {/* At Interview: when it is, or a way to set it. */}
          {e.status === "interview" && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink/10 bg-white px-4 py-3">
              <span className="min-w-0 text-sm text-ink">
                {e.interview_at ? (
                  <>
                    <span className="font-medium">Interview: {dateTime(e.interview_at)}</span>
                    <span className="text-ink/55">
                      {" "}
                      · {e.interview_mode === "online" ? "Online" : e.interview_place}
                      {e.interview_with?.length ? ` · with ${e.interview_with.join(", ")}` : ""}
                    </span>
                  </>
                ) : (
                  <span className="text-ink/60">Invited to an interview: no time set yet.</span>
                )}
              </span>
              <button type="button" onClick={onSchedule} className={`${button.secondary} px-3! py-1.5! text-xs`}>
                <CalendarDays className="size-3.5" /> {e.interview_at ? "Move" : "Schedule"}
              </button>
            </div>
          )}

          {/* The controls: marks for the team, then the decisions, which email. */}
          <div className="space-y-3 border-t border-ink/10 pt-4">
            <h4 className="text-xs font-medium tracking-wide text-ink/45 uppercase">Update status</h4>
            {undecided || e.status === "closed" ? (
              <div className="flex flex-wrap items-center gap-2">
                {pill("new", "Mark as new", Clock)}
                {pill("contacted", "Mark contacted", PhoneCall)}
                {pill("closed", "Close, no email", Archive)}
                {undecided && (
                  <>
                    <span aria-hidden="true" className="mx-1 hidden h-5 border-l border-ink/12 sm:block" />
                    {/* Straight to a date, or an invite now and the date later. */}
                    <button
                      type="button"
                      onClick={onSchedule}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-ink bg-white px-3.5 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-ink hover:text-bone"
                    >
                      <CalendarDays className="size-3.5" /> {e.interview_at ? "Move interview" : "Schedule interview"}
                    </button>
                    {e.status !== "interview" && (
                      <button
                        type="button"
                        onClick={() => onDecide("interview")}
                        title="Tell them they're shortlisted; set the time later"
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-ink/15 bg-white px-3.5 py-1.5 text-xs font-medium text-ink/70 transition-colors hover:border-ink/40 hover:text-ink"
                      >
                        <MessageSquare className="size-3.5" /> Invite, date later
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onDecide("accept")}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-ink px-3.5 py-1.5 text-xs font-medium text-bone transition-colors hover:bg-green"
                    >
                      <Check className="size-3.5" /> Accept
                    </button>
                    <button
                      type="button"
                      onClick={() => onDecide("decline")}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-ink/15 bg-white px-3.5 py-1.5 text-xs font-medium text-ink/70 transition-colors hover:border-pink hover:bg-pink/15 hover:text-brick"
                    >
                      <X className="size-3.5" /> Decline
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3 text-sm text-ink/60">
                <Badge tone={TONE[e.status] ?? "stone"}>{statusLabel(e.status)}</Badge>
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="size-3.5" /> Emailed{e.decided_at ? ` ${date(e.decided_at)}` : ""}
                </span>
                {e.status === "accepted" && accounts && (
                  <button
                    type="button"
                    onClick={onResend}
                    disabled={pending}
                    title="Email them a new set-password link"
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-ink/55 transition-colors hover:bg-white hover:text-ink disabled:opacity-50"
                  >
                    <RotateCw className="size-3.5" /> Resend link
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

const WINDOW: Record<EmailKind, { title: string; send: string; done: (name: string) => string }> = {
  interview: { title: "Invite to an interview", send: "Send & mark Interview", done: (n) => `${n} invited` },
  accept: { title: "Accept", send: "Send & accept", done: (n) => `${n} accepted` },
  decline: { title: "Decline", send: "Send & decline", done: (n) => `${n} declined` },
};

/* Before an email goes: what it's for (the building, and for Accept the
   unit type, starting on what they asked for), a line of your own, and the
   email itself as the student will read it. Their parent gets theirs too,
   and for Interview and Accept, the team a note. */
function EmailWindow({
  entry: e,
  kind,
  buildings,
  unitTypes,
  onClose,
  onDone,
}: {
  entry: WaitlistEntry;
  kind: EmailKind;
  buildings: string[];
  unitTypes: string[];
  onClose: () => void;
  onDone: () => void;
}) {
  const toast = useToast();
  const [building, setBuilding] = useState(buildings.includes(e.house) ? e.house : (buildings[0] ?? e.house));
  const [roomType, setRoomType] = useState(unitTypes.includes(e.unit) ? e.unit : (unitTypes[0] ?? e.unit));
  const [note, setNote] = useState("");
  const [preview, setPreview] = useState<{ to: string; subject: string; text: string } | null>(null);
  const [sending, start] = useTransition();

  // The email as it stands, a moment after the last change.
  useEffect(() => {
    let live = true;
    const timer = setTimeout(async () => {
      const result = await previewEmail(e.id, kind, { building, roomType, note });
      if (live && result.ok) setPreview(result);
    }, 250);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [e.id, kind, building, roomType, note]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (ev: KeyboardEvent) => ev.key === "Escape" && !sending && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [sending, onClose]);

  const send = () =>
    start(async () => {
      const result =
        kind === "interview"
          ? await inviteToInterview(e.id, building, note)
          : kind === "accept"
            ? await acceptOffer(e.id, { building, roomType }, note)
            : await declineApplicant(e.id, note);
      toast.result(result, WINDOW[kind].done(e.name));
      if (result.ok) onDone();
    });

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-ink/40 p-3 backdrop-blur-[2px]" onClick={sending ? undefined : onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${WINDOW[kind].title}: ${fullName(e)}`}
        onClick={(ev) => ev.stopPropagation()}
        className="flex max-h-full w-full max-w-2xl animate-pop-in flex-col overflow-hidden rounded-2xl bg-white shadow-soft"
      >
        <header className="flex items-start justify-between gap-4 border-b border-ink/8 px-6 py-4">
          <div>
            <p className="font-publish text-2xl text-ink">{WINDOW[kind].title}</p>
            <p className="mt-0.5 text-sm text-ink/55">{fullName(e)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={sending}
            aria-label="Close"
            className="flex size-8 cursor-pointer items-center justify-center rounded-full text-ink/50 transition-colors hover:bg-bone hover:text-ink"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {kind !== "decline" && (
            <div className={`grid gap-4 ${kind === "accept" ? "sm:grid-cols-2" : ""}`}>
              <CustomSelect
                label={kind === "accept" ? "Building" : "Interview for"}
                value={building}
                onChange={setBuilding}
                options={[...new Set([...buildings, e.house].filter(Boolean))].map((b) => ({ value: b, label: `Volley ${b}` }))}
              />
              {kind === "accept" && (
                <CustomSelect
                  label="Unit type"
                  value={roomType}
                  onChange={setRoomType}
                  options={[...new Set([...unitTypes, e.unit].filter(Boolean))].map((u) => ({ value: u, label: u }))}
                />
              )}
            </div>
          )}
          <Field label="A line of your own" hint="Optional. Added to their email, before the sign-off.">
            <textarea rows={2} value={note} onChange={(ev) => setNote(ev.target.value)} className={textareaClass} placeholder="We loved your application!" />
          </Field>

          <section>
            <h4 className="mb-2 text-xs font-medium tracking-wide text-ink/45 uppercase">Their email</h4>
            <div className="rounded-xl border border-ink/10 bg-bone/30">
              {preview ? (
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
              ) : (
                <p className="flex items-center gap-2 px-4 py-6 text-sm text-ink/50">
                  <Loader2 className="size-4 animate-spin" /> Writing it…
                </p>
              )}
            </div>
            <p className="mt-2 text-xs text-ink/50">
              {e.parent_email ? `Their parent (${e.parent_email}) gets one too.` : "They gave no parent's email."}
              {kind !== "decline" && " The team gets a note with their details, to follow up."}
            </p>
          </section>
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-ink/8 px-6 py-3.5">
          <button type="button" onClick={onClose} disabled={sending} className={button.ghost}>
            Cancel
          </button>
          <button
            type="button"
            onClick={send}
            disabled={sending || !preview}
            className={`${kind === "decline" ? button.danger : button.primary} disabled:opacity-50`}
          >
            {sending ? <Loader2 className="size-4 animate-spin" /> : kind === "decline" ? <X className="size-4" /> : <Check className="size-4" />}
            {sending ? "Sending…" : WINDOW[kind].send}
          </button>
        </footer>
      </div>
    </div>
  );
}


/* An applicant's ID photo: turned a quarter at a time with its arrows
   (photos taken on a phone often arrive on their side), and opened large
   over the page, on this site, with the same arrows. The turn is only how
   it's shown here: the photo itself isn't changed. */
function IdPhoto({ src, alt }: { src: string; alt: string }) {
  const [turn, setTurn] = useState(0);
  const [ratio, setRatio] = useState(1);
  const [large, setLarge] = useState(false);
  // On its side, it's shrunk to still fit the same box.
  const sideways = turn % 2 !== 0;
  const fit = sideways ? Math.min(ratio, 1 / ratio) : 1;
  const style = { transform: `rotate(${turn * 90}deg) scale(${fit})` };
  const turnBy = (n: number) => setTurn((t) => (t + n + 4) % 4);

  useEffect(() => {
    if (!large) return;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") setLarge(false);
      if (ev.key === "ArrowLeft") turnBy(-1);
      if (ev.key === "ArrowRight") turnBy(1);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [large]);

  const tool = "flex size-8 cursor-pointer items-center justify-center rounded-full bg-white/90 text-ink/70 shadow-sm transition-colors hover:bg-white hover:text-ink";
  const turners = (dark = false) => {
    const cls = dark
      ? "flex size-10 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
      : tool;
    return (
      <>
        <button type="button" onClick={() => turnBy(-1)} aria-label="Turn left" title="Turn left" className={cls}>
          <RotateCcw className="size-4" />
        </button>
        <button type="button" onClick={() => turnBy(1)} aria-label="Turn right" title="Turn right" className={cls}>
          <RotateCw className="size-4" />
        </button>
      </>
    );
  };

  return (
    <>
      <div className="relative overflow-hidden rounded-xl border border-ink/10 bg-white">
        <button type="button" onClick={() => setLarge(true)} className="block h-48 w-full cursor-zoom-in" aria-label="Open the ID photo large">
          <img
            src={src}
            alt={alt}
            onLoad={(ev) => setRatio(ev.currentTarget.naturalWidth / ev.currentTarget.naturalHeight || 1)}
            style={style}
            className="size-full object-contain transition-transform duration-300"
          />
        </button>
        <div className="absolute right-2 bottom-2 flex gap-1.5">
          {turners()}
          <button type="button" onClick={() => setLarge(true)} aria-label="Open large" title="Open large" className={tool}>
            <Expand className="size-4" />
          </button>
        </div>
      </div>

      {large && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={alt}
          className="fixed inset-0 z-110 flex flex-col bg-ink/90 backdrop-blur-sm"
          onClick={() => setLarge(false)}
        >
          <div className="flex items-center justify-between gap-3 px-4 py-3" onClick={(ev) => ev.stopPropagation()}>
            <p className="truncate text-sm text-white/80">{alt}</p>
            <div className="flex gap-2">
              {turners(true)}
              <button
                type="button"
                onClick={() => setLarge(false)}
                aria-label="Close"
                className="flex size-10 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
              >
                <X className="size-5" />
              </button>
            </div>
          </div>
          {/* The photo as large as fits; on its side, it's shrunk to still fit. */}
          <div className="flex min-h-0 flex-1 items-center justify-center p-4 sm:p-8">
            <img
              src={src}
              alt={alt}
              onClick={(ev) => ev.stopPropagation()}
              style={style}
              className="max-h-full max-w-full object-contain transition-transform duration-300"
            />
          </div>
          <p className="pb-4 text-center text-xs text-white/50">← → to turn it · Esc to close</p>
        </div>
      )}
    </>
  );
}
