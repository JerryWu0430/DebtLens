"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnalysisProgress } from "@/components/streaming-indicator";

type SubmitState = "idle" | "fetching" | "analyzing" | "generating" | "error";

type AnalysisError = {
  error: string;
  code?: string;
};

export default function Home() {
  const router = useRouter();
  const [repoUrl, setRepoUrl] = useState("");
  const [painPoints, setPainPoints] = useState("");
  const [state, setState] = useState<SubmitState>("idle");
  const [error, setError] = useState<AnalysisError | null>(null);

  const handleAnalyze = async () => {
    if (!repoUrl.trim()) return;

    setError(null);
    setState("fetching");

    try {
      await new Promise((r) => setTimeout(r, 500));
      setState("analyzing");

      const res = await fetch("/api/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repoUrl: repoUrl.trim(),
          painPoint: painPoints.trim(),
        }),
      });

      setState("generating");

      const data = await res.json();

      if (!res.ok) {
        setError({ error: data.error, code: data.code });
        setState("error");
        return;
      }

      router.push(`/analysis/${data.id}`);
    } catch {
      setError({ error: "Failed to connect. Please try again." });
      setState("error");
    }
  };

  const isLoading = state !== "idle" && state !== "error";
  const isValid = repoUrl.trim().length > 0;

  const getErrorMessage = (err: AnalysisError) => {
    if (err.code === "RATE_LIMIT") {
      return "GitHub rate limit reached. Wait a few minutes or add a GitHub token.";
    }
    if (err.code === "GITHUB_ERROR" && err.error.includes("private")) {
      return "This repository is private. Public repos only for now.";
    }
    if (err.code === "NOT_FOUND") {
      return "Repository not found. Check the URL and try again.";
    }
    return err.error;
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <main className="w-full max-w-2xl space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">DebtLens</h1>
          <p className="text-muted-foreground">
            Turn fuzzy tech debt into concrete action items
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card font-mono text-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-muted/30">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
            <span className="ml-2 text-xs text-muted-foreground">terminal</span>
          </div>

          <div className="p-4 space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-green-400">$</span>
              <span className="text-muted-foreground">git clone</span>
              <input
                type="text"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/owner/repo"
                disabled={isLoading}
                className="flex-1 bg-transparent outline-none text-foreground placeholder:text-muted-foreground/50 disabled:opacity-50"
              />
            </div>

            <div className="flex items-start gap-2">
              <span className="text-green-400">$</span>
              <span className="text-muted-foreground whitespace-nowrap">echo &quot;</span>
              <textarea
                value={painPoints}
                onChange={(e) => setPainPoints(e.target.value)}
                placeholder="describe your pain points... (optional)"
                rows={3}
                disabled={isLoading}
                className="flex-1 bg-transparent outline-none text-foreground placeholder:text-muted-foreground/50 resize-none disabled:opacity-50"
              />
              <span className="text-muted-foreground">&quot;</span>
            </div>
          </div>
        </div>

        {state === "error" && error && (
          <div className="flex items-start gap-2 rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive font-mono">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>error: {getErrorMessage(error)}</span>
          </div>
        )}

        {isLoading && (
          <AnalysisProgress
            stage={state as "fetching" | "analyzing" | "generating"}
          />
        )}

        <Button
          className="w-full font-mono"
          size="lg"
          onClick={handleAnalyze}
          disabled={!isValid || isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              analyzing...
            </>
          ) : (
            "$ debtlens --analyze"
          )}
        </Button>
      </main>
    </div>
  );
}
