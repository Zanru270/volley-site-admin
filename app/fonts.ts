import localFont from "next/font/local";

/* The website's fonts (copied from ../volley-site/app/fonts), so the admin
   reads as Volley. Same `--font-<name>-face` naming as the site: the `-face`
   suffix keeps the file variable apart from the Tailwind token in
   globals.css, which would otherwise reference itself and do nothing. */

export const saans = localFont({
  src: [
    { path: "./fonts/Saans-Light.woff", weight: "300", style: "normal" },
    { path: "./fonts/Saans-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/Saans-Bold.woff", weight: "700", style: "normal" },
  ],
  variable: "--font-saans-face",
  display: "swap",
  fallback: ["Arial", "Helvetica", "sans-serif"],
});

export const publish = localFont({
  src: [{ path: "./fonts/Publish-Regular.woff2", weight: "400", style: "normal" }],
  variable: "--font-publish-face",
  display: "swap",
  fallback: ["Georgia", "serif"],
});

export const fontVariables = [saans.variable, publish.variable].join(" ");
