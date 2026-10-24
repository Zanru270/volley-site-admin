import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { getSetting } from "@/lib/settings";
import type { WaitlistForm } from "@/lib/types";
import { PageHeader } from "@/components/ui";
import NotSeeded from "@/components/NotSeeded";
import WaitlistFormEditor from "./WaitlistFormEditor";

export const metadata: Metadata = { title: "Waitlist Form" };

export default async function WaitlistFormPage() {
  const { supabase } = await requireAdmin();
  const form = await getSetting<WaitlistForm>(supabase, "waitlist_form");
  return (
    <>
      <PageHeader
        title="Waitlist Form"
        description='The "Apply now" form on the website: its wording, the unit types to choose from, and the thank-you screen. The sign-ups themselves go to the Volley app, where its admin works through them.'
      />
      {form ? <WaitlistFormEditor initial={form} /> : <NotSeeded what="waitlist form wording" />}
    </>
  );
}
