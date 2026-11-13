"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { EyeOff, Globe, Trash2 } from "lucide-react";
import { button, Field, inputClass, SaveButton } from "@/components/ui";
import { useToast } from "@/components/ToastProvider";
import ConfirmationModal from "@/components/ConfirmationModal";
import { useConfirm } from "@/components/ConfirmProvider";
import {
  cardPosition,
  EditorHeader,
  FieldCard,
  PreviewCanvas,
  usePreviewFrame,
  type Box,
  type Device,
} from "@/components/live-editor/editorShell";
import { confirmNavigation, useLeaveGuard } from "@/lib/navigation-guard";
import { startNavigationProgress } from "@/lib/navigation-progress";
import { applyInlineEdit, ARTICLE_NOT_INLINE, type ArticleField, type BlockAction, type FrameRect } from "@/lib/live-editor";
import { move } from "@/components/Sortable";
import type { PreviewToken } from "@/lib/preview-token";
import type { Article } from "@/lib/types";
import { deleteArticle, saveArticle } from "./actions";
import ArticleForm from "./ArticleForm";
import { ArticlePhotos, BlockFields, BLOCKS, blockLabel, slugify } from "./fields";

// The cards: the parts of the page, and the form view with all of it.
type Card = ArticleField | "form";
const CARDS: Record<Card, { title: string; hint?: string; panel?: boolean; size?: "lg" | "xl" }> = {
  photos: {
    title: "Photos",
    hint: "The card photo shows in the carousel, where the website picks each card's shape by its place; the title photo beside the title here, if it should differ.",
    panel: true,
    size: "lg",
  },
  date: {
    title: "Date",
    hint: "The articles show newest first, on the website and here, and the byline shows it.",
  },
  // One photo block: its photos and their descriptions.
  body: {
    title: "Photos",
    hint: "To move this block, or add another, use the buttons beside it on the page.",
    panel: true,
    size: "lg",
  },
  form: {
    title: "Form view",
    hint: "The whole article in one place, including what isn't on the page (its URL, the excerpt). It's the same draft as the page beside it: Save at the top saves it.",
    panel: true,
    size: "lg",
  },
};

/* A Volley Reader article's live editor, as the Bow + Arc CMS's News &
   Views one: the real article page (the website's /preview/article) in a
   frame, drawn from this draft. Its wording is typed straight onto it; a
   click on the photo, a block's photo, or the strip at the end opens that
   part's card: the title photo, or a photo block's photos. Blocks are moved,
   added and removed with their controls on the page. The form view (the
   URL and excerpt too) is a panel over the same draft. Nothing reaches the
   database until Save, which keeps the article as it is: a draft stays a
   draft, a published one stays live. Only Publish puts it on the website,
   and Unpublish (after a confirm) takes it off again; each saves any
   changes along with it. */
export default function ArticleLiveEditor({ initial, preview }: { initial: Article; preview: PreviewToken }) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [draft, setDraft] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [pending, start] = useTransition();
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const isNew = draft.id === "new";
  // A new article's URL follows its title until it's set by hand.
  const [slugTouched, setSlugTouched] = useState(!isNew);

  const [device, setDevice] = useState<Device>("desktop");
  const [active, setActive] = useState<Card | null>(null);
  // For the photo block card: which block.
  const [blockIndex, setBlockIndex] = useState<number | null>(null);
  const [confirmUnpublish, setConfirmUnpublish] = useState(false);
  const [anchor, setAnchor] = useState<FrameRect | null>(null);
  const [frameBox, setFrameBox] = useState<Box | null>(null);
  const activeRef = useRef<Card | null>(null);
  // Cards are drawn in the browser only: where one floats depends on the window.
  const inBrowser = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const set = (patch: Partial<Article>) => setDraft((old) => ({ ...old, ...patch }));

  const { iframeRef, previewUrl, previewError } = usePreviewFrame({
    page: "article",
    preview,
    draft,
    highlight: active === "form" ? null : active,
    highlightIndex: active === "body" ? blockIndex : null,
    onMessage: (message) => {
      if (message.type === "select") openCard(message.field, message.rect, message.index ?? null);
      else if (message.type === "rect") {
        // Its place, reported as the page scrolls: the same card, kept on
        // the same block.
        if (message.field === activeRef.current) openCard(message.field, message.rect, message.index ?? null);
      } else if (message.type === "edit")
        setDraft((old) => {
          const next = applyInlineEdit(old, message.key, message.value, ARTICLE_NOT_INLINE);
          return message.key === "title" && !slugTouched ? { ...next, slug: slugify(next.title) } : next;
        });
      else onBlockAction(message);
    },
  });

  /* A block moved, added or removed with its controls on the page. A new
     photo or photo row opens the blocks dialog, to upload into; a block is
     only removed once that's confirmed, here, as the page can't ask. */
  const onBlockAction = (action: BlockAction) => {
    const body = draft.body;
    switch (action.type) {
      case "move":
        if (action.from < body.length && action.to < body.length) set({ body: move(body, action.from, action.to) });
        return;
      case "insert": {
        const make = BLOCKS.find((b) => b.type === action.kind)?.make;
        if (!make || action.at > body.length) return;
        set({ body: [...body.slice(0, action.at), make(), ...body.slice(action.at)] });
        if (action.kind === "image" || action.kind === "gallery") openCard("body", null, action.at);
        return;
      }
      case "remove":
        if (action.at >= body.length) return;
        void confirm({
          title: "Delete this block?",
          message: "It comes out of the article. Until you save, leaving without saving brings it back.",
        }).then((yes) => yes && setDraft((old) => ({ ...old, body: old.body.filter((_, i) => i !== action.at) })));
        return;
    }
  };

  const openCard = useCallback(
    (card: Card | null, rect: FrameRect | null = null, index: number | null = null) => {
      setActive(card);
      setBlockIndex(index);
      setAnchor(rect);
      const box = iframeRef.current?.getBoundingClientRect();
      setFrameBox(box ? { left: box.left, top: box.top, width: box.width, height: box.height } : null);
    },
    [iframeRef],
  );

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  // The editor covers the admin; the page underneath stays put.
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    if (!active) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      // A confirmation opened from the card closes itself first.
      if (document.querySelector('[aria-modal="true"]')) return;
      openCard(null);
    };
    const onResize = () => openCard(null);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onResize);
    };
  }, [active, openCard]);

  useLeaveGuard(dirty);
  const leave = async (href: string) => {
    if (!(await confirmNavigation())) return;
    startNavigationProgress(href);
    router.push(href);
  };

  /* Saves `article` (the draft), live on
     the website or not as `published` says: as it was saved, unless this is
     Publish or Unpublish. A new one comes back with its id, and the address
     moves to it. */
  const save = (article: Article = draft, published = saved.published) =>
    start(async () => {
      try {
        const result = await saveArticle({ ...article, published });
        const title = published === saved.published ? undefined : published ? "Published" : "Unpublished";
        toast.result(result, title);
        if (!result.ok) return;
        const kept = { ...article, published, id: result.id ?? article.id };
        setDraft(kept);
        setSaved(kept);
        if (article.id === "new" && result.id) router.replace(`/articles/${result.id}`);
      } catch (err) {
        toast.error("Not saved", (err as Error).message);
      }
    });

  // Deletes the article, after a confirm, and goes back to the list.
  const remove = async () => {
    const yes = await confirm({
      title: "Delete this article?",
      message: `"${saved.title || "Untitled"}" comes off the website and out of the admin. This can't be undone.`,
    });
    if (!yes) return;
    start(async () => {
      const result = await deleteArticle(saved.id);
      toast.result(result, "Article deleted");
      if (!result.ok) return;
      startNavigationProgress("/articles");
      router.push("/articles");
    });
  };

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");

  const cardBody = (card: Card): ReactNode => {
    switch (card) {
      case "photos":
        return (
          <ArticlePhotos article={draft} onChange={set} />
        );
      case "date":
        return (
          <Field label="Date">
            <input type="date" value={draft.date ?? ""} onChange={(e) => set({ date: e.target.value || null })} className={inputClass} />
          </Field>
        );
      case "body": {
        const block = blockIndex === null ? undefined : draft.body[blockIndex];
        if (!block) return null;
        return (
          <BlockFields
            block={block}
            onChange={(next) => set({ body: draft.body.map((b, i) => (i === blockIndex ? next : b)) })}
          />
        );
      }
      case "form":
        return (
          <>
            <ArticleForm
              article={draft}
              onChange={set}
              onTitle={(title) =>
                setDraft((old) => ({ ...old, title, ...(slugTouched ? {} : { slug: slugify(title) }) }))
              }
              onSlug={(slug) => {
                setSlugTouched(true);
                set({ slug: slugify(slug) });
              }}
            />
            {!isNew && (
              <div className="border-t border-ink/10 pt-5">
                <button type="button" onClick={remove} disabled={pending} className={`${button.ghost} text-brick! hover:text-red!`}>
                  <Trash2 className="size-4" /> Delete this article
                </button>
              </div>
            )}
          </>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-45 flex flex-col bg-bone">
      <EditorHeader
        back={{ label: "Volley Reader", onClick: () => leave("/articles") }}
        title={draft.title.trim() || "New article"}
        status={
          <span
            title={saved.published ? "Live on the website" : "A draft: not on the website"}
            className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${
              saved.published ? "bg-lemon/55 text-green" : "bg-bone text-ink/60"
            }`}
          >
            {saved.published ? "Published" : "Draft"}
          </span>
        }
        dirty={dirty}
        device={device}
        onDevice={(next) => {
          openCard(null);
          setDevice(next);
        }}
        viewUrl={saved.published && !isNew && siteUrl ? `${siteUrl}/volley-reader/${saved.slug}` : null}
        formOpen={active === "form"}
        onForm={() => openCard(active === "form" ? null : "form")}
        formTitle="Every part of the article as a form, including its URL and excerpt"
        actions={
          // Publish and Unpublish are the only ways on and off the website;
          // Save keeps it as it is.
          saved.published && !isNew ? (
            <button
              type="button"
              onClick={() => setConfirmUnpublish(true)}
              disabled={pending}
              title="Take it off the website. It stays here as a draft."
              className={`${button.secondary} py-2!`}
            >
              <EyeOff className="size-4" /> <span className="hidden sm:inline">Unpublish</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => save(draft, true)}
              disabled={pending}
              title="Save and put it on the website"
              className={`${button.secondary} py-2!`}
            >
              <Globe className="size-4" /> <span className="hidden sm:inline">Publish</span>
            </button>
          )
        }
        save={<SaveButton dirty={isNew || dirty} pending={pending} label="Save" onClick={() => save()} />}
      />

      <PreviewCanvas
        iframeRef={iframeRef}
        previewUrl={previewUrl}
        previewError={previewError}
        device={device}
        title="Live preview of the article"
        onBackgroundClick={() => openCard(null)}
      />

      {active && inBrowser && (
        <FieldCard
          key={active}
          title={
            active === "body" && blockIndex !== null && draft.body[blockIndex]
              ? blockLabel(draft.body[blockIndex].type)
              : CARDS[active].title
          }
          hint={CARDS[active].hint}
          panel={CARDS[active].panel}
          size={CARDS[active].size}
          position={cardPosition(anchor, frameBox)}
          onClose={() => openCard(null)}
        >
          {cardBody(active)}
        </FieldCard>
      )}

      <ConfirmationModal
        isOpen={confirmUnpublish}
        onClose={() => setConfirmUnpublish(false)}
        onConfirm={() => {
          setConfirmUnpublish(false);
          save(draft, false);
        }}
        title="Unpublish this article?"
        message={`It comes off the website${dirty ? ", with your changes saved," : ""} and stays here as a draft until it's published again.`}
        confirmText="Unpublish"
        variant="warning"
        isLoading={pending}
      />
    </div>
  );
}
