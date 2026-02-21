# DebtLens

Tech Debt Triage Tool - turn fuzzy pain into concrete blockers, file locations, and action items.

## Setup

```bash
npm install
npm run db:push    # create SQLite tables
npm run dev        # start dev server at localhost:3000
```

## Environment

Create `.env.local`:
```
GEMINI_API_KEY=your_key_here    # required - get from ai.google.dev/aistudio
GITHUB_TOKEN=ghp_xxx            # optional - increases rate limit from 60 to 5000 req/hr
```

## Database

SQLite + Drizzle ORM. DB file: `debtlens.db`

```bash
npm run db:push     # push schema changes
npm run db:studio   # open Drizzle Studio GUI
npm run db:generate # generate migrations
npm run db:migrate  # run migrations
```

### Schema

- `analyses` - stores analysis results (repo_url, pain_point, analysis_type, result JSON, mermaid_code)
- `repo_cache` - caches repo file trees and dependencies

## Stack

- Next.js 14 (App Router)
- SQLite + Drizzle ORM
- Gemini 1.5 Flash (LLM)
- Mermaid.js (diagrams)
- Tailwind + shadcn/ui
