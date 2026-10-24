import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  ClipboardList,
  FileText,
  HelpCircle,
  MapPin,
  Megaphone,
} from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { getSetting } from "@/lib/settings";
import type { Banner, Viewings } from "@/lib/types";
import { Badge, Card, PageHeader } from "@/components/ui";

/* What's on the website right now, with a way into each part. The people
   side (tour bookings, the waitlist) lives in the Volley app's admin. */
export default async function DashboardPage() {
  const { supabase, user } = await requireAdmin();

  const [articles, drafts, faqs, locations, banner, viewings, me] = await Promise.all([
    supabase.from("articles").select("id", { count: "exact", head: true }).eq("published", true),
    supabase.from("articles").select("id", { count: "exact", head: true }).eq("published", false),
    supabase.from("faqs").select("id", { count: "exact", head: true }),
    supabase.from("locations").select("slug", { count: "exact", head: true }),
    getSetting<Banner>(supabase, "banner"),
    getSetting<Viewings>(supabase, "viewings"),
    supabase.from("admin_users").select("name").eq("email", user.email ?? "").maybeSingle(),
  ]);
  const firstName = me.data?.name?.split(" ")[0];
  const slots = viewings?.schedule.reduce((n, g) => n + g.slots.length, 0) ?? 0;

  const stats = [
    { label: "Published Articles", value: articles.count ?? 0, href: "/articles", icon: FileText },
    { label: "FAQs", value: faqs.count ?? 0, href: "/faqs", icon: HelpCircle },
    { label: "Locations", value: locations.count ?? 0, href: "/locations", icon: MapPin },
  ];

  const sections = [
    {
      href: "/banner",
      icon: Megaphone,
      title: "Banner",
      detail: banner ? (banner.enabled ? banner.text || "Showing" : "Hidden") : "Not seeded yet",
      tag: banner ? (banner.enabled ? <Badge tone="lemon">Live</Badge> : <Badge>Hidden</Badge>) : null,
    },
    {
      href: "/articles",
      icon: FileText,
      title: "Volley Reader",
      detail: `${articles.count ?? 0} published${drafts.count ? `, ${drafts.count} draft${drafts.count === 1 ? "" : "s"}` : ""}`,
      tag: drafts.count ? <Badge tone="yellow">Drafts</Badge> : null,
    },
    {
      href: "/schedule",
      icon: CalendarClock,
      title: "Viewing Schedule",
      detail: viewings
        ? `${viewings.schedule.length} group${viewings.schedule.length === 1 ? "" : "s"} of days, ${slots} viewing window${slots === 1 ? "" : "s"}`
        : "Not seeded yet",
      tag: null,
    },
    {
      href: "/waitlist",
      icon: ClipboardList,
      title: "Waitlist Form",
      detail: "The wording of the Apply now form",
      tag: null,
    },
  ];

  return (
    <>
      <PageHeader
        title={firstName ? `Welcome back, ${firstName}!` : "Welcome back!"}
        description="Here's what's on the website right now."
      />

      <div className="mb-8 grid grid-cols-1 gap-4 sm:gap-6 md:mb-12 md:grid-cols-3">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="flex h-32 flex-col justify-between border border-ink/10 bg-white p-4 shadow-sm transition-colors hover:border-ink/40 sm:p-6"
          >
            <div className="flex items-start justify-between">
              <span className="text-xs font-medium tracking-wider text-ink/50 uppercase">{s.label}</span>
              <s.icon className="size-4.5 text-ink/40" />
            </div>
            <div className="text-3xl font-normal text-ink tabular-nums">{s.value}</div>
          </Link>
        ))}
      </div>

      <Card title="Website">
        <ul className="-my-3 divide-y divide-ink/5">
          {sections.map((s) => (
            <li key={s.href}>
              <Link href={s.href} className="group flex items-center gap-4 py-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-sm bg-bone/60 text-ink/50">
                  <s.icon className="size-4.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 font-medium text-ink">
                    {s.title} {s.tag}
                  </span>
                  <span className="mt-0.5 block truncate text-sm text-ink/50">{s.detail}</span>
                </span>
                <ArrowRight className="size-4 shrink-0 text-ink/30 transition group-hover:translate-x-0.5 group-hover:text-ink" />
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
