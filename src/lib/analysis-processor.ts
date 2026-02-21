

export interface AnalysisData {
  id: string;
  score: number;
  items: string[];
}

export function processAnalysisData(raw: unknown): AnalysisData {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid analysis data");
  }

  const obj = raw as Record<string, unknown>;
  return {
    id: String(obj.id || "unknown"),
    score: Number(obj.score || 0),
    items: Array.isArray(obj.items) ? obj.items.map(String) : [],
  };
}

export function createEmptyAnalysis(): AnalysisData {
  return { id: "", score: 0, items: [] };
}
export function mergeAnalysisState<T extends { data?: AnalysisData }>(
  current: T,
  newData: Partial<AnalysisData>
): T {
  const base = current.data || createEmptyAnalysis();
  return {
    ...current,
    data: { ...base, ...newData },
  };
}
}
