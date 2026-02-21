import { Badge } from "@/components/ui/badge";
import { renderWithInlineCode } from "@/components/inline-code";
import { Action } from "@/types/analysis";
import { Zap, Clock, TrendingUp } from "lucide-react";

const effortConfig: Record<string, { label: string; color: string }> = {
  small: { label: "Quick", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  medium: { label: "Medium", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  large: { label: "Large", color: "bg-red-500/20 text-red-400 border-red-500/30" },
};

const impactConfig: Record<string, { label: string; color: string }> = {
  low: { label: "Low", color: "text-muted-foreground" },
  medium: { label: "Med", color: "text-yellow-400" },
  high: { label: "High", color: "text-green-400" },
};

interface ActionItemProps {
  action: Action;
  index: number;
}

function ActionItem({ action, index }: ActionItemProps) {
  const effort = effortConfig[action.effort] || effortConfig.medium;
  const impact = impactConfig[action.impact] || impactConfig.medium;
  const isQuickWin = action.effort === "small" && action.impact === "high";

  return (
    <div className="flex items-start gap-4 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors">
      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-mono text-primary">
        {index + 1}
      </div>
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <span className="font-medium text-sm">{action.title}</span>
          {isQuickWin && (
            <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs flex-shrink-0">
              <Zap className="mr-1 h-3 w-3" />
              Quick Win
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{renderWithInlineCode(action.description)}</p>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className={`${effort.color} text-xs`}>
            <Clock className="mr-1 h-3 w-3" />
            {effort.label}
          </Badge>
          <span className={`flex items-center text-xs font-medium ${impact.color}`}>
            <TrendingUp className="mr-1 h-3 w-3" />
            {impact.label} impact
          </span>
        </div>
      </div>
    </div>
  );
}

interface ActionListProps {
  actions: Action[];
}

export function ActionList({ actions }: ActionListProps) {
  const sortedActions = [...actions].sort((a, b) => a.priority - b.priority);

  return (
    <div className="space-y-2">
      {sortedActions.map((action, index) => (
        <ActionItem key={action.id} action={action} index={index} />
      ))}
    </div>
  );
}
