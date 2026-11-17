"use client";

import { useEffect, useOptimistic, useState } from "react";
import {
  CalendarDays,
  CalendarRange,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Mail,
  Phone,
  RotateCcw,
  UserX,
  X,
  type LucideIcon,
} from "lucide-react";
import { Badge, button, CountPill, SearchBox } from "@/components/ui";
import CustomSelect from "@/components/CustomSelect";
import { useAction } from "@/components/forms";
import { useConfirm } from "@/components/ConfirmProvider";
import { BOOKING_STATUSES, type Booking, type BookingStatus } from "@/lib/bookings";
import { setBookingStatus } from "./actions";

/* The tour bookings: a month's calendar along the top, each day with its
   tours, and a click on a day opens them in a panel from the right, by
   time. The building picked over the calendar filters the whole page.
   Under it, as the Applications page lays out the waitlist: the counts, a
   search, tabs, then the bookings under a heading for each day. Upcoming ones run soonest first, past ones latest
   first. A row opens to the person's details and the marks for how it
   went; each shows at once and goes back if it couldn't be saved.
   Cancelling asks first: it frees the place on the website, and the person
   isn't told. */

type Tab = "upcoming" | "past" | "cancelled" | "all";
const TABS: { value: Tab; label: string }[] = [
  { value: "upcoming", label: "Upcoming" },
  { value: "past", label: "Past" },
  { value: "cancelled", label: "Cancelled" },
  { value: "all", label: "All" },
];

const statusLabel = (s: string) => BOOKING_STATUSES.find((x) => x.value === s)?.label ?? s;
const TONE: Record<string, "yellow" | "pink" | "lemon" | "stone" | "ink"> = {
  booked: "yellow",
  attended: "lemon",
  no_show: "pink",
  cancelled: "stone",
};

// Dates and times as Pretoria has them.
const ZONE = "Africa/Johannesburg";
const todayISO = () => new Intl.DateTimeFormat("en-CA", { timeZone: ZONE }).format(new Date());
const addDays = (iso: string, days: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};
const dayHeading = (iso: string, today: string) => {
  const label = new Intl.DateTimeFormat("en-ZA", {
    weekday: "long",
    day: "numeric",
    month: "long",
    ...(iso.slice(0, 4) !== today.slice(0, 4) ? { year: "numeric" } : {}),
    timeZone: "UTC",
  }).format(new Date(`${iso}T00:00:00Z`));
  if (iso === today) return `Today, ${label}`;
  if (iso === addDays(today, 1)) return `Tomorrow, ${label}`;
  return label;
};
const bookedOn = (iso: string) =>
  new Date(iso).toLocaleString("en-ZA", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: ZONE,
  });
const fullName = (b: Booking) => `${b.name} ${b.surname}`.trim();
const building = (b: Booking) => b.house_name.replace(/^Volley /, "") || b.house;

export default function BookingsList({ bookings: saved }: { bookings: Booking[] }) {
  const [bookings, showStatus] = useOptimistic(saved, (all, { id, status }: { id: string; status: string }) =>
    all.map((b) => (b.id === id ? { ...b, status } : b)),
  );
  const [tab, setTab] = useState<Tab>("upcoming");
  const [house, setHouse] = useState("all");
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  // The calendar's month ("YYYY-MM") and the day open in the panel.
  const [month, setMonth] = useState(() => todayISO().slice(0, 7));
  const [day, setDay] = useState<string | null>(null);
  const { pending, run } = useAction();
  const confirm = useConfirm();
  // Read once on load: reading the clock while drawing would change it.
  const [today] = useState(todayISO);
  const weekOn = addDays(today, 7);

  const houses = [...new Map(bookings.map((b) => [b.house, building(b)])).entries()].sort((a, b) => a[1].localeCompare(b[1]));
  const inHouse = bookings.filter((b) => house === "all" || b.house === house);
  const live = (b: Booking) => b.status !== "cancelled";
  const inTab = (t: Tab) =>
    t === "upcoming"
      ? inHouse.filter((b) => live(b) && b.date >= today)
      : t === "past"
        ? inHouse.filter((b) => live(b) && b.date < today)
        : t === "cancelled"
          ? inHouse.filter((b) => !live(b))
          : inHouse;
  const q = search.trim().toLowerCase();
  const matching = inTab(tab).filter(
    (b) => !q || [fullName(b), b.email, b.phone, building(b), b.party, b.notes].some((t) => t?.toLowerCase().includes(q)),
  );
  // Soonest first for what's coming; latest first for the rest.
  const soonestFirst = tab === "upcoming";
  const shown = [...matching].sort((a, b) => {
    const x = `${a.date} ${a.start_time}`;
    const y = `${b.date} ${b.start_time}`;
    return soonestFirst ? x.localeCompare(y) : y.localeCompare(x);
  });
  const days: { date: string; bookings: Booking[] }[] = [];
  for (const b of shown) {
    const last = days[days.length - 1];
    if (last?.date === b.date) last.bookings.push(b);
    else days.push({ date: b.date, bookings: [b] });
  }

  const upcoming = inTab("upcoming");
  const stats: { label: string; value: number; hint: string; icon: LucideIcon; tab?: Tab }[] = [
    { label: "Today", value: upcoming.filter((b) => b.date === today).length, hint: "Viewings today", icon: Clock },
    {
      label: "Next 7 days",
      value: upcoming.filter((b) => b.date < weekOn).length,
      hint: "Including today",
      icon: CalendarDays,
    },
    { label: "Upcoming", value: upcoming.length, hint: "Every booking still to come", icon: CalendarRange, tab: "upcoming" },
    {
      label: "No-shows",
      value: inHouse.filter((b) => b.status === "no_show").length,
      hint: "Booked, didn't come",
      icon: UserX,
    },
  ];

  const mark = async (b: Booking, status: BookingStatus) => {
    if (
      status === "cancelled" &&
      !(await confirm({
        title: "Cancel this booking?",
        message: `${fullName(b)}'s place frees up on the website for someone else. They aren't told: let them know yourself.`,
        confirmText: "Cancel booking",
        variant: "warning",
      }))
    )
      return;
    await run(() => setBookingStatus(b.id, status), `Marked ${statusLabel(status).toLowerCase()}`, undefined, () =>
      showStatus({ id: b.id, status }),
    );
  };

  const rowProps = (b: Booking) => ({
    booking: b,
    open: openId === b.id,
    onToggle: () => setOpenId(openId === b.id ? null : b.id),
    pending,
    onMark: (status: BookingStatus) => mark(b, status),
  });

  return (
    <>
      <Calendar
        month={month}
        onMonth={setMonth}
        today={today}
        bookings={inHouse}
        selected={day}
        onSelect={setDay}
        building={
          <CustomSelect
            label="Building"
            value={house}
            onChange={setHouse}
            options={[{ value: "all", label: "All buildings" }, ...houses.map(([value, label]) => ({ value, label }))]}
            className="w-52"
          />
        }
      />

      {day && (
        <DayPanel
          title={dayHeading(day, today)}
          bookings={inHouse.filter((b) => b.date === day)}
          onClose={() => setDay(null)}
          row={(b) => <Row key={b.id} {...rowProps(b)} />}
        />
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

      <div className="mb-4 rounded-2xl border border-ink/10 bg-white p-4">
        <SearchBox value={search} onChange={setSearch} placeholder="Search names, emails, phone numbers..." />
      </div>

      {/* The tabs, underlined, each with its count. */}
      <div role="tablist" aria-label="When" className="mb-5 flex items-center gap-6 overflow-x-auto border-b border-ink/10">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={tab === t.value}
            onClick={() => setTab(t.value)}
            className={`-mb-px shrink-0 cursor-pointer border-b-2 pb-3 text-sm font-medium whitespace-nowrap transition-colors ${
              tab === t.value ? "border-ink text-ink" : "border-transparent text-ink/50 hover:text-ink"
            }`}
          >
            {t.label} <span className={tab === t.value ? "text-ink/45" : "text-ink/30"}>({inTab(t.value).length})</span>
          </button>
        ))}
        <span className="ml-auto shrink-0 pb-3">
          <CountPill>
            {shown.length} {shown.length === 1 ? "booking" : "bookings"}
          </CountPill>
        </span>
      </div>

      {shown.length === 0 ? (
        <p className="rounded-2xl border border-ink/10 bg-white px-6 py-14 text-center text-sm text-ink/50">
          {bookings.length === 0
            ? "No one has booked a tour yet."
            : q
              ? `No one matches "${search}".`
              : tab === "upcoming"
                ? "No tours coming up."
                : "None here."}
        </p>
      ) : (
        <div className="space-y-6">
          {days.map((group) => (
            <section key={group.date} aria-label={dayHeading(group.date, today)}>
              <h2 className="mb-2 flex items-baseline justify-between gap-3 px-1 text-sm font-medium text-ink">
                {dayHeading(group.date, today)}
                <span className="text-xs font-normal text-ink/45">
                  {group.bookings.length} {group.bookings.length === 1 ? "booking" : "bookings"}
                </span>
              </h2>
              <ul className="divide-y divide-ink/8 overflow-hidden rounded-2xl border border-ink/10 bg-white">
                {group.bookings.map((b) => (
                  <Row key={b.id} {...rowProps(b)} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
// The month after (or before, with -1) "YYYY-MM".
const shiftMonth = (month: string, by: number) => {
  const d = new Date(`${month}-01T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + by);
  return d.toISOString().slice(0, 7);
};
// Monday 0 … Sunday 6.
const weekdayOf = (iso: string) => (new Date(`${iso}T00:00:00Z`).getUTCDay() + 6) % 7;

/* A month, Monday first, in whole weeks: the days either side from the
   months around it, dimmed. Each day shows its tours (cancelled ones not
   counted): how many, and from md the times with how many at each. Any
   day opens in the panel, even one without tours. */
function Calendar({
  month,
  onMonth,
  today,
  bookings,
  selected,
  onSelect,
  building,
}: {
  month: string;
  onMonth: (month: string) => void;
  today: string;
  bookings: Booking[];
  selected: string | null;
  onSelect: (day: string) => void;
  building: React.ReactNode;
}) {
  const first = `${month}-01`;
  const start = addDays(first, -weekdayOf(first));
  const last = addDays(`${shiftMonth(month, 1)}-01`, -1);
  const end = addDays(last, 6 - weekdayOf(last));
  const cells: string[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) cells.push(d);

  // The month's tours by day, then by start time: { "2026-11-19": { "10:00": 2 } }.
  const byDay = new Map<string, Map<string, number>>();
  for (const b of bookings) {
    if (b.status === "cancelled" || b.date < start || b.date > end) continue;
    const times = byDay.get(b.date) ?? new Map<string, number>();
    times.set(b.start_time, (times.get(b.start_time) ?? 0) + 1);
    byDay.set(b.date, times);
  }
  const inMonth = bookings.filter((b) => b.status !== "cancelled" && b.date.startsWith(month)).length;
  const title = new Intl.DateTimeFormat("en-ZA", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${first}T00:00:00Z`),
  );

  return (
    <section aria-label="Calendar" className="mb-6 rounded-2xl border border-ink/10 bg-white p-4 sm:p-5">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="font-publish text-3xl leading-none text-ink">{title}</h2>
          <p className="mt-1.5 text-xs text-ink/50">
            {inMonth} {inMonth === 1 ? "tour" : "tours"} booked. Click a day to see its times.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          {building}
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => onMonth(shiftMonth(month, -1))} aria-label="The month before" className={`${button.secondary} px-2! py-2!`}>
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => onMonth(today.slice(0, 7))}
              disabled={month === today.slice(0, 7)}
              className={`${button.secondary} px-3! py-2! text-xs disabled:opacity-50`}
            >
              This month
            </button>
            <button type="button" onClick={() => onMonth(shiftMonth(month, 1))} aria-label="The month after" className={`${button.secondary} px-2! py-2!`}>
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
        {WEEKDAYS.map((w) => (
          <span key={w} className="pb-1 text-center text-[11px] font-medium tracking-wide text-ink/45 uppercase">
            {w}
          </span>
        ))}
        {cells.map((d) => {
          const times = byDay.get(d);
          const count = times ? [...times.values()].reduce((a, n) => a + n, 0) : 0;
          const own = d.startsWith(month);
          const label = `${dayHeading(d, today)}: ${count ? `${count} ${count === 1 ? "tour" : "tours"}` : "no tours"}`;
          return (
            <button
              key={d}
              type="button"
              onClick={() => onSelect(d)}
              aria-label={label}
              aria-pressed={selected === d}
              className={`flex min-h-14 cursor-pointer flex-col items-stretch rounded-lg border p-1.5 text-left transition-colors sm:min-h-24 sm:p-2 ${
                selected === d
                  ? "border-ink bg-bone/40"
                  : count
                    ? "border-pink/60 bg-pink/12 hover:border-brick/50"
                    : "border-ink/8 hover:border-ink/25"
              } ${own ? "" : "opacity-40"}`}
            >
              <span className="flex items-center justify-between gap-1">
                <span
                  className={`flex size-6 items-center justify-center rounded-full text-xs tabular-nums ${
                    d === today ? "bg-ink font-semibold text-bone" : "text-ink/70"
                  }`}
                >
                  {Number(d.slice(8))}
                </span>
                {count > 0 && (
                  <span className="rounded-full bg-brick px-1.5 text-[10px] leading-4 font-semibold text-bone tabular-nums">{count}</span>
                )}
              </span>
              {/* The times, from sm: a few, then how many more. */}
              {times && (
                <span className="mt-1 hidden flex-col gap-0.5 sm:flex">
                  {[...times.entries()]
                    .sort(([a], [b]) => a.localeCompare(b))
                    .slice(0, 3)
                    .map(([time, n]) => (
                      <span key={time} className="truncate rounded bg-white/80 px-1 text-[11px] leading-4 text-ink/75 tabular-nums">
                        {time}
                        {n > 1 && <span className="text-ink/45"> ×{n}</span>}
                      </span>
                    ))}
                  {times.size > 3 && <span className="px-1 text-[11px] text-ink/45">+{times.size - 3} more</span>}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}

/* A day's tours in a panel from the right, by time: each time with its
   building and who's showing it, then the people booked, opened and
   marked as in the list. Cancelled ones stay, crossed out. Escape, the
   cross or a click on the page behind closes it. */
function DayPanel({
  title,
  bookings,
  onClose,
  row,
}: {
  title: string;
  bookings: Booking[];
  onClose: () => void;
  row: (booking: Booking) => React.ReactNode;
}) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      // A confirm opened from the panel closes itself first.
      if (e.key === "Escape" && document.querySelectorAll('[aria-modal="true"]').length < 2) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  // By start time, then building: one group per viewing slot.
  const slots = new Map<string, Booking[]>();
  for (const b of [...bookings].sort((a, z) => `${a.start_time}${a.house}`.localeCompare(`${z.start_time}${z.house}`))) {
    const key = `${b.start_time}|${b.house}`;
    slots.set(key, [...(slots.get(key) ?? []), b]);
  }
  const live = bookings.filter((b) => b.status !== "cancelled").length;

  return (
    <div className="fixed inset-0 z-100 flex justify-end md:p-3">
      <div className="absolute inset-0 animate-fade-in bg-ink/35" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="day-panel-title"
        className="relative flex h-full w-full max-w-xl animate-drawer-in flex-col overflow-hidden bg-white shadow-2xl md:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-ink/8 px-6 py-4 md:px-7 md:py-5">
          <div>
            <h2 id="day-panel-title" className="font-publish text-2xl text-ink">
              {title}
            </h2>
            <p className="mt-1 text-xs text-ink/50">
              {live ? `${live} ${live === 1 ? "tour" : "tours"} booked` : "No tours booked"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="cursor-pointer rounded-full p-2 text-ink/40 transition-colors hover:bg-ink/5 hover:text-ink"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="flex-1 space-y-5 overflow-y-auto p-4 md:p-6">
          {slots.size === 0 ? (
            <p className="rounded-2xl bg-bone/40 px-6 py-14 text-center text-sm text-ink/50">No one has booked a tour on this day.</p>
          ) : (
            [...slots.values()].map((list) => {
              const b = list[0];
              const booked = list.filter((x) => x.status !== "cancelled").length;
              return (
                <section key={`${b.start_time}|${b.house}`}>
                  <h3 className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 px-1">
                    <span className="text-sm font-semibold text-ink tabular-nums">
                      {b.start_time}–{b.end_time} <span className="font-normal text-ink/55">· {b.house_name}</span>
                    </span>
                    <span className="text-xs text-ink/45">
                      {booked} booked{b.hosts && ` · shown by ${b.hosts}`}
                    </span>
                  </h3>
                  <ul className="divide-y divide-ink/8 overflow-hidden rounded-2xl border border-ink/10 bg-white">
                    {list.map((x) => row(x))}
                  </ul>
                </section>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function Row({
  booking: b,
  open,
  onToggle,
  pending,
  onMark,
}: {
  booking: Booking;
  open: boolean;
  onToggle: () => void;
  pending: boolean;
  onMark: (status: BookingStatus) => void;
}) {
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
  const pill = (status: BookingStatus, label: string, Icon: LucideIcon) => (
    <button
      type="button"
      disabled={pending || b.status === status}
      onClick={() => onMark(status)}
      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-default ${
        b.status === status
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
        <span className="w-24 shrink-0 text-sm font-medium text-ink tabular-nums">
          {b.start_time}–{b.end_time}
        </span>
        <span className="min-w-0 flex-1">
          <span className={`block truncate text-sm font-medium text-ink ${b.status === "cancelled" ? "line-through decoration-ink/40" : ""}`}>
            {fullName(b)}
          </span>
          <span className="block truncate text-xs text-ink/55">{[building(b), b.party].filter(Boolean).join(" · ")}</span>
        </span>
        <span className="hidden truncate text-xs text-ink/50 md:block md:w-56">{b.email}</span>
        <span className="w-24 shrink-0 text-right">
          <Badge tone={TONE[b.status] ?? "stone"}>{statusLabel(b.status)}</Badge>
        </span>
        <ChevronDown className={`size-4 shrink-0 text-ink/35 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="space-y-5 border-t border-ink/8 px-4 pt-4 pb-5 md:px-6">
          <p className="text-xs text-ink/50">Booked {bookedOn(b.created_at)}</p>
          <div className="grid gap-6 md:grid-cols-2">
            <section>
              <h4 className="mb-1 text-xs font-medium tracking-wide text-ink/45 uppercase">Visitor</h4>
              <div className="divide-y divide-ink/6">
                {item("Email", b.email && link(`mailto:${b.email}`, b.email, Mail))}
                {item("Phone", b.phone && link(`tel:${b.phone}`, b.phone, Phone))}
                {item("Coming", b.party)}
              </div>
            </section>
            <section>
              <h4 className="mb-1 text-xs font-medium tracking-wide text-ink/45 uppercase">Viewing</h4>
              <div className="divide-y divide-ink/6">
                {item("Building", b.house_name)}
                {item("Time", `${b.start_time}–${b.end_time}`)}
                {item("Shown by", b.hosts)}
              </div>
            </section>
          </div>
          {b.notes && (
            <section>
              <h4 className="mb-1 text-xs font-medium tracking-wide text-ink/45 uppercase">Their note</h4>
              <p className="rounded-xl bg-white px-4 py-3 text-sm whitespace-pre-line text-ink/80">{b.notes}</p>
            </section>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-xs text-ink/45">Mark as</span>
            {pill("booked", "Booked", RotateCcw)}
            {pill("attended", "Attended", Check)}
            {pill("no_show", "No-show", UserX)}
            {pill("cancelled", "Cancelled", X)}
          </div>
        </div>
      )}
    </li>
  );
}
