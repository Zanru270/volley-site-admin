"use client";

import { useState } from "react";
import { Card, Field, inputClass, labelClass, SaveButton, tab, tabs, textareaClass } from "@/components/ui";
import { StringList, useSettingsForm } from "@/components/forms";
import type { WaitlistForm } from "@/lib/types";
import { saveWaitlistForm } from "./actions";

/* The waitlist form's wording, in three cards (the top, the form, the
   thank-you screen) beside a preview of the form as the website shows it.
   It's one setting, so every card's save button saves all of it. */
export default function WaitlistFormEditor({ initial }: { initial: WaitlistForm }) {
  const { value: f, setValue, dirty, pending, save } = useSettingsForm(initial, saveWaitlistForm);
  const [preview, setPreview] = useState<"form" | "thanks">("form");
  const saveButton = <SaveButton dirty={dirty} pending={pending} label="Save Form" onClick={save} />;

  const set = <K extends keyof WaitlistForm>(key: K, value: WaitlistForm[K]) =>
    setValue((old) => ({ ...old, [key]: value }));
  const setSection = (key: keyof WaitlistForm["sections"], value: string) =>
    setValue((old) => ({ ...old, sections: { ...old.sections, [key]: value } }));
  const setThanks = (key: keyof WaitlistForm["thanks"], value: string) =>
    setValue((old) => ({ ...old, thanks: { ...old.thanks, [key]: value } }));

  return (
    <div className="grid items-start gap-8 xl:grid-cols-[1fr_24rem]">
      <div className="space-y-8">
        <Card title="Top of the Form" description="What people see first when they open Apply now." actions={saveButton}>
          <div className="space-y-6">
            <Field label="Sticker" hint='The tilted tag in the corner, e.g. "Waitlist open".'>
              <input value={f.sticker} onChange={(e) => set("sticker", e.target.value)} className={inputClass} />
            </Field>
            <div className="grid gap-6 sm:grid-cols-2">
              <Field label="Small line" hint="Uppercase, above the headline.">
                <input value={f.eyebrow} onChange={(e) => set("eyebrow", e.target.value)} className={inputClass} />
              </Field>
              <Field label="Headline" hint="The big red script line.">
                <input required value={f.headline} onChange={(e) => set("headline", e.target.value)} className={inputClass} />
              </Field>
            </div>
            <Field label="Intro">
              <textarea rows={3} value={f.intro} onChange={(e) => set("intro", e.target.value)} className={textareaClass} />
            </Field>
          </div>
        </Card>

        <Card title="The Form" description="Section titles, the note, and the choices." actions={saveButton}>
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
            <Field label="Note in section 2" hint="The pink box above the house and unit choices. Leave empty to hide it.">
              <textarea rows={2} value={f.note} onChange={(e) => set("note", e.target.value)} className={textareaClass} />
            </Field>
            <div className="space-y-2 border-t border-ink/10 pt-6">
              <span className={labelClass}>Unit types to choose from</span>
              <p className="text-xs text-ink/50">
                The houses come from Locations. Keep these names as they are (&quot;2 Bedroom&quot;) unless the
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

        <Card title="Thank-You Screen" description='After someone joins. It starts with "Thanks, {their name}."' actions={saveButton}>
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

      <aside className="space-y-3 xl:sticky xl:top-12">
        <div className="flex items-center justify-between">
          <span className={labelClass}>Preview</span>
          <div className={tabs}>
            <button type="button" onClick={() => setPreview("form")} className={tab(preview === "form")}>
              Form
            </button>
            <button type="button" onClick={() => setPreview("thanks")} className={tab(preview === "thanks")}>
              Thank you
            </button>
          </div>
        </div>
        <Preview form={f} screen={preview} />
      </aside>
    </div>
  );
}

/* A small copy of the website's form: bone card, ink lines, pink accents.
   Close enough to judge the wording, not a pixel copy. */
function Preview({ form: f, screen }: { form: WaitlistForm; screen: "form" | "thanks" }) {
  const title = (eyebrow: string, headline: string) => (
    <p className="leading-none">
      <span className="block text-lg uppercase">{eyebrow}</span>
      <span className="mt-1 block font-publish text-3xl text-red italic">{headline}</span>
    </p>
  );

  if (screen === "thanks")
    return (
      <div className="rounded-2xl border border-ink bg-bone px-6 py-10 text-center text-ink shadow-sm">
        <p className="mb-4 font-publish text-xl tracking-widest">VOLLEY</p>
        {title(f.thanks.eyebrow, f.thanks.headline)}
        <p className="mt-4 text-xs leading-relaxed">Thanks, Lerato. {f.thanks.message}</p>
        <span className="mt-6 inline-block rounded-full bg-black px-5 py-2 text-[10px] text-bone uppercase">Close</span>
      </div>
    );

  return (
    <div className="overflow-hidden rounded-2xl border border-ink bg-bone text-ink shadow-sm">
      <div className="relative border-b border-ink px-5 pt-10 pb-5 text-center">
        {f.sticker && (
          <span className="absolute top-3 left-3 -rotate-6 rounded-sm bg-white px-2 py-0.5 text-[10px] shadow-sm">
            {f.sticker}
          </span>
        )}
        <p className="mb-3 font-publish text-lg tracking-widest">VOLLEY</p>
        {title(f.eyebrow, f.headline)}
        <p className="mt-3 text-[11px] leading-relaxed">{f.intro}</p>
      </div>
      <div className="space-y-5 px-5 py-5">
        {[f.sections.details, f.sections.preferences, f.sections.parent].map((s, i) => (
          <div key={i}>
            <p className="flex items-center gap-2 border-b border-ink pb-1.5">
              <span className="flex size-5 items-center justify-center rounded-full border border-ink bg-pink text-[9px]">
                0{i + 1}
              </span>
              <span className="text-xs uppercase">{s}</span>
            </p>
            {i === 1 && (
              <>
                {f.note && (
                  <p className="mt-2 border-l-2 border-pink bg-pink/15 px-2 py-1.5 text-[10px] leading-snug text-brick">
                    {f.note}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap gap-1">
                  {f.unitTypes.filter(Boolean).map((u) => (
                    <span key={u} className="rounded-full border border-ink/30 px-2 py-0.5 text-[10px]">
                      {u}
                    </span>
                  ))}
                </div>
              </>
            )}
            {i !== 1 && <div className="mt-3 space-y-2">{[0, 1].map((k) => <div key={k} className="h-px bg-ink/25" />)}</div>}
          </div>
        ))}
        <div className="border-t border-ink pt-3">
          <p className="text-[10px] text-ink/60">{f.privacy}</p>
          <span className="mt-2 block rounded-full bg-black py-2 text-center text-[10px] text-bone uppercase">
            {f.button}
          </span>
        </div>
      </div>
    </div>
  );
}
