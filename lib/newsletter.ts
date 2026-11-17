/* The newsletter's emails: what the admin writes (NewsletterEmail) and the
   email it becomes, as HTML in the website's colours (inline styles, since
   email clients ignore stylesheets) and a plain-text copy.

   Pure, so the Newsletter page's live preview and the server that sends it
   draw the same email. The frame matches the waitlist emails
   (lib/app/emails.ts): a bone page and a white card, but with the large
   Volley logo at the top.

   The message is plain text: a blank line starts a new paragraph,
   **two stars** make bold, and web addresses become links. */

export type NewsletterEmail = {
  subject: string;
  heading: string;
  body: string;
  // An uploaded photo's address, or "" for none.
  photo: string;
  // A button under the message; left out while either part is empty.
  button: { label: string; href: string };
};

export const EMPTY_EMAIL: NewsletterEmail = { subject: "", heading: "", body: "", photo: "", button: { label: "", href: "" } };

export const DEFAULT_WELCOME: NewsletterEmail = {
  subject: "Welcome to the Volley newsletter",
  heading: "You're in.",
  body: "Thanks for signing up. We'll keep it short and worth opening: new openings, events and the odd offer from across Volley.\n\nIn the meantime, come and have a look around.",
  photo: "",
  button: { label: "Book a viewing", href: "" },
};

/* Mailgun swaps this for each person's own id as it sends a batch, giving
   everyone their own unsubscribe link; the website does the same for the
   welcome email. */
export const UNSUB_ID = "%recipient.unsub_id%";

export const unsubscribeUrl = (siteUrl: string, id = UNSUB_ID) =>
  `${siteUrl.replace(/\/+$/, "")}/newsletter/unsubscribe?id=${id}`;

// Fills in what's missing from a saved email (an older or empty row).
export const asEmail = (value: unknown, fallback: NewsletterEmail = EMPTY_EMAIL): NewsletterEmail => {
  const v = (value ?? {}) as Partial<NewsletterEmail>;
  return {
    subject: String(v.subject ?? fallback.subject),
    heading: String(v.heading ?? fallback.heading),
    body: String(v.body ?? fallback.body),
    photo: String(v.photo ?? fallback.photo),
    button: { label: String(v.button?.label ?? fallback.button.label), href: String(v.button?.href ?? fallback.button.href) },
  };
};

/* The large script "volley" logo, from the website's public files (a copy
   of its components/icons/included/Volley-Logo-Dark.png). A PNG, since
   most email clients won't show an SVG. */
const LOGO = "/images/email/volley-logo-dark.png";

const INK = "#1a1a18";
const BONE = "#e8e5d8";
const BLACK = "#272729";
const MUTED = "#6b6a63";

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const URL_RE = /\bhttps?:\/\/[^\s<]+[^\s<.,;:!?)"']/g;

// One paragraph of the message as HTML: escaped, then bold, links, line breaks.
const inline = (text: string) =>
  esc(text)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(URL_RE, (url) => `<a href="${url}" style="color:${INK};text-decoration:underline">${url}</a>`)
    .replace(/\n/g, "<br>");

const paragraphs = (body: string) =>
  body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

// A photo or link on the website itself ("/images/x.jpg") made absolute.
const absolute = (url: string, siteUrl: string) =>
  url.startsWith("/") ? `${siteUrl.replace(/\/+$/, "")}${url}` : url;

export const hasButton = (e: NewsletterEmail) => Boolean(e.button.label.trim() && e.button.href.trim());

export function renderNewsletter(email: NewsletterEmail, { siteUrl, unsubscribe }: { siteUrl: string; unsubscribe: string }) {
  const heading = email.heading.trim();
  const photo = email.photo.trim() ? absolute(email.photo.trim(), siteUrl) : "";
  const button = hasButton(email) ? { label: email.button.label.trim(), href: absolute(email.button.href.trim(), siteUrl) } : null;
  const paras = paragraphs(email.body);

  const p = (t: string) => `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${INK}">${inline(t)}</p>`;
  const html = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(email.subject)}</title></head>
<body style="margin:0;padding:0;background:${BONE};font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BONE};padding:32px 16px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff">
<tr><td align="center" style="padding:36px 32px 28px;border-bottom:1px solid ${BONE}">
<img src="${esc(absolute(LOGO, siteUrl))}" width="220" height="131" alt="Volley" style="display:block;width:220px;height:auto;border:0;margin:0 auto">
</td></tr>
${photo ? `<tr><td><img src="${esc(photo)}" width="560" alt="" style="display:block;width:100%;height:auto;border:0"></td></tr>` : ""}
<tr><td style="padding:32px">
${heading ? `<h1 style="margin:0 0 20px;font-size:24px;font-weight:normal;color:${INK}">${esc(heading)}</h1>` : ""}
${paras.map(p).join("\n")}
${
  button
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 12px"><tr><td style="background:${BLACK}">
<a href="${esc(button.href)}" style="display:inline-block;padding:14px 28px;font-size:14px;color:${BONE};text-decoration:none">${esc(button.label)}</a>
</td></tr></table>`
    : ""
}
<p style="margin:24px 0 0;font-size:15px;line-height:1.6;color:${INK}">Warm regards,<br>The Volley team</p>
</td></tr>
</table>
<p style="margin:20px 0 0;font-size:11px;line-height:1.6;color:${MUTED}">You're getting this because you signed up to the Volley newsletter.<br>
<a href="${esc(unsubscribe)}" style="color:${MUTED};text-decoration:underline">Unsubscribe</a> · Volley Group (Pty) Ltd · Nothing really ends</p>
</td></tr></table>
</body></html>`;

  const text = [
    heading,
    ...paras.map((t) => t.replace(/\*\*(.+?)\*\*/g, "$1")),
    button ? `${button.label}: ${button.href}` : "",
    "Warm regards,\nThe Volley team",
    `You're getting this because you signed up to the Volley newsletter. Unsubscribe: ${unsubscribe}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  return { html, text };
}
