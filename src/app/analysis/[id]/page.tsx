"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { BlockerSidebar } from "@/components/blocker-sidebar";
import { DependencyGraphView } from "@/components/graph";
import { FilePreview } from "@/components/file-preview";
import { BlockerDetailModal } from "@/components/blocker-detail-modal";
import { AnalysisSkeleton } from "@/components/analysis-skeleton";
import { ErrorBoundary } from "@/components/error-boundary";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import { AnalysisResult, Blocker, Action, DependencyGraph } from "@/types/analysis";
import {
  ArrowLeft,
  ExternalLink,
  Loader2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";

type StreamingState = "idle" | "loading" | "streaming" | "complete" | "error";

interface ApiError {
  error: string;
  code?: string;
}

// LocalStorage key for dismissed blockers
const getDismissedKey = (id: string) => `dismissed-blockers-${id}`;

function useDismissedBlockers(analysisId: string) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    const stored = localStorage.getItem(getDismissedKey(analysisId));
    if (stored) {
      try {
        setDismissed(new Set(JSON.parse(stored)));
      } catch {
        // ignore parse errors
      }
    }
  }, [analysisId]);

  const dismiss = useCallback(
    (blockerId: string) => {
      setDismissed((prev) => {
        const next = new Set(prev);
        next.add(blockerId);
        localStorage.setItem(
          getDismissedKey(analysisId),
          JSON.stringify(Array.from(next))
        );
        return next;
      });
    },
    [analysisId]
  );

  const restore = useCallback(
    (blockerId: string) => {
      setDismissed((prev) => {
        const next = new Set(prev);
        next.delete(blockerId);
        localStorage.setItem(
          getDismissedKey(analysisId),
          JSON.stringify(Array.from(next))
        );
        return next;
      });
    },
    [analysisId]
  );

  return { dismissed, dismiss, restore };
}

export default function AnalysisPage() {
  const params = useParams();
  const id = params.id as string;

  const [state, setState] = useState<StreamingState>("loading");
  const [blockers, setBlockers] = useState<Blocker[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [repoUrl, setRepoUrl] = useState<string>("");
  const [dependencyGraph, setDependencyGraph] = useState<DependencyGraph | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [selectedBlocker, setSelectedBlocker] = useState<Blocker | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const { dismissed, dismiss } = useDismissedBlockers(id);

  const fetchAnalysis = async () => {
    setState("loading");
    setError(null);

    try {
      const res = await fetch(`/api/analysis/${id}`);
      const data = await res.json();

      if (!res.ok) {
        throw {
          error: data.error || "Failed to load analysis",
          code: data.code,
        };
      }

      const result = data as AnalysisResult;
      setRepoUrl(result.repoUrl);
      setBlockers(result.blockers);
      setActions(result.actions);
      if (result.dependencyGraph) {
        setDependencyGraph(result.dependencyGraph);
      }
      setState("complete");
    } catch (err) {
      if (err && typeof err === "object" && "error" in err) {
        setError(err as ApiError);
      } else {
        setError({
          error: err instanceof Error ? err.message : "Failed to load",
        });
      }
      setState("error");
    }
  };

  useEffect(() => {
    fetchAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleSelectBlocker = (blocker: Blocker) => {
    setSelectedBlocker(blocker);
    setModalOpen(true);
    // Don't open file sheet - modal shows all info
  };

  const handleDismissBlocker = (blockerId: string) => {
    dismiss(blockerId);
    setModalOpen(false);
    setSelectedBlocker(null);
  };

  if (state === "loading") {
    return (
      <div className="min-h-screen p-8">
        <div className="mx-auto max-w-6xl">
          <AnalysisSkeleton />
        </div>
      </div>
    );
  }

  if (state === "error" && error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="rounded-full bg-destructive/10 p-4">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-xl font-semibold">
            {error.code === "NOT_FOUND"
              ? "Analysis not found"
              : "Failed to load analysis"}
          </h1>
          <p className="max-w-md text-muted-foreground">{error.error}</p>
          {error.code && (
            <code className="text-xs text-muted-foreground">
              Code: {error.code}
            </code>
          )}
        </div>
        <div className="flex gap-3">
          {error.code !== "NOT_FOUND" && (
            <Button onClick={fetchAnalysis} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          )}
          <Button asChild>
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              New Analysis
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const repoName = repoUrl.replace("https://github.com/", "");

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <header className="shrink-0 px-4 py-3 border-b border-border flex items-center justify-between bg-background">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="sm">
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
          <div className="h-6 w-px bg-border" />
          <div>
            <h1 className="text-sm font-semibold">Analysis Results</h1>
            <a
              href={repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground"
            >
              {repoName}
              <ExternalLink className="ml-1 h-3 w-3" />
            </a>
          </div>
        </div>
        {state === "streaming" && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Analyzing...
          </div>
        )}
      </header>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {/* Left Sidebar */}
        <BlockerSidebar
          blockers={blockers}
          actions={actions}
          repoUrl={repoUrl}
          dismissedIds={dismissed}
          onSelectBlocker={handleSelectBlocker}
          className="w-[400px] shrink-0"
        />

        {/* Graph Area */}
        <div className="flex-1 min-w-0">
          {dependencyGraph ? (
            <ErrorBoundary
              fallback={
                <Card className="m-4 border-destructive/30">
                  <CardContent className="flex items-center gap-3 py-6 text-sm text-muted-foreground">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    Failed to render dependency graph
                  </CardContent>
                </Card>
              }
            >
              <DependencyGraphView
                graph={dependencyGraph}
                blockers={blockers}
                onNodeClick={(path) => setSelectedFile(path)}
                className="h-full rounded-none border-0"
                filterExternal={true}
              />
            </ErrorBoundary>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              No dependency graph available
            </div>
          )}
        </div>
      </div>

      {/* File Preview Sheet */}
      <Sheet open={!!selectedFile} onOpenChange={(open) => !open && setSelectedFile(null)}>
        <SheetContent className="w-[700px] sm:max-w-[700px] p-0 border-l-0">
          {selectedFile && (
            <FilePreview
              file={selectedFile}
              repoUrl={repoUrl}
              blocker={blockers.find((b) => b.file === selectedFile)}
              onClose={() => setSelectedFile(null)}
              onNavigate={(path) => setSelectedFile(path)}
              dependencies={
                dependencyGraph?.files
                  ?.find((f) => f.path === selectedFile)
                  ?.imports.map((i) => i.from) || []
              }
              dependents={
                dependencyGraph?.files
                  ?.filter((f) =>
                    f.imports.some((i) => i.from === selectedFile)
                  )
                  .map((f) => f.path) || []
              }
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Blocker Detail Modal */}
      <BlockerDetailModal
        blocker={selectedBlocker}
        repoUrl={repoUrl}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onDismiss={() => selectedBlocker && handleDismissBlocker(selectedBlocker.id)}
      />
    </div>
  );
}
