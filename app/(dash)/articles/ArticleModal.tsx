"use client";

import { useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import {
  button,
  Field,
  inputClass,
  labelClass,
  textareaClass,
  Toggle,
} from "@/components/ui";
import EditModal, { ModalSection } from "@/components/EditModal";
import CustomSelect from "@/components/CustomSelect";
import { move, RowControls, StringList } from "@/components/forms";
import { ImageField } from "@/components/Upload";
import type { Article, ArticleBlock } from "@/lib/types";

/* The carousel card crops. They're Tailwind classes, so the main site has
   to know them in advance: keep this list in step with the
   `@source inline(...)` line in ../volley-site/app/globals.css. */
const ASPECTS = [
  ["aspect-[347/454]", "Tall"],
  ["aspect-[347/359]", "Medium"],
  ["aspect-[347/303]", "Short"],
] as const;

const BLOCKS: { type: ArticleBlock["type"]; label: string; make: () => ArticleBlock }[] = [
  { type: "lead", label: "Lead paragraph", make: () => ({ type: "lead", text: "" }) },
  { type: "paragraph", label: "Paragraph", make: () => ({ type: "paragraph", text: "" }) },
  { type: "section", label: "Section with heading", make: () => ({ type: "section", heading: "", paragraphs: [""] }) },
  { type: "quote", label: "Pull quote", make: () => ({ type: "quote", text: "" }) },
  { type: "image", label: "Photo", make: () => ({ type: "image", src: "", alt: "" }) },
  { type: "gallery", label: "Photo row", make: () => ({ type: "gallery", images: [{ src: "", alt: "" }] }) },
];
const blockLabel = (type: string) => BLOCKS.find((b) => b.type === type)?.label ?? type;

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

export const BLANK_ARTICLE: Article = {
  id: "new",
  slug: "",
  title: "",
  location: "",
  meta: "",
  category: "",
  excerpt: "",
  image: "",
  hero: "",
  aspect: "aspect-[347/454]",
  body: [],
  published: false,
  sort: 0,
};

/* Adding or editing one article, in the wide drawer. Nothing is saved
   until Save; the list page does the saving through onSave. */
export default function ArticleModal({
  article: initial,
  saving,
  onClose,
  onSave,
}: {
  article: Article;
  saving: boolean;
  onClose: () => void;
  onSave: (article: Article) => void;
}) {
  const [a, setA] = useState(initial);
  const isNew = initial.id === "new";
  // A new article's URL follows its title until it's edited by hand.
  const [slugTouched, setSlugTouched] = useState(!isNew);

  const set = <K extends keyof Article>(key: K, value: Article[K]) =>
    setA((old) => ({ ...old, [key]: value }));
  const setBlocks = (body: ArticleBlock[]) => set("body", body);
  const setBlock = (i: number, block: ArticleBlock) =>
    setBlocks(a.body.map((old, j) => (j === i ? block : old)));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSave(a);
  };

  const aspects = ASPECTS.some(([v]) => v === a.aspect)
    ? ASPECTS
    : [[a.aspect, a.aspect || "Default"] as const, ...ASPECTS];

  return (
    <EditModal
      isOpen
      wide
      onClose={onClose}
      title={isNew ? "New Article" : "Edit Article"}
      formId="article-form"
      saveLabel={isNew ? "Create Article" : "Save Article"}
      isSaving={saving}
    >
      <form id="article-form" onSubmit={submit} className="space-y-8">
        <div className="space-y-6">
          <Field label="Title">
            <input
              required
              value={a.title}
              onChange={(e) => {
                set("title", e.target.value);
                if (!slugTouched) set("slug", slugify(e.target.value));
              }}
              className={inputClass}
            />
          </Field>
          <Field label="URL" hint={`volley…/volley-reader/${a.slug || "…"}. Changing it breaks links people already have.`}>
            <input
              required
              value={a.slug}
              onChange={(e) => {
                setSlugTouched(true);
                set("slug", slugify(e.target.value));
              }}
              className={inputClass}
            />
          </Field>
          <div className="grid gap-6 sm:grid-cols-3">
            <Field label="Location" hint='e.g. "Volley Brooklyn"'>
              <input value={a.location} onChange={(e) => set("location", e.target.value)} className={inputClass} />
            </Field>
            <Field label="Date line" hint='e.g. "July 15, 2024"'>
              <input value={a.meta} onChange={(e) => set("meta", e.target.value)} className={inputClass} />
            </Field>
            <Field label="Category" hint="The line under the title.">
              <input value={a.category} onChange={(e) => set("category", e.target.value)} className={inputClass} />
            </Field>
          </div>
          <Field label="Excerpt" hint="A sentence or two, for search results and articles without a body.">
            <textarea rows={3} value={a.excerpt} onChange={(e) => set("excerpt", e.target.value)} className={textareaClass} />
          </Field>
        </div>

        <div className="border-t border-ink/10 pt-6">
          <Toggle
            checked={a.published}
            onChange={(v) => set("published", v)}
            label="Published"
            description="Shown on the website. Drafts stay hidden."
          />
        </div>

        <ModalSection title="Photos">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <span className={labelClass}>Card photo</span>
              <ImageField value={a.image} onChange={(v) => set("image", v)} folder="articles" />
              <p className="text-xs text-ink/50">In the carousel, and beside the title unless there&apos;s a title photo.</p>
            </div>
            <div className="space-y-2">
              <span className={labelClass}>Title photo (optional)</span>
              <ImageField value={a.hero} onChange={(v) => set("hero", v)} folder="articles" />
              <p className="text-xs text-ink/50">Beside the title on the article page, if it should differ.</p>
            </div>
          </div>
          <CustomSelect
            label="Card shape"
            value={a.aspect}
            onChange={(v) => set("aspect", v)}
            options={aspects.map(([value, label]) => ({ value, label }))}
            className="sm:max-w-xs"
          />
        </ModalSection>

        <ModalSection title="Body" description="The article, top to bottom. Without any blocks, the page shows the excerpt.">
          <div className="space-y-3">
            {a.body.map((block, i) => (
              <div key={i} className="rounded-xl border border-ink/8 bg-bone/30 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className={labelClass}>{blockLabel(block.type)}</span>
                  <RowControls
                    index={i}
                    count={a.body.length}
                    onMove={(x, y) => setBlocks(move(a.body, x, y))}
                    onRemove={() => setBlocks(a.body.filter((_, j) => j !== i))}
                  />
                </div>
                <BlockFields block={block} onChange={(b) => setBlock(i, b)} />
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {BLOCKS.map((b) => (
              <button key={b.type} type="button" onClick={() => setBlocks([...a.body, b.make()])} className={button.ghost}>
                <Plus className="size-4" /> {b.label}
              </button>
            ))}
          </div>
        </ModalSection>
      </form>
    </EditModal>
  );
}

function BlockFields({ block, onChange }: { block: ArticleBlock; onChange: (b: ArticleBlock) => void }) {
  switch (block.type) {
    case "lead":
    case "paragraph":
    case "quote":
      return (
        <textarea
          rows={block.type === "quote" ? 2 : 4}
          value={block.text}
          onChange={(e) => onChange({ ...block, text: e.target.value })}
          className={`${textareaClass} bg-white`}
        />
      );
    case "image":
      return (
        <div className="space-y-2">
          <ImageField value={block.src} onChange={(src) => onChange({ ...block, src })} folder="articles" />
          <input value={block.alt} onChange={(e) => onChange({ ...block, alt: e.target.value })} placeholder="Describe the photo, for screen readers" className={inputClass} />
        </div>
      );
    case "gallery":
      return (
        <div className="space-y-4">
          {block.images.map((img, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="min-w-0 flex-1 space-y-2">
                <ImageField
                  value={img.src}
                  onChange={(src) => onChange({ ...block, images: block.images.map((o, j) => (j === i ? { ...o, src } : o)) })}
                  folder="articles"
                />
                <input
                  value={img.alt}
                  onChange={(e) => onChange({ ...block, images: block.images.map((o, j) => (j === i ? { ...o, alt: e.target.value } : o)) })}
                  placeholder="Describe the photo"
                  className={inputClass}
                />
              </div>
              <RowControls
                index={i}
                count={block.images.length}
                onMove={(x, y) => onChange({ ...block, images: move(block.images, x, y) })}
                onRemove={() => onChange({ ...block, images: block.images.filter((_, j) => j !== i) })}
              />
            </div>
          ))}
          <button type="button" onClick={() => onChange({ ...block, images: [...block.images, { src: "", alt: "" }] })} className={button.ghost}>
            <Plus className="size-4" /> Add a photo
          </button>
        </div>
      );
    case "section":
      return (
        <div className="space-y-3">
          <input value={block.heading} onChange={(e) => onChange({ ...block, heading: e.target.value })} placeholder="Heading" className={inputClass} />
          <StringList multiline values={block.paragraphs} onChange={(paragraphs) => onChange({ ...block, paragraphs })} addLabel="Add a paragraph" />
        </div>
      );
  }
}
