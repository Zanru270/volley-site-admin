"use client";

import { useState } from "react";
import { Check, Pipette, RotateCcw } from "lucide-react";
import { inputClass, labelClass } from "@/components/ui";
import { isHexColour, NAME_COLOUR_SWATCHES } from "@/lib/site";

/* A colour, picked the admin's way: the site's palette as round swatches,
   a custom one from the system's colour picker (the pipette), or a hex
   value typed in, with a sample of what it's for drawn in it. `value` ""
   is "the website's own", `fallback`, which Reset goes back to.

   Controlled: `value` in, `onChange` out. A half-typed hex is kept in the
   box and only sent once it's a colour. */
export default function ColourPicker({
  label,
  hint,
  value,
  fallback,
  onChange,
  sample,
}: {
  label: string;
  hint?: string;
  value: string;
  fallback: string;
  onChange: (value: string) => void;
  // Drawn over a dark photo-like block, in the colour.
  sample?: (colour: string) => React.ReactNode;
}) {
  const shown = value || fallback;
  // What's in the hex box while it's being typed.
  const [typed, setTyped] = useState<string | null>(null);
  const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

  const swatch = (colour: string, name: string) => (
    <button
      key={colour}
      type="button"
      onClick={() => {
        setTyped(null);
        onChange(same(colour, fallback) ? "" : colour);
      }}
      aria-label={name}
      aria-pressed={same(colour, shown)}
      title={name}
      style={{ backgroundColor: colour }}
      className={`flex size-8 cursor-pointer items-center justify-center rounded-full border border-ink/15 shadow-sm transition-transform hover:scale-110 ${
        same(colour, shown) ? "ring-2 ring-ink ring-offset-2" : ""
      }`}
    >
      {same(colour, shown) && <Check className="size-3.5 text-ink" strokeWidth={2.5} />}
    </button>
  );

  return (
    <div className="space-y-3">
      <div>
        <span className={labelClass}>{label}</span>
        {hint && <p className="mt-1 text-xs text-ink/50">{hint}</p>}
      </div>

      {sample && (
        <div className="flex h-20 items-end justify-center rounded-xl bg-linear-to-t from-ink via-ink/80 to-stone/60 pb-3 text-center">
          {sample(shown)}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2.5">
        {NAME_COLOUR_SWATCHES.map((s) => swatch(s.value, s.label))}

        {/* Any colour at all: the system's own picker, behind a pipette. */}
        <label
          title="Pick any colour"
          className={`relative flex size-8 cursor-pointer items-center justify-center rounded-full border border-dashed border-ink/30 bg-white text-ink/60 transition-colors hover:border-ink hover:text-ink ${
            NAME_COLOUR_SWATCHES.some((s) => same(s.value, shown)) ? "" : "ring-2 ring-ink ring-offset-2"
          }`}
        >
          <Pipette className="size-3.5" />
          <input
            type="color"
            value={/^#[0-9a-f]{6}$/i.test(shown) ? shown : "#ffffff"}
            onChange={(e) => {
              setTyped(null);
              onChange(e.target.value.toUpperCase());
            }}
            aria-label="Pick any colour"
            className="absolute inset-0 cursor-pointer opacity-0"
          />
        </label>
      </div>

      <div className="flex items-center gap-2">
        <input
          value={typed ?? shown.toUpperCase()}
          onChange={(e) => {
            const next = e.target.value.trim();
            setTyped(next);
            const hex = next.startsWith("#") ? next : `#${next}`;
            if (isHexColour(hex)) onChange(same(hex, fallback) ? "" : hex.toUpperCase());
          }}
          onBlur={() => setTyped(null)}
          maxLength={7}
          spellCheck={false}
          aria-label={`${label}, as a hex colour`}
          className={`${inputClass} max-w-32 font-mono uppercase`}
        />
        {value && (
          <button
            type="button"
            onClick={() => {
              setTyped(null);
              onChange("");
            }}
            className="inline-flex cursor-pointer items-center gap-1.5 px-1 py-2 text-xs text-ink/60 transition-colors hover:text-ink"
          >
            <RotateCcw className="size-3.5" /> Reset to the website&rsquo;s
          </button>
        )}
      </div>
    </div>
  );
}
