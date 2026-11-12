/* Copied from the Volley app's admin (src/lib/unitLabels.ts): keep the two in step.

   Unit codes and room types, as names people read. Safe in the browser;
   lib/app/units.ts (server only) re-exports them. */

// Residents per unit: one per bedroom. Roommates share a unit (and wallet).
export const CAPACITY: Record<string, number> = {
  bachelor: 1,
  "2bedroom": 2,
  "3bedroom": 3,
  "4bedroom": 4,
};

// The website's waitlist form says "2 Bedroom"; apartments say "2bedroom".
export const ROOM_TYPE_LABELS: Record<string, string> = {
  bachelor: "Bachelor",
  "2bedroom": "2 Bedroom",
  "3bedroom": "3 Bedroom",
  "4bedroom": "4 Bedroom",
};
export const roomTypeFromLabel = (label: string) =>
  Object.entries(ROOM_TYPE_LABELS).find(([, l]) => l.toLowerCase() === label.trim().toLowerCase())?.[0] ?? null;

/* The website's house names ("Baileys") against the buildings ("Baylies"):
   compared with case, spacing and the ie/ai/ay spellings ignored. */
const squash = (s: string) =>
  s
    .toLowerCase()
    .replace(/^volley\s+/, "")
    .replace(/[^a-z]/g, "")
    .replace(/(ai|ay|ey|ei)/g, "a");
export function matchBuilding<T extends { slug: string; name: string }>(house: string, buildings: T[]) {
  const want = squash(house);
  return buildings.find((b) => squash(b.name) === want || squash(b.slug) === want) ?? null;
}

// "U114_2B" → "114", as the web app shows it.
export const unitNumber = (unitCode: string) => unitCode.split("_")[0].replace(/^U/, "");
