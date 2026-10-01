import { describe, expect, it } from "vitest";
import { ranges } from "@lucasmarkes/hairline";
import * as components from "@lucasmarkes/hairline/react";
import * as figures from "@lucasmarkes/hairline";
import { FIGURES, SHARED, rows, span } from "@/lib/figures";
import { llms } from "@/lib/llms";
import { FRAMEWORKS, install, react, vanilla } from "@/lib/snippets";

/** The docs are generated from the package, and these check that nothing was written by hand around it. */

describe("the props tables", () => {
  it("have one figure per entry of ranges, in the same order", () => {
    expect(FIGURES.map((f) => f.id)).toEqual(Object.keys(ranges));
  });

  it.each(FIGURES)("$name's first row is its numeric option, with the package's default and bounds", (doc) => {
    const range = (ranges[doc.id] as Record<string, { min: number; max: number; default: number }>)[doc.option];
    const [row] = rows(doc);
    expect(range).toBeDefined();
    expect(row.name).toBe(doc.option);
    expect(row.type).toBe("number");
    expect(row.default).toBe(String(range.default));
    expect(row.description).toContain(String(range.min));
    expect(row.description).toContain(String(range.max));
  });

  it("list Riffle's two other options and nobody else's", () => {
    expect(rows(FIGURES[0]).map((r) => r.name)).toEqual(["stagger", "bands", "labels"]);
    for (const doc of FIGURES.slice(1)) expect(rows(doc)).toHaveLength(1);
  });

  it("list the shared options", () => {
    expect(SHARED.map((r) => r.name)).toEqual(["theme", "label", "onRead"]);
  });

  it("write a range the way a person would", () => {
    expect(span(ranges.riffle.stagger)).toBe("0 to 90 ms");
    expect(span(ranges.slow.rate)).toBe("0.05× to 0.6×");
    expect(span(ranges.exploded.gap)).toBe("12 to 40 units");
  });
});

describe("the snippets", () => {
  it.each(FIGURES)("name an export that exists: $name", (doc) => {
    expect(components).toHaveProperty(doc.name);
    expect(figures).toHaveProperty(doc.id);
    expect(react(doc, 7)).toContain(`<${doc.name} ${doc.option}={7}`);
    expect(vanilla(doc, 7)).toContain(`${doc.id}(document.getElementById("figure")!, { ${doc.option}: 7 })`);
  });

  it("install from the address the site is built for", () => {
    const commands = install("https://example.test");
    expect(commands.map((c) => c.label)).toEqual(["pnpm", "npm", "yarn", "bun", "shadcn"]);
    expect(commands[4].code).toBe("npx shadcn@latest add https://example.test/r/hairline.json");
  });

  it("cover the five frameworks", () => {
    expect(FRAMEWORKS.map((f) => f.label)).toEqual(["Next.js", "Vue", "Svelte", "Astro", "CDN"]);
  });
});

describe("/llms.txt", () => {
  const text = llms("https://example.test");

  it.each(FIGURES)("documents $name with its range and both snippets", (doc) => {
    expect(text).toContain(`### ${doc.name}`);
    expect(text).toContain(span(doc.range));
    expect(text).toContain(react(doc, doc.range.default).trimEnd());
    expect(text).toContain(vanilla(doc, doc.range.default).trimEnd());
  });

  it("names every theme property and the registry item", () => {
    for (const key of ["plate", "hi", "edge", "mid", "lo", "stroke"]) expect(text).toContain(`--hairline-${key}`);
    expect(text).toContain("https://example.test/r/hairline.json");
  });

  it("has no hole in it", () => {
    // outside the code blocks, where `undefined` is a word TypeScript uses
    const prose = text.replace(/```[\s\S]*?```/g, "");
    expect(prose).not.toMatch(/undefined|NaN|\[object/);
  });
});
