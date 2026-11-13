"use client";

/* eslint-disable @next/next/no-img-element -- the website's own photos */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { startNavigationProgress } from "@/lib/navigation-progress";
import {
  BedSingle,
  Building2,
  Edit2,
  IdCard,
  Plus,
  X,
} from "lucide-react";
import { Badge, button, CountPill, Field, iconButton, inputClass, PageHeader, SearchBox } from "@/components/ui";
import EditModal from "@/components/EditModal";
import { useToast } from "@/components/ToastProvider";
import { RowControls, useAction } from "@/components/forms";
import ListViewSwitch from "@/components/ListViewSwitch";
import Sortable from "@/components/Sortable";
import { useListView } from "@/hooks/useListView";
import { buildingName, LOCATION_CARDS, LOCATION_STATUSES, effectiveVisibility, siteAsset, statusKind, VISIBILITIES } from "@/lib/site";
import { cardPhoto } from "@/lib/photos";
import type { Location } from "@/lib/types";
import { createBuilding, saveBuildingCard, saveBuildingOrder } from "./actions";
import CardFields, { cardDetailsOf, withCardDetails, type CardDetails } from "./CardFields";
import { deleteUploads } from "@/lib/media-actions";

type Building = Location & { updated_at?: string };

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Africa/Johannesburg",
  }).format(new Date(iso));

// The kind of status, for the filter ("Opening 2028" is "Opening").
const statusOf = (b: Location) => statusKind(b.status);
const nameOf = (b: Location) => buildingName(b);

// Its status, and whether it's on the website when it isn't simply live
// (as it comes out: on Automatic, what the status makes it).
const StatusBadge = ({ building }: { building: Location }) => (
  <>
    <Badge tone={statusOf(building) === "Open" ? "lemon" : "yellow"}>{building.status ?? LOCATION_STATUSES[0]}</Badge>
    {effectiveVisibility(building.status, building.visibility) !== "live" && (
      <Badge tone={effectiveVisibility(building.status, building.visibility) === "card" ? "yellow" : "stone"}>
        {VISIBILITIES.find((v) => v.value === effectiveVisibility(building.status, building.visibility))?.label}
      </Badge>
    )}
  </>
);

// A filter chip with its count, as on the Bow + Arc CMS's Projects page.
const chipClass = (active: boolean) =>
  `inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20 ${
    active
      ? "border-ink bg-ink text-bone"
      : "border-ink/12 bg-white text-ink/60 hover:border-ink/30 hover:text-ink"
  }`;

/* The buildings (the website's residences), laid out like the Bow + Arc
   CMS's Projects page: a toolbar (search, a count, grid or list), status
   chips, then a card or a row each, opening in its live editor.

   Their order is the website's: the Locations carousel on the home page,
   and "Similar locations" under each building. Drag a card by its grip, or
   use its arrows: the new order saves straight away, as list pages' changes
   do, with Undo on its toast. Only in the whole list, not a search or a
   filter. "New building" adds one from blank, as a draft, and opens its
   editor (createBuilding); the website draws its page from what's filled
   in there. There's no delete. `sortable` is false while the database has
   no order column yet. Opening a building goes to its live editor
   (/buildings/[slug]). */
export default function BuildingList({
  buildings: initial,
  sortable,
}: {
  buildings: Building[];
  sortable: boolean;
}) {
  const [buildings, setBuildings] = useState(initial);
  // The server's copy wins once it arrives after a save (router.refresh).
  const [prevInitial, setPrevInitial] = useState(initial);
  if (initial !== prevInitial) {
    setPrevInitial(initial);
    setBuildings(initial);
  }

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [view, setView] = useListView("admin-buildings-view");
  const { pending, run } = useAction();

  // A building opens in its live editor, as a Bow + Arc project does.
  const router = useRouter();
  const open = (b: Location) => {
    startNavigationProgress(`/buildings/${b.slug}`);
    router.push(`/buildings/${b.slug}`);
  };

  /* A building's card, edited in a panel here, as on the home page:
     Save saves only the card (saveBuildingCard). Its visibility saves as
     it's picked. Photos uploaded and then not saved are cleared away when
     the panel closes. */
  const [carding, setCarding] = useState<Building | null>(null);
  const [card, setCard] = useState<CardDetails | null>(null);
  const [cardSaving, startCardSave] = useTransition();
  const [cardUploads, setCardUploads] = useState<string[]>([]);
  const openCard = (b: Building) => {
    setCarding(b);
    setCard(cardDetailsOf(b));
    setCardUploads([]);
  };
  const closeCard = (saved?: CardDetails) => {
    const kept = saved?.photo;
    const abandoned = cardUploads.filter((url) => url !== kept);
    if (abandoned.length) void deleteUploads(abandoned);
    setCarding(null);
    setCard(null);
    setCardUploads([]);
  };
  const setBuilding = (slug: string, update: (b: Building) => Building) =>
    setBuildings((list) => list.map((b) => (b.slug === slug ? update(b) : b)));
  const saveCard = () =>
    startCardSave(async () => {
      if (!carding || !card) return;
      const result = await saveBuildingCard(carding.slug, card);
      toast.result(result, "Card saved");
      if (!result.ok) return;
      setBuilding(carding.slug, (b) => withCardDetails(b, card));
      closeCard(card);
      router.refresh();
    });

  // "New building": its name and city, then into its editor.
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ name: "", city: "" });
  const [creating, startCreating] = useTransition();
  const closeAdding = () => {
    setAdding(false);
    setDraft({ name: "", city: "" });
  };
  const create = () =>
    startCreating(async () => {
      const result = await createBuilding(draft);
      if (!result.ok || !result.slug) return toast.result(result);
      toast.success(`Volley ${draft.name.trim().replace(/^volley\s+/i, "")} added`, "It's a draft, hidden on the website until you change that.");
      startNavigationProgress(`/buildings/${result.slug}`);
      router.push(`/buildings/${result.slug}`);
    });

  /* A new order, already showing, saves straight away; it goes back if it
     can't be saved. Undo saves the order from before. */
  const saveOrder = async (next: Building[], before: Building[]) => {
    const slugs = (list: Building[]) => list.map((b) => b.slug);
    if (slugs(next).join() === slugs(before).join()) return;
    const undo = () => {
      setBuildings(before);
      void run(() => saveBuildingOrder(slugs(before)), "Order put back");
    };
    if (!(await run(() => saveBuildingOrder(slugs(next)), "Order saved", { label: "Undo", onClick: undo })))
      setBuildings(before);
  };

  const q = search.trim().toLowerCase();
  const searched = q
    ? buildings.filter((b) =>
        [nameOf(b), b.address ?? "", b.summary ?? ""].some((t) => t.toLowerCase().includes(q)),
      )
    : buildings;
  const shown = status ? searched.filter((b) => statusOf(b) === status) : searched;
  const filtered = Boolean(q || status);
  const canReorder = sortable && !filtered;
  const clear = () => {
    setSearch("");
    setStatus(null);
  };

  // What both views show for one building.
  const roomTypes = (b: Location) => {
    const n = b.rooms?.types.filter((t) => t.label).length ?? 0;
    return n ? `${n} room ${n === 1 ? "type" : "types"}` : "No room types";
  };
  const cardButton = (b: Building, className: string) => (
    <button
      type="button"
      onClick={() => openCard(b)}
      className={`${className} cursor-pointer`}
      aria-label={`Edit ${nameOf(b)}'s card`}
      title="Edit its card"
    >
      <IdCard className="size-4" />
    </button>
  );
  const photo = (b: Location) => cardPhoto(b.slug, b.photos);

  return (
    <>
      <PageHeader
        icon={Building2}
        title="Buildings"
        description="Each building's page, and its card in the website's Locations carousel. The order here is the carousel's: drag a card, or use its arrows, and the new order saves straight away."
        actions={
          <button type="button" onClick={() => setAdding(true)} className={button.primary}>
            <Plus className="size-4" /> New building
          </button>
        }
      />

      <EditModal
        isOpen={!!carding}
        onClose={() => closeCard()}
        title={carding ? `${nameOf(carding)}: card` : "Card"}
        formId="building-card"
        isSaving={cardSaving}
        dirty={!!carding && !!card && JSON.stringify(card) !== JSON.stringify(cardDetailsOf(carding))}
        wide
      >
        {carding && card && (
          <form
            id="building-card"
            onSubmit={(e) => {
              e.preventDefault();
              saveCard();
            }}
          >
            <CardFields
              slug={carding.slug}
              value={card}
              onChange={setCard}
              onNewUpload={(url) => setCardUploads((u) => [...u, url])}
              visibility={{
                value: carding.visibility ?? "auto",
                onChange: (visibility) => {
                  const v = visibility === "auto" ? null : visibility;
                  setBuilding(carding.slug, (b) => ({ ...b, visibility: v }));
                  setCarding((c) => c && { ...c, visibility: v });
                },
              }}
            />
          </form>
        )}
      </EditModal>

      <EditModal
        isOpen={adding}
        onClose={closeAdding}
        title="New building"
        formId="new-building"
        saveLabel="Add and open"
        isSaving={creating}
        dirty={!!(draft.name || draft.city)}
      >
        <form
          id="new-building"
          onSubmit={(e) => {
            e.preventDefault();
            create();
          }}
          className="space-y-5"
        >
          <p className="text-sm leading-relaxed text-ink/60">
            It starts blank, as a draft with &ldquo;Coming soon&rdquo;: hidden on the website until you change that at
            the top of its editor. Everything else is filled in there.
          </p>
          <Field label="Name" hint={`Shown as "Volley …". Its page's address is made from it, e.g. /locations/oak.`}>
            <div className="flex items-center gap-2">
              <span className="text-sm text-ink/60">Volley</span>
              <input
                autoFocus
                required
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                placeholder="Oak"
                className={inputClass}
              />
            </div>
          </Field>
          <Field label="City" hint="Under its name at the top of its page, and beside it in the menu.">
            <input
              value={draft.city}
              onChange={(e) => setDraft((d) => ({ ...d, city: e.target.value }))}
              placeholder="Pretoria"
              className={inputClass}
            />
          </Field>
        </form>
      </EditModal>

      <div className="mb-4 flex flex-col items-start justify-between gap-4 rounded-2xl border border-ink/10 bg-white p-4 sm:flex-row sm:items-center">
        <SearchBox value={search} onChange={setSearch} placeholder="Search buildings..." />
        <div className="flex shrink-0 items-center gap-3 self-end sm:self-auto">
          <CountPill>
            {shown.length} {shown.length === 1 ? "building" : "buildings"}
          </CountPill>
          <ListViewSwitch view={view} onChange={setView} />
        </div>
      </div>

      <div
        role="group"
        aria-label="Filter by status"
        className="mb-6 flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none]"
      >
        {[null, ...LOCATION_STATUSES].map((value) => (
          <button
            key={value ?? "all"}
            type="button"
            onClick={() => setStatus(value)}
            aria-pressed={status === value}
            className={chipClass(status === value)}
          >
            {value ?? "All"}
            <span className={status === value ? "text-bone/60" : "text-ink/35"}>
              {value ? searched.filter((b) => statusOf(b) === value).length : searched.length}
            </span>
          </button>
        ))}
      </div>

      {filtered && shown.length > 0 && sortable && (
        <p className="-mt-3 mb-4 text-xs text-ink/50">
          Showing a filtered list.{" "}
          <button type="button" onClick={clear} className="cursor-pointer text-ink/70 underline underline-offset-2 hover:text-ink">
            Clear the search and filters
          </button>{" "}
          to change the order.
        </p>
      )}
      {!sortable && (
        <p className="-mt-3 mb-4 text-xs text-ink/50">
          Reordering isn&apos;t switched on yet: the database needs a small one-off update first. Ask whoever set
          up the admin to run the &quot;sort&quot; lines under Locations in supabase/schema.sql.
        </p>
      )}

      {shown.length > 0 && view === "grid" && (
        <Sortable
          items={shown}
          getKey={(b) => b.slug}
          onChange={setBuildings}
          onCommit={saveOrder}
          disabled={!canReorder || pending}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2"
          itemClassName="group relative overflow-hidden rounded-2xl border border-ink/10 bg-white transition-[border-color,box-shadow] hover:border-ink/25 hover:shadow-soft"
        >
          {(b, sort) => (
            <>
              <button
                type="button"
                onClick={() => open(b)}
                aria-label={`Edit ${nameOf(b)}`}
                className="block w-full cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
              >
                <div className="relative flex h-56 w-full items-center justify-center overflow-hidden bg-bone/60">
                  {photo(b) ? (
                    <img
                      src={siteAsset(photo(b))}
                      alt=""
                      className="absolute inset-0 size-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <Building2 className="size-6 text-ink/30" />
                  )}
                  <span className="absolute bottom-3 left-3 flex gap-1">
                    <StatusBadge building={b} />
                  </span>
                </div>
                <div className={`space-y-2 p-4 ${canReorder ? "pb-12" : ""}`}>
                  <div className="min-w-0">
                    <span className="block truncate font-publish text-xl leading-tight text-ink">{nameOf(b)}</span>
                    <span className="mt-0.5 block truncate text-xs text-ink/50">{b.address ?? "No address set"}</span>
                  </div>
                  {b.summary && <p className="line-clamp-2 text-sm text-ink/70">{b.summary}</p>}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2 pt-1 text-xs text-ink/50">
                    {(b.beds ?? LOCATION_CARDS[b.slug]?.beds) != null && (
                      <span className="inline-flex items-center gap-1.5">
                        <BedSingle className="size-3.5" strokeWidth={1.75} /> {b.beds ?? LOCATION_CARDS[b.slug].beds} beds
                      </span>
                    )}
                    <span>{roomTypes(b)}</span>
                    {b.updated_at && <span className="ml-auto">Edited {formatDate(b.updated_at)}</span>}
                  </div>
                </div>
              </button>

              {/* The order: a grip on the photo to drag by (desktop), and
                  its place with the same arrows as every list (touch too). */}
              {canReorder && (
                <>
                  <div className="absolute top-3 left-3 hidden rounded-full bg-white/90 text-ink/60 shadow-soft md:block [&>span]:rounded-full [&>span]:text-ink/60 [&>span:hover]:bg-white [&>span:hover]:text-ink">
                    {sort.row.handle}
                  </div>
                  <div className="absolute right-2 bottom-2 flex items-center gap-1">
                    <span className="min-w-4 text-center text-xs font-medium text-ink/40 tabular-nums">
                      {sort.index + 1}
                    </span>
                    <RowControls {...sort.row} handle={null} />
                  </div>
                </>
              )}

              {/* Actions over the photo: always on a touch screen, on hover from md. */}
              <div className="absolute top-3 right-3 flex gap-2 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100">
                {cardButton(
                  b,
                  "inline-flex items-center justify-center rounded-full bg-white/90 p-2 text-ink/60 shadow-soft transition-colors hover:bg-white hover:text-ink",
                )}
                <button
                  type="button"
                  onClick={() => open(b)}
                  aria-label={`Edit ${nameOf(b)}`}
                  className="inline-flex cursor-pointer items-center justify-center rounded-full bg-white/90 p-2 text-ink/60 shadow-soft transition-colors hover:bg-white hover:text-ink"
                >
                  <Edit2 className="size-4" />
                </button>
              </div>
            </>
          )}
        </Sortable>
      )}

      {shown.length > 0 && view === "list" && (
        <Sortable
          items={shown}
          getKey={(b) => b.slug}
          onChange={setBuildings}
          onCommit={saveOrder}
          disabled={!canReorder || pending}
          className="divide-y divide-ink/5 overflow-hidden rounded-2xl border border-ink/10 bg-white"
          itemClassName="flex items-center gap-1 bg-white pr-2 transition-colors hover:bg-bone/25 sm:pr-3"
        >
          {(b, sort) => (
            <>
              {/* The order: its grip (desktop) and place; the arrows are with the actions. */}
              {canReorder && (
                <div className="flex shrink-0 items-center gap-1 pl-1">
                  {sort.row.handle}
                  <span className="min-w-4 text-center text-xs font-medium text-ink/40 tabular-nums">{sort.index + 1}</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => open(b)}
                aria-label={`Edit ${nameOf(b)}`}
                className={`flex min-w-0 flex-1 cursor-pointer items-center gap-4 py-3 text-left ${canReorder ? "pl-2" : "pl-4"}`}
              >
                <span className="relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-bone/60">
                  {photo(b) ? (
                    <img src={siteAsset(photo(b))} alt="" className="size-full object-cover" />
                  ) : (
                    <Building2 className="size-5 text-ink/40" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-ink">{nameOf(b)}</span>
                  <span className="mt-1 block truncate text-xs text-ink/50">{b.address ?? "No address set"}</span>
                </span>
                <span className="hidden shrink-0 items-center gap-3 sm:flex">
                  <span className="text-xs text-ink/50">{roomTypes(b)}</span>
                  <StatusBadge building={b} />
                </span>
              </button>
              {canReorder && <RowControls {...sort.row} handle={null} />}
              {cardButton(b, iconButton)}
              <button type="button" onClick={() => open(b)} className={iconButton} aria-label={`Edit ${nameOf(b)}`}>
                <Edit2 className="size-4" />
              </button>
            </>
          )}
        </Sortable>
      )}

      {shown.length === 0 && (
        <div className="rounded-2xl border border-ink/10 bg-white px-6 py-12 text-center text-sm text-ink/50">
          No buildings match.{" "}
          <button
            type="button"
            onClick={clear}
            className="inline-flex cursor-pointer items-center gap-1 text-ink/70 underline underline-offset-2 hover:text-ink"
          >
            <X className="size-3.5" /> Clear the search and filters
          </button>
        </div>
      )}

    </>
  );
}
