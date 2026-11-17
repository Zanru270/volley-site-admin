import {
  Briefcase,
  Building2,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  ClipboardList,
  FileText,
  Home,
  Inbox,
  LayoutDashboard,
  Mail,
  PanelBottom,
  UserSearch,
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
      { name: "Articles", href: "/articles", icon: FileText, keywords: "volley reader goings on events blog news" },
      { name: "Footer", href: "/footer", icon: PanelBottom, keywords: "social links instagram facebook tiktok linkedin" },
      { name: "Newsletter", href: "/newsletter", icon: Mail, keywords: "sign-ups subscribers emails mailing list" },
    ],
  },
  // Tours: who's coming to see a building, and the times they can book.
  {
    title: "Tours",
    pages: [
      {
        name: "Tour bookings",
        href: "/bookings",
        icon: CalendarCheck,
        keywords: "book a tour viewings visits visitors bookings appointments",
      },
      { name: "Viewing schedule", href: "/schedule", icon: CalendarClock, keywords: "tours times hosts capacity" },
    ],
  },
  // The waitlist: the people who've applied, their interviews, and the form they use.
  {
    title: "Waitlist",
    pages: [
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
      { name: "Waitlist form", href: "/waitlist", icon: ClipboardList, keywords: "apply form wording" },
    ],
  },
  {
    title: "Careers",
    pages: [
      {
        name: "Careers page",
        href: "/careers",
        icon: FileText,
        keywords: "careers wording work at volley manifesto",
      },
      { name: "Jobs", href: "/careers/jobs", icon: Briefcase, keywords: "careers jobs openings roles vacancies hiring" },
      {
        name: "Job applications",
        href: "/careers/applications",
        icon: UserSearch,
        keywords: "careers cv cvs applicants candidates hiring interviews",
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
