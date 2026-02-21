import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Action } from "@/types/analysis";
import { Zap, Clock, TrendingUp } from "lucide-react";

const effortConfig = {
  small: { label: "Quick Win", color: "bg-green-100 text-green-800" },
  medium: { label: "Medium", color: "bg-yellow-100 text-yellow-800" },
  large: { label: "Large", color: "bg-red-100 text-red-800" },
};

const impactConfig = {
  low: { label: "Low Impact", color: "text-muted-foreground" },
  medium: { label: "Med Impact", color: "text-yellow-600" },
  high: { label: "High Impact", color: "text-green-600" },
};

interface ActionItemProps {
  action: Action;
  index: number;
}

function ActionItem({ action, index }: ActionItemProps) {
  const effort = effortConfig[action.effort];
  const impact = impactConfig[action.impact];

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            {index + 1}
          </span>
          <CardTitle className="text-base font-medium leading-tight">
            {action.title}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="ml-9 space-y-2">
        <p className="text-sm text-muted-foreground">{action.description}</p>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className={effort.color}>
            <Clock className="mr-1 h-3 w-3" />
            {effort.label}
          </Badge>
          <span className={`flex items-center text-xs font-medium ${impact.color}`}>
            <TrendingUp className="mr-1 h-3 w-3" />
            {impact.label}
          </span>
          {action.effort === "small" && action.impact === "high" && (
            <Badge className="bg-purple-500 text-white hover:bg-purple-500/80">
              <Zap className="mr-1 h-3 w-3" />
              Quick Win
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface ActionListProps {
  actions: Action[];
}

export function ActionList({ actions }: ActionListProps) {
  const sortedActions = [...actions].sort((a, b) => a.priority - b.priority);

  return (
    <div className="space-y-3">
      {sortedActions.map((action, index) => (
        <ActionItem key={action.id} action={action} index={index} />
      ))}
    </div>
  );
}
