"use client";

import { useRef, useState } from "react";
import { CopyButton } from "./copy";

/**
 * The install command in a pill. The command's first word is a button that
 * moves to the next package manager; the copy button copies the whole line.
 */
export function Install({ commands }: { commands: { label: string; code: string }[] }) {
  const [at, setAt] = useState(0);
  const line = useRef<HTMLElement>(null);
  const { label, code } = commands[at];
  const head = code.slice(0, code.indexOf(" "));
  const next = commands[(at + 1) % commands.length].label;

  return (
    <div className="pill" data-install={label}>
      <span aria-hidden="true" className="select-none text-faint">$</span>
      <code ref={line} className="pill-line">
        <button type="button" className="pill-manager" onClick={() => setAt((at + 1) % commands.length)} aria-label={`${label}: switch to ${next}`} title={`Switch to ${next}`}>
          {head}
        </button>
        {code.slice(head.length)}
      </code>
      <CopyButton text={code} select={line} />
    </div>
  );
}
