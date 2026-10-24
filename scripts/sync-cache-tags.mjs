/* Copies the cache tag list from the main site (../volley-site/lib/
   cache-tags.js, the canonical copy) to lib/cache-tags.ts here. Runs before
   `npm run dev`, so a tag the two apps spell differently can't creep in;
   any change shows up as a git diff to commit.

   Not run on build: on Vercel the main site's folder isn't there, so the
   committed copy is used. Does nothing when the folder is missing. */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "..", "volley-site", "lib", "cache-tags.js");
const target = join(root, "lib", "cache-tags.ts");

if (!existsSync(source)) process.exit(0);

const object = readFileSync(source, "utf8").match(
  /export const CACHE_TAGS = (\{[\s\S]*?\});/,
)?.[1];
if (!object) {
  console.error(`sync-cache-tags: no CACHE_TAGS found in ${source}`);
  process.exit(1);
}

const out = `/* GENERATED from ../volley-site/lib/cache-tags.js by
   scripts/sync-cache-tags.mjs on \`npm run dev\`. Edit that file, not this
   one. */
export const CACHE_TAGS = ${object.replace(/\};?$/, "} as const;")}

export type CacheTag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS];
`;

if (!existsSync(target) || readFileSync(target, "utf8") !== out) {
  writeFileSync(target, out);
  console.log("sync-cache-tags: updated lib/cache-tags.ts");
}
