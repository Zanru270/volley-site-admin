import { Inbox } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { Bone, SkeletonPage } from "@/components/Skeleton";

// The applications while they load: the four counts, the search bar, the
// status tabs, then the people.
export default function Loading() {
  return (
    <SkeletonPage>
      <PageHeader
        icon={Inbox}
        title="Applications"
        description='Everyone who has joined the waitlist through "Apply now" on the website. Open someone to see all of it; invite them to an interview, accept or decline them, and they and their parent are emailed.'
      />

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
        <div className="flex flex-wrap items-end gap-3">
          <Bone className="h-10 w-52 rounded-lg" />
          <Bone className="h-10 w-32 rounded-lg" />
        </div>
      </div>

      <div className="mb-5 flex items-center gap-6 overflow-hidden border-b border-ink/10 pb-3">
        {Array.from({ length: 5 }, (_, i) => (
          <Bone key={i} className="h-4 w-20 shrink-0" />
        ))}
        <Bone className="ml-auto h-6 w-28 shrink-0 rounded-full" />
      </div>

      <ul className="divide-y divide-ink/8 overflow-hidden rounded-2xl border border-ink/10 bg-white">
        {Array.from({ length: 6 }, (_, i) => (
          <li key={i} className="flex items-center gap-4 px-4 py-3.5">
            <Bone className="size-10 shrink-0 rounded-full" />
            <span className="min-w-0 flex-1 space-y-2">
              <Bone className="h-4 w-40" />
              <Bone className="h-3 w-28" />
            </span>
            <Bone className="hidden h-3 w-44 md:block" />
            <Bone className="hidden h-3 w-20 sm:block" />
            <Bone className="h-5 w-20 rounded-full" />
          </li>
        ))}
      </ul>
    </SkeletonPage>
  );
}
