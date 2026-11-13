"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, ExternalLink, ListTree, Loader2, Monitor, Smartphone, Tablet, X } from "lucide-react";
import { button, iconButton, tab, tabs } from "@/components/ui";
import {
  EDITOR_SOURCE,
  PROTOCOL_VERSION,
  parsePreviewMessage,
  type DraftOf,
  type EditorMessage,
  type FrameRect,
  type PreviewMessage,
  type PreviewPage,
} from "@/lib/live-editor";
import type { PreviewToken } from "@/lib/preview-token";

/* What a live editor is built from, as in the Bow + Arc CMS: the preview
   frame and its messaging, the device sizes, where a field's card floats,
   and the card itself. (The unsaved-changes guard is lib/navigation-guard.ts.) */

// The website's exact origin, e.g. https://volley.co.za or http://localhost:3000.
export const SITE_ORIGIN = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "").origin;
  } catch {
    return "";
  }
})();

export const DEVICES = {
  desktop: { label: "Desktop", width: null, Icon: Monitor },
  // Wide enough for the site's md: layout, below lg: (1024px).
  tablet: { label: "Tablet", width: 820, Icon: Tablet },
  phone: { label: "Phone", width: 390, Icon: Smartphone },
} as const;
export type Device = keyof typeof DEVICES;

export type Box = { left: number; top: number; width: number; height: number };

const TOP_BAR = 56;
const GAP = 8;

export type CardPosition = { left: number; top: number; width: number; maxHeight: number };

/* Where a field's card floats (fixed, in window pixels): on the clicked
   part's top-right corner, or just under a small one (a link, the banner).
   Always kept inside the window. Null on a phone, where the card is a
   bottom sheet instead. */
export function cardPosition(anchor: FrameRect | null, frame: Box | null): CardPosition | null {
  // On the server (a card open from the start, by ?open=): placed once in the browser.
  if (typeof window === "undefined") return null;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (vw < 768) return null;
  const minTop = TOP_BAR + GAP;
  // Clear of the sidebar's rail of icons, floating on the left.
  const minLeft = 88;
  const width = Math.min(380, vw - 2 * GAP);
  const maxLeft = vw - width - 2 * GAP;

  let left = maxLeft;
  let top = minTop;
  if (anchor && frame) {
    const region = {
      left: frame.left + anchor.x,
      top: frame.top + anchor.y,
      right: frame.left + anchor.x + anchor.width,
      bottom: frame.top + anchor.y + anchor.height,
    };
    if (anchor.height < 160) {
      left = region.left;
      top = region.bottom + GAP;
    } else {
      left = region.right - width - 12;
      top = region.top + 12;
    }
  }
  left = Math.min(Math.max(left, minLeft), maxLeft);
  top = Math.min(Math.max(top, minTop), vh - 280);
  return { left, top, width, maxHeight: vh - top - 2 * GAP };
}

/* The preview frame of `page`: its address, from the token the editor's
   page minted on the server, and the talk with it over postMessage, only
   with SITE_ORIGIN and only with this iframe's window. Sends `draft`
   whenever it changes or the frame (re)loads, and `highlight` for the open
   card. Every other message the frame sends goes to `onMessage`. */
export function usePreviewFrame<P extends PreviewPage>({
  page,
  preview,
  draft,
  highlight,
  highlightIndex = null,
  highlightPhoto = null,
  query = "",
  onMessage,
}: {
  page: P;
  // More of the preview's address, e.g. "&slug=roper".
  query?: string;
  preview: PreviewToken;
  draft: DraftOf<P>;
  highlight: Extract<PreviewMessage<P>, { type: "rect" }>["field"] | null;
  // Which one, for a part that repeats.
  highlightIndex?: number | null;
  // The photo picked in a gallery's card (the slideshow, the gallery).
  highlightPhoto?: number | null;
  /** Never called with "ready", which this hook handles. */
  onMessage: (message: Exclude<PreviewMessage<P>, { type: "ready" }>) => void;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  // The first token, kept: a save re-renders the page and mints a new one,
  // which would change the address and reload the frame. The frame only
  // checks it as it loads.
  const [token] = useState(preview);
  const previewError = !SITE_ORIGIN
    ? "NEXT_PUBLIC_SITE_URL isn't set."
    : "error" in token
      ? token.error
      : null;
  const previewUrl =
    SITE_ORIGIN && "token" in token
      ? `${SITE_ORIGIN}/preview/${page}?token=${encodeURIComponent(token.token)}${query}`
      : null;
  const [previewReady, setPreviewReady] = useState(false);
  const draftRef = useRef(draft);
  const onMessageRef = useRef(onMessage);

  useEffect(() => {
    draftRef.current = draft;
    onMessageRef.current = onMessage;
  });

  const post = useCallback((message: EditorMessage<P>) => {
    iframeRef.current?.contentWindow?.postMessage(
      { source: EDITOR_SOURCE, v: PROTOCOL_VERSION, ...message },
      SITE_ORIGIN,
    );
  }, []);

  useEffect(() => {
    const listener = (event: MessageEvent) => {
      if (
        !SITE_ORIGIN ||
        event.origin !== SITE_ORIGIN ||
        event.source !== iframeRef.current?.contentWindow
      )
        return;
      const message = parsePreviewMessage(event.data, page);
      if (!message) return;
      if (message.type === "ready") {
        setPreviewReady(true);
        // The frame may have (re)loaded after the draft was last sent.
        post({ type: "draft", draft: draftRef.current });
      } else {
        onMessageRef.current(message);
      }
    };
    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, [page, post]);

  useEffect(() => {
    if (previewReady) post({ type: "draft", draft });
  }, [draft, previewReady, post]);

  useEffect(() => {
    if (previewReady) post({ type: "highlight", field: highlight, index: highlightIndex, photo: highlightPhoto });
  }, [highlight, highlightIndex, highlightPhoto, previewReady, post]);

  return { iframeRef, previewUrl, previewError };
}

export function DeviceSwitch({
  device,
  onChange,
}: {
  device: Device;
  onChange: (device: Device) => void;
}) {
  return (
    <div role="radiogroup" aria-label="Preview size" className={`${tabs} hidden w-fit! sm:flex`}>
      {(Object.keys(DEVICES) as Device[]).map((key) => {
        const { label, Icon } = DEVICES[key];
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={device === key}
            title={label}
            onClick={() => onChange(key)}
            className={`${tab(device === key)} flex items-center gap-1.5 px-2.5!`}
          >
            <Icon className="size-3.5" aria-hidden="true" />
            <span className="hidden lg:inline">{label}</span>
          </button>
        );
      })}
    </div>
  );
}

// The canvas holding the preview frame at the chosen device width.
export function PreviewCanvas({
  iframeRef,
  previewUrl,
  previewError,
  device,
  title,
  onBackgroundClick,
}: {
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  previewUrl: string | null;
  previewError: string | null;
  device: Device;
  title: string;
  onBackgroundClick: () => void;
}) {
  const frameWidth = DEVICES[device].width;
  return (
    <div
      // A click on the canvas around the page closes a card.
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onBackgroundClick();
      }}
      className="flex min-h-0 flex-1 justify-center overflow-auto"
    >
      {previewError ? (
        <p className="max-w-md self-center px-6 text-center text-sm text-brick">
          The preview isn&apos;t available: {previewError}
        </p>
      ) : !previewUrl ? (
        <Loader2 className="size-5 animate-spin self-center text-ink/40" />
      ) : (
        <iframe
          ref={iframeRef}
          src={previewUrl}
          title={title}
          // Scripts and its own origin (cookies, next/image) only: no
          // popups, top-level navigation or form submission.
          sandbox="allow-scripts allow-same-origin"
          referrerPolicy="no-referrer"
          style={{ width: frameWidth ? `${frameWidth}px` : "100%" }}
          className={`h-full shrink-0 bg-white transition-[width] duration-300 ${
            // A ring, not a border: a border would narrow the page's
            // viewport and shift the site's breakpoints.
            frameWidth ? "shadow-xl ring-1 ring-ink/10" : ""
          }`}
        />
      )}
    </div>
  );
}

/* Where a clicked part's fields open. Two kinds, one rule:

   - a small thing (a line of wording's link, a date, the banner, a file)
     floats in a card on the part itself, at `position`;
   - anything bigger (photos, a list, everything at once in the form view)
     opens as a `panel`: the right-hand side of the window, under the top
     bar, leaving the page beside it showing its changes as they're made.
     `size` sets how wide: "md" for a list, "lg" for photos, "xl" for a
     whole table.

   Neither dims the page or traps it: a click on the page opens that part
   instead, and one beside it closes the card. On a phone both are a sheet
   from the bottom. `onBack` puts a back arrow before the title, for a panel
   showing one entry of a list (one "What's included" list, one FAQ). */
export function FieldCard({
  title,
  hint,
  onClose,
  onBack,
  position,
  panel = false,
  size = "md",
  children,
}: {
  title: string;
  hint?: string;
  onClose: () => void;
  onBack?: { label: string; onClick: () => void };
  /** Where to float (fixed, window pixels); null on a phone. */
  position: CardPosition | null;
  panel?: boolean;
  size?: "md" | "lg" | "xl";
  children: ReactNode;
}) {
  const body = (
    <>
      <div className="flex h-12 shrink-0 items-center gap-1 border-b border-ink/8 pr-2 pl-5">
        {onBack && (
          <button
            type="button"
            onClick={onBack.onClick}
            className={`${iconButton} -ml-3`}
            aria-label={onBack.label}
            title={onBack.label}
          >
            <ArrowLeft className="size-4" />
          </button>
        )}
        <h2 className="min-w-0 flex-1 truncate text-[15px] font-medium text-ink">{title}</h2>
        <button type="button" onClick={onClose} className={iconButton} aria-label="Close">
          <X className="size-4" />
        </button>
      </div>
      <div className="flex-1 space-y-5 overflow-y-auto p-5">
        {hint && <p className="text-xs leading-relaxed text-ink/50">{hint}</p>}
        {children}
      </div>
    </>
  );

  if (panel)
    return (
      <div
        role="dialog"
        aria-label={title}
        className={`fixed inset-x-0 top-14 bottom-0 z-10 flex animate-drawer-in flex-col bg-white shadow-2xl max-md:top-auto max-md:max-h-[85vh] max-md:rounded-t-2xl md:left-auto md:w-full md:border-l md:border-ink/10 ${
          { md: "md:max-w-md", lg: "md:max-w-2xl", xl: "md:max-w-5xl" }[size]
        }`}
      >
        {body}
      </div>
    );

  return (
    <div
      role="dialog"
      aria-label={title}
      style={position ?? undefined}
      className={`fixed z-10 flex animate-pop-in flex-col border border-ink/10 bg-white shadow-2xl ${
        // A phone gets a bottom sheet; larger screens float it on the part.
        position ? "rounded-2xl" : "inset-x-0 bottom-0 max-h-[70vh] rounded-t-2xl"
      }`}
    >
      {body}
    </div>
  );
}

const HINT = "Type on any wording to change it. Click a photo, a list or a button for its options.";

/* Every live editor's top bar, the same in each: back to where it came
   from (named, so it's clear where it goes), the page's name, any status
   (an article's Draft or Published), unsaved changes; then the preview
   size, the page on the website, the form view, any other action, and
   Save last, on the right. The hint about how to edit stays put. */
export function EditorHeader({
  back,
  title,
  status,
  dirty,
  device,
  onDevice,
  viewUrl,
  formOpen,
  onForm,
  formTitle,
  actions,
  save,
}: {
  back: { label: string; onClick: () => void };
  title: string;
  status?: ReactNode;
  dirty: boolean;
  device: Device;
  onDevice: (device: Device) => void;
  // The page on the website, when it's there to see.
  viewUrl?: string | null;
  formOpen: boolean;
  onForm: () => void;
  formTitle: string;
  actions?: ReactNode;
  save: ReactNode;
}) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-ink/8 bg-white px-3 sm:px-4">
      <button
        type="button"
        onClick={back.onClick}
        className={`${button.ghost} shrink-0 px-2!`}
        aria-label={`Back to ${back.label}`}
        title={`Back to ${back.label}`}
      >
        <ArrowLeft className="size-4" /> <span className="hidden lg:inline">{back.label}</span>
      </button>
      <span aria-hidden="true" className="hidden h-5 border-l border-ink/10 lg:block" />
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <h1 className="truncate font-publish text-xl text-ink">{title}</h1>
        {status}
        {dirty && (
          <span className="inline-flex shrink-0 items-center gap-1.5 text-xs text-brick" title="Unsaved changes">
            <span className="size-1.5 rounded-full bg-brick" />
            <span className="hidden sm:inline">Unsaved changes</span>
          </span>
        )}
        <span className="hidden min-w-0 truncate text-xs text-ink/45 xl:inline">{HINT}</span>
      </div>

      <DeviceSwitch device={device} onChange={onDevice} />
      {viewUrl && (
        <a
          href={viewUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="Open the page on the website, in a new tab"
          aria-label="View on the website"
          className={`${button.ghost} px-2!`}
        >
          <ExternalLink className="size-4" /> <span className="hidden lg:inline">View live</span>
        </a>
      )}
      <button
        type="button"
        onClick={onForm}
        aria-pressed={formOpen}
        title={formTitle}
        className={`${button.secondary} py-2! ${formOpen ? "border-ink/50!" : ""}`}
      >
        <ListTree className="size-4" /> <span className="hidden md:inline">Form view</span>
      </button>
      {actions}
      {save}
    </header>
  );
}
