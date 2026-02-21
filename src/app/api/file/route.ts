import { NextRequest, NextResponse } from "next/server";
import { getFileContent } from "@/lib/github";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const repoUrl = searchParams.get("repoUrl");
  const path = searchParams.get("path");

  if (!repoUrl || !path) {
    return NextResponse.json(
      { error: "Missing repoUrl or path" },
      { status: 400 }
    );
  }

  // Parse repo URL: https://github.com/owner/repo
  const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) {
    return NextResponse.json(
      { error: "Invalid GitHub repo URL" },
      { status: 400 }
    );
  }

  const [, owner, repo] = match;

  try {
    const content = await getFileContent(owner, repo, path);
    return NextResponse.json({ content });
  } catch (err) {
    console.error("File fetch error:", err);
    return NextResponse.json(
      { error: "Failed to fetch file" },
      { status: 404 }
    );
  }
}
