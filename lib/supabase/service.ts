import "server-only";
import { createClient } from "@supabase/supabase-js";

/* Supabase with the service role key, which bypasses every security rule.
   Only for what an admin's own login can't do: creating other people's
   logins and setting their passwords on the Team page, and deleting
   uploaded files nothing uses any more (lib/media-actions.ts). Server only,
   and only after requireAdmin(). Never give this key a NEXT_PUBLIC_ name. */
export function createServiceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY isn't set.");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
