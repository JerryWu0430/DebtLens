import { NextRequest, NextResponse } from "next/server";
import { createGeminiClient } from "@/lib/gemini";
import { getFileContent } from "@/lib/github";
import { Blocker } from "@/types/analysis";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { blocker, repoUrl } = body as { blocker: Blocker; repoUrl: string };

    if (!blocker) {
      return NextResponse.json(
        { error: "Missing blocker data" },
        { status: 400 }
      );
    }

    // Try to fetch file content if file is specified
    let fileContent: string | undefined;
    if (blocker.file && repoUrl) {
      const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
      if (match) {
        const [, owner, repo] = match;
        try {
          fileContent = await getFileContent(owner, repo, blocker.file);
        } catch {
          // File fetch failed, continue without content
          console.warn(`Could not fetch file: ${blocker.file}`);
        }
      }
    }

    const gemini = createGeminiClient();
    const suggestion = await gemini.generateFixSuggestion(blocker, fileContent);

    return NextResponse.json({ suggestion });
  } catch (err) {
    console.error("Suggest fix error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to generate fix suggestion" },
      { status: 500 }
    );
  }
}
