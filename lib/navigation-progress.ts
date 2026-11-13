/* Starts the bar along the top of the admin (components/NavigationProgress)
   while the next page is on its way. Plain links start it themselves; code
   that navigates with router.push (after confirmNavigation, or after a
   save) calls startNavigationProgress with the same href first. Going to
   the page you're already on starts nothing, since no new page would
   arrive to finish it. */

type Listener = () => void;

const listeners = new Set<Listener>();

export function startNavigationProgress(href: string) {
  const next = new URL(href, window.location.href);
  if (next.origin !== window.location.origin || next.pathname === window.location.pathname) return;
  listeners.forEach((listener) => listener());
}

// Subscribes the bar; returns the unsubscribe.
export function onNavigationStart(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
