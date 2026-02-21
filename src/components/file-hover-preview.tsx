"use client";

import { useState, useEffect } from "react";
import { codeToHtml } from "shiki";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Loader2, ExternalLink } from "lucide-react";

interface FileHoverPreviewProps {
  file: string;
  line?: number;
  repoUrl: string;
  children: React.ReactNode;
}

const PREVIEW_LINES = 15;

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

export function FileHoverPreview({
  file,
  line,
  repoUrl,
  children,
}: FileHoverPreviewProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState<string | null>(null);
  const [highlightedHtml, setHighlightedHtml] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch content when popover opens
  useEffect(() => {
    if (!isOpen || content !== null) return;

    async function fetchContent() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/file?repoUrl=${encodeURIComponent(repoUrl)}&path=${encodeURIComponent(file)}`
        );
        if (!res.ok) {
          throw new Error(res.status === 404 ? "File not found" : "Failed to fetch");
        }
        const data = await res.json();
        setContent(data.content);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    }
    fetchContent();
  }, [isOpen, file, repoUrl, content]);

  // Highlight when content loaded
  useEffect(() => {
    if (!content) return;

    async function highlight() {
      try {
        const lines = content!.split("\n");
        let startLine = 0;
        let displayLines = lines.slice(0, PREVIEW_LINES);

        if (line && line > 0) {
          startLine = Math.max(0, line - Math.floor(PREVIEW_LINES / 2) - 1);
          const endLine = Math.min(lines.length, startLine + PREVIEW_LINES);
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
                if (line && actualLine === line) {
                  this.addClassToHast(node, "bg-yellow-500/20");
                }
              },
            },
          ],
        });

        setHighlightedHtml(html);
      } catch {
        setHighlightedHtml(`<pre class="p-2 text-xs">${content?.slice(0, 500)}...</pre>`);
      }
    }
    highlight();
  }, [content, file, line]);

  const fileName = file.split("/").pop() || file;
  const githubUrl = `${repoUrl}/blob/main/${file}${line ? `#L${line}` : ""}`;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        className="w-[500px] p-0 overflow-hidden"
        side="top"
        align="start"
        sideOffset={8}
      >
        <div className="flex items-center justify-between border-b bg-muted/50 px-3 py-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-mono text-xs text-foreground truncate">
              {fileName}
            </span>
            {line && (
              <span className="text-xs text-muted-foreground">:{line}</span>
            )}
          </div>
          <a
            href={githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="h-3 w-3" />
            GitHub
          </a>
        </div>

        <div className="max-h-[300px] overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
              <p className="text-sm text-muted-foreground">{error}</p>
              <a
                href={githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline"
              >
                View on GitHub
              </a>
            </div>
          ) : (
            <div
              className="text-xs [&_pre]:!bg-transparent [&_pre]:p-3 [&_pre]:m-0 [&_.line]:px-0"
              dangerouslySetInnerHTML={{ __html: highlightedHtml }}
            />
          )}
        </div>

        <div className="border-t bg-muted/30 px-3 py-1.5">
          <span className="text-xs text-muted-foreground truncate block">
            {file}
          </span>
        </div>
      </PopoverContent>
    </Popover>
  );
}
