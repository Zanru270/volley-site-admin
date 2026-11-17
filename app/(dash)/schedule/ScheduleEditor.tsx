"use client";

import { useState } from "react";
import { CalendarX2, Clock, Plus, Trash2, Users, X } from "lucide-react";
import { button, Card, Field, iconButtonDanger, inputClass, labelClass } from "@/components/ui";
import SaveBar from "@/components/SaveBar";
import EditModal from "@/components/EditModal";
import CustomSelect from "@/components/CustomSelect";
import { StringList, useSettingsForm } from "@/components/forms";
import { useLeaveGuard } from "@/lib/navigation-guard";
import { useDraftBackup, useSaveWhenOnline } from "@/lib/offline";
import type { ViewingExtraTime, ViewingWindow, Viewings } from "@/lib/types";
import { DAY_NAMES, daysLabel, EXTRA_HOSTS, WEEK } from "@/lib/viewings";
import { saveViewings } from "./actions";
import { DatePicker, TimePicker } from "@/components/DatePicker";

const SHORT = (n: number) => DAY_NAMES[n].slice(0, 3);

// Each building's colour in the week, by its place in the list.
const TONES = [
  "border-yellow bg-yellow/35",
  "border-[#90CDF4] bg-[#90CDF4]/30",
  "border-[#F3AD55] bg-[#F3AD55]/30",
  "border-lemon bg-lemon/40",
  "border-pink bg-pink/30",
  "border-stone bg-stone/25",
];

const toMinutes = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};
const toTime = (mins: number) =>
  `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
const weekdayOf = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
};
const todayISO = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Johannesburg" }).format(new Date());
const addDays = (iso: string, n: number) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};
const longDate = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

/* The start times Book a Tour offers `house` on `iso`, as the site works
   them out (viewingsOn in its lib/viewings.js), before anyone books and
   whatever the notice: the week's (`weekly`), and the extra times added
   for that date (`extras`). `closed`: none at all that day. `later`: past
   how far ahead people can book, so not offered yet. */
function dayTimes(v: Viewings, house: string, iso: string) {
  const day = weekdayOf(iso);
  const weekly = new Set<string>();
  for (const w of v.windows) {
    if (!w.weekdays.includes(day) || !w.houses.includes(house)) continue;
    for (let t = toMinutes(w.from); t + v.rules.minutes <= toMinutes(w.to); t += v.rules.step) weekly.add(toTime(t));
  }
  const extras = (v.extras.find((x) => x.house === house && x.date === iso)?.times ?? []).filter((t) => t.from && !weekly.has(t.from));
  return {
    day,
    weekly: [...weekly].sort(),
    extras: [...extras].sort((a, b) => a.from.localeCompare(b.from)),
    closed: v.rules.closed.includes(iso),
    later: iso > addDays(todayISO(), v.rules.bookAheadDays),
  };
}

const shortDate = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-ZA", { weekday: "short", day: "numeric", month: "short" });


const newWindow = (houses: string[]): ViewingWindow => ({
  weekdays: [],
  from: "10:00",
  to: "11:00",
  houses: houses.slice(0, 1),
  hosts: "",
});

/* The viewing schedule, laid out as the week it is: a column a day, each
   viewing a chip in its buildings' colour, at its time. A viewing that
   runs on several days shows on each; a click opens it in a panel (its
   days, time, buildings and hosts) where a change applies to every day it
   runs on. Under it, the rules that turn each viewing into the times
   people can pick, written as sentences, and a preview of what that comes
   to for a building on a date. The save bar comes up once anything changes.

   `houses`: every building, in the website's order, with its name. */
export default function ScheduleEditor({
  initial,
  houses,
}: {
  initial: Viewings;
  houses: { slug: string; name: string }[];
}) {
  const { value: v, setValue: setV, saved, dirty, pending, save, reset } = useSettingsForm(initial, saveViewings);
  useLeaveGuard(dirty);
  // Unsaved changes kept on this device; Save waits out a lost connection.
  useDraftBackup("schedule", v, saved, setV);
  const saveOnline = useSaveWhenOnline(save);

  const nameOf = (slug: string) => houses.find((h) => h.slug === slug)?.name ?? slug;
  const toneOf = (slug: string) => TONES[Math.max(0, houses.findIndex((h) => h.slug === slug)) % TONES.length];
  const setRule = (key: keyof Viewings["rules"], value: number) => setV({ ...v, rules: { ...v.rules, [key]: value } });
  const toggle = <T,>(list: T[], item: T) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);

  /* The viewing open in the panel: its place in the list (null for a new
     one), and the copy being edited, which Done writes back. */
  const [editing, setEditing] = useState<{ index: number | null; window: ViewingWindow } | null>(null);
  const openWindow = (index: number) => setEditing({ index, window: v.windows[index] });
  const addWindow = (day?: number) => {
    const w = newWindow(houses.map((h) => h.slug));
    setEditing({ index: null, window: day === undefined ? w : { ...w, weekdays: [day] } });
  };
  const apply = () => {
    if (!editing) return;
    const windows =
      editing.index === null
        ? [...v.windows, editing.window]
        : v.windows.map((w, i) => (i === editing.index ? editing.window : w));
    setV({ ...v, windows });
    setEditing(null);
  };
  const remove = () => {
    if (editing?.index != null) setV({ ...v, windows: v.windows.filter((_, i) => i !== editing.index) });
    setEditing(null);
  };
  const setDraft = (patch: Partial<ViewingWindow>) => setEditing((e) => e && { ...e, window: { ...e.window, ...patch } });

  // The preview: a building and a date.
  const [previewHouse, setPreviewHouse] = useState(houses[0]?.slug ?? "");
  const [previewDate, setPreviewDate] = useState(() => addDays(todayISO(), 1));
  const preview = previewHouse && previewDate ? dayTimes(v, previewHouse, previewDate) : null;

  /* Extra times: added and removed right in the preview, for the building
     and date picked there. A date's entry goes once its last time does. */
  const setExtraTimes = (house: string, date: string, times: ViewingExtraTime[]) => {
    const rest = v.extras.filter((x) => !(x.house === house && x.date === date));
    const sorted = [...times].sort((a, b) => a.from.localeCompare(b.from));
    const extras = times.length ? [...rest, { house, date, times: sorted }] : rest;
    setV({ ...v, extras: extras.sort((a, b) => a.date.localeCompare(b.date) || a.house.localeCompare(b.house)) });
  };
  const addExtra = (time: string) => {
    if (!preview || !time || preview.weekly.includes(time) || preview.extras.some((t) => t.from === time)) return;
    setExtraTimes(previewHouse, previewDate, [...preview.extras, { from: time, hosts: EXTRA_HOSTS[0] }]);
  };
  const removeExtra = (time: string) =>
    preview && setExtraTimes(previewHouse, previewDate, preview.extras.filter((t) => t.from !== time));
  const setExtraHost = (time: string, hosts: string) =>
    preview && setExtraTimes(previewHouse, previewDate, preview.extras.map((t) => (t.from === time ? { ...t, hosts } : t)));
  // Every date with extra times still to come, to jump the preview to.
  const upcoming = v.extras.filter((x) => x.date >= todayISO() && x.times.length);

  const numberInput = (key: keyof Viewings["rules"], min: number, label: string) => (
    <input
      type="number"
      min={min}
      value={v.rules[key] as number}
      onChange={(e) => setRule(key, Number(e.target.value))}
      aria-label={label}
      className="mx-1 inline-block w-16 rounded-md border border-ink/15 bg-white px-2 py-1 text-center text-sm font-medium tabular-nums text-ink focus:border-ink/60 focus:outline-none"
    />
  );

  return (
    <div className="space-y-8">
      <Card
        title="The week"
        description="Every viewing, on the days it runs. Click one to change it; a change applies to every day it runs on."
        actions={
          <button type="button" onClick={() => addWindow()} className={`${button.primary} py-2!`}>
            <Plus className="size-4" /> Add a viewing
          </button>
        }
      >
        {/* Seven columns from md; a day under the other on a phone. */}
        <div className="grid gap-3 md:grid-cols-7">
          {WEEK.map((day) => {
            const onDay = v.windows
              .map((w, i) => ({ w, i }))
              .filter(({ w }) => w.weekdays.includes(day))
              .sort((a, b) => a.w.from.localeCompare(b.w.from));
            return (
              <div key={day} className="flex flex-col rounded-xl border border-ink/10 bg-bone/30 p-2">
                <p className="px-1 pb-2 text-xs font-medium tracking-wide text-ink/55 uppercase">
                  <span className="md:hidden">{DAY_NAMES[day]}</span>
                  <span className="hidden md:inline">{SHORT(day)}</span>
                </p>
                <div className="flex flex-1 flex-col gap-2">
                  {onDay.map(({ w, i }) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => openWindow(i)}
                      className={`cursor-pointer rounded-lg border-l-4 bg-white px-2.5 py-2 text-left shadow-sm transition-shadow hover:shadow-soft ${toneOf(w.houses[0] ?? "")}`}
                    >
                      <span className="block text-xs font-semibold text-ink tabular-nums">
                        {w.from}–{w.to}
                      </span>
                      <span className="mt-0.5 block text-xs leading-snug text-ink/75">
                        {w.houses.map(nameOf).join(", ") || "No building"}
                      </span>
                      {w.hosts && <span className="mt-1 block truncate text-[11px] text-ink/50">{w.hosts}</span>}
                    </button>
                  ))}
                  {onDay.length === 0 && <p className="px-1 py-2 text-xs text-ink/35">No viewings</p>}
                  <button
                    type="button"
                    onClick={() => addWindow(day)}
                    aria-label={`Add a viewing on ${DAY_NAMES[day]}`}
                    className="mt-auto flex cursor-pointer items-center justify-center gap-1 rounded-lg border border-dashed border-ink/15 py-1.5 text-xs text-ink/40 transition-colors hover:border-ink/40 hover:text-ink"
                  >
                    <Plus className="size-3.5" /> Add
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* What each colour is. */}
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5">
          {houses
            .filter((h) => v.windows.some((w) => w.houses.includes(h.slug)))
            .map((h) => (
              <span key={h.slug} className="flex items-center gap-1.5 text-xs text-ink/60">
                <span className={`size-3 rounded-sm border-l-4 ${toneOf(h.slug)}`} /> {h.name}
              </span>
            ))}
        </div>
      </Card>

      <Card title="How people book" description="How Book a Tour turns each viewing into times people can pick.">
        <div className="space-y-4 text-sm leading-loose text-ink/80">
          <p>
            <Clock className="mr-2 inline size-4 text-ink/40" />
            Each tour lasts{numberInput("minutes", 5, "Minutes a tour lasts")}minutes, and a new one can start
            every{numberInput("step", 5, "Minutes between start times")}minutes within a viewing.
          </p>
          <p>
            <Users className="mr-2 inline size-4 text-ink/40" />
            Up to{numberInput("capacity", 1, "People per start time")}people can book the same start time; after
            that, it&rsquo;s taken.
          </p>
          <p>
            <CalendarX2 className="mr-2 inline size-4 text-ink/40" />
            People book at least{numberInput("noticeHours", 0, "Hours of notice")}hours ahead, and up
            to{numberInput("bookAheadDays", 1, "Days ahead bookings open")}days ahead.
          </p>
        </div>

        {/* The preview: what all that comes to. */}
        <div className="mt-8 rounded-xl border border-ink/10 bg-bone/30 p-4">
          <p className="text-sm font-medium text-ink">What visitors can book</p>
          <p className="mt-0.5 text-xs text-ink/50">
            The times Book a Tour offers for a building on a day, from the week above and these rules (before
            anyone has booked). Pick a building and a date, then + to add an extra time for that day only.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <CustomSelect
              label="Building"
              value={previewHouse}
              onChange={setPreviewHouse}
              options={houses.map((h) => ({ value: h.slug, label: h.name }))}
            />
            <Field label="Date">
              <DatePicker value={previewDate} onChange={setPreviewDate} />
            </Field>
          </div>
          {preview && (
            <div className="mt-4">
              <p className="text-xs text-ink/55">{previewDate && longDate(previewDate)}</p>
              {preview.closed ? (
                <p className="mt-2 text-sm text-ink/60">It&rsquo;s a closed day: no viewings at all. Take it off the closed days below to offer times.</p>
              ) : (
                <>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {preview.weekly.map((t) => (
                      <span key={t} className="rounded-md border border-ink/15 bg-white px-2 py-1 text-xs font-medium text-ink tabular-nums">
                        {t}
                      </span>
                    ))}
                    {preview.extras.map((t) => (
                      <span
                        key={t.from}
                        className="rounded-md border border-lightGreen/40 bg-lemon/50 px-2 py-1 text-xs font-medium text-ink tabular-nums"
                      >
                        {t.from}
                      </span>
                    ))}
                    <TimePicker
                      value=""
                      onChange={addExtra}
                      placeholder="Add a time"
                      icon={<Plus className="size-4 shrink-0 text-ink/50 transition-colors group-hover:text-ink" />}
                      className="w-36"
                    />
                  </div>
                  {!preview.weekly.length && !preview.extras.length && (
                    <p className="mt-2 text-sm text-ink/60">
                      No viewing for this building on {DAY_NAMES[preview.day]}s. Add a time to offer one on this date.
                    </p>
                  )}
                  {preview.extras.length > 0 && (
                    <div className="mt-4 rounded-lg border border-lightGreen/30 bg-white">
                      <p className="flex items-center gap-1.5 border-b border-ink/8 px-3 py-2 text-xs text-ink/60">
                        <span className="size-2.5 rounded-sm border border-lightGreen/40 bg-lemon/50" />
                        Extra times, for this date only. Save to put them live.
                      </p>
                      <ul className="divide-y divide-ink/8">
                        {preview.extras.map((t) => (
                          <li key={t.from} className="flex items-center gap-3 px-3 py-2">
                            <span className="w-12 shrink-0 text-sm font-medium text-ink tabular-nums">{t.from}</span>
                            <span className="shrink-0 text-xs text-ink/50">Hosted by</span>
                            <CustomSelect
                              value={t.hosts}
                              onChange={(hosts) => setExtraHost(t.from, hosts)}
                              options={[...new Set([...EXTRA_HOSTS, t.hosts])].map((h) => ({ value: h, label: h }))}
                              className="min-w-0 flex-1 sm:max-w-56"
                            />
                            <button
                              type="button"
                              onClick={() => removeExtra(t.from)}
                              className={`${iconButtonDanger} ml-auto`}
                              aria-label={`Remove the extra time ${t.from}`}
                            >
                              <X className="size-4" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {preview.later && (
                    <p className="mt-2 text-xs text-ink/55">
                      More than {v.rules.bookAheadDays} days ahead: these show on the website once bookings open for this date.
                    </p>
                  )}
                </>
              )}
            </div>
          )}
          {upcoming.length > 0 && (
            <div className="mt-5 border-t border-ink/10 pt-4">
              <p className="text-xs font-medium text-ink/60">Extra times coming up</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {upcoming.map((x) => (
                  <button
                    key={`${x.house}-${x.date}`}
                    type="button"
                    onClick={() => {
                      setPreviewHouse(x.house);
                      setPreviewDate(x.date);
                    }}
                    className={`cursor-pointer rounded-full border px-2.5 py-1 text-xs transition-colors ${
                      x.house === previewHouse && x.date === previewDate
                        ? "border-ink bg-ink text-bone"
                        : "border-ink/15 bg-white text-ink/70 hover:border-ink/40 hover:text-ink"
                    }`}
                  >
                    {nameOf(x.house)}, {shortDate(x.date)} · {x.times.length} {x.times.length === 1 ? "time" : "times"}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      <Card title="Closed days" description="No viewings at all on these dates: public holidays, the December break.">
        <div className="max-w-sm">
          <StringList
            type="date"
            values={v.rules.closed}
            onChange={(closed) => setV({ ...v, rules: { ...v.rules, closed } })}
            addLabel="Add a closed day"
          />
        </div>
      </Card>

      <EditModal
        isOpen={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.index === null ? "New viewing" : "Viewing"}
        formId="viewing"
        saveLabel="Done"
        dirty={!!editing && (editing.index === null || JSON.stringify(editing.window) !== JSON.stringify(v.windows[editing.index]))}
      >
        {editing && (
          <form
            id="viewing"
            onSubmit={(e) => {
              e.preventDefault();
              apply();
            }}
            className="space-y-6"
          >
            <div className="space-y-2">
              <span className={labelClass}>Runs on</span>
              <div className="flex flex-wrap gap-1.5">
                {WEEK.map((n) => (
                  <button
                    key={n}
                    type="button"
                    aria-pressed={editing.window.weekdays.includes(n)}
                    onClick={() => setDraft({ weekdays: toggle(editing.window.weekdays, n) })}
                    className={`cursor-pointer rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                      editing.window.weekdays.includes(n)
                        ? "border-ink bg-ink text-bone"
                        : "border-ink/20 bg-white text-ink/60 hover:border-ink/50 hover:text-ink"
                    }`}
                  >
                    {SHORT(n)}
                  </button>
                ))}
              </div>
              <p className="text-xs text-ink/50">{daysLabel(editing.window.weekdays) || "No days yet"}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="From">
                <TimePicker required value={editing.window.from} onChange={(from) => setDraft({ from })} />
              </Field>
              <Field label="To">
                <TimePicker required value={editing.window.to} onChange={(to) => setDraft({ to })} />
              </Field>
            </div>

            <div className="space-y-2">
              <span className={labelClass}>Buildings</span>
              <div className="flex flex-wrap gap-1.5">
                {houses.map((h) => (
                  <button
                    key={h.slug}
                    type="button"
                    aria-pressed={editing.window.houses.includes(h.slug)}
                    onClick={() => setDraft({ houses: toggle(editing.window.houses, h.slug) })}
                    className={`cursor-pointer rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                      editing.window.houses.includes(h.slug)
                        ? "border-ink bg-ink text-bone"
                        : "border-ink/20 bg-white text-ink/60 hover:border-ink/50 hover:text-ink"
                    }`}
                  >
                    {h.name}
                  </button>
                ))}
              </div>
            </div>

            <Field label="Hosts" hint="Who shows people around, as the timetable on the Contact page names them.">
              <input
                value={editing.window.hosts}
                onChange={(e) => setDraft({ hosts: e.target.value })}
                placeholder="House Committee & Reception Team"
                className={inputClass}
              />
            </Field>

            {editing.index !== null && (
              <button type="button" onClick={remove} className={`${button.ghost} text-brick! hover:text-red!`}>
                <Trash2 className="size-4" /> Remove this viewing
              </button>
            )}
            <p className="text-xs text-ink/45">Done keeps it here; Save at the bottom puts the whole schedule live.</p>
          </form>
        )}
      </EditModal>

      <SaveBar dirty={dirty} pending={pending} waiting={saveOnline.waiting} onSave={saveOnline.save} onDiscard={reset} />
    </div>
  );
}
