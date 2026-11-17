"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, Plus } from "lucide-react";
import { button, Card, inputClass, labelClass, Toggle } from "@/components/ui";
import SaveBar from "@/components/SaveBar";
import Sortable from "@/components/Sortable";
import { RowControls, useSettingsForm } from "@/components/forms";
import { useLeaveGuard } from "@/lib/navigation-guard";
import { useDraftBackup, useSaveWhenOnline } from "@/lib/offline";
import { usePreviewFrame } from "@/components/live-editor/editorShell";
import { applyInlineEdit, FOOTER_NOT_INLINE } from "@/lib/live-editor";
import type { PreviewToken } from "@/lib/preview-token";
import { FOOTER_GROUPS, type FooterLink, type FooterSettings } from "@/lib/footer";
import { saveFooter } from "./actions";

/* The footer's links, a card per group (Company, Support, Social, the
   legal links under the logo): a row each, in the footer's order (drag, or
   the arrows), with its name, its address and an On switch. Beside them,
   the columns as the website will show them, the links that are off left
   out, and under it all the whole footer, live, as every page of the
   website ends (the website's /preview/footer, drawn from this draft).
   Nothing saves until Save, as on every form page. */
export default function FooterEditor({ initial, preview }: { initial: FooterSettings; preview: PreviewToken }) {
  const { value, setValue, saved, dirty, pending, save, reset } = useSettingsForm(initial, saveFooter);
  useLeaveGuard(dirty);
  // Unsaved changes kept on this device; Save waits out a lost connection.
  useDraftBackup("footer", value, saved, setValue);
  const saveOnline = useSaveWhenOnline(save);

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[1fr_18rem] lg:items-start">
        <div className="space-y-6">
          {FOOTER_GROUPS.map((group) => (
            <LinkGroup
              key={group.key}
              title={group.title}
              hint={group.hint}
              external={group.key === "social"}
              links={value[group.key]}
              onChange={(links) => setValue({ ...value, [group.key]: links })}
            />
          ))}
        </div>

        {/* The columns as the website will have them. */}
        <Card title="On the website" description="Each column, as it'll read once saved." className="lg:sticky lg:top-6">
          <div className="space-y-6 rounded-xl bg-pink px-5 py-6 text-black">
            {FOOTER_GROUPS.map((group) => {
              const live = value[group.key].filter((link) => link.on && link.href);
              return (
                <div key={group.key}>
                  <p className="mb-3 font-publish text-lg tracking-tight uppercase">{group.title}</p>
                  {live.length ? (
                    <ul className="flex flex-col gap-2 font-sans text-sm">
                      {live.map((link) => (
                        <li key={link.key}>{link.label || "Untitled"}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-black/55">All off: left out.</p>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <FooterFrame footer={value} preview={preview} onEdit={(key, text) => setValue((old) => applyInlineEdit(old, key, text, FOOTER_NOT_INLINE))} />

      <SaveBar dirty={dirty} pending={pending} waiting={saveOnline.waiting} onSave={saveOnline.save} onDiscard={reset} />
    </>
  );
}

/* One group's links: a row each, in order, with its name, its address and
   an On switch. `external`: web addresses only (the social links). */
function LinkGroup({
  title,
  hint,
  external,
  links,
  onChange,
}: {
  title: string;
  hint: string;
  external: boolean;
  links: FooterLink[];
  onChange: (links: FooterLink[]) => void;
}) {
  const setLink = (i: number, patch: Partial<FooterLink>) => onChange(links.map((link, j) => (j === i ? { ...link, ...patch } : link)));
  const add = () => onChange([...links, { key: `link-${Date.now()}`, label: "", href: "", on: true }]);

  return (
    <Card
      title={title}
      description={`${hint} Switch a link off to take it off the website without losing it.`}
      actions={
        <button type="button" onClick={add} className={button.secondary}>
          <Plus className="size-4" /> Add a link
        </button>
      }
    >
      {links.length === 0 ? (
        <p className="rounded-xl border border-dashed border-ink/15 px-4 py-8 text-center text-sm text-ink/50">
          No links: the footer leaves this out.
        </p>
      ) : (
        <Sortable items={links} getKey={(link) => link.key} onChange={onChange} className="space-y-3" itemClassName="rounded-xl border border-ink/10 p-4 transition-colors">
          {(link, sort) => (
            <div className={`flex flex-col gap-4 md:flex-row md:items-end ${link.on ? "" : "opacity-55"}`}>
              <label className="block space-y-1.5 md:w-44">
                <span className={labelClass}>Name</span>
                <input value={link.label} onChange={(e) => setLink(sort.index, { label: e.target.value })} className={inputClass} placeholder={external ? "Instagram" : "Contact Us"} />
              </label>
              <label className="block min-w-0 flex-1 space-y-1.5">
                <span className={labelClass}>Address</span>
                <span className="flex items-center gap-2">
                  <input
                    value={link.href}
                    onChange={(e) => setLink(sort.index, { href: e.target.value })}
                    className={inputClass}
                    placeholder={external ? "https://www.instagram.com/volleystudent/" : "/contact, or a full https:// address"}
                  />
                  {/^https?:\/\//.test(link.href) && (
                    <a href={link.href} target="_blank" rel="noopener noreferrer" className="shrink-0 rounded-lg p-2 text-ink/40 hover:bg-bone/60 hover:text-ink" title="Open it">
                      <ExternalLink className="size-4" />
                    </a>
                  )}
                </span>
              </label>
              <div className="flex items-center justify-between gap-3 md:pb-1.5">
                <div className="w-20">
                  <Toggle checked={link.on} onChange={(on) => setLink(sort.index, { on })} label={<span className="text-xs">{link.on ? "On" : "Off"}</span>} />
                </div>
                <RowControls {...sort.row} onRemove={sort.remove} removeLabel={`Remove ${link.label || "link"}`} />
              </div>
            </div>
          )}
        </Sortable>
      )}
    </Card>
  );
}

/* The whole footer, as the website draws it, following the draft as it
   changes. Laid out at a laptop's width (PAGE_WIDTH) and scaled down to
   fit the card, at the height the footer reports (the "size" message), so
   it reads like a picture of the real page, with nothing to scroll. Its
   contact details and tagline can be typed into it too; the links are set
   above. */
const PAGE_WIDTH = 1440;

function FooterFrame({
  footer,
  preview,
  onEdit,
}: {
  footer: FooterSettings;
  preview: PreviewToken;
  onEdit: (key: string, text: string) => void;
}) {
  const [height, setHeight] = useState(0);
  const [scale, setScale] = useState(1);
  const box = useRef<HTMLDivElement>(null);
  const { iframeRef, previewUrl, previewError } = usePreviewFrame({
    page: "footer",
    preview,
    draft: footer,
    highlight: null,
    onMessage: (message) => {
      if (message.type === "edit") onEdit(message.key, message.value);
      else if (message.type === "size") setHeight(message.height);
    },
  });

  // The card's width, as the window changes, over the page's.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setScale(Math.min(1, el.clientWidth / PAGE_WIDTH)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Card
      className="mt-6"
      title="The footer on the website"
      description="As every page ends, at a laptop's width, with your changes. Type into the contact details or the tagline to change them."
    >
      <div
        ref={box}
        style={{ height: height ? height * scale : undefined }}
        className={`overflow-hidden rounded-xl ring-1 ring-ink/10 ${height ? "" : "h-40 animate-pulse bg-bone/60"}`}
      >
        {previewError ? (
          <p className="p-4 text-sm text-brick">The preview isn&apos;t available: {previewError}</p>
        ) : previewUrl ? (
          <iframe
            ref={iframeRef}
            src={previewUrl}
            title="Live preview of the footer"
            // Scripts and its own origin only: no popups, navigation or forms.
            sandbox="allow-scripts allow-same-origin"
            referrerPolicy="no-referrer"
            scrolling="no"
            style={{ width: PAGE_WIDTH, height: height || 400, transform: `scale(${scale})` }}
            className={`origin-top-left border-0 bg-bone ${height ? "" : "invisible"}`}
          />
        ) : null}
      </div>
    </Card>
  );
}
