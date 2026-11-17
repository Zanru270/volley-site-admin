import { CalendarCheck } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { Bone, SkeletonPage } from "@/components/Skeleton";
import { BOOKINGS_DESCRIPTION } from "@/lib/bookings";

// The bookings while they load: the month's calendar, the four counts, the search bar, the tabs,
// then a day of bookings.
export default function Loading() {
  return (
    <SkeletonPage>
      <PageHeader icon={CalendarCheck} title="Tour bookings" description={BOOKINGS_DESCRIPTION} />

      <div className="mb-6 rounded-2xl border border-ink/10 bg-white p-4 sm:p-5">
        <div className="mb-4 flex items-end justify-between gap-3">
          <span className="space-y-1.5">
            <Bone className="h-8 w-48" />
            <Bone className="h-3 w-56" />
          </span>
          <Bone className="h-9 w-64 rounded-lg" />
        </div>
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
          {Array.from({ length: 35 }, (_, i) => (
            <Bone key={i} className="h-14 rounded-lg sm:h-24" />
          ))}
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex min-h-26 flex-col justify-between gap-3 rounded-2xl border border-ink/10 bg-white p-4 sm:p-5">
            <Bone className="h-3.5 w-20" />
            <span className="space-y-1.5">
              <Bone className="h-8 w-12" />
              <Bone className="h-3 w-24" />
            </span>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-ink/10 bg-white p-4 md:flex-row md:items-end md:justify-between">
        <Bone className="h-9 w-full rounded-lg sm:w-1/2 md:w-1/3" />
        <Bone className="h-9 w-52 rounded-lg" />
      </div>

      <div className="mb-5 flex items-center gap-6 border-b border-ink/10 pb-3">
        {Array.from({ length: 4 }, (_, i) => (
          <Bone key={i} className="h-4 w-20" />
        ))}
      </div>

      <Bone className="mb-2 h-4 w-48" />
      <div className="divide-y divide-ink/8 overflow-hidden rounded-2xl border border-ink/10 bg-white">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3.5">
            <Bone className="h-4 w-20" />
            <span className="flex-1 space-y-1.5">
              <Bone className="h-3.5 w-40" />
              <Bone className="h-3 w-28" />
            </span>
            <Bone className="h-5 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </SkeletonPage>
  );
}
