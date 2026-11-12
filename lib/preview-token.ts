import "server-only";
import { createHmac } from "node:crypto";

/* Mints the short-lived token the site's preview page
   (../volley-site/app/preview/home, checked by lib/preview-token.js there;
   keep the format in step) needs before it will render. Call it only for
   a signed-in admin, after requireAdmin().

   PREVIEW_SECRET is server only (no NEXT_PUBLIC_) and must be the same
   value in both apps. */

const PREVIEW_SCOPE = "volley-preview";
const TTL_SECONDS = 2 * 60 * 60;

export type PreviewToken = { token: string } | { error: string };

export function createPreviewToken(userId: string): PreviewToken {
  const secret = process.env.PREVIEW_SECRET;
  if (!secret || secret.length < 32)
    return { error: "PREVIEW_SECRET isn't set (the same value is needed in the website's environment)." };

  const payload = Buffer.from(
    JSON.stringify({
      scope: PREVIEW_SCOPE,
      sub: userId,
      exp: Math.floor(Date.now() / 1000) + TTL_SECONDS,
    }),
  ).toString("base64url");
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return { token: `${payload}.${signature}` };
}
