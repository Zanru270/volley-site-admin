import { CalendarClock } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { Bone, SkeletonPage } from "@/components/Skeleton";

// The viewing schedule while it loads: the week's seven days, then the
// booking rules.
export default function Loading() {
  return (
    <SkeletonPage>
      <PageHeader
        icon={CalendarClock}
        title="Viewing schedule"
        description="When each building holds room viewings: the timetable on the Contact page, and the times people can pick in Book a Tour. All times are Pretoria time."
      />
      <div className="space-y-8">
        <section className="rounded-2xl border border-ink/10 bg-white p-5 md:p-7">
          <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <Bone className="mt-1 h-4 w-full max-w-md" />
            <Bone className="h-9 w-36 rounded-lg" />
          </header>
          <div className="grid gap-3 md:grid-cols-7">
            {Array.from({ length: 7 }, (_, day) => (
              <div key={day} className="flex flex-col gap-2 rounded-xl border border-ink/10 bg-bone/30 p-2">
                <Bone className="mx-1 mb-1 h-3 w-8" />
                {Array.from({ length: day % 3 === 2 ? 1 : 2 }, (_, i) => (
                  <Bone key={i} className="h-16 rounded-lg bg-white!" />
                ))}
                <Bone className="mt-auto h-7 rounded-lg" />
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-ink/10 bg-white p-5 md:p-7">
          <Bone className="h-4 w-36" />
          <Bone className="mt-2 mb-6 h-4 w-72" />
          <div className="space-y-4">
            <Bone className="h-4 w-full max-w-xl" />
            <Bone className="h-4 w-full max-w-md" />
            <Bone className="h-4 w-full max-w-lg" />
          </div>
          <Bone className="mt-8 h-40 rounded-xl" />
        </section>
      </div>
    </SkeletonPage>
  );
}
