import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";

/* The grey shapes a page shows while its data loads (each route's
   loading.tsx), laid out as the page itself is: the same cards, toolbars
   and rows, with what's fixed (a page's title and description) shown for
   real and what comes from the database as soft pulsing blocks. */

// One block standing in for text, a photo or a button.
export function Bone({ className = "" }: { className?: string }) {
  return <span aria-hidden="true" className={`block animate-pulse rounded-md bg-ink/6 motion-reduce:animate-none ${className}`} />;
}

// Wraps a page's skeleton, telling screen readers it's loading.
export function SkeletonPage({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div role="status" aria-busy="true" className={className}>
      <span className="sr-only">Loading…</span>
      {children}
    </div>
  );
}

// A button's place in a page header or toolbar.
export const buttonBone = "h-10 w-36 rounded-lg";

/* A list page's search bar with its count and grid / list switch
   (Buildings, Articles). */
export function SearchBarSkeleton() {
  return (
    <div className="mb-4 flex flex-col items-start justify-between gap-4 rounded-2xl border border-ink/10 bg-white p-4 sm:flex-row sm:items-center">
      <Bone className="h-9 w-full rounded-lg sm:w-1/2 md:w-1/3" />
      <div className="flex shrink-0 items-center gap-3 self-end sm:self-auto">
        <Bone className="h-6 w-24 rounded-full" />
        <Bone className="h-9 w-20 rounded-xl" />
      </div>
    </div>
  );
}

// The row of filter chips under it.
export function ChipsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="mb-6 flex items-center gap-2 overflow-hidden pb-1">
      {Array.from({ length: count }, (_, i) => (
        <Bone key={i} className={`h-7.5 shrink-0 rounded-full ${i === 0 ? "w-16" : "w-24"}`} />
      ))}
    </div>
  );
}

/* Photo cards, two across from sm (the grid view of Buildings and
   Articles). `photo` is the photo's height class. */
export function PhotoCardGridSkeleton({ photo, summary = false }: { photo: string; summary?: boolean }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-ink/10 bg-white">
          <Bone className={`w-full rounded-none ${photo}`} />
          <div className="space-y-2 p-4">
            <Bone className="h-6 w-2/5" />
            <Bone className="h-3.5 w-3/5" />
            {summary && <Bone className="h-4 w-11/12" />}
            <div className="flex gap-3 pt-1">
              <Bone className="h-3.5 w-16" />
              <Bone className="h-3.5 w-20" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// The same records as a list: thumbnail, two lines, badges.
export function ThumbListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="divide-y divide-ink/5 overflow-hidden rounded-2xl border border-ink/10 bg-white">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4 py-3 pr-4 pl-4">
          <Bone className="size-14 shrink-0 rounded-lg" />
          <span className="min-w-0 flex-1 space-y-2">
            <Bone className="h-4 w-2/5" />
            <Bone className="h-3 w-1/4" />
          </span>
          <Bone className="hidden h-5 w-20 rounded-full sm:block" />
          <Bone className="size-8 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

/* Every live editor (Home page, a building, an article, the waitlist
   form) while it loads: its top bar, then the page in the preview,
   full-screen over the admin as the editor is. */
export function EditorSkeleton({ back }: { back: string }) {
  return (
    <SkeletonPage className="fixed inset-0 z-45 flex flex-col bg-bone">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-ink/8 bg-white px-3 sm:px-4">
        <span className="flex shrink-0 items-center gap-2 px-2 text-sm text-ink/40">
          <ArrowLeft className="size-4" /> <span className="hidden lg:inline">{back}</span>
        </span>
        <span aria-hidden="true" className="hidden h-5 border-l border-ink/10 lg:block" />
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Bone className="h-6 w-40" />
        </div>
        <Bone className="hidden h-9 w-28 rounded-xl sm:block lg:w-64" />
        <Bone className="h-9 w-10 rounded-lg md:w-28" />
        <Bone className="h-9 w-20 rounded-lg" />
      </header>

      {/* The website's page, roughly: its menu, a big opening photo, then
          a heading and text. */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
        <div className="flex items-center justify-between px-6 py-5 md:px-10">
          <Bone className="h-6 w-24" />
          <div className="hidden gap-6 md:flex">
            <Bone className="h-4 w-16" />
            <Bone className="h-4 w-16" />
            <Bone className="h-4 w-16" />
          </div>
          <Bone className="h-9 w-28 rounded-full" />
        </div>
        <Bone className="mx-4 h-[45vh] rounded-2xl md:mx-10" />
        <div className="space-y-3 px-6 py-10 md:px-10">
          <Bone className="h-9 w-2/3 max-w-xl" />
          <Bone className="h-4 w-full max-w-2xl" />
          <Bone className="h-4 w-5/6 max-w-xl" />
        </div>
      </div>
    </SkeletonPage>
  );
}
