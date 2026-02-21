import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { analyses, repoCache } from "@/db/schema";
import { getFileTree, getFileContent, getPackageJson } from "@/lib/github";
import { createGeminiClient } from "@/lib/gemini";

function parseRepoUrl(url: string): { owner: string; repo: string } | null {
  // handles: https://github.com/owner/repo, github.com/owner/repo, owner/repo
  const patterns = [
    /github\.com\/([^/]+)\/([^/\s]+)/,
    /^([^/\s]+)\/([^/\s]+)$/,
  ];
  for (const pattern of patterns) {
    const match = url.trim().replace(/\.git$/, "").match(pattern);
    if (match) return { owner: match[1], repo: match[2] };
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { repoUrl, painPoint = "", analysisType = "general" } = body;

    if (!repoUrl) {
      return NextResponse.json({ error: "repoUrl required" }, { status: 400 });
    }

    const parsed = parseRepoUrl(repoUrl);
    if (!parsed) {
      return NextResponse.json({ error: "Invalid repo URL" }, { status: 400 });
    }

    const { owner, repo } = parsed;
    const repoFullName = `${owner}/${repo}`;

    // 1. Fetch file tree from GitHub
    const tree = await getFileTree(owner, repo);
    const filePaths = tree.tree
      .filter((item) => item.type === "blob")
      .map((item) => item.path);

    // 2. Fetch key files for analysis
    const relevantExts = [".ts", ".tsx", ".js", ".jsx", ".json", ".md"];
    const relevantFiles = filePaths
      .filter((p) => relevantExts.some((ext) => p.endsWith(ext)))
      .filter((p) => !p.includes("node_modules"))
      .filter((p) => !p.includes(".min."))
      .slice(0, 30); // limit files

    const fileContents: { path: string; content: string }[] = [];
    for (const path of relevantFiles) {
      try {
        const content = await getFileContent(owner, repo, path);
        fileContents.push({ path, content });
      } catch {
        // skip unreadable files
      }
    }

    // 3. Get package.json for deps
    const packageJson = await getPackageJson(owner, repo);
    const dependencies = packageJson
      ? {
          ...(packageJson.dependencies as Record<string, string> | undefined),
          ...(packageJson.devDependencies as Record<string, string> | undefined),
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
    const gemini = createGeminiClient();
    const prompt = painPoint
      ? `Focus on: ${painPoint}`
      : "Analyze for technical debt, code quality, and architecture issues.";

    const result = await gemini.analyzeStructured(fileContents, prompt);

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

    return NextResponse.json({ id: inserted.id, result });
  } catch (err) {
    console.error("Analysis error:", err);
    const message = err instanceof Error ? err.message : "Analysis failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
