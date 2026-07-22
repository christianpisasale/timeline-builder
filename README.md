# Timeline Builder

Build, edit, save and share delivery roadmaps — like the IDP Phase 1 release plan, but as a reusable app.

Stack: **Next.js 14** (App Router) · **Supabase** (Postgres + Auth) · deploy on **Vercel**.

**Live:** https://timeline-builder-ten.vercel.app
**Repo:** https://github.com/christianpisasale/timeline-builder

---

## What's built (Phase 1 — core editor)

- Email sign-in / sign-up (Supabase Auth)
- Dashboard listing your team's timelines
- Create a timeline (seeded with default squads: Orange, Thunder, Atlantis, Digital, Programme)
- Timeline editor:
  - Edit title, description, chart start/end — **autosaves** automatically, no save button
  - Live chart preview: squad chips, RAG badges, bars/diamonds, today line, done/external row states
  - Row table: add / delete (with a confirmation dialog) / **drag to reorder** / edit every field
  - **Original + Revised dates**, toggled with "Show revised dates" (off by default). Off shows only
    Original Start/Finish; on adds Revised Start/Finish columns, and a row's revised bar only appears
    on the chart once you've actually entered a revised date for it — nothing is auto-filled
  - Inline validation: a finish date before its start date is flagged and blocks autosave until fixed
- **Squad management** on its own page (add / rename / recolour / reorder / delete squads per timeline)
- App-wide visual design: Plus Jakarta Sans, lavender/pastel palette (`#7C6BD6` primary)

## Roadmap (next phases)

- **Phase 2:** PDF export (single-page A3, as we produced by hand) + view-only public share links (`is_public` / `public_slug` columns already in the schema)
- **Phase 3:** AI chat editing — send the timeline JSON + a natural-language instruction to Claude, validate the structured edit it returns, apply it. Needs `ANTHROPIC_API_KEY`.
- **Phase 4:** notes displayed above the timeline (the `notes` table is already in the schema), further per-squad polish.

---

## Setup

### 1. Supabase
1. Create a project at https://supabase.com (free tier is fine).
2. In the project's **SQL Editor**, paste and run `supabase/schema.sql`. This creates the tables, row-level security, and the sign-up trigger.
   - The trigger uses `set search_path = public` — without it, sign-up fails with an opaque
     "Database error saving new user" (a common Supabase gotcha). Already handled in this file.
3. Go to **Project Settings → API** and copy:
   - Project URL
   - `anon` public key
4. (Optional) In **Authentication → Providers**, keep Email enabled. For quick testing you can turn off "Confirm email".

### 2. Local env
```bash
cp .env.local.example .env.local
# edit .env.local with your Supabase URL + anon key
```

### 3. Run locally
```bash
npm install
npm run dev
# open http://localhost:3000
```
Sign up, confirm (or disable confirmation), and you'll land on the dashboard.

> **Don't run `npm run build` while `npm run dev` is running against the same folder** — they
> share the `.next` build cache and will corrupt each other. Stop the dev server first.

### 4. Deploy (already done for this project)
Already live on GitHub + Vercel (see links at the top). To redeploy your own copy:
```bash
git init
git add .
git commit -m "Timeline Builder"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
git push -u origin main
```
Then on https://vercel.com: **Add New → Project**, import the repo, add the two environment
variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) in the project settings,
and deploy. Vercel auto-detects Next.js and auto-deploys on every push to `main`.

---

## Project structure
```
app/
  layout.tsx            root layout + Plus Jakarta Sans font
  globals.css           shared styles/tokens (lavender design system)
  page.tsx              dashboard (list + create)
  actions.ts            server actions (create timeline, sign out)
  login/page.tsx        auth
  timeline/[id]/
    page.tsx            loads a timeline server-side
    Editor.tsx           client editor (meta + chart + row table, autosave)
    squads/
      page.tsx           loads squads server-side
      SquadsManager.tsx  client squad manager (autosave)
components/
  TimelineChart.tsx     the renderer
  ConfirmModal.tsx      themed delete-confirmation modal
lib/
  timeline.ts           types + date/geometry helpers + colour helpers
  supabase-browser.ts   client-side Supabase
  supabase-server.ts    server-side Supabase
middleware.ts           session refresh + route protection
supabase/schema.sql     database schema + RLS
```

## Notes
- **Team sharing** is org-based: every profile defaults to `org = 'bupa'`, and RLS lets same-org users *read* each other's timelines; only the owner can *edit*. Adjust the `org` value or policies in `schema.sql` to taste.
- **Squad colours**: each squad stores its own `tint` (chip background) and `bar_color`; chip text and
  chart marker shadows are derived from `bar_color` at render time (see `darkenHex`/`hexToRgba` in
  `lib/timeline.ts`), so any user-picked colour works without a hardcoded palette.
- Delete actions (rows, squads) go through a themed confirmation modal rather than a native browser dialog.
