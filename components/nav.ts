import {
  CalendarClock,
  ClipboardList,
  FileText,
  HelpCircle,
  LayoutDashboard,
  MapPin,
  Megaphone,
  Users,
} from "lucide-react";

/* Every page in the admin, grouped as the sidebar shows them. The top
   bar's page jump searches the same list. */

export type NavPage = {
  name: string;
  href: string;
  icon: React.ElementType;
  // Extra words the page jump matches on.
  keywords?: string;
};

export const HOME: NavPage = { name: "Dashboard", href: "/", icon: LayoutDashboard };

export const NAV_GROUPS: { title: string; pages: NavPage[] }[] = [
  {
    title: "Website",
    pages: [
      { name: "Banner", href: "/banner", icon: Megaphone, keywords: "announcement strip" },
      { name: "Volley Reader", href: "/articles", icon: FileText, keywords: "articles blog news" },
      { name: "FAQs", href: "/faqs", icon: HelpCircle, keywords: "questions" },
      { name: "Locations", href: "/locations", icon: MapPin, keywords: "residences rooms fees" },
    ],
  },
  {
    title: "Bookings",
    pages: [
      { name: "Viewing schedule", href: "/schedule", icon: CalendarClock, keywords: "tours times" },
      { name: "Waitlist form", href: "/waitlist", icon: ClipboardList, keywords: "apply" },
    ],
  },
  {
    title: "Admin",
    pages: [{ name: "Team", href: "/team", icon: Users, keywords: "admins people access" }],
  },
];

export const ALL_PAGES = [HOME, ...NAV_GROUPS.flatMap((g) => g.pages)];

export const initials = (nameOrEmail: string) =>
  nameOrEmail
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
