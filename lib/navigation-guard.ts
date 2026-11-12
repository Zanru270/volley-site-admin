import { useEffect } from "react";
import { useConfirm } from "@/components/ConfirmProvider";

/* One app-wide "are you sure you want to leave?" check, for navigation a
   beforeunload handler can't see (the sidebar's links, the page jump, links
   inside a page). A screen with unsaved work registers a guard with
   useLeaveGuard; everything that navigates asks confirmNavigation first,
   and waits for the answer. Only one screen holds unsaved work at a time,
   so one slot is enough. */

type Guard = () => Promise<boolean>;

let guard: Guard | null = null;

// Registers the current screen's guard, or with null clears it.
export function setNavigationGuard(next: Guard | null) {
  guard = next;
}

// Whether leaving needs asking about: something on screen is unsaved.
export function hasNavigationGuard(): boolean {
  return guard !== null;
}

// Resolves true when it's fine to navigate away: no guard, or the guard allows it.
export function confirmNavigation(): Promise<boolean> {
  return guard ? guard() : Promise.resolve(true);
}

/* Asks before leaving (tab close and reload with the browser's own
   question, any guarded link with the admin's) while `dirty`. Every screen
   with a Save button calls it. */
export function useLeaveGuard(dirty: boolean) {
  const confirm = useConfirm();
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    setNavigationGuard(() =>
      confirm({
        title: "Leave without saving?",
        message: "You have changes on this page that haven't been saved. Leaving now loses them.",
        confirmText: "Leave without saving",
        variant: "warning",
      }),
    );
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      setNavigationGuard(null);
    };
  }, [dirty, confirm]);
}
