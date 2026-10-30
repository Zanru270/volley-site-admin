"use client";

import { Card, Field, inputClass, SaveButton, Toggle } from "@/components/ui";
import { useSettingsForm } from "@/components/forms";
import type { Banner } from "@/lib/types";
import { saveBanner } from "./actions";

export default function BannerEditor({ initial }: { initial: Banner }) {
  const { value: banner, setValue, dirty, pending, save } = useSettingsForm(initial, saveBanner);
  const set = <K extends keyof Banner>(key: K, value: Banner[K]) =>
    setValue((b) => ({ ...b, [key]: value }));

  return (
    <div className="space-y-8">
      <Card title="Preview">
        {banner.enabled ? (
          <div className="rounded-lg bg-lemon px-3 py-3 text-center text-xs font-bold text-ink">
            {banner.text}
            {banner.linkText && <span className="font-light underline">{banner.linkText}</span>}
            <span className="font-light">{banner.after}</span>
          </div>
        ) : (
          <p className="text-sm text-ink/50">The banner is hidden.</p>
        )}
      </Card>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <Card title="Banner" actions={<SaveButton dirty={dirty} pending={pending} label="Save banner" />}>
          <div className="space-y-6">
            <Toggle
              checked={banner.enabled}
              onChange={(v) => set("enabled", v)}
              label="Show the banner"
              description="The strip along the top of every page."
            />
            <div className="space-y-6 border-t border-ink/10 pt-6">
              <Field label="Bold text" hint="Shown first. End it with a space if the link follows.">
                <input value={banner.text} onChange={(e) => set("text", e.target.value)} className={inputClass} />
              </Field>
              <div className="grid gap-6 sm:grid-cols-2">
                <Field label="Link text" hint="Underlined. Leave empty for no link.">
                  <input value={banner.linkText} onChange={(e) => set("linkText", e.target.value)} className={inputClass} />
                </Field>
                <Field label="Link goes to" hint="/apply opens the waitlist, /book-a-tour the tour booking.">
                  <input
                    value={banner.linkHref}
                    onChange={(e) => set("linkHref", e.target.value)}
                    placeholder="/apply"
                    className={inputClass}
                  />
                </Field>
              </div>
              <Field label="Text after the link">
                <input value={banner.after} onChange={(e) => set("after", e.target.value)} className={inputClass} />
              </Field>
            </div>
          </div>
        </Card>
      </form>
    </div>
  );
}
