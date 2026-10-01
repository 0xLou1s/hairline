import { codeToHtml } from "shiki";

/** Highlighting happens here, at build, so no highlighter reaches the browser. */

const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function highlight(code: string, lang: string): Promise<string> {
  return codeToHtml(code.trimEnd(), { lang, theme: "min-light" });
}

/** Plain text in the same wrapper the highlighter writes. */
export function plain(code: string): string {
  return `<pre class="shiki"><code>${escape(code.trimEnd())}</code></pre>`;
}
