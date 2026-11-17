import { type NextRequest } from "next/server";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";

/* GET /careers/applications/{id}/cv: the applicant's CV. The `cvs` bucket
   is private, so this signs a five-minute link to it once the caller is
   known to be an admin, and sends them there. `?download` saves it as
   "Name Surname CV.pdf" instead of opening it. */
export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("job_applications")
    .select("cv_path, name, surname")
    .eq("id", id)
    .maybeSingle();
  if (error) return new Response("Couldn't read the application.", { status: 502 });
  if (!data?.cv_path) return new Response("No CV for this application.", { status: 404 });
  const name = `${data.name} ${data.surname}`.trim().replace(/[^\p{L}\p{N} .'-]/gu, "") || "Applicant";
  const signed = await supabase.storage
    .from("cvs")
    .createSignedUrl(data.cv_path, 300, request.nextUrl.searchParams.has("download") ? { download: `${name} CV.pdf` } : undefined);
  if (signed.error) return new Response("Couldn't open the CV.", { status: 502 });
  redirect(signed.data.signedUrl);
}
