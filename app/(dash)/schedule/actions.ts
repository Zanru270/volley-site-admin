"use server";

import { requireAdmin } from "@/lib/auth";
import { putSetting } from "@/lib/settings";
import { revalidateSite } from "@/lib/revalidate";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { failed, saved, type Result } from "@/lib/result";
import type { Viewings } from "@/lib/types";

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const todayISO = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Johannesburg" }).format(new Date());
const DATE = /^\d{4}-\d\d-\d\d$/;
/* Checks the whole timetable before saving: a bad time here would quietly
   break the booking calendar on the site. */
function check(v: Viewings, houses: string[]): string | null {
  for (const [i, w] of v.windows.entries()) {
    const name = `Viewing ${i + 1}${TIME.test(w.from) ? ` (${w.from})` : ""}`;
    if (!w.weekdays.length) return `${name}: pick at least one day.`;
    if (!TIME.test(w.from) || !TIME.test(w.to)) return `${name}: it needs a start and an end time.`;
    if (w.from >= w.to) return `${name}: it ends before it starts.`;
    if (!w.houses.length) return `${name}: pick at least one building.`;
    if (w.houses.some((h) => !houses.includes(h))) return `${name}: one of its buildings no longer exists.`;
  }
  for (const x of v.extras) {
    const name = `Extra times${DATE.test(x.date) ? ` on ${x.date}` : ""}`;
    if (!houses.includes(x.house)) return `${name}: pick a building.`;
    if (!DATE.test(x.date)) return `${name}: pick a date.`;
    if (!x.times.length) return `${name}: add at least one time.`;
    if (x.times.some((t) => !TIME.test(t.from))) return `${name}: every time needs to be filled in.`;
    if (x.times.some((t) => !t.hosts.trim())) return `${name}: pick who hosts each time.`;
  }
  const r = v.rules;
  const whole = (n: number, min: number) => Number.isInteger(n) && n >= min;
  if (!whole(r.minutes, 5)) return "A viewing needs to last at least 5 minutes.";
  if (!whole(r.step, 5)) return "Start times need to be at least 5 minutes apart.";
  if (!whole(r.noticeHours, 0)) return "Notice needs to be 0 hours or more.";
  if (!whole(r.bookAheadDays, 1)) return "Booking ahead needs to be at least 1 day.";
  if (!whole(r.capacity, 1)) return "At least 1 person needs to fit in a viewing.";
  if (r.closed.some((d) => !DATE.test(d))) return "Every closed day needs a date.";
  return null;
}

/* Saves the timetable as its list of viewings (`windows`), and the rules.
   The older "groups of days" shape isn't written again. */
export async function saveViewings(input: Viewings): Promise<Result> {
  const { supabase } = await requireAdmin();
  const viewings: Viewings = {
    windows: input.windows
      .map((w) => ({
        weekdays: [...new Set(w.weekdays)].sort(),
        from: w.from,
        to: w.to,
        houses: [...new Set(w.houses)],
        hosts: w.hosts.trim(),
      }))
      .sort((a, b) => a.from.localeCompare(b.from)),
    // Tidied: each date's times in order, once each; dates gone by dropped.
    extras: (input.extras ?? [])
      .map((x) => ({
        house: x.house,
        date: x.date,
        times: x.times
          .filter((t, i, all) => t.from && all.findIndex((o) => o.from === t.from) === i)
          .map((t) => ({ from: t.from, hosts: t.hosts.trim() }))
          .sort((a, b) => a.from.localeCompare(b.from)),
      }))
      .filter((x) => !x.date || x.date >= todayISO())
      .sort((a, b) => a.date.localeCompare(b.date) || a.house.localeCompare(b.house)),
    rules: {
      ...input.rules,
      closed: [...new Set(input.rules.closed.filter(Boolean))].sort(),
    },
  };
  const { data: buildings, error } = await supabase.from("locations").select("slug");
  if (error) return failed(error);
  const problem = check(viewings, buildings.map((b) => b.slug));
  if (problem) return { ok: false, message: problem };
  try {
    await putSetting(supabase, "viewings", viewings);
  } catch (err) {
    return failed(err);
  }
  return saved(await revalidateSite(CACHE_TAGS.VIEWINGS));
}
