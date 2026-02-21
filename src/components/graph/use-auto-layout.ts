import { useMemo } from "react";
import dagre from "dagre";
import type { Node, Edge } from "@xyflow/react";

export type LayoutDirection = "TB" | "LR" | "BT" | "RL";

const NODE_WIDTH = 160;
const NODE_HEIGHT = 60;

export interface LayoutOptions {
  direction?: LayoutDirection;
  nodeWidth?: number;
  nodeHeight?: number;
  rankSep?: number; // vertical spacing
  nodeSep?: number; // horizontal spacing
}

export function getLayoutedElements<T extends Record<string, unknown>>(
  nodes: Node<T>[],
  edges: Edge[],
  options: LayoutOptions = {}
): { nodes: Node<T>[]; edges: Edge[] } {
  const {
    direction = "TB",
    nodeWidth = NODE_WIDTH,
    nodeHeight = NODE_HEIGHT,
    rankSep = 80,
    nodeSep = 40,
  } = options;

  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({
    rankdir: direction,
    ranksep: rankSep,
    nodesep: nodeSep,
  });

  // Add nodes
  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  // Add edges
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  // Calculate layout
  dagre.layout(dagreGraph);

  const isHorizontal = direction === "LR" || direction === "RL";

  // Map positions back to nodes
  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      targetPosition: isHorizontal ? "left" : "top",
      sourcePosition: isHorizontal ? "right" : "bottom",
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    } as Node<T>;
  });

  return { nodes: layoutedNodes, edges };
}

export function useAutoLayout<T extends Record<string, unknown>>(
  nodes: Node<T>[],
  edges: Edge[],
  options: LayoutOptions = {}
) {
  return useMemo(() => {
    if (nodes.length === 0) return { nodes: [], edges: [] };
    return getLayoutedElements(nodes, edges, options);
  }, [nodes, edges, options]);
}
