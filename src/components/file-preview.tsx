"use client";

import { useState, useEffect, useCallback } from "react";
import { codeToHtml } from "shiki";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FileCode,
  X,
  ExternalLink,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
} from "lucide-react";
import { Blocker, Severity } from "@/types/analysis";

interface FilePreviewProps {
  file: string;
  line?: number;
  repoUrl: string;
  blocker?: Blocker | null;
  onClose: () => void;
  onNavigate?: (file: string) => void;
  dependencies?: string[];
  dependents?: string[];
}

const CONTEXT_LINES = 10; // Lines before/after highlighted line

function getLanguageFromPath(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase();
  const langMap: Record<string, string> = {
    ts: "typescript",
    tsx: "tsx",
    js: "javascript",
    jsx: "jsx",
    json: "json",
    md: "markdown",
    css: "css",
    scss: "scss",
    html: "html",
    py: "python",
    rs: "rust",
    go: "go",
    rb: "ruby",
    yml: "yaml",
    yaml: "yaml",
  };
  return langMap[ext || ""] || "plaintext";
}

function SeverityBadge({ severity }: { severity: Severity }) {
  const colors: Record<Severity, string> = {
    critical: "bg-red-500 hover:bg-red-600",
    high: "bg-orange-500 hover:bg-orange-600",
    medium: "bg-yellow-500 hover:bg-yellow-600",
    low: "bg-blue-500 hover:bg-blue-600",
  };
  return <Badge className={colors[severity]}>{severity}</Badge>;
}

export function FilePreview({
  file,
  line,
  repoUrl,
  blocker,
  onClose,
  onNavigate,
  dependencies = [],
  dependents = [],
}: FilePreviewProps) {
  const [content, setContent] = useState<string | null>(null);
  const [highlightedHtml, setHighlightedHtml] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Fetch file content
  useEffect(() => {
    async function fetchContent() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/file?repoUrl=${encodeURIComponent(repoUrl)}&path=${encodeURIComponent(file)}`
        );
        if (!res.ok) {
          throw new Error(
            res.status === 404 ? "File not found" : "Failed to fetch file"
          );
        }
        const data = await res.json();
        setContent(data.content);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load file");
      } finally {
        setLoading(false);
      }
    }
    fetchContent();
  }, [file, repoUrl]);

  // Syntax highlight
  useEffect(() => {
    if (!content) return;

    async function highlight() {
      try {
        const lines = content!.split("\n");
        let startLine = 0;
        let endLine = lines.length;
        let displayLines = lines;

        // If line specified, show context around it
        if (line && line > 0) {
          startLine = Math.max(0, line - CONTEXT_LINES - 1);
          endLine = Math.min(lines.length, line + CONTEXT_LINES);
          displayLines = lines.slice(startLine, endLine);
        }

        const lang = getLanguageFromPath(file);
        const html = await codeToHtml(displayLines.join("\n"), {
          lang,
          theme: "github-dark",
          transformers: [
            {
              line(node, lineNum) {
                const actualLine = startLine + lineNum;
                // Highlight the target line
                if (line && actualLine === line) {
                  this.addClassToHast(node, "highlighted-line");
                }
              },
            },
          ],
        });

        // Add line numbers
        const lineNumberedHtml = html.replace(
          /<span class="line/g,
          (match, offset) => {
            const linesBefore = html.substring(0, offset).split("<span class=\"line").length - 1;
            const lineNum = startLine + linesBefore + 1;
            return `<span data-line="${lineNum}" class="line`;
          }
        );

        setHighlightedHtml(lineNumberedHtml);
      } catch (err) {
        console.error("Highlighting error:", err);
        // Fallback to plain text
        setHighlightedHtml(
          `<pre class="p-4 overflow-auto"><code>${content}</code></pre>`
        );
      }
    }
    highlight();
  }, [content, file, line]);

  const copyToClipboard = useCallback(async () => {
    if (!content) return;
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [content]);

  const fileName = file.split("/").pop() || file;

  return (
    <Card className="flex h-full flex-col border-0 rounded-none shadow-none">
      <CardHeader className="shrink-0 border-b border-border pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <FileCode className="h-4 w-4 shrink-0" />
              <span className="truncate" title={file}>
                {fileName}
              </span>
              {line && (
                <span className="shrink-0 text-xs text-muted-foreground">
                  :{line}
                </span>
              )}
            </CardTitle>
            <p className="mt-1 truncate text-xs text-muted-foreground">{file}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={copyToClipboard}
              title="Copy file content"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-green-500" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </Button>
            <a
              href={`${repoUrl}/blob/main/${file}${line ? `#L${line}` : ""}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-muted"
              title="View on GitHub"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onClose}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {blocker && (
          <div className="mt-3 space-y-2 rounded border bg-muted/50 p-3">
            <div className="flex items-center gap-2">
              <SeverityBadge severity={blocker.severity} />
              <span className="text-sm font-medium">{blocker.title}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {blocker.description}
            </p>
          </div>
        )}
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden p-0">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
            <p className="text-sm text-muted-foreground">{error}</p>
            <a
              href={`${repoUrl}/blob/main/${file}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline"
            >
              View on GitHub instead
            </a>
          </div>
        ) : (
          <div className="h-full overflow-auto">
            <div
              className="file-preview-code min-w-max text-sm"
              dangerouslySetInnerHTML={{ __html: highlightedHtml }}
            />
          </div>
        )}
      </CardContent>

      {(dependencies.length > 0 || dependents.length > 0) && (
        <div className="shrink-0 border-t border-border p-3">
          <div className="flex flex-wrap gap-4 text-xs">
            {dependencies.length > 0 && (
              <div className="flex items-center gap-2">
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">Imports:</span>
                <div className="flex flex-wrap gap-1">
                  {dependencies.slice(0, 5).map((dep) => (
                    <Badge
                      key={dep}
                      variant="outline"
                      className="cursor-pointer text-xs"
                      onClick={() => onNavigate?.(dep)}
                    >
                      {dep}
                    </Badge>
                  ))}
                  {dependencies.length > 5 && (
                    <span className="text-muted-foreground">
                      +{dependencies.length - 5}
                    </span>
                  )}
                </div>
              </div>
            )}
            {dependents.length > 0 && (
              <div className="flex items-center gap-2">
                <ChevronLeft className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">Used by:</span>
                <div className="flex flex-wrap gap-1">
                  {dependents.slice(0, 5).map((dep) => (
                    <Badge
                      key={dep}
                      variant="outline"
                      className="cursor-pointer text-xs"
                      onClick={() => onNavigate?.(dep)}
                    >
                      {dep}
                    </Badge>
                  ))}
                  {dependents.length > 5 && (
                    <span className="text-muted-foreground">
                      +{dependents.length - 5}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
