# DebtLens

**AI-Powered Technical Debt Analysis & Visualization Platform**

Transform fuzzy pain points into concrete blockers, visualize dependency graphs, and generate one-click PR fixes.

![Next.js](https://img.shields.io/badge/Next.js-14.2-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)
![Gemini](https://img.shields.io/badge/Gemini-3.0-orange?logo=google)
![SQLite](https://img.shields.io/badge/SQLite-3-003B57?logo=sqlite)

---
### Sponsors
1. Utilized Gemini as API
2. Utilized CodeWords to Ideate
3. Utilized Dust to discuss API best prompting practices using various agents
---
## Features

### Analysis Engine
- **AI-Powered Blocker Detection** - Identifies critical, high, medium, and low severity issues
- **Code Evidence Extraction** - Provides file locations, line numbers, and code snippets for critical/high blockers
- **Smart Category Inference** - Automatically categorizes issues:
  - `security` - Vulnerabilities, injection risks
  - `performance` - Slow operations, memory leaks
  - `type-safety` - TypeScript issues, `any` usage
  - `duplicate-workflow` - Redundant code patterns
  - `circular-coupling` - Circular import dependencies
  - `outdated-package` - Outdated dependencies
  - `testing` - Missing test coverage
  - `maintenance` - Legacy code, deprecations

### Interactive Dependency Graph
- **Two Visualization Modes**:
  - **Imports View** - Full dependency tree showing import relationships
  - **Clusters View** - Files grouped by feature/domain
- **Real-time Detection**:
  - Circular dependency highlighting
  - Orphan file identification
  - Entry point detection
- **File Classification** - Components, hooks, utilities, APIs, types, configs
- **Click-to-Preview** - View file contents with syntax highlighting

### AI Fix Suggestions
- **Per-Blocker Code Changes** - Before/after diffs with explanations
- **Package Update Recommendations** - Version suggestions with rationale
- **Documentation Links** - Relevant resources for each fix
- **Confidence & Effort Estimates** - Prioritize fixes effectively

### One-Click PR Generation
- **Automated Branch Creation** - Creates `fix/{blocker-id}-{description}` branches
- **Code Application** - Applies suggested changes automatically
- **PR with Context** - Generates descriptive PR body with summary and changes
- **GitHub Integration** - Direct PR creation via Personal Access Token

---

## Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| [Next.js 14](https://nextjs.org/) | React framework with App Router |
| [React 18](https://react.dev/) | UI library |
| [TypeScript 5](https://www.typescriptlang.org/) | Type-safe JavaScript |
| [Tailwind CSS](https://tailwindcss.com/) | Utility-first CSS |
| [shadcn/ui](https://ui.shadcn.com/) | Radix-based component library |
| [ReactFlow](https://reactflow.dev/) | Interactive graph visualization |
| [Shiki](https://shiki.style/) | Syntax highlighting |
| [Lucide React](https://lucide.dev/) | Icon library |

### Backend
| Technology | Purpose |
|------------|---------|
| [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers) | Serverless API endpoints |
| [Drizzle ORM](https://orm.drizzle.team/) | Type-safe database ORM |
| [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) | SQLite database driver |
| [Dagre](https://github.com/dagrejs/dagre) | Graph layout algorithm |

### AI & APIs
| Technology | Purpose |
|------------|---------|
| [Google Gemini 3](https://ai.google.dev/) | LLM for analysis & code generation |
| [GitHub REST API](https://docs.github.com/en/rest) | Repository access & PR creation |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                         │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │ Landing Page│  │Analysis View│  │   Dependency Graph      │ │
│  │   (Home)    │  │  (Results)  │  │   (ReactFlow + Dagre)   │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │Blocker Modal│  │Fix Suggest. │  │   GitHub Token Modal    │ │
│  │ (Details)   │  │  (AI Diffs) │  │   (PAT Management)      │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API Routes (Next.js)                        │
├─────────────────────────────────────────────────────────────────┤
│  POST /api/analysis          - Run full codebase analysis       │
│  GET  /api/analysis/[id]     - Fetch stored analysis            │
│  POST /api/suggest-fix       - Generate AI fix for blocker      │
│  POST /api/create-pr         - Create GitHub PR from fix        │
│  POST /api/validate-github-token - Validate PAT                 │
│  GET  /api/file              - Fetch file content from GitHub   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Core Libraries                            │
├─────────────────────────────────────────────────────────────────┤
│  src/lib/gemini.ts      - Gemini AI client & prompts            │
│  src/lib/github.ts      - GitHub API (read operations)          │
│  src/lib/github-write.ts - GitHub API (write operations)        │
│  src/lib/errors.ts      - Error handling utilities              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Data Layer                               │
├─────────────────────────────────────────────────────────────────┤
│  SQLite Database (debtlens.db)                                  │
│  ├── analyses      - Stored analysis results                    │
│  └── repo_cache    - Cached file trees & dependencies           │
│                                                                  │
│  localStorage                                                    │
│  ├── github-pat    - GitHub Personal Access Token               │
│  └── dismissed-*   - Dismissed blockers per analysis            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Installation

### Prerequisites
- Node.js 18+
- npm or yarn
- Google AI Studio API key ([Get one here](https://ai.google.dev/aistudio))
- GitHub Personal Access Token (optional, for PR creation)

### Quick Start

```bash
# Clone the repository
git clone https://github.com/JerryWu0430/DebtLens.git
cd DebtLens

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your API keys

# Initialize database
npm run db:push

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Environment Variables

Create a `.env.local` file in the project root:

```env
# Required - Gemini AI API Key
GEMINI_API_KEY=your_gemini_api_key_here

# Optional - GitHub Token (increases rate limit from 60 to 5000 req/hr)
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
```

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | Yes | Google AI Studio API key for Gemini 3 |
| `GITHUB_TOKEN` | No | Server-side GitHub token for higher rate limits |

**Note**: For PR creation, users provide their own GitHub PAT via the UI (stored in localStorage).

---

## Database

DebtLens uses SQLite with Drizzle ORM for persistence.

### Schema

```typescript
// analyses table
{
  id: integer (primary key, auto-increment),
  repoUrl: text (not null),
  painPoint: text,
  analysisType: text (default: 'general'),
  result: text (JSON blob),
  createdAt: integer (Unix timestamp)
}

// repoCache table
{
  id: integer (primary key, auto-increment),
  repoFullName: text (unique, not null),
  fileTree: text (JSON array),
  dependencies: text (JSON object),
  fetchedAt: integer (Unix timestamp)
}
```

### Commands

```bash
npm run db:push      # Push schema to database
npm run db:studio    # Open Drizzle Studio GUI
npm run db:generate  # Generate migrations
npm run db:migrate   # Run migrations
```

---

## API Reference

### POST `/api/analysis`

Run a full codebase analysis on a GitHub repository.

**Request Body:**
```json
{
  "repoUrl": "https://github.com/owner/repo",
  "painPoint": "Optional focus area",
  "analysisType": "general"
}
```

**Response:**
```json
{
  "id": 1,
  "result": {
    "blockers": [...],
    "actions": [...],
    "summary": "...",
    "dependencyGraph": {...}
  }
}
```

### POST `/api/suggest-fix`

Generate AI-powered fix suggestions for a blocker.

**Request Body:**
```json
{
  "blocker": { "id": "...", "title": "...", "description": "...", ... },
  "repoUrl": "https://github.com/owner/repo"
}
```

**Response:**
```json
{
  "suggestion": {
    "summary": "...",
    "codeChanges": [...],
    "packageUpdates": [...],
    "references": [...],
    "confidence": "high",
    "effort": "small"
  }
}
```

### POST `/api/create-pr`

Create a GitHub Pull Request from a fix suggestion.

**Request Body:**
```json
{
  "repoUrl": "https://github.com/owner/repo",
  "suggestion": {...},
  "blocker": {...},
  "token": "ghp_xxx"
}
```

**Response:**
```json
{
  "prUrl": "https://github.com/owner/repo/pull/123",
  "prNumber": 123,
  "branchName": "fix/blocker-id-description-abc123"
}
```

---

## Project Structure

```
src/
├── app/                      # Next.js App Router
│   ├── page.tsx              # Landing page
│   ├── analysis/[id]/        # Analysis results page
│   └── api/                  # API routes
│       ├── analysis/         # Analysis endpoints
│       ├── suggest-fix/      # Fix suggestion endpoint
│       ├── create-pr/        # PR creation endpoint
│       └── file/             # File content endpoint
├── components/               # React components
│   ├── ui/                   # shadcn/ui components
│   ├── graph/                # Dependency graph components
│   ├── blocker-*.tsx         # Blocker-related components
│   ├── fix-suggestion-*.tsx  # Fix suggestion components
│   └── github-token-*.tsx    # GitHub auth components
├── lib/                      # Core utilities
│   ├── gemini.ts             # Gemini AI client
│   ├── github.ts             # GitHub read API
│   ├── github-write.ts       # GitHub write API
│   ├── errors.ts             # Error handling
│   └── utils.ts              # General utilities
├── types/                    # TypeScript types
│   ├── analysis.ts           # Analysis result types
│   └── fix-suggestion.ts     # Fix suggestion types
└── db/                       # Database
    ├── index.ts              # Database connection
    └── schema.ts             # Drizzle schema
```

---

## AI Models

DebtLens uses Google Gemini 3 models:

| Task | Model | Rationale |
|------|-------|-----------|
| Blocker Analysis | `gemini-3-flash-preview` | Fast, cost-effective for scanning |
| Dependency Graph | `gemini-3-flash-preview` | Fast, handles large file sets |
| Fix Suggestions | `gemini-3-pro-preview` | Higher accuracy for code generation |

### Prompt Engineering

Key prompts are in `src/lib/gemini.ts`:

1. **Analysis Prompt** - Detects blockers with severity, includes code snippets for critical/high issues
2. **Dependency Graph Prompt** - Extracts all imports, resolves paths, detects circular dependencies
3. **Fix Suggestion Prompt** - Generates actionable code changes with before/after diffs

---


## Development

### Scripts

```bash
npm run dev       # Start development server
npm run build     # Build for production
npm run start     # Start production server
npm run lint      # Run ESLint
```

### Adding Components

This project uses [shadcn/ui](https://ui.shadcn.com/). To add components:

```bash
npx shadcn-ui@latest add [component-name]
```

## License

MIT License - see [LICENSE](LICENSE) for details.

---
