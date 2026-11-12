/* GENERATED from ../volley-site/lib/cache-tags.js by
   scripts/sync-cache-tags.mjs on `npm run dev`. Edit that file, not this
   one. */
export const CACHE_TAGS = {
  BANNER: "banner",
  HOME: "home",
  FAQS: "faqs",
  ARTICLES: "articles",
  LOCATIONS: "locations",
  VIEWINGS: "viewings",
  WAITLIST_FORM: "waitlist-form",
} as const;

export type CacheTag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS];
