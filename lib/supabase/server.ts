import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/* Supabase as the signed-in admin, for server components and server
   actions. Row Level Security lets an admin (an email in admin_users) read
   and change everything; see supabase/schema.sql. A new client per
   request, never shared. */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (list) => {
          // Server components can't set cookies; the proxy refreshes the
          // session for them, so this only matters in server actions.
          try {
            list.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {}
        },
      },
    },
  );
}
