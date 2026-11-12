import { requireAdmin } from "@/lib/auth";
import { getBuildings } from "@/lib/buildings";
import { newestFirst } from "@/lib/articles";
import { getSetting } from "@/lib/settings";
import { viewingWindows, type Banner, type SavedViewings } from "@/lib/types";
import DashboardView, { type DashboardData } from "./DashboardView";

/* What's on the website right now: the welcome panel with the banner and
   the headline counts, the Volley Reader in carousel order, the
   residences, and this week's viewing times. The people side (tour
   bookings, the waitlist) lives in the Volley app's admin. */
export default async function DashboardPage() {
  const { supabase, user } = await requireAdmin();

  const [articles, faqs, locations, banner, viewings, me] = await Promise.all([
    supabase
      .from("articles")
      .select("*")
      .order("sort"),
    supabase.from("faqs").select("tab"),
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
      faqTabs={(faqs.data ?? []).map((f) => f.tab as string)}
      locations={locations.buildings}
      banner={banner}
      viewings={viewings && viewingWindows(viewings)}
    />
  );
}
