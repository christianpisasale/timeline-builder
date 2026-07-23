# CLAUDE.md

Context for Claude Code sessions on this project. Read this first.

## What this is

**Timeline Builder** — a Next.js 14 (App Router) + Supabase + Vercel web app for creating,
editing, saving and sharing delivery roadmaps (Gantt-style timelines). It generalises a
hand-built HTML timeline (for a programme called "IDP Phase 1") into a reusable product.

Users are a team at Bupa sharing one org. Framework: Next.js 14. Auth + DB: Supabase.
Deploy target: Vercel.

## Current status

**Phase 1 (core editor) is built, verified end-to-end against a live Supabase project, and
deployed to production.** Passes `npx tsc --noEmit` and `npm run build`.

- Production: https://timeline-builder-ten.vercel.app
- GitHub: github.com/christianpisasale/timeline-builder (`main` branch; Vercel auto-deploys
  on every push)

Built so far:
- Email sign-in/sign-up (Supabase Auth), session middleware, route protection
- Dashboard: list timelines, create new ones seeded with default squads
- Editor: title/description/chart dates, live chart preview, row table with drag-to-reorder
  (with a drop-position indicator), add/delete (delete asks for confirmation via a themed
  modal, not `window.confirm`)
- **Squad management is its own page** (`/timeline/[id]/squads`), linked from "Manage
  squads" in the editor — add/rename/recolour/reorder/delete squads per timeline
- **Autosave**: every edit (timeline meta, rows, squads) saves automatically ~1s after the
  user stops changing it. No manual save button. Held back while any date range is invalid.
- **Date validation**: a finish date before its start date (original, revised, or chart
  start/end) is flagged inline (red border) and blocks autosave until fixed.
- **Design refresh applied app-wide**: lavender/pastel visual language (Plus Jakarta Sans,
  `#7C6BD6` primary) replacing the original navy/blue scaffold styling — see "Design system"
  below. Purely visual; no functional change from the refresh itself.
- **Second design pass ("Claude Design" handoff) applied app-wide**: brought the app in line
  with a high-fidelity handoff (`~/Downloads/design_handoff_timeline_builder 2/`) covering all
  four screens. Beyond visual polish this added real features/behaviour changes — see the
  updated "Design system" bullet below for what changed and why.
- Schema (`supabase/schema.sql`): profiles, timelines, squads, rows, notes + row-level
  security (org-based: same-org users read, owner edits). The `handle_new_user` trigger
  needs `set search_path = public` — without it every sign-up fails with an opaque
  "Database error saving new user" (a common Supabase gotcha). Already patched both in the
  schema file and on the live project.

## Decisions already made — do NOT change these without asking the user

- **Next.js pinned to 14.2.35** (a patched version). Do not upgrade to Next 15 yet — it's
  a bigger job than it looks and not urgent.
- **Team sharing is org-based.** Every profile defaults to `org = 'bupa'`. RLS lets
  same-org users *read* each other's timelines; only the owner can *edit*.
- **Revised dates are an explicit, off-by-default toggle** ("Show revised dates", next to
  Chart start/end). This replaced an earlier always-on design where the chart rendered
  revised-over-original automatically:
  - **Off** (default): chart and row table show only Original Start/Finish. Revised columns
    are hidden entirely, in both the chart and the table.
  - **On**: chart and table also show Revised Start/Finish as extra columns. A row's
    revised bar/diamond only appears on the chart once that row actually has a revised date
    entered (drawn as a dashed outline over the always-present solid original bar/diamond) —
    new rows start with revised dates `null`, not auto-filled to the chart start.
  - The chart's row order always mirrors the table's manual drag order (`sort_order`); it
    never independently re-sorts by date. (This was a real bug — the chart used to silently
    re-sort by original start date, ignoring drag order, whenever two rows had different
    dates. Fixed — don't reintroduce a date-based sort in `TimelineChart.tsx`.)
- **Row states: active / done / external**, each with distinct styling (done = greyed +
  tick badge; external = muted italic text + dashed outline bar/border; active = full
  colour). This visual language was carefully tuned; preserve the intent even as exact
  colours evolve.
- **Design system (lavender refresh)** — don't silently revert to the old navy/blue palette:
  - Font: **Plus Jakarta Sans** (Google Fonts, loaded in `app/layout.tsx`)
  - Primary: `#7C6BD6` (hover `#6B5AC9`); page background gradient `#F6F4FC → #F3F1F9`
  - Cards: white, `1px solid #ECE9F6` border, `24px` radius, soft shadow
    (`0 10px 34px rgba(88,74,140,.06)`)
  - Danger/delete: `#D9776F` text on `#FCEDED` bg (icon buttons), solid `#D9776F` for the
    ConfirmModal's destructive action button
  - **Buttons carry no box-shadow** (cards and modals still do — `.btn`/`.btn-ghost` in
    `globals.css`, ConfirmModal's destructive button)
  - **Squad colours are a curated palette, not a free colour wheel.** `SQUAD_TINTS` /
    `SQUAD_BARS` in `lib/timeline.ts` (10 swatches each). The squads page shows a swatch-grid
    popover instead of a native colour input — this is a deliberate capability change from
    the earlier free-form picker, per the design handoff's README. Tint and bar are still
    picked independently (not fixed pairs), so chip *text* colour is still derived via
    `darkenHex(bar_color, .35)` (kept from the earlier design) rather than using the raw bar
    colour, to guarantee contrast regardless of which swatch pairing a user picks.
  - **Squad-chip radius is intentionally mixed**, reproducing the handoff's own two screens
    exactly rather than resolving the inconsistency: **4px squared** in the Gantt chart
    (`TimelineChart.tsx`), **999px pill** on dashboard cards and the squads-manager preview
    column. If asked to make chips consistent, confirm which shape first.
  - **Gantt chart** (`TimelineChart.tsx`) now also renders **weekly gridlines + a
    day-of-month week strip** (weeks anchored to Monday) under the month header — this is a
    new feature, not just a restyle. Markers are flat (no `box-shadow`): 15px bar/radius 3,
    14px diamond/radius 2. A Bar-type row needs *both* a start and finish date to render
    anything (a milestone still renders from just one date) — matches the handoff exactly,
    a change from the previous "finish defaults to start" behaviour.
  - **Dashboard status pill** (Active/At risk/Complete) is a **derived heuristic**
    (`deriveTimelineState` in `lib/timeline.ts`), not a stored field: Complete once
    `chart_end` has passed, At risk if any row's RAG is red, Active otherwise. If a real
    status field gets added later, replace the heuristic rather than layering on top of it.
  - Full token reference (colours, spacing, exact component specs) is in the design handoff
    at `~/Downloads/design_handoff_timeline_builder 2/` — it may or may not still exist on
    disk; the values actually implemented in `globals.css` / component files are the
    current source of truth either way
- **Delete confirmations** use a shared `components/ConfirmModal.tsx`, not
  `window.confirm()` — keep using it for any new destructive actions so the UI stays
  consistent (and because native browser dialogs can't be restyled to match the design).
- **Renderer parity/behaviour** — `components/TimelineChart.tsx`: squad chips, RAG badges
  (G/A/R + a "none" state), bars vs diamonds, the dashed "today" line, the three row
  states, and the revised-date overlay are all deliberate. Keep them.

## Roadmap

- **Phase 1 (done):** core editor
- **Phase 2 (next):** single-page A3 landscape PDF export + view-only public share links.
  Schema already has `is_public` and `public_slug` columns on `timelines`.
- **Phase 3:** AI chat editing — send the timeline JSON + a natural-language instruction to
  Claude, validate the structured edit it returns, apply it. Needs `ANTHROPIC_API_KEY`
  (separate billing from Supabase/Vercel). Keep Claude's edits structured + validated +
  undoable; never let the model write directly to the DB or UI.
- **Phase 4:** notes displayed above the timeline (`notes` table already exists), per-squad
  colour editing UI (already partly done via the squads page — revisit scope here).

Do not jump ahead without the user's go-ahead.

## Setup / running locally

Already set up, deployed, and in active use — this is for a fresh clone / new machine.

1. `npm install`
2. `cp .env.local.example .env.local` and fill in `NEXT_PUBLIC_SUPABASE_URL` and
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` — ask the user for these; they're already live on
   Supabase + Vercel but not committed to the repo.
3. `npx tsc --noEmit` then `npm run build` to verify.
4. `npm run dev`, open http://localhost:3000.

**Never run `npm run build` while `npm run dev` is active against the same working copy** —
they share `.next` and will corrupt each other's build output (symptom: `Cannot find module
'./vendor-chunks/...'` errors). Stop one before running the other.

## Deployment

- GitHub: github.com/christianpisasale/timeline-builder, `main` branch
- Vercel project `timeline-builder` (scope `touch-fuzzy-get-dizzy`), linked to the GitHub
  repo — pushes to `main` auto-deploy
- Production: https://timeline-builder-ten.vercel.app
- Env vars are set on Vercel for Production/Preview/Development already

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
    Editor.tsx          client editor (meta + chart + row table, autosave)
    squads/
      page.tsx           loads squads server-side
      SquadsManager.tsx  client squad manager (autosave)
components/
  TimelineChart.tsx     the renderer
  ConfirmModal.tsx      themed delete-confirmation modal (row/squad deletes)
lib/
  timeline.ts           types + date/geometry helpers + colour helpers
                         (darkenHex, hexToRgba — derive squad chip/shadow colours)
  supabase-browser.ts   client-side Supabase
  supabase-server.ts    server-side Supabase
middleware.ts           session refresh + route protection
supabase/schema.sql     database schema + RLS
.claude/launch.json     dev server config (for the Browser preview tool)
```

## Conventions

- TypeScript strict mode is on. Keep `npx tsc --noEmit` clean.
- Australian English in UI copy. No em dashes (use hyphens or restructure).
- The user prefers concise, direct communication and wants to confirm architectural
  changes before they happen. Ask before large refactors.
- **Verify UI/behaviour changes in the browser before calling something done** — this
  project has a `.claude/launch.json` dev server config for the Browser preview tool.
  Several real bugs (chart bars bleeding past their columns, drag order not reflected in
  the chart, React style-mixing warnings) were only caught this way, not by
  typecheck/build.
- Native browser drag-and-drop and `window.confirm()` dialogs can't be triggered by
  synthetic mouse clicks in the preview tool — verify them by dispatching real
  `DragEvent`s (as two separate `javascript_exec` calls, not one — React needs a render
  between `dragstart` and `drop`) or by temporarily monkey-patching `window.confirm` to
  return `true`/`false`.
- Don't leave test/placeholder data in the live "Test Timeline" after verifying a
  feature — clean up rows/titles/squads added for testing, or clearly flag them as
  intentional test fixtures if leaving them in place.
