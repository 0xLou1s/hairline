"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";

export type Tab = { label: string; html: string };

/**
 * Code behind tabs, with a copy button. The HTML is highlighted at build; when
 * `live` is given, every span marked data-live shows it, so a snippet follows
 * a slider without a highlighter in the browser.
 */
export function Tabs({ tabs, label, live }: { tabs: Tab[]; label: string; live?: string }) {
  const [at, setAt] = useState(0);
  const [copied, setCopied] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (live === undefined) return;
    panel.current?.querySelectorAll("[data-live]").forEach((node) => { node.textContent = live; });
  }, [live, at]);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(panel.current?.textContent ?? "");
      setCopied(true);
    } catch {
      // no clipboard permission: the text is still selectable
    }
  };

  const onKeyDown = (event: KeyboardEvent) => {
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = (at + step + tabs.length) % tabs.length;
    setAt(next);
    list.current?.querySelectorAll<HTMLButtonElement>("[role=tab]")[next]?.focus();
  };

  return (
    <div className="code">
      <div className="code-bar">
        <div ref={list} role="tablist" aria-label={label} onKeyDown={onKeyDown} className="flex gap-1">
          {tabs.map((tab, i) => (
            <button key={tab.label} type="button" role="tab" id={`${id}-tab-${i}`} aria-selected={i === at} aria-controls={`${id}-panel`} tabIndex={i === at ? 0 : -1} onClick={() => setAt(i)} className="code-tab">
              {tab.label}
            </button>
          ))}
        </div>
        <button type="button" onClick={copy} className="code-copy" aria-live="polite">
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <div ref={panel} role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-tab-${at}`} tabIndex={0} className="code-panel" dangerouslySetInnerHTML={{ __html: tabs[at].html }} />
    </div>
  );
}
