import "server-only";
import { createClient } from "@supabase/supabase-js";

/* The Volley app's Supabase project (the app, the resident web app and the
   app's own admin use it), not this CMS's. The website's "Apply now" form
   saves its sign-ups there (table: waitlist; ID photos in the private
   waitlist-ids bucket), and the Applications page reads them from it.

   With that project's service role key, so it reads past its rules: server
   only, after requireAdmin(), and only to read. Accepting or declining
   someone stays in the app's admin, which creates their account and sends
   the emails. Null until both are set (.env.example). */
export function appSupabase() {
  const url = process.env.VOLLEY_APP_SUPABASE_URL;
  const key = process.env.VOLLEY_APP_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
