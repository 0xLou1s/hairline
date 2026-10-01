import { gzipSync } from "node:zlib";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as components from "@lucasmarkes/hairline/react";
import * as figures from "@lucasmarkes/hairline";
import type { HairlineOptions } from "@lucasmarkes/hairline";
import { TABLE } from "../../../packages/hairline/src/intensity";
import { FIGURES, INTENSITY, OPTIONS } from "@/lib/figures";
import { llms, scale } from "@/lib/llms";
import { tiny } from "@/lib/size";
import { highlight } from "@/lib/highlight";
import { CDN, CSS, PASTE, REACT, VANILLA, install, snippet } from "@/lib/snippets";

/** The docs describe the package, and these check that nothing was written by hand around it. */

/* a key added to or taken from HairlineOptions fails the typecheck here, before the table can drift */
const KEYS = { intensity: true, theme: true, label: true, onRead: true } satisfies Record<keyof HairlineOptions, true>;

describe("the figures", () => {
  it("are the package's six, each with a function and a component", () => {
    expect(FIGURES.map((f) => f.id).sort()).toEqual(Object.keys(figures).sort());
    for (const doc of FIGURES) expect(components).toHaveProperty(doc.name);
  });

  it("copy the package's intensity table exactly", () => {
    expect(INTENSITY).toEqual(TABLE);
  });
});

describe("the options table", () => {
  it("has the four keys of HairlineOptions, in that order", () => {
    expect(OPTIONS.map((r) => r.name)).toEqual(Object.keys(KEYS));
  });

  it("gives intensity's default as 0.5", () => {
    expect(OPTIONS[0]).toMatchObject({ name: "intensity", type: "number", default: "0.5" });
  });
});

describe("the inspector's snippet", () => {
  it("is the bare component at the defaults", () => {
    expect(snippet("Terrain", { intensity: 0.5, theme: "auto" })).toContain("<Terrain />");
  });

  it("leaves out an intensity that reads as 0.5 at the slider's precision", () => {
    expect(snippet("Terrain", { intensity: 0.1 + 0.4, theme: "auto" })).toContain("<Terrain />");
    expect(snippet("Terrain", { intensity: 0.5000001, theme: "auto" })).toContain("<Terrain />");
  });

  it("shows an intensity of 0, which is not the default", () => {
    expect(snippet("Riffle", { intensity: 0, theme: "auto" })).toContain("<Riffle intensity={0} />");
  });

  it("shows what differs, intensity first, at two decimals", () => {
    expect(snippet("Slow", { intensity: 0.1 + 0.2, theme: "dark" })).toContain('<Slow intensity={0.3} theme="dark" />');
    expect(snippet("Slow", { intensity: 0.55, theme: "light" })).toContain('<Slow intensity={0.55} theme="light" />');
    expect(snippet("Slow", { intensity: 1, theme: "auto" })).toContain("<Slow intensity={1} />");
  });

  it("imports what it renders", () => {
    expect(snippet("Exploded", { intensity: 0.5, theme: "auto" })).toMatch(/^import \{ Exploded \} from "@lucasmarkes\/hairline\/react";/);
  });
});

describe("the install commands", () => {
  it("put npm first and install from the address the site is built for", () => {
    const commands = install("https://example.test");
    expect(commands.map((c) => c.label)).toEqual(["npm", "pnpm", "yarn", "bun", "shadcn"]);
    expect(commands[0].code).toBe("npm i @lucasmarkes/hairline");
    expect(commands[4].code).toBe("npx shadcn@latest add https://example.test/r/hairline.json");
  });
});

describe("the quickstart", () => {
  it("pastes React, Vanilla, CDN and CSS, and none of them sets an option the package dropped", () => {
    expect(PASTE.map((p) => p.label)).toEqual(["React", "Vanilla", "CDN", "CSS"]);
    for (const p of PASTE) expect(p.code).not.toMatch(/stagger|radius|afterglow|coast|bands|labels|ranges|className/);
  });

  it("sets all six theme properties in the CSS tab", () => {
    const css = PASTE[3].code;
    for (const key of ["plate", "hi", "edge", "mid", "lo", "stroke"]) expect(css).toContain(`--hairline-${key}:`);
  });
});

describe("the Tiny card", () => {
  it("is the gzip size of the vanilla entry, to a tenth of a kB", () => {
    const bytes = gzipSync(readFileSync(new URL("../../../packages/hairline/dist/index.js", import.meta.url))).length;
    expect(tiny()).toBe(`${(bytes / 1000).toFixed(1)} kB`);
    expect(tiny()).toMatch(/^\d+\.\d kB$/);
  });
});

describe("/llms.txt", () => {
  const text = llms("https://example.test");

  it.each(FIGURES)("names $name with its row of the intensity table", (doc) => {
    expect(text).toContain(`### ${doc.name}`);
    expect(text).toContain(doc.stronger);
    expect(text).toContain(scale(doc.id, doc.parameter));
    for (const n of INTENSITY[doc.id]) expect(scale(doc.id, doc.parameter)).toContain(String(n));
  });

  it("documents the four options, every theme property and the registry item", () => {
    for (const row of OPTIONS) expect(text).toContain(`- \`${row.name}\``);
    for (const key of ["plate", "hi", "edge", "mid", "lo", "stroke"]) expect(text).toContain(`--hairline-${key}`);
    expect(text).toContain("https://example.test/r/hairline.json");
  });

  it("mentions no option the package dropped", () => {
    expect(text).not.toMatch(/stagger=|radius=|\bbands\b|\blabels\b|\branges\b/);
  });

  it("has no hole in it", () => {
    // outside the code blocks, where `undefined` is a word TypeScript uses
    const prose = text.replace(/```[\s\S]*?```/g, "").replace(/`undefined`/g, "");
    expect(prose).not.toMatch(/undefined|NaN|\[object/);
  });
});

/** Every snippet the docs highlight, with its language. */
const SAMPLES: [code: string, lang: string][] = [[REACT, "tsx"], [VANILLA, "ts"], [CDN, "html"], [CSS, "css"]];

describe("highlighting", () => {
  it("colours tokens with the --code- variables only, and leaves the block one tab stop", async () => {
    for (const [code, lang] of SAMPLES) {
      const html = await highlight(code, lang);
      expect(html).toContain("var(--code-");
      // the CSS sample holds #ffffff as text, so only colours set in a style count
      expect(html).not.toMatch(/(?:color|background-color):\s*#/i);
      expect(html).not.toContain("tabindex");
    }
  });

  it("writes only variables globals.css defines", async () => {
    const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
    const used = new Set<string>();
    for (const [code, lang] of SAMPLES) for (const m of (await highlight(code, lang)).matchAll(/var\((--code-[a-z-]+)\)/g)) used.add(m[1]);
    expect(used.size).toBeGreaterThan(3);
    for (const name of used) expect(css).toContain(`${name}:`);
  });
});
