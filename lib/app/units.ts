import "server-only";
import { appSupabase } from "@/lib/appSupabase";
import { CAPACITY, unitNumber } from "@/lib/app/unitLabels";

/* Adapted from the Volley app's admin (src/lib/units.ts): keep the two in
   step. The Volley app's buildings, units and who lives in them, for
   placing an accepted applicant, read with its service role. */

export { CAPACITY, ROOM_TYPE_LABELS, roomTypeFromLabel, matchBuilding, unitNumber } from "@/lib/app/unitLabels";

export type AppBuilding = { id: string; slug: string; name: string };
export type Unit = {
  id: string;
  building_id: string;
  unit_code: string;
  room_type: string;
  capacity: number;
  residents: string[]; // first names, for the unit cards
};

const db = () => {
  const client = appSupabase();
  if (!client) throw new Error("The Volley app isn't connected.");
  return client;
};

/* Every building and unit, with who lives in each now. Staff profiles
   (drivers, admins) don't take a bed. */
export async function listUnits() {
  const app = db();
  const [buildings, apartments, profiles] = await Promise.all([
    app.from("buildings").select("id, slug, name").order("name"),
    app.from("apartments").select("id, building_id, unit_code, room_type").order("unit_code"),
    app.from("profiles").select("apartment_id, first_name, last_name").eq("is_driver", false).eq("is_admin", false),
  ]);
  for (const r of [buildings, apartments, profiles]) if (r.error) throw r.error;

  const residents = new Map<string, string[]>();
  for (const p of profiles.data ?? []) {
    const list = residents.get(p.apartment_id) ?? [];
    list.push(`${p.first_name} ${p.last_name?.[0] ?? ""}`.trim());
    residents.set(p.apartment_id, list);
  }

  const units: Unit[] = (apartments.data ?? []).map((a) => ({
    ...a,
    capacity: CAPACITY[a.room_type] ?? 1,
    residents: residents.get(a.id) ?? [],
  }));
  return { buildings: (buildings.data ?? []) as AppBuilding[], units };
}

// "Brooklyn, unit 114" for each placed apartment id, for the applications list.
export async function placements(apartmentIds: string[]) {
  if (!apartmentIds.length) return {};
  const { data, error } = await db()
    .from("apartments")
    .select("id, unit_code, buildings ( name )")
    .in("id", apartmentIds);
  if (error) throw error;
  return Object.fromEntries(
    (data ?? []).map((a) => [
      a.id,
      `${(a.buildings as unknown as { name: string } | null)?.name ?? ""}, unit ${unitNumber(a.unit_code)}`,
    ]),
  ) as Record<string, string>;
}
