"use server";

import { requireAdmin } from "@/lib/auth";
import { putSetting } from "@/lib/settings";
import { revalidateSite } from "@/lib/revalidate";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { failed, saved, type Result } from "@/lib/result";
import type { CareersPage } from "@/lib/careers";

const text = (v: unknown, max = 2000) => String(v ?? "").trim().slice(0, max);
// A list's points, trimmed, empty ones dropped.
const points = (v: unknown) => (Array.isArray(v) ? v.map((p) => text(p, 500)).filter(Boolean).slice(0, 40) : []);

/* Saves the careers page's wording (the `careers` setting), live on the
   website's /careers page once it's done. The jobs aren't part of it:
   they're saved on the Jobs page. */
export async function saveCareersPage(input: CareersPage): Promise<Result> {
  const { supabase } = await requireAdmin();
  const page: CareersPage = {
    hero: {
      eyebrow: text(input.hero?.eyebrow, 200),
      title: text(input.hero?.title, 200),
      lines: points(input.hero?.lines),
      intro: text(input.hero?.intro),
    },
    manifesto: { title: text(input.manifesto?.title, 200), points: points(input.manifesto?.points) },
    signingUp: {
      title: text(input.signingUp?.title, 200),
      points: points(input.signingUp?.points),
      after: text(input.signingUp?.after),
    },
    upside: { title: text(input.upside?.title, 200), points: points(input.upside?.points), after: text(input.upside?.after) },
    bottomLine: {
      title: text(input.bottomLine?.title, 200),
      lines: points(input.bottomLine?.lines),
      script: text(input.bottomLine?.script, 200),
    },
    jobs: { eyebrow: text(input.jobs?.eyebrow, 200), title: text(input.jobs?.title, 200), empty: text(input.jobs?.empty) },
    form: {
      eyebrow: text(input.form?.eyebrow, 200),
      privacy: text(input.form?.privacy),
      button: text(input.form?.button, 100),
      thanks: {
        eyebrow: text(input.form?.thanks?.eyebrow, 200),
        headline: text(input.form?.thanks?.headline, 200),
        message: text(input.form?.thanks?.message),
      },
    },
  };
  if (!page.hero.title) return { ok: false, message: "The page needs a title." };
  if (!page.form.button) return { ok: false, message: "The application button needs a label." };

  try {
    await putSetting(supabase, "careers", page);
  } catch (err) {
    return failed(err);
  }
  return saved(await revalidateSite(CACHE_TAGS.CAREERS));
}
