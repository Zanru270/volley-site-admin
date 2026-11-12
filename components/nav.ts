import {
  Building2,
  CalendarClock,
  CalendarDays,
  ClipboardList,
  FileText,
  Home,
  Inbox,
  LayoutDashboard,
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
      {
        name: "Home page",
        href: "/home",
        icon: Home,
        keywords: "banner announcement hero video welcome highlights reviews faqs questions text wording",
      },
      { name: "Buildings", href: "/buildings", icon: Building2, keywords: "locations residences rooms fees" },
      { name: "Volley Reader", href: "/articles", icon: FileText, keywords: "articles blog news" },
    ],
  },
  {
    title: "Bookings",
    pages: [
      { name: "Viewing schedule", href: "/schedule", icon: CalendarClock, keywords: "tours times" },
      { name: "Waitlist form", href: "/waitlist", icon: ClipboardList, keywords: "apply" },
      {
        name: "Applications",
        href: "/waitlist/applications",
        icon: Inbox,
        keywords: "waitlist sign-ups applicants apply people",
      },
      {
        name: "Interviews",
        href: "/waitlist/interviews",
        icon: CalendarDays,
        keywords: "interview calendar schedule elaine",
      },
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
