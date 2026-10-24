"use client";

/* eslint-disable @next/next/no-img-element -- previews of arbitrary URLs */
import { useState } from "react";
import { Edit2, ExternalLink, FileText, Plus, Trash2 } from "lucide-react";
import {
  Badge,
  button,
  CountPill,
  iconButton,
  iconButtonDanger,
  PageHeader,
  row,
  SearchBox,
  tableHead,
  tableWrap,
  tbody,
  td,
  th,
  Toolbar,
} from "@/components/ui";
import ConfirmationModal from "@/components/ConfirmationModal";
import { move, RowControls, useAction } from "@/components/forms";
import { siteAsset } from "@/lib/site";
import type { Article } from "@/lib/types";
import ArticleModal, { BLANK_ARTICLE } from "./ArticleModal";
import { deleteArticle, reorderArticles, saveArticle } from "./actions";

/* The Volley Reader articles in carousel order, as the Bow + Arc CMS's
   News page: a table with edit and delete on each row, and the article
   itself edited in a drawer. Moving a row saves the new order at once. */
export default function ArticleList({ initial }: { initial: Article[] }) {
  const [list, setList] = useState(initial);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Article | null>(null);
  const [deleting, setDeleting] = useState<Article | null>(null);
  const { pending, run } = useAction();
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");

  // The server's copy wins once it arrives after a save (router.refresh).
  const [prevInitial, setPrevInitial] = useState(initial);
  if (initial !== prevInitial) {
    setPrevInitial(initial);
    setList(initial);
  }

  const q = search.trim().toLowerCase();
  const shown = q
    ? list.filter((a) =>
        [a.title, a.location, a.category, a.slug].some((t) => t?.toLowerCase().includes(q)),
      )
    : list;

  const reorder = async (from: number, to: number) => {
    const next = move(list, from, to);
    setList(next);
    if (!(await run(() => reorderArticles(next.map((a) => a.id)), "Order saved"))) setList(list);
  };

  const onSave = async (article: Article) => {
    const ok = await run(
      () => saveArticle(article),
      article.id === "new" ? "Article created" : "Article saved",
    );
    if (ok) setEditing(null);
  };

  const onDelete = async () => {
    if (!deleting) return;
    await run(() => deleteArticle(deleting.id), "Article deleted");
    setDeleting(null);
  };

  return (
    <>
      <PageHeader
        title="Volley Reader"
        description="The articles in the home page carousel, each with its own page. Drafts stay hidden until published."
        actions={
          <button type="button" onClick={() => setEditing(BLANK_ARTICLE)} className={`${button.primary} w-full sm:w-auto`}>
            <Plus className="size-4" /> New Article
          </button>
        }
      />

      <Toolbar>
        <SearchBox value={search} onChange={setSearch} placeholder="Search articles..." />
        <CountPill>
          {shown.length} {shown.length === 1 ? "Article" : "Articles"}
        </CountPill>
      </Toolbar>

      <div className={tableWrap}>
        <table className="w-full text-left text-sm">
          <thead className={tableHead}>
            <tr>
              <th className={th}>Article</th>
              <th className={th}>Date line</th>
              <th className={th}>Status</th>
              <th className={`${th} text-right`}>Actions</th>
            </tr>
          </thead>
          <tbody className={tbody}>
            {shown.map((a) => {
              const i = list.indexOf(a);
              return (
                <tr key={a.id} className={row}>
                  <td className={td}>
                    <div className="flex items-center gap-4">
                      <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-bone/60">
                        {a.image ? (
                          <img src={siteAsset(a.image)} alt="" className="size-full object-cover" />
                        ) : (
                          <FileText className="size-5 text-ink/40" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="max-w-xs truncate font-medium text-ink">{a.title}</p>
                        <p className="mt-1 max-w-xs truncate text-xs text-ink/50">
                          {a.location || `/${a.slug}`}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className={`${td} whitespace-nowrap text-ink/60`}>{a.meta || "—"}</td>
                  <td className={td}>
                    {a.published ? <Badge tone="lemon">Published</Badge> : <Badge>Draft</Badge>}
                  </td>
                  <td className={td}>
                    <div className="flex justify-end">
                      {!q && <RowControls index={i} count={list.length} onMove={reorder} />}
                      {a.published && siteUrl && (
                        <a
                          href={`${siteUrl}/volley-reader/${a.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={iconButton}
                          aria-label="View on the website"
                        >
                          <ExternalLink className="size-4" />
                        </a>
                      )}
                      <button type="button" onClick={() => setEditing(a)} className={iconButton} aria-label="Edit">
                        <Edit2 className="size-4" />
                      </button>
                      <button type="button" onClick={() => setDeleting(a)} className={iconButtonDanger} aria-label="Delete">
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {shown.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-ink/50">
                  {q ? <>No articles match &quot;{search}&quot;</> : "No articles yet."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <ArticleModal
          key={editing.id}
          article={editing}
          saving={pending}
          onClose={() => setEditing(null)}
          onSave={onSave}
        />
      )}

      <ConfirmationModal
        isOpen={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={onDelete}
        title="Delete Article"
        message={`Are you sure you want to delete "${deleting?.title}"? This can't be undone.`}
        isLoading={pending}
      />
    </>
  );
}
