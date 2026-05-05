import React from 'react';

/**
 * Parses text with **bold** markers and returns JSX elements
 * with <strong> tags for bold segments.
 * Preserves line breaks from the original text.
 * 
 * Example: "Router con **Wi-Fi** integrado"
 * → [<span>Router con </span>, <strong>Wi-Fi</strong>, <span> integrado</span>]
 */
export function renderBoldText(text: string | null | undefined): React.ReactNode {
  if (!text) return null;

  const lines = text.split('\n');

  return lines.map((line, lineIdx) => {
    const parts: React.ReactNode[] = [];
    const regex = /\*\*(.+?)\*\*/g;
    let lastIndex = 0;
    let match;
    let partIdx = 0;

    while ((match = regex.exec(line)) !== null) {
      // Text before the bold marker
      if (match.index > lastIndex) {
        parts.push(<span key={`${lineIdx}-${partIdx++}`}>{line.slice(lastIndex, match.index)}</span>);
      }
      // Bold text
      parts.push(<strong key={`${lineIdx}-${partIdx++}`}>{match[1]}</strong>);
      lastIndex = regex.lastIndex;
    }

    // Remaining text after last bold marker
    if (lastIndex < line.length) {
      parts.push(<span key={`${lineIdx}-${partIdx++}`}>{line.slice(lastIndex)}</span>);
    }

    // If no bold markers found, return the line as-is
    if (parts.length === 0) {
      parts.push(<span key={`${lineIdx}-0`}>{line}</span>);
    }

    return (
      <React.Fragment key={lineIdx}>
        {parts}
        {lineIdx < lines.length - 1 && <br />}
      </React.Fragment>
    );
  });
}
