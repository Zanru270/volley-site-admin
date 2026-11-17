import { Briefcase } from "lucide-react";
import { PageHeader, Toolbar } from "@/components/ui";
import { Bone, buttonBone, SkeletonPage } from "@/components/Skeleton";

// The jobs while they load: three rows of the list.
export default function Loading() {
  return (
    <SkeletonPage>
      <PageHeader
        icon={Briefcase}
        title="Jobs"
        description="The openings on the website's Careers page, in the order it shows them."
        actions={<Bone className={`${buttonBone} w-full sm:w-32`} />}
      />
      <Toolbar>
        <span className="text-sm text-ink/50">Open jobs show on the website, in this order.</span>
        <Bone className="h-6 w-28 rounded-full" />
      </Toolbar>
      <div className="divide-y divide-ink/8 overflow-hidden rounded-2xl border border-ink/10 bg-white">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-4">
            <div className="flex-1 space-y-2">
              <Bone className="h-4 w-48" />
              <Bone className="h-3 w-64" />
            </div>
            <Bone className="h-6 w-28 rounded-full" />
            <Bone className="h-6 w-20 rounded-full" />
            <Bone className="h-8 w-36 rounded-lg" />
          </div>
        ))}
      </div>
    </SkeletonPage>
  );
}
