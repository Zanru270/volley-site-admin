"use server";

import { requireAdmin } from "@/lib/auth";
import { putSetting } from "@/lib/settings";
import { revalidateSite } from "@/lib/revalidate";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { failed, saved, type Result } from "@/lib/result";
import { FOOTER_GROUPS, type FooterGroup, type FooterSettings } from "@/lib/footer";

const text = (v: unknown, max = 200) => String(v ?? "").trim().slice(0, max);

/* Saves the footer: each group of links, in its order, each on or off (one
   that's on needs a name and an address: a page of the site, a web
   address, or "#" while it waits; one that's off may wait for its
   address), its contact details and its tagline. */
const HREF = /^(https?:\/\/\S+\.\S+|\/\S*|#\S*|mailto:\S+)$/;

export async function saveFooter(input: FooterSettings): Promise<Result> {
  const { supabase } = await requireAdmin();
  const groups = {} as Record<FooterGroup, FooterSettings[FooterGroup]>;
  for (const { key: group, title } of FOOTER_GROUPS) {
    const links = (input[group] ?? []).map((link, i) => ({
      key: text(link.key, 60) || `${group}-${i + 1}`,
      label: text(link.label, 60),
      href: text(link.href, 500),
      on: Boolean(link.on),
    }));
    for (const [i, link] of links.entries()) {
      const name = `${title}: ${link.label || `link ${i + 1}`}`;
      if (!link.label) return { ok: false, message: `${name} needs a name.` };
      if (link.on && !HREF.test(link.href))
        return { ok: false, message: `${name}: add its address (a page like /contact, or a full https:// address), or switch it off.` };
    }
    groups[group] = links;
  }
  const contact = {
    name: text(input.contact?.name, 100),
    email: text(input.contact?.email, 200),
    phone: text(input.contact?.phone, 60),
  };
  if (contact.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email))
    return { ok: false, message: "Contact details: check the email address." };
  if (contact.phone && !/\d{6,}/.test(contact.phone.replace(/\D/g, "")))
    return { ok: false, message: "Contact details: check the phone number." };

  try {
    await putSetting(supabase, "footer", { ...groups, contact, tagline: text(input.tagline, 100) });
  } catch (err) {
    return failed(err);
  }
  return saved(await revalidateSite(CACHE_TAGS.FOOTER));
}
