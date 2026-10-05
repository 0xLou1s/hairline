import { OPTIONS, THEME } from "./figures";

/**
 * Every piece of code the page shows, as plain text. The page highlights it;
 * /llms.txt prints it as it is.
 */

export const PACKAGE = "@lucasmarkes/hairline";

/** npm first: it is the command a stranger already knows. */
export function install(base: string): { label: string; code: string }[] {
  return [
    { label: "npm", code: `npm i ${PACKAGE}` },
    { label: "pnpm", code: `pnpm add ${PACKAGE}` },
    { label: "yarn", code: `yarn add ${PACKAGE}` },
    { label: "bun", code: `bun add ${PACKAGE}` },
    { label: "shadcn", code: `npx shadcn@latest add ${base}/r/hairline.json` },
  ];
}

/** A figure pasted in React, by its component's name: the docs show Terrain, /figures each figure in turn. */
export const reactFor = (name: string) => `import { ${name} } from "${PACKAGE}/react";

export default function Page() {
  return <${name} />;
}
`;

/** The same in plain DOM, by the figure's function. */
export const vanillaFor = (id: string) => `import { ${id} } from "${PACKAGE}";

const figure = ${id}(document.getElementById("figure")!);

figure.update({ intensity: 0.8 });
figure.destroy();
`;

/** The same without a bundler. */
export const cdnFor = (id: string) => `<div id="figure" style="width: 400px"></div>

<script type="module">
  import { ${id} } from "https://esm.sh/${PACKAGE}";

  ${id}(document.getElementById("figure"));
</script>
`;

export const REACT = reactFor("Terrain");
export const VANILLA = vanillaFor("terrain");
export const CDN = cdnFor("terrain");

export const CSS = `/* On a figure or anything above it. Without them a figure is light,
   or dark when the page says so. --hairline-plate must be the colour
   the figure sits on: it hides what is drawn behind each plate. */
.figures {
${THEME.map((t) => `  ${t.property}: ${t.light};`).join("\n")}
}
`;

/** The empty state's words, shared by its code and the live one the docs draw above it. */
export const NO_RESULTS = { label: "An empty sieve", heading: "No results match these filters", action: "Clear filters" };

/** A figure as an empty state: small, over a heading and one action. */
export const EMPTY = `import { Sieve } from "@lucasmarkes/hairline/react";

export function NoResults({ onClear }: { onClear: () => void }) {
  return (
    <div style={{ display: "grid", justifyItems: "center", gap: 12, padding: 48 }}>
      <Sieve style={{ width: 200 }} label="${NO_RESULTS.label}" />
      <h2>${NO_RESULTS.heading}</h2>
      <button onClick={onClear}>${NO_RESULTS.action}</button>
    </div>
  );
}
`;

/** The quick start's tabs: the same figure three ways, each under the file it goes in. */
export const QUICKSTART = paste("Terrain", "terrain");

/** One figure three ways, each under the file it goes in, as the quick start's tabs show it. */
export function paste(name: string, id: string): { label: string; lang: string; file: string; code: string }[] {
  return [
    { label: "React", lang: "tsx", file: "app/page.tsx", code: reactFor(name) },
    { label: "Vanilla", lang: "ts", file: "main.ts", code: vanillaFor(id) },
    { label: "CDN", lang: "html", file: "index.html", code: cdnFor(id) },
  ];
}

/** The component's props, read from the options table so the two cannot drift. */
export const REACT_SIGNATURE = `<Terrain
${OPTIONS.map((o) => `  ${o.name}?: ${o.type}`).join("\n")}
  {...divProps}
/>
`;

export const VANILLA_SIGNATURE = `terrain(element: HTMLElement, options?: HairlineOptions): {
  update(options: HairlineOptions): void
  destroy(): void
}
`;
