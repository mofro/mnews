# MNews

Personal newsletter inbox. Emails arrive via webhook from a mail forwarding service, are stored in Redis, and are displayed in a Next.js dashboard with topic categorization, AI summaries, and a daily Morning Report view.

## Stack

| Layer      | Technology                       |
| ---------- | -------------------------------- |
| Framework  | Next.js 14 (Pages Router)        |
| Language   | TypeScript 5 (strict)            |
| Styling    | Tailwind CSS 3 + Emotion         |
| Database   | Upstash Redis (REST API)         |
| Deployment | Vercel                           |
| AI         | Anthropic Claude API (summaries) |

## Features

- **Webhook ingest** — receives forwarded emails via `POST /api/webhook`, extracts and stores content
- **Dashboard** — paginated inbox with read/archive state, search, and full-article modal
- **Topic categorization** — rule-based classifier assigns newsletters to categories (Technology, Economics & Policy, Art & Culture, etc.) based on sender and keywords; configured in `data/topics.json`
- **AI summaries** — on-demand Claude-powered summarization stored per newsletter
- **Morning Report** — daily digest page grouped by topic category, timezone-aware
- **Content cleaning** — semantic HTML extraction strips email layout tables, Gmail forwarding wrappers, tracking URLs, hidden preheaders, and nav chrome; decodes tracking links to real destinations

## Environment Variables

```env
# Required — Upstash Redis
KV_REST_API_URL=        # Upstash Redis REST endpoint
KV_REST_API_TOKEN=      # Upstash Redis auth token

# Required for AI summaries
ANTHROPIC_API_KEY=      # Anthropic API key

# Optional
SUMMARY_MODEL=claude-haiku-4-5-20251001   # defaults to Haiku if unset
NODE_ENV=development                       # set automatically by Next.js
```

## Development

```bash
npm install
npm run dev          # http://localhost:3000
npm run build        # production build (runs tsc first)
npm run type-check   # TypeScript check without emitting
npm run lint         # ESLint via next lint
```

## Data Model (Redis)

```
newsletter_ids          → list of all IDs, newest first
newsletter:{id}         → full newsletter object (JSON)
newsletter:meta:{id}    → sender, subject, date, isRead, isArchived, topics, preview
newsletter:content:{id} → cleaned/processed content
newsletter:summary:{id} → AI-generated summary (may not exist)
```

## Key Files

| File                             | Purpose                                   |
| -------------------------------- | ----------------------------------------- |
| `pages/api/webhook.ts`           | Inbound email entry point                 |
| `pages/api/newsletters.ts`       | Paginated list endpoint                   |
| `pages/api/morning-report.ts`    | Daily digest data                         |
| `pages/index.tsx`                | Main dashboard                            |
| `pages/morning-report.tsx`       | Morning Report page                       |
| `lib/redisClient.ts`             | Redis singleton — always import from here |
| `lib/types.ts`                   | Core TypeScript types                     |
| `lib/constants.ts`               | Redis key prefixes                        |
| `lib/cleaners/contentCleaner.ts` | HTML extraction pipeline                  |
| `lib/utils/decodeTrackingUrl.ts` | Tracking URL decoder                      |
| `lib/summarizer.ts`              | Claude AI summarization                   |
| `data/topics.json`               | Topic category rules (senders + keywords) |
| `utils/dateService.ts`           | Date parsing and formatting               |
| `context/ThemeContext.tsx`       | Dark mode context                         |

## Webhook

The webhook at `POST /api/webhook` expects JSON from a mail forwarding service:

```json
{
  "from": "newsletter@example.com",
  "subject": "Today's digest",
  "html": "<html>...",
  "text": "Plain text fallback",
  "date": "2026-04-09T10:00:00Z"
}
```

Deploy to Vercel and point your forwarding service at:

```
https://your-project.vercel.app/api/webhook
```

## Maintenance Scripts

```bash
# Re-classify topics for all newsletters (dry run)
npx tsx scripts/backfill-topics.ts

# Re-classify and apply
npx tsx scripts/backfill-topics.ts --run

# Re-process clean content for all newsletters (dry run)
npm run backfill:content

# Re-process and apply
npm run backfill:content:run

# Re-process a single newsletter (prints preview, no writes)
npx tsx scripts/backfill-content.ts --id <newsletter-id>

# Re-process a single newsletter and apply
npx tsx scripts/backfill-content.ts --id <newsletter-id> --run
```

## Deployment

The app is deployed on Vercel. Set the environment variables in the Vercel dashboard. The `data/topics.json` file is bundled at build time and used server-side for topic classification.
