import { UserSearch } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { Bone, SearchBarSkeleton, SkeletonPage } from "@/components/Skeleton";

// The applications while they load: the counts, the filters and five rows.
export default function Loading() {
  return (
    <SkeletonPage>
      <PageHeader
        icon={UserSearch}
        title="Job applications"
        description="Everyone who has applied through the website's Careers page."
      />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Bone key={i} className="h-26 rounded-2xl" />
        ))}
      </div>
      <SearchBarSkeleton />
      <div className="mb-5 flex gap-6 border-b border-ink/10 pb-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Bone key={i} className="h-4 w-20" />
        ))}
      </div>
      <div className="divide-y divide-ink/8 overflow-hidden rounded-2xl border border-ink/10 bg-white">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3.5">
            <Bone className="size-10 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <Bone className="h-4 w-40" />
              <Bone className="h-3 w-28" />
            </div>
            <Bone className="h-5 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </SkeletonPage>
  );
}
