# MNews — Claude Code Context

## Project Overview
MNews is a personal newsletter inbox app. Emails arrive via webhook (from a mail forwarding service), are stored in Redis, and displayed in a Next.js dashboard. The app is deployed on Vercel.

## Stack
- **Framework**: Next.js 14 (Pages Router)
- **Language**: TypeScript 5 (strict mode), `@/*` path alias maps to repo root
- **Styling**: Tailwind CSS 3 + Emotion (CSS-in-JS); dark mode via `class` strategy (`ThemeContext`)
- **UI primitives**: Radix UI, Heroicons, Lucide React, Framer Motion
- **Database**: Upstash Redis (REST API via `@upstash/redis`)
- **Deployment**: Vercel (environment variables set in Vercel dashboard)
- **AI**: Anthropic Claude API (`@anthropic-ai/sdk`) — used for newsletter summarization

## Key Files
| File | Purpose |
|------|---------|
| `lib/redisClient.ts` | Redis singleton — always import from here |
| `lib/types.ts` | Core TypeScript types (`Newsletter`, `NewsletterMetadata`, etc.) |
| `lib/constants.ts` | Redis key prefixes and shared constants |
| `lib/contentProcessor.ts` | Email content processing pipeline |
| `lib/cleaners/contentCleaner.ts` | HTML sanitization utility (exists, not yet wired into API) |
| `pages/api/webhook.ts` | Inbound email webhook — entry point for all new newsletters |
| `pages/api/newsletters.ts` | Main list endpoint (pagination lives here) |
| `pages/index.tsx` | Main dashboard page |
| `utils/content.ts` | `generatePreviewText()` and other content helpers |
| `utils/dateService.ts` | Date parsing and formatting |
| `context/ThemeContext.tsx` | Dark mode context |
| `components/article/FullViewArticle.tsx` | Full-content modal (reuse for any page needing article view) |

## Environment Variables
```env
# Required — Upstash Redis
KV_REST_API_URL=        # Upstash Redis REST endpoint
KV_REST_API_TOKEN=      # Upstash Redis auth token

# Required for AI summaries
ANTHROPIC_API_KEY=      # Anthropic API key

# Optional
SUMMARY_MODEL=claude-haiku-4-5-20251001   # Defaults to Haiku if unset
NODE_ENV=development    # Set automatically by Next.js
PATTERN_SYSTEM_ENABLED= # Feature flag (true/false)
```

## Development Commands
```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build (prebuild runs tsc + UI build)
npm run type-check   # TypeScript check without emitting
npm run lint         # ESLint via next lint
```

> **Note**: Tests are currently disabled. Rename `__tests_old__/` → `__tests__/` to re-enable.

## Redis Data Model
```
newsletter_ids          → Redis list of all newsletter IDs (newest first)
newsletter:{id}         → Full newsletter object (JSON)
newsletter:meta:{id}    → Metadata (sender, subject, date, isRead, isArchived, topics)
newsletter:content:{id} → Cleaned/processed content
newsletter:summary:{id} → AI-generated summary (may not exist)
```

## Code Conventions
- **Imports**: Use `@/` alias (e.g., `import { redis } from '@/lib/redisClient'`)
- **API routes**: Pages Router only (`pages/api/`) — no App Router
- **Redis access**: Always use the singleton from `lib/redisClient.ts`; never create a new client
- **Styling**: Prefer Tailwind classes; use Emotion (`css` prop or `styled`) only for dynamic/computed styles
- **Types**: Add new shared types to `lib/types.ts`; add new Redis key prefixes to `lib/constants.ts`
- **No console.log in production**: `utils/logger.ts` wraps console — use it instead

## Known Issues (as of April 2026)
1. **Read/Archive not persisted**: `pages/index.tsx` has TODO comments where API calls should fire — endpoints exist but aren't called
2. **contentCleaner unused**: `lib/cleaners/contentCleaner.ts` is implemented but never called in the API response path
3. **Dashboard load time**: `pages/api/newsletters.ts` fetches all newsletters before paginating — fix is to slice IDs before fetching

## Git Workflow
- Development branches use the `claude/` prefix
- Main branch: `main`
- Push with: `git push -u origin <branch-name>`
