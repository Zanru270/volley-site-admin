import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { getSetting } from "@/lib/settings";
import type { WaitlistForm } from "@/lib/types";
import { ClipboardList } from "lucide-react";
import { PageHeader } from "@/components/ui";
import NotSeeded from "@/components/NotSeeded";
import { createPreviewToken } from "@/lib/preview-token";
import WaitlistLiveEditor from "./WaitlistLiveEditor";

export const metadata: Metadata = { title: "Waitlist form" };

/* The "Apply now" form, in its live editor (WaitlistLiveEditor.tsx), as
   the home page and buildings are edited. */
export default async function WaitlistFormPage() {
  const { supabase, user } = await requireAdmin();
  const form = await getSetting<WaitlistForm>(supabase, "waitlist_form");
  if (form) return <WaitlistLiveEditor initial={form} preview={createPreviewToken(user.id)} />;
  return (
    <>
      <PageHeader
        icon={ClipboardList}
        title="Waitlist form"
        description='The "Apply now" form on the website: its wording, the unit types to choose from, and the thank-you screen. The sign-ups themselves go to the Volley app, where its admin works through them.'
      />
      <NotSeeded what="waitlist form wording" />
    </>
  );
}
