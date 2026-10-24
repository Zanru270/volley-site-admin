"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import { labelClass } from "@/components/ui";

/* A dropdown drawn like the inputs (an underline, a chevron) instead of
   the browser's own, as in the Bow + Arc CMS. Controlled: `value` in,
   `onChange` out.

   The menu is portalled to <body> and placed with `position: fixed` under
   the button, so a table's scroll box or a drawer can't clip it. It
   follows the button while the page scrolls, and opens upwards when
   there's no room below. */
export default function CustomSelect({
  label,
  value,
  options,
  onChange,
  disabled = false,
  className = "",
}: {
  label?: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => setRect(buttonRef.current?.getBoundingClientRect() ?? null);
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!buttonRef.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const selected = options.find((o) => o.value === value)?.label ?? value;
  const menuHeight = options.length * 40 + 8;
  const upwards = rect ? rect.bottom + menuHeight + 8 > window.innerHeight && rect.top > menuHeight : false;

  return (
    <div className={`space-y-1 ${className}`}>
      {label && <span className={labelClass}>{label}</span>}
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="group flex w-full cursor-pointer items-center justify-between gap-3 border-b border-ink/25 bg-transparent py-2 text-left text-sm text-ink transition-colors hover:border-ink disabled:cursor-wait disabled:opacity-50"
      >
        <span className="truncate">{selected}</span>
        <ChevronDown
          className={`size-3.5 shrink-0 text-ink/40 transition-transform duration-300 group-hover:text-ink ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open &&
        rect &&
        createPortal(
          <div
            ref={menuRef}
            role="listbox"
            style={{
              position: "fixed",
              left: rect.left,
              width: Math.max(rect.width, 176),
              ...(upwards ? { bottom: window.innerHeight - rect.top + 4 } : { top: rect.bottom + 4 }),
            }}
            className="z-120 animate-pop-in border border-ink/10 bg-white py-1 shadow-xl"
          >
            {options.map((o) => (
              <button
                key={o.value}
                type="button"
                role="option"
                aria-selected={o.value === value}
                onClick={() => {
                  setOpen(false);
                  if (o.value !== value) onChange(o.value);
                }}
                className="flex h-10 w-full cursor-pointer items-center justify-between px-4 text-left text-sm text-ink/70 transition-colors hover:bg-bone/50 hover:text-ink"
              >
                {o.label}
                {o.value === value && <Check className="size-3.5 text-ink" />}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}
