import { CalendarClock } from "lucide-react";
import { PageHeader, tabs } from "@/components/ui";
import { Bone, buttonBone, SkeletonPage } from "@/components/Skeleton";

// The interviews while they load: the upcoming ones by day, then the
// interview settings.
export default function Loading() {
  return (
    <SkeletonPage>
      <PageHeader
        icon={CalendarClock}
        title="Interviews"
        description="Who's coming in, when, where and with whom. Schedule one from here or from their application; they, their parent and the interviewers get the details and an “Add to calendar” invite."
      />
      <div className="space-y-8">
        <div className="flex justify-end">
          <Bone className={`${buttonBone} w-48`} />
        </div>

        <div>
          <div className={`${tabs} mb-4`}>
            <Bone className="h-7 w-24 rounded-lg bg-white!" />
            <Bone className="h-7 w-16 rounded-lg" />
          </div>
          <div className="space-y-5">
            {[3, 2].map((rows, day) => (
              <section key={day}>
                <Bone className="mb-2 h-4 w-28" />
                <ul className="divide-y divide-ink/8 overflow-hidden rounded-2xl border border-ink/10 bg-white">
                  {Array.from({ length: rows }, (_, i) => (
                    <li key={i} className="flex items-center gap-4 px-4 py-3.5">
                      <Bone className="h-4 w-12" />
                      <span className="min-w-0 flex-1 space-y-2">
                        <Bone className="h-4 w-40" />
                        <Bone className="h-3 w-56" />
                      </span>
                      <Bone className="h-8 w-20 rounded-lg" />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>

        <section className="rounded-2xl border border-ink/10 bg-white p-5 md:p-7">
          <Bone className="h-4 w-32" />
          <Bone className="mt-2 mb-6 h-4 w-64" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Bone className="h-10 rounded-lg" />
            <Bone className="h-10 rounded-lg" />
          </div>
        </section>
      </div>
    </SkeletonPage>
  );
}
