"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail } from "lucide-react";
import { press } from "@/components/ui";

export type SubscriberCounts = { total: number; day: number; month: number; year: number };

type Period = "day" | "month" | "year";
const PERIODS: { key: Period; label: string; note: string }[] = [
  { key: "day", label: "Day", note: "today" },
  { key: "month", label: "Month", note: "this month" },
  { key: "year", label: "Year", note: "this year" },
];

/* The dashboard's Subscribers tile: everyone subscribed to the newsletter,
   and how many joined today, this month or this year, picked with the
   switch along its foot. Drawn like the other stat tiles; the switch sits
   above the tile's link, so pressing it doesn't open the Newsletter page.
   `counts` is null until supabase/newsletter.sql has made the table. */
export default function SubscribersTile({ counts }: { counts: SubscriberCounts | null }) {
  const [period, setPeriod] = useState<Period>("month");
  const current = PERIODS.find((p) => p.key === period)!;
  const recent = counts?.[period] ?? 0;

  return (
    <div className="group relative flex flex-col rounded-xl border border-ink/5 bg-white p-4 shadow-soft transition-colors hover:border-ink/25">
      <Link href="/newsletter?tab=people" className="absolute inset-0 rounded-xl" aria-label="Subscribers: open the newsletter list" />
      <span className="flex items-center gap-2.5 text-[13px] text-ink/70">
        <span className="flex size-6 items-center justify-center rounded-md bg-bone/70 text-ink/55">
          <Mail className="size-3.5" />
        </span>
        Subscribers
      </span>
      <span className="mt-3 mb-3 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <span className="text-3xl leading-none font-medium text-ink tabular-nums">{counts?.total ?? 0}</span>
        <span className="text-xs text-ink/50">
          {!counts ? "Not set up yet" : recent ? `+${recent} ${current.note}` : `None new ${current.note}`}
        </span>
      </span>
      {counts && (
        <span role="group" aria-label="New sign-ups for" className="relative z-10 mt-auto grid grid-cols-3 gap-0.5 rounded-lg bg-bone/60 p-0.5">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPeriod(p.key)}
              aria-pressed={period === p.key}
              className={`cursor-pointer rounded-md py-1 text-xs ${press} ${
                period === p.key ? "bg-white font-medium text-ink shadow-soft" : "text-ink/50 hover:text-ink"
              }`}
            >
              {p.label}
            </button>
          ))}
        </span>
      )}
    </div>
  );
}
