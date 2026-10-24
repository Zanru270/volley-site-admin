/* The content shapes, the same in Supabase and in the main site's
   content/*.json files (../volley-site/content/README.md describes each). */

export type Banner = {
  enabled: boolean;
  text: string;
  linkText: string;
  linkHref: string;
  after: string;
};

/* The "Apply now" waitlist form's wording (settings 'waitlist_form');
   ../volley-site/content/waitlist.json has the defaults. */
export type WaitlistForm = {
  sticker: string;
  eyebrow: string;
  headline: string;
  intro: string;
  sections: { details: string; preferences: string; parent: string };
  note: string;
  unitTypes: string[];
  privacy: string;
  button: string;
  thanks: { eyebrow: string; headline: string; message: string };
};

export type ViewingSlot = {
  from: string;
  to: string;
  houses: string[];
  hosts: string;
};
export type ViewingGroup = {
  days: string;
  weekdays: number[];
  slots: ViewingSlot[];
};
export type Viewings = {
  schedule: ViewingGroup[];
  rules: {
    minutes: number;
    step: number;
    noticeHours: number;
    bookAheadDays: number;
    capacity: number;
    closed: string[];
  };
};

export type FaqRow = {
  id: string;
  tab: "cool" | "boring";
  category: string;
  question: string;
  answer: string;
  list: string[];
};

export type ArticleBlock =
  | { type: "lead" | "paragraph" | "quote"; text: string }
  | { type: "image"; src: string; alt: string }
  | { type: "gallery"; images: { src: string; alt: string }[] }
  | { type: "section"; heading: string; paragraphs: string[] };

export type Article = {
  id: string;
  slug: string;
  title: string;
  location: string;
  meta: string;
  category: string;
  excerpt: string;
  image: string;
  hero: string;
  aspect: string;
  body: ArticleBlock[];
  published: boolean;
  sort: number;
  updated_at?: string;
};

export type RoomType = {
  label: string;
  description: string;
  images: { src: string; alt: string }[];
  fee: number | null;
  availability: string;
  badgeColor: string;
  feeNote: string;
};
export type Location = {
  slug: string;
  address: string | null;
  description: string | string[] | null;
  pricelist: string | null;
  stats: { value: string; label: string }[] | null;
  rooms: { intro: string; paymentPlans: number[]; types: RoomType[] } | null;
  updated_at?: string;
};
