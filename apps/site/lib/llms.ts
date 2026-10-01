import { FIGURES, LINKS, NOTES, SHARED, THEME, rows, type Row } from "./figures";
import { FRAMEWORKS, PACKAGE, install, react, vanilla } from "./snippets";

/** The page as plain text, for a model to read: the same data, the same copy. */

const table = (list: Row[]) => list.map((r) => `- \`${r.name}\` (${r.type}${r.default ? `, default ${r.default}` : ""}): ${r.description}`).join("\n");
const fence = (lang: string, code: string) => "```" + lang + "\n" + code.trimEnd() + "\n```";

export function llms(base: string): string {
  const out: string[] = [
    "# hairline",
    "",
    `> ${PACKAGE}: six isometric line figures that answer the pointer. SVG, no dependencies, ESM only. A function per figure, and a React component per figure.`,
    "",
    "## Install",
    "",
    fence("sh", install(base).map((i) => i.code).join("\n")),
    "",
    "## Use",
    "",
    `Vanilla: \`import { ${FIGURES.map((f) => f.id).join(", ")} } from "${PACKAGE}"\`. Each function takes an element and options, draws into the element, and returns \`{ update(options), destroy() }\`.`,
    "",
    `React: \`import { ${FIGURES.map((f) => f.name).join(", ")} } from "${PACKAGE}/react"\`. Each component renders a \`<div>\`, takes the figure's options and any \`<div>\` attribute, and forwards its ref. The entry is a client module: render it from a Server Component without writing "use client".`,
    "",
    "A figure fills its element's width at a 5:4 aspect ratio. Give the element a width.",
    "",
    "## Options every figure takes",
    "",
    table(SHARED),
    "",
    "## Figures",
  ];
  for (const doc of FIGURES) {
    out.push("", `### ${doc.name}`, "", doc.summary, "", table(rows(doc)), "", fence("tsx", react(doc, doc.range.default)), "", fence("ts", vanilla(doc, doc.range.default)));
  }
  out.push(
    "", "## Ranges", "",
    `\`import { ranges } from "${PACKAGE}"\` gives every numeric option's \`min\`, \`max\`, \`step\`, \`default\` and \`unit\`. A value outside its range is clamped; a value that is not a number becomes the default.`,
    "", "## Theme", "",
    "Six CSS custom properties, set on the figure or on any ancestor. Without them a figure is light, or dark when an ancestor has class `dark` or `data-theme=\"dark\"`, or when the page's `color-scheme` is dark.",
    "", THEME.map((t) => `- \`${t.property}\`: ${t.role}`).join("\n"),
    "", "## Frameworks",
  );
  for (const f of FRAMEWORKS) out.push("", `### ${f.label}`, "", fence(f.lang, f.code));
  out.push("", "## Notes", "", NOTES.map((n) => `- ${n.title}: ${n.body}`).join("\n"));
  out.push("", "## Links", "", `- Site: ${base}`, `- Source: ${LINKS.github}`, `- npm: ${LINKS.npm}`, `- The essay the figures come from: ${LINKS.essay}`, `- shadcn registry item: ${base}/r/hairline.json`, "");
  return out.join("\n");
}
