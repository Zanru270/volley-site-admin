"use client";

import { Field, inputClass, labelClass, tab, tabs, textareaClass } from "@/components/ui";
import { ARTICLE_KINDS, articlePath, kindOf } from "@/lib/articles";
import FormSections from "@/components/FormSections";
import type { Article } from "@/lib/types";
import { ArticleBody, ArticlePhotos } from "./fields";
import { DatePicker } from "@/components/DatePicker";

/* One article as a form, section by section: the live editor's "Form view",
   in its side panel. It edits the editor's own draft, so the page beside it
   follows along and the editor's Save saves it. Whether it's on the website
   is the editor's Publish button, not this. */
export default function ArticleForm({
  article: a,
  onChange,
  onTitle,
  onSlug,
}: {
  article: Article;
  onChange: (patch: Partial<Article>) => void;
  // The title and URL go through the editor, which keeps a new article's
  // URL following its title until it's set by hand.
  onTitle: (title: string) => void;
  onSlug: (slug: string) => void;
}) {
  return (
    <FormSections
      sections={[
        {
          id: "details",
          title: "Details",
          description: "Where it shows, the title, its address on the website, and the line under it.",
          content: (
            <>
              {/* Not a Field: that's a <label>, which would pass a click on
                  its hint to the first button. */}
              <div className="space-y-1.5">
                <span className={labelClass}>Shows in</span>
                <div role="radiogroup" aria-label="Shows in" className={tabs}>
                  {ARTICLE_KINDS.map((k) => (
                    <button
                      key={k.value}
                      type="button"
                      role="radio"
                      aria-checked={kindOf(a) === k.value}
                      onClick={() => onChange({ kind: k.value })}
                      className={tab(kindOf(a) === k.value)}
                    >
                      {k.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-ink/50">
                  Its carousel on the home page, and its address. Its page looks the same either way.
                </p>
              </div>
              <Field label="Title">
                <input required value={a.title} onChange={(e) => onTitle(e.target.value)} className={inputClass} />
              </Field>
              <Field label="URL" hint={`volley…${articlePath({ ...a, slug: a.slug || "…" })}. Changing it breaks links people already have.`}>
                <input required value={a.slug} onChange={(e) => onSlug(e.target.value)} className={inputClass} />
              </Field>
              <div className="grid gap-6 sm:grid-cols-3">
                <Field label="Location" hint='e.g. "Volley Brooklyn"'>
                  <input value={a.location} onChange={(e) => onChange({ location: e.target.value })} className={inputClass} />
                </Field>
                <Field label="Date" hint="Newest show first.">
                  <DatePicker value={a.date ?? ""} onChange={(d) => onChange({ date: d || null })} />
                </Field>
                <Field label="Category" hint="The line under the title.">
                  <input value={a.category} onChange={(e) => onChange({ category: e.target.value })} className={inputClass} />
                </Field>
              </div>
              <Field label="Excerpt" hint="On the card in the carousel, in search results, and in place of a body.">
                <textarea rows={3} value={a.excerpt} onChange={(e) => onChange({ excerpt: e.target.value })} className={textareaClass} />
              </Field>
            </>
          ),
        },
        {
          id: "photos",
          title: "Photos",
          description: "The card photo, and the title photo if it should differ.",
          content: <ArticlePhotos article={a} onChange={onChange} />,
        },
        {
          id: "body",
          title: "Body",
          description: "The article, top to bottom. Without any blocks, the page shows the excerpt.",
          content: <ArticleBody body={a.body} onChange={(body) => onChange({ body })} />,
        },
      ]}
    />
  );
}
