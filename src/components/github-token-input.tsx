"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ExternalLink, Eye, EyeOff, Key, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

const STORAGE_KEY = "github-pat";

export function getGitHubToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEY);
}

export function setGitHubToken(token: string): void {
  localStorage.setItem(STORAGE_KEY, token);
}

export function clearGitHubToken(): void {
  localStorage.removeItem(STORAGE_KEY);
}

interface GitHubTokenInputProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTokenSaved?: () => void;
}

export function GitHubTokenInput({ open, onOpenChange, onTokenSaved }: GitHubTokenInputProps) {
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasExisting, setHasExisting] = useState(false);

  useEffect(() => {
    if (open) {
      setHasExisting(!!getGitHubToken());
      setToken("");
      setError(null);
    }
  }, [open]);

  const handleSave = async () => {
    if (!token.trim()) {
      setError("Token is required");
      return;
    }

    setValidating(true);
    setError(null);

    try {
      // Validate token
      const res = await fetch("/api/validate-github-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Invalid token");
      }

      setGitHubToken(token.trim());
      onTokenSaved?.();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to validate token");
    } finally {
      setValidating(false);
    }
  };

  const handleClear = () => {
    clearGitHubToken();
    setHasExisting(false);
    setToken("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            GitHub Token
          </DialogTitle>
          <DialogDescription>
            A Personal Access Token with <code className="px-1 py-0.5 rounded bg-muted text-xs">repo</code> scope is required to create PRs.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {hasExisting && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-sm">
              <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
              <span className="text-green-400">Token already configured</span>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto h-7 text-xs"
                onClick={handleClear}
              >
                Clear
              </Button>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">
              {hasExisting ? "Replace Token" : "Personal Access Token"}
            </label>
            <div className="relative">
              <Input
                type={showToken ? "text" : "password"}
                placeholder="ghp_xxxxxxxxxxxx"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="pr-10 font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <a
            href="https://github.com/settings/tokens/new?scopes=repo&description=DebtLens%20PR%20Creation"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
            Create a new token on GitHub
          </a>

          <p className="text-xs text-muted-foreground">
            Your token is stored locally in your browser and never sent to our servers.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={validating || !token.trim()}>
            {validating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Validating...
              </>
            ) : (
              "Save Token"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
