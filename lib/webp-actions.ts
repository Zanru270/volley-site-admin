"use server";

import sharp from "sharp";
import { requireAdmin } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { ORIGINAL_MAX_DIMENSION, ORIGINAL_QUALITY } from "@/lib/imageConstants";
import type { CropRect } from "@/lib/storage-utils";

/* WebP for browsers that can't make it themselves (Safari), so every photo
   is stored in the same small format whichever browser uploaded it.

   The uploader puts the photo as it came at `source` (under tmp/: sending
   it here instead would run into the host's limit on a request's size,
   which a phone photo can pass). This crops it (`crop`, in the photo's own
   pixels, upright as the browser showed it), scales its longest side down
   to `maxDimension`, encodes it as WebP at `quality` (0–1), and stores it at
   `target`; with `original`, also the whole photo there, as the uploader
   keeps beside a cropped one. The temporary copy is always removed.

   Resolves to whether it worked: if not, the uploader stores the photo as
   the browser could encode it instead. */
export async function encodeWebp(input: {
  source: string;
  target: string;
  original?: string | null;
  crop?: CropRect | null;
  maxDimension: number;
  quality: number;
}): Promise<boolean> {
  await requireAdmin();
  const bucket = createServiceClient().storage.from("media");
  const { source, target, original, crop, maxDimension, quality } = input;
  const safe = (path: string) => !path.includes("..") && !path.startsWith("/");
  if (!source.startsWith("tmp/") || !safe(source)) return false;
  try {
    if (!safe(target) || target.startsWith("tmp/") || !target.endsWith(".webp")) return false;
    if (original && (!safe(original) || original.startsWith("tmp/"))) return false;

    const { data, error } = await bucket.download(source);
    if (error) throw error;
    // Upright, by the photo's own orientation, as the browser decoded it.
    const photo = sharp(Buffer.from(await data.arrayBuffer()), { failOn: "none" }).rotate();
    // Its upright size: orientations 5–8 turn it on its side.
    const meta = await photo.metadata();
    const turned = (meta.orientation ?? 1) >= 5;
    const width = (turned ? meta.height : meta.width) ?? 0;
    const height = (turned ? meta.width : meta.height) ?? 0;

    let main = photo.clone();
    if (crop) {
      const left = Math.min(Math.max(Math.round(crop.x), 0), width - 1);
      const top = Math.min(Math.max(Math.round(crop.y), 0), height - 1);
      main = main.extract({
        left,
        top,
        width: Math.max(1, Math.min(Math.round(crop.width), width - left)),
        height: Math.max(1, Math.min(Math.round(crop.height), height - top)),
      });
    }
    const encoded = await main
      .resize({ width: maxDimension, height: maxDimension, fit: "inside", withoutEnlargement: true })
      .webp({ quality: Math.round(quality * 100) })
      .toBuffer();
    const saved = await bucket.upload(target, encoded, { contentType: "image/webp" });
    if (saved.error) throw saved.error;

    if (original) {
      const whole = await photo
        .clone()
        .resize({ width: ORIGINAL_MAX_DIMENSION, height: ORIGINAL_MAX_DIMENSION, fit: "inside", withoutEnlargement: true })
        .webp({ quality: Math.round(ORIGINAL_QUALITY * 100) })
        .toBuffer();
      // Best effort, as in the browser: without it a re-crop uses the cropped photo.
      const kept = await bucket.upload(original, whole, { contentType: "image/webp" });
      if (kept.error) console.error("encodeWebp: original not kept:", kept.error.message);
    }
    return true;
  } catch (err) {
    console.error("encodeWebp:", (err as Error).message);
    return false;
  } finally {
    await bucket.remove([source]);
  }
}
