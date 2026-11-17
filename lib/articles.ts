import type { Article, ArticleKind } from "@/lib/types";

/* The Volley Reader's order and dates, as the website has them
   (../volley-site/lib/articles.js; keep the two in step), and the blank
   article a new one starts from. Plain TypeScript, so server pages and
   client components can both import it. */

export const BLANK_ARTICLE: Article = {
  id: "new",
  slug: "",
  title: "",
  location: "",
  date: null,
  meta: "",
  category: "",
  excerpt: "",
  image: "",
  hero: "",
  aspect: "aspect-[347/454]",
  body: [],
  kind: "reader",
  published: false,
  sort: 0,
};


/* The two kinds of article: each a tab on the Articles page, its own
   carousel on the home page and its own address on the website
   (../volley-site/lib/articles.js). */
export const ARTICLE_KINDS: { value: ArticleKind; label: string; path: string }[] = [
  { value: "reader", label: "Volley Reader", path: "volley-reader" },
  { value: "goings-on", label: "Goings on", path: "goings-on" },
];
export const kindOf = (article: Pick<Article, "kind">): ArticleKind =>
  article.kind === "goings-on" ? "goings-on" : "reader";
export const isKind = (value: unknown): value is ArticleKind => ARTICLE_KINDS.some((k) => k.value === value);
export const kindLabel = (kind: ArticleKind) => ARTICLE_KINDS.find((k) => k.value === kind)!.label;
// Its address on the website, from the site's root: /volley-reader/… or /goings-on/….
export const articlePath = (article: Pick<Article, "kind" | "slug">) =>
  `/${ARTICLE_KINDS.find((k) => k.value === kindOf(article))!.path}/${article.slug}`;

/* An article's date as the byline shows it, "July 15, 2024", from its
   `date`. Without one, its old free-text byline (`meta`). */
export function articleDate(article: Pick<Article, "date" | "meta">): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(article.date ?? "")) return article.meta ?? "";
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${article.date}T00:00:00Z`));
}

/* Newest first, by `date`; articles with no date after, by their old
   `sort`. Done here, not by the query, so a database still without the
   date column lists them too. */
export function newestFirst<T extends Pick<Article, "date" | "sort">>(articles: T[]): T[] {
  return [...articles].sort((a, b) => {
    const x = a.date ?? "";
    const y = b.date ?? "";
    if (x !== y) return x === "" ? 1 : y === "" ? -1 : y.localeCompare(x);
    return (a.sort ?? 0) - (b.sort ?? 0);
  });
}

// Today in Pretoria, as "YYYY-MM-DD": a new article's date.
export const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Johannesburg" }).format(new Date());
