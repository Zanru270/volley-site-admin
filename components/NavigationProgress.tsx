"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { hasNavigationGuard } from "@/lib/navigation-guard";
import { onNavigationStart, startNavigationProgress } from "@/lib/navigation-progress";

/* A thin lemon bar along the top of the window while the next page loads.
   Next doesn't say how far along a page is, so the bar jumps a little way
   at once, then creeps toward 90% (slower the further it gets), and runs to
   the end when the new page arrives. If none arrives in 15 seconds it
   finishes anyway, rather than sitting there. */

const TRICKLE_MS = 250;
const GIVE_UP_MS = 15000;

export default function NavigationProgress() {
  const pathname = usePathname();
  const [width, setWidth] = useState(0);
  const [visible, setVisible] = useState(false);
  const loading = useRef(false);
  const timers = useRef<number[]>([]);

  const clearTimers = useCallback(() => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  }, []);

  const finish = useCallback(() => {
    if (!loading.current) return;
    loading.current = false;
    clearTimers();
    setWidth(100);
    timers.current.push(
      window.setTimeout(() => setVisible(false), 200),
      window.setTimeout(() => setWidth(0), 500),
    );
  }, [clearTimers]);

  // Starts on a navigation: from code (startNavigationProgress), or from a
  // link click, caught before <Link> takes it over. While something is
  // unsaved the leave guard asks first, and whatever navigates starts the
  // bar itself once leaving is confirmed.
  useEffect(() => {
    const start = () => {
      clearTimers();
      loading.current = true;
      setVisible(true);
      setWidth(15);
      const trickle = () => {
        setWidth((w) => w + (90 - w) * 0.08);
        timers.current.push(window.setTimeout(trickle, TRICKLE_MS));
      };
      timers.current.push(
        window.setTimeout(trickle, TRICKLE_MS),
        window.setTimeout(finish, GIVE_UP_MS),
      );
    };
    const onClick = (e: MouseEvent) => {
      if (hasNavigationGuard() || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const link = (e.target as Element).closest?.("a");
      if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
      const href = link.getAttribute("href");
      if (href && !href.startsWith("#")) startNavigationProgress(href);
    };
    const off = onNavigationStart(start);
    document.addEventListener("click", onClick, true);
    return () => {
      off();
      document.removeEventListener("click", onClick, true);
      clearTimers();
    };
  }, [clearTimers, finish]);

  // The new page has arrived.
  useEffect(() => {
    finish();
  }, [pathname, finish]);

  return (
    <div
      aria-hidden
      className={`pointer-events-none fixed inset-x-0 top-0 z-100 h-1transition-opacity duration-300 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      <div
        className="h-full bg-lemon transition-[width] duration-200 ease-out motion-reduce:transition-none"
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
