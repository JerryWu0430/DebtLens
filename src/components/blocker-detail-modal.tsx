"use client";

import { useState, useEffect } from "react";
import { codeToHtml } from "shiki";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Blocker, Severity, CodeSnippet } from "@/types/analysis";
import { FixSuggestionView } from "@/components/fix-suggestion-view";
import { renderWithInlineCode } from "@/components/inline-code";
import { FixSuggestion } from "@/types/fix-suggestion";
import {
  AlertTriangle,
  AlertCircle,
  Info,
  AlertOctagon,
  ExternalLink,
  Loader2,
  ArrowLeft,
  Lightbulb,
  XCircle,
  FileCode,
  Code2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Code snippet display with syntax highlighting
function CodeSnippetCard({ snippet, repoUrl }: { snippet: CodeSnippet; repoUrl: string }) {
  const [highlightedHtml, setHighlightedHtml] = useState<string>("");

  useEffect(() => {
    async function highlight() {
      try {
        const ext = snippet.file.split(".").pop() || "ts";
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
        const html = await codeToHtml(snippet.code, { lang, theme: "github-dark" });
        setHighlightedHtml(html);
      } catch {
        setHighlightedHtml(`<pre>${snippet.code}</pre>`);
      }
    }
    highlight();
  }, [snippet]);

  const codeBlockClass =
    "text-xs overflow-x-auto [&_pre]:p-4 [&_pre]:m-0 [&_pre]:leading-tight [&_pre]:whitespace-pre [&_pre]:block bg-[#0d1117] min-w-0";

  return (
    <Card className="border-border bg-[#0d1117] min-w-0">
      <CardHeader className="pb-2 min-w-0 bg-[#161b22]">
        <div className="flex items-center justify-between gap-2 min-w-0">
          <CardTitle className="text-sm font-medium flex items-center gap-2 min-w-0 truncate">
            <FileCode className="h-4 w-4 shrink-0" />
            {snippet.file}
          </CardTitle>
          <a
            href={`${repoUrl}/blob/main/${snippet.file}#L${snippet.startLine}-L${snippet.endLine}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-foreground shrink-0 flex items-center gap-1"
          >
            L{snippet.startLine}-{snippet.endLine}
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </CardHeader>
      <CardContent className="p-0 space-y-0 min-w-0">
        <div
          className={codeBlockClass}
          dangerouslySetInnerHTML={{ __html: highlightedHtml }}
        />
        <div className="px-4 py-3 border-t border-border bg-[#161b22]">
          <p className="text-xs text-muted-foreground">
            {renderWithInlineCode(snippet.explanation)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

interface BlockerDetailModalProps {
  blocker: Blocker | null;
  repoUrl: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDismiss: () => void;
}

const severityConfig: Record<
  Severity,
  { color: string; bgColor: string; icon: React.ElementType; label: string }
> = {
  critical: {
    color: "text-red-400",
    bgColor: "bg-red-500/10 border-red-500/30",
    icon: AlertOctagon,
    label: "Critical",
  },
  high: {
    color: "text-orange-400",
    bgColor: "bg-orange-500/10 border-orange-500/30",
    icon: AlertTriangle,
    label: "High",
  },
  medium: {
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/10 border-yellow-500/30",
    icon: AlertCircle,
    label: "Medium",
  },
  low: {
    color: "text-blue-400",
    bgColor: "bg-blue-500/10 border-blue-500/30",
    icon: Info,
    label: "Low",
  },
};

type ViewMode = "detail" | "suggestion";

export function BlockerDetailModal({
  blocker,
  repoUrl,
  open,
  onOpenChange,
  onDismiss,
}: BlockerDetailModalProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("detail");
  const [suggestion, setSuggestion] = useState<FixSuggestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!blocker) return null;

  const config = severityConfig[blocker.severity];
  const Icon = config.icon;

  const handleSuggestFix = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/suggest-fix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blocker, repoUrl }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate suggestion");
      }

      const data = await res.json();
      setSuggestion(data.suggestion);
      setViewMode("suggestion");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate fix");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setViewMode("detail");
  };

  const handleClose = () => {
    setViewMode("detail");
    setSuggestion(null);
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl w-[90vw] max-h-[90vh] flex flex-col p-0 gap-0 border border-border overflow-hidden">
        {viewMode === "suggestion" && suggestion ? (
          <>
            <DialogHeader className="px-6 pr-10 py-4 border-b border-border shrink-0">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  onClick={handleBack}
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
                <div className="h-4 w-px bg-border" />
                <DialogTitle className="text-base">
                  Suggested Fix
                </DialogTitle>
              </div>
            </DialogHeader>
            <div className="overflow-auto max-h-[calc(90vh-14rem)]">
              <div className="p-6 min-w-0">
                <FixSuggestionView suggestion={suggestion} />
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Header - pr-10 reserves space for dialog close (X) button */}
            <DialogHeader className="px-6 pr-10 py-4 border-b border-border shrink-0">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className={cn("p-2 rounded-lg shrink-0", config.bgColor)}>
                    <Icon className={cn("h-5 w-5", config.color)} />
                  </div>
                  <div className="min-w-0">
                    <DialogTitle className="text-base font-semibold">
                      {blocker.title}
                    </DialogTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {blocker.category}
                      </Badge>
                      {blocker.file && (
                        <code className="text-xs text-muted-foreground font-mono">
                          {blocker.file}
                          {blocker.line && `:${blocker.line}`}
                        </code>
                      )}
                    </div>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={cn("shrink-0", config.bgColor, config.color)}
                >
                  {config.label}
                </Badge>
              </div>
            </DialogHeader>

            {/* Content - sized to content; scrolls only when taller than viewport */}
            <div className="overflow-auto max-h-[calc(90vh-14rem)]">
              <div className="p-6 space-y-6 min-w-0">
                {/* Description */}
                <section>
                  <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    Why This Is A Blocker
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {renderWithInlineCode(blocker.description)}
                  </p>
                </section>

                {/* File Link */}
                {blocker.file && (
                  <section>
                    <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <FileCode className="h-4 w-4 text-muted-foreground" />
                      Source Location
                    </h3>
                    <a
                      href={`${repoUrl}/blob/main/${blocker.file}${blocker.line ? `#L${blocker.line}` : ""}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      View on GitHub
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </section>
                )}

                {/* Code Evidence - for critical/high blockers */}
                {blocker.codeSnippets && blocker.codeSnippets.length > 0 && (
                  <section>
                    <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                      <Code2 className="h-4 w-4 text-muted-foreground" />
                      Code Evidence ({blocker.codeSnippets.length})
                    </h3>
                    <div className="space-y-3">
                      {blocker.codeSnippets.map((snippet, idx) => (
                        <CodeSnippetCard key={idx} snippet={snippet} repoUrl={repoUrl} />
                      ))}
                    </div>
                  </section>
                )}

                {/* Error state */}
                {error && (
                  <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-sm text-destructive">
                    {error}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <DialogFooter className="px-6 py-4 border-t border-border shrink-0">
              <div className="flex items-center justify-between w-full">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onDismiss}
                  className="text-muted-foreground"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Dismiss
                </Button>
                <Button
                  size="sm"
                  onClick={handleSuggestFix}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Lightbulb className="h-4 w-4 mr-2" />
                      Suggest Fix
                    </>
                  )}
                </Button>
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
