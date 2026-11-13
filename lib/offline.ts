"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useToast } from "@/components/ToastProvider";

/* What the admin does when the connection drops. Nothing is queued to be
   sent later on its own: a save only goes once you've pressed Save, and
   anything that emails someone never waits for the connection. Instead:
   the frame says you're offline (components/OfflineNotice.tsx), each
   editor keeps a copy of its unsaved changes on this device
   (useDraftBackup), and a Save pressed while offline goes the moment the
   connection's back (useSaveWhenOnline). */

const subscribe = (onChange: () => void) => {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
};

// Whether the browser has a connection. The server always assumes so.
export function useOnline() {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
}

/* Save, or while offline, Save as soon as the connection's back (with the
   changes as they are then). `waiting` is for SaveButton to say so. */
export function useSaveWhenOnline(save: () => void) {
  const [waiting, setWaiting] = useState(false);
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  });

  useEffect(() => {
    if (!waiting) return;
    const go = () => {
      setWaiting(false);
      saveRef.current();
    };
    window.addEventListener("online", go);
    return () => window.removeEventListener("online", go);
  }, [waiting]);

  const trigger = () => (navigator.onLine ? save() : setWaiting(true));
  return { save: trigger, waiting };
}

/* Unsaved photos are deleted a day after upload (lib/media-sweep.ts), so a
   copy older than this could point at one that's gone. */
const MAX_AGE_MS = 20 * 60 * 60 * 1000;

type Backup<T> = { draft: T; base: T; at: number };

const read = <T,>(key: string): Backup<T> | null => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Backup<T>) : null;
  } catch {
    return null;
  }
};
const write = (key: string, value: string | null) => {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Storage blocked or full: no copy this time.
  }
};

/* Keeps an editor's unsaved changes (`draft`, against what's saved,
   `base`) on this device while they differ, for a closed tab, a reload or
   a crash. Opening the editor again brings them back with `restore`, and a
   toast to discard them. If the page has been saved since (perhaps by
   someone else), it only offers them, so nothing newer is overwritten
   unasked. Leaving the editor inside the admin clears the copy: that's
   "Leave without saving", already chosen. */
export function useDraftBackup<T>(key: string, draft: T, base: T, restore: (value: T) => void) {
  const toast = useToast();
  const storageKey = `volley-draft:${key}`;
  const draftJson = JSON.stringify(draft);
  const baseJson = JSON.stringify(base);
  const latest = useRef({ draftJson, baseJson, restore });
  useEffect(() => {
    latest.current = { draftJson, baseJson, restore };
  });

  // On opening: anything kept from before?
  useEffect(() => {
    const kept = read<T>(storageKey);
    if (!kept) return;
    const { baseJson: savedNow, restore: put } = latest.current;
    if (Date.now() - kept.at > MAX_AGE_MS || JSON.stringify(kept.draft) === savedNow) {
      write(storageKey, null);
      return;
    }
    const when = new Intl.DateTimeFormat("en-GB", {
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(kept.at));
    if (JSON.stringify(kept.base) === savedNow) {
      put(kept.draft);
      toast.success("Unsaved changes brought back", `From ${when}, on this device. Save to keep them.`, {
        label: "Discard",
        onClick: () => put(JSON.parse(savedNow) as T),
      });
    } else {
      toast.success(
        "Unsaved changes found",
        `From ${when}, on this device, but this page has been saved since. Restoring puts them over the newer version.`,
        { label: "Restore", onClick: () => put(kept.draft) },
      );
    }
  }, [storageKey, toast]);

  // Kept (a moment after each change) while there's something unsaved.
  useEffect(() => {
    const id = window.setTimeout(() => {
      write(storageKey, draftJson === baseJson ? null : `{"draft":${draftJson},"base":${baseJson},"at":${Date.now()}}`);
    }, 300);
    return () => window.clearTimeout(id);
  }, [storageKey, draftJson, baseJson]);

  // A closing tab doesn't wait for that moment.
  useEffect(() => {
    const flush = () => {
      const { draftJson: d, baseJson: b } = latest.current;
      if (d !== b) write(storageKey, `{"draft":${d},"base":${b},"at":${Date.now()}}`);
    };
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      // Left inside the admin: the changes were let go on purpose.
      write(storageKey, null);
    };
  }, [storageKey]);
}
