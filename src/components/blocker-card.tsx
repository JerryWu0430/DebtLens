import { Badge } from "@/components/ui/badge";
import { Blocker, Severity } from "@/types/analysis";
import { AlertTriangle, AlertCircle, Info, AlertOctagon } from "lucide-react";

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
}

export function BlockerCard({ blocker }: BlockerCardProps) {
  const config = severityConfig[blocker.severity];
  const Icon = config.icon;

  return (
    <div className="flex items-start gap-4 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors">
      <div className="flex-shrink-0 mt-0.5">
        <Icon className={`h-5 w-5 ${config.color.includes("red") ? "text-red-400" : config.color.includes("orange") ? "text-orange-400" : config.color.includes("yellow") ? "text-yellow-400" : "text-blue-400"}`} />
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <span className="font-medium text-sm">{blocker.title}</span>
          <Badge variant="outline" className={`${config.color} text-xs flex-shrink-0`}>
            {config.label}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{blocker.description}</p>
        <div className="flex flex-wrap gap-2 text-xs pt-1">
          <Badge variant="secondary" className="text-xs">{blocker.category}</Badge>
          {blocker.file && (
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-muted-foreground">
              {blocker.file}
              {blocker.line && `:${blocker.line}`}
            </code>
          )}
        </div>
      </div>
    </div>
  );
}

interface BlockerListProps {
  blockers: Blocker[];
}

export function BlockerList({ blockers }: BlockerListProps) {
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
        <BlockerCard key={blocker.id} blocker={blocker} />
      ))}
    </div>
  );
}
