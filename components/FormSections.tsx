"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

/* The live editors' form view: every part of the page in one panel, as a
   column of sections that fold open one at a time (so a long page stays
   scannable), in the order the page shows them. It edits the same draft as
   the page beside it, so the editor's one Save saves both.

   A section with a `toggle` has an on/off switch in its header, beside
   (not inside) the button that opens it: off hides that part of the page,
   and its title dims with "Hidden" under it. */

export type FormSection = {
  id: string;
  title: string;
  description?: ReactNode;
  content: ReactNode;
  toggle?: { on: boolean; onChange: (on: boolean) => void };
};

export default function FormSections({
  sections,
  initialOpen,
}: {
  sections: FormSection[];
  // Open to start with; the first if not given.
  initialOpen?: string;
}) {
  const [open, setOpen] = useState<string | null>(initialOpen ?? sections[0]?.id ?? null);

  return (
    <div className="space-y-2">
      {sections.map((s, i) => {
        const isOpen = open === s.id;
        const hidden = s.toggle && !s.toggle.on;
        return (
          <section key={s.id} className="rounded-xl border border-ink/10 bg-white">
            <div className="flex items-center gap-2 pr-3">
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : s.id)}
                aria-expanded={isOpen}
                className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 py-3 pl-4 text-left"
              >
                <span className="w-5 shrink-0 text-right text-[11px] text-ink/35 tabular-nums">{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className={`block text-sm font-medium ${hidden ? "text-ink/40" : "text-ink"}`}>{s.title}</span>
                  {hidden ? (
                    <span className="mt-0.5 block text-xs text-ink/50">Hidden on the website</span>
                  ) : (
                    s.description &&
                    !isOpen && <span className="mt-0.5 block truncate text-xs text-ink/50">{s.description}</span>
                  )}
                </span>
                <ChevronDown
                  className={`size-4 shrink-0 text-ink/40 transition-transform ${isOpen ? "rotate-180" : ""}`}
                />
              </button>
              {s.toggle && (
                <Switch on={s.toggle.on} onChange={s.toggle.onChange} label={`Show ${s.title} on the page`} />
              )}
            </div>
            {isOpen && (
              <div className="space-y-6 border-t border-ink/8 px-4 py-5">
                {s.description && <p className="-mt-1 text-xs leading-relaxed text-ink/50">{s.description}</p>}
                {s.content}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

// A section's on/off switch: the same look as Toggle in components/ui.tsx, without its label.
function Switch({ on, onChange, label }: { on: boolean; onChange: (on: boolean) => void; label: string }) {
  return (
    <label className="relative inline-flex shrink-0 cursor-pointer items-center" title={on ? "Shown: click to hide" : "Hidden: click to show"}>
      <input
        type="checkbox"
        checked={on}
        onChange={(e) => onChange(e.target.checked)}
        aria-label={label}
        className="peer sr-only"
      />
      <span className="h-6 w-11 rounded-full bg-ink/15 transition-colors peer-checked:bg-ink peer-focus-visible:ring-3 peer-focus-visible:ring-ink/20 after:absolute after:top-0.5 after:left-0.5 after:size-5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform after:content-[''] peer-checked:after:translate-x-5 peer-checked:after:bg-lemon" />
    </label>
  );
}
