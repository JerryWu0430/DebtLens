"use client";

import { memo } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from "@xyflow/react";
import { cn } from "@/lib/utils";

export type DependencyEdgeData = {
  isCircular?: boolean;
  isDynamic?: boolean;
  symbols?: string[];
};

function DependencyEdgeComponent(props: EdgeProps) {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    data,
    selected,
  } = props;
  const edgeData = data as DependencyEdgeData | undefined;
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const isCircular = edgeData?.isCircular;
  const isDynamic = edgeData?.isDynamic;
  const symbolCount = edgeData?.symbols?.length || 0;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        className={cn(
          "!stroke-muted-foreground",
          isCircular && "!stroke-purple-500",
          isDynamic && "!stroke-dashed",
          selected && "!stroke-primary !stroke-2"
        )}
        style={{
          strokeWidth: isCircular ? 2 : 1,
          strokeDasharray: isDynamic ? "5,5" : undefined,
        }}
        markerEnd="url(#arrow)"
      />

      {symbolCount > 0 && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: "all",
            }}
            className="px-1.5 py-0.5 rounded text-[9px] bg-background border text-muted-foreground"
          >
            {symbolCount} symbol{symbolCount > 1 ? "s" : ""}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export const DependencyEdge = memo(DependencyEdgeComponent);
