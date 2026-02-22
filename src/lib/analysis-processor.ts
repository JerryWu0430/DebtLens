

export interface AnalysisData {
  id: string;
  score: number;
  items: string[];
}

export interface AnalysisState {
  data: AnalysisData;
  isLoading?: boolean;
  error?: Error | null;
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

export function mergeAnalysisState(
  current: AnalysisState,
  newData: Partial<AnalysisData>
export function getDefaultAnalysisState(): AnalysisState {
  return {
    data: createEmptyAnalysis(),
    isLoading: false,
    error: null
  };
}

export function resetToDefault(): AnalysisState {
  return getDefaultAnalysisState();
}
    ...current,
    data: { ...base, ...newData },
  };
}

export function resetToDefault(): AnalysisState {
  return getDefaultAnalysisState();
}
