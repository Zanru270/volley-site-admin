"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useObjectUrl } from "@/lib/useObjectUrl";
import { CheckCircle2, AlertTriangle, XCircle, X, Loader2 } from "lucide-react";
import type { FocalPoint } from "@/lib/storage-utils";
import {
  minimumWidth,
  rateResolution,
  sharpWidth,
  type FocalPreview,
} from "@/lib/imageConstants";

interface ImageFocalModalProps {
  file: File;
  // The shapes the site shows this slot at, previewed live as the point moves
  // (at most three are shown).
  previews: readonly FocalPreview[];
  // Width the slot needs for a sharp result; drives the quality meter.
  recommendedWidth: number | null;
  initialFocus?: FocalPoint;
  isSaving: boolean;
  onConfirm: (focus: FocalPoint) => void;
  onCancel: () => void;
}

type Quality = { level: "good" | "ok" | "poor"; text: string };

function rateQuality(
  width: number,
  height: number,
  recommendedWidth: number | null,
): Quality | null {
  if (!recommendedWidth) return null;
  const size = `${width} × ${height}px`;
  switch (rateResolution(width, recommendedWidth)) {
    case "good":
      return { level: "good", text: `Sharp on all screens (${size})` };
    case "ok":
      return {
        level: "ok",
        text: `Looks good; may be slightly soft on large high-resolution screens (${size}, ${sharpWidth(recommendedWidth)}px+ is sharpest)`,
      };
    case "poor":
      return {
        level: "poor",
        text: `Will look blurry (${size}). Use a larger photo, at least ${minimumWidth(recommendedWidth)}px wide.`,
      };
  }
}

const QUALITY_STYLES = {
  good: { className: "text-green bg-lemon/40", Icon: CheckCircle2 },
  ok: { className: "text-ink/75 bg-yellow/30", Icon: AlertTriangle },
  poor: { className: "text-brick bg-pink/20", Icon: XCircle },
} as const;

const clampPercent = (value: number) =>
  Math.min(100, Math.max(0, Math.round(value)));

export default function ImageFocalModal({
  file,
  previews,
  recommendedWidth,
  initialFocus,
  isSaving,
  onConfirm,
  onCancel,
}: ImageFocalModalProps) {
  const imageUrl = useObjectUrl(file);

  const [focus, setFocus] = useState<FocalPoint>(
    initialFocus ?? { x: 50, y: 50 },
  );
  const [naturalSize, setNaturalSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSaving) onCancel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isSaving, onCancel]);

  const moveFocusTo = (clientX: number, clientY: number) => {
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect || !rect.width || !rect.height) return;
    setFocus({
      x: clampPercent(((clientX - rect.left) / rect.width) * 100),
      y: clampPercent(((clientY - rect.top) / rect.height) * 100),
    });
  };

  const quality = naturalSize
    ? rateQuality(naturalSize.width, naturalSize.height, recommendedWidth)
    : null;
  const QualityIcon = quality ? QUALITY_STYLES[quality.level].Icon : null;
  const objectPosition = `${focus.x}% ${focus.y}%`;

  return createPortal(
    // min-h-full + items-center (rather than centring the scroll container
    // itself) keeps a taller-than-screen card scrollable from its top, so
    // the close button can't be pushed out of reach.
    <div className="fixed inset-0 z-120 overflow-y-auto">
      <div className="fixed inset-0 bg-ink/60 animate-in fade-in duration-300" />

      <div className="relative min-h-full flex items-center justify-center p-4">
        <div className="relative bg-white w-full max-w-4xl shadow-2xl animate-in zoom-in-95 duration-200 rounded-xl overflow-hidden mx-auto">
          <div className="flex items-start justify-between gap-4 px-4 sm:px-6 pt-4 sm:pt-6 pb-4">
            <div>
              <h3 className="text-lg font-medium text-ink">
                Set focal point
              </h3>
              <p className="text-sm text-ink/55 mt-1">
                This image is shown at different shapes on the website, so it
                can&apos;t use one fixed crop. Click or drag on the most important
                part of the photo; it will stay in view at every size.
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

          <div className="px-4 sm:px-6 flex flex-col lg:flex-row gap-6">
            {/* Point picker: the frame wraps the image exactly, so
                percentages of the frame are percentages of the image. */}
            <div className="lg:flex-1 flex items-center justify-center bg-ink rounded-lg p-3">
              <div
                ref={frameRef}
                className="relative inline-block touch-none cursor-crosshair select-none"
                onPointerDown={(e) => {
                  if (isSaving) return;
                  isDraggingRef.current = true;
                  e.currentTarget.setPointerCapture(e.pointerId);
                  moveFocusTo(e.clientX, e.clientY);
                }}
                onPointerMove={(e) => {
                  if (isDraggingRef.current) moveFocusTo(e.clientX, e.clientY);
                }}
                onPointerUp={() => {
                  isDraggingRef.current = false;
                }}
                onPointerCancel={() => {
                  isDraggingRef.current = false;
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- local blob URL */}
                <img
                  src={imageUrl || undefined}
                  alt="Image to position"
                  draggable={false}
                  onLoad={(e) =>
                    setNaturalSize({
                      width: e.currentTarget.naturalWidth,
                      height: e.currentTarget.naturalHeight,
                    })
                  }
                  className="block max-h-[50vh] max-w-full w-auto h-auto"
                />
                <div
                  className="absolute w-7 h-7 -ml-3.5 -mt-3.5 rounded-full border-2 border-white shadow-[0_0_0_2px_rgba(0,0,0,0.5)] bg-white/30 pointer-events-none"
                  style={{ left: `${focus.x}%`, top: `${focus.y}%` }}
                />
              </div>
            </div>

            {/* Live previews at the shapes the site actually uses */}
            <div className="lg:w-60 shrink-0 flex flex-wrap lg:flex-col gap-4 content-start">
              {previews.slice(0, 3).map((preview) => (
                <div key={preview.label}>
                  <p className="text-xs text-ink/55 mb-1">{preview.label}</p>
                  <div
                    // Fixed height, width from the shape, so tall and wide
                    // previews line up without one dominating.
                    className="relative h-20 lg:h-28 max-w-full overflow-hidden rounded-md bg-bone/60"
                    style={{ aspectRatio: preview.aspect }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- local blob URL */}
                    <img
                      src={imageUrl || undefined}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover"
                      style={{ objectPosition }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="px-4 sm:px-6 py-4">
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
              onClick={() => onConfirm(focus)}
              disabled={isSaving || !naturalSize}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 text-sm font-medium text-white transition-colors rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ink disabled:opacity-50 cursor-pointer bg-ink hover:bg-black"
            >
              {isSaving && <Loader2 size={16} className="animate-spin" />}
              {isSaving ? "Saving…" : "Use this focal point"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
