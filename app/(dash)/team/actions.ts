"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { failed, type Result } from "@/lib/result";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// A password copied with a space at either end can't be typed back in.
const spaced = (password: string) => password !== password.trim();
const SPACED = "Take out the space at the start or end of the password.";

/* Sets the password on the login with this email. False when there's no
   such login. */
async function setPassword(email: string, password: string) {
  const service = createServiceClient();
  const { data: list, error: listError } = await service.auth.admin.listUsers({ perPage: 1000 });
  if (listError) throw listError;
  const login = list.users.find((u) => u.email?.toLowerCase() === email);
  if (!login) return false;
  const { error } = await service.auth.admin.updateUserById(login.id, {
    password,
    // Typed in by an admin, so the address needs no confirming.
    email_confirm: true,
  });
  if (error) throw error;
  return true;
}

/* Gives someone access: creates their login (email + the password you
   choose, to pass on to them) and adds them to the admin list. If they
   already have a login, it's kept but given the password you chose, so
   the one you send them is the one that works. */
export async function addAdmin(input: {
  email: string;
  name: string;
  password: string;
}): Promise<Result> {
  await requireAdmin();
  const email = input.email.trim().toLowerCase();
  if (!EMAIL.test(email)) return { ok: false, message: "Check the email address." };
  if (input.password.length < 10)
    return { ok: false, message: "Use a password of at least 10 characters." };
  if (spaced(input.password)) return { ok: false, message: SPACED };

  try {
    const { error: authError } = await createServiceClient().auth.admin.createUser({
      email,
      password: input.password,
      email_confirm: true,
    });
    if (authError) {
      if (!/already|registered|exists/i.test(authError.message)) throw authError;
      await setPassword(email, input.password);
    }

    // The service client: the admin list's rules let admins add and remove
    // people but not edit them, and someone already on it is an edit.
    const { error } = await createServiceClient()
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
  await requireAdmin();
  const email = input.email.trim().toLowerCase();
  if (input.password && input.password.length < 10)
    return { ok: false, message: "Use a password of at least 10 characters, or leave it empty to keep theirs." };
  if (input.password && spaced(input.password)) return { ok: false, message: SPACED };

  try {
    // The service client, as the admin list's rules don't allow edits
    // (requireAdmin above has checked it's an admin asking).
    const { data, error } = await createServiceClient()
      .from("admin_users")
      .update({ name: input.name.trim() })
      .eq("email", email)
      .select("email");
    if (error) throw error;
    if (!data.length) return { ok: false, message: `${email} isn't on the team any more.` };

    if (input.password && !(await setPassword(email, input.password)))
      return { ok: false, message: `The name is saved, but ${email} has no login to set a password on.` };
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
