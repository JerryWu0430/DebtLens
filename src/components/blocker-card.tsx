"use client";

import { Badge } from "@/components/ui/badge";
import { FileHoverPreview } from "@/components/file-hover-preview";
import { renderWithInlineCode } from "@/components/inline-code";
import { Blocker, Severity } from "@/types/analysis";
import { AlertTriangle, AlertCircle, Info, AlertOctagon, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const severityConfig: Record<
  Severity,
  { color: string; icon: React.ElementType; label: string }
> = {
  critical: {
    color: "bg-red-500/20 text-red-400 border-red-500/30",
    icon: AlertOctagon,
    label: "Critical",
  },
  high: {
    color: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    icon: AlertTriangle,
    label: "High",
  },
  medium: {
    color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    icon: AlertCircle,
    label: "Medium",
  },
  low: {
    color: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    icon: Info,
    label: "Low",
  },
};

interface BlockerCardProps {
  blocker: Blocker;
  repoUrl?: string;
  isSelected?: boolean;
  onSelect?: (blocker: Blocker) => void;
}

export function BlockerCard({ blocker, repoUrl, isSelected, onSelect }: BlockerCardProps) {
  const config = severityConfig[blocker.severity];
  const Icon = config.icon;
  const isClickable = !!onSelect;

  const iconColor = config.color.includes("red")
    ? "text-red-400"
    : config.color.includes("orange")
      ? "text-orange-400"
      : config.color.includes("yellow")
        ? "text-yellow-400"
        : "text-blue-400";

  return (
    <div
      className={cn(
        "flex items-start gap-4 p-4 rounded-lg border transition-all",
        isClickable && "cursor-pointer hover:bg-muted/50",
        isSelected
          ? "border-primary bg-primary/5 ring-1 ring-primary/20"
          : "border-border"
      )}
      onClick={() => onSelect?.(blocker)}
    >
      <div className="flex-shrink-0 mt-0.5">
        <Icon className={cn("h-5 w-5", iconColor)} />
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <span className="font-medium text-sm">{blocker.title}</span>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge variant="outline" className={cn(config.color, "text-xs")}>
              {config.label}
            </Badge>
            {isClickable && (
              <ChevronRight className={cn(
                "h-4 w-4 transition-transform",
                isSelected ? "text-primary rotate-90" : "text-muted-foreground"
              )} />
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{renderWithInlineCode(blocker.description)}</p>
        <div className="flex flex-wrap gap-2 text-xs pt-1">
          <Badge variant="secondary" className="text-xs">
            {blocker.category}
          </Badge>
          {blocker.file && (
            repoUrl ? (
              <FileHoverPreview file={blocker.file} line={blocker.line} repoUrl={repoUrl}>
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-muted-foreground hover:bg-muted/80 hover:text-foreground cursor-pointer transition-colors">
                  {blocker.file}
                  {blocker.line && `:${blocker.line}`}
                </code>
              </FileHoverPreview>
            ) : (
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-muted-foreground">
                {blocker.file}
                {blocker.line && `:${blocker.line}`}
              </code>
            )
          )}
        </div>
      </div>
    </div>
  );
}

interface BlockerListProps {
  blockers: Blocker[];
  repoUrl?: string;
  selectedBlocker?: Blocker | null;
  onSelectBlocker?: (blocker: Blocker) => void;
}

export function BlockerList({
  blockers,
  repoUrl,
  selectedBlocker,
  onSelectBlocker,
}: BlockerListProps) {
  const sortedBlockers = [...blockers].sort((a, b) => {
    const order: Record<Severity, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    };
    return order[a.severity] - order[b.severity];
  });

  return (
    <div className="space-y-2">
      {sortedBlockers.map((blocker) => (
        <BlockerCard
          key={blocker.id}
          blocker={blocker}
          repoUrl={repoUrl}
          isSelected={selectedBlocker?.id === blocker.id}
          onSelect={onSelectBlocker}
        />
      ))}
    </div>
  );
}
