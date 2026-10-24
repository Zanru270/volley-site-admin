/* A file path as the admin can show it. Paths like "/images/x.webp" are
   the public site's own files, so they're loaded from the site; uploaded
   files are already full Supabase URLs. */
export function siteAsset(src: string | null | undefined): string {
  if (!src) return "";
  if (/^https?:\/\//.test(src)) return src;
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
  return `${site}${src.startsWith("/") ? "" : "/"}${src}`;
}

export const LOCATION_NAMES: Record<string, string> = {
  brooklyn: "Volley Brooklyn",
  baileys: "Volley Baileys",
  roper: "Volley Roper",
  mooiriver: "Volley Mooiriver",
};
