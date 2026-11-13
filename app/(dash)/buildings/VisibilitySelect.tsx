"use client";

import { useEffect, useLayoutEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Eye, EyeOff, IdCard, Loader2, Sparkles } from "lucide-react";
import { button, labelClass } from "@/components/ui";
import { useToast } from "@/components/ToastProvider";
import { effectiveVisibility, VISIBILITIES, type Visibility } from "@/lib/site";
import { saveBuildingVisibility } from "./actions";

const ICONS = { auto: Sparkles, live: Eye, card: IdCard, draft: EyeOff };
/* Each outcome's colour: live green, card only yellow, draft grey, on the
   button (bar, field) and the menu's icons. Live's button stays plain. */
const TONES = {
  live: { bar: "", field: "border-ink/15", dot: "bg-lemon/60" },
  card: { bar: "border-yellow! bg-yellow/30!", field: "border-yellow bg-yellow/15", dot: "bg-yellow/50" },
  draft: { bar: "border-stone! bg-stone/25!", field: "border-stone bg-stone/15", dot: "bg-stone/40" },
};
const labelOf = (value: Visibility) => VISIBILITIES.find((v) => v.value === value)!.label;

/* Whether the building is on the website (VISIBILITIES in lib/site.ts): a
   button showing what it comes to (on Automatic, what the status makes
   it), opening a menu of the choices, each with what it means. Saved the
   moment one's picked, on its own: the rest of the building waits for
   Save as usual. Back to what it was if the save fails.

   Controlled, so every copy of it agrees: `value` in (the choice, "auto"
   for Automatic), `onChange` out the moment it's picked (and again with
   the old choice if the save fails). `status` is the one
   shown beside it, saved or not, for what Automatic comes to. As a "bar"
   button in the editor's top bar, or a "field" under the card's status.

   The menu is drawn as CustomSelect's is: portalled to <body>, fixed under
   the button (lined up with its right edge, as it sits at the right of
   the bar), closed by a click outside or Escape. ↑ ↓ move between the
   choices. */
export default function VisibilitySelect({
  slug,
  value,
  status,
  onChange,
  variant = "bar",
}: {
  slug: string;
  value: Visibility;
  status: string | null;
  onChange: (value: Visibility) => void;
  variant?: "bar" | "field";
}) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const effective = effectiveVisibility(status, value);
  const auto = effectiveVisibility(status, "auto");
  const Icon = ICONS[effective];
  const shown = `${labelOf(effective)}${value === "auto" ? " · automatic" : ""}`;
  const hintOf = (v: (typeof VISIBILITIES)[number]) =>
    v.value === "auto" ? `Follows the status: with "${status ?? "Open"}", that's ${labelOf(auto).toLowerCase()}.` : v.hint;

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

  // Once the menu is drawn, the keyboard starts on the current choice.
  const placed = open && rect !== null;
  useEffect(() => {
    if (open && placed) menuRef.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.focus();
  }, [open, placed]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!buttonRef.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const pick = (next: Visibility) => {
    setOpen(false);
    buttonRef.current?.focus();
    if (next === value) return;
    // Shows at once; goes back if it couldn't be saved.
    const before = value;
    onChange(next);
    start(async () => {
      try {
        const result = await saveBuildingVisibility(slug, next);
        if (!result.ok) onChange(before);
        toast.result(result, `On the website: ${labelOf(effectiveVisibility(status, next))}${next === "auto" ? " (automatic)" : ""}`);
      } catch (err) {
        onChange(before);
        toast.error("Not saved", (err as Error).message);
      }
    });
  };

  // ↑ ↓ between the choices, round and round.
  const step = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const items = [...(menuRef.current?.querySelectorAll<HTMLElement>('[role="option"]') ?? [])];
    const at = items.indexOf(document.activeElement as HTMLElement);
    const next = (at + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
    items[next]?.focus();
  };

  const trigger =
    variant === "bar"
      ? `${button.secondary} group py-2! disabled:cursor-wait ${TONES[effective].bar}`
      : `group flex w-full cursor-pointer items-center gap-2 rounded-lg border bg-white px-3 py-2.5 text-left text-sm text-ink transition-colors hover:border-ink/30 focus-visible:border-ink/60 focus-visible:outline-none disabled:cursor-wait ${TONES[effective].field}`;

  return (
    <>
      {variant === "field" && (
        <span className={`${labelClass} mb-1.5 block`}>On the website</span>
      )}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && !open) {
            e.preventDefault();
            setOpen(true);
          }
        }}
        disabled={pending}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`On the website: ${shown}`}
        title={hintOf(VISIBILITIES.find((v) => v.value === value)!)}
        className={trigger}
      >
        {pending ? <Loader2 className="size-4 shrink-0 animate-spin" /> : <Icon className="size-4 shrink-0" />}
        <span className={variant === "bar" ? "hidden md:inline" : "flex-1 truncate"}>{shown}</span>
        <ChevronDown
          className={`size-3.5 shrink-0 text-ink/40 transition-transform duration-300 group-hover:text-ink ${open ? "rotate-180" : ""}`}
        />
      </button>
      {variant === "field" && (
        <span className="mt-1.5 block text-xs text-ink/50">Saves as soon as it&rsquo;s picked.</span>
      )}
      {open &&
        rect &&
        createPortal(
          <div
            ref={menuRef}
            role="listbox"
            aria-label="Visibility on the website"
            onKeyDown={step}
            style={{
              position: "fixed",
              top: rect.bottom + 6,
              ...(variant === "bar" ? { right: window.innerWidth - rect.right } : { left: rect.left }),
            }}
            className="z-120 w-80 animate-pop-in rounded-xl border border-ink/10 bg-white p-1 shadow-soft"
          >
            <p className="px-3 pt-2 pb-1.5 text-[11px] font-medium tracking-wide text-ink/45 uppercase">On the website</p>
            {VISIBILITIES.map((v) => {
              const OptionIcon = ICONS[v.value];
              const chosen = v.value === value;
              return (
                <button
                  key={v.value}
                  type="button"
                  role="option"
                  aria-selected={chosen}
                  onClick={() => pick(v.value)}
                  className={`flex w-full cursor-pointer items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors outline-none hover:bg-bone/50 focus-visible:bg-bone/70 ${chosen ? "bg-bone/40" : ""}`}
                >
                  <span
                    className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full ${
                      TONES[effectiveVisibility(status, v.value)].dot
                    }`}
                  >
                    <OptionIcon className="size-3.5 text-ink" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-ink">
                      {v.label}
                      {v.value === "auto" && <span className="ml-1.5 text-xs font-normal text-ink/45">Recommended</span>}
                    </span>
                    <span className="mt-0.5 block text-xs leading-snug text-ink/55">{hintOf(v)}</span>
                  </span>
                  {chosen && <Check className="mt-1 size-3.5 shrink-0 text-ink" />}
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </>
  );
}
