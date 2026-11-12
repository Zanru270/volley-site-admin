# Volley Admin

The CMS for the Volley website (`../volley-site`): it controls how the
website looks and reads. Both apps share one Supabase project.

People aren't managed here. Tour bookings and waitlist sign-ups go from the
website straight to the **Volley app's** Supabase project, and the app's
admin works through them (`../../volley-app-admin-panel`).

## How it works

```
 admin (this app)  ── saves to ──▶  Supabase  ◀── reads (cached) ──  website
        │                                                              ▲
        └──── POST /api/revalidate?tag=… ("this changed") ─────────────┘
```

- The **website** stays static and fast. Every content read is cached under
  a tag (`../volley-site/lib/cache-tags.js`), so a page makes no database
  call per visit.
- A **save here** writes to Supabase, then pings the website with that tag.
  The website drops just that cached piece, and the next visit shows the
  change. No redeploy needed.
- **If Supabase is down or not set up**, the website falls back to
  `../volley-site/content/*.json`.

Security lives in the database (`supabase/schema.sql`): the public can only
read content. Only emails listed in `admin_users` can change anything.

## First-time setup

1. **Create the tables.** In Supabase > SQL Editor > New query, paste all of
   `supabase/schema.sql` and click Run.
2. **Turn off public sign-ups.** In Supabase > Authentication > Sign In /
   Providers, switch off "Allow new users to sign up". Admins are added from
   the Team page instead.
3. **Add the service role key.** Copy it from Supabase > Project Settings >
   API Keys (`service_role`) into `SUPABASE_SERVICE_ROLE_KEY` in
   `.env.local`. The other values are already filled in from the website's
   `.env.local`.
4. **Create your login:**
   ```bash
   npm run create-admin -- you@example.com "a long password" "Your name"
   ```
5. **Copy the website's current content into Supabase:**
   ```bash
   npm run seed
   ```
6. **Run both apps:**
   ```bash
   cd ../volley-site && npm run dev        # website, http://localhost:3000
   cd ../volley-site-admin && npm run dev  # admin,   http://localhost:3001
   ```
   Sign in at http://localhost:3001. A save here shows up on
   localhost:3000 on the next reload.

## Deploying

Two Vercel projects, one per folder. Set the same Supabase URL and anon key
in both, and the same `REVALIDATE_SECRET` in both. Set every variable for
Production and Preview, then redeploy.

| Variable | Website | Admin |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✓ | ✓ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✓ | ✓ |
| `REVALIDATE_SECRET` | ✓ | ✓ (same value) |
| `SUPABASE_SERVICE_ROLE_KEY` | | ✓ (secret) |
| `VOLLEY_APP_SUPABASE_URL` | the Volley app project's URL | |
| `VOLLEY_APP_SUPABASE_ANON_KEY` | that project's anon key | |
| `PREVIEW_SECRET` | ✓ | ✓ (same value) |
| `NEXT_PUBLIC_ADMIN_URL` | the admin's live URL | |
| `MAIN_SITE_URL` | | the website's live URL |
| `NEXT_PUBLIC_SITE_URL` | | the website's live URL |

The last two rows before the site URLs are for the Home page's live editor:
`PREVIEW_SECRET` signs the short-lived token its preview frame needs, and
`NEXT_PUBLIC_ADMIN_URL` is the one address the website lets frame its
`/preview` pages. If the editor says the preview isn't available, or shows
a 404, one of the two is missing or differs between the apps. Locally the
admin runs on port 3001 and the website on 3000, and the `.env.local` files
say so.

To test the ping by hand (expect `{"revalidated":true,…}`):

```bash
curl -X POST "https://YOUR-SITE/api/revalidate?tag=faqs" \
  -H "Authorization: Bearer YOUR_REVALIDATE_SECRET"
```

`401` means the secrets don't match. `400 Unknown tag` means the two apps'
tag lists differ: run `npm run dev` here once (it copies the website's list
into `lib/cache-tags.ts`), commit, and deploy both.

## How the screens work

The admin is built like the Bow + Arc CMS, so anyone who knows that one
knows this one. It wears the website's colours and fonts instead.

- **Home page** (`app/(dash)/home`): a live, on-page editor, as the Bow +
  Arc CMS's. The real home page (the website's `/preview/home`) sits in a
  frame, drawn from the unsaved draft. Wording is typed straight onto it; a
  click on the video, the logos, the questions or a row of cards opens that part's card
  over it (`components/live-editor/editorShell.tsx`). The same content as a
  form is its "Form view", at `/home/form`. Both save through one action.
  The two apps talk over postMessage: `lib/live-editor.ts` here and
  `../volley-site/lib/live-editor.js` are the two halves of that contract,
  so change them together.
- **Buildings** (the website's locations): cards or rows, as the Bow + Arc
  CMS's Projects page. Their order is the website's carousel order: drag
  one by its grip, or use its arrows, then Save order.
- **FAQs** are edited inside the Home page's live editor (click the
  questions on the page), and in its form view. Every change saves at once.
- **The banner** is edited there too: click it at the top of the page. It
  saves with the page (in the form view, with its own button).
- **Lists** (Volley Reader, Team): a toolbar and a table.
  Edit opens a drawer from the right (`components/EditModal.tsx`), delete
  asks first (`components/ConfirmationModal.tsx`), and every change saves
  straight away.
- **Settings pages** (Banner, Viewing schedule, Waitlist form): white section cards whose
  header button reads "Saved" until something changes (`SaveButton` in
  `components/ui.tsx`).
- **Every save** reports in a toast, top right (`components/ToastProvider.tsx`).
- Inputs, labels, buttons and tags are all in `components/ui.tsx`.

## Adding something new to edit

1. Add a tag in `../volley-site/lib/cache-tags.js`.
2. Add a table (or a `settings` key) and its policies in
   `supabase/schema.sql`, and run that part in the SQL editor.
3. Website: add a loader in `lib/content.js`, cached under the new tag,
   with a JSON fallback in `content/`.
4. Admin: add a page and a server action that saves, then calls
   `revalidateSite(CACHE_TAGS.NEW_TAG)`. Use a list with an edit drawer, or
   a settings card, as above.
