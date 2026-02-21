"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { BlockerList } from "@/components/blocker-card";
import { ActionList } from "@/components/action-list";
import { DependencyDiagram } from "@/components/dependency-diagram";
import { AnalysisSkeleton } from "@/components/analysis-skeleton";
import { ErrorBoundary } from "@/components/error-boundary";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AnalysisResult, Blocker, Action } from "@/types/analysis";
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

export default function AnalysisPage() {
  const params = useParams();
  const id = params.id as string;

  const [state, setState] = useState<StreamingState>("loading");
  const [blockers, setBlockers] = useState<Blocker[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [repoUrl, setRepoUrl] = useState<string>("");
  const [mermaidCode, setMermaidCode] = useState<string>("");
  const [error, setError] = useState<ApiError | null>(null);

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
      if (result.mermaidCode) {
        setMermaidCode(result.mermaidCode);
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
      <div className="mx-auto max-w-6xl space-y-8">
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

        {mermaidCode && (
          <section>
            <ErrorBoundary
              fallback={
                <Card className="border-destructive/30">
                  <CardContent className="flex items-center gap-3 py-6 text-sm text-muted-foreground">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    Failed to render dependency diagram
                  </CardContent>
                </Card>
              }
            >
              <DependencyDiagram
                mermaidCode={mermaidCode}
                blockers={blockers}
                repoUrl={repoUrl}
              />
            </ErrorBoundary>
          </section>
        )}

        <div className="grid gap-8 lg:grid-cols-2">
          <section className="space-y-4">
            <h2 className="text-lg font-semibold">
              Blockers
              {blockers.length > 0 && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({blockers.length})
                </span>
              )}
            </h2>
            {blockers.length > 0 ? (
              <BlockerList blockers={blockers} />
            ) : (
              <p className="text-sm text-muted-foreground">No blockers found</p>
            )}
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-semibold">
              Recommended Actions
              {actions.length > 0 && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({actions.length})
                </span>
              )}
            </h2>
            {actions.length > 0 ? (
              <ActionList actions={actions} />
            ) : (
              <p className="text-sm text-muted-foreground">No actions yet</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
