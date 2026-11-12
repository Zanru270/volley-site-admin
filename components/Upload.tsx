"use client";

import { useRef, useState } from "react";
import { FileText, Loader2, Upload as UploadIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { button, inputClass } from "@/components/ui";
import { siteAsset } from "@/lib/site";

const BUCKET = "media";

/* Plain uploads for what isn't a photo (PDFs, videos): photos have
   components/ImageUploader.tsx. Any photo that does come through here is
   still shrunk to at most this many pixels on the long side and saved as
   WebP. */
const MAX_SIDE = 2560;
const QUALITY = 0.85;

async function compress(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || /svg|gif/.test(file.type)) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", QUALITY),
    );
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, ".webp"), {
      type: "image/webp",
    });
  } catch {
    return file; // e.g. HEIC the browser can't read: upload as is
  }
}

/* Uploads a file to Storage and returns its public URL. Every upload gets
   a new name, never overwriting, so the site can cache files forever. */
export async function uploadFile(file: File, folder: string): Promise<string> {
  const ready = await compress(file);
  const ext = ready.name.split(".").pop()?.toLowerCase() || "bin";
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const supabase = createClient();
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, ready, { contentType: ready.type, cacheControl: "31536000" });
  if (error) throw error;
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

export function UploadButton({
  accept,
  folder,
  onUploaded,
  label = "Upload",
}: {
  accept: string;
  folder: string;
  onUploaded: (url: string) => void;
  label?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <span className="inline-flex flex-col">
      <button
        type="button"
        disabled={busy}
        onClick={() => input.current?.click()}
        className={button.secondary}
      >
        {busy ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <UploadIcon className="size-4" />
        )}
        {busy ? "Uploading…" : label}
      </button>
      <input
        ref={input}
        type="file"
        accept={accept}
        hidden
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          setBusy(true);
          setError("");
          try {
            onUploaded(await uploadFile(file, folder));
          } catch (err) {
            setError((err as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      />
      {error && <span className="mt-1 text-xs text-brick">{error}</span>}
    </span>
  );
}

// A PDF link with an upload button, e.g. a pricelist.
export function PdfField({
  value,
  onChange,
  folder,
}: {
  value: string;
  onChange: (url: string) => void;
  folder: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="/downloads/… or upload"
          className={inputClass}
        />
        {value && (
          <a
            href={siteAsset(value)}
            target="_blank"
            rel="noopener noreferrer"
            className={button.ghost}
          >
            <FileText className="size-4" /> Open
          </a>
        )}
      </div>
      <UploadButton
        accept="application/pdf"
        folder={folder}
        onUploaded={onChange}
        label="Upload PDF"
      />
    </div>
  );
}

/* A video, e.g. the home page's hero: the current one playing (muted, as
   on the site) over its URL, with an upload button. Videos go up as they
   are, so they want to be small before they get here. */
export function VideoField({
  value,
  onChange,
  folder,
}: {
  value: string;
  onChange: (url: string) => void;
  folder: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex aspect-video w-full max-w-xl items-center justify-center overflow-hidden rounded-xl border border-ink/10 bg-ink">
        {value ? (
          <video
            key={value}
            src={siteAsset(value)}
            muted
            loop
            autoPlay
            playsInline
            controls
            className="size-full object-cover"
          />
        ) : (
          <span className="text-xs text-bone/60">No video</span>
        )}
      </div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="/videos/… or upload"
        className={inputClass}
      />
      <UploadButton
        accept="video/mp4,video/webm"
        folder={folder}
        onUploaded={onChange}
        label="Upload a new video"
      />
    </div>
  );
}
