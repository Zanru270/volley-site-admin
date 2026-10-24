/* Creates the first admin login, before anyone can use the Team page:

     npm run create-admin -- you@example.com "a long password" "Your name"

   Makes the Supabase login (already confirmed) and adds the email to
   admin_users. Uses the service role key from .env.local. */
import { createClient } from "@supabase/supabase-js";

const [email, password, name = ""] = process.argv.slice(2);
if (!email || !password) {
  console.error('Usage: npm run create-admin -- you@example.com "password" "Name"');
  process.exit(1);
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local first.");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

const { error: authError } = await db.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});
if (authError && !/already|registered|exists/i.test(authError.message)) {
  console.error(authError.message);
  process.exit(1);
}
const { error } = await db
  .from("admin_users")
  .upsert({ email: email.toLowerCase(), name });
if (error) {
  console.error(`${error.message} (did you run supabase/schema.sql?)`);
  process.exit(1);
}
console.log(`✓ ${email} can now sign in to the admin.`);
