# CLAUDE.md

Guidance for Claude Code working in this repo. Read this before making changes.

## What this is

A password-gated, **multi-profile conversational calorie tracker**. You log food by chatting with
Claude (it clarifies → estimates → logs via tool calls), scanning a barcode, or manual entry.
Tracks weight/goal/calorie-limit with charts and a 7-day day strip. One shared password; each
profile has its own data and color theme. Installable as a PWA. Next.js 16 (App Router) + Supabase
+ Vercel AI SDK v6 (`claude-sonnet-4-6`).

## Commands

```bash
npm run dev     # local dev (Turbopack)
npm run build   # production build + typecheck — run this to verify changes
npm run lint
```

Node 24+ (developed on Node 25). **npm**, not pnpm. Needs `.env.local` (see README) to run, but
`npm run build` compiles without it (data pages are `force-dynamic`).

## Architecture

### Chat pipeline
`app/api/chat/route.ts` streams Claude with the toolset in `lib/tools.ts`. Per-turn:
1. Fetch `settings`, `getDailySummary`, and `getRecentScans` in parallel.
2. Build system prompt via `lib/assistant.ts` (`buildSystemPrompt`) — split into cached + fresh
   blocks (see prompt caching below). Recent scans are injected into the fresh block.
3. Pass trimmed message history (`trimForModel`, last 12 messages) to `streamText`.
4. Tools read/write Supabase via `lib/queries.ts`. History persists to `chat_messages`.

### Tools (`lib/tools.ts`)
- **`lookup_food`** — searches USDA FoodData Central + Open Food Facts via `lib/nutrition/`.
  Called before `log_food` for packaged/branded foods. Falls back to model knowledge if no match.
- **`log_food`** — inserts to `food_entries`. All model-supplied dates go through `safeDate()`
  which clamps to within the last 7 days (prevents wrong-year writes from model date hallucination).
- **`log_weight`** — upserts to `weight_entries` (one per day). Also uses `safeDate()`.
- **`update_settings`** — patches the profile's `settings` row.
- **`get_daily_summary`** — returns entries + total + remaining for a day.
- **`edit_food_entry` / `delete_food_entry`** — fix mistakes by id or description match.
- **`get_progress`** — weight trend + avg calories + goal forecast from `lib/forecast.ts`.

### Barcode scanning
`components/BarcodeScanner.tsx` — dynamically imports `@zxing/browser` (client-only; never
SSR'd). Opens the rear camera, decodes EAN/UPC barcodes, calls `onScan(code)`. Sits in
`ChatPanel.tsx` next to the Send button.

`app/api/barcode/route.ts` — `GET ?code={barcode}`:
1. Validates barcode regex `^\d{8,14}$`.
2. Calls `lookupByBarcode()` from `lib/nutrition/openfoodfacts.ts` (OFF v2 product API).
3. On success, calls `upsertScannedProduct()` to save to `scanned_products` table.
4. Returns `{ found, description, calories, serving }`.

### Scanned products cache
`scanned_products` table: `profile_id, barcode, name, calories, serving, scanned_at`.
Unique on `(profile_id, barcode)` — rescanning updates `scanned_at`, not a new row.

`getRecentScans(profileId)` — returns rows from the last 7 days, newest first.
Injected into the system prompt `fresh` block so Claude uses exact calories when a user
mentions a recently scanned food without rescanning.

Nightly cleanup: `app/api/cron/cleanup/route.ts` is invoked by Vercel Cron (`vercel.json`,
`0 6 * * *` = 2am EDT). Secured by `CRON_SECRET` env var (checked via `Authorization: Bearer`
header). Calls `deleteOldScans()` which hard-deletes rows with `scanned_at < now() - 7 days`.

### Nutrition lookup (`lib/nutrition/`)
- `usda.ts` — searches USDA FoodData Central (`USDA_API_KEY` required; skipped if missing).
- `openfoodfacts.ts` — searches OFF v1 full-text + `lookupByBarcode()` for OFF v2 product API.
- `lookup.ts` — fans out to both, deduplicates, returns normalized `NutritionCandidate[]`.
- `types.ts` — shared `NutritionCandidate` type.

### Goal-date forecast (`lib/forecast.ts`)
Pure, unit-agnostic least-squares trend over weigh-ins projected to goal weight. Returns a
`ForecastStatus` (`on_track` / `reached` / `stalled` / `diverging` / `insufficient`) + ETA /
rate / progress. Needs ≥2 weigh-ins spanning ≥7 days or returns `insufficient`. Rendered by
`components/GoalForecast.tsx` on Progress and included in `get_progress` tool result.

### System prompt (`lib/assistant.ts`)
`buildSystemPrompt(state)` returns `{ cached, fresh }`:
- **`cached`**: persona + estimation rules + unit/goal/limit prefs + assistant notes. Marked
  with `cacheControl: { type: "ephemeral" }` — caches together with tool definitions. Only
  changes when settings or notes change.
- **`fresh`**: today's date + running total + recently scanned products. Always sent uncached.

If you edit `ASSISTANT_GUIDELINES`, redeploy to pick it up. Personal context (dietary
restrictions, portion habits) belongs in **Settings → Notes for the assistant**, not here.

### Auth + profile gate (`proxy.ts`)
Next 16 renamed `middleware.ts` → `proxy.ts` (exports `proxy(req)`, config has `matcher`).
Checks HMAC session cookie (`lib/auth.ts`, `AUTH_SECRET`). Authed + no `cc_profile` cookie →
redirect to `/select-profile`. API without profile → 403. `POST /api/auth` clears profile
cookie, so every login re-prompts profile selection.

### Profiles (`lib/profile.ts`)
`PROFILE_COOKIE = "cc_profile"`. `getActiveProfileId()` defaults to `"user1"`.
**Every** query function and tool takes `profileId`. When adding a table or query, you MUST
scope it by `profile_id`.

### Themes (`lib/themes.ts`)
All profiles use the single default Enterprise palette (bone/teal/orange). Applied via
`data-theme="default"` on `<html>`. To add a per-profile palette: add a `ProfileTheme` constant
in `lib/themes.ts`, register it in `THEMES` and `getThemeForProfile`, then add a matching
`[data-theme="id"]` block in `app/globals.css`.

### Timezone (`lib/timezone.ts`)
Fixed to `America/New_York`. Use `todayInAppTz()` / helpers for any date math. Don't use raw
`new Date()` for calendar days. `startOfDayUTC(dateStr)` converts a YYYY-MM-DD date in the app
timezone to a UTC ISO string for filtering `timestamptz` columns.

### Cost controls
- `loadHistory` in `app/page.tsx` filters `chat_messages` to today only (using
  `startOfDayUTC`), so yesterday's conversation never loads as context.
- `trimForModel()` in the chat route sends only the last 12 messages to the model.
- System prompt split into cached + uncached blocks (see above).

## Conventions & gotchas

### AI SDK v6 (not v4/v5 — APIs differ)
- `convertToModelMessages(messages)` is **async — you must `await` it**.
- `useChat` (from `@ai-sdk/react`): pass initial messages as `messages`, send with
  `sendMessage({ text })`. Status is `'submitted' | 'streaming' | 'ready' | 'error'`.
- Tools use `tool({ description, inputSchema: z.object({…}), execute })` — it's `inputSchema`,
  not `parameters`. Multi-step uses `stopWhen: stepCountIs(n)`.
- Model id is `claude-sonnet-4-6` via `@ai-sdk/anthropic`.

### Next.js 16
- Use **`proxy.ts`** exporting `proxy(req)`, NOT `middleware.ts`.
- `next.config.ts` pins `turbopack.root` — keep it.

### Design system (themed)
- All color is **semantic CSS tokens** — never hardcode hex in components.
- Semantic roles: `--clay` = primary / `--accent` = CTA (`#ff7300`) / `--olive`/`--amber`/`--rust`
  = success/warning/danger / `--paper` = app surface / `--surface` = card / `--ink` = text.
- Button system: `bg-accent` = primary CTA; `bg-clay` = structural/secondary.
- Calorie ring uses `--ring` token for the normal/under-budget state (`#ff7300` in the default theme).
- Accessibility: AA contrast, global `:focus-visible` outline, `prefers-reduced-motion` guard.

### Other gotchas
- `TodayPageContent` keys `<ChatPanel key={profileId}>` — remounts chat on profile switch.
- `safeDate()` in `lib/tools.ts` clamps all model-supplied dates. Don't bypass it.
- Backdated logging is capped at 7 days server-side in both `/api/food` and `safeDate()`.
- `BarcodeScanner` uses dynamic import — never import ZXing in server code.
- RLS is **enabled with no policies** on all tables — intentional. Don't add anon policies or
  switch to the anon key.

## Deploying

**Do not** run `vercel --prod` or deploy from the CLI. Deployment is continuous from GitHub:
`git push origin main` → Vercel builds production. Confirm with the user before pushing.

Env vars required in Vercel: `ANTHROPIC_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
`APP_PASSWORD`, `AUTH_SECRET`, `USDA_API_KEY`, `CRON_SECRET`.

Set up your own Supabase project and Vercel deployment — see README for instructions.
