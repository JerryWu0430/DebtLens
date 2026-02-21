"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
      // Simulate stages for better UX
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
      <main className="w-full max-w-xl space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">DebtLens</h1>
          <p className="text-muted-foreground">
            Analyze technical debt in your codebase
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="repo-url" className="text-sm font-medium">
              GitHub Repository URL
            </label>
            <Input
              id="repo-url"
              type="url"
              placeholder="https://github.com/owner/repo"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="pain-points" className="text-sm font-medium">
              Pain Points{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </label>
            <Textarea
              id="pain-points"
              placeholder="Describe areas of concern, slow features, or specific files you want analyzed..."
              rows={4}
              value={painPoints}
              onChange={(e) => setPainPoints(e.target.value)}
              disabled={isLoading}
            />
          </div>

          {state === "error" && error && (
            <div className="flex items-start gap-2 rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{getErrorMessage(error)}</span>
            </div>
          )}

          {isLoading && (
            <AnalysisProgress
              stage={state as "fetching" | "analyzing" | "generating"}
            />
          )}

          <Button
            className="w-full"
            size="lg"
            onClick={handleAnalyze}
            disabled={!isValid || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              "Analyze Repository"
            )}
          </Button>
        </div>
      </main>
    </div>
  );
}
