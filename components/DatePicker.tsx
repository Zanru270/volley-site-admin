"use client";

import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, Check, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { press } from "@/components/ui";

/* The admin's own date and time pickers, in place of the browser's: a box
   drawn like the inputs and CustomSelect, opening a small card in the
   site's palette (a month of days, or a list of times).

   Values are the same strings the native inputs gave, so nothing that
   stores them changes: DatePicker "YYYY-MM-DD", TimePicker "HH:MM",
   DateTimePicker "YYYY-MM-DDTHH:MM" ("" for empty in all three).

   Like CustomSelect, the card is portalled to <body> with position: fixed,
   so drawers and scroll boxes can't clip it, and opens upwards when
   there's no room below. `required` keeps the browser's "fill this in"
   check on a form's submit via a hidden input under the box. */

const boxClass =
  "group flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg border border-ink/15 bg-white px-3 py-2.5 text-left text-sm text-ink transition-colors hover:border-ink/30 focus-visible:border-ink/60 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ink/5 disabled:cursor-not-allowed disabled:opacity-50";

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = (s: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
};
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const addMonths = (d: Date, n: number) => {
  const last = new Date(d.getFullYear(), d.getMonth() + n + 1, 0).getDate();
  return new Date(d.getFullYear(), d.getMonth() + n, Math.min(d.getDate(), last));
};

const showDate = (s: string) =>
  parse(s)?.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" }) ?? s;
const monthTitle = (d: Date) => d.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

/* Opening, placing and closing the card: shared by both pickers. */
function usePopover() {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => setRect(anchorRef.current?.getBoundingClientRect() ?? null);
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
      if (!anchorRef.current?.contains(target) && !cardRef.current?.contains(target)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // Close the card, not the drawer underneath it.
      e.stopPropagation();
      setOpen(false);
      anchorRef.current?.focus();
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  const close = () => {
    setOpen(false);
    anchorRef.current?.focus();
  };

  return { open, setOpen, close, rect, anchorRef, cardRef };
}

/* Under the box (or above it when there's no room below), kept on screen. */
function placeCard(rect: DOMRect, cardHeight: number, minWidth: number): React.CSSProperties {
  const upwards = rect.bottom + cardHeight + 8 > window.innerHeight && rect.top > cardHeight;
  const width = Math.max(rect.width, minWidth);
  const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
  return {
    position: "fixed",
    left,
    width,
    ...(upwards ? { bottom: window.innerHeight - rect.top + 4 } : { top: rect.bottom + 4 }),
  };
}

/* The hidden input that lets `required` stop a form's submit. */
function RequiredShadow({ value, required }: { value: string; required?: boolean }) {
  if (!required) return null;
  return (
    <input
      tabIndex={-1}
      aria-hidden="true"
      required
      value={value}
      onChange={() => {}}
      className="pointer-events-none absolute inset-x-0 bottom-0 h-px opacity-0"
    />
  );
}

function Card({ cardRef, style, children, label }: { cardRef: React.RefObject<HTMLDivElement | null>; style: React.CSSProperties; children: ReactNode; label: string }) {
  return createPortal(
    <div
      ref={cardRef}
      role="dialog"
      aria-label={label}
      style={style}
      className="z-120 animate-pop-in rounded-xl border border-ink/10 bg-white p-3 shadow-soft"
    >
      {children}
    </div>,
    document.body,
  );
}

export function DatePicker({
  value,
  onChange,
  required = false,
  clearable = !required,
  disabled = false,
  placeholder = "Pick a day",
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  clearable?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}) {
  const { open, setOpen, close, rect, anchorRef, cardRef } = usePopover();
  const today = new Date();
  const [focus, setFocus] = useState<Date>(() => parse(value) ?? today);
  const gridRef = useRef<HTMLDivElement>(null);

  // Keep keyboard focus on the focused day as it moves.
  useEffect(() => {
    if (!open) return;
    gridRef.current?.querySelector<HTMLButtonElement>(`[data-day="${iso(focus)}"]`)?.focus({ preventScroll: true });
  }, [focus, open, rect]);

  const toggle = () => {
    // Each time it opens, start on the chosen day (or today).
    if (!open) setFocus(parse(value) ?? new Date());
    setOpen(!open);
  };

  const pick = (d: Date) => {
    onChange(iso(d));
    close();
  };

  // Six weeks from the Monday on or before the 1st.
  const first = new Date(focus.getFullYear(), focus.getMonth(), 1);
  const start = addDays(first, -((first.getDay() + 6) % 7));
  const days = Array.from({ length: 42 }, (_, i) => addDays(start, i));

  const onGridKey = (e: ReactKeyboardEvent) => {
    const moves: Record<string, () => Date> = {
      ArrowLeft: () => addDays(focus, -1),
      ArrowRight: () => addDays(focus, 1),
      ArrowUp: () => addDays(focus, -7),
      ArrowDown: () => addDays(focus, 7),
      PageUp: () => addMonths(focus, e.shiftKey ? -12 : -1),
      PageDown: () => addMonths(focus, e.shiftKey ? 12 : 1),
      Home: () => addDays(focus, -((focus.getDay() + 6) % 7)),
      End: () => addDays(focus, 6 - ((focus.getDay() + 6) % 7)),
    };
    const move = moves[e.key];
    if (!move) return;
    e.preventDefault();
    setFocus(move());
  };

  const navButton = `inline-flex size-8 cursor-pointer items-center justify-center rounded-lg text-ink/50 hover:bg-bone/60 hover:text-ink ${press}`;

  return (
    <div className={`relative ${className}`}>
      <button
        ref={anchorRef}
        type="button"
        disabled={disabled}
        onClick={toggle}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={boxClass}
      >
        <span className={`truncate ${value ? "" : "text-ink/35"}`}>{value ? showDate(value) : placeholder}</span>
        <CalendarDays className="size-4 shrink-0 text-ink/40 transition-colors group-hover:text-ink" />
      </button>
      <RequiredShadow value={value} required={required} />
      {open && rect && (
        <Card cardRef={cardRef} style={placeCard(rect, 352, 288)} label="Choose a day">
          <div className="mb-2 flex items-center justify-between">
            <button type="button" className={navButton} onClick={() => setFocus(addMonths(focus, -1))} aria-label="Previous month">
              <ChevronLeft className="size-4" />
            </button>
            <span className="font-publish text-lg text-ink" aria-live="polite">
              {monthTitle(focus)}
            </span>
            <button type="button" className={navButton} onClick={() => setFocus(addMonths(focus, 1))} aria-label="Next month">
              <ChevronRight className="size-4" />
            </button>
          </div>
          <div className="grid grid-cols-7 text-center text-[11px] font-medium tracking-wide text-ink/40 uppercase">
            {WEEKDAYS.map((d) => (
              <span key={d} className="py-1">
                {d}
              </span>
            ))}
          </div>
          <div ref={gridRef} role="grid" onKeyDown={onGridKey} className="grid grid-cols-7 gap-0.5">
            {days.map((d) => {
              const key = iso(d);
              const isSelected = key === value;
              const isToday = key === iso(today);
              const inMonth = d.getMonth() === focus.getMonth();
              return (
                <button
                  key={key}
                  type="button"
                  data-day={key}
                  tabIndex={key === iso(focus) ? 0 : -1}
                  aria-pressed={isSelected}
                  aria-label={d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                  onClick={() => pick(d)}
                  className={`relative flex h-9 cursor-pointer items-center justify-center rounded-lg text-sm tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30 ${press} ${
                    isSelected
                      ? "bg-ink font-medium text-lemon"
                      : `${inMonth ? "text-ink" : "text-ink/25"} hover:bg-bone/60`
                  }`}
                >
                  {d.getDate()}
                  {isToday && !isSelected && <span className="absolute bottom-1 size-1 rounded-full bg-brick" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-ink/10 pt-2">
            <button type="button" onClick={() => pick(today)} className={`rounded-lg px-2 py-1.5 text-sm font-medium text-ink/70 hover:bg-bone/60 hover:text-ink ${press}`}>
              Today
            </button>
            {clearable && value && (
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  close();
                }}
                className={`rounded-lg px-2 py-1.5 text-sm text-ink/50 hover:bg-bone/60 hover:text-ink ${press}`}
              >
                Clear
              </button>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

export function TimePicker({
  value,
  onChange,
  required = false,
  disabled = false,
  step = 15,
  placeholder = "Pick a time",
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  /** Minutes between the times offered. */
  step?: number;
  placeholder?: string;
  className?: string;
}) {
  const { open, setOpen, close, rect, anchorRef, cardRef } = usePopover();
  const listRef = useRef<HTMLDivElement>(null);

  // Every `step` minutes through the day, plus the current value if it's off the grid.
  const times = Array.from({ length: (24 * 60) / step }, (_, i) => `${pad(Math.floor((i * step) / 60))}:${pad((i * step) % 60)}`);
  const current = value.slice(0, 5);
  if (current && !times.includes(current)) {
    times.push(current);
    times.sort();
  }

  // Open on the chosen time, or 09:00.
  useEffect(() => {
    if (!open) return;
    const list = listRef.current;
    const target = list?.querySelector<HTMLButtonElement>(`[data-time="${current || "09:00"}"]`);
    if (list && target) {
      list.scrollTop = target.offsetTop - list.clientHeight / 2 + target.clientHeight / 2;
      target.focus({ preventScroll: true });
    }
  }, [open, rect, current]);

  const onListKey = (e: ReactKeyboardEvent) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const el = document.activeElement as HTMLElement | null;
    const next = (e.key === "ArrowDown" ? el?.nextElementSibling : el?.previousElementSibling) as HTMLElement | null;
    next?.focus();
    next?.scrollIntoView({ block: "nearest" });
  };

  return (
    <div className={`relative ${className}`}>
      <button
        ref={anchorRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={boxClass}
      >
        <span className={`tabular-nums ${current ? "" : "text-ink/35"}`}>{current || placeholder}</span>
        <Clock className="size-4 shrink-0 text-ink/40 transition-colors group-hover:text-ink" />
      </button>
      <RequiredShadow value={current} required={required} />
      {open && rect && (
        <Card cardRef={cardRef} style={{ ...placeCard(rect, 264, 128), padding: 4 }} label="Choose a time">
          <div ref={listRef} role="listbox" onKeyDown={onListKey} className="max-h-64 overflow-y-auto overscroll-contain">
            {times.map((t) => (
              <button
                key={t}
                type="button"
                role="option"
                data-time={t}
                aria-selected={t === current}
                onClick={() => {
                  if (t !== current) onChange(t);
                  close();
                }}
                className={`flex h-9 w-full cursor-pointer items-center justify-between rounded-lg px-3 text-left text-sm tabular-nums transition-colors focus-visible:bg-bone/60 focus-visible:outline-none ${
                  t === current ? "font-medium text-ink" : "text-ink/70 hover:bg-bone/50 hover:text-ink"
                }`}
              >
                {t}
                {t === current && <Check className="size-3.5 text-ink" />}
              </button>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

/* A day and a time side by side, for one "YYYY-MM-DDTHH:MM" value. Picking
   a day first fills the time with 09:00 so the value is whole; clearing the
   day clears both. */
export function DateTimePicker({
  value,
  onChange,
  required = false,
  disabled = false,
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const [date = "", time = ""] = value.split("T");
  return (
    <div className={`grid grid-cols-[1fr_7.5rem] gap-2 ${className}`}>
      <DatePicker
        value={date}
        required={required}
        disabled={disabled}
        onChange={(d) => onChange(d ? `${d}T${time.slice(0, 5) || "09:00"}` : "")}
      />
      <TimePicker
        value={time}
        required={required}
        disabled={disabled}
        placeholder="Time"
        onChange={(t) => onChange(`${date || iso(new Date())}T${t}`)}
      />
    </div>
  );
}
