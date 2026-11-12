import { type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { appSupabase } from "@/lib/appSupabase";
import { WAITLIST_TABS, type WaitlistEntry, type WaitlistTab } from "@/lib/waitlist";

const COLUMNS: [string, (e: WaitlistEntry) => string][] = [
  ["Joined", (e) => e.created_at],
  ["Name", (e) => e.name],
  ["Surname", (e) => e.surname],
  ["Email", (e) => e.email],
  ["Phone", (e) => e.phone],
  ["Preferred house", (e) => e.house],
  ["Preferred unit", (e) => e.unit],
  ["Parent name", (e) => e.parent_name],
  ["Parent surname", (e) => e.parent_surname],
  ["Parent phone", (e) => e.parent_phone],
  ["Parent email", (e) => e.parent_email],
  ["ID photo", (e) => (e.id_document_path ? "Yes" : "No")],
  ["Status", (e) => e.status],
  ["Decided", (e) => e.decided_at ?? ""],
];

// A cell as CSV has it: quoted when it holds a comma, quote or line break.
const cell = (v: string) => (/[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

/* GET /waitlist/applications/export?status=new: the applications page's
   tab as a CSV file, as the Volley app's admin exports it. */
export async function GET(request: NextRequest) {
  await requireAdmin();
  const app = appSupabase();
  if (!app) return new Response("The Volley app isn't connected.", { status: 503 });
  const asked = request.nextUrl.searchParams.get("status") ?? "";
  const filter: WaitlistTab = (WAITLIST_TABS as readonly string[]).includes(asked) ? (asked as WaitlistTab) : "all";
  let query = app.from("waitlist").select("*");
  if (filter === "contacted") query = query.in("status", ["contacted", "offered"]);
  else if (filter !== "all") query = query.eq("status", filter);
  const { data, error } = await query.order("created_at", { ascending: false }).limit(5000);
  if (error) return new Response(`Couldn't read the applications: ${error.message}`, { status: 502 });

  const rows = [COLUMNS.map(([h]) => h), ...(data as WaitlistEntry[]).map((e) => COLUMNS.map(([, get]) => get(e) ?? ""))];
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Johannesburg" }).format(new Date());
  return new Response(`﻿${rows.map((r) => r.map(cell).join(",")).join("\r\n")}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="volley-waitlist-${filter}-${today}.csv"`,
    },
  });
}
