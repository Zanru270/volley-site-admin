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

/* Changes someone's name in the admin list and, if one is given, their
   password (to pass on to them, as when they were added). */
export async function updateAdmin(input: {
  email: string;
  name: string;
  password: string;
}): Promise<Result> {
  const { supabase } = await requireAdmin();
  const email = input.email.trim().toLowerCase();
  if (input.password && input.password.length < 10)
    return { ok: false, message: "Use a password of at least 10 characters, or leave it empty to keep theirs." };

  try {
    const { data, error } = await supabase
      .from("admin_users")
      .update({ name: input.name.trim() })
      .eq("email", email)
      .select("email");
    if (error) throw error;
    if (!data.length) return { ok: false, message: `${email} isn't on the team any more.` };

    if (input.password) {
      const service = createServiceClient();
      const { data: list, error: listError } = await service.auth.admin.listUsers({ perPage: 1000 });
      if (listError) throw listError;
      const login = list.users.find((u) => u.email?.toLowerCase() === email);
      if (!login) return { ok: false, message: `The name is saved, but ${email} has no login to set a password on.` };
      const { error: pwError } = await service.auth.admin.updateUserById(login.id, { password: input.password });
      if (pwError) throw pwError;
    }
  } catch (err) {
    return failed(err);
  }
  revalidatePath("/team");
  return {
    ok: true,
    message: input.password ? `Saved. Send ${email} their new password.` : `Saved ${email}.`,
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
