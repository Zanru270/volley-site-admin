import type { Metadata } from "next";
import { PanelBottom } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { getSetting } from "@/lib/settings";
import { createPreviewToken } from "@/lib/preview-token";
import { PageHeader } from "@/components/ui";
import { DEFAULT_FOOTER, type FooterSettings } from "@/lib/footer";
import FooterEditor from "./FooterEditor";

export const metadata: Metadata = { title: "Footer" };

/* The website's footer: every group of its links. Until it's first saved,
   the website's own show here, as they do on the site; a footer saved
   before a group could be edited gets that group's from the website. */
export default async function FooterPage() {
  const { supabase, user } = await requireAdmin();
  const saved = await getSetting<Partial<FooterSettings>>(supabase, "footer");
  const initial: FooterSettings = {
    ...DEFAULT_FOOTER,
    ...saved,
    contact: { ...DEFAULT_FOOTER.contact, ...saved?.contact },
  };
  return (
    <>
      <PageHeader
        icon={PanelBottom}
        title="Footer"
        description="The links at the foot of every page of the website. Switch any of them off to hide it; the others close up. Drag them into the order they show in."
      />
      <FooterEditor initial={initial} preview={createPreviewToken(user.id)} />
    </>
  );
}
