"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import mermaid from "mermaid";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GitBranch } from "lucide-react";
import { Blocker } from "@/types/analysis";
import { FilePreview } from "@/components/file-preview";

interface FileDetails {
  id: string;
  label: string;
  file?: string;
  line?: number;
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
        line: blocker?.line,
        dependencies,
        dependents,
      };
    },
    [mermaidCode, blockers]
  );

  // Navigate to file from dependencies/dependents
  const handleNavigate = useCallback(
    (nodeId: string) => {
      const info = parseNodeInfo(nodeId);
      setSelectedNode(info);
    },
    [parseNodeInfo]
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
    <div className="flex gap-4">
      {/* Diagram */}
      <Card className={selectedNode ? "flex-1" : "w-full"}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <GitBranch className="h-4 w-4" />
            Dependency Graph
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? (
            <div className="rounded border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </div>
          ) : (
            <div
              ref={containerRef}
              className="overflow-auto rounded border bg-muted/30 p-4"
            />
          )}
          <p className="text-xs text-muted-foreground">
            Click on a node to preview file
          </p>
        </CardContent>
      </Card>

      {/* File Preview Panel */}
      {selectedNode && selectedNode.file && repoUrl && (
        <div className="w-[480px] shrink-0">
          <div className="sticky top-4 h-[600px]">
            <FilePreview
              file={selectedNode.file}
              line={selectedNode.line}
              repoUrl={repoUrl}
              blocker={nodeBlocker}
              onClose={() => setSelectedNode(null)}
              onNavigate={handleNavigate}
              dependencies={selectedNode.dependencies}
              dependents={selectedNode.dependents}
            />
          </div>
        </div>
      )}
    </div>
  );
}
