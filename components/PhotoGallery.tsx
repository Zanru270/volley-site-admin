"use client";

/* eslint-disable @next/next/no-img-element -- uploaded photos, at any URL */
import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ImagePlus,
  Loader2,
  Trash2,
} from "lucide-react";
import { button, iconButton } from "@/components/ui";
import Sortable, { move } from "@/components/Sortable";
import ImageUploader from "@/components/ImageUploader";
import { useToast } from "@/components/ToastProvider";
import { FOCAL_PREVIEWS, rateResolution, type ImagePreset } from "@/lib/imageConstants";
import { convertHeicToJpeg, isHeicFile, readablePhoto, sizeWarning, slotOf, storeImage } from "@/lib/uploadImage";
import { deleteUploads } from "@/lib/media-actions";
import { siteAsset } from "@/lib/site";
import type { Photo } from "@/lib/types";

// How many photos of a batch upload at once.
const AT_ONCE = 6;

const plural = (n: number) => `${n} ${n === 1 ? "photo" : "photos"}`;

/* A gallery of photos (a building's slideshow and "Take a look around", an
   article's photo row), as small square thumbnails in their order, so the
   whole gallery shows at once.

   - A thumbnail is dragged by itself to a new place, or moved with the ←
     → that show on it (always, on a touch screen); its bin removes it, with
     Undo on the toast.
   - A click opens that photo on its own, in place of the grid, with a way
     back: the big preview with its crop and focal point tools, Replace and
     Download, and Move to first / last. `onFocusPhoto`
     hears which photo is open (null when none), so the page beside it can
     turn its carousel to that photo.
   - "Add photos" (or photos dropped on the grid) shows each photo at once,
     from the file itself, and uploads them a few at a time behind it. Each
     joins the gallery (and the page beside it) as soon as it and those
     before it are up, so they stay in the order chosen. They're added
     whole and centred: opening one crops it or sets what
     stays in view. Leaving the gallery mid-batch stops it: what's still
     uploading is deleted when it lands, and the toast says how many.
   - A thumbnail is marked when its photo is too small for where it's
     shown. */
export default function PhotoGallery({
  photos,
  onChange,
  preset,
  focal,
  aspect,
  folder,
  onNewUpload,
  firstLabel,
  onFocusPhoto,
}: {
  photos: Photo[];
  onChange: (photos: Photo[]) => void;
  preset: ImagePreset;
  // Shown at several shapes: a focal point. Shown at one, `aspect`: a crop.
  focal?: keyof typeof FOCAL_PREVIEWS;
  aspect?: number;
  folder: string;
  onNewUpload?: (url: string) => void;
  // A tag on the first photo, e.g. "Shows first".
  firstLabel?: string;
  onFocusPhoto?: (index: number | null) => void;
}) {
  const toast = useToast();
  const slot = slotOf(preset);
  const [open, setOpen] = useState<number | null>(null);
  // The batch uploading now, in the order chosen, each with a preview of
  // its file.
  const [uploading, setUploading] = useState<{ id: string; name: string; preview: string; done: boolean }[]>([]);
  // False once the gallery is left: a batch still going stops.
  const mounted = useRef(true);
  const [dropping, setDropping] = useState(false);
  // Photos found too small for where they're shown, by address.
  const [small, setSmall] = useState<Record<string, boolean>>({});
  const fileInput = useRef<HTMLInputElement>(null);

  /* The latest list and handlers, for what finishes later (an upload, an
     Undo) after other edits. */
  const latest = useRef({ photos, onChange, onNewUpload, onFocusPhoto });
  useEffect(() => {
    latest.current = { photos, onChange, onNewUpload, onFocusPhoto };
  });
  const change = (next: Photo[]) => {
    latest.current.photos = next;
    latest.current.onChange(next);
  };

  // Leaving the gallery lets go of the photo the page was showing.
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      latest.current.onFocusPhoto?.(null);
    };
  }, []);

  const shown = open !== null && open < photos.length ? open : null;
  const show = (index: number | null) => {
    setOpen(index);
    onFocusPhoto?.(index);
  };

  const set = (i: number, patch: Partial<Photo>) => change(photos.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  const moveTo = (from: number, to: number) => {
    change(move(photos, from, to));
    if (shown === from) show(to);
  };
  const remove = (i: number) => {
    const removed = photos[i];
    change(photos.filter((_, j) => j !== i));
    show(null);
    toast.success("Removed", undefined, {
      label: "Undo",
      onClick: () => {
        const now = latest.current.photos;
        const at = Math.min(i, now.length);
        change([...now.slice(0, at), removed, ...now.slice(at)]);
      },
    });
  };

  /* Uploads a batch, a few at a time, adding each to the end as soon as
     it and every photo chosen before it are done (one that failed is
     skipped), so they land in the order chosen. Anything that isn't a
     photo is left out. */
  const addFiles = async (files: File[]) => {
    const picked = files.filter((f) => isHeicFile(f) || f.type.startsWith("image/"));
    if (picked.length < files.length)
      toast.error(
        `${files.length - picked.length} ${files.length - picked.length === 1 ? "file wasn't" : "files weren't"} added`,
        "Only photos can go in a gallery.",
      );
    // What each really holds (one saved as text is decoded); left out if
    // a browser can't open it.
    const readable = await Promise.all(picked.map(readablePhoto));
    const images = readable.filter((f): f is File => f !== null);
    const unreadable = picked.filter((_, i) => !readable[i]).map((f) => f.name);
    if (unreadable.length)
      toast.error(
        `${unreadable.length === 1 ? `${unreadable[0]} wasn't` : `${plural(unreadable.length)} weren't`} added`,
        "It can't be opened as a photo: it may be damaged. Export it again as a JPG or PNG.",
      );
    if (!images.length) return;

    // A HEIC file shows as a plain tile until it's converted: browsers
    // other than Safari can't draw one.
    const batch = images.map((f) => ({
      id: crypto.randomUUID(),
      name: f.name,
      preview: isHeicFile(f) ? "" : URL.createObjectURL(f),
      done: false,
    }));
    setUploading((u) => [...u, ...batch]);
    // Per photo: undefined while uploading, null if it failed.
    const results: (Photo | null | undefined)[] = images.map(() => undefined);
    let added = 0;
    let flushed = 0;
    let stopped = 0;
    const blurry: string[] = [];

    const finish = (k: number) => {
      if (batch[k].preview) URL.revokeObjectURL(batch[k].preview);
    };
    // Adds the run of finished photos at the front of what's left.
    const flush = () => {
      const ready: Photo[] = [];
      const ids = new Set<string>();
      while (flushed < images.length && results[flushed] !== undefined) {
        const photo = results[flushed];
        if (photo) ready.push(photo);
        ids.add(batch[flushed].id);
        finish(flushed);
        flushed++;
      }
      if (!ids.size) return;
      setUploading((u) => u.filter((x) => !ids.has(x.id)));
      if (ready.length) {
        added += ready.length;
        change([...latest.current.photos, ...ready]);
      }
    };

    let next = 0;
    const worker = async () => {
      while (next < images.length && mounted.current) {
        const k = next++;
        try {
          const file = isHeicFile(images[k]) ? await convertHeicToJpeg(images[k]) : images[k];
          if (await sizeWarning(file, null, preset, slot.recommendedWidth, slot.slotLabel)) blurry.push(images[k].name);
          const stored = await storeImage({ file, crop: null, preset, folder, isHero: slot.isHero });
          // Left mid-upload: nothing will save it.
          if (!mounted.current) {
            void deleteUploads([stored.url]);
            continue;
          }
          latest.current.onNewUpload?.(stored.url);
          results[k] = { src: stored.url, alt: "" };
        } catch (err) {
          results[k] = null;
          if (mounted.current)
            toast.error(`${images[k].name} wasn't added`, err instanceof Error ? err.message : "Please try again.");
        }
        if (mounted.current) {
          setUploading((u) => u.map((x) => (x.id === batch[k].id ? { ...x, done: true } : x)));
          flush();
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(AT_ONCE, images.length) }, worker));

    if (!mounted.current) {
      // Done but waiting on an earlier photo, or never started: gone too.
      const waiting = results.slice(flushed).filter((p): p is Photo => !!p).map((p) => p.src);
      if (waiting.length) void deleteUploads(waiting);
      batch.slice(flushed).forEach((_, i) => finish(flushed + i));
      stopped = images.length - flushed;
      if (stopped)
        toast.error(
          `${plural(stopped)} ${stopped === 1 ? "wasn't" : "weren't"} added`,
          "The gallery was closed before they'd finished uploading. Add them again.",
        );
      return;
    }
    if (!added) return;
    toast.success(
      `${plural(added)} added`,
      blurry.length
        ? `${plural(blurry.length)} may look blurry on the website (marked with a !). Open one to check.`
        : "Open one to crop it or set what stays in view.",
    );
  };

  // One photo, in place of the grid.
  if (shown !== null) {
    const photo = photos[shown];
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => show(null)} className={`${button.ghost} -ml-1`}>
            <ArrowLeft className="size-4" /> All photos
          </button>
          <span className="ml-auto text-xs text-ink/50 tabular-nums">
            Photo {shown + 1} of {photos.length}
          </span>
          <button
            type="button"
            onClick={() => show(shown - 1)}
            disabled={shown === 0}
            className={iconButton}
            aria-label="The photo before"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => show(shown + 1)}
            disabled={shown === photos.length - 1}
            className={iconButton}
            aria-label="The photo after"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
        <ImageUploader
          key={shown}
          value={photo.src || null}
          onChange={(src) => set(shown, { src: src ?? "" })}
          onNewUpload={onNewUpload}
          preset={preset}
          focalPreviews={focal ? FOCAL_PREVIEWS[focal] : undefined}
          aspect={aspect}
          folder={folder}
        />
        <div className="flex flex-wrap items-center gap-2 border-t border-ink/8 pt-5">
          <button type="button" onClick={() => moveTo(shown, 0)} disabled={shown === 0} className={`${button.secondary} py-2!`}>
            <ChevronsLeft className="size-4" /> Move to first
          </button>
          <button
            type="button"
            onClick={() => moveTo(shown, photos.length - 1)}
            disabled={shown === photos.length - 1}
            className={`${button.secondary} py-2!`}
          >
            Move to last <ChevronsRight className="size-4" />
          </button>
          <button type="button" onClick={() => remove(shown)} className={`${button.ghost} ml-auto text-brick! hover:text-red!`}>
            <Trash2 className="size-4" /> Remove photo
          </button>
        </div>
      </div>
    );
  }

  const tile = "relative aspect-square overflow-hidden rounded-lg";
  const overTile =
    "inline-flex cursor-pointer items-center justify-center rounded-md bg-white/90 p-1 text-ink/70 shadow-soft transition-colors hover:bg-white hover:text-ink disabled:cursor-default disabled:opacity-30";

  return (
    <div className="space-y-3">
      <p className="text-xs text-ink/50">
        {photos.length ? `${plural(photos.length)}, in order. ` : "No photos yet. "}
        Drag one to move it, or click one to crop it or set what stays in view.
      </p>
      <div
        onDragOver={(e) => {
          if (!e.dataTransfer.types.includes("Files")) return;
          e.preventDefault();
          setDropping(true);
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDropping(false);
        }}
        onDrop={(e) => {
          if (!e.dataTransfer.files.length) return;
          e.preventDefault();
          setDropping(false);
          void addFiles(Array.from(e.dataTransfer.files));
        }}
        className={`grid grid-cols-3 gap-2 rounded-xl p-1 transition-colors sm:grid-cols-4 md:grid-cols-5 ${
          dropping ? "bg-lemon/30 outline-2 outline-dashed outline-ink/30" : ""
        }`}
      >
        <Sortable items={photos} onChange={change} className="contents" itemClassName="group relative">
          {(photo, sort) => {
            const i = sort.index;
            const tooSmall = small[photo.src];
            return (
              <>
                <div
                  role="button"
                  tabIndex={0}
                  {...sort.drag}
                  onClick={() => show(i)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      show(i);
                    }
                  }}
                  aria-label={`Photo ${i + 1}${photo.alt ? `: ${photo.alt}` : ""}. Open it`}
                  title="Click to open it, drag to move it"
                  className={`${tile} cursor-pointer bg-bone/60 outline-none hover:ring-2 hover:ring-ink/25 focus-visible:ring-2 focus-visible:ring-ink/50`}
                >
                  {photo.src ? (
                    <img
                      src={siteAsset(photo.src)}
                      alt=""
                      draggable={false}
                      onLoad={(e) => {
                        const width = e.currentTarget.naturalWidth;
                        const poor = Boolean(slot.recommendedWidth) && rateResolution(width, slot.recommendedWidth!) === "poor";
                        if (poor !== Boolean(small[photo.src])) setSmall((s) => ({ ...s, [photo.src]: poor }));
                      }}
                      className="size-full object-cover"
                    />
                  ) : (
                    <span className="flex size-full items-center justify-center text-xs text-ink/40">Empty</span>
                  )}
                  <span className="absolute top-1 left-1 rounded-md bg-ink/75 px-1.5 text-[11px] leading-5 font-medium text-bone tabular-nums">
                    {i + 1}
                  </span>
                  {i === 0 && firstLabel && (
                    <span className="absolute bottom-1 left-1 rounded-md bg-lemon px-1.5 text-[10px] leading-5 font-medium text-ink">
                      {firstLabel}
                    </span>
                  )}
                  {tooSmall && (
                    <span
                      title="Too small: may look blurry"
                      className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-full bg-yellow text-ink shadow-soft"
                    >
                      <AlertTriangle className="size-3" aria-hidden="true" />
                      <span className="sr-only">Too small</span>
                    </span>
                  )}
                </div>
                {/* Moving and removing: on hover from md, always on touch. */}
                <div className="absolute right-1 bottom-1 flex gap-1 transition-opacity md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => moveTo(i, i - 1)}
                    disabled={i === 0}
                    className={overTile}
                    aria-label={`Move photo ${i + 1} earlier`}
                  >
                    <ChevronLeft className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveTo(i, i + 1)}
                    disabled={i === photos.length - 1}
                    className={overTile}
                    aria-label={`Move photo ${i + 1} later`}
                  >
                    <ChevronRight className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    className={`${overTile} hover:text-brick!`}
                    aria-label={`Remove photo ${i + 1}`}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </>
            );
          }}
        </Sortable>

        {/* Still uploading: the photo itself, dimmed, with a spinner (a
            tick once it's up and waiting on an earlier one). */}
        {uploading.map((u) => (
          <div
            key={u.id}
            title={`${u.name}: uploading`}
            className={`${tile} flex flex-col items-center justify-center gap-1.5 border border-dashed border-ink/20 bg-bone/40 px-2 text-center`}
          >
            {u.preview && <img src={u.preview} alt="" className="absolute inset-0 size-full object-cover opacity-60" />}
            <span className="relative flex size-7 items-center justify-center rounded-full bg-white/90 shadow-soft">
              {u.done ? <Check className="size-4 text-green" /> : <Loader2 className="size-4 animate-spin text-ink/60" />}
            </span>
            {!u.preview && <span className="w-full truncate text-[10px] text-ink/50">{u.name}</span>}
          </div>
        ))}

        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          className={`${tile} flex cursor-pointer flex-col items-center justify-center gap-1.5 border border-dashed border-ink/25 bg-white px-2 text-center text-xs text-ink/60 transition-colors hover:border-ink/50 hover:text-ink`}
        >
          <ImagePlus className="size-5" />
          Add photos
          <span className="hidden text-[10px] text-ink/40 sm:block">or drop them here</span>
        </button>
        <input
          ref={fileInput}
          type="file"
          multiple
          accept="image/*,.heic,.heif"
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            e.target.value = "";
            void addFiles(files);
          }}
        />
      </div>
    </div>
  );
}
