"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useObjectUrl } from "@/lib/useObjectUrl";
import Cropper, { type Area } from "react-easy-crop";
import { CheckCircle2, AlertTriangle, XCircle, X, Loader2 } from "lucide-react";
import {
  minimumWidth,
  rateResolution,
  requiredLogoWidth,
  sharpWidth,
  type FocalPreview,
} from "@/lib/imageConstants";
import type { CropRect } from "@/lib/storage-utils";

interface ImageCropModalProps {
  file: File;
  // The frame shape (width / height) the site shows this slot at. Omitted for
  // slots shown at the image's own shape (logos, email images), where the
  // frame follows the image and only zooming trims it.
  aspect?: number;
  // Other shapes the site shows this crop at (phones, cards), previewed live
  // as the centred slice of the crop each keeps. At most three are shown.
  previews?: readonly FocalPreview[];
  // Width the slot needs for a sharp result; drives the quality meter.
  recommendedWidth: number | null;
  isLogo: boolean;
  // Re-cropping: the rectangle the image was last cropped to.
  initialCrop?: CropRect;
  isSaving: boolean;
  // `null` means the editor kept the whole image untouched.
  onConfirm: (crop: CropRect | null) => void;
  onCancel: () => void;
}

type Quality = { level: "good" | "ok" | "poor"; text: string };

function rateQuality(
  area: Area,
  recommendedWidth: number | null,
  isLogo: boolean,
): Quality | null {
  const needed = isLogo
    ? requiredLogoWidth(area.width, area.height)
    : recommendedWidth;
  if (!needed) return null;

  const size = `${Math.round(area.width)} × ${Math.round(area.height)}px`;
  switch (rateResolution(area.width, needed, isLogo)) {
    case "good":
      return { level: "good", text: `Sharp on all screens (${size})` };
    case "ok":
      return {
        level: "ok",
        text: `Looks good; may be slightly soft on large high-resolution screens (${size}, ${sharpWidth(needed, isLogo)}px+ is sharpest)`,
      };
    case "poor":
      return {
        level: "poor",
        text: isLogo
          ? `Will look blurry (${size}). Upload an SVG version of the logo (best), or a PNG at least ${needed}px wide.`
          : `Will look blurry (${size}). Zoom out, or use a larger photo, at least ${minimumWidth(needed)}px wide.`,
      };
  }
}

const QUALITY_STYLES = {
  good: { className: "text-green bg-lemon/40", Icon: CheckCircle2 },
  ok: { className: "text-ink/75 bg-yellow/30", Icon: AlertTriangle },
  poor: { className: "text-brick bg-pink/20", Icon: XCircle },
} as const;

/** Draws `area` of `img` at `width` px wide and returns it as a data URL. */
function renderPreview(
  img: HTMLImageElement,
  area: Area,
  width: number,
): string | null {
  if (!area.width) return null;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = Math.round((width * area.height) / area.width);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(
    img,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    canvas.width,
    canvas.height,
  );
  return canvas.toDataURL("image/jpeg", 0.8);
}

/**
 * Renders the current crop area of the image at `width` px into a data URL,
 * at most once per frame, for the live previews. Width 0 disables it.
 */
function useLivePreview(imageUrl: string, width: number) {
  const [src, setSrc] = useState<string | null>(null);
  // Set only once the image is fully decoded: drawing a still-loading image
  // paints nothing, and the transparent canvas encodes as a black JPEG.
  const imageRef = useRef<HTMLImageElement | null>(null);
  const pendingRef = useRef<Area | null>(null);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!width || !imageUrl) return;
    let cancelled = false;
    const img = new window.Image();
    img.src = imageUrl;
    img
      .decode()
      .then(() => {
        if (cancelled) return;
        imageRef.current = img;
        // The cropper reports its first area before this copy of the
        // image is ready, so draw that now instead of waiting for the
        // editor to move the crop.
        if (pendingRef.current) {
          setSrc(renderPreview(img, pendingRef.current, width));
        }
      })
      .catch((error) => console.error("Preview image failed to load", error));
    return () => {
      cancelled = true;
      imageRef.current = null;
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [imageUrl, width]);

  return {
    src,
    update: (area: Area) => {
      if (!width) return;
      pendingRef.current = area;
      if (frameRef.current !== null) return;
      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = null;
        const img = imageRef.current;
        if (img && pendingRef.current) {
          setSrc(renderPreview(img, pendingRef.current, width));
        }
      });
    },
  };
}

export default function ImageCropModal({
  file,
  aspect: lockedAspect,
  previews,
  recommendedWidth,
  isLogo,
  initialCrop,
  isSaving,
  onConfirm,
  onCancel,
}: ImageCropModalProps) {
  const imageUrl = useObjectUrl(file);

  const [naturalSize, setNaturalSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  // Without a slot shape, a re-crop keeps its previous shape; a fresh crop
  // follows the image's own.
  const ownAspect = initialCrop
    ? initialCrop.width / initialCrop.height
    : naturalSize
      ? naturalSize.width / naturalSize.height
      : undefined;
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const previewUrl = useLivePreview(imageUrl, previews?.length ? 480 : 0);
  const shownPreviews = previews?.slice(0, 3) ?? [];

  const aspect = lockedAspect ?? ownAspect;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSaving) onCancel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isSaving, onCancel]);

  const quality = area ? rateQuality(area, recommendedWidth, isLogo) : null;

  const handleConfirm = () => {
    if (!area || !naturalSize) return;
    const rect: CropRect = {
      x: Math.max(0, Math.round(area.x)),
      y: Math.max(0, Math.round(area.y)),
      width: Math.min(naturalSize.width, Math.round(area.width)),
      height: Math.min(naturalSize.height, Math.round(area.height)),
    };
    // Within a pixel of the whole image counts as uncropped, so the file is
    // uploaded exactly as it would have been without this step.
    const isWholeImage =
      rect.x <= 1 &&
      rect.y <= 1 &&
      Math.abs(rect.width - naturalSize.width) <= 1 &&
      Math.abs(rect.height - naturalSize.height) <= 1;
    onConfirm(isWholeImage ? null : rect);
  };

  const QualityIcon = quality ? QUALITY_STYLES[quality.level].Icon : null;

  return createPortal(
    // min-h-full + items-center (rather than centring the scroll container
    // itself) keeps a taller-than-screen card scrollable from its top, so
    // the close button can't be pushed out of reach.
    <div className="fixed inset-0 z-120 overflow-y-auto">
      <div className="fixed inset-0 bg-ink/60 animate-in fade-in duration-300" />

      <div className="relative min-h-full flex items-center justify-center p-4">
        <div
          className={`relative bg-white w-full ${shownPreviews.length ? "max-w-5xl" : "max-w-3xl"} shadow-2xl animate-in zoom-in-95 duration-200 rounded-xl overflow-hidden`}
        >
          <div className="flex items-start justify-between gap-4 px-4 sm:px-6 pt-4 sm:pt-6 pb-4">
            <div>
              <h3 className="text-lg font-medium text-ink">
                {isLogo ? "Adjust logo" : "Crop & position image"}
              </h3>
              <p className="text-sm text-ink/55 mt-1">
                Drag to reposition and use the slider to zoom. The highlighted
                area is what will appear on the website.
                {shownPreviews.length > 0 &&
                  " The previews show how it will look on each screen."}
              </p>
            </div>
            <button
              type="button"
              onClick={onCancel}
              disabled={isSaving}
              className="text-ink/40 cursor-pointer hover:text-ink disabled:opacity-50 transition-colors p-1"
              title="Cancel"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex flex-col lg:flex-row">
            <div
              className={`relative w-full lg:flex-1 h-[45vh] sm:h-[55vh] min-h-72 ${
                // Checkerboard so transparent logo edges are visible.
                isLogo
                  ? "bg-[repeating-conic-gradient(#e5e5e5_0_25%,#fff_0_50%)] bg-size-[20px_20px]"
                  : "bg-ink"
              }`}
            >
              {imageUrl && (
                <Cropper
                  image={imageUrl}
                  crop={crop}
                  zoom={zoom}
                  aspect={aspect ?? 1}
                  minZoom={1}
                  maxZoom={5}
                  objectFit="contain"
                  showGrid={!isLogo}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={(_, pixels) => setArea(pixels)}
                  onCropAreaChange={(_, pixels) => previewUrl.update(pixels)}
                  onMediaLoaded={(media) =>
                    setNaturalSize({
                      width: media.naturalWidth,
                      height: media.naturalHeight,
                    })
                  }
                  initialCroppedAreaPixels={initialCrop}
                />
              )}
            </div>

            {shownPreviews.length > 0 && (
              <div className="lg:w-60 shrink-0 flex flex-wrap lg:flex-col gap-4 px-4 sm:px-6 lg:px-5 py-4 lg:border-l border-bone/60 bg-bone/30">
                {shownPreviews.map((preview) => (
                  <div key={preview.label}>
                    <p className="text-xs text-ink/55 mb-1">{preview.label}</p>
                    {/* Fixed height, width from the shape, so tall and wide
                        previews line up without one dominating. */}
                    <div
                      className="relative h-20 lg:h-28 max-w-full overflow-hidden rounded-md bg-ink/12"
                      style={{ aspectRatio: preview.aspect }}
                    >
                      {previewUrl.src && (
                        // eslint-disable-next-line @next/next/no-img-element -- local data URL
                        <img
                          src={previewUrl.src}
                          alt=""
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="px-4 sm:px-6 py-4 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <label className="flex items-center gap-3 flex-1 text-sm text-ink/65">
                Zoom
                <input
                  type="range"
                  min={1}
                  max={5}
                  step={0.01}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  disabled={isSaving}
                  className="flex-1 accent-ink cursor-pointer"
                />
              </label>

            </div>

            {quality && QualityIcon && (
              <div
                className={`flex items-start gap-2 text-sm rounded-lg px-3 py-2 ${QUALITY_STYLES[quality.level].className}`}
              >
                <QualityIcon size={16} className="mt-0.5 shrink-0" />
                <span>{quality.text}</span>
              </div>
            )}
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 px-4 sm:px-6 py-4 bg-bone/30 border-t border-bone/60">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSaving}
              className="w-full sm:w-auto px-4 py-2.5 sm:py-2 text-sm font-medium text-ink/65 hover:text-ink disabled:opacity-50 transition-colors cursor-pointer rounded-lg border border-ink/12 sm:border-transparent bg-white sm:bg-transparent"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isSaving || !area}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 text-sm font-medium text-white transition-colors rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ink disabled:opacity-50 cursor-pointer bg-ink hover:bg-black"
            >
              {isSaving && <Loader2 size={16} className="animate-spin" />}
              {isSaving ? "Saving…" : "Use this crop"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
