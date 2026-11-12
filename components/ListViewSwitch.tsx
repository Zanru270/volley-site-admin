"use client";

import { LayoutGrid, List } from "lucide-react";
import { tabs } from "@/components/ui";
import type { ListView } from "@/hooks/useListView";

const VIEWS = [
  { value: "grid", label: "Grid view", Icon: LayoutGrid },
  { value: "list", label: "List view", Icon: List },
] as const;

// The grid / list switch in a list page's toolbar (hooks/useListView.ts).
export default function ListViewSwitch({
  view,
  onChange,
}: {
  view: ListView;
  onChange: (view: ListView) => void;
}) {
  return (
    <div role="radiogroup" aria-label="Layout" className={`${tabs} w-fit!`}>
      {VIEWS.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={view === value}
          aria-label={label}
          title={label}
          onClick={() => onChange(value)}
          className={`cursor-pointer rounded-lg p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20 ${
            view === value ? "bg-white text-ink shadow-soft" : "text-ink/50 hover:text-ink"
          }`}
        >
          <Icon className="size-4" aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}
