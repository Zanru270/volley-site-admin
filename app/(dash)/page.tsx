import { requireAdmin } from "@/lib/auth";
import { getSetting } from "@/lib/settings";
import type { Banner, Viewings } from "@/lib/types";
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
      .select("id, slug, title, location, meta, category, excerpt, image, published")
      .order("sort"),
    supabase.from("faqs").select("tab"),
    supabase.from("locations").select("slug, address, rooms, updated_at").order("slug"),
    getSetting<Banner>(supabase, "banner"),
    getSetting<Viewings>(supabase, "viewings"),
    supabase.from("admin_users").select("name").eq("email", user.email ?? "").maybeSingle(),
  ]);

  return (
    <DashboardView
      firstName={me.data?.name?.split(" ")[0]}
      articles={(articles.data ?? []) as DashboardData["articles"]}
      faqTabs={(faqs.data ?? []).map((f) => f.tab as string)}
      locations={(locations.data ?? []) as DashboardData["locations"]}
      banner={banner}
      viewings={viewings}
    />
  );
}
