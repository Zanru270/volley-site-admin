import { requireAdmin } from "@/lib/auth";
import { getBuildings } from "@/lib/buildings";
import { newestFirst } from "@/lib/articles";
import { getSetting } from "@/lib/settings";
import { viewingWindows, type Banner, type SavedViewings } from "@/lib/types";
import DashboardView, { type DashboardData } from "./DashboardView";

/* When today, this month and this year began in South Africa (UTC+2, no
   daylight saving), as the database compares them. */
function periodStarts() {
  const [y, m, d] = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Johannesburg" }).format(new Date()).split("-");
  const at = (date: string) => new Date(`${date}T00:00:00+02:00`).toISOString();
  return { day: at(`${y}-${m}-${d}`), month: at(`${y}-${m}-01`), year: at(`${y}-01-01`) };
}

/* What's on the website right now: the welcome panel with the banner and
   the headline counts (the newsletter's subscribers among them), the Volley Reader in carousel order, the
   residences, and this week's viewing times. The people side (tour
   bookings, the waitlist) lives in the Volley app's admin. */
export default async function DashboardPage() {
  const { supabase, user } = await requireAdmin();

  const subscribed = () =>
    supabase.from("newsletter_signups").select("id", { count: "exact", head: true }).eq("status", "subscribed");
  const since = periodStarts();
  const [articles, subTotal, subDay, subMonth, subYear, locations, banner, viewings, me] = await Promise.all([
    supabase
      .from("articles")
      .select("*")
      .order("sort"),
    // The newsletter: everyone still subscribed, and how many of them
    // joined today, this month and this year.
    subscribed(),
    subscribed().gte("created_at", since.day),
    subscribed().gte("created_at", since.month),
    subscribed().gte("created_at", since.year),
    // Every column: `name` is only there once the database has it.
    getBuildings<DashboardData["locations"][number]>(supabase),
    getSetting<Banner>(supabase, "banner"),
    getSetting<SavedViewings>(supabase, "viewings"),
    supabase.from("admin_users").select("name").eq("email", user.email ?? "").maybeSingle(),
  ]);

  return (
    <DashboardView
      firstName={me.data?.name?.split(" ")[0]}
      articles={newestFirst((articles.data ?? []) as DashboardData["articles"])}
      // Null until supabase/newsletter.sql has made the table.
      subscribers={
        subTotal.error
          ? null
          : { total: subTotal.count ?? 0, day: subDay.count ?? 0, month: subMonth.count ?? 0, year: subYear.count ?? 0 }
      }
      locations={locations.buildings}
      banner={banner}
      viewings={viewings && viewingWindows(viewings)}
    />
  );
}
