import { requireAdmin } from "@/lib/auth";

// A cell as CSV has it: quoted when it holds a comma, quote or line break.
const cell = (v: string) => (/[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

/* GET /newsletter/export: every sign-up as a CSV file, ready to import
   into a mailing tool. */
export async function GET() {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("newsletter_signups")
    .select("email, source, status, created_at, unsubscribed_at")
    .order("created_at", { ascending: false })
    .limit(20000);
  if (error) return new Response(`Couldn't read the sign-ups: ${error.message}`, { status: 502 });

  const rows = [
    ["Email", "Status", "Signed up on", "Signed up", "Unsubscribed"],
    ...data.map((s) => [s.email, s.status, s.source, s.created_at, s.unsubscribed_at ?? ""]),
  ];
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Johannesburg" }).format(new Date());
  return new Response(`﻿${rows.map((r) => r.map(cell).join(",")).join("\r\n")}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="volley-newsletter-${today}.csv"`,
    },
  });
}
