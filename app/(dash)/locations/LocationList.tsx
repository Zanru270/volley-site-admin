"use client";

import { useState } from "react";
import { Edit2, ExternalLink, MapPin } from "lucide-react";
import {
  Badge,
  CountPill,
  iconButton,
  PageHeader,
  row,
  tableHead,
  tableWrap,
  tbody,
  td,
  th,
  Toolbar,
} from "@/components/ui";
import { useAction } from "@/components/forms";
import { LOCATION_NAMES } from "@/lib/site";
import type { Location } from "@/lib/types";
import LocationModal from "./LocationModal";
import { saveLocation } from "./actions";

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Africa/Johannesburg",
  }).format(new Date(iso));

/* The residences, each opening in the edit drawer, like the Bow + Arc
   CMS's Projects page. There's no add or delete: the pages themselves
   live in the site's code. */
export default function LocationList({ locations }: { locations: (Location & { updated_at?: string })[] }) {
  const [editing, setEditing] = useState<Location | null>(null);
  const { pending, run } = useAction();
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");

  const onSave = async (location: Location) => {
    if (await run(() => saveLocation(location), "Location saved")) setEditing(null);
  };

  return (
    <>
      <PageHeader
        title="Locations"
        description="Each residence's page: address, description, pricelist, headline figures, and room types with their fees and availability. Photos, maps and colours are still set in the site's code."
      />

      <Toolbar>
        <span className="text-sm text-ink/50">Click a residence to edit its page.</span>
        <CountPill>
          {locations.length} {locations.length === 1 ? "Location" : "Locations"}
        </CountPill>
      </Toolbar>

      <div className={tableWrap}>
        <table className="w-full text-left text-sm">
          <thead className={tableHead}>
            <tr>
              <th className={th}>Residence</th>
              <th className={th}>Room types</th>
              <th className={th}>Last edited</th>
              <th className={`${th} text-right`}>Actions</th>
            </tr>
          </thead>
          <tbody className={tbody}>
            {locations.map((l) => (
              <tr key={l.slug} className={`${row} cursor-pointer`} onClick={() => setEditing(l)}>
                <td className={td}>
                  <div className="flex items-center gap-4">
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-sm bg-bone/60 text-ink/40">
                      <MapPin className="size-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium text-ink">{LOCATION_NAMES[l.slug] ?? l.slug}</p>
                      <p className="mt-1 max-w-xs truncate text-xs text-ink/50">
                        {l.address ?? "No address set"}
                      </p>
                    </div>
                  </div>
                </td>
                <td className={td}>
                  {l.rooms?.types.length ? (
                    <div className="flex flex-wrap gap-1">
                      {l.rooms.types.map((t) => (
                        <Badge key={t.label}>{t.label}</Badge>
                      ))}
                    </div>
                  ) : (
                    <span className="text-ink/40">—</span>
                  )}
                </td>
                <td className={`${td} whitespace-nowrap text-ink/60`}>
                  {l.updated_at ? formatDate(l.updated_at) : "—"}
                </td>
                <td className={td} onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-end">
                    {siteUrl && (
                      <a
                        href={`${siteUrl}/locations/${l.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={iconButton}
                        aria-label="View on the website"
                      >
                        <ExternalLink className="size-4" />
                      </a>
                    )}
                    <button type="button" onClick={() => setEditing(l)} className={iconButton} aria-label="Edit">
                      <Edit2 className="size-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <LocationModal
          key={editing.slug}
          location={editing}
          saving={pending}
          onClose={() => setEditing(null)}
          onSave={onSave}
        />
      )}
    </>
  );
}
