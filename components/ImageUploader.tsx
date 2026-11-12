"use client";

/* eslint-disable @next/next/no-img-element -- previews of the website's own
   files and of uploads, at any URL */

/* The image upload field, copied from the Bow + Arc CMS and kept as close
   to it as Volley allows: drag and drop or click, iPhone HEIC photos
   converted, a warning when a photo is too small for its slot, then a crop
   (slots shown at one shape, `aspect`) or a focal point (slots shown at
   several, `focalPreviews`), and the photo compressed to WebP before it's
   stored. Once uploaded it can be cropped again, given a focal point,
   downloaded or replaced.

   Volley's differences: files go to the `media` bucket, under `folder`; a
   value may also be one of the website's own files (a path like
   /images/x.webp), shown and fetched from the website; and the original
   kept beside a cropped photo is shrunk (lib/imageCompression.ts
   compressOriginal) rather than stored as it came. */

import { useState, useRef } from "react";
import {
  UploadCloud,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Crop,
  Crosshair,
  Download,
  Trash2,
} from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import {
  BUCKET,
  convertHeicToJpeg,
  CropFailedError,
  isHeicFile,
  isSvgFile,
  readablePhoto,
  sizeWarning as checkSize,
  storage,
  storeImage,
} from "@/lib/uploadImage";
import { siteAsset } from "@/lib/site";
import ImageCropModal from "@/components/ImageCropModal";
import ImageFocalModal from "@/components/ImageFocalModal";
import {
  croppedFileName,
  focusFileName,
  getStoragePathFromUrl,
  originalFileName,
  parseCroppedPath,
  parseFocusPath,
  type CropRect,
  type FocalPoint,
} from "@/lib/storage-utils";
import {
  IMAGE_PRESETS,
  MAX_UPLOAD_DIMENSION,
  minimumWidth,
  sharpWidth,
  type FocalPreview,
  type ImagePreset,
} from "@/lib/imageConstants";

// Re-exported so anything importing these from this module keeps working —
// lib/imageConstants is the canonical definition, shared with the Node side.
export { IMAGE_PRESETS };
export type { ImagePreset };

interface ImageUploaderProps {
  value: string | null;
  onChange: (url: string | null) => void;
  onNewUpload?: (url: string) => void;
  label?: string;
  className?: string;
  // Pick a named preset, or override/supply recommendedWidth (and optionally
  // slotLabel) directly for a one-off slot that doesn't match a preset.
  preset?: ImagePreset;
  recommendedWidth?: number | null;
  slotLabel?: string;
  // Every raster upload passes through one of two steps, chosen per slot to
  // match how the site shows it:
  // - `aspect`: the fixed shape (width / height) the site shows this slot at;
  //   the editor crops to exactly that frame.
  // - `focalPreviews`: for slots the site shows at several shapes (heroes,
  //   cards, carousels) a fixed crop would be wrong somewhere, so the editor
  //   sets a focal point instead, previewed at each of these shapes.
  // With neither (logos, email images) the image keeps its own shape and the
  // crop step only zooms. Either way, once uploaded, every image but a logo
  // or an SVG can be cropped and given a focal point from its toolbar: a
  // focal slot's crop only zooms (its shape stays its own), and a cropped
  // slot's focal point steers the screens that show part of the crop
  // (`cropPreviews`).
  aspect?: number;
  // Optional with `aspect`: other shapes the site shows the crop at, previewed
  // live in the crop step (at most three).
  cropPreviews?: readonly FocalPreview[];
  focalPreviews?: readonly FocalPreview[];
  // The folder in the bucket new uploads go into, e.g. "buildings".
  folder?: string;
}

// Icon-only button for the preview toolbar, with a tooltip naming it on hover
// or keyboard focus. The tooltip is right-aligned to its button so the
// rightmost one isn't clipped by the card's edge.
function ToolbarButton({
  label,
  onClick,
  disabled,
  danger = false,
  children,
}: {
  label: string;
  onClick: (e: React.MouseEvent) => void;
  disabled: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <span className="relative inline-flex group/tip">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        className={`p-2.5 sm:p-2 rounded-sm text-ink/55 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
          danger
            ? "hover:text-brick hover:bg-pink/20"
            : "hover:text-ink hover:bg-bone/60"
        }`}
      >
        {children}
      </button>
      <span
        role="tooltip"
        className="absolute bottom-full right-0 mb-1.5 whitespace-nowrap rounded bg-ink px-2 py-1 text-xs font-medium text-white shadow-sm pointer-events-none opacity-0 transition-opacity group-hover/tip:opacity-100 group-focus-within/tip:opacity-100"
      >
        {label}
      </span>
    </span>
  );
}

export default function ImageUploader({
  value,
  onChange,
  onNewUpload,
  label = "Upload Image",
  className = "",
  preset,
  recommendedWidth: recommendedWidthProp,
  slotLabel: slotLabelProp,
  aspect,
  cropPreviews,
  focalPreviews,
  folder,
}: ImageUploaderProps) {
  const prefix = folder ? `${folder.replace(/\/+$/, "")}/` : "";
  const toast = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [sizeWarning, setSizeWarning] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  // The image waiting in the crop / focal point step. `existingPath` is set
  // when re-adjusting an image that's already uploaded. `thenFocus` follows a
  // crop with the focal point step (a new crop clears the old point), from
  // `initialFocus`.
  const [pending, setPending] = useState<{
    file: File;
    step: "crop" | "focus";
    initialCrop?: CropRect;
    initialFocus?: FocalPoint;
    existingPath?: string;
    thenFocus?: boolean;
  } | null>(null);
  const isFocalSlot = !!focalPreviews?.length;
  // The shapes the focal point step previews: the slot's own, or for a
  // cropped slot the shapes the site shows its crop at.
  const focusPreviews: readonly FocalPreview[] | null = focalPreviews?.length
    ? focalPreviews
    : cropPreviews?.length
      ? cropPreviews
      : aspect
        ? [{ label: "On the site", aspect }]
        : null;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const presetConfig = preset ? IMAGE_PRESETS[preset] : null;
  const recommendedWidth =
    recommendedWidthProp !== undefined
      ? recommendedWidthProp
      : (presetConfig?.recommendedWidth ?? null);
  const slotLabel = slotLabelProp ?? presetConfig?.slotLabel ?? null;
  // Hero-ness is read off the same resolved recommendedWidth the size warning
  // uses, so one-off slots passing recommendedWidth directly get the same
  // treatment as the named hero preset. Only slots recommending at least the
  // general cap qualify — the smaller presets already sit well under it.
  const isHeroSlot =
    recommendedWidth !== null && recommendedWidth >= MAX_UPLOAD_DIMENSION;

  // --- DRAG AND DROP HANDLERS ---
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    if (isUploading) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files[0]);
    }
  };

  // --- CLICK UPLOAD HANDLERS ---
  const handleClick = () => {
    if (isUploading) return;
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isUploading) return;
    if (e.target.files && e.target.files.length > 0) {
      handleUpload(e.target.files[0]);
    }
  };

  // --- UPLOAD LOGIC ---
  const handleUpload = async (picked: File) => {
    const heic = isHeicFile(picked);

    // 1. Basic validation — HEIC files sometimes report an empty or generic
    //    file.type, so they're allowed past this check and handled below.
    if (!heic && !picked.type.includes("image/")) {
      toast.error("Invalid file type", "Please upload an image file.");
      return;
    }
    // What it really holds (a photo saved as text is decoded), or nothing
    // a browser can open.
    const file = await readablePhoto(picked);
    if (!file) {
      toast.error("Can't open this photo", "It may be damaged. Export it again as a JPG or PNG.");
      return;
    }

    setSizeWarning(null);
    setUploadError(null);
    setIsUploading(true);

    let uploadFile = file;

    if (heic) {
      setIsConverting(true);
      try {
        uploadFile = await convertHeicToJpeg(file);
      } catch (error) {
        console.error("HEIC conversion failed", error);
        setUploadError(
          "Could not process this image, please try a JPG or PNG.",
        );
        toast.error(
          "Conversion failed",
          "Could not process this image, please try a JPG or PNG.",
        );
        setIsConverting(false);
        setIsUploading(false);
        return;
      }
      setIsConverting(false);
    }

    // 2. SVGs are vector — nothing to crop and no resolution to check.
    if (isSvgFile(uploadFile)) {
      await saveImage(uploadFile, null);
      return;
    }

    // 3. Everything else goes through the crop or focal point step; saving
    //    resumes in handleCropConfirm / handleFocusConfirm (or stops in
    //    handlePendingCancel).
    setIsUploading(false);
    setPending({ file: uploadFile, step: isFocalSlot ? "focus" : "crop" });
  };

  // Re-opens the crop or focal point step on the current image. Cropped
  // uploads keep their uncropped original beside them, so a re-crop can zoom
  // back out past the old crop; older uploads (and any whose original is
  // missing) re-crop the image as it stands. A re-crop of an image that had a
  // focal point (or of a focal slot) goes on to set it again.
  const handleReadjust = async (step: "crop" | "focus") => {
    if (!value || isUploading) return;
    setSizeWarning(null);
    setUploadError(null);
    setIsUploading(true);

    const path = getStoragePathFromUrl(value, BUCKET);
    const parsed = path ? parseCroppedPath(path) : null;

    const fetchAsFile = async (url: string) => {
      const response = await fetch(siteAsset(url));
      if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
      const blob = await response.blob();
      return new File([blob], url.split("/").pop() ?? "image", {
        type: blob.type,
      });
    };

    const focus = (path && parseFocusPath(path)) || undefined;
    const thenFocus = isFocalSlot || !!focus;

    try {
      if (step === "focus") {
        setPending({
          file: await fetchAsFile(value),
          step,
          initialFocus: focus,
          existingPath: path ?? undefined,
        });
        return;
      }
      if (parsed) {
        try {
          const originalUrl = storage()
            .getPublicUrl(parsed.originalPath).data.publicUrl;
          const file = await fetchAsFile(originalUrl);
          setPending({
            file,
            step,
            initialCrop: parsed.crop,
            initialFocus: focus,
            thenFocus,
          });
          return;
        } catch (error) {
          console.error("Original missing, re-cropping current image", error);
        }
      }
      setPending({
        file: await fetchAsFile(value),
        step,
        initialFocus: focus,
        thenFocus,
      });
    } catch (error) {
      console.error("Could not load image for re-cropping", error);
      toast.error("Could not load image", "Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleCropConfirm = async (crop: CropRect | null) => {
    if (!pending) return;
    const saved = await saveImage(pending.file, crop);
    if (saved && pending.thenFocus && focusPreviews) {
      setPending({
        file: saved.file,
        step: "focus",
        initialFocus: pending.initialFocus,
        existingPath: saved.path,
      });
    } else {
      setPending(null);
    }
  };

  const handleFocusConfirm = async (focus: FocalPoint) => {
    if (!pending) return;
    if (pending.existingPath) {
      await saveExistingWithFocus(pending.existingPath, pending.file, focus);
    } else {
      await saveImage(pending.file, null, focus);
    }
    setPending(null);
  };

  const handlePendingCancel = () => {
    setPending(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // A new focal point on an already-uploaded image only changes its name, so
  // the stored bytes are copied (server-side, falling back to re-uploading
  // the fetched file) rather than re-encoded. The old object stays put: the
  // saved page still points at it until the form is saved. A cropped image
  // keeps its crop in the new name, and gets its own copy of the original
  // (every image has its own; see storage-utils).
  const saveExistingWithFocus = async (
    existingPath: string,
    file: File,
    focus: FocalPoint,
  ) => {
    setIsUploading(true);
    try {
      const base = `${prefix}${Date.now()}-${Math.random().toString(36).substring(2)}`;
      const ext = existingPath.split(".").pop() ?? "img";
      const cropped = parseCroppedPath(existingPath);
      const newPath = cropped
        ? croppedFileName(base, cropped.crop, ext, focus)
        : focusFileName(base, focus, ext);
      const bucket = storage();
      if (cropped) {
        // Best-effort, as on upload: without it a re-crop falls back to
        // the cropped image.
        const { error: originalError } = await bucket.copy(
          cropped.originalPath,
          originalFileName(base),
        );
        if (originalError) {
          console.error("Could not copy original for re-cropping", originalError);
        }
      }
      const { error: copyError } = await bucket.copy(existingPath, newPath);
      if (copyError) {
        const { error: uploadError } = await bucket.upload(newPath, file, {
          contentType: file.type,
        });
        if (uploadError) throw uploadError;
      }
      const { data } = bucket.getPublicUrl(newPath);
      onChange(data.publicUrl);
      onNewUpload?.(data.publicUrl);
    } catch (error) {
      console.error("Saving focal point failed", error);
      setUploadError("Could not save the focal point — please try again.");
      toast.error(
        "Save failed",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setIsUploading(false);
    }
  };

  // `crop` null means the whole image, uploaded exactly as before cropping
  // existed: no stored original, plain filename. `focus` is only passed for
  // a new upload's focal point step, which doesn't crop. Returns what was
  // uploaded (its storage path and file), or null if it failed.
  const saveImage = async (
    file: File,
    crop: CropRect | null,
    focus?: FocalPoint,
  ): Promise<{ path: string; file: File } | null> => {
    setIsUploading(true);
    // A warning on what will actually be shown; never blocks the upload.
    const warning = await checkSize(file, crop, preset, recommendedWidth, slotLabel);
    if (warning) setSizeWarning(warning);
    try {
      const stored = await storeImage({ file, crop, focus, preset, folder, isHero: isHeroSlot });
      // The real, permanent URL, back up to the parent form.
      onChange(stored.url);
      onNewUpload?.(stored.url);
      return { path: stored.path, file: stored.file };
    } catch (error) {
      if (error instanceof CropFailedError) {
        console.error("Image crop failed", error);
        setUploadError("Could not crop this image — please try again.");
        toast.error("Crop failed", "Please try again, or use a different image.");
        return null;
      }
      console.error("Upload failed", error);
      setUploadError("Upload failed — please try again.");
      toast.error(
        "Upload failed",
        error instanceof Error
          ? error.message
          : "Please try again. If it keeps failing, the photo storage may need checking.",
      );
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  // SVGs are vector: nothing to crop, and canvas would rasterise them.
  const canRecrop = !!value && !/\.svg($|\?)/i.test(value);
  // Logos are shown whole (object-contain), so a focal point would do nothing.
  const canFocus = canRecrop && preset !== "logo" && !!focusPreviews;
  const previewPath = value ? getStoragePathFromUrl(value, BUCKET) : null;
  const previewFocus = previewPath ? parseFocusPath(previewPath) : null;

  // Saves the best copy available: for images cropped in the crop step, the
  // uncropped original kept beside them (full resolution, never compressed);
  // otherwise the image exactly as stored. A plain <a download> is ignored
  // for cross-origin URLs like Supabase's — the browser just opens the image
  // — so the file is fetched and saved from a same-origin blob URL instead.
  const [isDownloading, setIsDownloading] = useState(false);
  const handleDownload = async () => {
    if (!value || isDownloading) return;
    setIsDownloading(true);

    const fetchBlob = async (url: string) => {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
      return response.blob();
    };

    try {
      const path = getStoragePathFromUrl(value, BUCKET);
      const cropped = path ? parseCroppedPath(path) : null;
      let blob: Blob | null = null;
      let name = decodeURIComponent(
        new URL(siteAsset(value)).pathname.split("/").pop() || "image",
      );

      if (cropped) {
        try {
          blob = await fetchBlob(
            storage().getPublicUrl(cropped.originalPath)
              .data.publicUrl,
          );
          // Originals are stored without an extension; add one from
          // the file's type so it opens in image editors.
          const ext = blob.type.split("/")[1]?.replace("jpeg", "jpg");
          name = `${cropped.originalPath}${ext ? `.${ext}` : ""}`;
        } catch (error) {
          console.error("Original missing, downloading cropped image", error);
        }
      }
      blob ??= await fetchBlob(siteAsset(value));

      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = name;
      link.click();
      // Revoking synchronously can cancel the download in Safari/Firefox.
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch (error) {
      console.error("Image download failed", error);
      toast.error("Download failed", "Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    if (isUploading) return;
    e.stopPropagation();
    onChange(null);
    setSizeWarning(null);
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className={`w-full ${className}`}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="image/*,.heic,.heif"
        disabled={isUploading}
        className="hidden"
      />

      {pending &&
        (pending.step === "focus" && focusPreviews ? (
          <ImageFocalModal
            file={pending.file}
            previews={focusPreviews}
            initialFocus={pending.initialFocus}
            recommendedWidth={recommendedWidth}
            isSaving={isUploading}
            onConfirm={handleFocusConfirm}
            onCancel={handlePendingCancel}
          />
        ) : (
          <ImageCropModal
            file={pending.file}
            initialCrop={pending.initialCrop}
            aspect={aspect}
            previews={cropPreviews ?? focalPreviews}
            recommendedWidth={recommendedWidth}
            isLogo={preset === "logo"}
            isSaving={isUploading}
            onConfirm={handleCropConfirm}
            onCancel={handlePendingCancel}
          />
        ))}

      {value ? (
        // --- STATE: IMAGE UPLOADED (PREVIEW) ---
        // One card: the image, untouched by controls so it can be judged
        // as-is, with an icon toolbar beneath it. Same on desktop and touch.
        <div className="w-full rounded-sm overflow-hidden border border-ink/12 bg-white">
          <div className="relative w-full bg-bone/60 aspect-video flex items-center justify-center">
            <img
              src={siteAsset(value)}
              alt="Preview"
              // Logos are shown whole, as the site does; cropping them to
              // the preview's 16:9 box would hide edge artifacts.
              className={`absolute inset-0 ${preset === "logo" ? "object-contain p-4" : "object-cover"} w-full h-full`}
              style={previewFocus ? { objectPosition: `${previewFocus.x}% ${previewFocus.y}%` } : undefined}
            />

            {/* Uploading Overlay — shown while replacing an existing image */}
            {isUploading && (
              <div className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center">
                <Loader2 size={28} className="animate-spin mb-2 text-ink" />
                <p className="text-sm font-medium text-ink">
                  {isConverting ? "Converting image…" : "Uploading…"}
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-1 px-1.5 py-1 border-t border-ink/12">
            <ToolbarButton
              label="Replace image"
              onClick={handleClick}
              disabled={isUploading}
            >
              <RefreshCw size={16} />
            </ToolbarButton>
            {canRecrop && (
              <ToolbarButton
                label="Crop image"
                onClick={() => handleReadjust("crop")}
                disabled={isUploading}
              >
                <Crop size={16} />
              </ToolbarButton>
            )}
            {canFocus && (
              <ToolbarButton
                label="Set focal point"
                onClick={() => handleReadjust("focus")}
                disabled={isUploading}
              >
                <Crosshair size={16} />
              </ToolbarButton>
            )}
            <ToolbarButton
              label="Download image"
              onClick={handleDownload}
              disabled={isUploading || isDownloading}
            >
              {isDownloading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Download size={16} />
              )}
            </ToolbarButton>
            <ToolbarButton
              label="Remove image"
              onClick={handleRemove}
              disabled={isUploading}
              danger
            >
              <Trash2 size={16} />
            </ToolbarButton>
          </div>
        </div>
      ) : (
        // --- STATE: EMPTY (DRAG/DROP ZONE) ---
        <div
          onClick={handleClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative w-full flex flex-col items-center justify-center border-2 border-dashed rounded-sm p-6 sm:p-8 text-center transition-colors cursor-pointer min-h-50
                        ${isDragging ? "border-ink bg-bone/30" : "border-ink/25 bg-white hover:bg-bone/30 hover:border-ink/40"}
                        ${isUploading ? "pointer-events-none" : ""}
                    `}
        >
          {isUploading ? (
            <div className="flex flex-col items-center text-ink/55">
              <Loader2
                size={32}
                className="animate-spin mb-4 text-ink"
              />
              <p className="text-sm font-medium text-ink">
                {isConverting ? "Converting image…" : "Uploading…"}
              </p>
              <p className="text-xs mt-1">
                {isConverting ? "Just a moment" : "Please wait"}
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center text-ink/55">
              <UploadCloud
                size={32}
                className={`mb-4 ${isDragging ? "text-ink" : "text-ink/40"}`}
              />
              <p className="text-sm font-medium text-ink">{label}</p>
              <p className="text-xs mt-1">
                <span className="sm:hidden">Tap to browse</span>
                <span className="hidden sm:inline">
                  Drag and drop or click to browse
                </span>
              </p>
              {/* Always-visible size guidance, shown before any file is picked */}
              {recommendedWidth ? (
                <p className="text-xs mt-3 text-ink/40 max-w-70">
                  Sharpest at {sharpWidth(recommendedWidth)}px wide or more.
                  Below {minimumWidth(recommendedWidth)}px will look blurry.
                </p>
              ) : preset === "logo" ? (
                <p className="text-xs mt-3 text-ink/40 max-w-70">
                  SVG preferred — it stays crisp at any size.
                </p>
              ) : null}
            </div>
          )}
        </div>
      )}

      {/* Non-blocking warning if the selected file is smaller than recommended */}
      {sizeWarning && (
        <div className="flex items-start gap-1.5 mt-2 text-xs text-ink/75">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>{sizeWarning}</span>
        </div>
      )}

      {/* Upload error — component stays usable, editor can just retry */}
      {uploadError && (
        <div className="flex items-start gap-1.5 mt-2 text-xs text-brick">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}
    </div>
  );
}
