# MNews

Personal newsletter inbox. The premise: instead of newsletters landing in Gmail where they get buried, they're forwarded to a webhook, stored in Redis, and surfaced in a purpose-built reading interface — with topic grouping, AI summaries, and a daily Morning Report digest.

## Stack

| Layer      | Technology                       |
| ---------- | -------------------------------- |
| Framework  | Next.js 14 (Pages Router)        |
| Language   | TypeScript 5 (strict)            |
| Styling    | Tailwind CSS 3 + Emotion         |
| Database   | Upstash Redis (REST API)         |
| Deployment | Vercel                           |
| AI         | Anthropic Claude API (summaries) |

Upstash Redis is used because it's serverless-friendly and requires no infrastructure to manage. The REST API works from Vercel edge functions without connection pooling concerns.

## Features

- **Webhook ingest** — receives forwarded emails via `POST /api/webhook`, runs content extraction, classifies topics, and stores everything in Redis
- **Dashboard** — paginated inbox with read/archive state, full-article modal, and dark mode
- **Topic categorization** — rule-based classifier assigns newsletters to categories (Technology, Economics & Policy, Art & Culture, etc.) based on sender domain and keywords; configured in `data/topics.json` so new rules don't require code changes
- **AI summaries** — Claude-powered summarization, generated on demand and cached per newsletter
- **Morning Report** — daily digest grouped by topic category; uses the browser's timezone cookie so the day boundary is correct regardless of where Vercel's servers are running
- **Content cleaning** — semantic HTML extraction that strips email layout tables, Gmail forwarding wrappers, tracking redirect URLs, hidden preheaders, and navigation chrome — leaving just the readable content with real destination links

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

These exist because the cleaning and classification logic improves over time, and existing newsletters in Redis need to be retroactively updated when it does.

```bash
# Re-classify topics for all newsletters (dry run — shows what would change)
npx tsx scripts/backfill-topics.ts

# Re-classify and apply
npx tsx scripts/backfill-topics.ts --run
```

Topic classification reads `data/topics.json` and matches each newsletter's sender and subject against the configured rules. Run the backfill whenever you add new senders or keywords to the config.

```bash
# Re-process clean content for all newsletters (dry run)
npm run backfill:content

# Re-process and apply
npm run backfill:content:run
```

Content cleaning extracts readable HTML from raw email HTML — stripping layout tables, forwarding wrappers, tracking links, and nav chrome. When the extraction logic improves, existing newsletters still have their original raw content in Redis, so they can be reprocessed without re-fetching anything.

```bash
# Preview the cleaned output for a single newsletter (no writes)
npx tsx scripts/backfill-content.ts --id <newsletter-id>

# Apply to a single newsletter
npx tsx scripts/backfill-content.ts --id <newsletter-id> --run
```

Use the single-ID mode to spot-check a specific newsletter before running a full backfill across all 700+.

## Deployment

The app is deployed on Vercel. Set the environment variables in the Vercel dashboard. The `data/topics.json` file is bundled at build time via a dynamic import in `getServerSideProps` — this is what makes it available server-side on Vercel without needing `fs.readFileSync`.
