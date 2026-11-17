import { PanelBottom } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { Bone, SkeletonPage } from "@/components/Skeleton";

// The footer while it loads: its four links and the preview.
export default function Loading() {
  return (
    <SkeletonPage>
      <PageHeader
        icon={PanelBottom}
        title="Footer"
        description="The social links at the foot of every page of the website."
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        <div className="space-y-3 rounded-2xl border border-ink/10 bg-white p-5">
          {Array.from({ length: 4 }, (_, i) => (
            <Bone key={i} className="h-16 rounded-xl" />
          ))}
        </div>
        <Bone className="h-64 rounded-2xl" />
      </div>
    </SkeletonPage>
  );
}
