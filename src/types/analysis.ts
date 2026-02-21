export type Severity = "critical" | "high" | "medium" | "low";

export interface Blocker {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  file?: string;
  line?: number;
  category: string;
}

export interface Action {
  id: string;
  title: string;
  description: string;
  priority: number; // 1 = highest
  effort: "small" | "medium" | "large";
  impact: "low" | "medium" | "high";
  blockerIds?: string[]; // related blockers
}

export interface AnalysisResult {
  id: number;
  repoUrl: string;
  blockers: Blocker[];
  actions: Action[];
  summary?: string;
  mermaidCode?: string;
  createdAt: Date;
}
