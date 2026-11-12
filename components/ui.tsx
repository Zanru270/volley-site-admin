import type { ReactNode } from "react";
import { Check, Loader2, Save, Search } from "lucide-react";

/* The admin's building blocks: hairline white cards with soft corners,
   boxed inputs under small sentence-case labels, rounded buttons, pill
   badges. Coloured in the website's palette (ink, bone, lemon, brick). */

export const inputClass =
  "w-full rounded-lg border border-ink/15 bg-white px-3 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-ink/35 hover:border-ink/30 focus:border-ink/60 focus:ring-3 focus:ring-ink/5 disabled:opacity-50";

export const textareaClass = `${inputClass} mt-1 p-3 leading-relaxed`;

export const labelClass = "block text-[13px] font-medium text-ink/70";

const buttonBase =
  "inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ink/20 disabled:cursor-not-allowed disabled:opacity-60";
export const button = {
  primary: `${buttonBase} bg-black px-4 py-2.5 text-bone hover:bg-ink`,
  secondary: `${buttonBase} border border-ink/15 bg-white px-4 py-2.5 text-ink hover:border-ink/40`,
  danger: `${buttonBase} bg-brick px-4 py-2.5 text-white hover:bg-red`,
  // A plain text button: Cancel, "Add a paragraph".
  ghost: `${buttonBase} px-1 py-2 text-ink/60 hover:text-ink`,
};

// The small icon buttons in table rows: edit, delete, reorder.
export const iconButton =
  "inline-flex cursor-pointer items-center justify-center rounded-lg p-2 text-ink/40 transition-colors hover:bg-bone/60 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent";
export const iconButtonDanger = `${iconButton} hover:bg-pink/30! hover:text-brick!`;

/* A page's heading: its title, optionally beside its icon on an ink tile
   (as the Bow + Arc CMS's pages have it), a line under it, and its main
   actions on the right. */
export function PageHeader({
  title,
  description,
  actions,
  icon: Icon,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  icon?: React.ElementType;
}) {
  return (
    <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <div className="flex items-center gap-3">
          {Icon && (
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-ink text-lemon">
              <Icon className="size-5" strokeWidth={1.75} aria-hidden="true" />
            </span>
          )}
          <h1 className="font-publish text-3xl leading-tight text-ink md:text-[2.5rem]">
            {title}
          </h1>
        </div>
        {description && (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink/55">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

/* A section heading outside a card, with an optional count chip: the
   "Volley Reader 6" over the dashboard's article strip. */
export function SectionTitle({
  children,
  count,
  actions,
}: {
  children: ReactNode;
  count?: number;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-4">
      <h2 className="flex items-center gap-2 text-[15px] font-medium text-ink">
        {children}
        {count !== undefined && <CountChip>{count}</CountChip>}
      </h2>
      {actions}
    </div>
  );
}

// A small black square with a number: how many are in a section.
export function CountChip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-md bg-ink px-1.5 text-[11px] font-medium text-bone tabular-nums">
      {children}
    </span>
  );
}

/* A white section card. With a title, the title sits on top with the
   section's actions (usually its SaveButton) on the right. */
export function Card({
  title,
  description,
  actions,
  children,
  className = "",
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-ink/10 bg-white p-5 md:p-7 ${className}`}>
      {(title || actions) && (
        <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            {title && <h2 className="text-[15px] font-medium text-ink">{title}</h2>}
            {description && (
              <p className="mt-1 text-sm text-ink/50">{description}</p>
            )}
          </div>
          {actions}
        </header>
      )}
      {children}
    </section>
  );
}

// A tinted box inside a card or drawer: one schedule group, one room type.
export const subPanel = "rounded-xl border border-ink/8 bg-bone/30 p-4 md:p-5";

export function Field({
  label,
  hint,
  children,
  className = "",
}: {
  label: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block space-y-1.5 ${className}`}>
      <span className={labelClass}>{label}</span>
      {children}
      {hint && <span className="block text-xs text-ink/50">{hint}</span>}
    </label>
  );
}

/* The section header's save button. It reads "Saved" (with a tick, and
   does nothing) until something changes, then becomes the save action. */
export function SaveButton({
  dirty,
  pending,
  label = "Save",
  onClick,
}: {
  dirty: boolean;
  pending: boolean;
  label?: string;
  onClick?: () => void;
}) {
  const idle = !dirty && !pending;
  return (
    <button
      type={onClick ? "button" : "submit"}
      onClick={onClick}
      disabled={!dirty || pending}
      className={
        idle
          ? "inline-flex cursor-default items-center gap-1.5 rounded-full bg-lemon/50 px-3 py-1.5 text-xs font-medium text-green"
          : `${button.primary} py-2! disabled:cursor-wait`
      }
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : dirty ? (
        <Save className="size-4" />
      ) : (
        <Check className="size-3.5" />
      )}
      {pending ? "Saving…" : dirty ? label : "Saved"}
    </button>
  );
}

// An on/off switch, for "published", "show the banner" and the like.
export function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-6">
      <span>
        <span className="block text-sm font-medium text-ink">{label}</span>
        {description && (
          <span className="mt-1 block text-xs text-ink/50">{description}</span>
        )}
      </span>
      <span className="relative inline-flex shrink-0 items-center">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <span className="h-6 w-11 rounded-full bg-ink/15 transition-colors peer-checked:bg-ink peer-focus-visible:ring-3 peer-focus-visible:ring-ink/20 after:absolute after:top-0.5 after:left-0.5 after:size-5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform after:content-[''] peer-checked:after:translate-x-5 peer-checked:after:bg-lemon" />
      </span>
    </label>
  );
}

const TAG: Record<string, string> = {
  lemon: "bg-lemon/55 text-green",
  pink: "bg-pink/35 text-brick",
  yellow: "bg-yellow/55 text-ink/80",
  stone: "bg-bone/80 text-ink/60",
  ink: "bg-ink text-bone",
};
export function Badge({
  tone = "stone",
  children,
}: {
  tone?: keyof typeof TAG;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] leading-4 font-medium whitespace-nowrap ${TAG[tone]}`}
    >
      {children}
    </span>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-ink/20 bg-bone/20 px-6 py-12 text-center text-sm leading-relaxed text-ink/55">
      {children}
    </div>
  );
}

/* List pages: the toolbar (filters, search, a count) is the top of the
   table's card, the two reading as one block. */
export function Toolbar({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col items-start justify-between gap-4 rounded-t-2xl border border-b-0 border-ink/10 bg-white p-4 sm:flex-row sm:items-center md:px-5">
      {children}
    </div>
  );
}

export function CountPill({ children }: { children: ReactNode }) {
  return (
    <span className="shrink-0 self-end rounded-full bg-bone/60 px-3 py-1 text-xs font-medium text-ink/55 sm:self-auto">
      {children}
    </span>
  );
}

export function SearchBox({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative w-full min-w-0 sm:w-1/2 md:w-1/3">
      <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink/40" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className={`${inputClass} py-2! pl-9!`}
      />
    </div>
  );
}

// Filter tabs: a segmented control on a bone track.
export const tabs = "flex w-full gap-1 overflow-x-auto rounded-xl bg-bone/60 p-1 sm:w-fit";
export const tab = (active: boolean) =>
  `shrink-0 cursor-pointer rounded-lg px-4 py-1.5 text-[13px] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20 ${
    active ? "bg-white font-medium text-ink shadow-soft" : "text-ink/55 hover:text-ink"
  }`;

/* Tables sit in a white card; the header is a tinted rounded strip and the
   rows run without rules, as in a ledger. */
export const tableWrap =
  "overflow-x-auto rounded-b-2xl border border-t-0 border-ink/10 bg-white px-2 pb-2 md:px-3 md:pb-3";
export const tableHead =
  "text-xs text-ink/50 [&_th]:bg-bone/45 [&_th:first-child]:rounded-l-lg [&_th:last-child]:rounded-r-lg";
export const th = "px-4 py-3 font-normal";
export const td = "px-4 py-3.5 align-middle";
export const tbody = "divide-y divide-ink/5";
export const row = "transition-colors hover:bg-bone/25";
