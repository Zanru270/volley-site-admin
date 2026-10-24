/* What every server action returns, for the form to show. */
export type Result = { ok: boolean; message: string };

export const saved = (live: boolean): Result => ({
  ok: true,
  message: live
    ? "Saved. It's live on the site."
    : "Saved. The site couldn't be told right away, so it may take up to an hour to show.",
});

export const failed = (error: unknown): Result => ({
  ok: false,
  message: `Couldn't save: ${error instanceof Error ? error.message : String((error as { message?: string })?.message ?? error)}`,
});
