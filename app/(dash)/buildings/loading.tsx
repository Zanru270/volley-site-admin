"use client";

import { Building2 } from "lucide-react";
import { PageHeader } from "@/components/ui";
import {
  Bone,
  buttonBone,
  ChipsSkeleton,
  PhotoCardGridSkeleton,
  SearchBarSkeleton,
  SkeletonPage,
  ThumbListSkeleton,
} from "@/components/Skeleton";
import { useListView } from "@/hooks/useListView";

// The buildings list while it loads, in the grid or list view last chosen.
export default function Loading() {
  const [view] = useListView("admin-buildings-view");
  return (
    <SkeletonPage>
      <PageHeader
        icon={Building2}
        title="Buildings"
        description="Each building's page, and its card in the website's Locations carousel. The order here is the carousel's: drag a card, or use its arrows, and the new order saves straight away."
        actions={<Bone className={buttonBone} />}
      />
      <SearchBarSkeleton />
      <ChipsSkeleton count={4} />
      {view === "grid" ? <PhotoCardGridSkeleton photo="h-56" summary /> : <ThumbListSkeleton />}
    </SkeletonPage>
  );
}
