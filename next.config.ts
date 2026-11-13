import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* A screen visited in the last minute opens straight from the browser's
     copy instead of waiting on the server. Every save drops those copies
     (lib/revalidate.ts, and the waitlist screens refresh themselves), so
     only someone else's change can take up to a minute to show. */
  experimental: {
    staleTimes: { dynamic: 60 },
  },
  /* Old addresses, kept working for bookmarks: Locations was renamed
     Buildings, and the FAQs and the banner moved into the Home page's
     editor. */
  async redirects() {
    return [
      { source: "/locations", destination: "/buildings", permanent: true },
      { source: "/faqs", destination: "/home?open=faqs.list", permanent: false },
      { source: "/banner", destination: "/home?open=banner", permanent: false },
    ];
  },
};

export default nextConfig;
