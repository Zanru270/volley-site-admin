"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarClock,
  ClipboardList,
  ExternalLink,
  FileText,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  MapPin,
  Megaphone,
  Menu,
  Users,
  X,
} from "lucide-react";

/* The Bow + Arc CMS's sidebar, in Volley ink with the site's pink for the
   current page: fixed on the left from md
   up, a drawer behind a top bar on phones. `divider` entries draw a thin
   line between groups of pages. */

type NavItem =
  | { name: string; href: string; icon: React.ElementType }
  | { divider: true };

const NAV: NavItem[] = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { divider: true },
  { name: "Banner", href: "/banner", icon: Megaphone },
  { name: "Volley Reader", href: "/articles", icon: FileText },
  { name: "FAQs", href: "/faqs", icon: HelpCircle },
  { name: "Locations", href: "/locations", icon: MapPin },
  { divider: true },
  { name: "Viewing Schedule", href: "/schedule", icon: CalendarClock },
  { name: "Waitlist Form", href: "/waitlist", icon: ClipboardList },
  { divider: true },
  { name: "Team", href: "/team", icon: Users },
];

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bone/40";

export default function Sidebar({
  email,
  siteUrl,
}: {
  email: string;
  siteUrl: string;
}) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // A new page closes the phone drawer and any half-asked sign out.
  // Deferred a frame so it doesn't cascade into the navigation's render.
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setIsOpen(false);
      setConfirmSignOut(false);
    });
    return () => cancelAnimationFrame(raf);
  }, [pathname]);

  // The page behind doesn't scroll while the phone drawer is open.
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  const linkClass = (active: boolean) =>
    [
      "group flex items-center gap-3 rounded-sm border-l-2 px-3 py-2.5 text-sm transition-colors duration-150",
      focusRing,
      active
        ? "border-pink bg-pink/15 font-medium text-pink"
        : "border-transparent text-bone/55 hover:bg-bone/5 hover:text-bone",
    ].join(" ");

  const brand = (
    <span className="flex items-center gap-3 select-none">
      <Image src="/Volley-Logo-Small-White.svg" alt="Volley" width={44} height={36} className="h-6 w-auto" />
      <span className="font-publish text-lg tracking-widest text-bone uppercase">CMS</span>
    </span>
  );

  return (
    <>
      {/* Phone: a top bar with the menu button. */}
      <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center gap-4 border-b border-bone/10 bg-ink px-4 md:hidden">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Open navigation"
          aria-expanded={isOpen}
          aria-controls="sidebar-nav"
          className={`-ml-1 rounded-sm p-1.5 text-bone/60 transition-colors hover:text-bone ${focusRing}`}
        >
          <Menu className="size-5" />
        </button>
        {brand}
      </header>

      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-ink/60 backdrop-blur-[2px] md:hidden"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        id="sidebar-nav"
        aria-label="Navigation"
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-ink text-bone/70 transition-transform duration-300 ease-in-out will-change-transform md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-bone/10 px-5">
          {brand}
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            aria-label="Close navigation"
            className={`-mr-2 rounded-sm p-2 text-bone/50 transition-colors hover:text-bone md:hidden ${focusRing}`}
          >
            <X className="size-4.5" />
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-5" aria-label="Main navigation">
          {NAV.map((item, i) => {
            if ("divider" in item)
              return <div key={`divider-${i}`} role="separator" className="my-3 border-t border-bone/10" />;
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={linkClass(active)}
              >
                <Icon className="size-4.25 shrink-0" strokeWidth={active ? 2 : 1.5} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="shrink-0 space-y-0.5 border-t border-bone/10 px-3 py-4">
          {siteUrl && (
            <a href={siteUrl} target="_blank" rel="noopener noreferrer" className={linkClass(false)}>
              <ExternalLink className="size-4.25 shrink-0" strokeWidth={1.5} />
              View Website
            </a>
          )}
          {!confirmSignOut ? (
            <button
              type="button"
              onClick={() => setConfirmSignOut(true)}
              className={`${linkClass(false)} w-full cursor-pointer text-left`}
            >
              <LogOut className="size-4.25 shrink-0" strokeWidth={1.5} />
              Sign Out
            </button>
          ) : (
            <form
              action="/auth/signout"
              method="post"
              onSubmit={() => setSigningOut(true)}
              className="flex animate-pop-in flex-col gap-3 rounded-sm border border-bone/15 bg-bone/5 p-3"
            >
              <span className="text-center text-xs tracking-wide text-bone/70">
                Sign out of this session?
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmSignOut(false)}
                  disabled={signingOut}
                  className={`flex-1 cursor-pointer rounded-sm bg-bone/10 px-2 py-2 text-xs text-bone transition-colors hover:bg-bone/20 disabled:opacity-50 ${focusRing}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={signingOut}
                  className="flex-1 cursor-pointer rounded-sm bg-brick px-2 py-2 text-xs text-white transition-colors hover:bg-red disabled:opacity-50"
                >
                  {signingOut ? "Signing out…" : "Sign Out"}
                </button>
              </div>
            </form>
          )}
          <p className="truncate px-3 pt-2 text-[11px] text-bone/35">{email}</p>
        </div>
      </aside>
    </>
  );
}
