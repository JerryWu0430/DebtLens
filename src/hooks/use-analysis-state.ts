"use client";

import { useState, useCallback } from "react";
import { processAnalysisData, AnalysisData } from "@/lib/analysis-processor";

export interface AnalysisState {
  data: AnalysisData | null;
  loading: boolean;
  error: string | null;
}

export function useAnalysisState() {
  const [state, setState] = useState<AnalysisState>({
    data: null,
    loading: false,
    error: null,
  });

  const process = useCallback((raw: unknown) => {
    setState((s) => ({ ...s, loading: true }));
    try {
      const processed = processAnalysisData(raw);
      setState({ data: processed, loading: false, error: null });
    } catch (e) {
      setState({ data: null, loading: false, error: String(e) });
    }
  }, []);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return { ...state, process, reset };
}

export function getDefaultAnalysisState(): AnalysisState {
  return { data: null, loading: false, error: null };
}
