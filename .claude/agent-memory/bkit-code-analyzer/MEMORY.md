# FinTrack Code Analyzer Memory

## Project Structure
- **API Server**: `fintrack-api/` (Next.js API routes) - Vercel deployment
- **Client App**: `fintrack/` (Expo React Native) - Tabs: exchange, portfolio, alerts, AI report
- **State**: Zustand (authStore) + React Query (data fetching)
- **Backend**: Supabase (auth, DB with RLS), Anthropic Claude (AI), Yahoo Finance (stocks), Frankfurter/BOK (exchange)
- **Push**: Expo Push Notifications via backend cron

## Key Architecture Patterns
- Client services layer: `services/` -> fetch to `fintrack-api` or direct Supabase
- Hooks layer: `hooks/` -> React Query wrapping services
- Auth: Supabase JWT, stored in Zustand, session listener in `_layout.tsx`
- API auth: `getUserFromRequest()` extracts JWT from Bearer header

## Known Critical Issues (2026-02-27 Audit)
- AI analyze endpoint: date range `.lt()` excludes last ms of day; no input sanitization (prompt injection risk); no holdings array size limit
- Cron alerts/check: auth skipped if CRON_SECRET env var not set (fail-open)
- Client Supabase queries rely on RLS without explicit user_id filters (defense-in-depth gap)

## Common Patterns to Watch
- `as` type casts on Supabase responses - fragile if schema changes
- Hardcoded fallback USD/KRW rate differs: 1400 (report.tsx) vs 1350 (usePortfolio.ts)
- No debounce on stock search (fires per keystroke)
- HoldingDetail useEffect with object dependency causes edit overwrite on quote refresh
- BOK API requests only 1 row but expects most recent from 7-day range
