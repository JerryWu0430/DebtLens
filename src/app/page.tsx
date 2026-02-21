"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function Home() {
  const [repoUrl, setRepoUrl] = useState("");
  const [painPoints, setPainPoints] = useState("");

  const handleAnalyze = () => {
    // TODO: implement analysis
    console.log({ repoUrl, painPoints });
  };

  const isValid = repoUrl.trim().length > 0;

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

          <Button
            className="w-full"
            size="lg"
            onClick={handleAnalyze}
            disabled={!isValid}
          >
            Analyze Repository
          </Button>
        </div>
      </main>
    </div>
  );
}
