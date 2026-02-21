"use client";

import { useState, useEffect } from "react";
import { codeToHtml } from "shiki";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { renderWithInlineCode } from "@/components/inline-code";
import { FixSuggestion, CodeChange, PackageUpdate } from "@/types/fix-suggestion";
import { Blocker } from "@/types/analysis";
import { GitHubTokenInput, getGitHubToken } from "@/components/github-token-input";
import {
  FileCode,
  Package,
  ExternalLink,
  AlertCircle,
  Gauge,
  Clock,
  CheckCircle2,
  GitPullRequest,
  Loader2,
  Key,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FixSuggestionViewProps {
  suggestion: FixSuggestion;
  repoUrl?: string;
  blocker?: Blocker;
}

const confidenceConfig = {
  low: { label: "Low", color: "text-orange-400 bg-orange-500/10 border-orange-500/30" },
  medium: { label: "Medium", color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30" },
  high: { label: "High", color: "text-green-400 bg-green-500/10 border-green-500/30" },
};

const effortConfig = {
  small: { label: "Small", color: "text-green-400" },
  medium: { label: "Medium", color: "text-yellow-400" },
  large: { label: "Large", color: "text-orange-400" },
};

function CodeDiff({ change }: { change: CodeChange }) {
  const [originalHtml, setOriginalHtml] = useState<string>("");
  const [suggestedHtml, setSuggestedHtml] = useState<string>("");

  useEffect(() => {
    async function highlight() {
      try {
        const ext = change.file.split(".").pop() || "ts";
        const langMap: Record<string, string> = {
          ts: "typescript",
          tsx: "tsx",
          js: "javascript",
          jsx: "jsx",
          json: "json",
          css: "css",
          py: "python",
        };
        const lang = langMap[ext] || "typescript";

        const [orig, sugg] = await Promise.all([
          codeToHtml(change.originalCode, { lang, theme: "github-dark" }),
          codeToHtml(change.suggestedCode, { lang, theme: "github-dark" }),
        ]);
        setOriginalHtml(orig);
        setSuggestedHtml(sugg);
      } catch {
        setOriginalHtml(`<pre>${change.originalCode}</pre>`);
        setSuggestedHtml(`<pre>${change.suggestedCode}</pre>`);
      }
    }
    highlight();
  }, [change]);

  const codeBlockClass =
    "text-xs overflow-x-auto [&_pre]:p-4 [&_pre]:m-0 [&_pre]:leading-5 [&_pre]:whitespace-pre [&_pre]:block bg-[#0d1117] min-w-0";

  return (
    <Card className="border-border min-w-0">
      <CardHeader className="pb-2 min-w-0">
        <div className="flex items-center justify-between gap-2 min-w-0">
          <CardTitle className="text-sm font-medium flex items-center gap-2 min-w-0 truncate">
            <FileCode className="h-4 w-4 shrink-0" />
            {change.file}
          </CardTitle>
          <code className="text-xs text-muted-foreground shrink-0">
            L{change.startLine}-{change.endLine}
          </code>
        </div>
      </CardHeader>
      <CardContent className="p-0 space-y-0 min-w-0">
        <p className="text-sm text-muted-foreground px-4 pb-3 break-words min-w-0">
          {renderWithInlineCode(change.explanation)}
        </p>

        {/* Original */}
        <div className="border-t border-border">
          <div className="px-4 py-2 text-xs font-medium text-red-400 bg-red-500/5 flex items-center gap-2">
            <span className="w-5 h-5 rounded flex items-center justify-center bg-red-500/20 shrink-0">−</span>
            Original
          </div>
          <div
            className={codeBlockClass}
            dangerouslySetInnerHTML={{ __html: originalHtml }}
          />
        </div>

        {/* Suggested */}
        <div className="border-t border-border">
          <div className="px-4 py-2 text-xs font-medium text-green-400 bg-green-500/5 flex items-center gap-2">
            <span className="w-5 h-5 rounded flex items-center justify-center bg-green-500/20 shrink-0">+</span>
            Suggested
          </div>
          <div
            className={codeBlockClass}
            dangerouslySetInnerHTML={{ __html: suggestedHtml }}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function PackageUpdateCard({ update }: { update: PackageUpdate }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/30">
      <Package className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <code className="text-sm font-medium">{update.package}</code>
          {update.currentVersion && (
            <>
              <span className="text-xs text-muted-foreground">
                {update.currentVersion}
              </span>
              <span className="text-xs text-muted-foreground">→</span>
            </>
          )}
          <span className="text-xs font-medium text-green-400">
            {update.suggestedVersion}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">{renderWithInlineCode(update.reason)}</p>
      </div>
    </div>
  );
}

type PRState = "idle" | "loading" | "success" | "error" | "no-token";

export function FixSuggestionView({ suggestion, repoUrl, blocker }: FixSuggestionViewProps) {
  const confidence = confidenceConfig[suggestion.confidence];
  const effort = effortConfig[suggestion.effort];

  const [prState, setPrState] = useState<PRState>("idle");
  const [prUrl, setPrUrl] = useState<string | null>(null);
  const [prError, setPrError] = useState<string | null>(null);
  const [tokenModalOpen, setTokenModalOpen] = useState(false);

  const canCreatePR = repoUrl && blocker && suggestion.codeChanges.length > 0;

  const handleCreatePR = async () => {
    const token = getGitHubToken();
    if (!token) {
      setPrState("no-token");
      setTokenModalOpen(true);
      return;
    }

    setPrState("loading");
    setPrError(null);

    try {
      const res = await fetch("/api/create-pr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl, suggestion, blocker, token }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create PR");
      }

      setPrUrl(data.prUrl);
      setPrState("success");
    } catch (err) {
      setPrError(err instanceof Error ? err.message : "Failed to create PR");
      setPrState("error");
    }
  };

  const handleTokenSaved = () => {
    setPrState("idle");
  };

  return (
    <div className="space-y-6 min-w-0">
      {/* Token Modal */}
      <GitHubTokenInput
        open={tokenModalOpen}
        onOpenChange={setTokenModalOpen}
        onTokenSaved={handleTokenSaved}
      />

      {/* Summary - allow wrapping so long text isn't truncated */}
      <section className="min-w-0">
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <Badge variant="outline" className={cn("gap-1", confidence.color)}>
            <Gauge className="h-3 w-3" />
            {confidence.label} confidence
          </Badge>
          <span className={cn("text-xs font-medium flex items-center gap-1", effort.color)}>
            <Clock className="h-3 w-3" />
            {effort.label} effort
          </span>
        </div>
        <div className="p-4 rounded-lg bg-muted/50 border border-border min-w-0">
          <div className="flex items-start gap-2 min-w-0">
            <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-400 shrink-0" />
            <p className="text-sm break-words min-w-0">{renderWithInlineCode(suggestion.summary)}</p>
          </div>
        </div>
      </section>

      {/* Code Changes */}
      {suggestion.codeChanges.length > 0 && (
        <section>
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
            <FileCode className="h-4 w-4 text-muted-foreground" />
            Code Changes ({suggestion.codeChanges.length})
          </h3>
          <div className="space-y-4">
            {suggestion.codeChanges.map((change, idx) => (
              <CodeDiff key={idx} change={change} />
            ))}
          </div>
        </section>
      )}

      {/* Package Updates */}
      {suggestion.packageUpdates.length > 0 && (
        <section>
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            Package Updates ({suggestion.packageUpdates.length})
          </h3>
          <div className="space-y-2">
            {suggestion.packageUpdates.map((update, idx) => (
              <PackageUpdateCard key={idx} update={update} />
            ))}
          </div>
        </section>
      )}

      {/* References */}
      {suggestion.references.length > 0 && (
        <section>
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
            Documentation
          </h3>
          <div className="space-y-2">
            {suggestion.references.map((ref, idx) => (
              <a
                key={idx}
                href={ref.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <ExternalLink className="h-3 w-3 shrink-0" />
                {ref.title}
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Create PR Section */}
      {canCreatePR && (
        <section className="pt-4 border-t border-border">
          {prState === "success" && prUrl ? (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/30">
              <CheckCircle2 className="h-5 w-5 text-green-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-green-400">PR Created</p>
                <a
                  href={prUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  View on GitHub
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          ) : prState === "error" ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {prError}
              </div>
              <Button onClick={handleCreatePR} className="w-full">
                <GitPullRequest className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          ) : prState === "no-token" ? (
            <Button onClick={() => setTokenModalOpen(true)} variant="outline" className="w-full">
              <Key className="h-4 w-4 mr-2" />
              Set GitHub Token to Create PR
            </Button>
          ) : (
            <Button onClick={handleCreatePR} disabled={prState === "loading"} className="w-full">
              {prState === "loading" ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating PR...
                </>
              ) : (
                <>
                  <GitPullRequest className="h-4 w-4 mr-2" />
                  Create Pull Request
                </>
              )}
            </Button>
          )}
        </section>
      )}

      {/* Empty state */}
      {suggestion.codeChanges.length === 0 &&
        suggestion.packageUpdates.length === 0 && (
          <div className="p-6 rounded-lg border border-dashed border-border text-center">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No specific code changes suggested. Review the summary above for
              guidance.
            </p>
          </div>
        )}
    </div>
  );
}
