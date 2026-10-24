"use server";

import { requireAdmin } from "@/lib/auth";
import { putSetting } from "@/lib/settings";
import { revalidateSite } from "@/lib/revalidate";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { failed, saved, type Result } from "@/lib/result";
import type { WaitlistForm } from "@/lib/types";

const text = (v: unknown) => String(v ?? "").trim();

export async function saveWaitlistForm(input: WaitlistForm): Promise<Result> {
  const { supabase } = await requireAdmin();
  const form: WaitlistForm = {
    sticker: text(input.sticker),
    eyebrow: text(input.eyebrow),
    headline: text(input.headline),
    intro: text(input.intro),
    sections: {
      details: text(input.sections?.details),
      preferences: text(input.sections?.preferences),
      parent: text(input.sections?.parent),
    },
    note: text(input.note),
    unitTypes: [...new Set((input.unitTypes ?? []).map(text).filter(Boolean))],
    privacy: text(input.privacy),
    button: text(input.button),
    thanks: {
      eyebrow: text(input.thanks?.eyebrow),
      headline: text(input.thanks?.headline),
      message: text(input.thanks?.message),
    },
  };
  if (!form.headline) return { ok: false, message: "The form needs a headline." };
  if (!form.button) return { ok: false, message: "The button needs a label." };
  if (Object.values(form.sections).some((t) => !t))
    return { ok: false, message: "Every section needs a title." };
  if (!form.unitTypes.length) return { ok: false, message: "Add at least one unit type." };
  if (!form.thanks.headline) return { ok: false, message: "The thank-you screen needs a headline." };

  try {
    await putSetting(supabase, "waitlist_form", form);
  } catch (err) {
    return failed(err);
  }
  return saved(await revalidateSite(CACHE_TAGS.WAITLIST_FORM));
}
