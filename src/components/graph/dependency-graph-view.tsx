"use client";

import { useCallback, useMemo, useState } from "react";
import {
  ReactFlow,
  Controls,
  MiniMap,
  Background,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  BackgroundVariant,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GitBranch, Network, Boxes, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DependencyGraph, Blocker, Severity } from "@/types/analysis";
import { FileNode, type FileNodeData } from "./file-node";
import { DependencyEdge, type DependencyEdgeData } from "./dependency-edge";
import { getLayoutedElements } from "./use-auto-layout";

type ViewMode = "imports" | "clusters";

interface DependencyGraphViewProps {
  graph: DependencyGraph;
  blockers?: Blocker[];
  onNodeClick?: (path: string) => void;
  className?: string;
  filterExternal?: boolean;
}

const nodeTypes = { fileNode: FileNode };
const edgeTypes = { dependency: DependencyEdge };

function isInternalFile(path: string): boolean {
  if (path.includes("(inferred)")) return false;
  if (path.includes("(environment)")) return false;
  if (path.startsWith("node_modules")) return false;
  if (path.includes("/node_modules/")) return false;
  // Only include common source file extensions
  const validExtensions = /\.(tsx?|jsx?|json|md|css|scss)$/;
  return validExtensions.test(path);
}

// Normalize import path to match file paths
function normalizeImportPath(importPath: string): string {
  let normalized = importPath;
  // Remove @ alias prefix and replace with src/
  if (normalized.startsWith("@/")) {
    normalized = "src/" + normalized.slice(2);
  }
  // Remove leading ./
  if (normalized.startsWith("./")) {
    normalized = normalized.slice(2);
  }
  return normalized;
}

// Find matching file path for an import
function findMatchingFile(importPath: string, filePaths: Set<string>): string | null {
  // Direct match
  if (filePaths.has(importPath)) return importPath;

  const normalized = normalizeImportPath(importPath);
  if (filePaths.has(normalized)) return normalized;

  // Try with extensions
  const extensions = [".ts", ".tsx", ".js", ".jsx"];
  for (const ext of extensions) {
    if (filePaths.has(normalized + ext)) return normalized + ext;
    if (filePaths.has(importPath + ext)) return importPath + ext;
  }

  // Try index files
  for (const ext of extensions) {
    if (filePaths.has(normalized + "/index" + ext)) return normalized + "/index" + ext;
    if (filePaths.has(importPath + "/index" + ext)) return importPath + "/index" + ext;
  }

  // Fuzzy match: find any file that ends with the import path
  const candidates = Array.from(filePaths);
  for (const candidate of candidates) {
    const candidateBase = candidate.replace(/\.(tsx?|jsx?)$/, "");
    const importBase = normalized.replace(/\.(tsx?|jsx?)$/, "");
    if (candidateBase.endsWith(importBase) || candidateBase.endsWith("/" + importBase)) {
      return candidate;
    }
  }

  return null;
}

function buildImportGraph(
  graph: DependencyGraph,
  blockers: Blocker[],
  filterExternal = true
): { nodes: Node<FileNodeData>[]; edges: Edge<DependencyEdgeData>[] } {
  // Handle empty/malformed graph
  if (!graph.files || graph.files.length === 0) {
    return { nodes: [], edges: [] };
  }

  // Filter external files if requested
  const filteredFiles = filterExternal
    ? graph.files.filter((f) => isInternalFile(f.path))
    : graph.files;

  const filteredPaths = new Set(filteredFiles.map((f) => f.path));

  const blockerMap = new Map<string, Severity>();
  blockers.forEach((b) => {
    if (b.file) blockerMap.set(b.file, b.severity);
  });

  const circularSet = new Set((graph.circularDeps || []).flat());
  const orphanSet = new Set(graph.orphans || []);
  const entrySet = new Set(graph.entryPoints || []);

  const nodes: Node<FileNodeData>[] = filteredFiles.map((file) => ({
    id: file.path,
    type: "fileNode",
    position: { x: 0, y: 0 },
    data: {
      label: file.path.split("/").pop() || file.path,
      path: file.path,
      fileType: file.type,
      imports: file.imports.length,
      exports: file.exports.length,
      lines: file.metrics.lines,
      complexity: file.metrics.complexity,
      issues: file.issues,
      severity: blockerMap.get(file.path),
      isCircular: circularSet.has(file.path),
      isOrphan: orphanSet.has(file.path),
      isEntryPoint: entrySet.has(file.path),
    },
  }));

  const edges: Edge<DependencyEdgeData>[] = [];
  filteredFiles.forEach((file) => {
    file.imports.forEach((imp, idx) => {
      // Find matching file path for this import
      const targetPath = findMatchingFile(imp.from, filteredPaths);
      if (!targetPath) return;

      const isCircular =
        graph.circularDeps.some(
          (cycle) => cycle.includes(file.path) && cycle.includes(targetPath)
        );

      edges.push({
        id: `${file.path}->${targetPath}-${idx}`,
        source: file.path,
        target: targetPath,
        type: "dependency",
        data: {
          isCircular,
          isDynamic: imp.isDynamic,
          symbols: imp.symbols,
        },
      });
    });
  });

  return getLayoutedElements(nodes, edges, { direction: "TB" });
}

function buildClusterGraph(
  graph: DependencyGraph,
  blockers: Blocker[],
  filterExternal = true
): { nodes: Node<FileNodeData>[]; edges: Edge<DependencyEdgeData>[] } {
  // Group by cluster with layout per cluster
  const result = buildImportGraph(graph, blockers, filterExternal);

  if (!graph.clusters || graph.clusters.length === 0) {
    return result;
  }

  // Adjust positions by cluster
  const clusterMap = new Map<string, string>();
  graph.clusters.forEach((cluster) => {
    cluster.files.forEach((f) => clusterMap.set(f, cluster.name));
  });

  const clusterOffsets = new Map<string, { x: number; y: number }>();
  let offsetX = 0;
  graph.clusters.forEach((cluster) => {
    clusterOffsets.set(cluster.name, { x: offsetX, y: 0 });
    offsetX += 400;
  });

  result.nodes = result.nodes.map((node) => {
    const cluster = clusterMap.get(node.id);
    const offset = cluster ? clusterOffsets.get(cluster) : null;
    if (offset) {
      return {
        ...node,
        position: {
          x: node.position.x + offset.x,
          y: node.position.y + offset.y,
        },
      };
    }
    return node;
  });

  return result;
}

export function DependencyGraphView({
  graph,
  blockers = [],
  onNodeClick,
  className,
  filterExternal = true,
}: DependencyGraphViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("imports");

  const initialData = useMemo(() => {
    if (viewMode === "clusters") {
      return buildClusterGraph(graph, blockers, filterExternal);
    }
    return buildImportGraph(graph, blockers, filterExternal);
  }, [graph, blockers, viewMode, filterExternal]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialData.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialData.edges);

  // Update when view mode changes
  useMemo(() => {
    const data =
      viewMode === "clusters"
        ? buildClusterGraph(graph, blockers, filterExternal)
        : buildImportGraph(graph, blockers, filterExternal);
    setNodes(data.nodes);
    setEdges(data.edges);
  }, [viewMode, graph, blockers, filterExternal, setNodes, setEdges]);

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onNodeClick?.(node.id);
    },
    [onNodeClick]
  );

  const stats = useMemo(
    () => ({
      files: nodes.length,
      circular: graph.circularDeps?.length || 0,
      orphans: graph.orphans?.length || 0,
      clusters: graph.clusters?.length || 0,
    }),
    [graph, nodes.length]
  );

  // Empty state
  if (stats.files === 0) {
    return (
      <Card className={cn("h-full flex flex-col", className)}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <GitBranch className="h-4 w-4" />
            Dependency Graph
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">No dependency data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("h-full flex flex-col", className)}>
      <CardHeader className="pb-2 shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <GitBranch className="h-4 w-4" />
            Dependency Graph
          </CardTitle>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant={viewMode === "imports" ? "default" : "ghost"}
              onClick={() => setViewMode("imports")}
              className="h-7 px-2 text-xs"
            >
              <Network className="h-3 w-3 mr-1" />
              Imports
            </Button>
            <Button
              size="sm"
              variant={viewMode === "clusters" ? "default" : "ghost"}
              onClick={() => setViewMode("clusters")}
              className="h-7 px-2 text-xs"
            >
              <Boxes className="h-3 w-3 mr-1" />
              Clusters
            </Button>
          </div>
        </div>

        <div className="flex gap-2 mt-2">
          <Badge variant="secondary" className="text-xs">
            {stats.files} files
          </Badge>
          {stats.circular > 0 && (
            <Badge variant="destructive" className="text-xs">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {stats.circular} circular
            </Badge>
          )}
          <Badge variant="outline" className="text-xs">
            {stats.clusters} clusters
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0 min-h-0">
        <div className="h-full w-full">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={handleNodeClick}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            minZoom={0.1}
            maxZoom={2}
            defaultEdgeOptions={{
              type: "dependency",
              markerEnd: { type: "arrowclosed" as const },
            }}
          >
            <Controls className="!bg-background !border-border" />
            <MiniMap
              className="!bg-background !border-border"
              nodeColor={(node) => {
                const data = node.data as FileNodeData;
                if (data.severity === "critical") return "#ef4444";
                if (data.severity === "high") return "#f97316";
                if (data.isCircular) return "#a855f7";
                return "#6b7280";
              }}
            />
            <Background variant={BackgroundVariant.Dots} gap={16} size={1} />

            <Panel position="bottom-left" className="text-xs text-muted-foreground">
              Click node to preview file
            </Panel>
          </ReactFlow>
        </div>
      </CardContent>
    </Card>
  );
}
