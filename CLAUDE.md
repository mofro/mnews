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

| File                                     | Purpose                                                               |
| ---------------------------------------- | --------------------------------------------------------------------- |
| `lib/redisClient.ts`                     | Redis singleton — always import from here                             |
| `lib/types.ts`                           | Core TypeScript types (`Newsletter`, `NewsletterMetadata`, etc.)      |
| `lib/constants.ts`                       | Redis key prefixes and shared constants                               |
| `lib/contentProcessor.ts`                | Email content processing pipeline                                     |
| `lib/cleaners/contentCleaner.ts`         | HTML extraction pipeline — called in webhook, reprocess, and backfill |
| `pages/api/webhook.ts`                   | Inbound email webhook — entry point for all new newsletters           |
| `pages/api/newsletters.ts`               | Main list endpoint (pagination lives here)                            |
| `pages/index.tsx`                        | Main dashboard page                                                   |
| `utils/content.ts`                       | `generatePreviewText()` and other content helpers                     |
| `utils/dateService.ts`                   | Date parsing and formatting                                           |
| `context/ThemeContext.tsx`               | Dark mode context                                                     |
| `components/article/FullViewArticle.tsx` | Full-content modal (reuse for any page needing article view)          |

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

All three original known issues have been resolved:

- Read/Archive API calls are wired up in `pages/index.tsx`
- `contentCleaner.ts` is called in `webhook.ts`, `reprocess/`, `archive.ts`, and the backfill script
- Unfiltered dashboard pagination slices IDs before fetching (fast path fixed)

### Remaining limitations

- **Filtered search still O(n)**: When a search/filter is active, `pages/api/newsletters.ts` still does `lrange(newsletter_ids, 0, -1)` to load all IDs before filtering. Acceptable for now — fast path covers normal browsing.
- **Existing newsletter content**: `contentCleaner.ts` now runs on all new incoming mail. Older newsletters in Redis still have uncleaned content. Use `npm run backfill:content:run` to retroactively clean existing entries.
- **Phase 2 content cleaning not yet done**: Sponsor block detection and footer noise removal are planned (Issue #51 Phase 2) but not yet implemented.

---

## Working Conventions

### Verify before claiming capability

Before asserting that a tool, CLI command, or integration is available (e.g. `gh`, browser access), run a quick check (`which <cmd>` or equivalent). Do not claim a capability and then demonstrate its absence — that wastes cycles and erodes trust. If uncertain, say so first.

### Batching

Batch minor inconsistencies rather than interrupting mid-flow; surface them in a summary at a natural stopping point.

### Issue-first discipline

Treat work as a group effort. Any non-trivial line of work should be documented before it is implemented, as if a different session (or a different person entirely) might be the one to execute it. **The GitHub Issue is the spec.** Before beginning implementation, ensure the issue contains:

1. **Background and motivation** — what led here, what decisions are already locked
2. **Implementation plan** — ordered checklist of concrete steps
3. **Open questions** — design decisions that need resolution before or during the work
4. **Reference files** — key paths, relevant decisions, prior session context

If the issue doesn't have this, write it first. This applies to both new issues and existing ones being picked up mid-stream.

New planned work items get a GitHub Issue. When writing or significantly expanding a work item, create the issue as part of that same work unit — not as a follow-up. Sub-tasks belong in the issue body as a checklist, not as separate issues.

---

## Git Workflow

### Commit on Completion

Commits and pushes are part of the standard workstream — not afterthoughts.

**Commit triggers** — create a commit when:

- A discrete piece of work is done (feature complete, bug fixed, file finalized)
- A session ends (always commit before closing)
- Structural changes are made (new directories, file renames, `.gitignore` updates)

**Commit message format:**

```
<scope>: <what changed> [optional: why/context]

Examples:
  feat(morning-report): add topic grouping API
  fix(dashboard): wire read/archive API calls
  chore: update CLAUDE.md with working conventions
```

**Push triggers:**

- After any commit that represents completed, stable work
- Always before ending a session
- After a group of related commits (e.g. finishing a full feature pass)

### Branching

Single `main` branch. All work goes directly to main.

**Cloud session exception:** When running through the Claude Code cloud harness (e.g. Claude.ai), the harness enforces a `claude/*` branch and blocks pushes to `main` with a 403. In that case:

- Commit to `main` locally as normal
- Push to the harness-designated branch: `git push origin main:<harness-branch>`
- The user will merge to main from their local machine
- This is expected behaviour — not an error. Do not attempt to override it.

### Required pre-push check

Do this before **every** push:

```bash
git ls-remote --heads origin <branch-name>
```

- **Empty output** → branch does not exist on remote. Create it first (`git push -u origin <branch>`), then push. Do NOT retry the push blindly — it will loop.
- **Output shows the branch** → safe to push normally.

This check takes two seconds and prevents the entire class of silent-failure push loops.

### Auto-delete on merge

The repo is configured to delete `claude/*` branches automatically when a PR merges. When starting work after a merge, the harness branch will be gone. Run the pre-push check above; if the branch is missing, create it fresh.

**If the branch still exists after a merge and has diverged:**

```bash
git fetch origin main
git rebase origin/main
git push --force-with-lease origin <harness-branch>
```

If the rebase hits conflicts on generated files, skip those commits with `git rebase --skip` — they are already in main. If the rebase drops all commits (everything already upstream), the branch is clean; push to confirm.

### Push 413 diagnosis

A 413 almost always means the branch was deleted and the thin pack has no base objects to delta against.

1. Run the pre-push check first.
2. **Branch missing** → create it, then push with `--no-thin`: `git push --no-thin -u origin <branch>`
3. **Branch present** → `--no-thin` is not the fix. Investigate payload size, proxy limits, network. Do not retry blindly.
