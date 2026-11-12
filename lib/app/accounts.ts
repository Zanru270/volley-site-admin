import "server-only";
import { appSupabase } from "@/lib/appSupabase";

/* Adapted from the Volley app's admin (src/lib/accounts.ts), to make its
   residents' logins from here: keep the two in step.

   A one-time link that lets them choose their password, on the resident
   web app's /set-password page (RESIDENT_PORTAL_URL). A new login gets an
   invite; someone who already has one (a returning resident, or a retry
   after a failed email) gets a password reset instead. Generating the link
   sends nothing. */
export async function passwordLink(email: string) {
  const db = appSupabase();
  if (!db) throw new Error("The Volley app isn't connected.");
  let result = await db.auth.admin.generateLink({ type: "invite", email });
  let created = !result.error;
  if (result.error && (result.error.code === "email_exists" || /already/i.test(result.error.message))) {
    result = await db.auth.admin.generateLink({ type: "recovery", email });
    created = false;
  }
  if (result.error) throw result.error;
  const { user, properties } = result.data;
  const portal = process.env.RESIDENT_PORTAL_URL!.replace(/\/$/, "");
  const link = `${portal}/set-password?${new URLSearchParams({
    token_hash: properties.hashed_token,
    type: properties.verification_type,
  })}`;
  return { userId: user.id, created, link };
}
