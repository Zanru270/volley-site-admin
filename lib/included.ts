import type { Included, IncludedItem, IncludedList } from "@/lib/types";

/* "What's included"'s three lists, under their fixed headings, in order.
   The site has the same in its lib/included.js; change both together. */
export const INCLUDED_LISTS: [IncludedList, string][] = [
  ["building", "Included in my building"],
  ["apartment", "Included in my apartment"],
  ["room", "Included in my room"],
];

/* `included` as saved, in this shape: before the headings were fixed it
   held `groups` [{ title, items }], each now put in the list its heading
   names (or, failing that, by its place). Null stays null. */
export function includedLists(raw: unknown): Included | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<Included> & { groups?: { title?: string; items?: IncludedItem[] }[] };
  const out: Included = { intro: r.intro ?? "", building: [], apartment: [], room: [] };
  for (const [key] of INCLUDED_LISTS) if (Array.isArray(r[key])) out[key] = r[key];
  r.groups?.forEach((group, i) => {
    const title = (group?.title ?? "").toLowerCase();
    const key = INCLUDED_LISTS.find(([k]) => title.includes(k))?.[0] ?? INCLUDED_LISTS[i]?.[0];
    if (key && Array.isArray(group?.items)) out[key] = [...out[key], ...group.items];
  });
  return out;
}
