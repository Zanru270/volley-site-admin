import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/* The signed-in admin and a Supabase client acting as them. Sends anyone
   else to /login: not signed in, or signed in with an email that isn't in
   admin_users. Cached per request, so the layout, page and actions can all
   call it for one round trip. */
export const requireAdmin = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) redirect("/login?error=not-allowed");
  return { supabase, user };
});
