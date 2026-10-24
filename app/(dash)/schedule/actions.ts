"use server";

import { requireAdmin } from "@/lib/auth";
import { putSetting } from "@/lib/settings";
import { revalidateSite } from "@/lib/revalidate";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { failed, saved, type Result } from "@/lib/result";
import type { Viewings } from "@/lib/types";

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE = /^\d{4}-\d\d-\d\d$/;
const HOUSES = ["brooklyn", "baileys", "roper", "mooiriver"];

/* Checks the whole timetable before saving: a bad time here would quietly
   break the booking calendar on the site. */
function check(v: Viewings): string | null {
  for (const [g, group] of v.schedule.entries()) {
    const name = group.days || `Group ${g + 1}`;
    if (!group.days.trim()) return `Group ${g + 1} needs a label.`;
    if (!group.weekdays.length) return `${name}: tick at least one day.`;
    if (!group.slots.length) return `${name}: add at least one viewing.`;
    for (const slot of group.slots) {
      if (!TIME.test(slot.from) || !TIME.test(slot.to))
        return `${name}: every viewing needs a start and end time.`;
      if (slot.from >= slot.to)
        return `${name}: ${slot.from} – ${slot.to} ends before it starts.`;
      if (!slot.houses.length)
        return `${name}, ${slot.from}: pick at least one residence.`;
      if (slot.houses.some((h) => !HOUSES.includes(h)))
        return `${name}, ${slot.from}: unknown residence.`;
    }
  }
  const r = v.rules;
  const whole = (n: number, min: number) => Number.isInteger(n) && n >= min;
  if (!whole(r.minutes, 5)) return "Viewing length must be at least 5 minutes.";
  if (!whole(r.step, 5)) return "Time between starts must be at least 5 minutes.";
  if (!whole(r.noticeHours, 0)) return "Notice must be 0 hours or more.";
  if (!whole(r.bookAheadDays, 1)) return "Book ahead must be at least 1 day.";
  if (!whole(r.capacity, 1)) return "Bookings per time must be at least 1.";
  if (r.closed.some((d) => !DATE.test(d))) return "Every closed day needs a date.";
  return null;
}

export async function saveViewings(input: Viewings): Promise<Result> {
  const { supabase } = await requireAdmin();
  const viewings: Viewings = {
    schedule: input.schedule.map((g) => ({
      days: g.days.trim(),
      weekdays: [...new Set(g.weekdays)].sort(),
      slots: g.slots
        .map((s) => ({ ...s, hosts: s.hosts.trim() }))
        .sort((a, b) => a.from.localeCompare(b.from)),
    })),
    rules: {
      ...input.rules,
      closed: [...new Set(input.rules.closed.filter(Boolean))].sort(),
    },
  };
  const problem = check(viewings);
  if (problem) return { ok: false, message: problem };
  try {
    await putSetting(supabase, "viewings", viewings);
  } catch (err) {
    return failed(err);
  }
  return saved(await revalidateSite(CACHE_TAGS.VIEWINGS));
}
