import { codeToHtml, createCssVariablesTheme } from "shiki";

/** Highlighting happens here, at build, so no highlighter reaches the browser. */

/** shiki writes var(--code-…) instead of colours; globals.css sets them, in greys. */
const theme = createCssVariablesTheme({ name: "hairline", variablePrefix: "--code-" });

const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** The block around the code is its tab stop, so shiki's own tabindex on the pre goes. */
export async function highlight(code: string, lang: string): Promise<string> {
  const html = await codeToHtml(code.trimEnd(), { lang, theme });
  return html.replace(' tabindex="0"', "");
}

/** Plain text in the same wrapper the highlighter writes. */
export function plain(code: string): string {
  return `<pre class="shiki"><code>${escape(code.trimEnd())}</code></pre>`;
}
