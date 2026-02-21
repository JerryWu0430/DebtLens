import { NextResponse } from "next/server";
import { db } from "@/db";
import { analyses } from "@/db/schema";
import { eq } from "drizzle-orm";
import { AnalysisResult } from "@/types/analysis";
import { formatErrorResponse, NotFoundError, ValidationError } from "@/lib/errors";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const analysisId = parseInt(id, 10);

    if (isNaN(analysisId)) {
      throw new ValidationError("Invalid analysis ID");
    }

    const [analysis] = await db
      .select()
      .from(analyses)
      .where(eq(analyses.id, analysisId))
      .limit(1);

    if (!analysis) {
      throw new NotFoundError("Analysis not found");
    }

    const result = analysis.result as {
      blockers?: unknown[];
      actions?: unknown[];
      dependencyGraph?: unknown;
    } | null;

    const response: AnalysisResult = {
      id: analysis.id,
      repoUrl: analysis.repoUrl,
      blockers: (result?.blockers ?? []) as AnalysisResult["blockers"],
      actions: (result?.actions ?? []) as AnalysisResult["actions"],
      dependencyGraph: result?.dependencyGraph as AnalysisResult["dependencyGraph"],
      createdAt: analysis.createdAt,
    };

    return NextResponse.json(response);
  } catch (err) {
    const { error, code, statusCode } = formatErrorResponse(err);
    return NextResponse.json({ error, code }, { status: statusCode });
  }
}
