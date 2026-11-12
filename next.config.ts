import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
