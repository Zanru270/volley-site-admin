import type { Metadata } from "next";
import { Mail } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { Card, PageHeader } from "@/components/ui";
import { buildingName } from "@/lib/site";
import { mailConfigured } from "@/lib/app/mailgun";
import { asEmail, DEFAULT_WELCOME } from "@/lib/newsletter";
import type { NewsletterSend, NewsletterSignup } from "./actions";
import NewsletterView, { type NewsletterTab } from "./NewsletterView";

export const metadata: Metadata = { title: "Newsletter" };

const TABS: NewsletterTab[] = ["write", "people", "sent", "welcome"];

/* The newsletter, as the Bow + Arc CMS has it: write an email and send it
   to everyone subscribed, the list of who's signed up through the
   website's "Not another boring newsletter" section, what's been sent, and
   the welcome email each new sign-up gets. `?tab=` opens on one. */
export default async function NewsletterPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const { supabase, user } = await requireAdmin();
  const header = (
    <PageHeader
      icon={Mail}
      title="Newsletter"
      description="Email everyone who has signed up through the website's newsletter section, on the home page or a building's page."
    />
  );
  const [signups, sends, settings, buildings] = await Promise.all([
    supabase.from("newsletter_signups").select("*").order("created_at", { ascending: false }).limit(5000),
    supabase.from("newsletter_sends").select("*").order("sent_at", { ascending: false }).limit(200),
    supabase.from("newsletter_settings").select("welcome_on, welcome").eq("id", 1).maybeSingle(),
    supabase.from("locations").select("slug, name"),
  ]);
  const error = signups.error ?? sends.error ?? settings.error;
  if (error)
    return (
      <>
        {header}
        <Card title="Not set up yet">
          <p className="text-sm leading-relaxed text-ink/70">
            The newsletter isn&rsquo;t in the database yet. Run{" "}
            <code className="rounded bg-bone px-1">supabase/newsletter.sql</code> once, in Supabase &gt; SQL Editor, then
            reload. Until then, sign-ups on the website can&rsquo;t be saved. ({error.message})
          </p>
        </Card>
      </>
    );

  // Where they signed up, by name: "Home page", or the building's.
  const places: Record<string, string> = { home: "Home page" };
  for (const b of buildings.data ?? []) places[b.slug] = buildingName(b);

  const saved = settings.data?.welcome;
  const welcome = {
    on: Boolean(settings.data?.welcome_on),
    // Never saved: start from a suggested welcome.
    email: saved && Object.keys(saved).length ? asEmail(saved) : DEFAULT_WELCOME,
  };

  return (
    <>
      {header}
      <NewsletterView
        signups={signups.data as NewsletterSignup[]}
        sends={(sends.data as NewsletterSend[]).map((s) => ({ ...s, content: asEmail(s.content) }))}
        welcome={welcome}
        places={places}
        mailReady={mailConfigured()}
        myEmail={user.email ?? ""}
        initialTab={TABS.includes(tab as NewsletterTab) ? (tab as NewsletterTab) : "write"}
      />
    </>
  );
}
