import "server-only";

/* Copied from the Volley app's admin (src/lib/mailgun.ts): keep the two in step.

   Sends one email through Mailgun, the same way (and with the same env
   names) as the Bow + Arc CMS's broadcast route. Server env only, never
   NEXT_PUBLIC_. The region defaults to the US API; an EU account sets
   MAILGUN_BASE_URL=https://api.eu.mailgun.net/v3. */

export function mailConfigured() {
  return Boolean(process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN);
}

/* `attachment`: a file sent with it (this admin's addition: an interview's
   .ics calendar invite), which makes it a multipart request. */
export async function sendMail({
  to,
  subject,
  html,
  text,
  attachment,
}: {
  to: string;
  subject: string;
  html: string;
  text: string;
  attachment?: { filename: string; content: string; contentType: string };
}) {
  const apiKey = process.env.MAILGUN_API_KEY;
  const domain = process.env.MAILGUN_DOMAIN;
  const baseUrl = process.env.MAILGUN_BASE_URL || "https://api.mailgun.net/v3";
  if (!apiKey || !domain)
    throw new Error("Mailgun isn't set up: set MAILGUN_API_KEY and MAILGUN_DOMAIN in .env.local.");

  const params = new URLSearchParams({
    from: process.env.MAILGUN_FROM_EMAIL || `Volley <noreply@${domain}>`,
    to,
    subject,
    html,
    text,
  });
  const replyTo = process.env.MAILGUN_REPLY_TO;
  if (replyTo) params.append("h:Reply-To", replyTo);

  const auth = `Basic ${Buffer.from(`api:${apiKey}`).toString("base64")}`;
  let body: string | FormData = params.toString();
  const headers: Record<string, string> = { Authorization: auth };
  if (attachment) {
    const form = new FormData();
    for (const [key, value] of params) form.append(key, value);
    form.append("attachment", new Blob([attachment.content], { type: attachment.contentType }), attachment.filename);
    body = form;
  } else headers["Content-Type"] = "application/x-www-form-urlencoded";

  const res = await fetch(`${baseUrl}/${domain}/messages`, { method: "POST", headers, body });
  if (!res.ok) throw new Error(`Mailgun ${res.status}: ${await res.text()}`);
}
