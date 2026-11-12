/* Copies the website's current content into Supabase, once, so the admin
   starts from exactly what's on the site:

     npm run seed            fills only what's still empty
     npm run seed -- --force  overwrites what's there with the files

   Reads ../volley-site/content/*.json (the main site checked out next to
   this folder) and writes with the service role key from .env.local. */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
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

await step("Home page", "settings", { key: "home" }, async () =>
  must(await db.from("settings").upsert({ key: "home", value: read("home") })),
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

/* Each building's photos, from the website's own lib/locations.js, for
   any building that has none yet (or all of them with --force): the admin
   then starts from exactly what's showing. Skipped while the database has
   no photos column (supabase/building-photos.sql adds it). */
{
  const { locations: site } = await import(
    pathToFileURL(join(contentDir, "..", "lib", "locations.js")).href
  );
  const SLOTS = ["slides", "reveal", "community", "map", "neighbourhood", "gallery", "dad"];
  const { data: rows, error } = await db.from("locations").select("slug, photos");
  if (error?.code === "42703") {
    console.log("- Building photos: skipped (run supabase/building-photos.sql first)");
  } else if (error) {
    throw new Error(`locations: ${error.message}`);
  } else {
    let filled = 0;
    for (const loc of site) {
      const row = rows.find((r) => r.slug === loc.slug);
      if (!row || (row.photos && !force)) continue;
      const photos = Object.fromEntries(SLOTS.filter((slot) => loc[slot] != null).map((slot) => [slot, loc[slot]]));
      must(await db.from("locations").update({ photos }).eq("slug", loc.slug));
      filled++;
    }
    console.log(filled ? `✓ Building photos (${filled})` : "- Building photos: already there, skipped (use --force to overwrite)");
  }
}

/* Each building's "What's included", from lib/locations.js, for any that
   has one there and none in the database yet (or all, with --force). Only
   Volley Brooklyn has one; the rest stay hidden until the admin adds one.
   Skipped while the database has no included column (supabase/
   whats-included.sql adds it). */
{
  const { locations: site } = await import(
    pathToFileURL(join(contentDir, "..", "lib", "locations.js")).href
  );
  const { data: rows, error } = await db.from("locations").select("slug, included");
  if (error?.code === "42703") {
    console.log("- What's included: skipped (run supabase/whats-included.sql first)");
  } else if (error) {
    throw new Error(`locations: ${error.message}`);
  } else {
    let filled = 0;
    for (const loc of site) {
      const row = rows.find((r) => r.slug === loc.slug);
      if (!row || !loc.included || (row.included && !force)) continue;
      must(await db.from("locations").update({ included: loc.included }).eq("slug", loc.slug));
      filled++;
    }
    console.log(filled ? `✓ What's included (${filled})` : "- What's included: already there, skipped (use --force to overwrite)");
  }
}

/* Each building's "A (really) great Location", from lib/locations.js, for
   any that has none in the database yet (or all, with --force). Skipped
   while the database has no area column (supabase/location-area.sql adds
   it). */
{
  const { locations: site } = await import(
    pathToFileURL(join(contentDir, "..", "lib", "locations.js")).href
  );
  const { data: rows, error } = await db.from("locations").select("slug, area");
  if (error?.code === "42703") {
    console.log('- "A (really) great Location": skipped (run supabase/location-area.sql first)');
  } else if (error) {
    throw new Error(`locations: ${error.message}`);
  } else {
    let filled = 0;
    for (const loc of site) {
      const row = rows.find((r) => r.slug === loc.slug);
      if (!row || !loc.area || (row.area && !force)) continue;
      must(await db.from("locations").update({ area: loc.area }).eq("slug", loc.slug));
      filled++;
    }
    console.log(
      filled
        ? `✓ "A (really) great Location" (${filled})`
        : '- "A (really) great Location": already there, skipped (use --force to overwrite)',
    );
  }
}

console.log("\nDone. Open the admin to check, then edit away.");
