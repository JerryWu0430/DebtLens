"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import mermaid from "mermaid";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GitBranch, FileCode, X, ExternalLink } from "lucide-react";
import { Blocker } from "@/types/analysis";

interface FileDetails {
  id: string;
  label: string;
  file?: string;
  dependencies?: string[];
  dependents?: string[];
}

interface DependencyDiagramProps {
  mermaidCode: string;
  blockers?: Blocker[];
  repoUrl?: string;
}

export function DependencyDiagram({
  mermaidCode,
  blockers = [],
  repoUrl,
}: DependencyDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedNode, setSelectedNode] = useState<FileDetails | null>(null);
  const [error, setError] = useState<string>("");

  // Parse mermaid code to extract node info
  const parseNodeInfo = useCallback(
    (nodeId: string): FileDetails => {
      const lines = mermaidCode.split("\n");
      let label = nodeId;
      const dependencies: string[] = [];
      const dependents: string[] = [];

      for (const line of lines) {
        // Match node definitions: A[Label] or A["Label"]
        const defMatch = line.match(
          new RegExp(`${nodeId}\\s*\\[["']?([^"'\\]]+)["']?\\]`)
        );
        if (defMatch) {
          label = defMatch[1];
        }

        // Match edges: A --> B or A --> B
        const edgeMatch = line.match(/(\w+)\s*-->\s*(\w+)/);
        if (edgeMatch) {
          const [, from, to] = edgeMatch;
          if (from === nodeId) dependencies.push(to);
          if (to === nodeId) dependents.push(from);
        }
      }

      // Find matching blocker by file path
      const blocker = blockers.find(
        (b) => b.file && (b.file.includes(label) || label.includes(b.file))
      );

      return {
        id: nodeId,
        label,
        file: blocker?.file || label,
        dependencies,
        dependents,
      };
    },
    [mermaidCode, blockers]
  );

  // Handle node click
  const handleNodeClick = useCallback(
    (nodeId: string) => {
      const info = parseNodeInfo(nodeId);
      setSelectedNode(info);
    },
    [parseNodeInfo]
  );

  useEffect(() => {
    if (!containerRef.current || !mermaidCode) return;

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
        clusterBkg: "hsl(var(--muted))",
        titleColor: "hsl(var(--foreground))",
        edgeLabelBackground: "hsl(var(--background))",
      },
      flowchart: {
        htmlLabels: true,
        curve: "basis",
        padding: 20,
      },
      securityLevel: "loose", // Required for click callbacks
    });

    const container = containerRef.current;

    const renderDiagram = async () => {
      try {
        // Add click handlers to mermaid code
        let enhancedCode = mermaidCode;

        // Extract node IDs and add click events
        const nodeRegex = /(\w+)\s*\[/g;
        const nodeIds = new Set<string>();
        let nodeMatch;
        while ((nodeMatch = nodeRegex.exec(mermaidCode)) !== null) {
          nodeIds.add(nodeMatch[1]);
        }

        // Add click callbacks for each node
        const clickHandlers = Array.from(nodeIds)
          .map((id) => `click ${id} callback`)
          .join("\n");

        if (clickHandlers) {
          enhancedCode = `${mermaidCode}\n${clickHandlers}`;
        }

        // Clear previous content
        container.innerHTML = "";

        const { svg } = await mermaid.render("dependency-graph", enhancedCode);
        container.innerHTML = svg;

        // Add click event listeners to nodes
        const svgElement = container.querySelector("svg");
        if (svgElement) {
          svgElement.style.maxWidth = "100%";
          svgElement.style.height = "auto";

          // Find all clickable nodes
          const nodes = svgElement.querySelectorAll(".node");
          nodes.forEach((node) => {
            const nodeId = node.id?.replace("flowchart-", "").split("-")[0];
            if (nodeId) {
              (node as HTMLElement).style.cursor = "pointer";
              node.addEventListener("click", () => handleNodeClick(nodeId));
            }
          });
        }
      } catch (err) {
        console.error("Mermaid render error:", err);
        setError(err instanceof Error ? err.message : "Failed to render diagram");
      }
    };

    renderDiagram();

    // Cleanup
    return () => {
      if (container) {
        const nodes = container.querySelectorAll(".node");
        nodes.forEach((node) => {
          node.replaceWith(node.cloneNode(true));
        });
      }
    };
  }, [mermaidCode, handleNodeClick]);

  // Find blocker for selected node
  const nodeBlocker = selectedNode
    ? blockers.find(
        (b) =>
          b.file &&
          (b.file.includes(selectedNode.label) ||
            selectedNode.label.includes(b.file))
      )
    : null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <GitBranch className="h-4 w-4" />
            Dependency Graph
          </CardTitle>
          {selectedNode && (
            <button
              onClick={() => setSelectedNode(null)}
              className="rounded p-1 hover:bg-muted"
              aria-label="Close details"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <div className="rounded border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        ) : (
          <>
            <div
              ref={containerRef}
              className="overflow-auto rounded border bg-muted/30 p-4"
            />

            {selectedNode && (
              <div className="space-y-3 rounded border bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <FileCode className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{selectedNode.label}</span>
                  </div>
                  {repoUrl && selectedNode.file && (
                    <a
                      href={`${repoUrl}/blob/main/${selectedNode.file}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground"
                    >
                      View file
                      <ExternalLink className="ml-1 h-3 w-3" />
                    </a>
                  )}
                </div>

                {nodeBlocker && (
                  <div className="space-y-1">
                    <Badge
                      className={
                        nodeBlocker.severity === "critical"
                          ? "bg-red-500"
                          : nodeBlocker.severity === "high"
                            ? "bg-orange-500"
                            : nodeBlocker.severity === "medium"
                              ? "bg-yellow-500"
                              : "bg-blue-500"
                      }
                    >
                      {nodeBlocker.severity}
                    </Badge>
                    <p className="text-sm text-muted-foreground">
                      {nodeBlocker.description}
                    </p>
                  </div>
                )}

                <div className="grid gap-2 text-xs sm:grid-cols-2">
                  {selectedNode.dependencies &&
                    selectedNode.dependencies.length > 0 && (
                      <div>
                        <span className="font-medium text-muted-foreground">
                          Depends on:
                        </span>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {selectedNode.dependencies.map((dep) => (
                            <Badge
                              key={dep}
                              variant="outline"
                              className="cursor-pointer"
                              onClick={() => handleNodeClick(dep)}
                            >
                              {dep}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  {selectedNode.dependents &&
                    selectedNode.dependents.length > 0 && (
                      <div>
                        <span className="font-medium text-muted-foreground">
                          Used by:
                        </span>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {selectedNode.dependents.map((dep) => (
                            <Badge
                              key={dep}
                              variant="outline"
                              className="cursor-pointer"
                              onClick={() => handleNodeClick(dep)}
                            >
                              {dep}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                </div>
              </div>
            )}
          </>
        )}

        <p className="text-xs text-muted-foreground">
          Click on a node to see file details and relationships
        </p>
      </CardContent>
    </Card>
  );
}
