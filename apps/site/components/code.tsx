import type { ReactNode, RefObject } from "react";

const TOKEN = /(\bimport\b|\bfrom\b)|("[^"]*")|(<\/?)([A-Z]\w*)|(\w+)(?==)|(?<==)(\{[^}]*\})/g;

/** The inspector's snippet, coloured by hand: it only ever holds one import and one tag. */
export function Code({ text, codeRef, className = "" }: { text: string; codeRef?: RefObject<HTMLPreElement | null>; className?: string }) {
  const parts: ReactNode[] = [];
  const body = text.trimEnd();
  let last = 0;
  for (const m of body.matchAll(TOKEN)) {
    if (m.index > last) parts.push(body.slice(last, m.index));
    const k = parts.length;
    if (m[1]) parts.push(<span key={k} className="t-kw">{m[1]}</span>);
    else if (m[2]) parts.push(<span key={k} className="t-str">{m[2]}</span>);
    else if (m[4]) parts.push(<span key={k}>{m[3]}<span className="t-tag">{m[4]}</span></span>);
    else if (m[5]) parts.push(<span key={k} className="t-attr">{m[5]}</span>);
    else if (m[6]) parts.push(<span key={k} className="t-val">{m[6]}</span>);
    last = m.index + m[0].length;
  }
  parts.push(body.slice(last));
  return <pre ref={codeRef} className={`p-code ${className}`}>{parts}</pre>;
}
