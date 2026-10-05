import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

/** The skill folder is what an agent installs: these hold its shape. */
const SKILL = fileURLToPath(new URL("../../../../skills/hairline-create/", import.meta.url));
const FILES = ["SKILL.md", "bench.html", "build.mjs", "concepts.md", "examples/riffle.js", "examples/terrain.js", "kernel.js", "look.md", "look.mjs", "rules.md", "validate.mjs"];
const text = (p: string) => readFileSync(SKILL + p, "utf8");

it("holds exactly its eleven files", () => {
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
  for (const param of ["?intensity=0", "?intensity=1", "?theme=dark", "?theme=light"]) expect(text("look.md"), param).toContain(param);
  for (const param of ["intensity", "theme"]) expect(text("bench.html"), param).toContain(`params.get("${param}")`);
  for (const id of ["kernel", "parse", "bench", "text", "paint", "outside", "clock", "tween", "hit", "readout", "handle", "declare", "length"]) {
    expect(text("validate.mjs"), id).toMatch(new RegExp(`^ \\* {3}${id} `, "m"));
  }
});

it("look.md asks for a point of the agent's own figure, not a fixed one", () => {
  expect(text("look.md")).not.toContain("200,160");
});

it("concepts.md's worked example is not one of the ideas the site offers to try", () => {
  expect(text("concepts.md")).not.toMatch(/sales funnel/i);
});

it("look.md runs build.mjs by its path in the skill folder, as SKILL.md says, so the command resolves from the working directory", () => {
  expect(text("look.md")).toContain("`node <skill folder>/build.mjs <skill folder>/examples/terrain.js`");
  expect(text("look.md")).not.toMatch(/`node build\.mjs /);
});

it("look.mjs is one script Node can parse, and look.md runs it instead of holding one of its own", () => {
  const run = spawnSync("node", ["--check", SKILL + "look.mjs"], { encoding: "utf8" });
  expect(run.stderr).toBe("");
  expect(run.status).toBe(0);
  expect(text("look.md")).not.toMatch(/^```js$/m);
  expect(text("look.md")).toContain("`node <skill folder>/look.mjs <name>.js --answer");
  for (const want of ["\"pageerror\"", "\"warning\"", "window.P", "WAIT = 1500", "process.exit"]) expect(text("look.mjs"), want).toContain(want);
});

it("look.mjs reads points as world or viewBox points, and keeps its cache outside the skill", async () => {
  const look = await import(SKILL + "look.mjs");
  expect(look.point("42,28,52")).toEqual([42, 28, 52]);
  expect(look.point("220,120")).toEqual([220, 120]);
  for (const bad of ["", "1", "1,2,3,4", "a,b", "1,,2"]) expect(look.point(bad), bad).toBeNull();
  expect(look.cacheDir({ HAIRLINE_LOOK_CACHE: "/x" }, "linux", "/h")).toBe("/x");
  expect(look.cacheDir({}, "darwin", "/h")).toBe(join("/h", "Library", "Caches", "hairline-look"));
  expect(look.cacheDir({}, "linux", "/h")).toBe(join("/h", ".cache", "hairline-look"));
  expect(look.SHOTS.map((s: string[]) => s[0])).toEqual(["rest", "answer", "small", "small-answer", "low", "high", "dark", "light"]);
});

it("concepts.md says how to draw an empty state and how to draw from a mark, and the rules make room for both", () => {
  const concepts = text("concepts.md"), rules = text("rules.md"), look = text("look.md");
  const empty = concepts.split("## An empty state")[1].split("\n## ")[0];
  expect(empty).toMatch(/The subject is absence/);
  expect(empty).toMatch(/160px/);
  expect(empty).toMatch(/smaller than `look\.mjs`'s small picture, so judge that picture as if it were two-thirds its size/);
  expect(empty).toMatch(/counts to zero/);
  const mark = concepts.split("## From a mark")[1].split("\n## ")[0];
  expect(mark).toMatch(/The mark is the object/);
  expect(mark).toMatch(/never trace it/);
  expect(mark).toMatch(/theirs to use/);
  const r05 = rules.split("## 05")[1].split("## 06")[0];
  expect(r05).toMatch(/when emptiness is the concept/);
  const r09 = rules.split("## 09")[1].split("## 10")[0];
  expect(r09).toMatch(/\*\*Keep it, for a mark:\*\* a mark keeps its own corners/);
  const r10 = rules.split("## 10")[1].split("## The frame")[0];
  expect(r10).toMatch(/a figure made from a mark/);
  expect(r10).toMatch(/logos/);
  expect(r10.split("- **Rejected when:**")[1].split("\n")[0]).toMatch(/other than the mark, and a glyph that belongs to it, in a figure made from a mark/);
  expect(look.split(/^11\. /m)[1].split("\n")[0]).toMatch(/In a figure made from a mark, the mark itself and a glyph that is part of it are the exception/);
  /* the glyph-as-subject case the Keep-it line allows is exempt where it is checked, too */
  for (const line of [r10.split("- **Rejected when:**")[1].split("\n")[0], look.split(/^11\. /m)[1].split("\n")[0]]) expect(line).toMatch(/a glyph built as a solid that is the figure's whole subject/);
  expect(look).toMatch(/^13\. \*\*An empty state says something is missing\.\*\*/m);
  expect(text("SKILL.md").split("\n").length).toBeLessThan(120);
});
