"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type AnalysisError = {
  error: string;
  code?: string;
};

export default function Home() {
  const router = useRouter();
  const [repoUrl, setRepoUrl] = useState("");
  const [painPoints, setPainPoints] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AnalysisError | null>(null);

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repoUrl,
          painPoint: painPoints,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError({ error: data.error, code: data.code });
        return;
      }

      router.push(`/analysis/${data.id}`);
    } catch {
      setError({ error: "Failed to connect. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  const isValid = repoUrl.trim().length > 0 && !loading;

  const getErrorMessage = (err: AnalysisError) => {
    if (err.code === "RATE_LIMITED") {
      return "GitHub rate limit reached. Wait a few minutes or add a GitHub token.";
    }
    if (err.code === "PRIVATE_REPO") {
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
            />
          </div>

          {error && (
            <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              {getErrorMessage(error)}
            </div>
          )}

          <Button
            className="w-full"
            size="lg"
            onClick={handleAnalyze}
            disabled={!isValid}
          >
            {loading ? "Analyzing..." : "Analyze Repository"}
          </Button>
        </div>
      </main>
    </div>
  );
}
