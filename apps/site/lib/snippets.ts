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

export const REACT = `import { Terrain } from "${PACKAGE}/react";

export default function Page() {
  return <Terrain />;
}
`;

export const VANILLA = `import { terrain } from "${PACKAGE}";

const figure = terrain(document.getElementById("figure")!);

figure.update({ intensity: 0.8 });
figure.destroy();
`;

export const CDN = `<div id="figure" style="width: 400px"></div>

<script type="module">
  import { terrain } from "https://esm.sh/${PACKAGE}";

  terrain(document.getElementById("figure"));
</script>
`;

export const CSS = `/* On a figure or anything above it. Without them a figure is light,
   or dark when the page says so. --hairline-plate must be the colour
   the figure sits on: it hides what is drawn behind each plate. */
.figures {
${THEME.map((t) => `  ${t.property}: ${t.light};`).join("\n")}
}
`;

/** The quick start's tabs: the same figure three ways, each under the file it goes in. */
export const QUICKSTART: { label: string; lang: string; file: string; code: string }[] = [
  { label: "React", lang: "tsx", file: "app/page.tsx", code: REACT },
  { label: "Vanilla", lang: "ts", file: "main.ts", code: VANILLA },
  { label: "CDN", lang: "html", file: "index.html", code: CDN },
];

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
