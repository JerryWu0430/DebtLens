"use client";

import React from "react";

// Render text with inline code (backticks or single quotes -> <code>)
export function renderWithInlineCode(text: string): React.ReactNode {
  // Match `code` or 'code' patterns
  const parts = text.split(/(`[^`]+`|'[^']+')/g);
  return parts.map((part, i) => {
    if ((part.startsWith("`") && part.endsWith("`")) ||
        (part.startsWith("'") && part.endsWith("'"))) {
      const code = part.slice(1, -1);
      return (
        <code
          key={i}
          className="px-1.5 py-0.5 rounded bg-muted font-mono text-[0.85em] text-foreground"
        >
          {code}
        </code>
      );
    }
    return part;
  });
}

interface InlineCodeTextProps {
  text: string;
  className?: string;
}

export function InlineCodeText({ text, className }: InlineCodeTextProps) {
  return <span className={className}>{renderWithInlineCode(text)}</span>;
}
