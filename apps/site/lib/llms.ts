import { FIGURES, INTENSITY, LINKS, OPTIONS, THEME, measure, type Row } from "./figures";
import { CDN, PACKAGE, REACT, VANILLA, install } from "./snippets";

/** The page as plain text, for a model to read: the same data, the same copy. */

const table = (list: Row[]) => list.map((r) => `- \`${r.name}\` (${r.type}${r.default ? `, default ${r.default}` : ""}): ${r.description}`).join("\n");
const fence = (lang: string, code: string) => "```" + lang + "\n" + code.trimEnd() + "\n```";

/** "stagger 0 ms at 0, 40 ms at 0.5, 90 ms at 1" */
export function scale(id: keyof typeof INTENSITY, parameter: { name: string; unit: string }): string {
  const [lo, mid, hi] = INTENSITY[id].map((n) => measure(n, parameter.unit));
  return `${parameter.name} ${lo} at 0, ${mid} at 0.5, ${hi} at 1`;
}

export function llms(base: string): string {
  const out: string[] = [
    "# hairline",
    "",
    `> ${PACKAGE}: six isometric line figures that answer the pointer. SVG, no dependencies, ESM only. A function per figure, and a React component per figure. Every figure takes the same four options.`,
    "",
    "## Install",
    "",
    fence("sh", install(base).map((i) => i.code).join("\n")),
    "",
    "## Use",
    "",
    `React: \`import { ${FIGURES.map((f) => f.name).join(", ")} } from "${PACKAGE}/react"\`. Each component renders a \`<div>\`, takes the options below and any \`<div>\` attribute, and forwards its ref. The entry is a client module: render it from a Server Component without writing "use client".`,
    "",
    fence("tsx", REACT),
    "",
    `Vanilla: \`import { ${FIGURES.map((f) => f.id).join(", ")} } from "${PACKAGE}"\`. Each function takes an element and the options, draws into the element, and returns \`{ update(options), destroy() }\`. In \`update\`, a key set to \`undefined\` goes back to its default and a key left out stays as it is.`,
    "",
    fence("ts", VANILLA),
    "",
    "Without a bundler:",
    "",
    fence("html", CDN),
    "",
    "A figure fills its element's width at a 5:4 aspect ratio.",
    "",
    "## Options",
    "",
    table(OPTIONS),
    "",
    "## Figures",
    "",
    "What a higher `intensity` does to each figure, and the number it sets inside the figure (two straight lines through these three points):",
  ];
  for (const doc of FIGURES) {
    out.push("", `### ${doc.name}`, "", doc.summary, "", `Higher intensity: ${doc.stronger} (${scale(doc.id, doc.parameter)}.)`);
  }
  out.push(
    "", "## Theme", "",
    "Six CSS custom properties, set on the figure or on any ancestor. Without them a figure is light, or dark when an ancestor has class `dark` or `data-theme=\"dark\"`, or when the page's `color-scheme` is dark.",
    "", THEME.map((t) => `- \`${t.property}\` (light: ${t.light}): ${t.role}`).join("\n"),
    "", "## Accessibility", "",
    "A figure is an image with a description you can replace with `label`. Riffle is a focusable group: the arrow keys walk its cards and a live region reads out the card's number. Under prefers-reduced-motion, Phosphor and Slow hold still, and every figure still answers the pointer.",
    "", "## Links", "",
    `- Site: ${base}`, `- Source: ${LINKS.github}`, `- npm: ${LINKS.npm}`, `- The essay the figures come from: ${LINKS.essay}`, `- shadcn registry item: ${base}/r/hairline.json`, "",
  );
  return out.join("\n");
}
