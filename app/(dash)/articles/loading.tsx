"use client";

import { FileText } from "lucide-react";
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

// The articles list while it loads, in the grid or list view last chosen.
export default function Loading() {
  const [view] = useListView("admin-articles-view");
  return (
    <SkeletonPage>
      <PageHeader
        icon={FileText}
        title="Volley Reader"
        description="The articles in the home page carousel, newest first, each with its own page. Drafts stay hidden until published."
        actions={<Bone className={`${buttonBone} w-full sm:w-36`} />}
      />
      <SearchBarSkeleton />
      <ChipsSkeleton count={3} />
      {view === "grid" ? <PhotoCardGridSkeleton photo="h-60" /> : <ThumbListSkeleton />}
    </SkeletonPage>
  );
}
