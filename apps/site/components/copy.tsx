"use client";

import { useCallback, useEffect, useState, type RefObject } from "react";

/**
 * Copies text, and says so for a moment. Without clipboard permission, or on
 * a page served without a secure context where there is no clipboard at all,
 * it selects the text instead, so the keyboard can copy it.
 */
export function useCopy(): [copied: boolean, copy: (text: string, fallback?: Element | null) => void] {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = useCallback(async (text: string, fallback?: Element | null) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      if (!fallback) return;
      const range = document.createRange();
      range.selectNodeContents(fallback);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  }, []);

  return [copied, copy];
}

/**
 * A button that copies `text`, or selects what `select` points at when it
 * cannot. `text` can be a function, read at the click, for text the button
 * does not own.
 */
export function CopyButton({ text, select, label = "Copy", className = "copy" }: { text: string | (() => string); select?: RefObject<Element | null>; label?: string; className?: string }) {
  const [copied, copy] = useCopy();
  return (
    <button type="button" className={className} onClick={() => copy(typeof text === "function" ? text() : text, select?.current)} aria-live="polite">
      {copied ? "Copied" : label}
    </button>
  );
}
