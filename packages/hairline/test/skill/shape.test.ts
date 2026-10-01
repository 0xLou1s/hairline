import { existsSync, readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

/** The skill folder is what an agent installs: these hold its shape. */
const SKILL = fileURLToPath(new URL("../../../../skills/hairline-create/", import.meta.url));
const FILES = ["SKILL.md", "bench.html", "build.mjs", "concepts.md", "examples/riffle.js", "examples/terrain.js", "kernel.js", "look.md", "rules.md", "validate.mjs"];
const text = (p: string) => readFileSync(SKILL + p, "utf8");

it("holds exactly its ten files", () => {
  const found = (readdirSync(SKILL, { recursive: true, withFileTypes: true }) as import("node:fs").Dirent[])
    .filter((e) => e.isFile())
    .map((e) => (e.parentPath + "/" + e.name).slice(SKILL.length).replace(/^\//, ""));
  expect(found.sort()).toEqual(FILES);
});

it("SKILL.md opens with a name that is its folder's and a description that says when to use it", () => {
  const m = /^---\nname: (.+)\ndescription: (.+)\nargument-hint: (.+)\n---\n/.exec(text("SKILL.md"));
  expect(m).not.toBeNull();
  expect(m![1]).toBe("hairline-create");
  expect(m![2]).toMatch(/^Use when /);
  expect(m![2].length).toBeLessThanOrEqual(1024);
  expect(text("SKILL.md").split("\n").length).toBeLessThan(120);
});

it("SKILL.md points to every other file, and to none that is not there", () => {
  const skill = text("SKILL.md");
  for (const f of FILES.filter((f) => f !== "SKILL.md")) expect(skill, f).toContain(f);
  for (const [, f] of skill.matchAll(/`([\w./-]+\.(?:md|mjs|js|html))`/g)) expect(existsSync(SKILL + f), f).toBe(true);
});

it("rules.md has the ten rules, named as the bench names them", () => {
  const names = [...text("rules.md").matchAll(/^## (\d\d) · (\w+)/gm)].map((m) => `${m[1]} ${m[2]}`);
  const bench = /const RULES = (\[[^\]]+\]);/.exec(text("bench.html"))![1];
  expect(names).toEqual((JSON.parse(bench) as string[]).map((name, i) => `${String(i + 1).padStart(2, "0")} ${name}`));
});

it("look.md and SKILL.md name the validator's checks and the bench's parameters as they are", () => {
  expect(text("look.md")).toContain("?w=240");
  expect(text("look.md")).toContain("at=");
  for (const id of ["kernel", "bench", "text", "paint", "outside", "clock", "hit", "readout", "handle", "declare", "length"]) {
    expect(text("validate.mjs"), id).toMatch(new RegExp(`^ \\* {3}${id} `, "m"));
  }
});

it("look.md runs build.mjs by its path in the skill folder, as SKILL.md says, so the command resolves from the working directory", () => {
  expect(text("look.md")).toContain("`node <skill folder>/build.mjs <skill folder>/examples/terrain.js`");
  expect(text("look.md")).not.toMatch(/`node build\.mjs /);
});
