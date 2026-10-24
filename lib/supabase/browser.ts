import { createBrowserClient } from "@supabase/ssr";

/* Supabase in the browser, as the signed-in admin: the login form and file
   uploads (straight to Storage, so big files don't pass through a server
   action). */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
