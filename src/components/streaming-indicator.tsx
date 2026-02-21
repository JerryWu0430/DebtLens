"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface StreamingIndicatorProps {
  message?: string;
  className?: string;
}

export function StreamingIndicator({
  message = "Analyzing...",
  className,
}: StreamingIndicatorProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 text-sm text-muted-foreground font-mono",
        className
      )}
    >
      <Loader2 className="h-4 w-4 animate-spin" />
      <span>{message}</span>
      <span className="inline-flex">
        <span className="animate-pulse">.</span>
        <span className="animate-pulse [animation-delay:0.2s]">.</span>
        <span className="animate-pulse [animation-delay:0.4s]">.</span>
      </span>
    </div>
  );
}

interface AnalysisProgressProps {
  stage: "fetching" | "analyzing" | "generating";
  className?: string;
}

const stageMessages: Record<AnalysisProgressProps["stage"], string> = {
  fetching: "Fetching repository data",
  analyzing: "Analyzing code structure",
  generating: "Generating insights",
};

export function AnalysisProgress({ stage, className }: AnalysisProgressProps) {
  const stages: AnalysisProgressProps["stage"][] = [
    "fetching",
    "analyzing",
    "generating",
  ];
  const currentIdx = stages.indexOf(stage);

  return (
    <div className={cn("space-y-4", className)}>
      <StreamingIndicator message={stageMessages[stage]} />
      <div className="flex gap-2">
        {stages.map((s, idx) => (
          <div
            key={s}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              idx < currentIdx
                ? "bg-primary"
                : idx === currentIdx
                  ? "bg-primary/50 animate-pulse"
                  : "bg-muted"
            )}
          />
        ))}
      </div>
    </div>
  );
}
