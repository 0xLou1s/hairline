import { codeToHtml } from "shiki";

/**
 * Highlighting happens here, at build, so no highlighter reaches the browser.
 *
 * A snippet that follows a slider is written with LIVE where the value goes.
 * After highlighting, LIVE becomes a marked span holding the default; the
 * client only ever changes that span's text.
 */
export const LIVE = "424242";

const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function highlight(code: string, lang: string, initial?: string | number): Promise<string> {
  const html = await codeToHtml(code.trimEnd(), { lang, theme: "min-light" });
  return initial === undefined ? html : html.replaceAll(LIVE, `<span data-live>${escape(String(initial))}</span>`);
}

/** A shell command, unhighlighted, in the same wrapper the highlighter writes. */
export function plain(code: string): string {
  return `<pre class="shiki"><code>${escape(code.trimEnd())}</code></pre>`;
}
