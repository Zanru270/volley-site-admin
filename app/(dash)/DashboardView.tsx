/* eslint-disable @next/next/no-img-element -- previews of arbitrary URLs */
import Image from "next/image";
import Link from "next/link";
import {
  CalendarClock,
  ChevronRight,
  FileText,
  HelpCircle,
  MapPin,
} from "lucide-react";
import { articleDate } from "@/lib/articles";
import { buildingName, siteAsset } from "@/lib/site";
import type { Article, Banner, Location, Viewings } from "@/lib/types";
import { viewingDays } from "@/lib/viewings";
import { Badge, button, SectionTitle, tableHead, td, th } from "@/components/ui";
import ScheduleGlance from "./ScheduleGlance";

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "Africa/Johannesburg",
  }).format(new Date(iso));

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export type DashboardData = {
  firstName?: string;
  articles: Pick<
    Article,
    "id" | "slug" | "title" | "location" | "date" | "meta" | "sort" | "category" | "excerpt" | "image" | "published"
  >[];
  faqTabs: string[];
  locations: Pick<Location, "slug" | "name" | "address" | "rooms" | "updated_at">[];
  banner: Banner | null;
  viewings: Viewings | null;
};

// The dashboard's page, drawn from what page.tsx loads.
export default function DashboardView({
  firstName,
  articles: reader,
  faqTabs,
  locations: residences,
  banner,
  viewings,
}: DashboardData) {
  const published = reader.filter((a) => a.published).length;
  const drafts = reader.length - published;
  const cool = faqTabs.filter((t) => t === "cool").length;
  const faqCount = faqTabs.length;
  const roomTypes = residences.reduce((n, l) => n + (l.rooms?.types.length ?? 0), 0);
  const slots = viewings?.windows.length ?? 0;
  const days = viewings ? viewingDays(viewings.windows) : [];
  const stats = [
    {
      label: "Published articles",
      value: published,
      note: drafts ? `${plural(drafts, "draft")} waiting` : "No drafts",
      href: "/articles",
      icon: FileText,
    },
    {
      label: "FAQs",
      value: faqCount,
      note: `${cool} cool, ${faqCount - cool} boring`,
      href: "/home?open=faqs.list",
      icon: HelpCircle,
    },
    {
      label: "Buildings",
      value: residences.length,
      note: plural(roomTypes, "room type"),
      href: "/buildings",
      icon: MapPin,
    },
    {
      label: "Viewings",
      value: slots,
      note: viewings ? `on ${plural(new Set(viewings.windows.flatMap((w) => w.weekdays)).size, "day")} a week` : "Not set up yet",
      href: "/schedule",
      icon: CalendarClock,
    },
  ];

  return (
    <div className="space-y-10">
      {/* The welcome panel: the dashboard's one loud moment, with the
          site's lemon glowing up from the corner. */}
      <section className="relative overflow-hidden rounded-3xl border border-ink/8 bg-bone/40 p-5 md:p-7">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -bottom-40 size-[34rem] rounded-full bg-[radial-gradient(closest-side,var(--color-lemon),transparent)] opacity-80"
        />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-5">
            <span className="relative flex size-18 shrink-0 items-center justify-center rounded-full bg-white">
              <svg viewBox="0 0 72 72" className="absolute inset-0 -rotate-90" aria-hidden="true">
                <circle cx="36" cy="36" r="34" fill="none" stroke="var(--color-bone)" strokeWidth="3" />
                <circle
                  cx="36"
                  cy="36"
                  r="34"
                  fill="none"
                  stroke="var(--color-lightGreen)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={`${reader.length ? (published / reader.length) * 213.6 : 0} 213.6`}
                />
              </svg>
              <Image
                src="/Volley-Logo-Small-White.svg"
                alt=""
                width={30}
                height={34}
                className="h-8 w-auto brightness-0"
              />
            </span>
            <div>
              <h1 className="font-publish text-3xl leading-tight text-ink md:text-[2.5rem]">
                {firstName ? `Welcome back, ${firstName}` : "Welcome back"}
              </h1>
              <p className="mt-1 text-sm text-ink/55">
                {reader.length
                  ? `${published} of ${plural(reader.length, "article")} live on the Volley Reader.`
                  : "Here's what's on the website right now."}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href="/home?open=banner" className={button.primary}>
              Edit banner
            </Link>
            <Link href="/articles" className={button.secondary}>
              Manage articles
            </Link>
          </div>
        </div>

        {/* The banner as the site shows it, or a note that it's off. */}
        <Link
          href="/home?open=banner"
          className="relative mt-6 flex items-center gap-3 rounded-xl border border-ink/8 bg-white/80 p-2 pr-4 text-sm transition-colors hover:border-ink/25"
        >
          {banner?.enabled ? (
            <>
              <span className="min-w-0 flex-1 truncate rounded-lg bg-lemon px-3 py-2 text-center text-xs font-bold text-ink">
                {banner.text}
                {banner.linkText && <span className="font-light underline">{banner.linkText}</span>}
                <span className="font-light">{banner.after}</span>
              </span>
              <Badge tone="lemon">Live</Badge>
            </>
          ) : (
            <>
              <span className="min-w-0 flex-1 px-2 py-1.5 text-ink/55">
                {banner ? "The banner is hidden on the website." : "The banner hasn't been set up yet."}
              </span>
              <Badge>{banner ? "Hidden" : "Not set up"}</Badge>
            </>
          )}
        </Link>

        <div className="relative mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map((s) => (
            <Link
              key={s.label}
              href={s.href}
              className="group rounded-xl border border-ink/5 bg-white p-4 shadow-soft transition-colors hover:border-ink/25"
            >
              <span className="flex items-center gap-2.5 text-[13px] text-ink/70">
                <span className="flex size-6 items-center justify-center rounded-md bg-bone/70 text-ink/55">
                  <s.icon className="size-3.5" />
                </span>
                {s.label}
              </span>
              <span className="mt-3 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                <span className="text-3xl leading-none font-medium text-ink tabular-nums">{s.value}</span>
                <span className="text-xs text-ink/50">{s.note}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* The Volley Reader, in carousel order. */}
      <section>
        <SectionTitle
          count={reader.length}
          actions={
            <Link href="/articles" className="flex items-center gap-1 text-sm text-ink/55 hover:text-ink">
              All articles <ChevronRight className="size-4" />
            </Link>
          }
        >
          Volley Reader
        </SectionTitle>
        {reader.length ? (
          <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0">
            {reader.map((a) => (
              <Link
                key={a.id}
                href={`/articles/${a.id}`}
                className="flex w-72 shrink-0 snap-start sm:w-80 flex-col overflow-hidden rounded-2xl border border-ink/10 bg-white transition-colors hover:border-ink/30"
              >
                <div className="flex items-start gap-3 p-4">
                  <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-bone/60">
                    {a.image ? (
                      <img src={siteAsset(a.image)} alt="" className="size-full object-cover" />
                    ) : (
                      <FileText className="size-4 text-ink/40" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink">{a.title}</span>
                    <span className="block truncate text-xs text-lightGreen">
                      {a.location || `/${a.slug}`}
                    </span>
                  </span>
                  {a.published ? <Badge tone="lemon">Published</Badge> : <Badge tone="yellow">Draft</Badge>}
                </div>
                <p className="line-clamp-2 min-h-10 px-4 text-sm leading-5 text-ink/55">
                  {a.excerpt || "No excerpt yet."}
                </p>
                <div className="mt-4 flex flex-wrap gap-2 bg-bone/30 px-4 py-3 text-xs">
                  <span className="rounded-md bg-white px-2 py-1 text-ink/70">{articleDate(a) || "No date"}</span>
                  {a.category && <span className="rounded-md bg-white px-2 py-1 text-ink/70">{a.category}</span>}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <Link
            href="/articles"
            className="block rounded-2xl border border-dashed border-ink/20 px-6 py-10 text-center text-sm text-ink/55 hover:border-ink/40"
          >
            No articles yet. Write the first one for the Volley Reader.
          </Link>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <section className="min-w-0">
          <SectionTitle count={residences.length}>Buildings</SectionTitle>
          <div className="overflow-x-auto rounded-2xl border border-ink/10 bg-white p-2 md:p-3">
            <table className="w-full text-left text-sm">
              <thead className={tableHead}>
                <tr>
                  <th className={th}>Building</th>
                  <th className={th}>Room types</th>
                  <th className={th}>Last edited</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/5">
                {residences.map((l) => (
                  <tr key={l.slug} className="transition-colors hover:bg-bone/25">
                    <td className={td}>
                      <Link href={`/buildings/${l.slug}`} className="flex items-center gap-3">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-bone/60 text-ink/45">
                          <MapPin className="size-4" />
                        </span>
                        <span className="min-w-0">
                          <span className="block font-medium whitespace-nowrap text-ink">
                            {buildingName(l)}
                          </span>
                          <span className="block max-w-56 truncate text-xs text-ink/50">
                            {l.address ?? "No address set"}
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td className={`${td} whitespace-nowrap text-ink/70`}>
                      {l.rooms?.types.length ? plural(l.rooms.types.length, "type") : "—"}
                    </td>
                    <td className={`${td} whitespace-nowrap text-ink/60`}>
                      {l.updated_at ? formatDate(l.updated_at) : "—"}
                    </td>
                  </tr>
                ))}
                {residences.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-10 text-center text-ink/50">
                      No buildings yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="min-w-0">
          <SectionTitle>Viewing times</SectionTitle>
          <ScheduleGlance
            schedule={days}
            names={Object.fromEntries(residences.map((l) => [l.slug, buildingName(l).replace(/^Volley /, "")]))}
          />
        </section>
      </div>
    </div>
  );
}
