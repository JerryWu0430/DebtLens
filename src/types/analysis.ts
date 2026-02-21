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

// File analysis for dependency graph
export type FileType = "component" | "hook" | "util" | "api" | "type" | "config" | "test" | "style" | "unknown";

export interface FileImport {
  from: string; // source file path
  symbols: string[]; // imported symbols
  isDefault: boolean;
  isDynamic: boolean;
}

export interface FileAnalysis {
  path: string;
  type: FileType;
  imports: FileImport[];
  exports: string[];
  metrics: {
    lines: number;
    complexity: number; // cyclomatic complexity estimate
  };
  issues: string[]; // brief issue descriptions
}

export interface DependencyGraph {
  files: FileAnalysis[];
  circularDeps: string[][]; // arrays of file paths forming cycles
  entryPoints: string[]; // files with no dependents
  orphans: string[]; // files with no dependencies or dependents
  clusters: FileCluster[];
}

export interface FileCluster {
  name: string; // e.g., "auth", "api", "components"
  files: string[];
  cohesion: number; // 0-1, how tightly coupled
}

export interface AnalysisResult {
  id: number;
  repoUrl: string;
  blockers: Blocker[];
  actions: Action[];
  summary?: string;
  mermaidCode?: string; // deprecated, kept for compatibility
  dependencyGraph?: DependencyGraph;
  createdAt: Date;
}
