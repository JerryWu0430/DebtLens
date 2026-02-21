"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { BlockerList } from "@/components/blocker-card";
import { ActionList } from "@/components/action-list";
import { DependencyGraphView } from "@/components/graph";
import { FilePreview } from "@/components/file-preview";
import { AnalysisSkeleton } from "@/components/analysis-skeleton";
import { ErrorBoundary } from "@/components/error-boundary";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnalysisResult, Blocker, Action, DependencyGraph } from "@/types/analysis";
import {
  ArrowLeft,
  ExternalLink,
  Loader2,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  Zap,
} from "lucide-react";
import Link from "next/link";

type StreamingState = "idle" | "loading" | "streaming" | "complete" | "error";

interface ApiError {
  error: string;
  code?: string;
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
    <div className="min-h-screen p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="space-y-4">
          <Button asChild variant="ghost" size="sm">
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold">Analysis Results</h1>
              <a
                href={repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
              >
                {repoName}
                <ExternalLink className="ml-1 h-3 w-3" />
              </a>
            </div>
            {state === "streaming" && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyzing...
              </div>
            )}
          </div>
        </header>

        {dependencyGraph && (
          <section className="flex gap-4">
            <div className={selectedFile ? "flex-1" : "w-full"}>
              <ErrorBoundary
                fallback={
                  <Card className="border-destructive/30">
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
                />
              </ErrorBoundary>
            </div>

            {selectedFile && (
              <div className="w-[400px] shrink-0">
                <div className="sticky top-4 h-[500px]">
                  <FilePreview
                    file={selectedFile}
                    repoUrl={repoUrl}
                    blocker={blockers.find((b) => b.file === selectedFile)}
                    onClose={() => setSelectedFile(null)}
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
                </div>
              </div>
            )}
          </section>
        )}

        <Tabs defaultValue="blockers" className="w-full">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="blockers" className="gap-2">
              <AlertTriangle className="h-4 w-4" />
              Blockers
              {blockers.length > 0 && (
                <span className="ml-1 rounded-full bg-destructive/20 px-2 py-0.5 text-xs text-destructive">
                  {blockers.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="actions" className="gap-2">
              <Zap className="h-4 w-4" />
              Actions
              {actions.length > 0 && (
                <span className="ml-1 rounded-full bg-primary/20 px-2 py-0.5 text-xs">
                  {actions.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="blockers" className="mt-6">
            {blockers.length > 0 ? (
              <BlockerList
                blockers={blockers}
                repoUrl={repoUrl}
                selectedBlocker={selectedBlocker}
                onSelectBlocker={(blocker) => {
                  setSelectedBlocker(
                    selectedBlocker?.id === blocker.id ? null : blocker
                  );
                  // Also highlight in graph
                  if (blocker.file) setSelectedFile(blocker.file);
                }}
              />
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No blockers found
              </p>
            )}
          </TabsContent>

          <TabsContent value="actions" className="mt-6">
            {actions.length > 0 ? (
              <ActionList actions={actions} />
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No actions yet
              </p>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
