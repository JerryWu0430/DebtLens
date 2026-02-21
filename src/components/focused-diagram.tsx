"use client";

import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GitBranch, X, ExternalLink } from "lucide-react";
import { Blocker, Severity } from "@/types/analysis";

interface FocusedDiagramProps {
  blocker: Blocker;
  mermaidCode: string;
  repoUrl: string;
  onClose: () => void;
}

const severityColors: Record<Severity, string> = {
  critical: "text-red-400",
  high: "text-orange-400",
  medium: "text-yellow-400",
  low: "text-blue-400",
};

function extractFocusedGraph(mermaidCode: string, targetFile: string): string {
  const lines = mermaidCode.split("\n");
  const nodes = new Map<string, string>(); // nodeId -> label
  const edges: Array<{ from: string; to: string }> = [];

  // Parse all nodes and edges
  for (const line of lines) {
    // Match node definitions: A[Label] or A["Label"]
    const defMatch = line.match(/(\w+)\s*\[["']?([^"'\]]+)["']?\]/);
    if (defMatch) {
      nodes.set(defMatch[1], defMatch[2]);
    }

    // Match edges: A --> B
    const edgeMatch = line.match(/(\w+)\s*-->\s*(\w+)/);
    if (edgeMatch) {
      edges.push({ from: edgeMatch[1], to: edgeMatch[2] });
    }
  }

  // Find the target node
  let targetNodeId: string | null = null;
  nodes.forEach((label, nodeId) => {
    if (
      !targetNodeId &&
      (label.toLowerCase().includes(targetFile.toLowerCase()) ||
        targetFile.toLowerCase().includes(label.toLowerCase()))
    ) {
      targetNodeId = nodeId;
    }
  });

  if (!targetNodeId) {
    // If no match found, return minimal graph with just the file
    return `flowchart TD
  target["${targetFile}"]
  style target fill:#ef4444,stroke:#dc2626,color:#fff`;
  }

  // Find connected nodes (1 level deep)
  const connectedNodes = new Set<string>([targetNodeId]);
  const relevantEdges: Array<{ from: string; to: string }> = [];

  for (const edge of edges) {
    if (edge.from === targetNodeId || edge.to === targetNodeId) {
      connectedNodes.add(edge.from);
      connectedNodes.add(edge.to);
      relevantEdges.push(edge);
    }
  }

  // Build focused mermaid code
  const focusedLines = ["flowchart TD"];

  // Add node definitions
  Array.from(connectedNodes).forEach((nodeId) => {
    const label = nodes.get(nodeId) || nodeId;
    focusedLines.push(`  ${nodeId}["${label}"]`);
  });

  // Add edges
  for (const edge of relevantEdges) {
    focusedLines.push(`  ${edge.from} --> ${edge.to}`);
  }

  // Style the target node
  focusedLines.push(
    `  style ${targetNodeId} fill:#ef4444,stroke:#dc2626,color:#fff`
  );

  return focusedLines.join("\n");
}

export function FocusedDiagram({
  blocker,
  mermaidCode,
  repoUrl,
  onClose,
}: FocusedDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (!containerRef.current || !blocker.file) return;

    mermaid.initialize({
      startOnLoad: false,
      theme: "base",
      themeVariables: {
        primaryColor: "hsl(var(--primary))",
        primaryTextColor: "hsl(var(--primary-foreground))",
        primaryBorderColor: "hsl(var(--border))",
        lineColor: "hsl(var(--muted-foreground))",
        secondaryColor: "hsl(var(--secondary))",
        tertiaryColor: "hsl(var(--muted))",
        background: "hsl(var(--background))",
        mainBkg: "hsl(var(--card))",
        nodeBorder: "hsl(var(--border))",
      },
      flowchart: {
        htmlLabels: true,
        curve: "basis",
        padding: 15,
      },
    });

    const container = containerRef.current;

    const renderDiagram = async () => {
      try {
        const focusedCode = extractFocusedGraph(mermaidCode, blocker.file!);
        container.innerHTML = "";

        const { svg } = await mermaid.render(
          `focused-graph-${blocker.id}`,
          focusedCode
        );
        container.innerHTML = svg;

        const svgElement = container.querySelector("svg");
        if (svgElement) {
          svgElement.style.maxWidth = "100%";
          svgElement.style.height = "auto";
        }
      } catch (err) {
        console.error("Focused diagram render error:", err);
        setError(err instanceof Error ? err.message : "Failed to render");
      }
    };

    renderDiagram();
  }, [blocker, mermaidCode]);

  const githubUrl = blocker.file
    ? `${repoUrl}/blob/main/${blocker.file}${blocker.line ? `#L${blocker.line}` : ""}`
    : repoUrl;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 border-b shrink-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <GitBranch className="h-4 w-4 shrink-0" />
              <span className="truncate">Dependency Focus</span>
            </CardTitle>
            <p className={`mt-1 text-sm font-medium ${severityColors[blocker.severity]}`}>
              {blocker.title}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <a
              href={githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-muted"
              title="View on GitHub"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {blocker.file && (
          <code className="mt-2 block rounded bg-muted px-2 py-1 font-mono text-xs text-muted-foreground">
            {blocker.file}
            {blocker.line && `:${blocker.line}`}
          </code>
        )}
      </CardHeader>

      <CardContent className="flex-1 p-4 overflow-auto">
        {error ? (
          <div className="rounded border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        ) : (
          <div
            ref={containerRef}
            className="flex items-center justify-center rounded border bg-muted/30 p-4 min-h-[200px]"
          />
        )}
      </CardContent>

      <div className="shrink-0 border-t p-3">
        <p className="text-xs text-muted-foreground">{blocker.description}</p>
        <div className="flex flex-wrap gap-2 mt-2">
          <Badge variant="secondary" className="text-xs">
            {blocker.category}
          </Badge>
          <Badge
            variant="outline"
            className={`text-xs ${
              blocker.severity === "critical"
                ? "border-red-500/30 text-red-400"
                : blocker.severity === "high"
                  ? "border-orange-500/30 text-orange-400"
                  : blocker.severity === "medium"
                    ? "border-yellow-500/30 text-yellow-400"
                    : "border-blue-500/30 text-blue-400"
            }`}
          >
            {blocker.severity}
          </Badge>
        </div>
      </div>
    </Card>
  );
}
