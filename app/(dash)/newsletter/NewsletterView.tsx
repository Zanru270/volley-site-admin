"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, FlaskConical, Inbox, Loader2, PenLine, RotateCcw, Send, Sparkles, Users } from "lucide-react";
import { button, Card, CountChip, Empty, tab as tabClass, tabs, Toggle } from "@/components/ui";
import SaveBar from "@/components/SaveBar";
import { useSettingsForm } from "@/components/forms";
import { useConfirm } from "@/components/ConfirmProvider";
import { useToast } from "@/components/ToastProvider";
import { useLeaveGuard } from "@/lib/navigation-guard";
import { useDraftBackup, useOnline, useSaveWhenOnline } from "@/lib/offline";
import { EMPTY_EMAIL, type NewsletterEmail } from "@/lib/newsletter";
import type { Result } from "@/lib/result";
import { saveWelcome, sendNewsletter, sendTestNewsletter, type NewsletterSend, type NewsletterSignup, type WelcomeSettings } from "./actions";
import { EmailFields, EmailPreview } from "./EmailFields";
import NewsletterList from "./NewsletterList";

export type NewsletterTab = "write" | "people" | "sent" | "welcome";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "";

const people = (n: number) => `${n.toLocaleString("en-ZA")} ${n === 1 ? "person" : "people"}`;
const when = (iso: string) =>
  new Date(iso).toLocaleString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Africa/Johannesburg",
  });

/* The Newsletter page: four tabs, as on the Bow + Arc CMS. "Write an email"
   isn't saved anywhere until it's sent, but it's kept on this device
   meanwhile (and leaving asks first); the welcome email saves with the
   page's Save, like every form. */
export default function NewsletterView({
  signups,
  sends,
  welcome,
  places,
  mailReady,
  myEmail,
  initialTab,
}: {
  signups: NewsletterSignup[];
  sends: NewsletterSend[];
  welcome: WelcomeSettings;
  places: Record<string, string>;
  mailReady: boolean;
  myEmail: string;
  initialTab: NewsletterTab;
}) {
  const [tab, setTab] = useState(initialTab);
  const [draft, setDraft] = useState<NewsletterEmail>(EMPTY_EMAIL);
  const welcomeForm = useSettingsForm(welcome, saveWelcome);

  const draftDirty = JSON.stringify(draft) !== JSON.stringify(EMPTY_EMAIL);
  useLeaveGuard(draftDirty || welcomeForm.dirty);
  useDraftBackup("newsletter-email", draft, EMPTY_EMAIL, setDraft);
  useDraftBackup("newsletter-welcome", welcomeForm.value, welcomeForm.saved, welcomeForm.setValue);
  const saveOnline = useSaveWhenOnline(welcomeForm.save);

  const subscribed = signups.filter((s) => s.status === "subscribed").length;

  const go = (next: NewsletterTab) => {
    setTab(next);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", next);
    window.history.replaceState(null, "", url);
  };

  const TABS: { key: NewsletterTab; label: string; icon: React.ElementType; count?: number }[] = [
    { key: "write", label: "Write an email", icon: PenLine },
    { key: "people", label: "Subscribers", icon: Users, count: subscribed },
    { key: "sent", label: "Sent", icon: Inbox, count: sends.length },
    { key: "welcome", label: "Welcome email", icon: Sparkles },
  ];

  return (
    <>
      <div role="tablist" className={`${tabs} mb-6`}>
        {TABS.map((t) => (
          <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} onClick={() => go(t.key)} className={`${tabClass(tab === t.key)} inline-flex items-center gap-2`}>
            <t.icon className="size-3.5" />
            {t.label}
            {t.count !== undefined && t.count > 0 && <CountChip>{t.count}</CountChip>}
          </button>
        ))}
      </div>

      {!mailReady && (tab === "write" || tab === "welcome") && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-yellow bg-yellow/25 p-4 text-sm leading-relaxed text-ink/80">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <p>
            Email isn&rsquo;t set up on this admin yet, so nothing can be sent. It uses the same Mailgun settings as the waitlist emails
            (MAILGUN_API_KEY and MAILGUN_DOMAIN).
          </p>
        </div>
      )}

      {tab === "write" && (
        <Compose
          draft={draft}
          setDraft={setDraft}
          subscribed={subscribed}
          mailReady={mailReady}
          myEmail={myEmail}
          onSent={() => {
            setDraft(EMPTY_EMAIL);
            go("sent");
          }}
        />
      )}
      {tab === "people" && <NewsletterList signups={signups} places={places} />}
      {tab === "sent" && (
        <SentList
          sends={sends}
          onReuse={(email) => {
            setDraft(email);
            go("write");
          }}
          draftDirty={draftDirty}
        />
      )}
      {tab === "welcome" && <Welcome value={welcomeForm.value} onChange={welcomeForm.setValue} />}

      <SaveBar
        dirty={welcomeForm.dirty}
        pending={welcomeForm.pending}
        waiting={saveOnline.waiting}
        onSave={saveOnline.save}
        onDiscard={welcomeForm.reset}
      />
    </>
  );
}

/* Write an email: the fields and the preview side by side, then a test to
   yourself and the send to everyone. Sending waits for the mail service;
   nothing's shown as sent before it is. */
function Compose({
  draft,
  setDraft,
  subscribed,
  mailReady,
  myEmail,
  onSent,
}: {
  draft: NewsletterEmail;
  setDraft: (email: NewsletterEmail) => void;
  subscribed: number;
  mailReady: boolean;
  myEmail: string;
  onSent: () => void;
}) {
  const toast = useToast();
  const router = useRouter();
  const confirm = useConfirm();
  const online = useOnline();
  const [busy, setBusy] = useState<"test" | "send" | null>(null);
  const [, start] = useTransition();

  const run = (kind: "test" | "send", action: () => Promise<Result>, after?: () => void) => {
    setBusy(kind);
    start(async () => {
      try {
        const result = await action();
        toast.result(result, kind === "test" ? "Test sent" : "Sent");
        if (result.ok) after?.();
        router.refresh();
      } catch (err) {
        toast.error("Not sent", (err as Error).message);
      } finally {
        setBusy(null);
      }
    });
  };

  const sendAll = async () => {
    const yes = await confirm({
      title: `Send to ${people(subscribed)}?`,
      message: `“${draft.subject.trim() || "This email"}” goes to everyone subscribed, straight away. It can't be called back once it's sent. Send yourself a test first if you haven't.`,
      confirmText: "Send now",
      variant: "confirm",
    });
    if (yes) run("send", () => sendNewsletter(draft), onSent);
  };

  const clear = async () => {
    const yes = await confirm({ title: "Start again?", message: "This clears the email you're writing.", confirmText: "Clear it", variant: "danger" });
    if (yes) setDraft(EMPTY_EMAIL);
  };

  const ready = Boolean(draft.subject.trim() && (draft.body.trim() || draft.heading.trim()));
  const cantSend = !mailReady || !online || !ready || busy !== null;

  return (
    <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
      <Card
        title="Write an email"
        description="It goes to everyone subscribed. Nothing is saved until you send it, but what you write is kept on this device meanwhile."
        actions={
          JSON.stringify(draft) !== JSON.stringify(EMPTY_EMAIL) ? (
            <button type="button" onClick={clear} className={button.ghost}>
              <RotateCcw className="size-4" /> Start again
            </button>
          ) : undefined
        }
      >
        <EmailFields email={draft} onChange={setDraft} />
        <div className="mt-8 flex flex-col-reverse items-stretch justify-end gap-3 border-t border-ink/10 pt-6 sm:flex-row sm:items-center">
          {!online && <p className="mr-auto text-sm text-ink/55">You&rsquo;re offline. Sending waits until you&rsquo;re back.</p>}
          <button
            type="button"
            onClick={() => run("test", () => sendTestNewsletter(draft))}
            disabled={cantSend}
            className={button.secondary}
            title={myEmail ? `Sends it to ${myEmail}` : undefined}
          >
            {busy === "test" ? <Loader2 className="size-4 animate-spin" /> : <FlaskConical className="size-4" />}
            Send me a test
          </button>
          <button type="button" onClick={sendAll} disabled={cantSend || subscribed === 0} className={button.primary}>
            {busy === "send" ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            {busy === "send" ? "Sending…" : subscribed ? `Send to ${people(subscribed)}` : "No one to send to yet"}
          </button>
        </div>
      </Card>
      <div>
        <EmailPreview email={draft} siteUrl={SITE_URL} />
      </div>
    </div>
  );
}

/* What's been sent, newest first: when, by whom, to how many. "Use again"
   copies one into Write an email, to send a new version. */
function SentList({ sends, onReuse, draftDirty }: { sends: NewsletterSend[]; onReuse: (email: NewsletterEmail) => void; draftDirty: boolean }) {
  const confirm = useConfirm();
  const [open, setOpen] = useState<string | null>(null);

  if (!sends.length) return <Empty>Nothing sent yet. Emails you send from &ldquo;Write an email&rdquo; are listed here.</Empty>;

  const reuse = async (email: NewsletterEmail) => {
    if (draftDirty) {
      const yes = await confirm({
        title: "Replace what you're writing?",
        message: "You've started an email in Write an email. Using this one instead clears it.",
        confirmText: "Use this one",
        variant: "warning",
      });
      if (!yes) return;
    }
    onReuse(email);
  };

  return (
    <div className="divide-y divide-ink/8 overflow-hidden rounded-2xl border border-ink/10 bg-white">
      {sends.map((s) => (
        <div key={s.id}>
          <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
            <button type="button" onClick={() => setOpen(open === s.id ? null : s.id)} className="min-w-0 flex-1 cursor-pointer text-left" aria-expanded={open === s.id}>
              <p className="truncate font-medium text-ink">{s.subject}</p>
              <p className="mt-0.5 text-xs text-ink/55">
                {when(s.sent_at)}
                {s.sent_by && <> · {s.sent_by}</>} · to {people(s.recipients)}
                {s.failed > 0 && <span className="text-brick"> · {people(s.failed)} missed</span>}
              </p>
            </button>
            <div className="flex shrink-0 gap-2">
              <button type="button" onClick={() => setOpen(open === s.id ? null : s.id)} className={button.ghost}>
                {open === s.id ? "Hide" : "View"}
              </button>
              <button type="button" onClick={() => reuse(s.content)} className={button.secondary}>
                <PenLine className="size-4" /> Use again
              </button>
            </div>
          </div>
          {open === s.id && (
            <div className="animate-fade-in border-t border-ink/8 bg-bone/20 p-4">
              <EmailPreview email={s.content} siteUrl={SITE_URL} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* The welcome email: on or off, and what it says. The website sends it to
   each new sign-up (and to anyone signing back up) while it's on. */
function Welcome({ value, onChange }: { value: WelcomeSettings; onChange: (value: WelcomeSettings) => void }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
      <div className="space-y-6">
        <Card>
          <Toggle
            checked={value.on}
            onChange={(on) => onChange({ ...value, on })}
            label="Send a welcome email"
            description="Goes out by itself to everyone who signs up on the website, a moment after they do."
          />
        </Card>
        <Card title="The welcome email" description="Nothing changes until you Save.">
          <div className={value.on ? "" : "opacity-60"}>
            <EmailFields email={value.email} onChange={(email) => onChange({ ...value, email })} />
          </div>
        </Card>
      </div>
      <div>
        <EmailPreview email={value.email} siteUrl={SITE_URL} />
      </div>
    </div>
  );
}
