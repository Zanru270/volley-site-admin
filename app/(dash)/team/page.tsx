import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import TeamEditor from "./TeamEditor";

export const metadata: Metadata = { title: "Team" };

export default async function TeamPage() {
  const { supabase, user } = await requireAdmin();
  const { data, error } = await supabase
    .from("admin_users")
    .select("email, name, created_at")
    .order("created_at");
  if (error) throw error;
  return <TeamEditor admins={data} me={user.email ?? ""} />;
}
