# Timeline Builder

Build, edit, save and share delivery roadmaps — like the IDP Phase 1 release plan, but as a reusable app.

Stack: **Next.js 14** (App Router) · **Supabase** (Postgres + Auth) · deploy on **Vercel**.

---

## What's built (Phase 1 — core editor)

- Email sign-in / sign-up (Supabase Auth)
- Dashboard listing your team's timelines
- Create a timeline (seeded with default squads: Orange, Thunder, Atlantis, Digital, Programme)
- Timeline editor:
  - Edit title, description, chart start/end
  - Live chart preview (ported from the IDP Phase 1 HTML: squad tints, RAG letters, bars/diamonds, today line, completed + external row states)
  - Row table: add / delete / reorder / edit every field
  - **Original + Revised** start/finish dates. The chart renders Revised; when they differ from Original it shows a faint dashed "baseline" bar behind, so slippage is visible.
  - Save (writes all rows back to Supabase)

## Roadmap (next phases)

- **Phase 2:** PDF export (single-page A3, as we produced by hand) + view-only public share links (`is_public` / `public_slug` columns already in the schema)
- **Phase 3:** AI chat editing — send the timeline JSON + a natural-language instruction to Claude, validate the structured edit it returns, apply it. Needs `ANTHROPIC_API_KEY`.
- **Phase 4:** notes displayed above the timeline (the `notes` table is already in the schema), polish, per-squad colour editing UI.

---

## Setup

### 1. Supabase
1. Create a project at https://supabase.com (free tier is fine).
2. In the project's **SQL Editor**, paste and run `supabase/schema.sql`. This creates the tables, row-level security, and the sign-up trigger.
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

### 4. Push to GitHub
```bash
git init
git add .
git commit -m "Timeline Builder - phase 1 core editor"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/timeline-app.git
git push -u origin main
```

### 5. Deploy to Vercel
1. On https://vercel.com, **Add New → Project**, import the GitHub repo.
2. Add the two environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) in the Vercel project settings.
3. Deploy. Vercel auto-detects Next.js.
4. In Supabase **Authentication → URL Configuration**, add your Vercel URL to the allowed redirect/site URLs.

---

## Project structure
```
app/
  layout.tsx            root layout + fonts
  globals.css           shared styles/tokens
  page.tsx              dashboard (list + create)
  actions.ts            server actions (create timeline, sign out)
  login/page.tsx        auth
  timeline/[id]/
    page.tsx            loads a timeline server-side
    Editor.tsx          client editor (chart + row table + save)
components/
  TimelineChart.tsx     the renderer (ported from the HTML)
lib/
  timeline.ts           types + date/geometry helpers
  supabase-browser.ts   client-side Supabase
  supabase-server.ts    server-side Supabase
middleware.ts           session refresh + route protection
supabase/schema.sql     database schema + RLS
```

## Notes
- **Team sharing** is org-based: every profile defaults to `org = 'bupa'`, and RLS lets same-org users *read* each other's timelines; only the owner can *edit*. Adjust the `org` value or policies in `schema.sql` to taste.
- The renderer's original-vs-revised behaviour is a first pass — easy to change (e.g. hide the baseline bar, or render both solid) in `components/TimelineChart.tsx`.
