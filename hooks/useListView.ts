"use client";

import { useSyncExternalStore } from "react";

/* Grid or list for a list page (Locations), remembered in this browser
   under `key`, as in the Bow + Arc CMS. Storage can be blocked or empty
   (private windows, cleared data), so a choice made this visit is also kept
   in memory, and the default is the grid. The server always renders the
   grid, so the first render never disagrees with it. The switch itself is
   components/ListViewSwitch.tsx. */

export type ListView = "grid" | "list";

const sessionViews = new Map<string, ListView>();
const listeners = new Set<() => void>();

const read = (key: string): ListView => {
  const session = sessionViews.get(key);
  if (session) return session;
  try {
    return localStorage.getItem(key) === "list" ? "list" : "grid";
  } catch {
    return "grid";
  }
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export function useListView(key: string) {
  const view = useSyncExternalStore(
    subscribe,
    () => read(key),
    (): ListView => "grid",
  );
  const setView = (next: ListView) => {
    sessionViews.set(key, next);
    try {
      localStorage.setItem(key, next);
    } catch {
      // Remembered for this visit only.
    }
    listeners.forEach((listener) => listener());
  };
  return [view, setView] as const;
}
