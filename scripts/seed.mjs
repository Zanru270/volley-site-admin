/* Copies the website's current content into Supabase, once, so the admin
   starts from exactly what's on the site:

     npm run seed            fills only what's still empty
     npm run seed -- --force  overwrites what's there with the files

   Reads ../volley-site/content/*.json (the main site checked out next to
   this folder) and writes with the service role key from .env.local. */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const force = process.argv.includes("--force");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local first.");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

const contentDir = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "volley-site", "content");
const read = (name) => JSON.parse(readFileSync(join(contentDir, `${name}.json`), "utf8"));

const must = ({ error }) => {
  if (error) throw new Error(error.message);
};

async function isEmpty(table, filter) {
  let q = db.from(table).select("*", { count: "exact", head: true });
  if (filter) q = q.match(filter);
  const { count, error } = await q;
  if (error) throw new Error(`${table}: ${error.message} (did you run supabase/schema.sql?)`);
  return count === 0;
}

async function step(label, table, filter, write) {
  if (!force && !(await isEmpty(table, filter))) {
    console.log(`- ${label}: already there, skipped (use --force to overwrite)`);
    return;
  }
  await write();
  console.log(`✓ ${label}`);
}

await step("Banner", "settings", { key: "banner" }, async () =>
  must(await db.from("settings").upsert({ key: "banner", value: read("banner") })),
);

await step("Viewing schedule", "settings", { key: "viewings" }, async () =>
  must(await db.from("settings").upsert({ key: "viewings", value: read("viewings") })),
);

await step("Waitlist form", "settings", { key: "waitlist_form" }, async () =>
  must(await db.from("settings").upsert({ key: "waitlist_form", value: read("waitlist") })),
);

await step("FAQs", "faqs", null, async () => {
  must(await db.from("faqs").delete().not("id", "is", null));
  must(await db.from("faqs").insert(read("faqs").map((row, sort) => ({ ...row, sort }))));
});

await step("Articles", "articles", null, async () => {
  must(await db.from("articles").delete().not("id", "is", null));
  must(await db.from("articles").insert(read("articles").map((row, sort) => ({ ...row, sort }))));
});

await step("Locations", "locations", null, async () =>
  must(await db.from("locations").upsert(read("locations"))),
);

console.log("\nDone. Open the admin to check, then edit away.");
