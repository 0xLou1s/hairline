import type { FigureDoc } from "./figures";

/**
 * Every piece of code the page shows, as plain text. The page highlights it;
 * /llms.txt prints it as it is.
 */

export const PACKAGE = "@lucasmarkes/hairline";

export function install(base: string): { label: string; code: string }[] {
  return [
    { label: "pnpm", code: `pnpm add ${PACKAGE}` },
    { label: "npm", code: `npm install ${PACKAGE}` },
    { label: "yarn", code: `yarn add ${PACKAGE}` },
    { label: "bun", code: `bun add ${PACKAGE}` },
    { label: "shadcn", code: `npx shadcn@latest add ${base}/r/hairline.json` },
  ];
}

export function react(doc: FigureDoc, value: string | number): string {
  return `import { ${doc.name} } from "${PACKAGE}/react";

export function Figure() {
  return <${doc.name} ${doc.option}={${value}} className="w-80" />;
}
`;
}

export function vanilla(doc: FigureDoc, value: string | number): string {
  return `import { ${doc.id} } from "${PACKAGE}";

const figure = ${doc.id}(document.getElementById("figure")!, { ${doc.option}: ${value} });

// later
figure.update({ ${doc.option}: ${doc.range.max} });
figure.destroy();
`;
}

export const FRAMEWORKS: { label: string; lang: string; code: string }[] = [
  {
    label: "Next.js",
    lang: "tsx",
    code: `// app/page.tsx — a Server Component. The React entry is a client module,
// so there is no "use client" to write.
import { Terrain } from "${PACKAGE}/react";

export default function Page() {
  return <Terrain radius={4} className="w-96" />;
}
`,
  },
  {
    label: "Vue",
    lang: "vue",
    code: `<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import { terrain, type Figure, type TerrainOptions } from "${PACKAGE}";

const el = ref<HTMLElement>();
let figure: Figure<TerrainOptions> | undefined;

onMounted(() => { figure = terrain(el.value!, { radius: 4 }); });
onBeforeUnmount(() => figure?.destroy());
</script>

<template>
  <div ref="el" />
</template>
`,
  },
  {
    label: "Svelte",
    lang: "svelte",
    code: `<script lang="ts">
  import { terrain, type TerrainOptions } from "${PACKAGE}";

  // A figure has the shape of a Svelte action: { update, destroy }.
  const figure = (el: HTMLElement, options: TerrainOptions) => terrain(el, options);
  let radius = 4;
</script>

<div use:figure={{ radius }} />
`,
  },
  {
    label: "Astro",
    lang: "astro",
    code: `<div id="figure"></div>

<script>
  import { terrain } from "${PACKAGE}";

  terrain(document.getElementById("figure")!, { radius: 4 });
</script>
`,
  },
  {
    label: "CDN",
    lang: "html",
    code: `<div id="figure" style="width: 400px"></div>

<script type="module">
  import { terrain } from "https://esm.sh/${PACKAGE}";

  terrain(document.getElementById("figure"), { radius: 4 });
</script>
`,
  },
];

/** What the theme editor prints. */
export function themeCss(colors: Record<string, string>, stroke: number): string {
  const lines = Object.entries(colors).map(([k, v]) => `  --hairline-${k}: ${v};`);
  return `.figures {\n${lines.join("\n")}\n  --hairline-stroke: ${stroke};\n}\n`;
}
