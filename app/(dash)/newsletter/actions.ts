"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { failed, type Result } from "@/lib/result";
import { mailConfigured, sendMail } from "@/lib/app/mailgun";
import { hasButton, renderNewsletter, unsubscribeUrl, UNSUB_ID, type NewsletterEmail } from "@/lib/newsletter";

/* The Newsletter page's saves and sends. Sign-ups aren't shown on the
   website, so nothing here pings it. */

export type NewsletterSignup = {
  id: string;
  email: string;
  source: string;
  status: "subscribed" | "unsubscribed";
  unsubscribed_at: string | null;
  created_at: string;
};

export type NewsletterSend = {
  id: string;
  subject: string;
  content: NewsletterEmail;
  sent_by: string;
  recipients: number;
  failed: number;
  sent_at: string;
};

// The website's address, for photos, links and the unsubscribe page.
const SITE = () => process.env.NEXT_PUBLIC_SITE_URL ?? "";
const NOT_SET_UP = "Email isn't set up: MAILGUN_API_KEY and MAILGUN_DOMAIN need to be in the admin's settings.";

// What has to be there before an email can go.
function check(email: NewsletterEmail): string | null {
  if (!SITE()) return "The website's address (NEXT_PUBLIC_SITE_URL) isn't set, so the unsubscribe link can't be made.";
  if (!email.subject.trim()) return "Give the email a subject.";
  if (!email.body.trim() && !email.heading.trim()) return "Write the email first.";
  if (email.button.label.trim() && !email.button.href.trim()) return "Add the button's link, or clear its text.";
  if (hasButton(email) && !/^(https?:\/\/|\/|mailto:)/.test(email.button.href.trim()))
    return "The button's link should start with https://";
  return null;
}

// ---------------------------------------------------------------------------
// Sign-ups
// ---------------------------------------------------------------------------

// Deletes a sign-up straight away; the toast's Undo puts it back.
export async function deleteSignup(id: string): Promise<Result> {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.from("newsletter_signups").delete().eq("id", id).select("id");
  if (error) return failed(error);
  if (!data.length) return { ok: false, message: "That sign-up isn't there any more." };
  revalidatePath("/newsletter");
  return { ok: true, message: "Removed from the list." };
}

export async function restoreSignup(signup: NewsletterSignup): Promise<Result> {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("newsletter_signups").insert(signup);
  if (error && error.code !== "23505") return failed(error);
  revalidatePath("/newsletter");
  return { ok: true, message: "Put back." };
}

// Takes someone off (or back on) the mailing without deleting them.
export async function setSignupStatus(id: string, status: NewsletterSignup["status"]): Promise<Result> {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("newsletter_signups")
    .update({ status, unsubscribed_at: status === "unsubscribed" ? new Date().toISOString() : null })
    .eq("id", id)
    .select("id");
  if (error) return failed(error);
  if (!data.length) return { ok: false, message: "That sign-up isn't there any more." };
  revalidatePath("/newsletter");
  return { ok: true, message: status === "unsubscribed" ? "Unsubscribed. They won't get newsletters." : "Subscribed again." };
}

// ---------------------------------------------------------------------------
// Sending
// ---------------------------------------------------------------------------

/* The email to the admin who's signed in, marked as a test. Its
   unsubscribe link goes to the page but doesn't match anyone. */
export async function sendTestNewsletter(email: NewsletterEmail): Promise<Result> {
  const { user } = await requireAdmin();
  const problem = check(email);
  if (problem) return { ok: false, message: problem };
  if (!mailConfigured()) return { ok: false, message: NOT_SET_UP };
  if (!user.email) return { ok: false, message: "Your login has no email address to send the test to." };
  try {
    const { html, text } = renderNewsletter(email, { siteUrl: SITE(), unsubscribe: unsubscribeUrl(SITE(), "test") });
    await sendMail({ to: user.email, subject: `[Test] ${email.subject.trim()}`, html, text });
  } catch (err) {
    return { ok: false, message: `Couldn't send the test: ${(err as Error).message}` };
  }
  return { ok: true, message: `Test sent to ${user.email}.` };
}

// Mailgun takes up to 1,000 addresses a message, each sent on its own.
const BATCH = 1000;

async function sendBatch(to: { id: string; email: string }[], subject: string, html: string, text: string) {
  const apiKey = process.env.MAILGUN_API_KEY!;
  const domain = process.env.MAILGUN_DOMAIN!;
  const baseUrl = process.env.MAILGUN_BASE_URL || "https://api.mailgun.net/v3";
  const params = new URLSearchParams({
    from: process.env.MAILGUN_FROM_EMAIL || `Volley <noreply@${domain}>`,
    to: to.map((r) => r.email).join(","),
    subject,
    html,
    text,
    // Each address gets its own copy, with its own id in place of UNSUB_ID.
    "recipient-variables": JSON.stringify(Object.fromEntries(to.map((r) => [r.email, { unsub_id: r.id }]))),
    "o:tag": "newsletter",
  });
  const replyTo = process.env.MAILGUN_REPLY_TO;
  if (replyTo) params.append("h:Reply-To", replyTo);
  const res = await fetch(`${baseUrl}/${domain}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`api:${apiKey}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });
  if (!res.ok) throw new Error(`Mailgun ${res.status}: ${await res.text()}`);
}

/* To everyone subscribed, then kept in the Sent list. A batch that fails
   counts its addresses as not sent; the rest still go. */
export async function sendNewsletter(email: NewsletterEmail): Promise<Result> {
  const { supabase, user } = await requireAdmin();
  const problem = check(email);
  if (problem) return { ok: false, message: problem };
  if (!mailConfigured()) return { ok: false, message: NOT_SET_UP };

  const { data: people, error } = await supabase
    .from("newsletter_signups")
    .select("id, email")
    .eq("status", "subscribed")
    .limit(50000);
  if (error) return failed(error);
  if (!people.length) return { ok: false, message: "There's no one subscribed to send it to yet." };

  const { html, text } = renderNewsletter(email, { siteUrl: SITE(), unsubscribe: unsubscribeUrl(SITE(), UNSUB_ID) });
  const subject = email.subject.trim();
  const batches = Array.from({ length: Math.ceil(people.length / BATCH) }, (_, i) => people.slice(i * BATCH, (i + 1) * BATCH));
  const results = await Promise.allSettled(batches.map((b) => sendBatch(b, subject, html, text)));
  let notSent = 0;
  results.forEach((r, i) => {
    if (r.status === "rejected") {
      notSent += batches[i].length;
      console.error(`[sendNewsletter] batch ${i + 1} of ${batches.length}:`, r.reason);
    }
  });
  const sent = people.length - notSent;

  if (sent > 0) {
    const { error: logError } = await supabase.from("newsletter_sends").insert({
      subject,
      content: email,
      sent_by: user.email ?? "",
      recipients: sent,
      failed: notSent,
    });
    if (logError) console.error("[sendNewsletter] couldn't record the send:", logError.message);
  }
  revalidatePath("/newsletter");

  const people_ = (n: number) => `${n.toLocaleString("en-ZA")} ${n === 1 ? "person" : "people"}`;
  if (!sent) {
    const reason = results.find((r) => r.status === "rejected") as PromiseRejectedResult | undefined;
    return { ok: false, message: `Nothing was sent: ${(reason?.reason as Error)?.message ?? "the mail service said no."}` };
  }
  if (notSent) return { ok: false, message: `Sent to ${people_(sent)}, but ${people_(notSent)} didn't get it. Try again later for them.` };
  return { ok: true, message: `Sent to ${people_(sent)}.` };
}

// ---------------------------------------------------------------------------
// The welcome email
// ---------------------------------------------------------------------------

export type WelcomeSettings = { on: boolean; email: NewsletterEmail };

/* Saved as written (to edit again) and as it's sent (html and text, with
   UNSUB_ID for the website to fill in), so the website needn't draw it. */
export async function saveWelcome(value: WelcomeSettings): Promise<Result> {
  const { supabase } = await requireAdmin();
  if (value.on) {
    const problem = check(value.email);
    if (problem) return { ok: false, message: problem };
  }
  const { html, text } = renderNewsletter(value.email, { siteUrl: SITE(), unsubscribe: unsubscribeUrl(SITE(), UNSUB_ID) });
  const { data, error } = await supabase
    .from("newsletter_settings")
    .update({
      welcome_on: value.on,
      welcome: value.email,
      welcome_subject: value.email.subject.trim(),
      welcome_html: html,
      welcome_text: text,
    })
    .eq("id", 1)
    .select("id");
  if (error) return failed(error);
  if (!data.length) return { ok: false, message: "Couldn't save: run supabase/newsletter.sql again, then try once more." };
  revalidatePath("/newsletter");
  return {
    ok: true,
    message: value.on ? "Saved. New sign-ups get this email." : "Saved. The welcome email is off.",
  };
}
