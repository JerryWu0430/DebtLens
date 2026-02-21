"use client";

import { useEffect } from "react";
import { AlertTriangle, ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function AnalysisError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Analysis page error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="rounded-full bg-destructive/10 p-4">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold">Failed to load analysis</h1>
        <p className="max-w-md text-muted-foreground">
          {error.message || "Could not load the analysis results."}
        </p>
      </div>
      <div className="flex gap-3">
        <Button onClick={reset} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Try again
        </Button>
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
