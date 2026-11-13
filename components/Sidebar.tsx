"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, LogOut, X } from "lucide-react";
import { ALL_PAGES, HOME, initials, NAV_GROUPS, type NavPage } from "@/components/nav";
import { confirmNavigation, hasNavigationGuard } from "@/lib/navigation-guard";
import { startNavigationProgress } from "@/lib/navigation-progress";

/* The sidebar, working as the Bow + Arc CMS's does. From md up it floats
   over the page as a slim rail of icons and widens over the content while
   pointed at (or reached with Tab), so pages never reflow. On the live
   editor it sits vertically centred under the editor's top bar, and the
   arrow at its head rolls it down into the admin's initials at its foot
   (remembered in this browser) so it doesn't cover the page being edited;
   a click on the initials rolls it back up. Below md it's a drawer, opened
   from the top bar. */

const OPEN_DELAY = 80;
const CLOSE_DELAY = 180;
const RAIL_COLLAPSED_KEY = "editor-rail-collapsed";

// The pages that are live editors, covering the whole window: the home
// page's, each Volley Reader article's, and each building's.
const isEditorPath = (pathname: string) =>
  pathname === "/home" || /^\/(articles|buildings)\/[^/]+$/.test(pathname);

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/25";

export default function Sidebar({
  name,
  email,
  isOpen,
  onClose,
}: {
  name: string;
  email: string;
  isOpen: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isEditor = isEditorPath(pathname);

  const [isDesktop, setIsDesktop] = useState(true); // md and up: the rail
  const [isHovered, setIsHovered] = useState(false);
  const [hasKeyboardFocus, setHasKeyboardFocus] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  // The live editor's rail, rolled down into the initials.
  const [railCollapsed, setRailCollapsed] = useState(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTabAt = useRef(0);

  const railHidden = isEditor && railCollapsed;
  const expanded = isDesktop && !railHidden && (isHovered || hasKeyboardFocus || confirmSignOut);
  // The drawer always shows its labels; the rail only while widened.
  const showLabels = !isDesktop || expanded;

  // A new page drops any half-asked sign out. Deferred a frame so it
  // doesn't cascade into the navigation's render.
  useEffect(() => {
    const raf = requestAnimationFrame(() => setConfirmSignOut(false));
    return () => cancelAnimationFrame(raf);
  }, [pathname]);

  useEffect(
    () => () => {
      if (hoverTimer.current) clearTimeout(hoverTimer.current);
    },
    [],
  );

  // Rail or drawer, by window width. The drawer closes if the window widens.
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 48rem)");
    const sync = () => {
      setIsDesktop(desktop.matches);
      if (desktop.matches) onClose();
    };
    const raf = requestAnimationFrame(sync);
    desktop.addEventListener("change", sync);
    return () => {
      cancelAnimationFrame(raf);
      desktop.removeEventListener("change", sync);
    };
  }, [onClose]);

  /* Only Tab widens the rail by focus. Chrome can mark focus restored to a
     clicked link (on returning to the window, say) as :focus-visible,
     which would otherwise leave the rail open with no pointer on it. */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Tab") lastTabAt.current = Date.now();
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, []);

  // The editor rail's tucked-away state, as last left in this browser.
  // Read after mount (the server can't know it), deferred like the above.
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      try {
        setRailCollapsed(localStorage.getItem(RAIL_COLLAPSED_KEY) === "1");
      } catch {
        // Storage blocked: start with the rail showing.
      }
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  const collapseRail = (next: boolean) => {
    setRailCollapsed(next);
    // The pointer is on the button that just moved away; mouseleave won't
    // necessarily fire, so close the widened state by hand.
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    setIsHovered(false);
    setHasKeyboardFocus(false);
    setConfirmSignOut(false);
    try {
      localStorage.setItem(RAIL_COLLAPSED_KEY, next ? "1" : "0");
    } catch {
      // Storage blocked: remembered for this page only.
    }
  };

  const hoverTo = (next: boolean) => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setIsHovered(next), next ? OPEN_DELAY : CLOSE_DELAY);
  };

  // Labels fade in once the rail has mostly widened (it clips them while
  // narrow) and out straight away.
  const fade = (visible: boolean) =>
    `transition-opacity duration-150 ${visible ? "opacity-100 delay-100" : "opacity-0"}`;

  // Leaving a screen with unsaved changes asks first, then goes if it may.
  const guardNavigation = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!hasNavigationGuard()) return;
    e.preventDefault();
    const href = e.currentTarget.getAttribute("href") ?? "/";
    void confirmNavigation().then((ok) => {
      if (!ok) return;
      startNavigationProgress(href);
      router.push(href);
    });
  };

  // The page you're on, or under; of two that both fit (/waitlist and
  // /waitlist/applications), the closer one.
  const under = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
  const isActive = (href: string) =>
    under(href) && !ALL_PAGES.some((p) => p.href.length > href.length && p.href.startsWith(href) && under(p.href));

  const link = ({ name, href, icon: Icon }: NavPage) => {
    const active = isActive(href);
    return (
      <li key={href} className="relative">
        {active && (
          <span aria-hidden="true" className="absolute top-2 bottom-2 -left-3 w-[3px] rounded-r-full bg-ink" />
        )}
        <Link
          href={href}
          title={showLabels ? undefined : name}
          aria-current={active ? "page" : undefined}
          onClick={guardNavigation}
          className={`flex h-10 items-center gap-3 rounded-xl px-2.5 text-sm transition-colors ${focusRing} ${
            active
              ? "bg-white font-medium text-ink shadow-soft"
              : "text-ink/65 hover:bg-white/50 hover:text-ink"
          }`}
        >
          <Icon className="size-[19px] shrink-0" strokeWidth={active ? 2 : 1.6} aria-hidden="true" />
          <span className={`whitespace-nowrap ${fade(showLabels)}`}>{name}</span>
        </Link>
      </li>
    );
  };

  // The links above the initials fade out as the rail rolls down into them.
  const railFade = `transition-opacity duration-200 ${railHidden ? "opacity-0" : "opacity-100 delay-100"}`;

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 animate-fade-in bg-ink/40 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        id="sidebar-nav"
        role={isOpen ? "dialog" : undefined}
        aria-modal={isOpen ? "true" : undefined}
        aria-label="Navigation"
        data-expanded={expanded || undefined}
        /* On the editor, clipped to the rail's rounded box or, rolled down,
           to exactly the initials' circle in its foot (1px border + p-3 =
           13px in from the left and bottom, size-10, in a 64px rail) with a
           tab of the rail rising 14px above it, as wide as the circle: a
           box with its foot rounded to the circle (20px) and its head
           squarer (9px), holding the arrow up. Both as inset() so the
           change animates. Rolled down, it also slides
           to the window's bottom left corner, its foot 12px off the
           bottom as its side is off the left: from its centre at 50% +
           28px, that's down by 50vh - 40px less its own height. */
        style={
          isEditor && isDesktop
            ? {
                clipPath: railHidden
                  ? "inset(calc(100% - 67px) 11px 13px 13px round 9px 9px 20px 20px)"
                  : "inset(0 0 0 0 round 16px)",
                translate: railHidden ? "0 calc(50vh - 40px - 100%)" : undefined,
              }
            : undefined
        }
        onMouseEnter={() => !railHidden && hoverTo(true)}
        onMouseLeave={() => hoverTo(false)}
        onFocus={(e) => {
          if (e.target.matches(":focus-visible") && Date.now() - lastTabAt.current < 1000)
            setHasKeyboardFocus(true);
        }}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHasKeyboardFocus(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setHasKeyboardFocus(false);
            setConfirmSignOut(false);
            (document.activeElement as HTMLElement | null)?.blur();
          }
        }}
        className={[
          "fixed z-60 flex flex-col overflow-hidden border border-ink/10 bg-bone/95 backdrop-blur-xl",
          "transition-[width,transform,translate,box-shadow,clip-path] duration-200 ease-out",
          // Rolling down into the initials, and back up.
          isEditor ? "md:duration-300 motion-reduce:transition-none" : "",
          // The phone's drawer
          "inset-y-0 left-0 w-72 rounded-r-2xl",
          isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full",
          // The floating rail, from md up
          "md:left-3 md:translate-x-0 md:rounded-2xl",
          isEditor
            ? "md:inset-y-auto md:top-[calc(50%+28px)] md:max-h-[calc(100vh-80px)] md:-translate-y-1/2"
            : "md:top-3 md:bottom-3",
          expanded
            ? "md:w-64 md:shadow-[0_12px_40px_-12px_rgb(26_26_24/0.3)]"
            : "md:w-16 md:shadow-soft",
          // The editor has its own top bar on a phone; no drawer there.
          isEditor ? "max-md:hidden" : "",
        ].join(" ")}
      >
        {/* The brand. Not on the live editor, which has its own top bar
            and wants the rail as compact as it can be. */}
        {!isEditor && (
          <div className="flex shrink-0 items-center gap-3 border-b border-ink/8 p-3">
            <Link
              href="/"
              aria-label="Dashboard"
              onClick={guardNavigation}
              className={`flex size-10 shrink-0 items-center justify-center rounded-xl bg-ink ${focusRing}`}
            >
              <Image
                src="/Volley-Logo-Small-White.svg"
                alt=""
                width={44}
                height={50}
                className="h-5 w-auto"
              />
            </Link>
            <div className={`min-w-0 flex-1 leading-tight ${fade(showLabels)}`}>
              <div className="font-publish text-lg leading-none whitespace-nowrap text-ink">Volley</div>
              <div className="mt-0.5 text-xs whitespace-nowrap text-ink/50">Website CMS</div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close navigation"
              className={`-mr-1 cursor-pointer rounded-lg p-2 text-ink/50 transition-colors hover:text-ink md:hidden ${focusRing}`}
            >
              <X className="size-4.5" aria-hidden="true" />
            </button>
          </div>
        )}

        <nav
          inert={railHidden}
          className={`min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-3 py-2 [scrollbar-width:none] ${railFade}`}
          aria-label="Main navigation"
        >
          {/* On the live editor the head of the rail rolls it down into
              the initials: "Hide" while widened, an arrow while narrow. */}
          {isEditor && (
            <button
              type="button"
              onClick={() => collapseRail(true)}
              aria-label="Hide the menu"
              className={`relative flex h-7 w-full cursor-pointer items-center rounded-lg text-ink/40 transition-colors hover:text-ink ${focusRing}`}
            >
              <span className={`flex items-center gap-1 px-2.5 text-xs whitespace-nowrap ${fade(showLabels)}`}>
                Hide the menu
                <ChevronDown className="size-3.5" aria-hidden="true" />
              </span>
              <ChevronDown className={`absolute left-3 size-4 ${fade(!showLabels)}`} aria-hidden="true" />
            </button>
          )}
          <ul className="pt-1">{link(HOME)}</ul>
          {NAV_GROUPS.map((g) => (
            <div key={g.title} className="pt-2">
              <div className="relative flex h-7 items-center" aria-hidden={!showLabels}>
                <span className={`px-2.5 text-xs whitespace-nowrap text-ink/40 ${fade(showLabels)}`}>
                  {g.title}
                </span>
                {/* A short rule in place of the label while narrow. */}
                <span className={`absolute left-3 w-4 border-t border-ink/20 ${fade(!showLabels)}`} />
              </div>
              <ul className="space-y-0.5">{g.pages.map(link)}</ul>
            </div>
          ))}
        </nav>

        {/* The rolled-down rail's tab over the initials: an arrow up, which
            rolls it back up as the initials do. Hidden from screen readers
            and Tab, which have the initials' button for that. */}
        {isEditor && (
          <button
            type="button"
            onClick={() => collapseRail(false)}
            aria-hidden="true"
            tabIndex={-1}
            className={`absolute bottom-[53px] left-[13px] flex h-3.5 w-10 cursor-pointer items-center justify-center text-ink/45 transition-[color,opacity] hover:text-ink ${
              railHidden ? "opacity-100 delay-150" : "pointer-events-none opacity-0"
            }`}
          >
            {/* A touch below centre, nearer the circle. */}
            <ChevronUp className="size-[11px] translate-y-[3px]" strokeWidth={2.75} />
          </button>
        )}

        {/* Who's signed in, and signing out. */}
        <div
          className={`shrink-0 border-t p-3 transition-colors duration-300 ${
            railHidden ? "border-transparent" : "border-ink/8"
          }`}
        >
          {!confirmSignOut ? (
            <div className="flex items-center gap-3">
              {railHidden ? (
                // All that's left of the rolled-down rail: rolls it back up.
                <button
                  type="button"
                  onClick={() => collapseRail(false)}
                  aria-label="Show the menu"
                  // No ring or hover growth: the rail is clipped to exactly
                  // this circle, and would cut either off.
                  className={`flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-ink font-publish text-xs text-lemon transition-colors select-none hover:bg-black ${focusRing}`}
                >
                  {initials(name || email)}
                </button>
              ) : (
                <span
                  title={showLabels ? undefined : email}
                  aria-hidden="true"
                  className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ink font-publish text-xs text-lemon select-none"
                >
                  {initials(name || email)}
                </span>
              )}
              <div className={`min-w-0 flex-1 leading-tight ${fade(showLabels)}`}>
                <div className="truncate text-sm font-medium text-ink">{name || "Volley admin"}</div>
                <div className="truncate text-xs text-ink/50">{email}</div>
              </div>
              <button
                type="button"
                onClick={() => setConfirmSignOut(true)}
                tabIndex={showLabels ? 0 : -1}
                aria-label="Sign out"
                title="Sign out"
                className={`shrink-0 cursor-pointer rounded-lg p-2 text-ink/50 transition-colors hover:bg-white/60 hover:text-brick ${focusRing} ${fade(showLabels)}`}
              >
                <LogOut className="size-[17px]" aria-hidden="true" />
              </button>
            </div>
          ) : (
            <form
              action="/auth/signout"
              method="post"
              onSubmit={() => setSigningOut(true)}
              className="flex min-w-[200px] animate-pop-in flex-col gap-3 rounded-xl border border-ink/8 bg-white p-3"
            >
              <span className="text-center text-xs text-ink/70">Sign out of this session?</span>
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
