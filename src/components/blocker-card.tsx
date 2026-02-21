import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Blocker, Severity } from "@/types/analysis";
import { AlertTriangle, AlertCircle, Info, AlertOctagon } from "lucide-react";

const severityConfig: Record<
  Severity,
  { color: string; icon: React.ElementType; label: string }
> = {
  critical: {
    color: "bg-red-500 text-white hover:bg-red-500/80",
    icon: AlertOctagon,
    label: "Critical",
  },
  high: {
    color: "bg-orange-500 text-white hover:bg-orange-500/80",
    icon: AlertTriangle,
    label: "High",
  },
  medium: {
    color: "bg-yellow-500 text-black hover:bg-yellow-500/80",
    icon: AlertCircle,
    label: "Medium",
  },
  low: {
    color: "bg-blue-500 text-white hover:bg-blue-500/80",
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
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base font-medium leading-tight">
            {blocker.title}
          </CardTitle>
          <Badge className={config.color}>
            <Icon className="mr-1 h-3 w-3" />
            {config.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm text-muted-foreground">{blocker.description}</p>
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge variant="outline">{blocker.category}</Badge>
          {blocker.file && (
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono">
              {blocker.file}
              {blocker.line && `:${blocker.line}`}
            </code>
          )}
        </div>
      </CardContent>
    </Card>
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
    <div className="space-y-3">
      {sortedBlockers.map((blocker) => (
        <BlockerCard key={blocker.id} blocker={blocker} />
      ))}
    </div>
  );
}
