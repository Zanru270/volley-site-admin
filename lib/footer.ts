/* The website's footer settings (the `footer` setting; the website's
   content/footer.json is the same shape, and its default). */

export type FooterLink = {
  // Stable id for the list, e.g. "instagram".
  key: string;
  label: string;
  // A page of the site ("/contact"), a part of one ("/#faqs"), a web
  // address, or "#" while it waits for one.
  href: string;
  // Off: hidden on the website, the others closing up.
  on: boolean;
};
export type SocialLink = FooterLink;

// The footer's groups of links, in the order the editor shows them.
export const FOOTER_GROUPS = [
  { key: "company", title: "Company", hint: "The first column." },
  { key: "support", title: "Support", hint: "The second column." },
  {
    key: "social",
    title: "Social",
    hint: "The third column. Each opens in a new tab.",
  },
  { key: "legal", title: "Legal", hint: "Under the Volley logo." },
] as const;
export type FooterGroup = (typeof FOOTER_GROUPS)[number]["key"];

export type FooterSettings = Record<FooterGroup, FooterLink[]> & {
  // The Contact Details column: a name, then an email and a phone, each a link.
  contact: { name: string; email: string; phone: string };
  // The line in the black bar at the very bottom.
  tagline: string;
};

// What the website shows until the footer is saved here.
export const DEFAULT_FOOTER: FooterSettings = {
  company: [
    {
      key: "locations",
      label: "Locations",
      href: "/#locations",
      on: true,
    },
    {
      key: "highlights",
      label: "Highlights",
      href: "/#highlights",
      on: true,
    },
    {
      key: "volley-reader",
      label: "Volley reader",
      href: "/#volley-reader",
      on: true,
    },
    {
      key: "careers",
      label: "Careers",
      href: "/careers",
      on: true,
    },
  ],
  support: [
    {
      key: "contact",
      label: "Contact Us",
      href: "/contact",
      on: true,
    },
    {
      key: "downloads",
      label: "Downloads",
      href: "#",
      on: true,
    },
    {
      key: "faqs",
      label: "FAQ's",
      href: "/#faqs",
      on: true,
    },
  ],
  social: [
    {
      key: "instagram",
      label: "Instagram",
      href: "https://www.instagram.com/volleystudent/",
      on: true,
    },
    {
      key: "facebook",
      label: "Facebook",
      href: "https://www.facebook.com/volleystudentliving/",
      on: true,
    },
    {
      key: "tiktok",
      label: "TikTok",
      href: "https://www.tiktok.com/@volleystudent",
      on: true,
    },
    {
      key: "linkedin",
      label: "LinkedIn",
      href: "https://www.linkedin.com/company/volleystudent/",
      on: true,
    },
  ],
  legal: [
    {
      key: "terms",
      label: "Terms & Conditions",
      href: "/terms-and-conditions",
      on: true,
    },
    {
      key: "cookies",
      label: "Cookie Settings",
      href: "#",
      on: true,
    },
    {
      key: "accessibility",
      label: "Accessibility",
      href: "#",
      on: true,
    },
  ],
  contact: {
    name: "Elaine Veldman",
    email: "elaine@bowandarc.co.za",
    phone: "076 609 2426",
  },
  tagline: "Nothing really ends",
};
