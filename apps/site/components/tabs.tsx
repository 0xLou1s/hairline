"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import { CopyButton } from "./copy";

export type Tab = { label: string; html: string };

/** Code behind tabs, with a copy button. The HTML is highlighted at build. */
export function Tabs({ tabs, label }: { tabs: Tab[]; label: string }) {
  const [at, setAt] = useState(0);
  const panel = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const id = useId();

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
        {/* read at the click, so it is always the tab on screen */}
        <CopyButton text={() => panel.current?.textContent ?? ""} select={panel} />
      </div>
      <div ref={panel} role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-tab-${at}`} tabIndex={0} className="code-panel" dangerouslySetInnerHTML={{ __html: tabs[at].html }} />
    </div>
  );
}

