"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { failed, type Result } from "@/lib/result";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* Gives someone access: creates their login (email + the password you
   choose, to pass on to them) and adds them to the admin list. If they
   already have a login, it's kept and only the admin list changes. */
export async function addAdmin(input: {
  email: string;
  name: string;
  password: string;
}): Promise<Result> {
  const { supabase } = await requireAdmin();
  const email = input.email.trim().toLowerCase();
  if (!EMAIL.test(email)) return { ok: false, message: "Check the email address." };
  if (input.password.length < 10)
    return { ok: false, message: "Use a password of at least 10 characters." };

  try {
    const { error: authError } = await createServiceClient().auth.admin.createUser({
      email,
      password: input.password,
      email_confirm: true,
    });
    if (authError && !/already|registered|exists/i.test(authError.message))
      throw authError;

    const { error } = await supabase
      .from("admin_users")
      .upsert({ email, name: input.name.trim() })
      .select("email");
    if (error) throw error;
  } catch (err) {
    return failed(err);
  }
  revalidatePath("/team");
  return {
    ok: true,
    message: `Added ${email}. Send them the password you chose; they can sign in now.`,
  };
}

// Takes away someone's access. Their login stays, but opens nothing.
export async function removeAdmin(email: string): Promise<Result> {
  const { supabase, user } = await requireAdmin();
  if (email.toLowerCase() === user.email?.toLowerCase())
    return { ok: false, message: "You can't remove yourself." };
  const { error } = await supabase.from("admin_users").delete().eq("email", email);
  if (error) return failed(error);
  revalidatePath("/team");
  return { ok: true, message: `Removed ${email}.` };
}
