"use client";

import { Plus } from "lucide-react";
import { button, Card, Field, inputClass, labelClass, SaveButton } from "@/components/ui";
import { move, RowControls, StringList, useSettingsForm } from "@/components/forms";
import { LOCATION_NAMES } from "@/lib/site";
import type { ViewingGroup, ViewingSlot, Viewings } from "@/lib/types";
import { saveViewings } from "./actions";

// Monday first, as people read a week; stored as 0 = Sunday … 6 = Saturday.
const WEEK = [
  [1, "Mon"],
  [2, "Tue"],
  [3, "Wed"],
  [4, "Thu"],
  [5, "Fri"],
  [6, "Sat"],
  [0, "Sun"],
] as const;
const HOUSES = ["brooklyn", "baileys", "roper"];

const newSlot = (): ViewingSlot => ({ from: "10:00", to: "11:00", houses: [], hosts: "" });
const newGroup = (): ViewingGroup => ({ days: "", weekdays: [], slots: [newSlot()] });

/* The timetable and the booking rules are one setting, saved together:
   both cards' save buttons send the whole thing. */
export default function ScheduleEditor({ initial }: { initial: Viewings }) {
  const { value: v, setValue: setV, dirty, pending, save } = useSettingsForm(initial, saveViewings);
  const saveButton = <SaveButton dirty={dirty} pending={pending} label="Save Schedule" onClick={save} />;

  const setGroups = (schedule: ViewingGroup[]) => setV({ ...v, schedule });
  const setGroup = (i: number, g: ViewingGroup) =>
    setGroups(v.schedule.map((old, j) => (j === i ? g : old)));
  const setRule = (key: keyof Viewings["rules"], value: number) =>
    setV({ ...v, rules: { ...v.rules, [key]: value } });

  const toggle = <T,>(list: T[], item: T) =>
    list.includes(item) ? list.filter((x) => x !== item) : [...list, item];

  return (
    <div className="space-y-8">
      <Card title="Timetable" description="One block per group of days, each with its viewing windows." actions={saveButton}>
        <div className="space-y-6">
          {v.schedule.map((group, g) => (
            <div key={g} className="rounded-xl border border-ink/8 bg-bone/30 p-4 md:p-6">
              <div className="mb-5 flex items-center justify-between gap-3">
                <p className="font-medium">{group.days || "New group of days"}</p>
                <RowControls
                  index={g}
                  count={v.schedule.length}
                  onMove={(a, b) => setGroups(move(v.schedule, a, b))}
                  onRemove={() => setGroups(v.schedule.filter((_, j) => j !== g))}
                  removeLabel="Remove these days"
                />
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <Field label="Label" hint='As it reads in the timetable, e.g. "Tuesday & Thursday".'>
                  <input
                    value={group.days}
                    onChange={(e) => setGroup(g, { ...group, days: e.target.value })}
                    className={inputClass}
                  />
                </Field>
                <div className="space-y-2">
                  <span className={labelClass}>Days</span>
                  <div className="flex flex-wrap gap-1.5">
                    {WEEK.map(([n, label]) => (
                      <button
                        key={n}
                        type="button"
                        aria-pressed={group.weekdays.includes(n)}
                        onClick={() => setGroup(g, { ...group, weekdays: toggle(group.weekdays, n) })}
                        className={`cursor-pointer border px-3 py-1.5 text-sm transition-colors ${
                          group.weekdays.includes(n)
                            ? "border-ink bg-ink text-bone"
                            : "border-ink/20 bg-white text-ink/60 hover:border-ink/50 hover:text-ink"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <span className={labelClass}>Viewings</span>
                {group.slots.map((slot, s) => {
                  const setSlot = (next: ViewingSlot) =>
                    setGroup(g, {
                      ...group,
                      slots: group.slots.map((old, j) => (j === s ? next : old)),
                    });
                  return (
                    <div
                      key={s}
                      className="grid gap-4 rounded-xl border border-ink/10 bg-white p-4 md:grid-cols-[auto_auto_1fr_1fr_auto] md:items-end"
                    >
                      <Field label="From">
                        <input type="time" value={slot.from} onChange={(e) => setSlot({ ...slot, from: e.target.value })} className={inputClass} />
                      </Field>
                      <Field label="To">
                        <input type="time" value={slot.to} onChange={(e) => setSlot({ ...slot, to: e.target.value })} className={inputClass} />
                      </Field>
                      <div className="space-y-1">
                        <span className={labelClass}>Residences</span>
                        <div className="flex flex-wrap gap-3 py-2">
                          {HOUSES.map((h) => (
                            <label key={h} className="flex cursor-pointer items-center gap-1.5 text-sm">
                              <input
                                type="checkbox"
                                checked={slot.houses.includes(h)}
                                onChange={() => setSlot({ ...slot, houses: toggle(slot.houses, h) })}
                                className="size-4 accent-ink"
                              />
                              {LOCATION_NAMES[h].replace("Volley ", "")}
                            </label>
                          ))}
                        </div>
                      </div>
                      <Field label="Hosts">
                        <input value={slot.hosts} onChange={(e) => setSlot({ ...slot, hosts: e.target.value })} className={inputClass} />
                      </Field>
                      <RowControls
                        index={s}
                        count={group.slots.length}
                        onMove={(a, b) => setGroup(g, { ...group, slots: move(group.slots, a, b) })}
                        onRemove={() => setGroup(g, { ...group, slots: group.slots.filter((_, j) => j !== s) })}
                      />
                    </div>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setGroup(g, { ...group, slots: [...group.slots, newSlot()] })}
                  className={button.ghost}
                >
                  <Plus className="size-4" /> Add a viewing
                </button>
              </div>
            </div>
          ))}

          <button type="button" onClick={() => setGroups([...v.schedule, newGroup()])} className={button.secondary}>
            <Plus className="size-4" /> Add a group of days
          </button>
        </div>
      </Card>

      <Card
        title="Booking Rules"
        description="How Book a Tour turns the timetable into times people can pick."
        actions={saveButton}
      >
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Viewing length (minutes)">
            <input type="number" min={5} value={v.rules.minutes}
              onChange={(e) => setRule("minutes", Number(e.target.value))} className={inputClass} />
          </Field>
          <Field label="Minutes between start times"
            hint="15 turns 10:00–11:00 into 10:00, 10:15, 10:30 (with 30 min viewings).">
            <input type="number" min={5} value={v.rules.step}
              onChange={(e) => setRule("step", Number(e.target.value))} className={inputClass} />
          </Field>
          <Field label="Bookings per start time" hint="After this many, that time disappears.">
            <input type="number" min={1} value={v.rules.capacity}
              onChange={(e) => setRule("capacity", Number(e.target.value))} className={inputClass} />
          </Field>
          <Field label="Notice needed (hours)" hint="How soon someone can book.">
            <input type="number" min={0} value={v.rules.noticeHours}
              onChange={(e) => setRule("noticeHours", Number(e.target.value))} className={inputClass} />
          </Field>
          <Field label="Book up to (days ahead)">
            <input type="number" min={1} value={v.rules.bookAheadDays}
              onChange={(e) => setRule("bookAheadDays", Number(e.target.value))} className={inputClass} />
          </Field>
        </div>
        <div className="mt-8 space-y-2 border-t border-ink/10 pt-6">
          <span className={labelClass}>Closed days</span>
          <p className="text-xs text-ink/50">No viewings at all: public holidays, the December break.</p>
          <div className="max-w-sm">
            <StringList
              type="date"
              values={v.rules.closed}
              onChange={(closed) => setV({ ...v, rules: { ...v.rules, closed } })}
              addLabel="Add a closed day"
            />
          </div>
        </div>
      </Card>
    </div>
  );
}
