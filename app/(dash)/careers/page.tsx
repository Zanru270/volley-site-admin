import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { getSetting } from "@/lib/settings";
import { createPreviewToken } from "@/lib/preview-token";
import { DEFAULT_CAREERS, type CareersPage } from "@/lib/careers";
import CareersLiveEditor from "./CareersLiveEditor";

export const metadata: Metadata = { title: "Careers page" };

/* The careers page's wording, in its live editor (CareersLiveEditor.tsx),
   as the home page and the waitlist form are edited. Until it's first
   saved, the website's own wording (DEFAULT_CAREERS) is what's edited;
   a section saved before a field was added keeps that field's default. */
export default async function CareersPageEditor() {
  const { supabase, user } = await requireAdmin();
  const saved = await getSetting<Partial<CareersPage>>(supabase, "careers");
  const initial = Object.fromEntries(
    Object.entries(DEFAULT_CAREERS).map(([section, defaults]) => [
      section,
      { ...defaults, ...saved?.[section as keyof CareersPage] },
    ]),
  ) as CareersPage;
  initial.form.thanks = { ...DEFAULT_CAREERS.form.thanks, ...saved?.form?.thanks };
  return <CareersLiveEditor initial={initial} preview={createPreviewToken(user.id)} />;
}
