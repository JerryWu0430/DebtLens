import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { analyses, repoCache } from "@/db/schema";
import { getFileTree, getFileContent, getPackageJson } from "@/lib/github";
import { createGeminiClient } from "@/lib/gemini";
import {
  ValidationError,
  GitHubError,
  AIError,
  formatErrorResponse,
} from "@/lib/errors";

type ParsedRepo = { owner: string; repo: string };
type ParseError = { error: string };

function parseRepoUrl(url: string): ParsedRepo | ParseError {
  const trimmed = url.trim();

  if (!trimmed) {
    return { error: "Repository URL is required" };
  }

  // reject obviously invalid URLs
  if (trimmed.includes(" ")) {
    return { error: "URL cannot contain spaces" };
  }

  // reject non-github URLs
  if (trimmed.includes("://") && !trimmed.includes("github.com")) {
    return { error: "Only GitHub repositories are supported" };
  }

  // handles: https://github.com/owner/repo, github.com/owner/repo, owner/repo
  const patterns = [
    /github\.com\/([^/]+)\/([^/\s]+)/,
    /^([^/\s]+)\/([^/\s]+)$/,
  ];

  const cleaned = trimmed.replace(/\.git$/, "").replace(/\/$/, "");

  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match) {
      const owner = match[1];
      const repo = match[2];

      // validate owner/repo format
      if (owner.startsWith("-") || repo.startsWith("-")) {
        return { error: "Invalid repository name format" };
      }

      return { owner, repo };
    }
  }

  return { error: "Invalid GitHub URL. Use format: owner/repo or https://github.com/owner/repo" };
}

function isParseError(result: ParsedRepo | ParseError): result is ParseError {
  return "error" in result;
}

// Smart file selection - prioritizes actual source code over config
function selectRelevantFiles(filePaths: string[], maxFiles = 80): string[] {
  const sourceExts = [".ts", ".tsx", ".js", ".jsx"];
  const configExts = [".json", ".md", ".yml", ".yaml"];

  // Filter out obviously irrelevant files
  const candidates = filePaths.filter((p) => {
    const ext = "." + (p.split(".").pop() || "");
    if (![...sourceExts, ...configExts].includes(ext)) return false;
    if (p.includes("node_modules")) return false;
    if (p.includes(".min.")) return false;
    if (p.includes("dist/") || p.includes("build/") || p.includes(".next/")) return false;
    if (p.includes("coverage/") || p.includes(".cache/")) return false;
    return true;
  });

  // Scoring function - higher = more important
  const scoreFile = (path: string): number => {
    let score = 0;
    const lower = path.toLowerCase();
    const ext = "." + (path.split(".").pop() || "");

    // Source code > config
    if (sourceExts.includes(ext)) score += 100;

    // Prioritize key directories
    if (lower.includes("/src/")) score += 50;
    if (lower.includes("/app/")) score += 50;
    if (lower.includes("/pages/")) score += 45;
    if (lower.includes("/lib/")) score += 40;
    if (lower.includes("/utils/")) score += 35;
    if (lower.includes("/hooks/")) score += 35;
    if (lower.includes("/components/")) score += 30;
    if (lower.includes("/api/")) score += 40;
    if (lower.includes("/server/")) score += 40;
    if (lower.includes("/services/")) score += 35;
    if (lower.includes("/controllers/")) score += 35;
    if (lower.includes("/routes/")) score += 35;
    if (lower.includes("/models/")) score += 30;
    if (lower.includes("/types/")) score += 25;

    // Deprioritize test/config files
    if (lower.includes(".test.") || lower.includes(".spec.")) score -= 30;
    if (lower.includes("__tests__") || lower.includes("__mocks__")) score -= 30;
    if (lower.includes("/test/") || lower.includes("/tests/")) score -= 25;
    if (lower.includes(".config.") || lower.includes("config/")) score -= 20;
    if (lower.includes(".d.ts")) score -= 15;

    // Important root files
    if (path === "package.json") score += 80;
    if (path === "tsconfig.json") score += 20;
    if (lower.endsWith("readme.md")) score -= 10;

    // Entry points are important
    if (lower.includes("index.") && !lower.includes("test")) score += 15;
    if (lower.includes("main.") || lower.includes("app.")) score += 20;
    if (lower.includes("page.tsx") || lower.includes("page.ts")) score += 25;
    if (lower.includes("route.ts") || lower.includes("route.tsx")) score += 25;
    if (lower.includes("layout.tsx") || lower.includes("layout.ts")) score += 20;

    // Deeper nesting = less important (but not too much penalty)
    const depth = path.split("/").length;
    score -= Math.min(depth * 2, 10);

    return score;
  };

  // Score and sort
  const scored = candidates.map((p) => ({ path: p, score: scoreFile(p) }));
  scored.sort((a, b) => b.score - a.score);

  // Take top files but ensure diversity across directories
  const selected: string[] = [];
  const dirCounts = new Map<string, number>();
  const maxPerDir = 10; // Don't take more than 10 files from same directory

  for (const { path } of scored) {
    if (selected.length >= maxFiles) break;

    const dir = path.split("/").slice(0, -1).join("/") || "/";
    const count = dirCounts.get(dir) || 0;

    if (count < maxPerDir) {
      selected.push(path);
      dirCounts.set(dir, count + 1);
    }
  }

  return selected;
}

// Transform Gemini blocker output to frontend Blocker type
function transformBlockers(blockers: Array<{
  file: string;
  line?: number;
  description: string;
  severity: string;
  codeSnippets?: Array<{
    file: string;
    startLine: number;
    endLine: number;
    code: string;
    explanation: string;
  }>;
}>) {
  return blockers.map((b, i) => ({
    id: `blocker-${i}`,
    title: b.description.split(".")[0].slice(0, 80), // First sentence as title
    description: b.description,
    severity: b.severity as "low" | "medium" | "high" | "critical",
    file: b.file,
    line: b.line,
    category: inferCategory(b.file, b.description),
    codeSnippets: b.codeSnippets,
  }));
}

// Transform Gemini action output to frontend Action type
function transformActions(actions: Array<{
  type: string;
  file: string;
  description: string;
  priority: number;
}>) {
  return actions.map((a, i) => ({
    id: `action-${i}`,
    title: a.description.split(".")[0].slice(0, 80),
    description: a.description,
    priority: a.priority,
    effort: inferEffort(a.type, a.description),
    impact: inferImpact(a.priority),
    blockerIds: [],
  }));
}

function inferCategory(file: string, desc: string): string {
  const lower = desc.toLowerCase();
  if (lower.includes("security") || lower.includes("vulnerab")) return "security";
  if (lower.includes("performance") || lower.includes("slow")) return "performance";
  if (lower.includes("test") || lower.includes("coverage")) return "testing";
  if (lower.includes("deprecated") || lower.includes("outdated")) return "maintenance";
  if (lower.includes("type") || lower.includes("any")) return "type-safety";
  if (file.includes("config") || file.includes(".json")) return "configuration";
  return "code-quality";
}

function inferEffort(type: string, desc: string): "small" | "medium" | "large" {
  const lower = desc.toLowerCase();
  if (type === "document" || lower.includes("comment")) return "small";
  if (type === "refactor" || lower.includes("restructure")) return "large";
  if (lower.includes("simple") || lower.includes("quick")) return "small";
  return "medium";
}

function inferImpact(priority: number): "low" | "medium" | "high" {
  if (priority <= 2) return "high";
  if (priority <= 4) return "medium";
  return "low";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { repoUrl, painPoint = "", analysisType = "general" } = body;

    // Validation
    if (!repoUrl) {
      throw new ValidationError("Repository URL is required");
    }

    const parsed = parseRepoUrl(repoUrl);
    if (isParseError(parsed)) {
      throw new ValidationError(parsed.error);
    }

    const { owner, repo } = parsed;
    const repoFullName = `${owner}/${repo}`;

    // 1. Fetch file tree from GitHub
    let tree;
    try {
      tree = await getFileTree(owner, repo);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      if (msg.includes("Not Found") || msg.includes("404")) {
        throw new GitHubError(
          `Repository "${repoFullName}" not found or is private`,
          404
        );
      }
      if (msg.includes("rate limit")) {
        throw new GitHubError(
          "GitHub rate limit exceeded. Try again in a few minutes.",
          429
        );
      }
      throw new GitHubError(`Failed to fetch repository: ${msg}`);
    }

    const filePaths = tree.tree
      .filter((item) => item.type === "blob")
      .map((item) => item.path);

    // Check for large repo truncation
    const warnings: string[] = [];
    if (tree.truncated) {
      warnings.push(
        `Repository is large (${filePaths.length}+ files). Analysis is based on partial file tree.`
      );
    }

    // 2. Fetch key files for analysis with smart selection
    const relevantFiles = selectRelevantFiles(filePaths);

    const fileContents: { path: string; content: string }[] = [];
    const fetchErrors: string[] = [];

    for (const path of relevantFiles) {
      try {
        const content = await getFileContent(owner, repo, path);
        fileContents.push({ path, content });
      } catch {
        fetchErrors.push(path);
      }
    }

    if (fileContents.length === 0) {
      throw new GitHubError(
        "Could not read any files from the repository. It may be empty or contain unsupported file types."
      );
    }

    // 3. Get package.json for deps
    const packageJson = await getPackageJson(owner, repo);
    const dependencies = packageJson
      ? {
          ...(packageJson.dependencies as Record<string, string> | undefined),
          ...(packageJson.devDependencies as
            | Record<string, string>
            | undefined),
        }
      : {};

    // 4. Cache repo data
    await db
      .insert(repoCache)
      .values({
        repoFullName,
        fileTree: filePaths,
        dependencies,
      })
      .onConflictDoUpdate({
        target: repoCache.repoFullName,
        set: {
          fileTree: filePaths,
          dependencies,
          fetchedAt: new Date(),
        },
      });

    // 5. Run Gemini analysis
    let result;
    let dependencyGraph;
    try {
      const gemini = createGeminiClient();
      const prompt = painPoint
        ? `Focus on: ${painPoint}`
        : "Analyze for technical debt, code quality, and architecture issues.";

      // Run both analyses in parallel
      const [analysisResult, graphResult] = await Promise.all([
        gemini.analyzeStructured(fileContents, prompt),
        gemini.analyzeDependencyGraph(fileContents),
      ]);

      result = analysisResult;
      dependencyGraph = graphResult;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      throw new AIError(`Analysis failed: ${msg}`);
    }

    // 6. Transform and store analysis result
    const transformedResult = {
      blockers: transformBlockers(result.blockers || []),
      actions: transformActions(result.actions || []),
      summary: result.summary,
      dependencyGraph,
    };

    const [inserted] = await db
      .insert(analyses)
      .values({
        repoUrl,
        painPoint,
        analysisType,
        result: transformedResult as unknown as Record<string, unknown>,
      })
      .returning();

    return NextResponse.json({
      id: inserted.id,
      result: transformedResult,
      warnings: warnings.length > 0 ? warnings : undefined,
    });
  } catch (err) {
    console.error("Analysis error:", err);
    const { error, code, statusCode } = formatErrorResponse(err);
    return NextResponse.json({ error, code }, { status: statusCode });
  }
}
