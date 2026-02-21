"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const [repoUrl, setRepoUrl] = useState("");
  const [painPoints, setPainPoints] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAnalyze = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repoUrl: repoUrl.trim(),
          painPoint: painPoints.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Analysis failed");
        return;
      }
      router.push(`/analysis/${data.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const isValid = repoUrl.trim().length > 0;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <main className="w-full max-w-2xl space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">DebtLens</h1>
          <p className="text-muted-foreground">
            Turn fuzzy tech debt into concrete action items
          </p>
        </div>

        <div className="rounded-lg border border-border bg-gray-1000/50 font-mono text-sm overflow-hidden">
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
                className="flex-1 bg-transparent outline-none text-foreground placeholder:text-muted-foreground/50"
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
                className="flex-1 bg-transparent outline-none text-foreground placeholder:text-muted-foreground/50 resize-none"
              />
              <span className="text-muted-foreground">&quot;</span>
            </div>
          </div>
        </div>

        {error && (
          <p className="text-sm text-destructive font-mono" role="alert">
            error: {error}
          </p>
        )}

        <Button
          className="w-full font-mono"
          size="lg"
          onClick={handleAnalyze}
          disabled={!isValid || loading}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              analyzing...
            </>
          ) : (
            "$ run debtlens --analyze"
          )}
        </Button>
      </main>
    </div>
  );
}
