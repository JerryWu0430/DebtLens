"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BlockerCard } from "@/components/blocker-card";
import { ActionList } from "@/components/action-list";
import { Blocker, Action, Severity } from "@/types/analysis";
import { AlertTriangle, Zap, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface BlockerSidebarProps {
  blockers: Blocker[];
  actions: Action[];
  repoUrl: string;
  dismissedIds: Set<string>;
  onSelectBlocker: (blocker: Blocker) => void;
  className?: string;
}

export function BlockerSidebar({
  blockers,
  actions,
  repoUrl,
  dismissedIds,
  onSelectBlocker,
  className,
}: BlockerSidebarProps) {
  const [showDismissed, setShowDismissed] = useState(false);

  const visibleBlockers = blockers.filter((b) =>
    showDismissed ? true : !dismissedIds.has(b.id)
  );

  const sortedBlockers = [...visibleBlockers].sort((a, b) => {
    const order: Record<Severity, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    };
    return order[a.severity] - order[b.severity];
  });

  const activeCount = blockers.filter((b) => !dismissedIds.has(b.id)).length;
  const dismissedCount = dismissedIds.size;

  return (
    <div className={cn("flex flex-col h-full border-r border-border bg-background", className)}>
      <Tabs defaultValue="blockers" className="flex flex-col h-full">
        <div className="px-4 pt-4 pb-2 border-b border-border">
          <TabsList className="w-full">
            <TabsTrigger value="blockers" className="flex-1 gap-2">
              <AlertTriangle className="h-3.5 w-3.5" />
              Blockers
              {activeCount > 0 && (
                <Badge variant="destructive" className="h-5 px-1.5 text-xs">
                  {activeCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="actions" className="flex-1 gap-2">
              <Zap className="h-3.5 w-3.5" />
              Actions
              {actions.length > 0 && (
                <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                  {actions.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="blockers" className="flex-1 m-0 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
            <span className="text-xs text-muted-foreground">
              {activeCount} active{dismissedCount > 0 && `, ${dismissedCount} dismissed`}
            </span>
            {dismissedCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => setShowDismissed(!showDismissed)}
              >
                {showDismissed ? (
                  <>
                    <EyeOff className="h-3 w-3 mr-1" />
                    Hide
                  </>
                ) : (
                  <>
                    <Eye className="h-3 w-3 mr-1" />
                    Show
                  </>
                )}
              </Button>
            )}
          </div>
          <ScrollArea className="flex-1 h-[calc(100%-40px)]">
            <div className="p-4 space-y-2">
              {sortedBlockers.length > 0 ? (
                sortedBlockers.map((blocker) => (
                  <div
                    key={blocker.id}
                    className={cn(
                      dismissedIds.has(blocker.id) && "opacity-50"
                    )}
                  >
                    <BlockerCard
                      blocker={blocker}
                      repoUrl={repoUrl}
                      onSelect={onSelectBlocker}
                    />
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No blockers found
                </p>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="actions" className="flex-1 m-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-4">
              {actions.length > 0 ? (
                <ActionList actions={actions} />
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No actions yet
                </p>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
