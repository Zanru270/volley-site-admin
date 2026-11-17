"use client";

import { Card, Field, inputClass, labelClass, textareaClass } from "@/components/ui";
import { StringList } from "@/components/forms";
import type { CareersPage } from "@/lib/careers";

type SetPage = (update: (old: CareersPage) => CareersPage) => void;

// Each list on the page: where it sits, and what its items are called.
export const CAREERS_LISTS = {
  hero: { key: "lines", label: "Lines", add: "Add a line", hint: "The big lines under the title." },
  manifesto: { key: "points", label: "Points", add: "Add a point", hint: "Numbered in this order." },
  signingUp: { key: "points", label: "Points", add: "Add a point", hint: "Numbered in this order." },
  upside: { key: "points", label: "Points", add: "Add a point", hint: "Numbered in this order." },
  bottomLine: { key: "lines", label: "Lines", add: "Add a line", hint: "Above the script line." },
} as const;
export type CareersList = keyof typeof CAREERS_LISTS;

/* One list of the page, the card a click on it opens: its points, to add
   to, remove and reorder. Their wording can be typed on the page too. */
export function CareersListEditor({ page, list, setValue }: { page: CareersPage; list: CareersList; setValue: SetPage }) {
  const { key, add, hint } = CAREERS_LISTS[list];
  const section = page[list] as Record<string, unknown>;
  return (
    <div className="space-y-3">
      <p className="text-xs text-ink/50">{hint}</p>
      <StringList
        multiline
        values={section[key] as string[]}
        onChange={(values) => setValue((old) => ({ ...old, [list]: { ...old[list], [key]: values } }))}
        addLabel={add}
      />
    </div>
  );
}

/* The careers page's wording, section by section: the live editor's form
   view (CareersLiveEditor), over the same draft as the page beside it.
   The thank-you after applying is only here: the page shows it after
   someone sends the form. */
export default function CareersFields({ page: p, setValue }: { page: CareersPage; setValue: SetPage }) {
  const set = <S extends keyof CareersPage>(section: S, patch: Partial<CareersPage[S]>) =>
    setValue((old) => ({ ...old, [section]: { ...old[section], ...patch } }));
  const text = <S extends keyof CareersPage>(section: S, key: keyof CareersPage[S] & string, label: string, long = false) => (
    <Field label={label}>
      {long ? (
        <textarea
          rows={3}
          value={p[section][key] as string}
          onChange={(e) => set(section, { [key]: e.target.value } as Partial<CareersPage[S]>)}
          className={textareaClass}
        />
      ) : (
        <input
          value={p[section][key] as string}
          onChange={(e) => set(section, { [key]: e.target.value } as Partial<CareersPage[S]>)}
          className={inputClass}
        />
      )}
    </Field>
  );
  const list = (name: CareersList) => (
    <div className="space-y-2">
      <span className={labelClass}>{CAREERS_LISTS[name].label}</span>
      <CareersListEditor page={p} list={name} setValue={setValue} />
    </div>
  );

  return (
    <div className="space-y-6">
      <Card title="Top of the page">
        <div className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            {text("hero", "eyebrow", "Small line")}
            {text("hero", "title", "Title")}
          </div>
          {list("hero")}
          {text("hero", "intro", "Intro", true)}
        </div>
      </Card>

      <Card title="The story" description="The lists between the top of the page and the jobs.">
        <div className="space-y-8">
          <div className="space-y-6">
            {text("manifesto", "title", "Manifesto heading")}
            {list("manifesto")}
          </div>
          <div className="space-y-6 border-t border-ink/10 pt-8">
            {text("signingUp", "title", "Left heading")}
            {list("signingUp")}
            {text("signingUp", "after", "Line after it", true)}
          </div>
          <div className="space-y-6 border-t border-ink/10 pt-8">
            {text("upside", "title", "Right heading")}
            {list("upside")}
            {text("upside", "after", "Line after it", true)}
          </div>
          <div className="space-y-6 border-t border-ink/10 pt-8">
            {text("bottomLine", "title", "Closing heading")}
            {list("bottomLine")}
            {text("bottomLine", "script", "Script line")}
          </div>
        </div>
      </Card>

      <Card title="Applying" description="The jobs themselves are edited on the Jobs page.">
        <div className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            {text("form", "eyebrow", "Small line")}
            {text("jobs", "title", "Heading")}
          </div>
          {text("jobs", "eyebrow", "Step 1 heading")}
          {text("jobs", "empty", "With no jobs open", true)}
          <div className="grid gap-6 sm:grid-cols-2">
            {text("form", "privacy", "Line above the button")}
            {text("form", "button", "Button")}
          </div>
        </div>
      </Card>

      <Card title="Thank-you" description='After someone applies. It starts with "Thanks, {their name}. Your application for {the job} is in."'>
        <div className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <Field label="Small line">
              <input
                value={p.form.thanks.eyebrow}
                onChange={(e) => set("form", { thanks: { ...p.form.thanks, eyebrow: e.target.value } })}
                className={inputClass}
              />
            </Field>
            <Field label="Headline">
              <input
                value={p.form.thanks.headline}
                onChange={(e) => set("form", { thanks: { ...p.form.thanks, headline: e.target.value } })}
                className={inputClass}
              />
            </Field>
          </div>
          <Field label="Message">
            <textarea
              rows={3}
              value={p.form.thanks.message}
              onChange={(e) => set("form", { thanks: { ...p.form.thanks, message: e.target.value } })}
              className={textareaClass}
            />
          </Field>
        </div>
      </Card>
    </div>
  );
}
