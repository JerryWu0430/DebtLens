"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  FileCode,
  FileJson,
  FileCog,
  FileType,
  FileText,
  TestTube,
  Palette,
  CircleAlert,
} from "lucide-react";
import type { FileType as FileTypeEnum, Severity } from "@/types/analysis";
import { cn } from "@/lib/utils";

export type FileNodeData = {
  label: string;
  path: string;
  fileType: FileTypeEnum;
  imports: number;
  exports: number;
  lines: number;
  complexity: number;
  issues: string[];
  severity?: Severity;
  isCircular?: boolean;
  isOrphan?: boolean;
  isEntryPoint?: boolean;
};

const fileTypeIcons: Record<FileTypeEnum, typeof FileCode> = {
  component: FileCode,
  hook: FileCog,
  util: FileType,
  api: FileJson,
  type: FileText,
  config: FileCog,
  test: TestTube,
  style: Palette,
  unknown: FileText,
};

const severityColors: Record<Severity, string> = {
  critical: "border-red-500 bg-red-500/10",
  high: "border-orange-500 bg-orange-500/10",
  medium: "border-yellow-500 bg-yellow-500/10",
  low: "border-blue-500 bg-blue-500/10",
};

function FileNodeComponent(props: NodeProps) {
  const { data, selected } = props;
  const nodeData = data as FileNodeData;
  const Icon = fileTypeIcons[nodeData.fileType] || FileText;
  const hasIssues = nodeData.issues && nodeData.issues.length > 0;
  const severityClass = nodeData.severity ? severityColors[nodeData.severity] : "";

  return (
    <div
      className={cn(
        "px-3 py-2 rounded-md border bg-card text-card-foreground shadow-sm min-w-[140px]",
        "transition-all duration-150",
        selected && "ring-2 ring-primary",
        severityClass,
        nodeData.isCircular && "border-purple-500 bg-purple-500/10",
        nodeData.isOrphan && "border-gray-500 bg-gray-500/10 opacity-60",
        nodeData.isEntryPoint && "border-green-500 bg-green-500/10"
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-muted-foreground !w-2 !h-2"
      />

      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="text-sm font-medium truncate max-w-[120px]">
          {nodeData.label}
        </span>
        {hasIssues && (
          <CircleAlert className="h-3 w-3 text-yellow-500 shrink-0" />
        )}
      </div>

      <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
        <span>{nodeData.lines}L</span>
        <span>C:{nodeData.complexity}</span>
        <span>↓{nodeData.imports}</span>
        <span>↑{nodeData.exports}</span>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-muted-foreground !w-2 !h-2"
      />
    </div>
  );
}

export const FileNode = memo(FileNodeComponent);
