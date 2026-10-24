import type { ReactNode } from "react";
import { Check, Loader2, Save, Search } from "lucide-react";

/* The admin's building blocks, built like the Bow + Arc CMS's so the two
   admins work the same way: underline inputs under small uppercase labels,
   white section cards with their save button in the header, square-ish
   buttons. Coloured in the website's palette (ink, bone, lemon, brick). */

export const inputClass =
  "w-full rounded-none border-b border-ink/25 bg-transparent py-2 text-sm text-ink outline-none transition-colors placeholder:text-ink/35 hover:border-ink/50 focus:border-ink disabled:opacity-50";

// Long text gets a box, not an underline, as in the Bow + Arc CMS.
export const textareaClass =
  "mt-1 w-full rounded-sm border border-ink/25 bg-transparent p-3 text-sm leading-relaxed text-ink outline-none transition-colors placeholder:text-ink/35 hover:border-ink/50 focus:border-ink";

export const labelClass =
  "block text-xs font-medium tracking-wider text-ink/60 uppercase";

const buttonBase =
  "inline-flex cursor-pointer items-center justify-center gap-2 rounded-sm text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60";
export const button = {
  primary: `${buttonBase} bg-black px-6 py-3 text-bone hover:bg-ink`,
  secondary: `${buttonBase} border border-ink/20 bg-white px-5 py-3 text-ink hover:border-ink`,
  danger: `${buttonBase} bg-brick px-5 py-3 text-white hover:bg-red`,
  // A plain text button: Cancel, "Add a paragraph".
  ghost: `${buttonBase} px-1 py-2 text-ink/60 hover:text-ink`,
};

// The small square icon buttons in table rows: edit, delete, reorder.
export const iconButton =
  "inline-flex cursor-pointer items-center justify-center rounded-md p-2 text-ink/40 transition-colors hover:bg-ink/5 hover:text-ink disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent";
export const iconButtonDanger = `${iconButton} hover:bg-pink/25! hover:text-brick!`;

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end md:mb-10">
      <div>
        <h1 className="text-2xl font-normal tracking-tight text-ink md:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-2xl text-sm text-ink/60">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

/* A white section card. With a title, the title sits over a hairline with
   the section's actions (usually its SaveButton) on the right. */
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
    <section className={`border border-ink/10 bg-white p-5 shadow-sm md:p-8 ${className}`}>
      {(title || actions) && (
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-ink/10 pb-4">
          <div>
            {title && <h2 className="text-lg font-medium text-ink">{title}</h2>}
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
    <label className={`block space-y-1 ${className}`}>
      <span className={labelClass}>{label}</span>
      {children}
      {hint && <span className="block pt-1 text-xs text-ink/50">{hint}</span>}
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
  return (
    <button
      type={onClick ? "button" : "submit"}
      onClick={onClick}
      disabled={!dirty || pending}
      className={`inline-flex items-center gap-2 text-sm font-medium transition-colors ${
        !dirty && !pending
          ? "cursor-default text-lightGreen"
          : "cursor-pointer text-ink/60 hover:text-ink disabled:cursor-wait"
      }`}
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : dirty ? (
        <Save className="size-4" />
      ) : (
        <Check className="size-4" />
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
        <span className="h-6 w-11 rounded-full bg-ink/15 transition-colors peer-checked:bg-ink peer-focus-visible:ring-2 peer-focus-visible:ring-ink/30 after:absolute after:top-0.5 after:left-0.5 after:size-5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform after:content-[''] peer-checked:after:translate-x-5" />
      </span>
    </label>
  );
}

const TAG: Record<string, string> = {
  lemon: "border-lightGreen/30 bg-lemon/60 text-green",
  pink: "border-brick/25 bg-pink/30 text-brick",
  yellow: "border-ink/15 bg-yellow/50 text-ink",
  stone: "border-ink/15 bg-stone/20 text-ink/70",
  ink: "border-ink bg-ink text-bone",
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
      className={`inline-flex items-center rounded-sm border px-2 py-1 text-[10px] leading-none font-medium tracking-wider uppercase ${TAG[tone]}`}
    >
      {children}
    </span>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="border border-dashed border-ink/20 bg-white/50 px-6 py-12 text-center text-sm text-ink/50">
      {children}
    </div>
  );
}

/* List pages: a white toolbar (filters, search, a count) sitting on top of
   the table, the two reading as one block. */
export function Toolbar({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col items-start justify-between gap-4 border border-b-0 border-ink/10 bg-white p-4 sm:flex-row sm:items-center">
      {children}
    </div>
  );
}

export function CountPill({ children }: { children: ReactNode }) {
  return (
    <span className="shrink-0 self-end rounded-full border border-ink/10 bg-bone/60 px-3 py-1.5 text-[11px] font-medium tracking-wider text-ink/50 uppercase sm:self-auto">
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
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-ink/15 py-2 pr-4 pl-9 text-sm text-ink outline-none transition-colors placeholder:text-ink/40 focus:border-ink/60"
      />
    </div>
  );
}

// Filter tabs: small bold uppercase labels on a bone track.
export const tabs = "flex w-full gap-1 overflow-x-auto rounded-sm bg-bone/70 p-1 sm:w-fit";
export const tab = (active: boolean) =>
  `shrink-0 cursor-pointer rounded-sm px-3 py-1.5 text-[10px] font-bold tracking-widest uppercase transition-all ${
    active ? "bg-white text-ink shadow-sm" : "text-ink/50 hover:text-ink"
  }`;

export const tableWrap =
  "overflow-x-auto rounded-b-md border border-ink/10 bg-white shadow-sm";
export const tableHead =
  "border-b border-ink/10 bg-bone/50 text-[10px] font-medium tracking-wider text-ink/50 uppercase";
export const th = "px-6 py-4 font-medium";
export const td = "px-6 py-4 align-top";
export const tbody = "divide-y divide-ink/5";
export const row = "transition-colors hover:bg-bone/30";
