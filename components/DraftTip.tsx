"use client";

import { useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { EyeOff, X } from "lucide-react";

/* A small tip under the button that puts something on the website (an
   article's Publish, a building's visibility), while it's still a draft:
   that it's hidden on the website, and that this button changes that.

   `show` while it's a draft; `children` is the button it points at.
   It's drawn over the page (portalled to <body>), under the button and
   lined up with its right edge, as those buttons sit at the right of the
   editor's bar; it follows the button as the window resizes. Its cross,
   or pressing the button, puts it away for as long as the editor's open;
   it comes back the next time a draft is opened. */
export default function DraftTip({
  show,
  title = "This is still a draft",
  children,
  message,
}: {
  show: boolean;
  title?: string;
  // What it says under the title: what's hidden, and what to press.
  message: ReactNode;
  children: ReactNode;
}) {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [dismissed, setDismissed] = useState(false);
  // Drawn in the browser only: its place depends on the window.
  const inBrowser = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const open = show && !dismissed;

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => setRect(anchorRef.current?.getBoundingClientRect() ?? null);
    place();
    window.addEventListener("resize", place);
    // The bar's other buttons can change width (Unsaved changes, a save).
    const observer = new ResizeObserver(place);
    if (anchorRef.current?.parentElement) observer.observe(anchorRef.current.parentElement);
    return () => {
      window.removeEventListener("resize", place);
      observer.disconnect();
    };
  }, [open]);

  // Its right edge under the button's, kept on screen on a phone.
  const right = rect ? Math.max(8, window.innerWidth - rect.right) : 0;
  // The arrow under the middle of the button, measured from the tip's right edge.
  const arrow = rect ? Math.max(16, window.innerWidth - right - (rect.left + rect.width / 2) - 6) : 16;

  return (
    <>
      {/* Pressing the button itself puts the tip away too: it's done its
          job, and a menu the button opens (a building's) lands where it was. */}
      <span ref={anchorRef} onPointerDownCapture={() => setDismissed(true)} className="inline-flex">
        {children}
      </span>
      {open &&
        inBrowser &&
        rect &&
        createPortal(
          <div
            role="status"
            style={{ top: rect.bottom + 10, right }}
            className="fixed z-50 w-72 max-w-[calc(100vw-16px)] animate-pop-in rounded-xl bg-ink px-4 py-3 text-bone shadow-[0_12px_32px_-8px_rgb(0_0_0/0.45)]"
          >
            {/* The arrow, pointing up at the button. */}
            <span aria-hidden="true" style={{ right: arrow }} className="absolute -top-1.5 size-3 rotate-45 rounded-[2px] bg-ink" />
            <div className="flex items-start gap-2.5">
              <EyeOff className="mt-0.5 size-4 shrink-0 text-bone/60" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{title}</p>
                <p className="mt-1 text-xs leading-relaxed text-bone/70">{message}</p>
              </div>
              <button
                type="button"
                onClick={() => setDismissed(true)}
                aria-label="Hide this tip"
                className="-mt-1 -mr-1.5 shrink-0 cursor-pointer rounded-full p-1 text-bone/50 transition-colors hover:bg-bone/10 hover:text-bone"
              >
                <X className="size-3.5" />
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
