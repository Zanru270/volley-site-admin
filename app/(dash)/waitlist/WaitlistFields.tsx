"use client";

import { Card, Field, inputClass, labelClass, textareaClass } from "@/components/ui";
import { StringList } from "@/components/forms";
import type { WaitlistForm } from "@/lib/types";

/* The waitlist form's wording in three cards (the top, the form, the
   thank-you screen): the live editor's form view (WaitlistLiveEditor),
   over the same draft as the page beside it. `UnitTypes` is the list of
   unit types on its own, the card a click on that choice opens. */
export default function WaitlistFields({
  form: f,
  setValue,
}: {
  form: WaitlistForm;
  setValue: (update: (old: WaitlistForm) => WaitlistForm) => void;
}) {
  const set = <K extends keyof WaitlistForm>(key: K, value: WaitlistForm[K]) =>
    setValue((old) => ({ ...old, [key]: value }));
  const setSection = (key: keyof WaitlistForm["sections"], value: string) =>
    setValue((old) => ({ ...old, sections: { ...old.sections, [key]: value } }));
  const setThanks = (key: keyof WaitlistForm["thanks"], value: string) =>
    setValue((old) => ({ ...old, thanks: { ...old.thanks, [key]: value } }));

  return (
    <div className="space-y-6">
      <Card title="Top of the form" description="What people see first when they open Apply now.">
        <div className="space-y-6">
          <Field label="Tag" hint='The small pink tag beside the logo, e.g. "Waitlist open". Empty hides it.'>
            <input value={f.sticker} onChange={(e) => set("sticker", e.target.value)} className={inputClass} />
          </Field>
          <div className="grid gap-6 sm:grid-cols-2">
            <Field label="Small line" hint="Uppercase, above the headline.">
              <input value={f.eyebrow} onChange={(e) => set("eyebrow", e.target.value)} className={inputClass} />
            </Field>
            <Field label="Headline">
              <input required value={f.headline} onChange={(e) => set("headline", e.target.value)} className={inputClass} />
            </Field>
          </div>
          <Field label="Intro">
            <textarea rows={3} value={f.intro} onChange={(e) => set("intro", e.target.value)} className={textareaClass} />
          </Field>
        </div>
      </Card>

      <Card title="The form" description="Section titles, the note, and the choices.">
        <div className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-3">
            <Field label="Section 1">
              <input value={f.sections.details} onChange={(e) => setSection("details", e.target.value)} className={inputClass} />
            </Field>
            <Field label="Section 2">
              <input value={f.sections.preferences} onChange={(e) => setSection("preferences", e.target.value)} className={inputClass} />
            </Field>
            <Field label="Section 3">
              <input value={f.sections.parent} onChange={(e) => setSection("parent", e.target.value)} className={inputClass} />
            </Field>
          </div>
          <Field label="Note in section 2" hint="The pink box above the building and unit choices. Empty hides it.">
            <textarea rows={2} value={f.note} onChange={(e) => set("note", e.target.value)} className={textareaClass} />
          </Field>
          <div className="space-y-2 border-t border-ink/10 pt-6">
            <span className={labelClass}>Unit types to choose from</span>
            <p className="text-xs text-ink/50">
              The buildings come from Buildings. Keep these names as they are (&quot;2 Bedroom&quot;) unless the
              Volley app&apos;s admin is told: it reads them to place people.
            </p>
            <div className="max-w-sm">
              <StringList values={f.unitTypes} onChange={(v) => set("unitTypes", v)} addLabel="Add a unit type" />
            </div>
          </div>
          <div className="grid gap-6 border-t border-ink/10 pt-6 sm:grid-cols-2">
            <Field label="Line above the button">
              <input value={f.privacy} onChange={(e) => set("privacy", e.target.value)} className={inputClass} />
            </Field>
            <Field label="Button">
              <input required value={f.button} onChange={(e) => set("button", e.target.value)} className={inputClass} />
            </Field>
          </div>
        </div>
      </Card>

      <Card title="Thank-you screen" description='After someone joins. It starts with "Thanks, {their name}."'>
        <div className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <Field label="Small line">
              <input value={f.thanks.eyebrow} onChange={(e) => setThanks("eyebrow", e.target.value)} className={inputClass} />
            </Field>
            <Field label="Headline">
              <input required value={f.thanks.headline} onChange={(e) => setThanks("headline", e.target.value)} className={inputClass} />
            </Field>
          </div>
          <Field label="Message">
            <textarea rows={3} value={f.thanks.message} onChange={(e) => setThanks("message", e.target.value)} className={textareaClass} />
          </Field>
        </div>
      </Card>
    </div>
  );
}

// The unit types to choose from, as a list.
export function UnitTypes({ values, onChange }: { values: string[]; onChange: (values: string[]) => void }) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-ink/50">
        The buildings come from Buildings. Keep these names as they are (&quot;2 Bedroom&quot;) unless the Volley
        app&apos;s admin is told: it reads them to place people.
      </p>
      <StringList values={values} onChange={onChange} addLabel="Add a unit type" />
    </div>
  );
}
