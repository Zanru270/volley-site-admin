import { Mail } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { Bone, SearchBarSkeleton, SkeletonPage } from "@/components/Skeleton";

// The newsletter list while it loads: the search and six rows.
export default function Loading() {
  return (
    <SkeletonPage>
      <PageHeader icon={Mail} title="Newsletter" description="Everyone who has signed up through the website's newsletter section." />
      <SearchBarSkeleton />
      <div className="divide-y divide-ink/8 overflow-hidden rounded-2xl border border-ink/10 bg-white">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3.5">
            <Bone className="h-4 w-56" />
            <Bone className="ml-auto h-4 w-24" />
            <Bone className="h-4 w-20" />
          </div>
        ))}
      </div>
    </SkeletonPage>
  );
}
