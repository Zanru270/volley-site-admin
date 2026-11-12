import type { ViewingGroup, ViewingWindow } from "@/lib/types";

/* The viewing schedule's days, as people read them. Keep in step with the
   site's lib/viewings.js, which shows the timetable the same way. */

// Monday first, as people read a week; stored as 0 = Sunday … 6 = Saturday.
export const WEEK = [1, 2, 3, 4, 5, 6, 0];
export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/* Days as they read: "Saturday", "Tuesday & Thursday", "Monday, Wednesday
   & Friday", or a run of three or more as "Monday to Friday". */
export function daysLabel(weekdays: number[]): string {
  const order = WEEK.filter((n) => weekdays.includes(n));
  if (!order.length) return "";
  const positions = order.map((n) => WEEK.indexOf(n));
  const run = order.length >= 3 && positions.every((p, i) => i === 0 || p === positions[i - 1] + 1);
  const names = order.map((n) => DAY_NAMES[n]);
  if (run) return `${names[0]} to ${names.at(-1)}`;
  return names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} & ${names.at(-1)}`;
}

/* The days of the week that share the very same viewings, together under
   one label, Monday first, each with its viewings in time order: as the
   Contact page's timetable reads. */
export function viewingDays(windows: ViewingWindow[]): ViewingGroup[] {
  const groups: (ViewingGroup & { key: string })[] = [];
  for (const day of WEEK) {
    const slots = windows
      .filter((w) => w.weekdays.includes(day))
      .map(({ from, to, houses, hosts }) => ({ from, to, houses, hosts }))
      .sort((a, b) => a.from.localeCompare(b.from));
    if (!slots.length) continue;
    const key = JSON.stringify(slots);
    const same = groups.find((g) => g.key === key);
    if (same) same.weekdays.push(day);
    else groups.push({ key, days: "", weekdays: [day], slots });
  }
  return groups.map(({ weekdays, slots }) => ({ days: daysLabel(weekdays), weekdays, slots }));
}
