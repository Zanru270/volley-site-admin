"use client";

import { Plus } from "lucide-react";
import { button, inputClass, labelClass, textareaClass } from "@/components/ui";
import { StringList } from "@/components/forms";
import CollapsibleList from "@/components/CollapsibleList";
import PhotoGallery from "@/components/PhotoGallery";
import ImageUploader from "@/components/ImageUploader";
import { FOCAL_PREVIEWS, SLOT_ASPECTS } from "@/lib/imageConstants";
import type { Article, ArticleBlock } from "@/lib/types";

/* A Volley Reader article's field editors, shared by its two views: the
   live editor's cards (ArticleLiveEditor.tsx) and its form view
   (ArticleForm.tsx). Each takes a value and reports the changed one;
   nothing here saves. */

export const BLOCKS: { type: ArticleBlock["type"]; label: string; make: () => ArticleBlock }[] = [
  { type: "lead", label: "Lead paragraph", make: () => ({ type: "lead", text: "" }) },
  { type: "paragraph", label: "Paragraph", make: () => ({ type: "paragraph", text: "" }) },
  { type: "section", label: "Section with heading", make: () => ({ type: "section", heading: "", paragraphs: [""] }) },
  { type: "quote", label: "Pull quote", make: () => ({ type: "quote", text: "" }) },
  { type: "image", label: "Photo", make: () => ({ type: "image", src: "", alt: "" }) },
  { type: "gallery", label: "Photo row", make: () => ({ type: "gallery", images: [] }) },
];
export const blockLabel = (type: string) => BLOCKS.find((b) => b.type === type)?.label ?? type;

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

export { BLANK_ARTICLE } from "@/lib/articles";

// The card and title photos.
export function ArticlePhotos({
  article: a,
  onChange,
}: {
  article: Article;
  onChange: (patch: Partial<Article>) => void;
}) {
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <div className="space-y-2">
        <span className={labelClass}>Card photo</span>
        <ImageUploader
          value={a.image || null}
          onChange={(image) => onChange({ image: image ?? "" })}
          preset="article"
          focalPreviews={FOCAL_PREVIEWS.articleCard}
          folder="articles"
        />
        <p className="text-xs text-ink/50">In the carousel, and beside the title unless there&apos;s a title photo.</p>
      </div>
      <div className="space-y-2">
        <span className={labelClass}>Title photo (optional)</span>
        <ImageUploader
          value={a.hero || null}
          onChange={(hero) => onChange({ hero: hero ?? "" })}
          preset="article"
          aspect={SLOT_ASPECTS.articleHero}
          folder="articles"
        />
        <p className="text-xs text-ink/50">Beside the title on the article page, if it should differ.</p>
      </div>
    </div>
  );
}

// A block's words, cut short: its row's line in the list.
const blockSummary = (block: ArticleBlock): string => {
  const text =
    block.type === "section"
      ? block.heading || block.paragraphs[0] || ""
      : block.type === "image"
        ? "Photo"
        : block.type === "gallery"
          ? `${block.images.length} ${block.images.length === 1 ? "photo" : "photos"}`
          : block.text;
  return text.length > 48 ? `${text.slice(0, 48)}…` : text;
};

/* The article's body: its blocks top to bottom in the shared list, each
   dragged by its grip (or moved with its arrows), with a button to add
   each kind. */
export function ArticleBody({
  body,
  onChange,
}: {
  body: ArticleBlock[];
  onChange: (body: ArticleBlock[]) => void;
}) {
  return (
    <CollapsibleList
      items={body}
      onChange={onChange}
      title={(block) => blockLabel(block.type)}
      untitled="Block"
      summary={blockSummary}
      removeLabel="Remove block"
      extraAdd={(add) =>
        BLOCKS.map((b) => (
          <button key={b.type} type="button" onClick={() => add(b.make())} className={button.ghost}>
            <Plus className="size-4" /> {b.label}
          </button>
        ))
      }
    >
      {(block, setBlock) => <BlockFields block={block} onChange={setBlock} />}
    </CollapsibleList>
  );
}

export function BlockFields({ block, onChange }: { block: ArticleBlock; onChange: (b: ArticleBlock) => void }) {
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
          <ImageUploader
            value={block.src || null}
            onChange={(src) => onChange({ ...block, src: src ?? "" })}
            preset="article"
            aspect={SLOT_ASPECTS.articleImage}
            folder="articles"
          />
        </div>
      );
    case "gallery":
      // Side by side on the page, in this order.
      return (
        <PhotoGallery
          photos={block.images}
          onChange={(images) => onChange({ ...block, images })}
          preset="article"
          aspect={SLOT_ASPECTS.articleRowPhoto}
          folder="articles"
        />
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
