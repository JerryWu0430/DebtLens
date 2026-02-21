import { NextResponse } from "next/server";
import { db } from "@/db";
import { analyses } from "@/db/schema";
import { eq } from "drizzle-orm";
import { AnalysisResult } from "@/types/analysis";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const analysisId = parseInt(id, 10);

  if (isNaN(analysisId)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const [analysis] = await db
    .select()
    .from(analyses)
    .where(eq(analyses.id, analysisId))
    .limit(1);

  if (!analysis) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const result = analysis.result as { blockers?: unknown[]; actions?: unknown[] } | null;

  const response: AnalysisResult = {
    id: analysis.id,
    repoUrl: analysis.repoUrl,
    blockers: (result?.blockers ?? []) as AnalysisResult["blockers"],
    actions: (result?.actions ?? []) as AnalysisResult["actions"],
    mermaidCode: analysis.mermaidCode ?? undefined,
    createdAt: analysis.createdAt,
  };

  return NextResponse.json(response);
}
