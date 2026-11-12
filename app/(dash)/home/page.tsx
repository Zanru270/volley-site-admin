import { withHomePhotos } from "@/lib/site";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { createPreviewToken } from "@/lib/preview-token";
import { getBuildings } from "@/lib/buildings";
import { getSetting } from "@/lib/settings";
import { HOME_FIELDS, type HomeField } from "@/lib/live-editor";
import type { Banner, FaqRow, HomePage, Location } from "@/lib/types";
import { Home } from "lucide-react";
import { PageHeader } from "@/components/ui";
import NotSeeded from "@/components/NotSeeded";
import HomeLiveEditor from "./HomeLiveEditor";

// Before the banner is in Supabase: off, until it's written.
const NO_BANNER: Banner = { enabled: false, text: "", linkText: "", linkHref: "", after: "" };

export const metadata: Metadata = { title: "Home page" };

/* The live, on-page editor (HomeLiveEditor.tsx), with its form view as a
   panel. The FAQs are edited here too, in the panel the FAQ section of the
   page opens. */
export default async function HomePagePage({ searchParams }: PageProps<"/home">) {
  const { supabase, user } = await requireAdmin();
  const { open } = await searchParams;
  const [home, banner, { buildings: rows }, { data: faqs, error }] = await Promise.all([
    getSetting<HomePage>(supabase, "home"),
    getSetting<Banner>(supabase, "banner"),
    getBuildings<Location>(supabase),
    supabase.from("faqs").select("id, tab, category, question, answer, list").order("sort"),
  ]);
  if (error) throw error;
  // Only what the card previews show.
  const locations = rows.map(({ slug, name, address, status, visibility, card_colour, summary, photos }) => ({
    slug,
    // Left out while the database has no name column, so nothing tries to save one.
    ...(name !== undefined ? { name } : {}),
    address,
    status,
    visibility,
    // Left out while the database has no column for it, as the name is.
    ...(card_colour !== undefined ? { card_colour } : {}),
    summary,
    photos,
  }));
  if (!home)
    return (
      <>
        <PageHeader icon={Home} title="Home page" />
        <NotSeeded what="home page wording" />
      </>
    );
  return (
    <HomeLiveEditor
      initial={withHomePhotos(home)}
      banner={banner ?? NO_BANNER}
      locations={locations}
      faqs={faqs as FaqRow[]}
      preview={createPreviewToken(user.id)}
      // /home?open=faqs.list starts with that card open; ?open=form, the form view.
      open={open === "form" ? "form" : (HOME_FIELDS as readonly string[]).includes(open as string) ? (open as HomeField) : null}
    />
  );
}
