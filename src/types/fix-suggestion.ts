export interface CodeChange {
  file: string;
  startLine: number;
  endLine: number;
  originalCode: string;
  suggestedCode: string;
  explanation: string;
}

export interface PackageUpdate {
  package: string;
  currentVersion?: string;
  suggestedVersion: string;
  reason: string;
}

export interface Reference {
  title: string;
  url: string;
}

export interface FixSuggestion {
  summary: string;
  codeChanges: CodeChange[];
  packageUpdates: PackageUpdate[];
  references: Reference[];
  confidence: "low" | "medium" | "high";
  effort: "small" | "medium" | "large";
}
