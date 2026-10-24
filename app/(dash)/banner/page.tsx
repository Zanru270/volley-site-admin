import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { getSetting } from "@/lib/settings";
import type { Banner } from "@/lib/types";
import { PageHeader } from "@/components/ui";
import NotSeeded from "@/components/NotSeeded";
import BannerEditor from "./BannerEditor";

export const metadata: Metadata = { title: "Banner" };

export default async function BannerPage() {
  const { supabase } = await requireAdmin();
  const banner = await getSetting<Banner>(supabase, "banner");
  return (
    <>
      <PageHeader
        title="Announcement banner"
        description="The strip along the top of every page."
      />
      {banner ? <BannerEditor initial={banner} /> : <NotSeeded what="banner" />}
    </>
  );
}
