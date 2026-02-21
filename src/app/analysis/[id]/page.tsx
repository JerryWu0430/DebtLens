"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { BlockerList } from "@/components/blocker-card";
import { ActionList } from "@/components/action-list";
import { DependencyDiagram } from "@/components/dependency-diagram";
import { AnalysisSkeleton } from "@/components/analysis-skeleton";
import { Button } from "@/components/ui/button";
import { AnalysisResult, Blocker, Action } from "@/types/analysis";
import { ArrowLeft, ExternalLink, Loader2 } from "lucide-react";
import Link from "next/link";

type StreamingState = "idle" | "loading" | "streaming" | "complete" | "error";

export default function AnalysisPage() {
  const params = useParams();
  const id = params.id as string;

  const [state, setState] = useState<StreamingState>("loading");
  const [blockers, setBlockers] = useState<Blocker[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [repoUrl, setRepoUrl] = useState<string>("");
  const [mermaidCode, setMermaidCode] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    async function fetchAnalysis() {
      try {
        const res = await fetch(`/api/analysis/${id}`);
        if (!res.ok) {
          throw new Error("Analysis not found");
        }
        const data: AnalysisResult = await res.json();
        setRepoUrl(data.repoUrl);
        setBlockers(data.blockers);
        setActions(data.actions);
        if (data.mermaidCode) {
          setMermaidCode(data.mermaidCode);
        }
        setState("complete");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
        setState("error");
      }
    }

    fetchAnalysis();
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

  if (state === "error") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
        <p className="text-destructive">{error}</p>
        <Button asChild variant="outline">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Link>
        </Button>
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
            <DependencyDiagram
              mermaidCode={mermaidCode}
              blockers={blockers}
              repoUrl={repoUrl}
            />
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
