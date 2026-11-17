"use client";

import { useOptimistic, useState } from "react";
import { BellOff, BellRing, Download, Trash2 } from "lucide-react";
import { useAction } from "@/components/forms";
import {
  Badge,
  button,
  CountPill,
  Empty,
  iconButton,
  iconButtonDanger,
  SearchBox,
  tab,
  tabs,
  Toolbar,
  row,
  tableHead,
  tableWrap,
  tbody,
  td,
  th,
} from "@/components/ui";
import { deleteSignup, restoreSignup, setSignupStatus, type NewsletterSignup } from "./actions";

const when = (iso: string) =>
  new Date(iso).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Johannesburg" });

type Filter = "subscribed" | "unsubscribed" | "all";
const FILTERS: { key: Filter; label: string }[] = [
  { key: "subscribed", label: "Subscribed" },
  { key: "unsubscribed", label: "Unsubscribed" },
  { key: "all", label: "Everyone" },
];

type Change = { id: string; remove: true } | { id: string; status: NewsletterSignup["status"] };

/* The sign-ups, newest first: search, filter by whether they still get
   newsletters, download as CSV, unsubscribe or re-subscribe someone, and
   remove one (straight away, with Undo on the toast). Changes show at once
   and roll back if they don't save. */
export default function NewsletterList({ signups, places }: { signups: NewsletterSignup[]; places: Record<string, string> }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("subscribed");
  const [shown, change] = useOptimistic(signups, (list, c: Change) =>
    "remove" in c ? list.filter((s) => s.id !== c.id) : list.map((s) => (s.id === c.id ? { ...s, status: c.status } : s)),
  );
  const { run } = useAction();

  const q = query.trim().toLowerCase();
  const list = shown.filter((s) => (filter === "all" || s.status === filter) && (!q || s.email.toLowerCase().includes(q)));
  const count = (f: Filter) => (f === "all" ? shown.length : shown.filter((s) => s.status === f).length);

  const remove = (s: NewsletterSignup) =>
    run(() => deleteSignup(s.id), "Removed", { label: "Undo", onClick: () => run(() => restoreSignup(s), "Put back") }, () =>
      change({ id: s.id, remove: true }),
    );
  const toggle = (s: NewsletterSignup) => {
    const status = s.status === "subscribed" ? "unsubscribed" : "subscribed";
    run(() => setSignupStatus(s.id, status), undefined, undefined, () => change({ id: s.id, status }));
  };

  if (!signups.length)
    return <Empty>No one has signed up yet. Sign-ups from the website&rsquo;s newsletter section will show here.</Empty>;

  return (
    <div>
      <Toolbar>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-1 md:flex-row md:items-center">
          <div className={tabs}>
            {FILTERS.map((f) => (
              <button key={f.key} type="button" onClick={() => setFilter(f.key)} className={tab(filter === f.key)} aria-pressed={filter === f.key}>
                {f.label} <span className="text-ink/40 tabular-nums">{count(f.key)}</span>
              </button>
            ))}
          </div>
          <SearchBox value={query} onChange={setQuery} placeholder="Search by email" />
        </div>
        <div className="flex shrink-0 items-center gap-3 self-end sm:self-auto">
          <CountPill>{list.length === 1 ? "1 person" : `${list.length} people`}</CountPill>
          <a href="/newsletter/export" className={button.secondary} download>
            <Download className="size-4" /> Download
          </a>
        </div>
      </Toolbar>
      <div className={tableWrap}>
        <table className="w-full text-left text-sm">
          <thead className={tableHead}>
            <tr>
              <th className={th}>Email</th>
              <th className={`${th} hidden md:table-cell`}>Signed up on</th>
              <th className={`${th} hidden sm:table-cell`}>Date</th>
              <th className={th}>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className={tbody}>
            {list.map((s) => (
              <tr key={s.id} className={row}>
                <td className={`${td} break-all`}>
                  <a href={`mailto:${s.email}`} className={`font-medium hover:underline ${s.status === "subscribed" ? "text-ink" : "text-ink/45"}`}>
                    {s.email}
                  </a>
                  {s.status === "unsubscribed" && (
                    <span className="ml-2 align-middle">
                      <Badge>Unsubscribed</Badge>
                    </span>
                  )}
                </td>
                <td className={`${td} hidden text-ink/60 md:table-cell`}>{places[s.source] ?? (s.source || "—")}</td>
                <td className={`${td} hidden whitespace-nowrap text-ink/60 tabular-nums sm:table-cell`}>{when(s.created_at)}</td>
                <td className={`${td} w-24 text-right whitespace-nowrap`}>
                  <button
                    type="button"
                    onClick={() => toggle(s)}
                    className={iconButton}
                    title={s.status === "subscribed" ? "Unsubscribe: stop sending them newsletters" : "Subscribe again"}
                    aria-label={s.status === "subscribed" ? `Unsubscribe ${s.email}` : `Subscribe ${s.email} again`}
                  >
                    {s.status === "subscribed" ? <BellOff className="size-4" /> : <BellRing className="size-4" />}
                  </button>
                  <button type="button" onClick={() => remove(s)} className={iconButtonDanger} title="Remove from the list" aria-label={`Remove ${s.email}`}>
                    <Trash2 className="size-4" />
                  </button>
                </td>
              </tr>
            ))}
            {!list.length && (
              <tr>
                <td colSpan={4} className={`${td} py-10 text-center text-ink/50`}>
                  {q ? <>No one matches &ldquo;{query}&rdquo;.</> : filter === "unsubscribed" ? "No one has unsubscribed." : "No one here yet."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
