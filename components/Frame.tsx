"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ExternalLink, Menu, Search } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { ALL_PAGES, initials } from "@/components/nav";

/* The admin's frame: the sidebar on the bone canvas, and beside it the
   page on a rounded white sheet with a top bar. The top bar holds the page
   jump (type a page's name, Enter goes there), the website link and who's
   signed in; on phones it also opens the sidebar drawer. */
export default function Frame({
  name,
  email,
  siteUrl,
  children,
}: {
  name: string;
  email: string;
  siteUrl: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(false);

  // A new page closes the phone drawer. Deferred a frame so it doesn't
  // cascade into the navigation's render.
  useEffect(() => {
    const raf = requestAnimationFrame(() => setNavOpen(false));
    return () => cancelAnimationFrame(raf);
  }, [pathname]);

  // The page behind doesn't scroll while the phone drawer is open.
  useEffect(() => {
    document.body.style.overflow = navOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [navOpen]);

  return (
    <div className="min-h-screen bg-bone">
      <Sidebar
        name={name}
        email={email}
        siteUrl={siteUrl}
        isOpen={navOpen}
        onClose={() => setNavOpen(false)}
      />
      <div className="min-w-0 md:ml-64 md:py-3 md:pr-3">
        <div className="flex min-h-screen flex-col bg-white md:min-h-[calc(100vh-1.5rem)] md:rounded-2xl md:border md:border-ink/8">
          <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-ink/8 bg-white/90 px-4 backdrop-blur md:rounded-t-2xl md:px-8">
            <button
              type="button"
              onClick={() => setNavOpen(true)}
              aria-label="Open navigation"
              aria-expanded={navOpen}
              aria-controls="sidebar-nav"
              className="-ml-1 rounded-lg p-2 text-ink/60 transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/25 md:hidden"
            >
              <Menu className="size-5" />
            </button>
            <PageJump />
            <div className="ml-auto flex items-center gap-2">
              {siteUrl && (
                <a
                  href={siteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="View the website"
                  title="View the website"
                  className="flex size-9 items-center justify-center rounded-full border border-ink/10 text-ink/60 transition-colors hover:border-ink/30 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/25"
                >
                  <ExternalLink className="size-4" />
                </a>
              )}
              <span
                title={email}
                className="flex size-9 items-center justify-center rounded-full bg-ink font-publish text-xs text-lemon"
              >
                {initials(name || email)}
              </span>
            </div>
          </header>
          <main className="flex-1 px-4 pt-8 pb-20 md:px-8 md:pt-10 xl:px-12">
            <div className="mx-auto max-w-6xl animate-fade-in">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}

/* "Go to a page…": filters the admin's pages as you type. Arrow keys move
   through the matches, Enter opens one, Escape clears. */
function PageJump() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  const q = query.trim().toLowerCase();
  const matches = q
    ? ALL_PAGES.filter((p) => `${p.name} ${p.keywords ?? ""}`.toLowerCase().includes(q))
    : ALL_PAGES;

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const go = (href: string) => {
    setOpen(false);
    setQuery("");
    router.push(href);
  };

  return (
    <div ref={boxRef} className="relative w-full max-w-xs">
      <input
        type="search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((i) => Math.min(i + 1, matches.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => Math.max(i - 1, 0));
          } else if (e.key === "Enter" && matches[active]) {
            go(matches[active].href);
          } else if (e.key === "Escape") {
            setOpen(false);
            setQuery("");
          }
        }}
        placeholder="Go to a page…"
        aria-label="Go to a page"
        role="combobox"
        aria-expanded={open}
        aria-controls="page-jump-list"
        aria-autocomplete="list"
        className="w-full rounded-full border border-ink/10 bg-white py-2 pr-10 pl-4 text-sm text-ink outline-none transition-colors placeholder:text-ink/40 hover:border-ink/25 focus:border-ink/50"
      />
      <Search className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-ink/45" />
      {open && (
        <ul
          id="page-jump-list"
          role="listbox"
          className="absolute top-full left-0 z-40 mt-2 w-full animate-pop-in overflow-hidden rounded-xl border border-ink/10 bg-white p-1 shadow-soft"
        >
          {matches.length === 0 && (
            <li className="px-3 py-2.5 text-sm text-ink/50">No page called &quot;{query}&quot;</li>
          )}
          {matches.map((p, i) => (
            <li key={p.href} role="option" aria-selected={i === active}>
              <Link
                href={p.href}
                onClick={() => {
                  setOpen(false);
                  setQuery("");
                }}
                onMouseEnter={() => setActive(i)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${
                  i === active ? "bg-bone/50 text-ink" : "text-ink/70"
                }`}
              >
                <p.icon className="size-4 text-ink/45" strokeWidth={1.6} />
                {p.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
