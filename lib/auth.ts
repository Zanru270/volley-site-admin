import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/* The signed-in admin and a Supabase client acting as them. Sends anyone
   else to /login: not signed in, or signed in with an email that isn't in
   admin_users. Cached per request, so the layout, page and actions can all
   call it for one round trip.

   The login is checked here, by its signature (getClaims(), as in
   proxy.ts), so the one trip to the database is is_admin, which the
   database answers from the same login. `user` is what the pages use of
   it: their id and email. */
export const requireAdmin = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) redirect("/login");
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) redirect("/login?error=not-allowed");
  const user = { id: claims.sub, email: typeof claims.email === "string" ? claims.email : undefined };
  return { supabase, user };
});
