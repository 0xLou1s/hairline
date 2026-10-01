"use client";

import { useRef } from "react";
import { CopyIcon } from "./copy";

/**
 * One line to type, in a pill with a copy icon. `kind` says which line it is,
 * for the tests (`prompt` is an example's, `usage` the bare command); a shell
 * command takes the `$` in front of it.
 */
export function Command({ code, kind, label }: { code: string; kind: "install" | "prompt" | "usage"; label: string }) {
  const line = useRef<HTMLElement>(null);
  return (
    <div className="pill" data-command={kind}>
      {kind === "install" && <span aria-hidden="true" className="select-none text-faint">$</span>}
      <code ref={line} className="pill-line" title={code}>{code}</code>
      <CopyIcon text={code} select={line} label={label} />
    </div>
  );
}
