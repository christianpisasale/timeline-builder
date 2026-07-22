# CLAUDE.md

Context for Claude Code sessions on this project. Read this first.

## What this is

**Timeline Builder** — a Next.js 14 (App Router) + Supabase + Vercel web app for creating,
editing, saving and sharing delivery roadmaps (Gantt-style timelines). It generalises a
hand-built HTML timeline (for a programme called "IDP Phase 1") into a reusable product.

Users are a team at Bupa sharing one org. Framework: Next.js 14. Auth + DB: Supabase.
Deploy target: Vercel.

## Current status

**Phase 1 (core editor) is scaffolded and verified** — passes `npx tsc --noEmit` and
`next build`. Not yet run against a live Supabase project or deployed.

Built so far:
- Email sign-in/sign-up (Supabase Auth), session middleware, route protection
- Dashboard: list timelines, create new ones seeded with default squads
- Editor: edit title/description/chart dates; live React chart preview (ported from the
  original HTML renderer); row table to add/delete/reorder/edit every field
- Schema (`supabase/schema.sql`): profiles, timelines, squads, rows, notes + row-level
  security (org-based: same-org users read, owner edits)

## Decisions already made — do NOT change these without asking the user

- **Next.js pinned to 14.2.35** (a patched version). Do not upgrade to Next 15 yet — it's
  a bigger job than it looks and not urgent.
- **Team sharing is org-based.** Every profile defaults to `org = 'bupa'`. RLS lets
  same-org users *read* each other's timelines; only the owner can *edit*.
- **Rows carry BOTH original and revised** start/finish dates. The chart renders *revised*;
  when revised differs from original it draws a faint dashed "baseline" bar behind the solid
  bar to show slippage. This is a first pass and open to change — but change it deliberately,
  not by accident.
- **Row states: active / done / external**, each with distinct styling (done = greyed +
  tick; external = muted text + dashed outline bar; active = full colour). This visual
  language was carefully tuned; preserve the intent.
- **Renderer parity matters.** `components/TimelineChart.tsx` is a port of a polished HTML
  timeline. Squad tints, RAG letters (G/A/R), bars vs diamonds, the dotted "today" line,
  and the three row states are all deliberate. Keep them.

## Roadmap

- **Phase 1 (done):** core editor
- **Phase 2 (next):** single-page A3 landscape PDF export + view-only public share links.
  Schema already has `is_public` and `public_slug` columns on `timelines`.
- **Phase 3:** AI chat editing — send the timeline JSON + a natural-language instruction to
  Claude, validate the structured edit it returns, apply it. Needs `ANTHROPIC_API_KEY`
  (separate billing from Supabase/Vercel). Keep Claude's edits structured + validated +
  undoable; never let the model write directly to the DB or UI.
- **Phase 4:** notes displayed above the timeline (`notes` table already exists), polish,
  per-squad colour editing UI.

Do not jump ahead. Finish and verify the current phase before starting the next, and get
the user to confirm the core editor works end-to-end before building Phase 2.

## Setup / running locally

1. `npm install` (node_modules and package-lock.json were stripped from the handoff, so the
   first install regenerates the lockfile).
2. Verify: `npx tsc --noEmit` then `npm run build`.
3. The user creates a Supabase project and runs `supabase/schema.sql` in its SQL editor.
4. `cp .env.local.example .env.local` and fill in `NEXT_PUBLIC_SUPABASE_URL` and
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` from Supabase → Project Settings → API.
5. `npm run dev`, open http://localhost:3000.

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

## Conventions

- TypeScript strict mode is on. Keep `npx tsc --noEmit` clean.
- Australian English in UI copy. No em dashes (use hyphens or restructure).
- The user prefers concise, direct communication and wants to confirm architectural
  changes before they happen. Ask before large refactors.
