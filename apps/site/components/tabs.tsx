"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { CopyIcon } from "./copy";

export type Tab = { label: string; file: string; html: string };

/** Where the reader's tab is kept between visits. */
const KEY = "hairline:docs-tab";

/**
 * Code under tabs, in the same frame as CodeBlock: the tabs on the left, the
 * shown tab's file name and the copy icon on the right. The server renders
 * the first tab; the stored one is read after mount, and storage that throws
 * (private mode, blocked) leaves the first tab on.
 */
export function Tabs({ tabs, label }: { tabs: Tab[]; label: string }) {
  const [at, setAt] = useState(0);
  const panel = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    try {
      const stored = tabs.findIndex((tab) => tab.label === localStorage.getItem(KEY));
      if (stored > 0) setAt(stored);
    } catch {}
  }, [tabs]);

  const pick = (i: number) => {
    setAt(i);
    try {
      localStorage.setItem(KEY, tabs[i].label);
    } catch {}
  };

  const onKeyDown = (event: KeyboardEvent) => {
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = (at + step + tabs.length) % tabs.length;
    pick(next);
    list.current?.querySelectorAll<HTMLButtonElement>("[role=tab]")[next]?.focus();
  };

  return (
    <div className="code" data-code>
      <div className="code-bar">
        <div ref={list} role="tablist" aria-label={label} onKeyDown={onKeyDown} className="code-tabs">
          {tabs.map((tab, i) => (
            <button key={tab.label} type="button" role="tab" id={`${id}-tab-${i}`} aria-selected={i === at} aria-controls={`${id}-panel`} tabIndex={i === at ? 0 : -1} onClick={() => pick(i)} className="code-tab">
              {tab.label}
            </button>
          ))}
        </div>
        <span className="code-title" title={tabs[at].file}>{tabs[at].file}</span>
        <CopyIcon text={() => panel.current?.textContent ?? ""} select={panel} label="Copy code" />
      </div>
      <div ref={panel} role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-tab-${at}`} tabIndex={0} className="code-body" dangerouslySetInnerHTML={{ __html: tabs[at].html }} />
    </div>
  );
}
