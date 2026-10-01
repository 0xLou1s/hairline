"use client";

import { useRef } from "react";
import { CopyIcon } from "./copy";

/**
 * One line to type, in a pill with a copy icon. `kind` says which line it is,
 * for the tests (`prompt` is an example's, `follow-up` the change asked for
 * after it, `usage` the bare command); a shell command takes the `$` in front
 * of it. A follow-up is a sentence, so it wraps instead of scrolling.
 */
export function Command({ code, kind, label }: { code: string; kind: "install" | "prompt" | "follow-up" | "usage"; label: string }) {
  const line = useRef<HTMLElement>(null);
  return (
    <div className="pill" data-command={kind}>
      {kind === "install" && <span aria-hidden="true" className="select-none text-faint">$</span>}
      <code ref={line} className="pill-line" title={code}>{code}</code>
      <CopyIcon text={code} select={line} label={label} />
    </div>
  );
}
