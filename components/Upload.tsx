"use client";

/* eslint-disable @next/next/no-img-element -- previews of arbitrary URLs */
import { useRef, useState } from "react";
import { FileText, Loader2, Upload as UploadIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { button, inputClass } from "@/components/ui";
import { siteAsset } from "@/lib/site";

const BUCKET = "media";

/* Photos are shrunk to at most this many pixels on the long side and saved
   as WebP before upload: phone photos are 4–12 MB, and nothing on the site
   shows a photo wider than this. */
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

/* An image, as the Bow + Arc CMS's ImageUploader: a drop zone (drag a
   photo onto it, or click to pick one) showing the current photo, and its
   URL underneath, editable for site paths like /images/x.webp. */
export function ImageField({
  value,
  onChange,
  folder,
}: {
  value: string;
  onChange: (url: string) => void;
  folder: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const upload = async (file: File | undefined) => {
    if (!file || busy) return;
    setBusy(true);
    setError("");
    try {
      onChange(await uploadFile(file, folder));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <div
        role="button"
        tabIndex={0}
        onClick={() => input.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          upload(e.dataTransfer.files?.[0]);
        }}
        className={`group relative flex h-44 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed transition-colors ${
          dragging ? "border-ink bg-bone/60" : "border-ink/25 bg-bone/30 hover:border-ink/60"
        }`}
      >
        {value && (
          <img src={siteAsset(value)} alt="" className="absolute inset-0 size-full object-cover" />
        )}
        <span
          className={`relative flex flex-col items-center gap-2 px-4 text-center text-xs font-medium transition-opacity ${
            value
              ? "rounded-lg bg-white/90 py-2 text-ink opacity-0 shadow-soft group-hover:opacity-100 group-focus-visible:opacity-100"
              : "text-ink/50"
          } ${busy ? "opacity-100!" : ""}`}
        >
          {busy ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <UploadIcon className="size-5" />
          )}
          {busy ? "Uploading…" : value ? "Replace photo" : "Drop a photo, or click to upload"}
        </span>
        <input
          ref={input}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            upload(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="/images/… or upload above"
        className={inputClass}
      />
      {error && <p className="text-xs text-brick">{error}</p>}
    </div>
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
