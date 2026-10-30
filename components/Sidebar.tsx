"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ExternalLink, LogOut, X } from "lucide-react";
import { HOME, initials, NAV_GROUPS, type NavPage } from "@/components/nav";

/* The sidebar sits on the bone canvas beside the page's white sheet: the
   logo, who's signed in, the pages in their groups (the current one a
   white pill), and a card at the foot for the website and signing out.
   Fixed on the left from md up; a drawer on phones, opened from the top
   bar. */

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/25";

export default function Sidebar({
  name,
  email,
  siteUrl,
  isOpen,
  onClose,
}: {
  name: string;
  email: string;
  siteUrl: string;
  isOpen: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // A new page drops any half-asked sign out. Deferred a frame so it
  // doesn't cascade into the navigation's render.
  useEffect(() => {
    const raf = requestAnimationFrame(() => setConfirmSignOut(false));
    return () => cancelAnimationFrame(raf);
  }, [pathname]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  const link = ({ name, href, icon: Icon }: NavPage) => {
    const active = isActive(href);
    return (
      <Link
        key={href}
        href={href}
        aria-current={active ? "page" : undefined}
        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${focusRing} ${
          active
            ? "bg-white font-medium text-ink shadow-soft"
            : "text-ink/65 hover:bg-white/50 hover:text-ink"
        }`}
      >
        <Icon className="size-4 shrink-0" strokeWidth={active ? 2 : 1.6} />
        {name}
      </Link>
    );
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 animate-fade-in bg-ink/40 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        id="sidebar-nav"
        aria-label="Navigation"
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-bone transition-transform duration-300 ease-in-out will-change-transform md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-18 shrink-0 items-center justify-between px-6">
          <Link href="/" className={`flex items-center gap-2.5 rounded-md ${focusRing}`}>
            <Image
              src="/Volley-Logo-Small-White.svg"
              alt="Volley"
              width={44}
              height={50}
              className="h-7 w-auto brightness-0"
            />
            <span className="font-publish text-[1.35rem] leading-none text-ink">CMS</span>
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className={`-mr-2 rounded-lg p-2 text-ink/50 transition-colors hover:text-ink md:hidden ${focusRing}`}
          >
            <X className="size-4.5" />
          </button>
        </div>

        {/* Who's signed in. */}
        <div className="mx-4 flex items-center gap-3 rounded-xl border border-ink/8 bg-white/70 p-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-ink font-publish text-sm text-lemon">
            {initials(name || email)}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium text-ink">{name || "Volley admin"}</span>
            <span className="block truncate text-xs text-ink/50">{email}</span>
          </span>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 pt-5 pb-4" aria-label="Main navigation">
          {link(HOME)}
          {NAV_GROUPS.map((g) => (
            <div key={g.title} className="mt-6">
              <p className="mb-1.5 px-3 text-xs text-ink/40">{g.title}</p>
              <div className="space-y-0.5">{g.pages.map(link)}</div>
            </div>
          ))}
        </nav>

        <div className="m-4 mt-0 shrink-0 rounded-xl border border-ink/8 bg-white p-3">
          {!confirmSignOut ? (
            <>
              {siteUrl && (
                <a
                  href={siteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center justify-between rounded-md px-1 py-1 text-sm text-ink ${focusRing}`}
                >
                  View the website
                  <ExternalLink className="size-3.5 text-ink/40" />
                </a>
              )}
              {siteUrl && <div className="my-2 h-px bg-ink/8" />}
              <button
                type="button"
                onClick={() => setConfirmSignOut(true)}
                className={`flex w-full cursor-pointer items-center gap-2 rounded-md px-1 py-1 text-left text-xs text-ink/50 transition-colors hover:text-brick ${focusRing}`}
              >
                <LogOut className="size-3.5" /> Sign out
              </button>
            </>
          ) : (
            <form
              action="/auth/signout"
              method="post"
              onSubmit={() => setSigningOut(true)}
              className="flex animate-pop-in flex-col gap-3"
            >
              <span className="text-sm text-ink">Sign out of this session?</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmSignOut(false)}
                  disabled={signingOut}
                  className={`flex-1 cursor-pointer rounded-lg bg-bone/70 px-2 py-2 text-xs text-ink transition-colors hover:bg-bone disabled:opacity-50 ${focusRing}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={signingOut}
                  className={`flex-1 cursor-pointer rounded-lg bg-brick px-2 py-2 text-xs text-white transition-colors hover:bg-red disabled:opacity-50 ${focusRing}`}
                >
                  {signingOut ? "Signing out…" : "Sign out"}
                </button>
              </div>
            </form>
          )}
        </div>
      </aside>
    </>
  );
}
