import type { Article } from "@/lib/types";

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
  published: false,
  sort: 0,
};


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
