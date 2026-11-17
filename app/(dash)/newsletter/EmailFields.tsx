"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Maximize2, Monitor, Smartphone, X } from "lucide-react";
import ImageUploader from "@/components/ImageUploader";
import { button, Field, iconButton, inputClass, tab, tabs, textareaClass } from "@/components/ui";
import { renderNewsletter, type NewsletterEmail } from "@/lib/newsletter";

/* One email's fields (subject, heading, photo, message, button), shared by
   "Write an email" and "Welcome email", and the email as people will get
   it beside them. */

export function EmailFields({ email, onChange }: { email: NewsletterEmail; onChange: (email: NewsletterEmail) => void }) {
  const set = (patch: Partial<NewsletterEmail>) => onChange({ ...email, ...patch });
  return (
    <div className="space-y-6">
      <Field label="Subject" hint="What they see in their inbox, before opening it.">
        <input value={email.subject} onChange={(e) => set({ subject: e.target.value })} className={inputClass} maxLength={150} />
      </Field>
      <Field label="Heading" hint="Optional. The big line at the top of the email.">
        <input value={email.heading} onChange={(e) => set({ heading: e.target.value })} className={inputClass} maxLength={150} />
      </Field>
      <div className="space-y-1.5">
        <span className="block text-[13px] font-medium text-ink/70">Photo</span>
        <ImageUploader
          value={email.photo || null}
          onChange={(url) => set({ photo: url ?? "" })}
          recommendedWidth={1120}
          slotLabel="email photos"
          label="Add a photo"
          folder="newsletter"
        />
        <span className="block text-xs text-ink/50">Optional. Across the top of the email, under the Volley name.</span>
      </div>
      <Field
        label="Message"
        hint={
          <>
            Leave a blank line between paragraphs. Put <strong className="font-medium text-ink/70">**two stars**</strong> around words to make them
            bold; web addresses become links. &ldquo;Warm regards, The Volley team&rdquo; and an unsubscribe link are added at the end.
          </>
        }
      >
        <textarea rows={10} value={email.body} onChange={(e) => set({ body: e.target.value })} className={textareaClass} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-[14rem_1fr]">
        <Field label="Button" hint="Optional.">
          <input
            value={email.button.label}
            onChange={(e) => set({ button: { ...email.button, label: e.target.value } })}
            className={inputClass}
            placeholder="Book a viewing"
            maxLength={40}
          />
        </Field>
        <Field label="Button link" hint="Where it goes: a full web address, or a page on the website like /locations/brooklyn.">
          <input
            value={email.button.href}
            onChange={(e) => set({ button: { ...email.button, href: e.target.value } })}
            className={inputClass}
            placeholder="https://"
            inputMode="url"
          />
        </Field>
      </div>
    </div>
  );
}

/* The email drawn exactly as it'll be sent, in a frame so its own styles
   stay its own, as tall as the email (no scrolling inside a small box).
   "Full screen" opens it over the page, at a phone's width or a desktop's.
   Links in it don't go anywhere here. */
export function EmailPreview({ email, siteUrl }: { email: NewsletterEmail; siteUrl: string }) {
  const [full, setFull] = useState(false);
  const html = useMemo(() => {
    const { html } = renderNewsletter(email, { siteUrl, unsubscribe: "#" });
    // Keep clicks inside the preview from opening anything.
    return html.replace("<head>", "<head><style>a{pointer-events:none}html,body{overflow:hidden}</style>");
  }, [email, siteUrl]);
  return (
    <section className="overflow-hidden rounded-2xl border border-ink/10 bg-white">
      <header className="flex items-start justify-between gap-4 border-b border-ink/10 px-5 py-4">
        <div className="min-w-0">
          <h2 className="text-[15px] font-medium text-ink">Preview</h2>
          <p className="mt-1 truncate text-sm text-ink/50">{email.subject.trim() ? `Subject: ${email.subject.trim()}` : "No subject yet."}</p>
        </div>
        <button type="button" onClick={() => setFull(true)} className={button.secondary}>
          <Maximize2 className="size-4" /> Full screen
        </button>
      </header>
      <FittedFrame html={html} className="bg-bone" />
      {full && <FullScreenPreview html={html} subject={email.subject} onClose={() => setFull(false)} />}
    </section>
  );
}

/* An iframe as tall as what's in it, measured each time it loads. Same
   origin so it can be measured, but no scripts run in it. */
function FittedFrame({ html, className = "" }: { html: string; className?: string }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(720);
  const measure = () => {
    const doc = ref.current?.contentDocument;
    if (doc) setHeight(Math.max(480, doc.documentElement.scrollHeight));
  };
  // A photo loading later makes the email taller.
  useEffect(() => {
    const doc = ref.current?.contentDocument;
    if (!doc) return;
    const imgs = [...doc.images];
    imgs.forEach((img) => img.addEventListener("load", measure));
    return () => imgs.forEach((img) => img.removeEventListener("load", measure));
  });
  return (
    <iframe
      ref={ref}
      title="Email preview"
      srcDoc={html}
      sandbox="allow-same-origin"
      onLoad={measure}
      style={{ height }}
      className={`block w-full ${className}`}
    />
  );
}

function FullScreenPreview({ html, subject, onClose }: { html: string; subject: string; onClose: () => void }) {
  const [width, setWidth] = useState<"desktop" | "phone">("desktop");
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);
  return createPortal(
    <div className="fixed inset-0 z-110 flex animate-fade-in flex-col bg-ink/50 p-3 backdrop-blur-sm md:p-6" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label="Email preview" className="mx-auto flex h-full w-full max-w-6xl animate-pop-in flex-col overflow-hidden rounded-2xl bg-white shadow-soft">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 px-5 py-3">
          <p className="min-w-0 truncate text-sm text-ink/60">
            <span className="font-medium text-ink">Preview</span>
            {subject.trim() && <> · {subject.trim()}</>}
          </p>
          <div className="flex items-center gap-3">
            <div className={tabs}>
              <button type="button" onClick={() => setWidth("desktop")} className={`${tab(width === "desktop")} inline-flex items-center gap-1.5`} aria-pressed={width === "desktop"}>
                <Monitor className="size-3.5" /> Desktop
              </button>
              <button type="button" onClick={() => setWidth("phone")} className={`${tab(width === "phone")} inline-flex items-center gap-1.5`} aria-pressed={width === "phone"}>
                <Smartphone className="size-3.5" /> Phone
              </button>
            </div>
            <button type="button" onClick={onClose} className={iconButton} aria-label="Close the preview">
              <X className="size-5" />
            </button>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto bg-bone/60">
          <div className={`mx-auto transition-[max-width] duration-300 ${width === "phone" ? "my-6 max-w-[390px] overflow-hidden rounded-[2rem] border-8 border-ink shadow-soft" : "max-w-none"}`}>
            <FittedFrame html={html} className="bg-bone" />
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
