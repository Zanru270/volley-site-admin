"use client";

import { useState } from "react";
import Link from "next/link";
import { Clock } from "lucide-react";
import { tab, tabs } from "@/components/ui";
import type { ViewingGroup } from "@/lib/types";

/* The dashboard's view of the viewing schedule: one tab per group of days,
   and that group's windows with the buildings and who hosts them. */
// `names`: each building's name as it reads now, by slug ("Brooklyn").
export default function ScheduleGlance({ schedule, names }: { schedule: ViewingGroup[]; names: Record<string, string> }) {
  const [shown, setShown] = useState(0);
  const group = schedule[shown];

  return (
    <div className="rounded-2xl border border-ink/10 bg-white p-4">
      {schedule.length === 0 ? (
        <p className="px-2 py-8 text-center text-sm text-ink/55">
          No viewing times yet.{" "}
          <Link href="/schedule" className="text-ink underline underline-offset-2">
            Set up the schedule
          </Link>
        </p>
      ) : (
        <>
          <div role="tablist" aria-label="Days" className={`${tabs} w-full! sm:w-full`}>
            {schedule.map((g, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={i === shown}
                onClick={() => setShown(i)}
                className={`${tab(i === shown)} flex-1`}
              >
                {g.days || `Group ${i + 1}`}
              </button>
            ))}
          </div>
          <ul role="tabpanel" className="mt-3 space-y-2">
            {group.slots.map((s, i) => (
              <li key={i} className="flex items-start gap-3 rounded-xl border border-ink/8 px-3 py-2.5">
                <Clock className="mt-0.5 size-4 shrink-0 text-ink/35" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm text-ink tabular-nums">
                    {s.from}–{s.to}
                  </span>
                  {s.hosts && <span className="block truncate text-xs text-ink/50">Hosted by {s.hosts}</span>}
                </span>
                {s.houses.length > 0 && (
                  <span className="shrink-0 rounded-full bg-pink/30 px-2 py-0.5 text-[11px] font-medium text-brick">
                    {s.houses.length === 1
                      ? (names[s.houses[0]] ?? s.houses[0])
                      : `${s.houses.length} buildings`}
                  </span>
                )}
              </li>
            ))}
            {group.slots.length === 0 && (
              <li className="px-2 py-6 text-center text-sm text-ink/50">No viewings on these days.</li>
            )}
          </ul>
          <Link
            href="/schedule"
            className="mt-3 block rounded-lg py-2 text-center text-sm text-ink/55 transition-colors hover:bg-bone/30 hover:text-ink"
          >
            Edit the schedule
          </Link>
        </>
      )}
    </div>
  );
}
