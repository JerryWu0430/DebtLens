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

    // 2. Fetch key files for analysis
    const relevantExts = [".ts", ".tsx", ".js", ".jsx", ".json", ".md"];
    const relevantFiles = filePaths
      .filter((p) => relevantExts.some((ext) => p.endsWith(ext)))
      .filter((p) => !p.includes("node_modules"))
      .filter((p) => !p.includes(".min."))
      .slice(0, 30); // limit files

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
    try {
      const gemini = createGeminiClient();
      const prompt = painPoint
        ? `Focus on: ${painPoint}`
        : "Analyze for technical debt, code quality, and architecture issues.";

      result = await gemini.analyzeStructured(fileContents, prompt);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      throw new AIError(`Analysis failed: ${msg}`);
    }

    // 6. Store analysis result
    const [inserted] = await db
      .insert(analyses)
      .values({
        repoUrl,
        painPoint,
        analysisType,
        result: result as unknown as Record<string, unknown>,
      })
      .returning();

    return NextResponse.json({
      id: inserted.id,
      result,
      warnings: warnings.length > 0 ? warnings : undefined,
    });
  } catch (err) {
    console.error("Analysis error:", err);
    const { error, code, statusCode } = formatErrorResponse(err);
    return NextResponse.json({ error, code }, { status: statusCode });
  }
}
