"use client";

import { WifiOff } from "lucide-react";
import { useOnline } from "@/lib/offline";

/* A dark pill at the foot of the window while there's no connection, over
   every screen and the live editors (lib/offline.ts says what happens
   meanwhile). Gone the moment it's back. */
export default function OfflineNotice() {
  const online = useOnline();
  if (online) return null;
  return (
    // Above the floating save bar (components/SaveBar.tsx), not over it.
    <div role="status" className="pointer-events-none fixed inset-x-0 bottom-22 z-60 flex justify-center px-4">
      <p className="flex max-w-xl animate-pop-in items-center gap-3 rounded-2xl bg-ink py-3 pr-5 pl-4 text-sm text-bone shadow-[0_12px_40px_-12px_rgb(26_26_24/0.5)]">
        <WifiOff className="size-4 shrink-0 text-lemon" />
        <span>
          You&apos;re offline. Your changes are kept on this device, and Save goes through once you&apos;re back.
        </span>
      </p>
    </div>
  );
}
