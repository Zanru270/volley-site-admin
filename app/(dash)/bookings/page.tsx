import type { Metadata } from "next";
import { CalendarCheck } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { appSupabase } from "@/lib/appSupabase";
import { Card, PageHeader } from "@/components/ui";
import { BOOKINGS_DESCRIPTION, type Booking } from "@/lib/bookings";
import BookingsList from "./BookingsList";

export const metadata: Metadata = { title: "Tour bookings" };

/* Every tour booked through the website's "Book a tour", read from the
   Volley app's project (lib/appSupabase.ts), where the website saves them.
   All of them come at once, so the tabs and filters switch without a
   reload. */
export default async function BookingsPage() {
  await requireAdmin();
  const app = appSupabase();
  const header = <PageHeader icon={CalendarCheck} title="Tour bookings" description={BOOKINGS_DESCRIPTION} />;
  if (!app)
    return (
      <>
        {header}
        <Card title="Not connected yet">
          <p className="text-sm leading-relaxed text-ink/70">
            The bookings are kept in the Volley app&rsquo;s database. Add its address and service role key to this
            admin&rsquo;s settings as <code className="rounded bg-bone px-1">VOLLEY_APP_SUPABASE_URL</code> and{" "}
            <code className="rounded bg-bone px-1">VOLLEY_APP_SUPABASE_SERVICE_ROLE_KEY</code> (Supabase &gt; the Volley
            app&rsquo;s project &gt; Project Settings &gt; API), then reload.
          </p>
        </Card>
      </>
    );

  const { data, error } = await app
    .from("tour_bookings")
    .select("*")
    .order("date", { ascending: false })
    .order("start_time", { ascending: false })
    .limit(3000);
  return (
    <>
      {header}
      {error ? (
        <Card title="Couldn't load the bookings">
          <p className="text-sm text-ink/70">{error.message}</p>
        </Card>
      ) : (
        <BookingsList bookings={(data ?? []) as Booking[]} />
      )}
    </>
  );
}
