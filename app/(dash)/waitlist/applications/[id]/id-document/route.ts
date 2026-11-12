import { type NextRequest } from "next/server";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { appSupabase } from "@/lib/appSupabase";

/* GET /waitlist/applications/{id}/id-document: the applicant's driver's
   licence / ID photo. The Volley app's waitlist-ids bucket is private, so
   this signs a five-minute link to it, once the caller is known to be an
   admin, and sends them there. Used as the photo and for "Open full size". */
export async function GET(_request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  await requireAdmin();
  const app = appSupabase();
  if (!app) return new Response("The Volley app isn't connected.", { status: 503 });
  const { data, error } = await app.from("waitlist").select("id_document_path").eq("id", id).maybeSingle();
  if (error) return new Response("Couldn't read the application.", { status: 502 });
  if (!data?.id_document_path) return new Response("No ID photo for this application.", { status: 404 });
  const signed = await app.storage.from("waitlist-ids").createSignedUrl(data.id_document_path, 300);
  if (signed.error) return new Response("Couldn't open the ID photo.", { status: 502 });
  redirect(signed.data.signedUrl);
}
