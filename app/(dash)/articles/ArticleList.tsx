"use client";

/* eslint-disable @next/next/no-img-element -- previews of arbitrary URLs */
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Edit2,
  ExternalLink,
  FileText,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { Badge, button, CountPill, iconButton, iconButtonDanger, PageHeader, SearchBox } from "@/components/ui";
import ConfirmationModal from "@/components/ConfirmationModal";
import ListViewSwitch from "@/components/ListViewSwitch";
import { useAction } from "@/components/forms";
import { useListView } from "@/hooks/useListView";
import { articleDate } from "@/lib/articles";
import { siteAsset } from "@/lib/site";
import type { Article } from "@/lib/types";
import { deleteArticle } from "./actions";

type Status = "published" | "draft";
const STATUS_CHIPS: { label: string; value: Status | null }[] = [
  { label: "All", value: null },
  { label: "Published", value: "published" },
  { label: "Drafts", value: "draft" },
];
const statusOf = (a: Article): Status => (a.published ? "published" : "draft");

// A filter chip with its count, as on the Bow + Arc CMS's News & Views page.
const chipClass = (active: boolean) =>
  `inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20 ${
    active
      ? "border-ink bg-ink text-bone"
      : "border-ink/12 bg-white text-ink/60 hover:border-ink/30 hover:text-ink"
  }`;

const overPhoto =
  "inline-flex cursor-pointer items-center justify-center rounded-full bg-white/90 p-2 text-ink/60 shadow-soft transition-colors hover:bg-white hover:text-ink";

/* The Volley Reader, laid out like the Bow + Arc CMS's News & Views page: a
   toolbar (search, a count, grid or list), published / draft chips, then a
   card or a row per article. Opening one goes to its live editor
   (/articles/[id]), as there. As there too, they're newest first by date,
   the order the website shows them in; `initial` comes sorted. */
export default function ArticleList({ initial }: { initial: Article[] }) {
  const router = useRouter();
  // Fresh from the server after every change (router.refresh).
  const list = initial;
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<Status | null>(null);
  const [view, setView] = useListView("admin-articles-view");
  const [deleting, setDeleting] = useState<Article | null>(null);
  const { pending, run } = useAction();
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");

  const q = search.trim().toLowerCase();
  const searched = q
    ? list.filter((a) => [a.title, a.location, a.category, a.slug].some((t) => t?.toLowerCase().includes(q)))
    : list;
  const shown = status ? searched.filter((a) => statusOf(a) === status) : searched;
  const clear = () => {
    setSearch("");
    setStatus(null);
  };

  const onDelete = async () => {
    if (!deleting) return;
    await run(() => deleteArticle(deleting.id), "Article deleted");
    setDeleting(null);
  };

  const edit = (a: Article) => router.push(`/articles/${a.id}`);
  const byline = (a: Article) => [a.location, articleDate(a)].filter(Boolean).join(" | ");
  const viewLink = (a: Article, className: string) =>
    a.published &&
    siteUrl && (
      <a
        href={`${siteUrl}/volley-reader/${a.slug}`}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        aria-label={`View ${a.title} on the website`}
        title="View on the website"
      >
        <ExternalLink className="size-4" />
      </a>
    );

  return (
    <>
      <PageHeader
        icon={FileText}
        title="Volley Reader"
        description="The articles in the home page carousel, newest first, each with its own page. Drafts stay hidden until published."
        actions={
          <Link href="/articles/new" className={`${button.primary} w-full sm:w-auto`}>
            <Plus className="size-4" /> New article
          </Link>
        }
      />

      <div className="mb-4 flex flex-col items-start justify-between gap-4 rounded-2xl border border-ink/10 bg-white p-4 sm:flex-row sm:items-center">
        <SearchBox value={search} onChange={setSearch} placeholder="Search articles..." />
        <div className="flex shrink-0 items-center gap-3 self-end sm:self-auto">
          <CountPill>
            {shown.length} {shown.length === 1 ? "article" : "articles"}
          </CountPill>
          <ListViewSwitch view={view} onChange={setView} />
        </div>
      </div>

      <div role="group" aria-label="Filter articles" className="mb-6 flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
        {STATUS_CHIPS.map((chip) => (
          <button
            key={chip.label}
            type="button"
            onClick={() => setStatus(chip.value)}
            aria-pressed={status === chip.value}
            className={chipClass(status === chip.value)}
          >
            {chip.label}
            <span className={status === chip.value ? "text-bone/60" : "text-ink/35"}>
              {chip.value ? searched.filter((a) => statusOf(a) === chip.value).length : searched.length}
            </span>
          </button>
        ))}
      </div>

      {shown.length > 0 && view === "grid" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {shown.map((a) => (
            <div
              key={a.id}
              className="group relative overflow-hidden rounded-2xl border border-ink/10 bg-white transition-[border-color,box-shadow] hover:border-ink/25 hover:shadow-soft"
            >
              <button
                type="button"
                onClick={() => edit(a)}
                aria-label={`Edit ${a.title}`}
                className="block w-full cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
              >
                <div className="relative flex h-60 w-full items-center justify-center overflow-hidden bg-bone/60">
                  {a.image ? (
                    <img
                      src={siteAsset(a.image)}
                      alt=""
                      className="absolute inset-0 size-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <FileText className="size-6 text-ink/30" />
                  )}
                  <span className="absolute bottom-3 left-3">
                    {a.published ? <Badge tone="lemon">Published</Badge> : <Badge>Draft</Badge>}
                  </span>
                </div>
                <div className="space-y-2 p-4">
                  <span className="block truncate font-publish text-xl leading-tight text-ink">{a.title || "Untitled"}</span>
                  <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs text-ink/50">
                    {byline(a) && <span className="truncate">{byline(a)}</span>}
                    {a.category && <Badge>{a.category}</Badge>}
                  </div>
                </div>
              </button>

              {/* Actions over the photo: always on a touch screen, on hover from md. */}
              <div className="absolute top-3 right-3 flex gap-2 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100">
                {viewLink(a, overPhoto)}
                <button type="button" onClick={() => edit(a)} aria-label={`Edit ${a.title}`} className={overPhoto}>
                  <Edit2 className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleting(a)}
                  aria-label={`Delete ${a.title}`}
                  className={`${overPhoto} hover:text-brick!`}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {shown.length > 0 && view === "list" && (
        <div className="divide-y divide-ink/5 overflow-hidden rounded-2xl border border-ink/10 bg-white">
          {shown.map((a) => (
            <div key={a.id} className="flex items-center gap-1 bg-white pr-2 transition-colors hover:bg-bone/25 sm:pr-3">
              <button
                type="button"
                onClick={() => edit(a)}
                aria-label={`Edit ${a.title}`}
                className="flex min-w-0 flex-1 cursor-pointer items-center gap-4 py-3 pl-4 text-left"
              >
                <span className="relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-bone/60">
                  {a.image ? (
                    <img src={siteAsset(a.image)} alt="" className="size-full object-cover" />
                  ) : (
                    <FileText className="size-5 text-ink/40" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-ink">{a.title || "Untitled"}</span>
                  <span className="mt-1 block truncate text-xs text-ink/50">{byline(a) || `/${a.slug}`}</span>
                </span>
                <span className="hidden shrink-0 items-center gap-2 sm:flex">
                  {a.category && <Badge>{a.category}</Badge>}
                  {a.published ? <Badge tone="lemon">Published</Badge> : <Badge>Draft</Badge>}
                </span>
              </button>
              {viewLink(a, iconButton)}
              <button type="button" onClick={() => edit(a)} className={iconButton} aria-label={`Edit ${a.title}`}>
                <Edit2 className="size-4" />
              </button>
              <button type="button" onClick={() => setDeleting(a)} className={iconButtonDanger} aria-label={`Delete ${a.title}`}>
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {shown.length === 0 && (
        <div className="rounded-2xl border border-ink/10 bg-white px-6 py-12 text-center text-sm text-ink/50">
          {list.length === 0 ? (
            <>
              No articles yet.{" "}
              <Link href="/articles/new" className="text-ink/70 underline underline-offset-2 hover:text-ink">
                Write the first one
              </Link>
            </>
          ) : (
            <>
              No articles match.{" "}
              <button
                type="button"
                onClick={clear}
                className="inline-flex cursor-pointer items-center gap-1 text-ink/70 underline underline-offset-2 hover:text-ink"
              >
                <X className="size-3.5" /> Clear the search and filters
              </button>
            </>
          )}
        </div>
      )}

      <ConfirmationModal
        isOpen={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={onDelete}
        title="Delete article"
        message={`Are you sure you want to delete "${deleting?.title}"? This can't be undone.`}
        isLoading={pending}
      />
    </>
  );
}
